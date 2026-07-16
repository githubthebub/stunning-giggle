"""Apply the writers'-room QC fixes to the episode JSON package.

Order matters: structural surgeries first (searchable anchors use original
names), then global renames, then recompile. Defensive: every surgery logs
whether its anchor was found."""
import copy
import json
import os
import re
import shutil

WR = '/tmp/claude-0/-home-user-stunning-giggle/19df9652-c879-5865-b6f6-712001ab7324/scratchpad/writersroom'

RENAMES = [
    ('Hollow Light', 'Saltwick Light'), ("Hollow's Reach", 'Saltwick Reach'),
    ('Hollow’s Reach', 'Saltwick Reach'),
    ('YUMA', 'ESPEN'), ('Yuma', 'Espen'),
    ('ILSA', 'ORLA'), ('Ilsa', 'Orla'),
    ('MARDA', 'HULDA'), ('Marda', 'Hulda'),
    ('DEEPWALKER', 'BELLFARER'), ('Deepwalker', 'Bellfarer'), ('deepwalker', 'bellfarer'),
    ('Keep the Light', 'Six Minutes'),
    ('water that remembers', 'black that still moves like the sea'),
    ('water remembers', 'the black keeps tide-rhythm'),
    ('seawater', 'rain'),
    ('glows blue', 'blooms with pale light, salt crawling up the glass'),
]


def load(name):
    return json.load(open(os.path.join(WR, name)))


def save(name, obj):
    json.dump(obj, open(os.path.join(WR, name), 'w'), indent=1)


def rename_all(obj):
    if isinstance(obj, str):
        for a, b in RENAMES:
            obj = obj.replace(a, b)
        return obj
    if isinstance(obj, list):
        return [rename_all(v) for v in obj]
    if isinstance(obj, dict):
        return {k: rename_all(v) for k, v in obj.items()}
    return obj


def log(ok, msg):
    print(('  OK   ' if ok else '  MISS ') + msg)


def shot_file(n):
    return f'shots_scene_{n:02d}.json'


def main():
    for f in os.listdir(WR):
        if f.endswith('.json') and not f.endswith('.bak'):
            shutil.copy(os.path.join(WR, f), os.path.join(WR, f + '.bak'))

    # ---------- Scene 7: insert the jacket-grab shot ----------
    s7 = load(shot_file(7))
    anchor = None
    for i, sh in enumerate(s7['shots']):
        d = sh.get('description', '').lower()
        if 'stair door' in d or 'blown open' in d or 'bolt' in d:
            anchor = i
            break
    idx = (anchor + 1) if anchor is not None else 3
    s7['shots'].insert(idx, {
        'seconds': 2.0, 'template': 'montage_detail',
        'description': 'insert: Yuma snatches his day jacket off the bedpost hook as he bolts — the match tin and the jar knock together inside the pocket',
        'camera': 'push_in', 'transition': 'cut', 'subs': [],
        'sfx': ['glass_chime'], 'music': None})
    log(True, f'S7 jacket insert at index {idx} (anchor={"found" if anchor is not None else "fallback"})')

    # SDH bell caption on the black cold-wake shot
    found = False
    for sh in s7['shots']:
        if sh['template'] == 'black' or ('bell' in sh.get('description', '').lower() and sh is s7['shots'][0]):
            sh.setdefault('subs', []).insert(0, {'text': '[signal bell — dragged, wrong]',
                                                 'speaker': 'NARRATION', 'at': 1.5})
            found = True
            break
    log(found, 'S7 SDH bell caption')

    # continuation dash
    found = False
    for sh in s7['shots']:
        for ev in sh.get('subs') or []:
            if ev['text'].startswith('why are you heavy'):
                ev['text'] = '—' + ev['text']
                found = True
    log(found, 'S7 continuation dash')
    save(shot_file(7), s7)

    # ---------- Scene 8: music silences, rope-hand restage, no-eye restage ----------
    s8 = load(shot_file(8))
    for i in (0, 1):
        if i < len(s8['shots']):
            s8['shots'][i]['music'] = 'silence'
    log(True, 'S8 shots 1-2 music -> silence')
    found = False
    for sh in s8['shots']:
        d = sh.get('description', '')
        if 'rope' in d.lower() and ('tangle' in d.lower() or 'slack' in d.lower() or 'hand' in d.lower()):
            sh['description'] = ('her hand slack on the wet stone beside the still-swaying rope, '
                                 'six steps down on the landing; the bell barely ticks')
            found = True
            break
    log(found, 'S8 rope-hand restage')
    found = False
    for sh in s8['shots']:
        d = sh.get('description', '').lower()
        if sh['template'] == 'close_eye' and any(k in d for k in ('supper', 'vast', 'creature', 'level with', 'size of')):
            sh['template'] = 'undertow'
            sh['description'] = ('the vast undertow shape slides past the gallery glass, close, fills frame, '
                                 'fin-lights raking the dark, no eye visible, frost blooming across the pane, lighthouse unlit')
            found = True
            break
    log(found, 'S8 creature pass restaged without eye')
    for sh in s8['shots']:
        sh['description'] = sh.get('description', '').replace('two floors', 'six steps')
    save(shot_file(8), s8)

    # ---------- Scene 6: cracked pane belongs to the lamp room only ----------
    s6 = load(shot_file(6))
    found = False
    for sh in s6['shots']:
        if 'cracked pane' in sh.get('description', ''):
            sh['description'] = re.sub(r"cracked pane[^,.;]*", 'window glass', sh['description'])
            found = True
    log(found, 'S6 cracked pane removed')
    found = False
    for sh in s6['shots']:
        for ev in sh.get('subs') or []:
            if 'Am I.' in ev['text']:
                ev['text'] = ev['text'].replace('Am I.', 'Am I?')
                found = True
    log(found, 'S6 Am I? punctuation')
    save(shot_file(6), s6)

    # ---------- duration trims ----------
    trims = {3: {7: 9.0}, 5: {4: 7.0, 11: 7.5}, 11: {4: 5.5, 11: 6.0, 20: 6.0}}
    for n, tmap in trims.items():
        s = load(shot_file(n))
        for i, dur in tmap.items():
            if i < len(s['shots']):
                s['shots'][i]['seconds'] = dur
        save(shot_file(n), s)
    log(True, 'duration trims S3/S5/S11')

    # ---------- Scene 10: dawn inventory wording ----------
    s10 = load(shot_file(10))
    found = False
    for sh in s10['shots']:
        d = sh.get('description', '')
        if 'seven' in d.lower() and ('burnt' in d.lower() or 'match' in d.lower()):
            sh['description'] = re.sub(r'seven burnt[\w -]*matches?|seven spent[\w -]*matches?',
                                       'seven spent duds lined up, heads crumbled to damp grit, striker-scarred',
                                       d, flags=re.I)
            found = True
        for ev in sh.get('subs') or []:
            ev['text'] = ev['text'].replace('burnt', 'spent')
    log(found, 'S10 dawn inventory wording')
    save(shot_file(10), s10)

    # ---------- Scene 11: stacking, timing, SDH, the Bellfarer's night line ----------
    s11 = load(shot_file(11))
    s11['shots'][0].setdefault('subs', []).insert(0, {
        'text': '[dozens of small bells, far below, rising]', 'speaker': 'NARRATION', 'at': 0.8})
    found = False
    for sh in s11['shots']:
        subs = sh.get('subs') or []
        for j, ev in enumerate(subs):
            if ev['text'].strip() in ('Marda.', 'Hulda.'):
                ev['at'] = 0.5
                if j + 1 < len(subs):
                    subs[j + 1]['at'] = max(subs[j + 1].get('at', 0), 2.5)
                found = True
    log(found, 'S11 stall stacking fix')
    found = False
    for sh in s11['shots']:
        for ev in sh.get('subs') or []:
            if 'My bells are tired' in ev['text'] and ev.get('at', 0) >= 3.9:
                ev['at'] = 3.4
                found = True
    log(found, 'S11 bells-tired timing')
    found = False
    for sh in s11['shots']:
        subs = sh.get('subs') or []
        spk = {(e.get('speaker') or '').upper() for e in subs}
        if ('DEEPWALKER' in spk or 'BELLFARER' in spk) and len(subs) == 1 and sh.get('seconds', 0) >= 6.5:
            subs.append({'text': 'Last night the tide rose past my hat brim.',
                         'speaker': 'DEEPWALKER', 'at': subs[0].get('at', 0.5) + 3.2})
            found = True
            break
    log(found, 'S11 night-tide line added')
    save(shot_file(11), s11)

    # ---------- split triple-sense events (targeted scenes) ----------
    for n in (3, 4, 6):
        s = load(shot_file(n))
        changed = 0
        for sh in s['shots']:
            subs = sh.get('subs') or []
            out = []
            for ev in subs:
                txt = ev['text']
                if len(txt) > 66 and txt.count('. ') >= 2 and not txt.startswith('['):
                    parts = txt.split('. ')
                    first = parts[0] + '. ' + parts[1] + '.'
                    second = '. '.join(parts[2:])
                    out.append({**ev, 'text': first.strip()})
                    out.append({**ev, 'text': second.strip(), 'at': ev.get('at', 0) + 2.4})
                    changed += 1
                else:
                    out.append(ev)
            sh['subs'] = out
        save(shot_file(n), s)
        print(f'  OK   S{n}: split {changed} long events')

    # ---------- global renames across every package file ----------
    for f in sorted(os.listdir(WR)):
        if f.endswith('.json') and not f.endswith('.bak'):
            save(f, rename_all(load(f)))
    log(True, 'global renames applied')

    beat = load('beatsheet.json')
    print('  title now:', beat.get('episode_title'))


if __name__ == '__main__':
    main()
