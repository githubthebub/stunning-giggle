"""Shot templates: build an oversized base still + animation spec from a shot's
free-text description. The interpreter reads keywords; unknown text degrades
gracefully to the template's default composition."""
import numpy as np

from .util import BW, BH, hx
from . import paint as P
from . import assets as A


def _has(desc, *words):
    d = (desc or '').lower()
    return any(w in d for w in words)


def _unlit(desc):
    """True when the lamp/lighthouse is described as out. Deliberately avoids
    bare 'dark' (which matches 'darkness' in scene prose)."""
    return _has(desc, 'unlit', 'dark tower', 'dark lighthouse', 'dead lamp', 'lamp out',
                'went out', 'goes out', 'gone out', 'went dark', 'goes dark', 'no light',
                'extinguish', 'cold lens', 'dead lens', 'lamp dead', 'not lit', 'dark lamp')


def _pos_x(desc, default=0.5):
    if _has(desc, 'left third', 'on the left', 'at left', 'frame left'):
        return 0.3
    if _has(desc, 'right third', 'on the right', 'at right', 'frame right'):
        return 0.7
    return default


def _facing(desc, x):
    if _has(desc, 'facing left', 'looks left', 'toward the left'):
        return -1
    if _has(desc, 'facing right', 'looks right', 'toward the right'):
        return 1
    return 1 if x < 0.5 else -1


def _pose(desc, default='stand'):
    d = (desc or '').lower()
    for k, p in (('run', 'run'), ('climb', 'climb'), ('walk', 'walk'), ('sit', 'sit'),
                 ('kneel', 'kneel'), ('lying', 'lying'), ('lies', 'lying'), ('collaps', 'lying'),
                 ('reach', 'reach_up'), ('cup', 'holding'), ('hold', 'holding'), ('carr', 'holding')):
        if k in d:
            return p
    return default


def base_sky(pal, seed, clouds_amt=None, star_scale=1.0, moon=None):
    img = P.vgrad(BW, BH, pal['sky'], seed=seed)
    dens = pal.get('star_density', 0) * star_scale
    spec = []
    if dens > 0:
        P.stars(img, density=dens * 0.6, seed=seed + 1, horizon=0.75)
        sf = P.star_field(BW, BH, density=dens * 0.4, seed=seed + 2, horizon=0.7)
        if len(sf[0]):
            spec.append({'type': 'twinkle', 'stars': sf, 'space': 'base'})
    if moon:
        mx, my, mr = moon
        P.glow(img, mx * BW, my * BH, mr * BH * 4.5, '#cfe3ff', intensity=0.25, falloff=2.6)
        P.soft_disc(img, mx * BW, my * BH, mr * BH, '#e8f0ff', alpha=0.95, soft=0.25)
    if clouds_amt is None:
        clouds_amt = 0.4
    if clouds_amt > 0:
        P.clouds(img, band=(0.0, 0.5), cover=clouds_amt, tint=pal['far'],
                 lit=pal['ambient'], seed=seed + 3, alpha=0.7)
    return img, spec


def _grade(img, pal):
    ink = hx(pal['ink'])
    img[:] = np.clip(img * 0.97 + ink[None, None, :] * 0.03, 0, 1)
    return img


# ---------------------------------------------------------------- templates

def t_sky_vista(desc, pal, seed):
    moon = (0.68, 0.22, 0.045) if _has(desc, 'moon') else None
    img, spec = base_sky(pal, seed, clouds_amt=0.55 if _has(desc, 'cloud') else 0.35, moon=moon)
    A.ridge(img, 0.78, 0.05, pal['far'], cells=4, seed=seed + 4, fade_to=pal['ambient'])
    A.ridge(img, 0.88, 0.06, pal['near'], cells=6, seed=seed + 5)
    if _has(desc, 'lighthouse', 'light on the cliff', 'hollow light', 'saltwick'):
        lx = _pos_x(desc, 0.76)
        lamp = A.lighthouse(img, lx, 0.9, 0.22, pal['ink'], lit=not _unlit(desc),
                            lamp_color=pal['accent'])
        if not _unlit(desc):
            spec.append({'type': 'beam', 'cx': lamp[0], 'cy': lamp[1], 'period': 9.0,
                         'color': pal['accent'], 'space': 'base'})
    if _has(desc, 'birds', 'gulls'):
        spec.append({'type': 'birds', 'n': 7, 'space': 'screen'})
    return _grade(img, pal), spec


def t_dry_sea_vista(desc, pal, seed):
    img, spec = base_sky(pal, seed, clouds_amt=0.3,
                         moon=(0.3, 0.18, 0.04) if _has(desc, 'moon') else None)
    hy = 0.55 if not _has(desc, 'high horizon') else 0.42
    A.ridge(img, hy - 0.02, 0.025, pal['far'], cells=3, seed=seed + 4, fade_to=pal['ambient'])
    A.salt_flats(img, hy, pal['ground_top'], pal['ground_bot'], crack_color=pal['ink'],
                 seed=seed + 5, shimmer=0.08 if _has(desc, 'shimmer', 'glitter') else 0.0)
    if _has(desc, 'bones', 'ribs', 'whale'):
        A.whale_bones(img, _pos_x(desc, 0.62), hy + 0.28, 0.24, pal['ink'], seed=seed + 6)
    if _has(desc, 'wreck', 'ship'):
        A.shipwreck(img, _pos_x(desc, 0.28), hy + 0.33, 0.13, pal['ink'], seed=seed + 7)
    if _has(desc, 'kelp', 'stone forest'):
        A.stone_kelp(img, [0.15, 0.22, 0.78, 0.88, 0.94], hy + 0.42, 0.3, pal['ink'], seed=seed + 8)
    if _has(desc, 'cliff'):
        A.cliff_drop(img, 'left' if _pos_x(desc, 0.3) < 0.5 else 'right', hy - 0.28, 0.16, pal['near'], seed=seed + 9)
    if _has(desc, 'yuma', 'espen'):
        x = _pos_x(desc, 0.54)
        A.yuma(img, x, min(0.93, hy + 0.34), 0.22, pal['ink'], rim=pal['accent'], pose=_pose(desc),
               facing=_facing(desc, x), jar_glow=0.5 if _has(desc, 'jar', 'glow') else 0)
    if _has(desc, 'deepwalker', 'bellfarer'):
        x = _pos_x(desc, 0.58)
        A.deepwalker(img, x, min(0.93, hy + 0.34), 0.26, pal['ink'], rim=pal['accent'],
                     facing=_facing(desc, x))
    if _has(desc, 'mist', 'haze', 'fog'):
        spec.append({'type': 'mist', 'band': (hy - 0.06, hy + 0.2), 'alpha': 0.16,
                     'color': pal['ambient'], 'space': 'screen'})
    return _grade(img, pal), spec


def t_cliff_village(desc, pal, seed):
    img, spec = base_sky(pal, seed, clouds_amt=0.45)
    A.ridge(img, 0.62, 0.03, pal['far'], cells=4, seed=seed + 4, fade_to=pal['ambient'])
    A.cliff_drop(img, 'right', 0.52, 0.86, pal['near'], seed=seed + 5)
    A.ridge(img, 0.72, 0.02, pal['near'], cells=7, seed=seed + 6)
    lit = 0.0 if _has(desc, 'dark windows', 'unlit windows') else 0.75
    _, wins = A.village_roofs(img, 0.12, 0.62, 0.72, pal['ink'], window_color=pal['accent'],
                              seed=seed + 7, n=11, lit_frac=lit)
    for i, (wx, wy) in enumerate(wins[:4]):
        A.smoke_wisp(img, wx / BW, wy / BH - 0.05, 0.12, pal['ambient'], seed=seed + 8 + i, alpha=0.10)
    if not _has(desc, 'no lighthouse'):
        lamp = A.lighthouse(img, 0.82, 0.66, 0.34, pal['ink'],
                            lit=not _unlit(desc), lamp_color=pal['accent'])
        if not _unlit(desc):
            spec.append({'type': 'beam', 'cx': lamp[0], 'cy': lamp[1], 'period': 9.0,
                         'color': pal['accent'], 'space': 'base'})
    if _has(desc, 'yuma', 'espen') and _has(desc, 'run', 'walk', 'climb'):
        A.yuma(img, 0.3, 0.715, 0.09, pal['ink'], rim=pal['accent'], pose=_pose(desc), phase=0.3)
    return _grade(img, pal), spec


def t_lighthouse_ext(desc, pal, seed):
    img, spec = base_sky(pal, seed, clouds_amt=0.5,
                         moon=(0.25, 0.16, 0.04) if _has(desc, 'moon') else None)
    A.ridge(img, 0.8, 0.04, pal['far'], cells=4, seed=seed + 4, fade_to=pal['ambient'])
    A.ridge(img, 0.86, 0.05, pal['near'], cells=8, seed=seed + 5)
    lit = not _unlit(desc)
    lx = _pos_x(desc, 0.5)
    lamp = A.lighthouse(img, lx, 0.88, 0.62 if _has(desc, 'towering', 'low angle', 'looms') else 0.5,
                        pal['ink'], lit=lit, lamp_color=pal['accent'],
                        halo=1.2 if _has(desc, 'blaz', 'full') else 0.9)
    if lit:
        spec.append({'type': 'beam', 'cx': lamp[0], 'cy': lamp[1],
                     'period': 7.0 if _has(desc, 'fast') else 10.0,
                     'color': pal['accent'], 'space': 'base'})
        spec.append({'type': 'glow_pulse', 'cx': lamp[0], 'cy': lamp[1], 'r': BH * 0.16,
                     'color': pal['accent'], 'period': 3.2, 'base': 0.25, 'amp': 0.12, 'space': 'base'})
    if _has(desc, 'yuma', 'espen'):
        x = 0.5 + (lx - 0.5) - 0.14
        A.yuma(img, x, 0.885, 0.13, pal['ink'], rim=pal['accent'], pose=_pose(desc),
               facing=1 if x < lx else -1, jar_glow=0.4 if _has(desc, 'jar') else 0)
    if _has(desc, 'ilsa', 'orla'):
        A.ilsa(img, lx + 0.1, 0.885, 0.12, pal['ink'], rim=pal['accent'], pose=_pose(desc, 'stand'))
    if _has(desc, 'deepwalker', 'bellfarer'):
        A.deepwalker(img, 0.3, 0.885, 0.16, pal['ink'], rim=pal['accent'])
    if _has(desc, 'rain', 'storm'):
        spec.append({'type': 'rain', 'intensity': 0.8, 'angle': 16, 'space': 'screen'})
    if _has(desc, 'lightning'):
        spec.append({'type': 'lightning', 'times': [1.2, 4.8], 'space': 'screen'})
    return _grade(img, pal), spec


def t_lamp_room_int(desc, pal, seed):
    img = P.vgrad(BW, BH, [(0, pal['ink']), (0.5, pal['far']), (1.0, pal['near'])], seed=seed)
    spec = []
    sky_pal = pal['sky']
    win = P.vgrad(BW, BH, sky_pal, seed=seed + 1)
    m = np.zeros((BH, BW), dtype=np.float32)
    x0, y0, x1, y1 = int(0.06 * BW), int(0.18 * BH), int(0.94 * BW), int(0.62 * BH)
    m[y0:y1, x0:x1] = 1.0
    img[:] = img * (1 - m[..., None]) + win * m[..., None]
    A.window_mullions(img, 0.06, 0.18, 0.94, 0.62, '#1a130e', cols=6, rows=2)
    floor = hx('#241a14')
    yy = np.linspace(0, 1, BH)[:, None, None]
    fmask = np.clip((yy - 0.62) / 0.38, 0, 1) ** 0.8
    img[:] = img * (1 - fmask) + floor[None, None, :] * fmask
    lit = not _unlit(desc)
    lens_x = _pos_x(desc, 0.5)
    A.fresnel_lens(img, lens_x, 0.44, 0.17 if _has(desc, 'huge', 'fills') else 0.13,
                   glass_color=pal['accent'], lit=1.0 if lit else 0.06)
    if lit:
        spec.append({'type': 'flame', 'cx': lens_x * BW, 'cy': 0.44 * BH, 'size': BH * 0.05,
                     'color': pal['accent'], 'space': 'base'})
    if _has(desc, 'matchbox', 'matches', 'table'):
        # small work table against the wall, matchbox on top
        P.draw_poly(img, [(0.06 * BW, 0.845 * BH), (0.26 * BW, 0.845 * BH),
                          (0.255 * BW, 0.99 * BH), (0.065 * BW, 0.99 * BH)], '#150e0a', blur_r=1.2)
        A.matchbox(img, 0.16, 0.815, 0.045)
    if _has(desc, 'jar'):
        A.saltglass_jar(img, 0.84, 0.78, 0.14, glow_amt=0.7 if _has(desc, 'glow') else 0.25, seed=seed + 2)
        spec.append({'type': 'glow_pulse', 'cx': 0.84 * BW, 'cy': 0.78 * BH, 'r': BH * 0.1,
                     'color': '#7fe8ff', 'period': 2.4, 'base': 0.15, 'amp': 0.14, 'space': 'base'})
    if _has(desc, 'yuma', 'espen'):
        x = _pos_x(desc, 0.32) - 0.05
        A.yuma(img, x, 0.97, 0.5, pal['ink'], rim=pal['accent'], pose=_pose(desc),
               facing=_facing(desc, x))
    if _has(desc, 'ilsa', 'orla'):
        A.ilsa(img, 0.68, 0.97, 0.48, pal['ink'], rim=pal['accent'], pose=_pose(desc, 'stand'))
    if _has(desc, 'rain', 'storm'):
        spec.append({'type': 'rain', 'intensity': 0.55, 'angle': 14, 'clip_y': 0.62, 'space': 'screen'})
    if _has(desc, 'lightning'):
        spec.append({'type': 'lightning', 'times': [2.0], 'space': 'screen'})
    return _grade(img, pal), spec


def t_cottage_int(desc, pal, seed):
    img = P.vgrad(BW, BH, [(0, '#1c1210'), (0.55, '#2c1c18'), (1.0, '#3a2820')], seed=seed)
    spec = []
    wx0, wy0, wx1, wy1 = 0.62, 0.16, 0.9, 0.52
    win = P.vgrad(BW, BH, pal['sky'], seed=seed + 1)
    m = np.zeros((BH, BW), dtype=np.float32)
    m[int(wy0 * BH):int(wy1 * BH), int(wx0 * BW):int(wx1 * BW)] = 1.0
    img[:] = img * (1 - m[..., None]) + win * m[..., None]
    A.window_mullions(img, wx0, wy0, wx1, wy1, '#160f0a', cols=2, rows=2)
    # oil lamp on a tall dresser, camera-left
    P.draw_poly(img, [(0.13 * BW, 0.50 * BH), (0.30 * BW, 0.50 * BH), (0.29 * BW, 0.98 * BH), (0.14 * BW, 0.98 * BH)],
                '#1c120c', blur_r=1.5)
    P.draw_poly(img, [(0.195 * BW, 0.50 * BH), (0.235 * BW, 0.50 * BH), (0.23 * BW, 0.455 * BH), (0.20 * BW, 0.455 * BH)],
                '#0e0906', blur_r=1.0)
    P.glow(img, 0.215 * BW, 0.435 * BH, BH * 0.26, '#ffca7a', intensity=0.55, falloff=2.0)
    spec.append({'type': 'flame', 'cx': 0.215 * BW, 'cy': 0.435 * BH, 'size': BH * 0.028,
                 'color': '#ffca7a', 'space': 'base'})
    # wall shelf with jars sitting on a visible plank
    P.draw_poly(img, [(0.36 * BW, 0.385 * BH), (0.585 * BW, 0.385 * BH), (0.585 * BW, 0.405 * BH), (0.36 * BW, 0.405 * BH)],
                '#100a08', blur_r=0.8)
    for i, sx in enumerate((0.38, 0.45, 0.52)):
        P.draw_ellipse(img, [sx * BW, 0.30 * BH, (sx + 0.04) * BW, 0.385 * BH], '#1c140e', blur_r=1.0)
    if _has(desc, 'ilsa', 'orla'):
        pose = _pose(desc, 'sit')
        if pose == 'lying':
            # raised bed: frame, mattress, headboard
            P.draw_poly(img, [(0.30 * BW, 0.76 * BH), (0.88 * BW, 0.76 * BH), (0.90 * BW, 0.94 * BH), (0.28 * BW, 0.94 * BH)],
                        '#160e0c', blur_r=1.5)
            P.draw_poly(img, [(0.86 * BW, 0.56 * BH), (0.90 * BW, 0.56 * BH), (0.91 * BW, 0.94 * BH), (0.85 * BW, 0.94 * BH)],
                        '#12100e', blur_r=1.2)
            P.draw_poly(img, [(0.31 * BW, 0.72 * BH), (0.87 * BW, 0.72 * BH), (0.88 * BW, 0.80 * BH), (0.30 * BW, 0.80 * BH)],
                        '#241a16', blur_r=1.5)
            A.ilsa(img, 0.58, 0.745, 0.30, pal['ink'], rim='#ffca7a', pose='lying')
        else:
            A.ilsa(img, 0.55, 0.95, 0.50, pal['ink'], rim='#ffca7a', pose=pose)
    if _has(desc, 'yuma', 'espen'):
        A.yuma(img, 0.35 if _has(desc, 'ilsa', 'orla') else 0.5, 0.97, 0.45, pal['ink'],
               rim='#ffca7a', pose=_pose(desc, 'stand'), facing=1)
    if _has(desc, 'jar'):
        A.saltglass_jar(img, 0.47, 0.34, 0.09, glow_amt=0.5 if _has(desc, 'glow') else 0.15, seed=seed + 3)
    return _grade(img, pal), spec


def t_stairs(desc, pal, seed):
    img, spec = base_sky(pal, seed, clouds_amt=0.4)
    A.cliff_drop(img, 'left', 0.0, 0.55, pal['near'], seed=seed + 4)
    A.stairs_cliff(img, 0.53, 0.05, 0.2, 0.95, pal['ink'], seed=seed + 5)
    if _has(desc, 'yuma', 'espen'):
        t = 0.45
        A.yuma(img, 0.42, 0.42, 0.14, pal['ink'], rim=pal['accent'], pose='climb', phase=0.4, facing=1)
        P.glow(img, 0.42 * BW, 0.40 * BH, BH * 0.07, pal['accent'], intensity=0.4)
    if _has(desc, 'rain', 'storm'):
        spec.append({'type': 'rain', 'intensity': 0.85, 'angle': 20, 'space': 'screen'})
    if _has(desc, 'lightning'):
        spec.append({'type': 'lightning', 'times': [1.5, 5.5], 'space': 'screen'})
    return _grade(img, pal), spec


def t_close_hands(desc, pal, seed):
    img = P.vgrad(BW, BH, [(0, pal['ink']), (0.6, pal['near']), (1.0, pal['far'])], seed=seed)
    spec = []
    if _has(desc, 'ilsa', 'orla', 'old', 'knot', 'salt-stiff', 'wrinkl'):
        A.old_hands(img, 0.5, 0.52, 0.5, rim='#c9a26a')
        P.glow(img, 0.2 * BW, 0.2 * BH, BH * 0.5, '#ffca7a', intensity=0.18, falloff=2.4)
    else:
        amt = 0.9 if _has(desc, 'lit', 'flame', 'catch') else (0.0 if _has(desc, 'unlit', 'dark') else 0.5)
        A.hands_cupped(img, 0.5, 0.55, 0.55, glow_amt=amt)
        if amt > 0:
            spec.append({'type': 'flame', 'cx': 0.5 * BW, 'cy': 0.5 * BH, 'size': BH * 0.06,
                         'color': '#ffb45e', 'space': 'base'})
    if _has(desc, 'trembl', 'shak'):
        spec.append({'type': 'shake', 'amp': 3.0, 'decay': 0.0, 't0': 0.0, 'space': 'cam'})
    return _grade(img, pal), spec


def t_close_eye(desc, pal, seed):
    img = P.canvas(BW, BH, pal['ink'])
    openness = 1.15 if _has(desc, 'wide', 'terror', 'shock') else 1.0
    refl = 0.95 if _has(desc, 'flame', 'light', 'beam', 'glow') else 0.4
    rc = '#7fe8ff' if _has(desc, 'blue', 'saltglass', 'undertow') else pal['accent']
    A.eye_closeup(img, 0.5, 0.52, 0.42, reflect_color=rc, reflect_amt=refl, openness=openness)
    spec = [{'type': 'glow_pulse', 'cx': 0.53 * BW, 'cy': 0.49 * BH, 'r': BH * 0.13,
             'color': rc, 'period': 2.0, 'base': 0.10, 'amp': 0.10, 'space': 'base'}] if refl > 0.6 else []
    return _grade(img, pal), spec


def t_close_object(desc, pal, seed):
    img = P.vgrad(BW, BH, [(0, pal['ink']), (0.55, pal['near']), (1.0, pal['far'])], seed=seed)
    spec = []
    yy = np.linspace(0, 1, BH)[:, None, None]
    tbl = np.clip((yy - 0.66) / 0.34, 0, 1)
    img[:] = img * (1 - tbl * 0.5) + hx('#241a14')[None, None, :] * (tbl * 0.5)
    if _has(desc, 'jar', 'saltglass'):
        amt = 1.0 if _has(desc, 'blaz', 'bright', 'flar') else (0.55 if _has(desc, 'glow') else 0.2)
        A.saltglass_jar(img, 0.5, 0.5, 0.34, glow_amt=amt, seed=seed + 1)
        spec.append({'type': 'glow_pulse', 'cx': 0.5 * BW, 'cy': 0.55 * BH, 'r': BH * 0.3,
                     'color': '#7fe8ff', 'period': 2.2 if amt > 0.5 else 4.0,
                     'base': 0.18 * amt, 'amp': 0.16 * amt, 'space': 'base'})
    elif _has(desc, 'matchbox', 'matches'):
        A.matchbox(img, 0.46, 0.62, 0.13)
        if _has(desc, 'last', 'single', 'one match'):
            A.match_stick(img, 0.56, 0.68, 0.66, 0.56, lit=0.9 if _has(desc, 'lit', 'flame') else 0.0)
            if _has(desc, 'lit', 'flame'):
                spec.append({'type': 'flame', 'cx': 0.66 * BW, 'cy': 0.56 * BH, 'size': BH * 0.05,
                             'color': '#ffb45e', 'space': 'base'})
    elif _has(desc, 'bell'):
        A.bell_closeup(img, 0.5, 0.5, 0.4)
        P.glow(img, 0.3 * BW, 0.25 * BH, BH * 0.4, pal['accent'], intensity=0.2, falloff=2.4)
    else:
        A.saltglass_jar(img, 0.5, 0.5, 0.3, glow_amt=0.3, seed=seed + 1)
    return _grade(img, pal), spec


def t_char_silhouette(desc, pal, seed):
    moon = (0.72, 0.2, 0.04) if _has(desc, 'moon') else None
    img, spec = base_sky(pal, seed, clouds_amt=0.35, moon=moon)
    A.ridge(img, 0.82, 0.02, pal['near'], cells=5, seed=seed + 4)
    x = _pos_x(desc, 0.44)
    f = _facing(desc, x)
    size = 0.62 if _has(desc, 'big', 'medium', 'waist') else 0.42
    if _has(desc, 'deepwalker', 'bellfarer'):
        A.deepwalker(img, x, 0.86, size, pal['ink'], rim=pal['accent'], facing=f)
    elif _has(desc, 'ilsa', 'orla'):
        A.ilsa(img, x, 0.86, size, pal['ink'], rim=pal['accent'], pose=_pose(desc), facing=f)
    else:
        A.yuma(img, x, 0.86, size, pal['ink'], rim=pal['accent'], pose=_pose(desc),
               facing=f, jar_glow=0.6 if _has(desc, 'jar') else 0, phase=0.25)
    if _has(desc, 'rain', 'storm'):
        spec.append({'type': 'rain', 'intensity': 0.8, 'angle': 18, 'space': 'screen'})
    if _has(desc, 'lightning'):
        spec.append({'type': 'lightning', 'times': [2.2], 'space': 'screen'})
    return _grade(img, pal), spec


def t_two_shot(desc, pal, seed):
    img, spec = base_sky(pal, seed, clouds_amt=0.4,
                         moon=(0.5, 0.16, 0.035) if _has(desc, 'moon') else None)
    A.ridge(img, 0.83, 0.02, pal['near'], cells=5, seed=seed + 4)
    if _has(desc, 'deepwalker', 'bellfarer'):
        A.deepwalker(img, 0.62, 0.86, 0.5, pal['ink'], rim=pal['accent'], facing=-1)
        A.yuma(img, 0.34, 0.86, 0.34, pal['ink'], rim=pal['accent'], pose=_pose(desc), facing=1)
    else:
        A.ilsa(img, 0.58, 0.86, 0.40, pal['ink'], rim=pal['accent'],
               pose='sit' if _has(desc, 'sit') else 'stand', facing=-1)
        A.yuma(img, 0.38, 0.86, 0.34 if not _has(desc, 'sit') else 0.29, pal['ink'],
               rim=pal['accent'], pose=_pose(desc), facing=1)
    if _has(desc, 'rain', 'storm'):
        spec.append({'type': 'rain', 'intensity': 0.7, 'angle': 15, 'space': 'screen'})
    return _grade(img, pal), spec


def t_undertow(desc, pal, seed):
    img, spec = base_sky(pal, seed, clouds_amt=0.15, star_scale=0.5)
    hy = 0.5
    A.salt_flats(img, hy, pal['ground_top'], pal['ground_bot'], crack_color=pal['ink'], seed=seed + 5)
    n = 3 if _has(desc, 'three', 'several', 'pod', 'many') else (2 if _has(desc, 'two') else 1)
    scale = 1.25 if _has(desc, 'close', 'fills', 'huge', 'past the cliff') else 0.85
    for i in range(n):
        sw, sh = int(BW * 0.62 * scale * (1 - i * 0.22)), int(BH * 0.5 * scale * (1 - i * 0.22))
        sprite, lights = A.undertow_sprite(sw, sh, seed=seed + 10 + i * 7)
        x0 = BW * (0.18 + 0.3 * i) - sw * 0.5
        y0 = BH * (0.42 + 0.12 * i) - sh * 0.5
        spec.append({'type': 'undertow', 'sprite': sprite, 'lights': lights,
                     'x0': x0, 'y0': y0, 'vx': (BW * 0.006) * (1 if i % 2 == 0 else -0.7),
                     'vy': -BH * 0.0015, 'space': 'base'})
    if _has(desc, 'lighthouse', 'cliff', 'far shore', 'village'):
        A.cliff_drop(img, 'right', 0.30, 0.88, pal['near'], seed=seed + 6)
        lamp = A.lighthouse(img, 0.94, 0.34, 0.2, pal['ink'],
                            lit=not _unlit(desc), lamp_color='#ffd98a', halo=0.8)
        if not _unlit(desc):
            spec.append({'type': 'beam', 'cx': lamp[0], 'cy': lamp[1], 'period': 9.0,
                         'color': '#ffd98a', 'space': 'base'})
    spec.append({'type': 'mist', 'band': (0.45, 0.75), 'alpha': 0.14, 'color': pal['ambient'], 'space': 'screen'})
    return _grade(img, pal), spec


def t_light_beam(desc, pal, seed):
    img = P.canvas(BW, BH, pal['ink'])
    P.stars(img, density=0.0002, seed=seed, horizon=1.0)
    spec = [{'type': 'beam_sweep_big', 'color': pal['accent'], 'space': 'screen',
             'period': 8.0, 'width': 0.16 if _has(desc, 'narrow') else 0.24}]
    spec.append({'type': 'motes', 'n': 60, 'color': pal['accent'], 'space': 'screen'})
    if _has(desc, 'rain', 'storm'):
        spec.append({'type': 'rain', 'intensity': 0.6, 'angle': 12, 'space': 'screen'})
    return _grade(img, pal), spec


def t_storm(desc, pal, seed):
    img, spec = base_sky(pal, seed, clouds_amt=0.85)
    A.ridge(img, 0.72, 0.05, pal['far'], cells=5, seed=seed + 4, fade_to=pal['ambient'])
    A.cliff_drop(img, 'right', 0.6, 0.84, pal['near'], seed=seed + 5)
    lit = not _unlit(desc)
    lamp = A.lighthouse(img, 0.86, 0.72, 0.3, pal['ink'], lit=lit, lamp_color=pal['accent'], halo=0.8)
    if lit:
        spec.append({'type': 'beam', 'cx': lamp[0], 'cy': lamp[1], 'period': 8.0,
                     'color': pal['accent'], 'space': 'base'})
    if _has(desc, 'village'):
        A.village_roofs(img, 0.1, 0.5, 0.78, pal['ink'], window_color=pal['accent'],
                        seed=seed + 6, n=8, lit_frac=0.4)
    spec.append({'type': 'rain', 'intensity': 1.0, 'angle': 22, 'space': 'screen'})
    spec.append({'type': 'lightning', 'times': [0.8, 3.6, 7.4], 'bolt': _has(desc, 'bolt'), 'space': 'screen'})
    if _has(desc, 'yuma', 'espen'):
        A.yuma(img, 0.34, 0.78, 0.12, pal['ink'], rim=pal['accent'], pose=_pose(desc, 'run'), phase=0.6)
    return _grade(img, pal), spec


def t_title_card(desc, pal, seed):
    img, spec = base_sky(pal, seed, clouds_amt=0.2, star_scale=1.4)
    A.ridge(img, 0.85, 0.03, pal['near'], cells=4, seed=seed + 4)
    lamp = A.lighthouse(img, 0.5, 0.88, 0.3, pal['ink'], lit=True, lamp_color=pal['accent'], halo=1.1)
    spec.append({'type': 'beam', 'cx': lamp[0], 'cy': lamp[1], 'period': 10.0,
                 'color': pal['accent'], 'space': 'base'})
    spec.append({'type': 'title_text', 'space': 'screen'})
    return _grade(img, pal), spec


def t_text_card(desc, pal, seed):
    img = P.canvas(BW, BH, '#020308')
    g = P.fbm(BW, BH, cells=3, octaves=3, seed=seed)
    img += (g[..., None] - 0.5) * 0.02
    return np.clip(img, 0, 1), [{'type': 'card_text', 'space': 'screen'}]


def t_montage_detail(desc, pal, seed):
    img = P.vgrad(BW, BH, [(0, pal['ink']), (0.6, pal['near']), (1.0, pal['far'])], seed=seed)
    spec = []
    P.glow(img, 0.28 * BW, 0.22 * BH, BH * 0.5, pal['accent'], intensity=0.22, falloff=2.4)
    if _has(desc, 'salt', 'crystal'):
        g = np.random.default_rng(seed)
        for _ in range(24):
            x, y = g.uniform(0.2, 0.8), g.uniform(0.45, 0.9)
            s = g.uniform(0.01, 0.05)
            ang = g.uniform(0, np.pi)
            tri = [(x * BW + np.cos(ang + a) * s * BH, y * BH + np.sin(ang + a) * s * BH) for a in (0, 2.1, 4.2)]
            P.draw_poly(img, tri, '#cfe3ff' if g.random() < 0.3 else '#8a97ad', blur_r=0.6, alpha=0.8)
    elif _has(desc, 'rope', 'knot'):
        for i in range(5):
            P.draw_ellipse(img, [(0.3 + i * 0.005) * BW, (0.4 + i * 0.09) * BH,
                                 (0.7 - i * 0.005) * BW, (0.52 + i * 0.09) * BH], '#2c2016', blur_r=1.2)
    elif _has(desc, 'ledger', 'book', 'page', 'log'):
        P.draw_poly(img, [(0.24 * BW, 0.3 * BH), (0.76 * BW, 0.3 * BH), (0.78 * BW, 0.88 * BH), (0.22 * BW, 0.88 * BH)],
                    '#c9bfa8', blur_r=1.5)
        for i in range(9):
            y = (0.38 + i * 0.055) * BH
            P.draw_poly(img, [(0.28 * BW, y), (0.72 * BW, y), (0.72 * BW, y + 2), (0.28 * BW, y + 2)],
                        '#5a5244', blur_r=0.5, alpha=0.6)
    elif _has(desc, 'kettle', 'tea', 'stove'):
        P.draw_ellipse(img, [0.4 * BW, 0.5 * BH, 0.62 * BW, 0.72 * BH], '#1c1410', blur_r=1.0)
        P.glow(img, 0.51 * BW, 0.74 * BH, BH * 0.12, '#ff8a3a', intensity=0.5, falloff=1.8)
        A.smoke_wisp(img, 0.5, 0.48, 0.2, '#c9d4e0', seed=seed, alpha=0.2)
    elif _has(desc, 'boots', 'door'):
        for dx in (0.44, 0.54):
            P.draw_poly(img, [(dx * BW, 0.55 * BH), ((dx + 0.07) * BW, 0.55 * BH),
                              ((dx + 0.09) * BW, 0.8 * BH), ((dx - 0.01) * BW, 0.8 * BH)], '#181210', blur_r=1.2)
    else:
        A.saltglass_jar(img, 0.5, 0.55, 0.28, glow_amt=0.35, seed=seed + 2)
    return _grade(img, pal), spec


def t_black(desc, pal, seed):
    img = P.canvas(BW, BH, '#010102')
    spec = []
    if _has(desc, 'saltglass', 'jar', 'blue'):
        spec.append({'type': 'glow_pulse', 'cx': 0.5 * BW, 'cy': 0.6 * BH, 'r': BH * 0.18,
                     'color': '#7fe8ff', 'period': 2.6, 'base': 0.10, 'amp': 0.10, 'space': 'base'})
    return img, spec


BUILDERS = {
    'sky_vista': t_sky_vista,
    'dry_sea_vista': t_dry_sea_vista,
    'cliff_village': t_cliff_village,
    'lighthouse_ext': t_lighthouse_ext,
    'lamp_room_int': t_lamp_room_int,
    'cottage_int': t_cottage_int,
    'stairs': t_stairs,
    'close_hands': t_close_hands,
    'close_eye': t_close_eye,
    'close_object': t_close_object,
    'char_silhouette': t_char_silhouette,
    'two_shot_silhouette': t_two_shot,
    'undertow': t_undertow,
    'light_beam': t_light_beam,
    'storm': t_storm,
    'title_card': t_title_card,
    'text_card': t_text_card,
    'montage_detail': t_montage_detail,
    'black': t_black,
}


def build(template, desc, pal, seed):
    fn = BUILDERS.get(template, t_sky_vista)
    return fn(desc or '', pal, seed)
