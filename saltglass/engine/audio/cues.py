"""The SALTGLASS score: an original sequencer and cue library.

Musical identity:
- "The Light Holds" motif (main theme): D–F–A–G–F–E–D in D aeolian, long-short
  phrasing, harmonized i / VI / III / VII. Every cue is a treatment of it.
- Village material: G major pentatonic lilt in 3/4.
- The Undertow: tritone shadow (D against G#) drones + whale glides.
- Dawn: the motif resolved to D major (picardy) — the reward.
"""
import numpy as np

from . import synth as S

D4, E4, F4, G4, A4, Bb4, C5, D5 = 62, 64, 65, 67, 69, 70, 72, 74
F4s = 66  # F# for the dawn/picardy statements

MOTIF = [(0.0, 1.5, D4), (1.5, 0.5, F4), (2.0, 1.5, A4), (3.5, 0.5, G4),
         (4.0, 1.0, F4), (5.0, 1.0, E4), (6.0, 2.0, D4)]
MOTIF_DAWN = [(0.0, 1.5, D4), (1.5, 0.5, F4s), (2.0, 1.5, A4), (3.5, 0.5, G4),
              (4.0, 1.0, F4s), (5.0, 1.0, E4), (6.0, 2.0, D4)]


def _mix_into(buf, x, at_s):
    i0 = int(at_s * S.SR)
    if i0 < 0:
        x = x[-i0:]
        i0 = 0
    if i0 >= len(buf) or len(x) == 0:
        return
    i1 = min(len(buf), i0 + len(x))
    buf[i0:i1] += x[:i1 - i0]


def _tame(x, ceiling=1.25):
    """Keep per-cue peaks civilized before the master bus."""
    peak = float(np.abs(x).max()) if len(x) else 0.0
    if peak > ceiling:
        x = x * (ceiling / peak)
    return x


def _seq(notes, inst, dur, bpm=60, vel=1.0, transpose=0, seed=0, **kw):
    """notes: (start_beat, dur_beats, midi). Renders into a dur-second buffer."""
    n = int(dur * S.SR)
    buf = np.zeros((n, 2), dtype=np.float32)
    spb = 60.0 / bpm
    for k, (st, nd, m) in enumerate(notes):
        if st * spb >= dur:
            continue
        f = S.midi_to_freq(m + transpose)
        length = min(nd * spb * 1.15, dur - st * spb)
        x = inst(f, length, vel=vel, seed=seed + k, **kw)
        _mix_into(buf, x, st * spb)
    return buf


def _chord_pads(chords, dur, bpm, vel=0.9, cutoff=750, seed=0):
    """chords: (start_beat, dur_beats, [midis])."""
    n = int(dur * S.SR)
    buf = np.zeros((n, 2), dtype=np.float32)
    spb = 60.0 / bpm
    for k, (st, nd, mids) in enumerate(chords):
        for j, m in enumerate(mids):
            f = S.midi_to_freq(m)
            length = min(nd * spb * 1.05, dur - st * spb)
            if length <= 0:
                continue
            x = S.pad(f, length, vel=vel / max(2.2, len(mids)), cutoff=cutoff, seed=seed + k * 7 + j)
            _mix_into(buf, x, st * spb)
    return buf


def _loop_fill(render_bar, bar_s, dur, seed=0):
    """Tile a bar-renderer across dur seconds with varying seeds."""
    n = int(dur * S.SR)
    buf = np.zeros((n, 2), dtype=np.float32)
    t = 0.0
    k = 0
    while t < dur:
        x = render_bar(k, seed + k)
        _mix_into(buf, x, t)
        t += bar_s
        k += 1
    return buf


# ---------------------------------------------------------------- cues

def theme_legend(dur, seed=0):
    """Cold open: lone bell motif over a hollow drone. Ancient, spare."""
    bpm = 44
    drone = S.sub_drone(S.midi_to_freq(D4 - 24), dur, vel=0.65, seed=seed)
    bells = _seq(MOTIF, S.bell, dur, bpm=bpm, vel=0.7, transpose=0, seed=seed + 1)
    late = _seq(MOTIF, S.bell, dur, bpm=bpm, vel=0.35, transpose=-12, seed=seed + 2)
    pad_ch = _chord_pads([(0, 16, [D4 - 24, D4 - 12, A4 - 12]), (16, 16, [Bb4 - 24, Bb4 - 12, F4])],
                         dur, bpm, vel=0.5, cutoff=520, seed=seed + 3)
    x = drone + bells + np.roll(late, int(0.9 * S.SR), axis=0) + pad_ch
    return S.reverb(x, 0.5, decay=3.6, seed=seed, tilt=2400)


def theme_village(dur, seed=0):
    """Warm 3/4 lilt, pentatonic plucks over gentle pads."""
    bpm = 84
    spb = 60.0 / bpm
    G, A, B, D, E = 55, 57, 59, 62, 64
    pat = [G + 12, D + 12, B + 12, A + 12, G + 12, E + 12, D + 12, B + 12]

    def bar(k, sd):
        g = np.random.default_rng(sd)
        notes = []
        for b in range(3):
            if g.random() < 0.75:
                m = pat[(k * 3 + b) % len(pat)] + (12 if g.random() < 0.15 else 0)
                notes.append((b + g.uniform(-0.03, 0.03), 0.9, m))
        return _seq(notes, S.pluck, 3 * spb + 1.0, bpm=bpm, vel=0.6, seed=sd)

    plucks = _loop_fill(bar, 3 * spb, dur, seed=seed)
    chords = []
    prog = [[G - 12, D, B], [E - 12, B, G + 12 - 12], [A - 12 - 2, D, A], [D - 12, A, F4s]]
    beats = int(np.ceil(dur / spb))
    for i in range(0, beats, 6):
        chords.append((i, 6, prog[(i // 6) % len(prog)]))
    pads = _chord_pads(chords, dur, bpm, vel=0.7, cutoff=850, seed=seed + 9)
    x = plucks + pads
    return S.reverb(x, 0.28, decay=1.8, seed=seed + 1, tilt=3600)


def theme_duty(dur, seed=0):
    """Steady piano pulse: the lamp-lighting ritual. Patient, resolved."""
    bpm = 66
    spb = 60.0 / bpm

    def bar(k, sd):
        notes = [(0, 0.95, D4 - 12), (1, 0.95, A4 - 12), (2, 0.95, F4 - 12), (3, 0.95, A4 - 12)]
        return _seq(notes, S.piano, 4 * spb + 1.0, bpm=bpm, vel=0.5, seed=sd)

    pulse = _loop_fill(bar, 4 * spb, dur, seed=seed)
    frag = [(0.0, 1.5, D5), (1.5, 0.5, F4 + 12), (2.0, 2.0, A4)]
    lead_notes = []
    for rep in range(int(dur / (8 * spb)) + 1):
        off = rep * 8
        if rep % 2 == 0:
            lead_notes += [(st + off, nd, m) for st, nd, m in frag]
    lead = _seq(lead_notes, S.piano, dur, bpm=bpm, vel=0.42, seed=seed + 5)
    pads = _chord_pads([(0, 999, [D4 - 24, A4 - 24, D4 - 12])], dur, bpm, vel=0.45, cutoff=600, seed=seed + 7)
    x = pulse + lead + pads
    return S.reverb(x, 0.25, decay=1.6, seed=seed + 2, tilt=3000)


def theme_storm(dur, seed=0):
    """Taiko engine + cluster drones; the motif fights through in minor."""
    bpm = 96
    spb = 60.0 / bpm
    n = int(dur * S.SR)
    buf = np.zeros((n, 2), dtype=np.float32)
    g = np.random.default_rng(seed)
    beats = int(dur / spb)
    for b in range(beats):
        t = b * spb
        if b % 4 in (0, 2):
            _mix_into(buf, S.taiko(1.0, vel=0.85 if b % 8 == 0 else 0.6, pitch=90, seed=seed + b), t)
        if b % 8 == 6:
            _mix_into(buf, S.taiko(0.7, vel=0.5, pitch=140, seed=seed + b + 99), t + spb * 0.5)
    drone = S.sub_drone(S.midi_to_freq(D4 - 24), dur, vel=0.55, beat=0.4, seed=seed + 3)
    shadow = S.sub_drone(S.midi_to_freq(D4 - 24 + 6), dur, vel=0.28, beat=0.23, seed=seed + 4)
    motif = _seq([(st * 0.5 + 1, nd * 0.5, m) for st, nd, m in MOTIF], S.pad, dur,
                 bpm=bpm, vel=0.8, transpose=-12, seed=seed + 6, cutoff=900)
    x = buf + drone + shadow + motif
    return S.reverb(x, 0.3, decay=2.2, seed=seed + 1, tilt=2600)


def theme_undertow(dur, seed=0):
    """The abyss looks up: sub drones, whale glides, glassy high partials."""
    n = int(dur * S.SR)
    buf = np.zeros((n, 2), dtype=np.float32)
    g = np.random.default_rng(seed)
    _mix_into(buf, S.sub_drone(S.midi_to_freq(D4 - 36), dur, vel=0.7, beat=0.09, seed=seed), 0)
    _mix_into(buf, S.sub_drone(S.midi_to_freq(D4 - 30 + 6), dur, vel=0.3, beat=0.2, seed=seed + 1), 0)
    t = 2.0
    k = 0
    while t < dur - 8:
        _mix_into(buf, S.whale_call(g.uniform(5, 8), vel=g.uniform(0.4, 0.7),
                                    f0=g.uniform(46, 60), f1=g.uniform(30, 40), seed=seed + k), t)
        t += g.uniform(7, 13)
        k += 1
    # glassy saltglass partials, very high and sparse
    tt = 1.0
    while tt < dur - 4:
        m = int(g.choice([D5 + 12, A4 + 24, F4 + 24]))
        _mix_into(buf, S.bell(S.midi_to_freq(m), 4.0, vel=0.16, bright=1.4, seed=seed + int(tt)), tt)
        tt += g.uniform(4, 9)
    return S.reverb(buf, 0.55, decay=4.2, seed=seed + 2, tilt=2000)


def theme_dawn(dur, seed=0):
    """Sunrise: the motif in D major, pads bloom, bells answer."""
    bpm = 56
    pads = _chord_pads([(0, 12, [D4 - 12, A4 - 12, D4, F4s]), (12, 12, [G4 - 12, D4, G4, B := 71]),
                        (24, 12, [A4 - 12, E4, A4, C5 + 1]), (36, 999, [D4 - 12, A4 - 12, F4s, D5])],
                       dur, bpm, vel=0.85, cutoff=1050, seed=seed)
    lead = _seq(MOTIF_DAWN, S.piano, dur, bpm=bpm, vel=0.6, transpose=0, seed=seed + 3)
    lead2 = _seq(MOTIF_DAWN, S.bell, dur, bpm=bpm, vel=0.3, transpose=12, seed=seed + 4)
    x = pads + lead + np.roll(lead2, int(0.03 * S.SR), axis=0)
    return S.reverb(x, 0.34, decay=2.6, seed=seed + 1, tilt=3800)


def theme_end(dur, seed=0):
    """Credits: solo felt piano motif, spacious."""
    bpm = 52
    spb = 60.0 / bpm
    notes = []
    phrase = MOTIF + [(8.0, 1.5, F4), (9.5, 0.5, G4), (10.0, 2.0, A4), (12.0, 4.0, D4)]
    reps = int(dur / (16 * spb)) + 1
    for r in range(reps):
        notes += [(st + r * 16, nd, m + (0 if r % 2 == 0 else 12)) for st, nd, m in phrase]
    lead = _seq(notes, S.piano, dur, bpm=bpm, vel=0.55, seed=seed)
    pads = _chord_pads([(0, 999, [D4 - 24, A4 - 24])], dur, bpm, vel=0.4, cutoff=520, seed=seed + 2)
    return S.reverb(lead + pads, 0.4, decay=3.0, seed=seed + 1, tilt=2800)


def sting_dread(dur=4.0, seed=0):
    n = int(dur * S.SR)
    buf = np.zeros((n, 2), dtype=np.float32)
    _mix_into(buf, S.taiko(1.6, vel=1.0, pitch=70, seed=seed), 0.0)
    _mix_into(buf, S.sub_drone(S.midi_to_freq(D4 - 36), dur, vel=0.8, beat=0.5, seed=seed + 1), 0)
    _mix_into(buf, S.bell(S.midi_to_freq(D4 + 6), 2.5, vel=0.3, bright=0.6, seed=seed + 2), 0.05)
    return S.reverb(buf, 0.45, decay=3.0, seed=seed + 3, tilt=1800)


def sting_wonder(dur=4.0, seed=0):
    n = int(dur * S.SR)
    buf = np.zeros((n, 2), dtype=np.float32)
    arp = [D4, A4, D5, F4 + 12, A4 + 12, D5 + 12]
    for i, m in enumerate(arp):
        _mix_into(buf, S.bell(S.midi_to_freq(m), 3.0, vel=0.35 - i * 0.03, bright=1.2, seed=seed + i), i * 0.09)
    return S.reverb(buf, 0.5, decay=3.4, seed=seed + 9, tilt=3600)


def silence(dur, seed=0):
    return np.zeros((int(dur * S.SR), 2), dtype=np.float32)


def _wrap(fn):
    return lambda dur, seed=0: _tame(fn(dur, seed))


CUES = {
    'silence': silence,
    'theme_legend': _wrap(theme_legend),
    'theme_village': _wrap(theme_village),
    'theme_duty': _wrap(theme_duty),
    'theme_storm': _wrap(theme_storm),
    'theme_undertow': _wrap(theme_undertow),
    'theme_dawn': _wrap(theme_dawn),
    'theme_end': _wrap(theme_end),
    'sting_dread': lambda dur, seed=0: _tame(sting_dread(min(dur, 5.0), seed)),
    'sting_wonder': lambda dur, seed=0: _tame(sting_wonder(min(dur, 5.0), seed)),
}
