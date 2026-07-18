"""Per-frame animated overlays. Layers with space='base' are positioned in
base-still coordinates and must be transformed through the camera; layers with
space='screen' render in output coordinates after the crop."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .util import W, H, hx
from .paint import glow as _glow


class RainBank:
    """Precomputed rain streak tiles, rolled per frame."""

    def __init__(self, seed=71, n=3):
        g = np.random.default_rng(seed)
        self.tiles = []
        for k in range(n):
            t = np.zeros((H, W), dtype=np.float32)
            count = 420
            xs = g.uniform(0, W, count)
            ys = g.uniform(0, H, count)
            ln = g.uniform(H * 0.02, H * 0.05, count)
            br = g.uniform(0.15, 0.55, count) ** 1.5
            for x, y, l, b in zip(xs, ys, ln, br):
                x0, y0 = int(x), int(y)
                steps = int(l)
                for s in range(0, steps, 2):
                    yy = (y0 + s) % H
                    xx = (x0 + int(s * 0.28)) % W
                    t[yy, xx] = max(t[yy, xx], b * (1 - s / max(1, steps)))
            self.tiles.append(t)

    def frame(self, t, intensity, angle=18, clip_y=None):
        speed = H * (1.6 + 0.5 * intensity)
        out = np.zeros((H, W), dtype=np.float32)
        for k, tile in enumerate(self.tiles):
            dy = int((t * speed * (0.8 + 0.25 * k)) % H)
            dx = int((t * speed * 0.28 * (0.8 + 0.25 * k)) % W)
            out += np.roll(np.roll(tile, dy, axis=0), dx, axis=1) * (0.5 + 0.5 / (k + 1))
        out *= intensity * 0.55
        if clip_y is not None:
            out[int(clip_y * H):] = 0
        return out


_RAIN = None


def rain_layer(t, intensity, angle=18, clip_y=None):
    global _RAIN
    if _RAIN is None:
        _RAIN = RainBank()
    return _RAIN.frame(t, intensity, angle, clip_y)


_BEAM_CACHE = {}
_FALL_CACHE = {}


def _beam_sprite(w, h, cx, cy, ang, length, half_deg, color):
    """Wedge beam as an additive layer at (w,h). Quantized + cached; computed
    at quarter res. A soft wedge tolerates 3° angle steps invisibly."""
    q_ang = round(ang / 3.0) * 3.0
    q_cx, q_cy, q_len = round(cx / 12) * 12, round(cy / 12) * 12, round(length / 32) * 32
    key = (q_ang, q_cx, q_cy, q_len, round(half_deg), color)
    hit = _BEAM_CACHE.get(key)
    if hit is not None:
        return hit
    sw, sh = w // 4, h // 4
    m = Image.new('L', (sw, sh), 0)
    d = ImageDraw.Draw(m)
    a0, a1 = np.radians(q_ang - half_deg), np.radians(q_ang + half_deg)
    cx4, cy4, L = q_cx / 4, q_cy / 4, q_len / 4
    pts = [(cx4, cy4)]
    for a in np.linspace(a0, a1, 7):
        pts.append((cx4 + np.cos(a) * L, cy4 + np.sin(a) * L))
    d.polygon(pts, fill=200)
    m = m.filter(ImageFilter.GaussianBlur(2.4))
    mask = np.asarray(m, dtype=np.float32) / 255.0
    fkey = (q_cx, q_cy, q_len)
    fall = _FALL_CACHE.get(fkey)
    if fall is None:
        yy, xx = np.mgrid[0:sh, 0:sw]
        dist = np.sqrt((xx - cx4) ** 2 + (yy - cy4) ** 2) / max(1.0, L)
        fall = np.clip(1 - dist, 0, 1) ** 1.4
        if len(_FALL_CACHE) > 40:
            _FALL_CACHE.clear()
        _FALL_CACHE[fkey] = fall
    small = (mask * fall * 255).astype(np.uint8)
    big = np.asarray(Image.fromarray(small, 'L').resize((w, h), Image.BILINEAR),
                     dtype=np.float32) / 255.0
    out = big[..., None] * hx(color)[None, None, :]
    if len(_BEAM_CACHE) > 400:
        _BEAM_CACHE.clear()
    _BEAM_CACHE[key] = out
    return out


def apply_layer(frame, layer, t, cam=None, dur=6.0):
    """frame: (H,W,3) float. cam: (x0, y0, scale) mapping base->screen px."""
    typ = layer['type']

    def tx(x, y):
        if cam is None or layer.get('space') != 'base':
            return x, y
        x0, y0, s = cam
        return (x - x0) * s, (y - y0) * s

    def sc(v):
        return v if (cam is None or layer.get('space') != 'base') else v * cam[2]

    if typ == 'rain':
        r = rain_layer(t, layer['intensity'], layer.get('angle', 18), layer.get('clip_y'))
        frame += r[..., None] * np.array([0.75, 0.83, 0.95], np.float32)
    elif typ == 'lightning':
        for ft in layer.get('times', []):
            dt = t - ft
            if 0 <= dt < 0.45:
                k = np.exp(-dt * 9) * (1.0 if dt > 0.05 else dt / 0.05)
                frame += k * 0.5 * np.array([0.8, 0.87, 1.0], np.float32)
    elif typ == 'beam':
        x, y = tx(layer['cx'], layer['cy'])
        period = layer.get('period', 9.0)
        ang = (t / period * 360.0) % 360.0
        sweep = 12 + 8 * np.sin(np.radians(ang))
        frame += _beam_sprite(W, H, x, y, ang, sc(1400), 5, layer['color']) * 0.55
        _glow(frame, x, y, sc(60), layer['color'], intensity=0.5, falloff=1.8)
    elif typ == 'beam_sweep_big':
        period = layer.get('period', 8.0)
        ang = 205 + 32 * np.sin(2 * np.pi * t / period)
        frame += _beam_sprite(W, H, W * 0.85, H * 0.1, ang, W * 1.2,
                              layer.get('width', 0.2) * 40, layer['color']) * 0.7
    elif typ == 'flame':
        x, y = tx(layer['cx'], layer['cy'])
        s = sc(layer['size'])
        n = (np.sin(t * 11.7) + np.sin(t * 23.3 + 1.7) + np.sin(t * 5.1 + 0.5)) / 3.0
        k = 0.75 + 0.25 * n
        _glow(frame, x, y - s * 0.2 * k, s * 2.6 * k, layer['color'], intensity=0.8 * k, falloff=1.8)
        _glow(frame, x, y - s * 0.5 * k, s * 0.9, '#fff3d0', intensity=0.9 * k, falloff=1.4)
    elif typ == 'glow_pulse':
        x, y = tx(layer['cx'], layer['cy'])
        k = layer['base'] + layer['amp'] * (0.5 + 0.5 * np.sin(2 * np.pi * t / layer['period']))
        _glow(frame, x, y, sc(layer['r']), layer['color'], intensity=k, falloff=2.0)
    elif typ == 'twinkle':
        xs, ys, bs, ph = layer['stars']
        if cam is not None and layer.get('space') == 'base':
            x0, y0, s = cam
            xs = (xs - x0) * s
            ys = (ys - y0) * s
        keep = (xs >= 0) & (xs < W - 1) & (ys >= 0) & (ys < H - 1)
        xs, ys, bs, ph = xs[keep].astype(int), ys[keep].astype(int), bs[keep], ph[keep]
        tw = bs * (0.55 + 0.45 * np.sin(t * 2.1 + ph)) * 0.6
        np.add.at(frame, (ys, xs), tw[:, None] * np.array([0.9, 0.93, 1.0], np.float32))
    elif typ == 'undertow':
        spr = layer['sprite']
        sh, sw, _ = spr.shape
        x = layer['x0'] + layer['vx'] * t
        y = layer['y0'] + layer['vy'] * t + np.sin(t * 0.5) * sh * 0.02
        if cam is not None and layer.get('space') == 'base':
            cx0, cy0, s = cam
            xs, ys = (x - cx0) * s, (y - cy0) * s
            nw, nh = max(2, int(sw * s)), max(2, int(sh * s))
        else:
            xs, ys, nw, nh = x, y, sw, sh
        if nw != sw:
            im = Image.fromarray((spr * 255).astype(np.uint8), 'RGBA').resize((nw, nh), Image.BILINEAR)
            spr_r = np.asarray(im, dtype=np.float32) / 255.0
        else:
            spr_r = spr
        x0i, y0i = int(xs), int(ys)
        fx0, fy0 = max(0, x0i), max(0, y0i)
        fx1, fy1 = min(W, x0i + nw), min(H, y0i + nh)
        if fx1 > fx0 and fy1 > fy0:
            sub = spr_r[fy0 - y0i:fy1 - y0i, fx0 - x0i:fx1 - x0i]
            a = sub[..., 3:4]
            frame[fy0:fy1, fx0:fx1] = frame[fy0:fy1, fx0:fx1] * (1 - a) + sub[..., :3] * a
        scale = nh / sh
        for i, (lx, ly, lp) in enumerate(layer['lights']):
            px, py = xs + lx * scale, ys + ly * scale
            if 0 <= px < W and 0 <= py < H:
                k = 0.5 + 0.5 * np.sin(t * 1.1 + lp * 6.28 + i)
                _glow(frame, px, py, 14 + 11 * k * scale, '#7fe8ff', intensity=0.6 * k, falloff=1.8)
    elif typ == 'figure':
        bank = layer['bank']
        idx = int(t * layer.get('anim_fps', 8)) % len(bank)
        spr = bank[idx]
        sh, sw, _ = spr.shape
        x = layer['x0'] + layer.get('vx', 0.0) * t
        y = layer['y0'] + layer.get('vy', 0.0) * t
        if cam is not None and layer.get('space') == 'base':
            cx0, cy0, s = cam
            xs, ys = (x - cx0) * s, (y - cy0) * s
            nw, nh = max(2, int(sw * s)), max(2, int(sh * s))
        else:
            xs, ys, nw, nh = x, y, sw, sh
        cache = layer.setdefault('_rc', {})
        ck = (idx, nw)
        spr_r = cache.get(ck)
        if spr_r is None:
            if nw != sw:
                im = Image.fromarray((np.clip(spr, 0, 1) * 255).astype(np.uint8), 'RGBA')
                spr_r = np.asarray(im.resize((nw, nh), Image.BILINEAR), dtype=np.float32) / 255.0
            else:
                spr_r = spr
            if len(cache) > 40:
                cache.clear()
            cache[ck] = spr_r
        nh, nw = spr_r.shape[:2]  # cached size wins: avoids off-by-one vs fresh math
        x0i, y0i = int(xs - nw / 2), int(ys - nh)  # anchor: bottom-center
        fx0, fy0 = max(0, x0i), max(0, y0i)
        fx1, fy1 = min(W, x0i + nw), min(H, y0i + nh)
        if fx1 > fx0 and fy1 > fy0:
            sub = spr_r[fy0 - y0i:fy1 - y0i, fx0 - x0i:fx1 - x0i]
            a = sub[..., 3:4]
            frame[fy0:fy1, fx0:fx1] = frame[fy0:fy1, fx0:fx1] * (1 - a) + sub[..., :3] * a
    elif typ == 'sprite':
        # static RGBA overlay in base coords with optional parallax factor
        spr = layer['rgba']
        sh, sw, _ = spr.shape
        if cam is not None and layer.get('space') == 'base':
            cx0, cy0, s = cam
            par = layer.get('parallax', 1.0)
            from .util import BW as _BW, BH as _BH
            cam_cx = cx0 + (W / s) / 2
            extra = (cam_cx - _BW / 2) * (par - 1.0)
            xs = (layer['x0'] - cx0 - extra) * s
            ys = (layer['y0'] - cy0) * s
            nw, nh = max(2, int(sw * s)), max(2, int(sh * s))
        else:
            xs, ys, nw, nh = layer['x0'], layer['y0'], sw, sh
        cache = layer.setdefault('_rc', {})
        spr_r = cache.get(nw)
        if spr_r is None:
            if nw != sw:
                im = Image.fromarray((np.clip(spr, 0, 1) * 255).astype(np.uint8), 'RGBA')
                spr_r = np.asarray(im.resize((nw, nh), Image.BILINEAR), dtype=np.float32) / 255.0
            else:
                spr_r = spr
            cache.clear()
            cache[nw] = spr_r
        nh, nw = spr_r.shape[:2]
        x0i, y0i = int(xs), int(ys)
        fx0, fy0 = max(0, x0i), max(0, y0i)
        fx1, fy1 = min(W, x0i + nw), min(H, y0i + nh)
        if fx1 > fx0 and fy1 > fy0:
            sub = spr_r[fy0 - y0i:fy1 - y0i, fx0 - x0i:fx1 - x0i]
            a = sub[..., 3:4]
            frame[fy0:fy1, fx0:fx1] = frame[fy0:fy1, fx0:fx1] * (1 - a) + sub[..., :3] * a
    elif typ == 'impact':
        # 2 inverted frames + 1 white frame at the named moment
        dt = t - layer['at']
        if 0 <= dt < 3.0 / 24.0:
            if dt < 2.0 / 24.0:
                frame[:] = np.clip(1.0 - frame * 0.92, 0, 1)
            else:
                frame[:] = np.clip(frame * 0.3 + 0.7, 0, 1)
    elif typ == 'light_slam':
        # expanding ring of light + warm flood decaying fast: light as impact
        dt = t - layer['at']
        if 0 <= dt < 1.1:
            cxs, cys = layer.get('cx', W * 0.5), layer.get('cy', H * 0.42)
            if cam is not None and layer.get('space') == 'base':
                x0c, y0c, s = cam
                cxs, cys = (cxs - x0c) * s, (cys - y0c) * s
            grid = layer.get('_grid')
            if grid is None:
                yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
                grid = np.sqrt((xx - cxs) ** 2 + (yy - cys) ** 2)
                layer['_grid'] = grid
            r = dt * W * 1.6
            ring = np.exp(-((grid - r) / (W * 0.04)) ** 2) * np.exp(-dt * 2.6)
            flood = np.exp(-dt * 4.0) * 0.55
            col = hx(layer.get('color', '#ffd98a'))
            frame += (ring[..., None] * 0.9 + flood) * col[None, None, :]
    elif typ == 'mist':
        b0, b1 = layer['band']
        y0i, y1i = int(b0 * H), int(b1 * H)
        if y1i > y0i:
            xs = np.arange(W)
            band = (np.sin(xs * 0.006 + t * 0.35) * 0.5 + 0.5)[None, :]
            prof = np.sin(np.linspace(0, np.pi, y1i - y0i))[:, None]
            a = (0.4 + 0.6 * band) * prof * layer['alpha']
            col = hx(layer.get('color', '#8a97ad'))
            frame[y0i:y1i] = frame[y0i:y1i] * (1 - a[..., None]) + col * a[..., None]
    elif typ == 'motes':
        g = np.random.default_rng(1234)
        n = layer.get('n', 50)
        xs = g.uniform(0, W, n)
        ys = g.uniform(0, H, n)
        ph = g.uniform(0, 6.28, n)
        x = (xs + t * 12 + 20 * np.sin(t * 0.4 + ph)) % W
        y = (ys + t * 6) % H
        k = (0.3 + 0.7 * (0.5 + 0.5 * np.sin(t * 1.4 + ph))) * 0.35
        col = hx(layer.get('color', '#ffd98a'))
        np.add.at(frame, (y.astype(int), x.astype(int)), k[:, None] * col[None, :])
    elif typ == 'birds':
        g = np.random.default_rng(77)
        n = layer.get('n', 6)
        bx = g.uniform(0.1, 0.9, n) * W
        by = g.uniform(0.12, 0.4, n) * H
        for i in range(n):
            x = (bx[i] + t * 26 * (1 + i * 0.1)) % (W * 1.2) - W * 0.1
            y = by[i] + np.sin(t * 2 + i) * 6
            flap = abs(np.sin(t * 7 + i * 1.3)) * 6
            if 8 < x < W - 8 and 8 < y < H - 8:
                for ddx in (-1, 1):
                    x2, y2 = int(x + ddx * 7), int(y - flap + 3)
                    frame[int(y), int(x)] = frame[int(y), int(x)] * 0.3
                    frame[y2, x2] = frame[y2, x2] * 0.35
    return frame
