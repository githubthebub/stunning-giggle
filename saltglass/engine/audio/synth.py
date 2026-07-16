"""Numpy synthesizer: instruments and effects for the SALTGLASS score.

All buffers are float32 stereo (n, 2) unless noted mono (n,). SR = 44100.
Every sound here is synthesized from scratch — an entirely original score.
"""
import numpy as np

SR = 44100


def t_axis(dur):
    n = int(dur * SR)
    return np.arange(n, dtype=np.float32) / SR


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2, dur=None):
    """ADSR envelope over n samples (times in seconds)."""
    dur = dur if dur is not None else n / SR
    e = np.zeros(n, dtype=np.float32)
    ia, id_, ir = int(a * SR), int(d * SR), int(r * SR)
    ia = max(1, min(ia, n))
    e[:ia] = np.linspace(0, 1, ia)
    if ia < n:
        de = min(ia + id_, n)
        e[ia:de] = np.linspace(1, s, de - ia)
        e[de:] = s
    if ir > 0 and ir < n:
        e[-ir:] *= np.linspace(1, 0, ir)
    return e


def onepole_lp(x, cutoff, sr=SR):
    """One-pole lowpass (vectorized via lfilter-style recursion in chunks)."""
    a = np.exp(-2 * np.pi * cutoff / sr).astype(np.float32) if isinstance(cutoff, np.ndarray) \
        else np.float32(np.exp(-2 * np.pi * cutoff / sr))
    if isinstance(a, np.ndarray):
        y = np.empty_like(x)
        acc = 0.0
        # slow path only used for evolving cutoffs on short buffers
        for i in range(len(x)):
            acc = (1 - a[i]) * x[i] + a[i] * acc
            y[i] = acc
        return y
    # constant-cutoff fast path: y[n] = (1-a) x[n] + a y[n-1]
    b = 1 - a
    y = x.astype(np.float32) * b
    # recursive doubling for IIR: y[n] += a*y[n-1] ...
    n = len(y)
    step = 1
    ap = np.float32(a)
    while step < n:
        y[step:] += ap * y[:-step]
        ap = ap * ap
        step *= 2
    return y


def highpass(x, cutoff, sr=SR):
    return x - onepole_lp(x, cutoff, sr)


def detune_saw(freq, dur, detune=0.4, voices=3, seed=0):
    """Band-limited-ish soft saw stack (sines up to ~6 kHz)."""
    t = t_axis(dur)
    g = np.random.default_rng(seed)
    out = np.zeros_like(t)
    for v in range(voices):
        f = freq * (1 + detune * 0.01 * (v - (voices - 1) / 2))
        ph = g.uniform(0, 2 * np.pi)
        for h in range(1, 9):
            if f * h > 6000:
                break
            out += np.sin(2 * np.pi * f * h * t + ph * h) / h
    return out / voices


def pad(freq, dur, vel=1.0, cutoff=750, seed=0):
    """Warm slow pad."""
    x = detune_saw(freq, dur, detune=0.55, voices=3, seed=seed)
    x += 0.5 * detune_saw(freq * 0.5, dur, detune=0.3, voices=2, seed=seed + 1)
    x = onepole_lp(x, cutoff)
    n = len(x)
    e = env_adsr(n, a=min(1.2, dur * 0.3), d=0.5, s=0.8, r=min(1.5, dur * 0.3))
    x *= e * vel * 0.24
    t = t_axis(dur)
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * t)
    return np.stack([x * (0.8 + 0.2 * lfo), x * (1.0 - 0.2 * lfo)], axis=1)


def pluck(freq, dur, vel=1.0, damp=0.996, seed=0):
    """Karplus-Strong string."""
    n = int(dur * SR)
    period = max(2, int(SR / freq))
    g = np.random.default_rng(seed)
    buf = (g.uniform(-1, 1, period)).astype(np.float32)
    buf -= buf.mean()
    out = np.zeros(n, dtype=np.float32)
    prev = 0.0
    idx = 0
    for i in range(n):
        cur = buf[idx]
        new = damp * 0.5 * (cur + prev)
        out[i] = cur
        buf[idx] = new
        prev = cur
        idx = (idx + 1) % period
    e = np.ones(n, dtype=np.float32)
    r = min(n, int(0.02 * SR))
    e[-r:] = np.linspace(1, 0, r)
    x = out * e * vel * 0.5
    return np.stack([x * 0.95, x * 1.05], axis=1)


def bell(freq, dur, vel=1.0, bright=1.0, seed=0):
    """Inharmonic FM bell."""
    t = t_axis(dur)
    partials = [(1.0, 1.0), (2.76, 0.5), (5.4, 0.24 * bright), (8.9, 0.1 * bright)]
    x = np.zeros_like(t)
    for ratio, amp in partials:
        dec = np.exp(-t * (1.1 + ratio * 0.7))
        x += amp * dec * np.sin(2 * np.pi * freq * ratio * t + 0.4 * np.sin(2 * np.pi * freq * ratio * 3.01 * t) * np.exp(-t * 3))
    x *= vel * 0.32
    return np.stack([x, np.roll(x, int(0.0006 * SR))], axis=1)


def piano(freq, dur, vel=1.0, seed=0):
    """Felt-piano-ish: decaying harmonic stack with soft attack noise."""
    t = t_axis(dur)
    x = np.zeros_like(t)
    for h in range(1, 9):
        f = freq * h * (1 + 0.0004 * h * h)
        if f > 8000:
            break
        dec = np.exp(-t * (0.8 + 0.75 * h))
        x += np.sin(2 * np.pi * f * t) * dec / (h ** 1.25)
    n = len(t)
    g = np.random.default_rng(seed)
    click = g.standard_normal(min(n, int(0.012 * SR))).astype(np.float32)
    click = onepole_lp(click, 2500) * 0.25
    x[:len(click)] += click * np.linspace(1, 0, len(click))
    e = env_adsr(n, a=0.004, d=0.3, s=0.55, r=min(0.4, dur * 0.3))
    x *= e * vel * 0.4
    return np.stack([x * 1.03, x * 0.97], axis=1)


def taiko(dur=1.2, vel=1.0, pitch=95.0, seed=0):
    """Deep drum: falling sine + noise slap + body."""
    t = t_axis(dur)
    f = pitch * np.exp(-t * 6) + 42
    phase = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(phase) * np.exp(-t * 5.5)
    g = np.random.default_rng(seed)
    slap = g.standard_normal(len(t)).astype(np.float32) * np.exp(-t * 60)
    x += onepole_lp(slap, 1800) * 0.7
    x *= vel * 0.75
    return np.stack([x, x], axis=1)


def sub_drone(freq, dur, vel=1.0, beat=0.13, seed=0):
    """Two slow-beating sines + dark noise: the dread bed."""
    t = t_axis(dur)
    x = np.sin(2 * np.pi * freq * t) + np.sin(2 * np.pi * (freq * (1 + beat / freq)) * t + 1.0)
    g = np.random.default_rng(seed)
    nz = onepole_lp(g.standard_normal(len(t)).astype(np.float32), 160) * 0.5
    x = x * 0.5 + nz
    n = len(t)
    e = env_adsr(n, a=min(2.5, dur * 0.25), d=0.1, s=1.0, r=min(3.0, dur * 0.3))
    x *= e * vel * 0.3
    return np.stack([x, np.roll(x, int(0.004 * SR))], axis=1)


def whale_call(dur=6.0, vel=1.0, f0=52.0, f1=34.0, seed=0):
    """The Undertow's voice: a huge gliding moan with formant shimmer."""
    t = t_axis(dur)
    u = np.clip(t / dur, 0, 1)
    glide = f0 * (f1 / f0) ** (u ** 1.4)
    phase = 2 * np.pi * np.cumsum(glide) / SR
    x = np.sin(phase) + 0.55 * np.sin(2 * phase + 0.3) + 0.28 * np.sin(3 * phase + 0.9)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 3.1 * t) * np.sin(np.pi * u)
    x *= vib
    e = np.sin(np.pi * np.clip(u, 0, 1)) ** 0.7
    g = np.random.default_rng(seed)
    breath = onepole_lp(g.standard_normal(len(t)).astype(np.float32), 300) * 0.18 * e
    x = x * e + breath
    x *= vel * 0.5
    return np.stack([x, np.roll(x, int(0.009 * SR))], axis=1)


def make_ir(decay=2.4, seed=3, tilt=3000.0):
    """Synthetic stereo impulse response for the convolution reverb."""
    n = int(decay * SR)
    g = np.random.default_rng(seed)
    t = np.arange(n, dtype=np.float32) / SR
    env = np.exp(-t * (6.9 / decay)).astype(np.float32)
    ir = np.stack([g.standard_normal(n), g.standard_normal(n)], axis=1).astype(np.float32)
    ir *= env[:, None]
    for c in range(2):
        ir[:, c] = onepole_lp(ir[:, c], tilt)
    ir[:int(0.005 * SR)] *= np.linspace(0, 1, int(0.005 * SR))[:, None]
    ir /= (np.abs(ir).max() + 1e-9)
    return ir * 0.5


def fft_convolve(x, ir):
    """Overlap-add stereo convolution. x: (n,2), ir: (m,2)."""
    n, m = len(x), len(ir)
    block = 1 << 17
    fft_size = 1
    while fft_size < block + m - 1:
        fft_size <<= 1
    IR = np.fft.rfft(ir, fft_size, axis=0)
    out = np.zeros((n + m - 1, 2), dtype=np.float32)
    for start in range(0, n, block):
        seg = x[start:start + block]
        SEG = np.fft.rfft(seg, fft_size, axis=0)
        y = np.fft.irfft(SEG * IR, fft_size, axis=0)[:len(seg) + m - 1]
        out[start:start + len(seg) + m - 1] += y.astype(np.float32)
    return out[:n + m - 1]


def reverb(x, amount=0.35, decay=2.4, seed=3, tilt=3000.0):
    if amount <= 0:
        return x
    ir = make_ir(decay, seed, tilt)
    wet = fft_convolve(x, ir)[:len(x)]
    return x * (1 - amount * 0.5) + wet * amount


def soft_limit(x, drive=1.0):
    return np.tanh(x * drive).astype(np.float32)


def midi_to_freq(m):
    return 440.0 * 2 ** ((m - 69) / 12)
