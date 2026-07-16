"""Timeline mixer: renders the full episode soundtrack into a disk-backed
master buffer (memmap), then normalizes and writes a 16-bit WAV.

Inputs (all times absolute seconds):
- music spans: [(t0, t1, cue_name)]
- bed spans:   [(t0, t1, bed_name, vel)]
- one-shots:   [(t, name, vel)]
"""
import os
import wave

import numpy as np

from . import synth as S
from .cues import CUES
from .foley import BEDS, ONESHOTS

SR = S.SR


def _add(master, x, t0, fade_in=0.3, fade_out=0.6, gain=1.0):
    i0 = int(t0 * SR)
    n = len(x)
    i1 = min(len(master), i0 + n)
    if i1 <= i0:
        return
    seg = x[:i1 - i0].astype(np.float32) * gain
    fi = int(fade_in * SR)
    if 0 < fi < len(seg):
        seg[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = int(fade_out * SR)
    if 0 < fo < len(seg):
        seg[-fo:] *= np.linspace(1, 0, fo)[:, None]
    master[i0:i1] += seg


def render(total_dur, music_spans, bed_spans, oneshots, out_wav,
           tmp_path, music_gain=0.9, bed_gain=0.85, sfx_gain=0.95, log=print):
    n = int(total_dur * SR)
    master = np.memmap(tmp_path, dtype=np.float32, mode='w+', shape=(n, 2))
    master[:] = 0.0

    for k, (t0, t1, cue) in enumerate(music_spans):
        dur = t1 - t0
        if dur <= 0.05:
            continue
        fn = CUES.get(cue)
        if fn is None:
            continue
        log(f'  music {cue} {t0:.0f}-{t1:.0f}s')
        x = fn(dur + 2.5, seed=1000 + k * 17)
        _add(master, x, t0, fade_in=1.2 if k else 0.05, fade_out=2.2, gain=music_gain)

    for k, (t0, t1, bed, vel) in enumerate(bed_spans):
        dur = t1 - t0
        if dur <= 0.05:
            continue
        fn = BEDS.get(bed)
        if fn is None:
            continue
        x = fn(dur + 1.0, seed=2000 + k * 13, vel=vel)
        _add(master, x, t0, fade_in=0.8, fade_out=1.2, gain=bed_gain)

    for k, (t, name, vel) in enumerate(oneshots):
        fn = ONESHOTS.get(name)
        if fn is None:
            continue
        x = fn(seed=3000 + k * 11, vel=vel)
        _add(master, x, t, fade_in=0.005, fade_out=0.05, gain=sfx_gain)

    # normalize in chunks: measure, scale to healthy loudness, soft-limit
    peak, sq, cnt = 0.0, 0.0, 0
    chunk = SR * 30
    for i in range(0, n, chunk):
        seg = np.asarray(master[i:i + chunk])
        if len(seg) == 0:
            continue
        peak = max(peak, float(np.abs(seg).max()))
        sq += float((seg.astype(np.float64) ** 2).sum())
        cnt += seg.size
    rms = (sq / max(1, cnt)) ** 0.5
    target_rms = 0.14  # ≈ -17 dBFS
    gain = target_rms / max(1e-6, rms)
    gain = min(gain, 0.95 / max(1e-6, peak) * 1.6)
    log(f'  master rms {rms:.4f} peak {peak:.3f} gain {gain:.2f}')
    with wave.open(out_wav, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        for i in range(0, n, chunk):
            seg = np.asarray(master[i:i + chunk]) * gain
            seg = np.tanh(seg * 1.15) / np.tanh(1.15)
            wf.writeframes((np.clip(seg, -1, 1) * 32767).astype(np.int16).tobytes())
    del master
    os.unlink(tmp_path)
    log(f'  wrote {out_wav}')
