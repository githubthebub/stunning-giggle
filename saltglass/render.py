"""SALTGLASS episode renderer.

Compiles the writers'-room JSON (beatsheet / script / per-scene shots) into an
absolute timeline, then renders scene segments (video via ffmpeg rawvideo
pipe) and the full soundtrack, and muxes the episode.

Usage:
  python3 render.py compile            # build timeline.json + episode.srt
  python3 render.py video --scenes 1,2 # render those scenes' segments
  python3 render.py audio              # render soundtrack wav
  python3 render.py mux                # concat segments + mux audio
  Flags: --draft (960x540@12fps quick pass)
"""
import argparse
import json
import os
import subprocess
import sys
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

from saltglass.engine import templates as T
from saltglass.engine import palettes as PAL
from saltglass.engine import anim as ANIM
from saltglass.engine import subs as SUBS
from saltglass.engine.camera import Camera
from saltglass.engine.util import W, H, FPS, BW, BH, to_u8, hx
from saltglass.engine import paint as P

ROOT = '/tmp/claude-0/-home-user-stunning-giggle/19df9652-c879-5865-b6f6-712001ab7324/scratchpad'
WR = os.path.join(ROOT, 'writersroom')
BUILD = os.path.join(ROOT, 'build')
FFMPEG = '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'

FONT_TITLE = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
FONT_SUB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

BEDS = {'wind_soft', 'wind_storm', 'rain', 'waves_memory', 'fire_lamp', 'heartbeat'}

# Art-directed color script: scene -> base palette. Shot-level overrides below.
SCENE_PALETTES = {
    1: 'night_ink', 2: 'title', 3: 'dusk_amber', 4: 'day_chalk', 5: 'dusk_amber',
    6: 'dusk_amber', 7: 'storm_slate', 8: 'dead_dark', 9: 'night_ink',
    10: 'dawn_rose', 11: 'dawn_rose', 12: 'day_chalk',
}
_DARK = {'night_ink', 'dead_dark', 'storm_slate'}


def shot_palette(sh):
    base_name = SCENE_PALETTES.get(sh['scene'])
    if base_name is None:
        return PAL.pick(sh['palette_text'] + ' ' + sh['desc'])
    d = (sh['desc'] or '').lower()
    if any(k in d for k in ('abyssal', 'pitch dark', 'full dark', 'lightless')):
        return PAL.by_name('dead_dark')
    if sh['template'] == 'undertow' and base_name in _DARK:
        return PAL.by_name('undertow_deep')
    return PAL.by_name(base_name)
VALID_TEMPLATES = set(T.BUILDERS.keys())
TEMPLATE_ALIASES = {
    'two_shot': 'two_shot_silhouette', 'silhouette': 'char_silhouette',
    'lamp_room': 'lamp_room_int', 'cottage': 'cottage_int',
}


def sub_dur(text):
    return float(np.clip(0.9 + 0.055 * len(text), 1.6, 6.5))


# ------------------------------------------------------------------ compile

def compile_timeline():
    beat = json.load(open(os.path.join(WR, 'beatsheet.json')))
    script = json.load(open(os.path.join(WR, 'script.json')))
    scene_pal = {sc['n']: (sc.get('palette') or sc.get('time_of_day') or '') + ' ' + (sc.get('setting') or '')
                 for sc in script['scenes']}
    scenes = []
    t_abs = 0.0
    all_subs = []
    for sc in script['scenes']:
        n = sc['n']
        path = os.path.join(WR, f'shots_scene_{n:02d}.json')
        if not os.path.exists(path):
            print(f'WARN missing shots for scene {n}')
            continue
        shots_json = json.load(open(path))
        shots = []
        sc_start = t_abs
        for i, sh in enumerate(shots_json['shots']):
            tpl = sh.get('template', 'sky_vista')
            tpl = TEMPLATE_ALIASES.get(tpl, tpl)
            if tpl not in VALID_TEMPLATES:
                tpl = 'sky_vista'
            dur = float(np.clip(sh.get('seconds', 6.0), 2.0, 18.0))
            subs = []
            cursor = 0.15
            for ev in (sh.get('subs') or []):
                text = (ev.get('text') or '').strip()
                if not text:
                    continue
                spk = (ev.get('speaker') or '').upper()
                at = float(ev.get('at', cursor))
                at = max(at, cursor)
                d = sub_dur(text)
                if at + d > dur - 0.1:
                    at = max(0.1, dur - d - 0.1)
                    if at < cursor:  # shot too packed: extend the shot
                        dur += (cursor - at)
                        at = cursor
                subs.append({'at': round(at, 2), 'dur': round(d, 2), 'text': text, 'speaker': spk})
                cursor = at + d + 0.18
            shots.append({
                'scene': n, 'idx': i, 'template': tpl,
                'desc': sh.get('description', ''), 'camera': sh.get('camera', 'hold'),
                'transition': sh.get('transition', 'cut'), 'dur': round(dur, 2),
                'subs': subs, 'sfx': sh.get('fx_sfx', None) or sh.get('sfx') or [],
                'music': sh.get('music'), 'start': round(t_abs, 2),
                'palette_text': scene_pal.get(n, ''),
            })
            for ev in subs:
                all_subs.append((t_abs + ev['at'], t_abs + ev['at'] + ev['dur'], ev['speaker'], ev['text']))
            t_abs += dur
        scenes.append({'n': n, 'title': sc['title'], 'start': round(sc_start, 2),
                       'end': round(t_abs, 2), 'shots': shots})
    # music spans: carry cue forward when a shot omits it
    spans = []
    cur = None
    for sc in scenes:
        for sh in sc['shots']:
            cue = sh['music'] or (cur[2] if cur else 'silence')
            if cur and cue == cur[2]:
                cur[1] = sh['start'] + sh['dur']
            else:
                if cur:
                    spans.append(tuple(cur))
                cur = [sh['start'], sh['start'] + sh['dur'], cue]
    if cur:
        spans.append(tuple(cur))
    spans = [s for s in spans if s[2] != 'silence']
    # ambience beds + one-shots
    beds, shots_fx = [], []
    open_beds = {}
    for sc in scenes:
        for sh in sc['shots']:
            t0, t1 = sh['start'], sh['start'] + sh['dur']
            names = set()
            for s_ in (sh['sfx'] or []):
                s_ = s_.strip().lower()
                names.add(s_)
                if s_ in BEDS:
                    if s_ in open_beds and abs(open_beds[s_][1] - t0) < 0.75:
                        open_beds[s_][1] = t1
                    else:
                        if s_ in open_beds:
                            beds.append((open_beds[s_][0], open_beds[s_][1], s_, 1.0))
                        open_beds[s_] = [t0, t1]
                elif s_ == 'thunder':
                    shots_fx.append((t0 + 0.9, 'thunder', 1.0))
                elif s_ == 'silence_drop':
                    shots_fx.append((max(0.0, t0 - 1.1), 'silence_drop', 1.0))
                else:
                    shots_fx.append((t0 + 0.25, s_, 0.9))
            for b in list(open_beds):
                if b not in names and open_beds[b][1] <= t0:
                    beds.append((open_beds[b][0], open_beds[b][1], b, 1.0))
                    del open_beds[b]
    for b, (a, z) in open_beds.items():
        beds.append((a, z, b, 1.0))
    total = t_abs
    tl = {'title': beat.get('episode_title', 'SALTGLASS'), 'total': round(total, 2),
          'scenes': scenes, 'music_spans': spans, 'beds': beds, 'oneshots': shots_fx}
    os.makedirs(BUILD, exist_ok=True)
    json.dump(tl, open(os.path.join(BUILD, 'timeline.json'), 'w'), indent=1)
    SUBS.write_srt(all_subs, os.path.join(BUILD, 'episode.srt'))
    print(f'compiled: {total/60:.2f} min, {len(all_subs)} sub events, '
          f'{len(spans)} music spans, {len(beds)} beds, {len(shots_fx)} sfx')
    return tl


# ------------------------------------------------------------------ cards

_card_cache = {}


def card_sprite(kind, title, subtitle=''):
    key = (kind, title, subtitle)
    if key in _card_cache:
        return _card_cache[key]
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if kind == 'title':
        f1 = ImageFont.truetype(FONT_TITLE, 130)
        f2 = ImageFont.truetype(FONT_SUB, 34)
        text = 'S A L T G L A S S'
        bb = d.textbbox((0, 0), text, font=f1)
        d.text(((W - bb[2] + bb[0]) / 2, H * 0.30), text, font=f1,
               fill=(240, 246, 255, 255), stroke_width=3, stroke_fill=(8, 14, 26, 220))
        if subtitle:
            bb2 = d.textbbox((0, 0), subtitle, font=f2)
            d.text(((W - bb2[2] + bb2[0]) / 2, H * 0.30 + 160), subtitle, font=f2,
                   fill=(180, 220, 235, 235))
    else:
        f1 = ImageFont.truetype(FONT_TITLE, 64)
        y = H * 0.42
        for line in title.split('\n'):
            bb = d.textbbox((0, 0), line, font=f1)
            d.text(((W - bb[2] + bb[0]) / 2, y), line, font=f1, fill=(226, 230, 240, 255))
            y += 86
        if subtitle:
            f2 = ImageFont.truetype(FONT_SUB, 30)
            bb2 = d.textbbox((0, 0), subtitle, font=f2)
            d.text(((W - bb2[2] + bb2[0]) / 2, y + 24), subtitle, font=f2, fill=(150, 165, 190, 230))
    arr = np.asarray(im, dtype=np.float32) / 255.0
    _card_cache[key] = arr
    return arr


# ------------------------------------------------------------------ video

def render_scenes(tl, scene_ids, draft=False, label=''):
    fps = 12 if draft else FPS
    ow, oh = (960, 540) if draft else (W, H)
    vg = P.vignette_mask(W, H, 0.30)
    grains = P.grain_tiles(W, H, n=6)
    rng = np.random.default_rng(7)
    for sc in tl['scenes']:
        if sc['n'] not in scene_ids:
            continue
        seg = os.path.join(BUILD, f'seg_{sc["n"]:02d}{"_d" if draft else ""}.mp4')
        cmd = [FFMPEG, '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{ow}x{oh}',
               '-r', str(fps), '-i', '-', '-c:v', 'libx264',
               '-preset', 'veryfast' if draft else 'medium', '-crf', '22' if draft else '19',
               '-pix_fmt', 'yuv420p', seg]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE,
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        t_start = time.time()
        prev_last = None
        n_frames_total = 0
        vg3 = vg[..., None].astype(np.float32)
        for sh in sc['shots']:
            pal = shot_palette(sh)
            grain_amt0 = pal.get('grain', 0.025)
            sgrains = [g * grain_amt0 for g in grains]
            seed = (sc['n'] * 97 + sh['idx'] * 13) % 90000
            base, spec = T.build(sh['template'], sh['desc'], pal, seed)
            base_u8 = Image.fromarray(to_u8(base))
            has_shake = any(l['type'] == 'shake' for l in spec)
            cam = Camera(sh['camera'], sh['dur'],
                         shake=3.0 if has_shake else 0.0, seed=seed)
            n_frames = max(2, int(round(sh['dur'] * fps)))
            bloomy = sh['template'] in ('lighthouse_ext', 'lamp_room_int', 'light_beam',
                                        'title_card', 'storm', 'close_hands') or 'flame' in sh['desc'].lower()
            trans_in = sh['transition'] in ('fade_in', 'dip_black')
            xfade = sh['transition'] == 'crossfade' and prev_last is not None
            grain_amt = pal.get('grain', 0.025)
            is_title = sh['template'] == 'title_card'
            is_card = sh['template'] == 'text_card'
            card_text = None
            if is_card:
                lines = [ev['text'] for ev in sh['subs']]
                card_text = '\n'.join(lines[:3]) if lines else sh['desc'][:60]
            for fi in range(n_frames):
                t = fi / fps
                frame_img, camxf = cam.frame(base_u8, t)
                frame = np.asarray(frame_img, dtype=np.float32) / 255.0
                for layer in spec:
                    ANIM.apply_layer(frame, layer, t, cam=camxf, dur=sh['dur'])
                if bloomy and not draft:
                    frame = P.bloom(frame, 0.75, 12, 0.5)
                frame *= vg3
                frame += sgrains[(fi + sh['idx']) % len(sgrains)]
                if is_title:
                    a = float(np.clip((t - 0.8) / 1.2, 0, 1))
                    spr = card_sprite('title', tl['title'], 'Episode 1 — Six Minutes')
                    frame = frame * (1 - spr[..., 3:4] * a) + spr[..., :3] * spr[..., 3:4] * a
                elif is_card and card_text:
                    a = float(np.clip((t - 0.4) / 0.9, 0, 1) * np.clip((sh['dur'] - 0.6 - t) / 0.9, 0, 1))
                    spr = card_sprite('text', card_text)
                    frame = frame * (1 - spr[..., 3:4] * a) + spr[..., :3] * spr[..., 3:4] * a
                if not is_card:
                    for ev in sh['subs']:
                        if ev['at'] <= t <= ev['at'] + ev['dur']:
                            a = min(1.0, (t - ev['at']) / 0.18, max(0.0, (ev['at'] + ev['dur'] - t) / 0.25))
                            SUBS.draw(frame, ev['text'], ev['speaker'], alpha=float(np.clip(a, 0, 1)))
                if trans_in and t < 0.7:
                    frame *= t / 0.7
                if xfade and fi < int(0.5 * fps):
                    k = fi / (0.5 * fps)
                    frame = prev_last * (1 - k) + frame * k
                if sh['transition'] == 'fade_out' or (sh is sc['shots'][-1] and sc['n'] == tl['scenes'][-1]['n']):
                    rem = sh['dur'] - t
                    if rem < 0.8:
                        frame *= max(0.0, rem / 0.8)
                out = np.clip(frame, 0, 1)
                if draft:
                    out = np.asarray(Image.fromarray(to_u8(out)).resize((ow, oh), Image.BILINEAR),
                                     dtype=np.uint8)
                    proc.stdin.write(out.tobytes())
                else:
                    proc.stdin.write(to_u8(out).tobytes())
                n_frames_total += 1
            prev_last = np.clip(frame, 0, 1)
            ANIM._BEAM_CACHE.clear()
        proc.stdin.close()
        proc.wait()
        dt = time.time() - t_start
        print(f'[{label}] scene {sc["n"]:2d} "{sc["title"][:36]}" -> {seg} '
              f'({n_frames_total} frames, {dt:.0f}s, {n_frames_total/max(dt,1e-9):.1f} fps)', flush=True)


# ------------------------------------------------------------------ audio

def render_audio(tl):
    from saltglass.engine.audio import mixer
    total = tl['total'] + 1.0
    mixer.render(total, [tuple(s) for s in tl['music_spans']],
                 [tuple(b) for b in tl['beds']],
                 [tuple(o) for o in tl['oneshots']],
                 os.path.join(BUILD, 'episode_audio.wav'),
                 os.path.join(BUILD, 'master.tmp'))


# ------------------------------------------------------------------ mux

def mux(tl, draft=False):
    suffix = '_d' if draft else ''
    lst = os.path.join(BUILD, f'concat{suffix}.txt')
    with open(lst, 'w') as f:
        for sc in tl['scenes']:
            f.write(f"file 'seg_{sc['n']:02d}{suffix}.mp4'\n")
    joined = os.path.join(BUILD, f'joined{suffix}.mp4')
    subprocess.run([FFMPEG, '-y', '-f', 'concat', '-safe', '0', '-i', lst,
                    '-c', 'copy', joined], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    out = os.path.join(BUILD, f'SALTGLASS_E01_Six_Minutes{suffix}.mp4')
    subprocess.run([FFMPEG, '-y', '-i', joined, '-i', os.path.join(BUILD, 'episode_audio.wav'),
                    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
                    '-shortest', '-movflags', '+faststart', out], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('muxed ->', out)
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['compile', 'video', 'audio', 'mux', 'all'])
    ap.add_argument('--scenes', default='')
    ap.add_argument('--draft', action='store_true')
    ap.add_argument('--label', default='w')
    args = ap.parse_args()
    if args.cmd == 'compile':
        compile_timeline()
    else:
        tl = json.load(open(os.path.join(BUILD, 'timeline.json')))
        if args.cmd == 'video':
            ids = [int(x) for x in args.scenes.split(',') if x]
            render_scenes(tl, ids, draft=args.draft, label=args.label)
        elif args.cmd == 'audio':
            render_audio(tl)
        elif args.cmd == 'mux':
            mux(tl, draft=args.draft)
