"""Ambience beds and one-shot SFX, all synthesized. Beds take a duration;
one-shots have intrinsic lengths. Returns float32 stereo."""
import numpy as np

from . import synth as S

SR = S.SR


def _noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n).astype(np.float32)


def _stereo(l, r=None):
    return np.stack([l, r if r is not None else l], axis=1)


# ---------------------------------------------------------------- beds

def wind_soft(dur, seed=0, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    base_l = S.onepole_lp(_noise(n, seed), 420)
    base_r = S.onepole_lp(_noise(n, seed + 1), 380)
    gust = 0.55 + 0.45 * np.sin(2 * np.pi * 0.05 * t + 1.3) * np.sin(2 * np.pi * 0.013 * t)
    x = _stereo(base_l, base_r) * gust[:, None].astype(np.float32)
    return x * 0.30 * vel


def wind_storm(dur, seed=0, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    low_l = S.onepole_lp(_noise(n, seed), 300)
    low_r = S.onepole_lp(_noise(n, seed + 1), 300)
    howl_f = 700 + 260 * np.sin(2 * np.pi * 0.11 * t) + 130 * np.sin(2 * np.pi * 0.031 * t + 2)
    howl = np.sin(2 * np.pi * np.cumsum(howl_f) / SR).astype(np.float32)
    howl = S.onepole_lp(howl * _noise(n, seed + 2) * 0.5 + howl * 0.15, 900)
    gust = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 0.07 * t + 0.5)) ** 1.6
    x = _stereo(low_l, low_r) * 0.7 + _stereo(howl, np.roll(howl, int(0.011 * SR))) * 0.35
    return x * gust[:, None].astype(np.float32) * 0.42 * vel


def rain(dur, seed=0, vel=1.0):
    n = int(dur * SR)
    bed = _stereo(S.highpass(_noise(n, seed), 1400), S.highpass(_noise(n, seed + 1), 1400)) * 0.16
    g = np.random.default_rng(seed + 2)
    drops = np.zeros((n, 2), dtype=np.float32)
    count = int(dur * 60)
    idx = g.integers(0, max(1, n - 900), count)
    for i in idx:
        ln = g.integers(120, 800)
        burst = _noise(ln, int(i) % 9999) * np.exp(-np.linspace(0, 7, ln)) * g.uniform(0.06, 0.22)
        ch = g.integers(0, 2)
        drops[i:i + ln, ch] += burst.astype(np.float32)
    x = bed + drops
    t = np.arange(n) / SR
    swell = 0.75 + 0.25 * np.sin(2 * np.pi * 0.043 * t + g.uniform(0, 6))
    return x * swell[:, None].astype(np.float32) * 0.75 * vel


def waves_memory(dur, seed=0, vel=1.0):
    """The ghost of an ocean: slow, hollow swells that never break."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    l = S.onepole_lp(_noise(n, seed), 240)
    r = S.onepole_lp(_noise(n, seed + 1), 240)
    swell = (0.5 + 0.5 * np.sin(2 * np.pi * 0.065 * t - 1.2)) ** 2.2
    x = _stereo(l, r) * swell[:, None].astype(np.float32)
    return S.reverb(x, 0.4, decay=3.0, seed=seed + 2, tilt=900) * 0.14 * vel


def fire_lamp(dur, seed=0, vel=1.0):
    n = int(dur * SR)
    hiss = S.onepole_lp(_noise(n, seed), 2600) * 0.05
    g = np.random.default_rng(seed + 1)
    pops = np.zeros(n, dtype=np.float32)
    for i in g.integers(0, max(1, n - 500), int(dur * 3.2)):
        ln = g.integers(60, 350)
        pops[i:i + ln] += _noise(ln, int(i) % 9999) * np.exp(-np.linspace(0, 10, ln)) * g.uniform(0.1, 0.3)
    x = _stereo(hiss + pops, np.roll(hiss + pops, int(0.003 * SR)))
    return x * 0.5 * vel


def heartbeat(dur, seed=0, vel=1.0, bpm=88):
    n = int(dur * SR)
    x = np.zeros(n, dtype=np.float32)
    period = 60.0 / bpm
    t = 0.0
    while t < dur - 0.4:
        for off, amp in ((0.0, 1.0), (0.14, 0.6)):
            i = int((t + off) * SR)
            ln = int(0.10 * SR)
            if i + ln < n:
                tt = np.arange(ln) / SR
                thump = np.sin(2 * np.pi * (55 - 90 * tt) * tt) * np.exp(-tt * 40)
                x[i:i + ln] += thump.astype(np.float32) * amp
        t += period
    return _stereo(x, x) * 0.8 * vel


BEDS = {
    'wind_soft': wind_soft,
    'wind_storm': wind_storm,
    'rain': rain,
    'waves_memory': waves_memory,
    'fire_lamp': fire_lamp,
    'heartbeat': heartbeat,
}


# ---------------------------------------------------------------- one-shots

def thunder(seed=0, vel=1.0):
    dur = 5.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    crack = S.highpass(_noise(int(0.25 * SR), seed), 900) * np.exp(-np.linspace(0, 18, int(0.25 * SR)))
    body = S.onepole_lp(_noise(n, seed + 1), 130) * np.exp(-t * 1.1) * 2.2
    roll = S.onepole_lp(_noise(n, seed + 2), 80) * (np.exp(-t * 0.6) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.9 * t + 2)))
    x = body + roll
    x[:len(crack)] += crack * 1.4
    return S.reverb(_stereo(x, np.roll(x, int(0.017 * SR))), 0.35, decay=2.8, seed=seed + 3, tilt=700) * 0.75 * vel


def match_strike(seed=0, vel=1.0):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    scrape_n = int(0.10 * SR)
    scrape = S.highpass(_noise(scrape_n, seed), 1800) * np.linspace(0.4, 1, scrape_n)
    flare_n = int(0.5 * SR)
    flare = S.onepole_lp(_noise(flare_n, seed + 1), 3200) * np.exp(-np.linspace(0, 5.5, flare_n)) * 0.9
    x = np.zeros(n, dtype=np.float32)
    x[:scrape_n] = scrape
    x[int(0.09 * SR):int(0.09 * SR) + flare_n] += flare
    return _stereo(x, np.roll(x, int(0.002 * SR))) * 0.7 * vel


def match_fail(seed=0, vel=1.0):
    """A strike that doesn't catch: scrape, tiny fizz, nothing."""
    n = int(0.5 * SR)
    scrape_n = int(0.09 * SR)
    scrape = S.highpass(_noise(scrape_n, seed), 1700) * np.linspace(0.5, 1, scrape_n)
    fizz_n = int(0.12 * SR)
    fizz = S.highpass(_noise(fizz_n, seed + 1), 2500) * np.exp(-np.linspace(0, 9, fizz_n)) * 0.4
    x = np.zeros(n, dtype=np.float32)
    x[:scrape_n] = scrape
    x[scrape_n:scrape_n + fizz_n] += fizz
    return _stereo(x, x) * 0.65 * vel


def door(seed=0, vel=1.0):
    n = int(1.1 * SR)
    t = np.arange(n) / SR
    creak_f = 300 + 140 * np.sin(2 * np.pi * 2.2 * t) * np.exp(-t * 2)
    creak = np.sin(2 * np.pi * np.cumsum(creak_f) / SR) * np.exp(-t * 3) * 0.25
    thud_n = int(0.2 * SR)
    tt = np.arange(thud_n) / SR
    thud = np.sin(2 * np.pi * (70 - 120 * tt) * tt) * np.exp(-tt * 30)
    x = creak.astype(np.float32)
    x[int(0.55 * SR):int(0.55 * SR) + thud_n] += thud.astype(np.float32) * 0.9
    return _stereo(x, np.roll(x, int(0.005 * SR))) * 0.8 * vel


def footsteps(seed=0, vel=1.0, surface='wood', steps=4, pace=0.5):
    dur = steps * pace + 0.4
    n = int(dur * SR)
    x = np.zeros(n, dtype=np.float32)
    g = np.random.default_rng(seed)
    for k in range(steps):
        i = int((k * pace + g.uniform(-0.03, 0.03)) * SR)
        ln = int(0.09 * SR)
        tt = np.arange(ln) / SR
        if surface == 'wood':
            hit = np.sin(2 * np.pi * (140 - 300 * tt) * tt) * np.exp(-tt * 55)
            hit += S.onepole_lp(_noise(ln, seed + k), 900) * np.exp(-tt * 70) * 0.5
        elif surface == 'stone':
            hit = S.onepole_lp(_noise(ln, seed + k), 1400) * np.exp(-tt * 60)
            hit += np.sin(2 * np.pi * (200 - 350 * tt) * tt) * np.exp(-tt * 80) * 0.4
        else:  # salt crunch
            hit = S.highpass(_noise(ln, seed + k), 1200) * np.exp(-tt * 45) * 0.9
        amp = g.uniform(0.5, 0.8)
        i = max(0, i)
        if i + ln < n:
            x[i:i + ln] += hit.astype(np.float32) * amp
    return _stereo(x, np.roll(x, int(0.003 * SR))) * 0.65 * vel


def bell_small(seed=0, vel=1.0):
    g = np.random.default_rng(seed)
    n = int(2.2 * SR)
    buf = np.zeros((n, 2), dtype=np.float32)
    for k in range(g.integers(3, 6)):
        f = g.uniform(2200, 3400)
        x = S.bell(f, 1.2, vel=g.uniform(0.1, 0.2), bright=1.5, seed=seed + k)
        i = int(g.uniform(0, 0.6) * SR)
        m = min(n - i, len(x))
        buf[i:i + m] += x[:m]
    return buf * vel


def bell_deep(seed=0, vel=1.0):
    x = S.bell(108.0, 6.0, vel=0.8, bright=0.5, seed=seed)
    return S.reverb(x, 0.4, decay=3.5, seed=seed + 1, tilt=1200) * vel


def creak(seed=0, vel=1.0):
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    f = 180 + 90 * np.sin(2 * np.pi * 1.1 * t + 1) * np.exp(-t * 1.5)
    x = (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) * 0.3).astype(np.float32)
    x += S.onepole_lp(_noise(n, seed), 500) * np.exp(-t * 3) * 0.12
    return _stereo(x, x) * vel


def breath(seed=0, vel=1.0):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    env = np.sin(np.pi * np.clip(t / 1.5, 0, 1)) ** 1.5
    x = S.onepole_lp(_noise(n, seed), 800) * env * 0.16
    return _stereo(x.astype(np.float32), np.roll(x, int(0.002 * SR)).astype(np.float32)) * vel


def glass_chime(seed=0, vel=1.0):
    g = np.random.default_rng(seed)
    n = int(3.0 * SR)
    buf = np.zeros((n, 2), dtype=np.float32)
    for k in range(4):
        f = g.uniform(3200, 5200)
        x = S.bell(f, 2.0, vel=0.10, bright=1.8, seed=seed + k)
        i = int(g.uniform(0, 0.8) * SR)
        m = min(n - i, len(x))
        buf[i:i + m] += x[:m]
    return S.reverb(buf, 0.4, decay=2.4, seed=seed + 5, tilt=5200) * vel


def undertow_call(seed=0, vel=1.0):
    x = S.whale_call(7.0, vel=0.9, f0=54, f1=33, seed=seed)
    return S.reverb(x, 0.6, decay=4.5, seed=seed + 1, tilt=1100) * vel


def rumble(seed=0, vel=1.0):
    n = int(4.5 * SR)
    t = np.arange(n) / SR
    x = S.onepole_lp(_noise(n, seed), 60) * (np.sin(np.pi * np.clip(t / 4.4, 0, 1)) ** 1.2) * 3.0
    return _stereo(x.astype(np.float32), np.roll(x, int(0.02 * SR)).astype(np.float32)) * 0.8 * vel


def silence_drop(seed=0, vel=1.0):
    """A reversed swell into sudden nothing — the mixer ducks everything after."""
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    swell = S.onepole_lp(_noise(n, seed), 900) * (t / 1.2) ** 2.5
    x = swell * 0.5
    return _stereo(x.astype(np.float32), x.astype(np.float32)) * vel


def salt_crunch(seed=0, vel=1.0):
    return footsteps(seed, vel, surface='salt', steps=3, pace=0.55)


def footsteps_wood(seed=0, vel=1.0):
    return footsteps(seed, vel, surface='wood')


def footsteps_stone(seed=0, vel=1.0):
    return footsteps(seed, vel, surface='stone')


def _tame_shot(fn, ceiling=1.2):
    def wrapped(seed=0, vel=1.0):
        x = fn(seed=seed, vel=vel)
        peak = float(np.abs(x).max()) if len(x) else 0.0
        if peak > ceiling:
            x = x * (ceiling / peak)
        return x
    return wrapped


ONESHOTS = {name: _tame_shot(fn) for name, fn in {
    'thunder': thunder,
    'match_strike': match_strike,
    'match_fail': match_fail,
    'door': door,
    'footsteps_wood': footsteps_wood,
    'footsteps_stone': footsteps_stone,
    'salt_crunch': salt_crunch,
    'bell_small': bell_small,
    'bell_deep': bell_deep,
    'creak': creak,
    'breath': breath,
    'glass_chime': glass_chime,
    'undertow_call': undertow_call,
    'rumble': rumble,
    'silence_drop': silence_drop,
}.items()}
