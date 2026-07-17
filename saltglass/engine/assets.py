"""Scene assets for SALTGLASS: landscape pieces, characters, props, creature.

Everything draws onto float32 (h,w,3) canvases. Coordinates are normalized
(0..1 of width/height) unless suffixed _px. Assets aim for a silhouette /
rim-light art direction: strong shapes, soft edges, atmospheric fades.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .util import hx, lerp
from .paint import (fbm, fbm1d, poly_mask, glow, soft_disc, rim_light, blur,
                    draw_poly, draw_ellipse, _rng)


# ---------------------------------------------------------------- helpers

def _px(img, x, y):
    h, w, _ = img.shape
    return x * w, y * h


def _apply_mask(img, mask, color, alpha=1.0):
    col = hx(color) if isinstance(color, str) else np.asarray(color, np.float32)
    m = mask[..., None] * alpha
    img[:] = img * (1 - m) + col * m
    return img


def _mask_canvas(img):
    h, w, _ = img.shape
    return Image.new('L', (w, h), 0)


def _jitter(pts, amt, seed):
    g = _rng(seed)
    return [(x + g.uniform(-amt, amt), y + g.uniform(-amt, amt)) for x, y in pts]


def _finish_mask(m, blur_r=1.0):
    if blur_r:
        m = m.filter(ImageFilter.GaussianBlur(blur_r))
    return np.asarray(m, dtype=np.float32) / 255.0


def _bez(pts, n=24):
    """Sample a bezier of any order (De Casteljau)."""
    pts = [np.asarray(p, dtype=np.float64) for p in pts]
    out = []
    for t in np.linspace(0, 1, n):
        layer = pts
        while len(layer) > 1:
            layer = [layer[i] * (1 - t) + layer[i + 1] * t for i in range(len(layer) - 1)]
        out.append(tuple(layer[0]))
    return out


# ---------------------------------------------------------------- landscape

def ridge(img, base_y, amp, color, cells=6, seed=21, fade_to=None, fade_pow=1.0):
    """Mountain/cliff ridgeline filled downward. fade_to = atmospheric color."""
    h, w, _ = img.shape
    prof = fbm1d(w, cells=cells, octaves=5, seed=seed)
    prof = (prof - prof.mean())
    line = (base_y + prof * amp) * h
    yy = np.arange(h, dtype=np.float32)[:, None]
    mask = np.clip((yy - line[None, :]) / 2.0, 0, 1)  # 2px soft edge
    col = hx(color) if isinstance(color, str) else np.asarray(color, np.float32)
    if fade_to is not None:
        fc = hx(fade_to) if isinstance(fade_to, str) else np.asarray(fade_to, np.float32)
        t = np.clip((yy - line[None, :]) / (0.35 * h), 0, 1) ** fade_pow
        colgrid = fc[None, None, :] * (1 - t[..., None]) + col[None, None, :] * t[..., None]
        img[:] = img * (1 - mask[..., None]) + colgrid * mask[..., None]
    else:
        img[:] = img * (1 - mask[..., None]) + col * mask[..., None]
    return img


def cliff_drop(img, side, top_y, edge_x, color, seed=31):
    """Vertical cliff face on 'left'/'right' side from top_y down."""
    h, w, _ = img.shape
    prof = fbm1d(h, cells=5, octaves=4, seed=seed)
    prof = (prof - prof.mean()) * 0.06
    xs = (edge_x + prof) * w
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    pts = [(xs[y], y) for y in range(int(top_y * h), h)]
    if side == 'left':
        poly = [(0, int(top_y * h))] + pts + [(0, h)]
    else:
        poly = [(w, int(top_y * h))] + pts + [(w, h)]
    d.polygon(poly, fill=255)
    mask = _finish_mask(m, 1.2)
    return _apply_mask(img, mask, color)


def salt_flats(img, horizon_y, top_color, bottom_color, crack_color=None,
               seed=41, cracks=True, shimmer=0.0):
    """Perspective salt-flat ground plane from horizon down."""
    h, w, _ = img.shape
    hy = int(horizon_y * h)
    if hy >= h:
        return img
    gh = h - hy
    ys = np.linspace(0, 1, gh, dtype=np.float32)[:, None, None]
    tc = hx(top_color) if isinstance(top_color, str) else np.asarray(top_color, np.float32)
    bc = hx(bottom_color) if isinstance(bottom_color, str) else np.asarray(bottom_color, np.float32)
    ground = tc[None, None, :] * (1 - ys) + bc[None, None, :] * ys
    tex = fbm(w, gh, cells=10, octaves=3, seed=seed)[..., None]
    ground = ground * (0.92 + 0.16 * tex)
    if shimmer:
        sh = fbm(w, gh, cells=24, octaves=2, seed=seed + 9)[..., None]
        ground += shimmer * np.clip(sh - 0.6, 0, 1)
    img[hy:] = np.clip(ground.repeat(w, axis=1) if ground.shape[1] == 1 else ground, 0, 1)
    if cracks and crack_color is not None:
        m = Image.new('L', (w, h), 0)
        d = ImageDraw.Draw(m)
        g = _rng(seed + 3)
        rows = 14
        prev_y = hy + 2
        for r in range(rows):
            t = (r + 1) / rows
            y = hy + int(gh * (t ** 1.9))
            if y - prev_y > 3:
                xs = np.arange(0, w, 8)
                wob = (fbm1d(len(xs), cells=6, octaves=3, seed=seed + r) - 0.5) * 18 * t
                d.line(list(zip(xs.astype(float), (y + wob).astype(float))), fill=90, width=max(1, int(1 + 2 * t)))
            prev_y = y
        n_cols = 26
        for c in range(n_cols):
            x0 = g.uniform(0, w)
            drift = g.uniform(-0.35, 0.35)
            pts = []
            for r in range(rows + 1):
                t = r / rows
                y = hy + gh * (t ** 1.9)
                x = x0 + drift * gh * t + (fbm1d(8, cells=3, seed=seed + c * 7)[r % 8] - 0.5) * 30 * t
                pts.append((x, y))
            d.line(pts, fill=70, width=1)
        mask = _finish_mask(m, 0.6) * 0.85
        _apply_mask(img, mask, crack_color)
    # faint band of reflected sky at the horizon, fading downward softly
    band_h = max(4, int(0.03 * h))
    if hy + band_h < h:
        fade = np.linspace(1.0, 0.0, band_h, dtype=np.float32)[:, None, None] ** 1.6
        img[hy:hy + band_h] = np.clip(img[hy:hy + band_h] * (1 + 0.08 * fade) + 0.008 * fade, 0, 1)
    return img


def whale_bones(img, cx, base_y, scale, color, seed=5, ribs=7):
    """Ribcage of something vast: curved tapering spikes rising from the salt,
    arranged in perspective like a broken cathedral."""
    h, w, _ = img.shape
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    g = _rng(seed)
    for i in range(ribs):
        t = i / max(1, ribs - 1)
        rx = (cx + (t - 0.5) * 0.30 * scale) * w
        ry = base_y * h + (0.5 - abs(t - 0.5)) * 0.02 * h
        rh = scale * h * (0.55 + 0.45 * np.sin(np.pi * t)) * (0.85 + g.uniform(-0.08, 0.08))
        curl = (1 if t < 0.5 else -1) * rh * 0.42  # ribs curve inward
        spine = _bez([(rx, ry), (rx + curl * 0.25, ry - rh * 0.62), (rx + curl, ry - rh)], 18)
        base_w = rh * 0.045
        left, right = [], []
        for j, (px, py) in enumerate(spine):
            bw_ = base_w * (1 - j / len(spine)) + 1
            left.append((px - bw_, py))
            right.append((px + bw_, py))
        d.polygon(left + right[::-1], fill=255)
    mask = _finish_mask(m, 0.9)
    return _apply_mask(img, mask, color)


def shipwreck(img, cx, base_y, scale, color, seed=6):
    """Tilted hull + broken masts silhouette."""
    h, w, _ = img.shape
    x, y = cx * w, base_y * h
    s = scale * h
    tilt = 0.14  # the whole wreck lists to starboard
    def T(px, py):
        dx, dy = px - x, py - y
        return (x + dx + dy * tilt, y + dy - dx * tilt * 0.4)
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    hull = [T(x - s * 0.9, y), T(x - s * 0.7, y - s * 0.38), T(x + s * 0.6, y - s * 0.38),
            T(x + s * 0.95, y - s * 0.05), T(x + s * 0.8, y)]
    d.polygon(_jitter(hull, s * 0.012, seed), fill=255)
    # masts rise from the deck, one snapped
    deck1, deck2 = T(x - s * 0.25, y - s * 0.38), T(x + s * 0.3, y - s * 0.38)
    top1 = (deck1[0] + s * 0.10, deck1[1] - s * 0.95)
    d.line([deck1, top1], width=max(2, int(s * 0.035)), fill=255)
    d.line([(top1[0] - s * 0.22, top1[1] + s * 0.16), (top1[0] + s * 0.22, top1[1] + s * 0.10)],
           width=max(1, int(s * 0.02)), fill=255)
    stub = (deck2[0] + s * 0.16, deck2[1] - s * 0.45)
    d.line([deck2, stub], width=max(2, int(s * 0.03)), fill=255)
    d.line([stub, (stub[0] + s * 0.2, stub[1] + s * 0.18)], width=max(1, int(s * 0.02)), fill=255)
    mask = _finish_mask(m, 1.0)
    return _apply_mask(img, mask, color)


def stone_kelp(img, xs, base_y, hmax, color, seed=8):
    """Petrified kelp: tapering wavy stalks."""
    h, w, _ = img.shape
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    g = _rng(seed)
    for x0 in xs:
        x0 = x0 * w
        kh = hmax * h * g.uniform(0.5, 1.0)
        sway = g.uniform(-0.3, 0.3)
        pts = []
        segs = 14
        for i in range(segs + 1):
            t = i / segs
            wob = np.sin(t * g.uniform(4, 7) + g.uniform(0, 6)) * kh * 0.06 * t
            pts.append((x0 + sway * kh * t + wob, base_y * h - kh * t))
        for i in range(segs):
            width = max(1, int(kh * 0.05 * (1 - i / segs)))
            d.line([pts[i], pts[i + 1]], fill=255, width=width)
    mask = _finish_mask(m, 0.8)
    return _apply_mask(img, mask, color)


def village_roofs(img, x0, x1, base_y, color, window_color='#ffb45e',
                  seed=9, n=9, scale=1.0, lit_frac=0.7, lit_positions=None):
    """Cluster of gabled roofs; returns window glow points for later animation."""
    h, w, _ = img.shape
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    g = _rng(seed)
    wins = []
    for i in range(n):
        t = i / max(1, n - 1)
        cx = (x0 + (x1 - x0) * t + g.uniform(-0.01, 0.01)) * w
        hw = g.uniform(0.028, 0.05) * w * scale
        hh = g.uniform(0.04, 0.075) * h * scale
        by = base_y * h + g.uniform(-0.012, 0.012) * h
        d.polygon([(cx - hw, by), (cx - hw, by - hh), (cx, by - hh - hw * 0.8),
                   (cx + hw, by - hh), (cx + hw, by)], fill=255)
        if g.random() < 0.5:
            chx = cx + g.uniform(-0.5, 0.5) * hw
            d.rectangle([chx - hw * 0.08, by - hh - hw * 0.55, chx + hw * 0.08, by - hh], fill=255)
        if g.random() < lit_frac:
            wins.append((cx + g.uniform(-0.55, 0.55) * hw, by - g.uniform(0.25, 0.6) * hh))
    mask = _finish_mask(m, 0.8)
    _apply_mask(img, mask, color)
    pts = lit_positions if lit_positions is not None else wins
    for (wx, wy) in pts:
        glow(img, wx, wy, 14 * scale, window_color, intensity=0.5, falloff=2.6)
        img[int(wy) - 2:int(wy) + 2, int(wx) - 1:int(wx) + 2] = hx(window_color)
    return img, wins


def lighthouse(img, cx, base_y, height, color, lit=True, lamp_color='#ffd98a',
               seed=12, gallery=True, beam=None, halo=1.0):
    """The Hollow Light. height normalized. Returns lamp (x, y) px for anim."""
    h, w, _ = img.shape
    x = cx * w
    ph = height * h
    by = base_y * h
    ty = by - ph
    wb, wt = ph * 0.16, ph * 0.085
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    d.polygon([(x - wb, by), (x - wt, ty), (x + wt, ty), (x + wb, by)], fill=255)
    gy = ty
    gw = wt * 1.7
    d.rectangle([x - gw, gy - ph * 0.018, x + gw, gy], fill=255)
    lr_h = ph * 0.12
    lr_w = wt * 1.25
    d.rectangle([x - lr_w, gy - lr_h, x + lr_w, gy - ph * 0.015], fill=255)
    d.polygon([(x - lr_w * 1.25, gy - lr_h), (x, gy - lr_h - ph * 0.07), (x + lr_w * 1.25, gy - lr_h)], fill=255)
    if gallery:
        d.rectangle([x - gw, gy - lr_h - ph * 0.002, x + gw, gy - lr_h + ph * 0.008], fill=255)
    for fy in np.linspace(by - ph * 0.15, ty + ph * 0.25, 3):
        d.rectangle([x - wt * 0.35, fy - ph * 0.012, x + wt * 0.35, fy + ph * 0.012], fill=0)
    mask = _finish_mask(m, 0.9)
    _apply_mask(img, mask, color)
    lampx, lampy = x, gy - lr_h * 0.5
    if lit:
        pane = Image.new('L', (w, h), 0)
        dp = ImageDraw.Draw(pane)
        dp.rectangle([x - lr_w * 0.85, gy - lr_h * 0.9, x + lr_w * 0.85, gy - ph * 0.02], fill=255)
        pm = _finish_mask(pane, 0.6)
        _apply_mask(img, pm, lamp_color)
        glow(img, lampx, lampy, ph * 0.5 * halo, lamp_color, intensity=0.85, falloff=2.0)
        glow(img, lampx, lampy, ph * 1.6 * halo, lamp_color, intensity=0.22, falloff=2.4)
    return lampx, lampy


def stairs_cliff(img, x0, y0, x1, y1, color, steps=24, seed=14):
    """Zigzag stair band cut into a cliff between two points."""
    h, w, _ = img.shape
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    g = _rng(seed)
    px, py = x0 * w, y0 * h
    ex, ey = x1 * w, y1 * h
    n_flights = 4
    pts = [(px, py)]
    for i in range(1, n_flights + 1):
        t = i / n_flights
        zig = 0.06 * w * (1 if i % 2 else -1)
        pts.append((px + (ex - px) * t + zig * (1 - t), py + (ey - py) * t))
    band = max(3, int(0.012 * h))
    for i in range(len(pts) - 1):
        d.line([pts[i], pts[i + 1]], fill=255, width=band)
        (ax, ay), (bx, by_) = pts[i], pts[i + 1]
        seg = int(np.hypot(bx - ax, by_ - ay) / (band * 1.1))
        for s in range(seg):
            t = s / max(1, seg)
            sx, sy = ax + (bx - ax) * t, ay + (by_ - ay) * t
            d.line([(sx, sy), (sx + band * 0.7, sy - band * 0.35)], fill=255, width=1)
    mask = _finish_mask(m, 0.8)
    return _apply_mask(img, mask, color)


# ---------------------------------------------------------------- characters

def _figure_fill(img, m, color, rim, rim_dir, rim_strength=0.75, blur_r=0.8):
    mask = _finish_mask(m, blur_r)
    _apply_mask(img, mask, color)
    if rim is not None:
        rim_light(img, mask, direction=rim_dir, width=3, color=rim, strength=rim_strength)
    return mask


def yuma(img, cx, base_y, height, color='#0c0e14', rim=None, rim_dir=(-1, 0),
         pose='stand', phase=0.0, facing=1, jar_glow=0.0, seed=17):
    """Yuma: small, spiky hair, oversized coat, scarf. facing: 1 right, -1 left."""
    h, w, _ = img.shape
    x = cx * w
    ph = height * h
    by = base_y * h
    m = _mask_canvas(img)
    d = ImageDraw.Draw(m)
    f = facing
    head_r = ph * 0.095
    hx_, hy_ = x + f * ph * 0.01, by - ph * 0.88 + np.sin(phase * 2 * np.pi) * ph * 0.006
    d.ellipse([hx_ - head_r, hy_ - head_r, hx_ + head_r, hy_ + head_r], fill=255)
    g = _rng(seed)
    for i in range(5):
        a = -2.45 + i * 0.38 + g.uniform(-0.05, 0.05)  # top arc only, windswept
        base_w = head_r * 0.30
        sx, sy = hx_ + np.cos(a) * head_r * 0.82, hy_ + np.sin(a) * head_r * 0.82
        tip_len = 1.30 + g.uniform(0.0, 0.22)
        tipx = hx_ + np.cos(a - 0.18 * f) * head_r * tip_len
        tipy = hy_ + np.sin(a - 0.18 * f) * head_r * tip_len
        ox, oy = np.cos(a + np.pi / 2) * base_w, np.sin(a + np.pi / 2) * base_w
        d.polygon([(sx - ox, sy - oy), (sx + ox, sy + oy), (tipx, tipy)], fill=255)
    sh_y = by - ph * 0.74
    coat_top_w = ph * 0.14
    coat_bot_w = ph * 0.21
    hem_y = by - ph * 0.18
    lean = {'run': 0.10, 'walk': 0.045, 'climb': 0.09}.get(pose, 0.0) * f * ph
    d.polygon([(x - coat_top_w + lean, sh_y), (x + coat_top_w + lean, sh_y),
               (x + coat_bot_w, hem_y), (x - coat_bot_w, hem_y)], fill=255)
    d.polygon([(x - coat_bot_w, hem_y), (x + coat_bot_w, hem_y),
               (x + coat_bot_w * 0.92, hem_y + ph * 0.04), (x - coat_bot_w * 0.92, hem_y + ph * 0.04)], fill=255)
    leg_w = ph * 0.045
    if pose in ('walk', 'run', 'climb'):
        swing = np.sin(phase * 2 * np.pi) * (0.16 if pose == 'run' else 0.09) * ph
        d.polygon([(x - leg_w + swing * 0.6, hem_y), (x + swing * 0.6, hem_y),
                   (x + swing + leg_w * 0.3, by), (x + swing - leg_w, by)], fill=255)
        d.polygon([(x - leg_w - swing * 0.6, hem_y), (x - swing * 0.6 + leg_w, hem_y),
                   (x - swing + leg_w, by), (x - swing - leg_w * 0.3, by)], fill=255)
    elif pose == 'kneel':
        d.rectangle([x - leg_w * 2, hem_y, x + leg_w * 2, by - ph * 0.02], fill=255)
    else:
        d.rectangle([x - leg_w * 1.8, hem_y, x - leg_w * 0.2, by], fill=255)
        d.rectangle([x + leg_w * 0.2, hem_y, x + leg_w * 1.8, by], fill=255)
    arm_w = ph * 0.04
    if pose == 'reach_up':
        d.line([(x + f * coat_top_w * 0.7, sh_y + ph * 0.03), (x + f * ph * 0.16, sh_y - ph * 0.22)],
               fill=255, width=int(arm_w))
    elif pose == 'holding':
        d.line([(x - coat_top_w * 0.7, sh_y + ph * 0.05), (x + f * ph * 0.10, sh_y + ph * 0.22)],
               fill=255, width=int(arm_w))
        d.line([(x + coat_top_w * 0.7, sh_y + ph * 0.05), (x + f * ph * 0.10, sh_y + ph * 0.22)],
               fill=255, width=int(arm_w))
    elif pose in ('run', 'climb'):
        sw = np.sin(phase * 2 * np.pi + np.pi) * 0.12 * ph
        d.line([(x - coat_top_w * 0.6, sh_y + ph * 0.04), (x - coat_top_w * 0.6 + sw, sh_y + ph * 0.28)],
               fill=255, width=int(arm_w))
        d.line([(x + coat_top_w * 0.6, sh_y + ph * 0.04), (x + coat_top_w * 0.6 - sw, sh_y + ph * 0.28)],
               fill=255, width=int(arm_w))
    # scarf: snug wrap at the neck plus a small tail flying behind
    scarf_y = sh_y + ph * 0.005
    d.rectangle([x - coat_top_w * 0.62 + lean, scarf_y - ph * 0.022,
                 x + coat_top_w * 0.62 + lean, scarf_y + ph * 0.022], fill=255)
    flap = np.sin(phase * 2 * np.pi * 1.7) * ph * 0.02
    tail = _bez([(x - f * coat_top_w * 0.5, scarf_y),
                 (x - f * (coat_top_w + ph * 0.05), scarf_y + ph * 0.06 + flap),
                 (x - f * (coat_top_w + ph * 0.09), scarf_y + ph * 0.13 + flap * 2)], 10)
    lower = [(px, py + ph * (0.020 - 0.001 * i)) for i, (px, py) in enumerate(tail)]
    d.polygon(tail + lower[::-1], fill=255)
    mask = _figure_fill(img, m, color, rim, rim_dir)
    if jar_glow > 0:
        jx, jy = x + f * ph * 0.10, sh_y + ph * 0.24
        glow(img, jx, jy, ph * 0.16, '#7fe8ff', intensity=0.55 * jar_glow, falloff=2.0)
    return mask


def ilsa(img, cx, base_y, height, color='#0c0e14', rim=None, rim_dir=(-1, 0),
         pose='stand', facing=1, cane=True, seed=18, breath=0.0):
    """Ilsa: bent posture, hooded shawl, braid, cane."""
    h, w, _ = img.shape
    x = cx * w
    ph = height * h
    by = base_y * h
    f = facing
    m = _mask_canvas(img)
    d = ImageDraw.Draw(m)
    if pose == 'lying':
        # a low blanket mound, head on a pillow, braid trailing
        mound = _bez([(x - ph * 0.45, by), (x - ph * 0.3, by - ph * 0.16),
                      (x - ph * 0.05, by - ph * 0.10), (x + ph * 0.22, by - ph * 0.14), (x + ph * 0.42, by)], 28)
        d.polygon(mound + [(x + ph * 0.45, by + 2), (x - ph * 0.48, by + 2)], fill=255)
        hr = ph * 0.075
        hxp = x + f * ph * 0.36
        d.ellipse([hxp - hr, by - ph * 0.115 - hr, hxp + hr, by - ph * 0.115 + hr], fill=255)
        d.line([(hxp + f * hr * 0.6, by - ph * 0.08), (hxp + f * (hr * 0.6 + ph * 0.1), by - ph * 0.01)],
               fill=255, width=max(2, int(ph * 0.02)))
        return _figure_fill(img, m, color, rim, rim_dir)
    # bent, rounded old keeper under a hooded shawl — narrow, human-scaled
    bend = {'stand': 0.10, 'walk': 0.13, 'sit': 0.05, 'kneel': 0.08}.get(pose, 0.10)
    bend += breath * 0.012  # slow breathing sways the bent shoulders
    top_y = by - ph * (1.0 if pose in ('stand', 'walk') else 0.72) + breath * ph * 0.006
    hxp = x + f * ph * bend  # head pushed forward of the hips
    head_r = ph * 0.08
    hyp = top_y + head_r * 1.1
    spine = _bez([(x - f * ph * 0.06, by), (x - f * ph * 0.09, by - ph * 0.5),
                  (hxp - f * ph * 0.02, hyp + head_r * 1.2)], 16)
    half_w = [ph * (0.13 - 0.075 * (i / 15) ** 1.4) for i in range(16)]
    left = [(px - hw, py) for (px, py), hw in zip(spine, half_w)]
    right = [(px + hw, py) for (px, py), hw in zip(spine, half_w)]
    d.polygon(left + right[::-1], fill=255)
    d.ellipse([hxp - head_r, hyp - head_r, hxp + head_r, hyp + head_r], fill=255)
    d.polygon([(hxp - head_r * 1.25, hyp + head_r * 0.5), (hxp - head_r * 1.05, hyp - head_r * 0.9),
               (hxp + f * head_r * 0.2, hyp - head_r * 1.35), (hxp + head_r * 1.05, hyp - head_r * 0.7),
               (hxp + head_r * 1.25, hyp + head_r * 0.5)], fill=255)
    braid = _bez([(hxp - f * head_r * 0.8, hyp + head_r * 0.6),
                  (hxp - f * head_r * 1.6, hyp + ph * 0.16),
                  (hxp - f * head_r * 1.3, hyp + ph * 0.30)], 12)
    d.line(braid, fill=255, width=max(2, int(ph * 0.022)))
    if pose == 'sit':
        d.ellipse([x - ph * 0.16, by - ph * 0.30, x + ph * 0.16, by], fill=255)
    if cane and pose in ('stand', 'walk'):
        cane_x = hxp + f * ph * 0.16
        d.line([(hxp + f * head_r * 1.1, hyp + head_r * 2.4), (cane_x, by)],
               fill=255, width=max(2, int(ph * 0.016)))
    return _figure_fill(img, m, color, rim, rim_dir)


def deepwalker(img, cx, base_y, height, color='#0a0c11', rim=None, rim_dir=(1, 0),
               facing=-1, lantern=True, bell_sparkle=0.6, seed=19, breath=0.0):
    """The Deepwalker: wide flat hat, long coat, staff-lantern, bell specks."""
    h, w, _ = img.shape
    x = cx * w
    ph = height * h
    by = base_y * h
    f = facing
    m = _mask_canvas(img)
    d = ImageDraw.Draw(m)
    hat_y = by - ph * 0.93 + breath * ph * 0.005
    hat_w = ph * 0.22
    d.ellipse([x - hat_w, hat_y - ph * 0.018, x + hat_w, hat_y + ph * 0.028], fill=255)
    d.ellipse([x - hat_w * 0.35, hat_y - ph * 0.05, x + hat_w * 0.35, hat_y + ph * 0.01], fill=255)
    d.polygon([(x - ph * 0.11, hat_y + ph * 0.02), (x + ph * 0.11, hat_y + ph * 0.02),
               (x + ph * 0.16, by), (x - ph * 0.16, by)], fill=255)
    # travel-sash draped over the shoulder (carries the bells)
    sash = _bez([(x + ph * 0.09, hat_y + ph * 0.10), (x - ph * 0.02, hat_y + ph * 0.34),
                 (x - ph * 0.13, hat_y + ph * 0.62)], 14)
    lower = [(px - ph * 0.035, py + ph * 0.03) for px, py in sash]
    d.polygon(sash + lower[::-1], fill=255)
    sx = x + f * ph * 0.24
    d.line([(sx, by), (sx, hat_y - ph * 0.04)], fill=255, width=max(2, int(ph * 0.016)))
    # lantern box hanging just below the staff head
    lx, ly = sx, hat_y + ph * 0.05
    d.rectangle([lx - ph * 0.030, ly - ph * 0.038, lx + ph * 0.030, ly + ph * 0.038], fill=255)
    mask = _figure_fill(img, m, color, rim, rim_dir)
    if lantern:
        k = 1.0 + 0.15 * np.sin(breath * 2.4)
        glow(img, lx, ly, ph * 0.09 * k, '#ffca7a', intensity=0.95, falloff=1.6)
        glow(img, lx, ly, ph * 0.28 * k, '#ffca7a', intensity=0.28, falloff=2.2)
    if bell_sparkle > 0:
        g = _rng(seed + int(breath * 3) % 7)
        for _ in range(10):
            bx = x + g.uniform(-0.13, 0.13) * ph
            byy = by - g.uniform(0.1, 0.6) * ph
            b = g.uniform(0.2, 1.0) * bell_sparkle
            yi, xi = int(byy), int(bx)
            if 0 <= yi < h and 0 <= xi < w:
                img[yi, xi] = np.clip(img[yi, xi] + b * hx('#ffe9b0'), 0, 1)
    return mask


# ---------------------------------------------------------------- creature

def undertow_sprite(sw, sh, seed=23, dark=0.92):
    """RGBA sprite of an Undertow leviathan + fin-light points (in sprite px).

    Body reads as a hole in the night: near-black mass, soft edges,
    a raked line of pale-blue lights along the flank.
    """
    g = _rng(seed)
    m = Image.new('L', (sw, sh), 0)
    d = ImageDraw.Draw(m)
    cx, cy = sw * 0.46, sh * 0.52
    bw, bh = sw * 0.36, sh * 0.30
    d.ellipse([cx - bw, cy - bh, cx + bw, cy + bh], fill=255)
    d.polygon([(cx + bw * 0.8, cy - bh * 0.25), (cx + sw * 0.30, cy - sh * 0.30),
               (cx + sw * 0.24, cy - sh * 0.02), (cx + sw * 0.34, cy + sh * 0.24),
               (cx + bw * 0.8, cy + bh * 0.3)], fill=255)
    d.polygon([(cx - bw * 0.55, cy + bh * 0.5), (cx - bw * 0.9, cy + bh * 1.5),
               (cx - bw * 0.35, cy + bh * 0.85)], fill=255)
    d.polygon([(cx - bw * 0.98, cy - bh * 0.1), (cx - sw * 0.44, cy - sh * 0.06),
               (cx - bw * 0.9, cy + bh * 0.35)], fill=255)
    mb = m.filter(ImageFilter.GaussianBlur(sh * 0.035))
    alpha = np.asarray(mb, dtype=np.float32) / 255.0 * dark
    wide = np.asarray(m.filter(ImageFilter.GaussianBlur(sh * 0.09)), dtype=np.float32) / 255.0
    edge = np.clip(wide - alpha / max(1e-6, dark), 0, 1)
    rgba = np.zeros((sh, sw, 4), dtype=np.float32)
    rgba[..., :3] = hx('#04060c') + edge[..., None] * hx('#1a4a5e') * 0.9
    rgba[..., 3] = np.clip(alpha + edge * 0.35, 0, 1)
    lights = []
    n = 9
    for i in range(n):
        t = i / (n - 1)
        lx = cx - bw * 0.85 + t * bw * 1.75
        ly = cy + np.sin(t * np.pi) * bh * 0.55 + bh * 0.1
        lights.append((float(lx), float(ly), float(0.5 + 0.5 * np.sin(t * 7 + seed))))
    return rgba, lights


# ---------------------------------------------------------------- interiors & props

def fresnel_lens(img, cx, cy, r, frame_color='#241c12', glass_color='#ffd98a',
                 lit=1.0, seed=25):
    """The great lamp: a beehive lens — filled amber glass drum with horizontal
    prism ridges, brass top/bottom caps and side columns, blazing core."""
    h, w, _ = img.shape
    x, y = cx * w, cy * h
    R = r * h  # half-height of the glass drum
    Rw = R * 0.72  # half-width
    if lit > 0.2:
        glow(img, x, y, R * 3.2, glass_color, intensity=0.45 * lit, falloff=2.3)
    # glass drum: rounded vertical profile (barrel) filled with graded amber
    prof = _bez([(x - Rw * 0.55, y - R), (x - Rw * 1.25, y - R * 0.3),
                 (x - Rw * 1.25, y + R * 0.3), (x - Rw * 0.55, y + R)], 20)
    drum = prof + [(2 * x - px, py) for px, py in prof[::-1]]
    mg = Image.new('L', (w, h), 0)
    dg = ImageDraw.Draw(mg)
    dg.polygon(drum, fill=255)
    gmask = _finish_mask(mg, 1.0)
    if lit > 0.3:
        yy = np.abs(np.arange(h, dtype=np.float32)[:, None] - y) / R
        shade = np.clip(1.15 - 0.55 * yy, 0.25, 1.15)
        col = hx(glass_color)[None, None, :] * shade[..., None]
        mk = gmask[..., None]
        img[:] = img * (1 - mk) + np.clip(col, 0, 1) * mk
    else:
        _apply_mask(img, gmask, '#39414e', alpha=0.9)
    # prism ridges: horizontal darker bands clipped to the drum
    mr = Image.new('L', (w, h), 0)
    dr = ImageDraw.Draw(mr)
    for ry in np.linspace(y - R * 0.85, y + R * 0.85, 7):
        dr.line([(x - Rw * 1.3, ry), (x + Rw * 1.3, ry)], fill=140, width=max(2, int(R * 0.035)))
    rmask = _finish_mask(mr, 1.2) * gmask
    _apply_mask(img, rmask, '#8a6a30' if lit > 0.3 else '#232a34')
    # blazing core
    if lit > 0:
        glow(img, x, y, R * 0.65, '#fff3d0', intensity=1.0 * lit, falloff=1.5)
        glow(img, x, y, R * 0.28, '#ffffff', intensity=0.9 * lit, falloff=1.2)
    # brass caps and side columns
    m2 = Image.new('L', (w, h), 0)
    d2 = ImageDraw.Draw(m2)
    d2.rectangle([x - Rw * 1.45, y - R * 1.16, x + Rw * 1.45, y - R * 0.96], fill=255)
    d2.rectangle([x - Rw * 1.45, y + R * 0.96, x + Rw * 1.45, y + R * 1.16], fill=255)
    d2.line([(x - Rw * 1.3, y - R), (x - Rw * 1.3, y + R)], fill=255, width=max(3, int(R * 0.05)))
    d2.line([(x + Rw * 1.3, y - R), (x + Rw * 1.3, y + R)], fill=255, width=max(3, int(R * 0.05)))
    d2.polygon([(x - Rw * 0.9, y - R * 1.16), (x, y - R * 1.5), (x + Rw * 0.9, y - R * 1.16)], fill=255)
    _apply_mask(img, _finish_mask(m2, 0.8), frame_color)
    return img


def window_mullions(img, x0, y0, x1, y1, color, cols=3, rows=2, width_frac=0.012):
    """Window frame grid (normalized box)."""
    h, w, _ = img.shape
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    X0, Y0, X1, Y1 = x0 * w, y0 * h, x1 * w, y1 * h
    bw_ = max(2, int(width_frac * h))
    d.rectangle([X0, Y0, X1, Y1], outline=255, width=bw_ * 2)
    for c in range(1, cols):
        x = X0 + (X1 - X0) * c / cols
        d.line([(x, Y0), (x, Y1)], fill=255, width=bw_)
    for r in range(1, rows):
        y = Y0 + (Y1 - Y0) * r / rows
        d.line([(X0, y), (X1, y)], fill=255, width=bw_)
    mask = _finish_mask(m, 0.6)
    return _apply_mask(img, mask, color)


def saltglass_jar(img, cx, cy, height, glow_amt=0.6, seed=27, shard_color='#8ff0ff'):
    """Jar of saltglass shards, faintly glowing. Returns shard points px."""
    h, w, _ = img.shape
    x, y = cx * w, cy * h
    jh = height * h
    jw = jh * 0.62
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([x - jw / 2, y - jh * 0.38, x + jw / 2, y + jh * 0.5], radius=jw * 0.18, outline=255,
                        width=max(2, int(jh * 0.025)))
    d.rectangle([x - jw * 0.28, y - jh * 0.52, x + jw * 0.28, y - jh * 0.38], outline=255, width=max(2, int(jh * 0.02)))
    d.rectangle([x - jw * 0.30, y - jh * 0.60, x + jw * 0.30, y - jh * 0.50], fill=255)
    mask = _finish_mask(m, 0.7)
    _apply_mask(img, mask, '#c9d4e0', alpha=0.75)
    g = _rng(seed)
    pts = []
    for _ in range(9):
        sx = x + g.uniform(-0.32, 0.32) * jw
        sy = y + g.uniform(0.0, 0.42) * jh
        sr = g.uniform(0.05, 0.11) * jh
        ang = g.uniform(0, np.pi)
        tri = [(sx + np.cos(ang + a) * sr, sy + np.sin(ang + a) * sr) for a in (0, 2.2, 4.2)]
        draw_poly(img, tri, shard_color, blur_r=0.5, alpha=0.85)
        pts.append((sx, sy))
    if glow_amt > 0:
        for (sx, sy) in pts:
            glow(img, sx, sy, jh * 0.16, shard_color, intensity=0.35 * glow_amt, falloff=2.0)
        glow(img, x, y + jh * 0.2, jh * 0.75, shard_color, intensity=0.28 * glow_amt, falloff=2.4)
    return pts


def matchbox(img, cx, cy, height, color='#3a2c22', label='#b8452e'):
    h, w, _ = img.shape
    x, y = cx * w, cy * h
    bh = height * h
    bw_ = bh * 2.2
    draw_poly(img, [(x - bw_ / 2, y - bh / 2), (x + bw_ / 2, y - bh / 2),
                    (x + bw_ / 2, y + bh / 2), (x - bw_ / 2, y + bh / 2)], color, blur_r=0.6)
    draw_poly(img, [(x - bw_ * 0.42, y - bh * 0.32), (x + bw_ * 0.42, y - bh * 0.32),
                    (x + bw_ * 0.42, y + bh * 0.32), (x - bw_ * 0.42, y + bh * 0.32)], label, blur_r=0.6, alpha=0.9)
    return img


def match_stick(img, x0, y0, x1, y1, lit=0.0, color='#d8c49a'):
    """A single match in px-normalized coords; head at (x1,y1)."""
    h, w, _ = img.shape
    a = (x0 * w, y0 * h)
    b = (x1 * w, y1 * h)
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    d.line([a, b], fill=255, width=max(2, int(h * 0.008)))
    mask = _finish_mask(m, 0.5)
    _apply_mask(img, mask, color)
    hr = h * 0.012
    draw_ellipse(img, [b[0] - hr, b[1] - hr, b[0] + hr, b[1] + hr], '#7a2e22', blur_r=0.5)
    if lit > 0:
        glow(img, b[0], b[1], h * 0.09 * lit, '#ffb45e', intensity=0.9 * lit, falloff=1.7)
        glow(img, b[0], b[1], h * 0.3 * lit, '#ff8a3a', intensity=0.28 * lit, falloff=2.4)
    return img


def hands_cupped(img, cx, cy, scale, color='#0a0c11', rim='#ffb45e', glow_amt=0.0,
                 match=True):
    """A hand rising from the bottom of frame holding a match; warm glow at tip.

    Silhouette-first: palm wedge from the lower edge, four curled fingers in
    profile, thumb across, match angled up with the flame above the fingers.
    """
    h, w, _ = img.shape
    x, y = cx * w, cy * h
    s = scale * h
    tipx, tipy = x + s * 0.10, y - s * 0.42
    if glow_amt > 0:
        glow(img, tipx, tipy, s * 0.5, '#ffb45e', intensity=0.9 * glow_amt, falloff=1.7)
        glow(img, tipx, tipy, s * 1.4, '#ff8a3a', intensity=0.30 * glow_amt, falloff=2.3)
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    # forearm + palm from bottom edge
    d.polygon([(x - s * 0.30, h), (x - s * 0.22, y + s * 0.28), (x - s * 0.10, y + s * 0.10),
               (x + s * 0.24, y + s * 0.06), (x + s * 0.34, y + s * 0.30), (x + s * 0.30, h)], fill=255)
    # four curled fingers wrapping toward the viewer
    for i in range(4):
        fx = x - s * 0.10 + i * s * 0.115
        fy = y + s * 0.075 - np.sin(i / 3 * np.pi) * s * 0.035
        fr = s * (0.075 - 0.008 * abs(i - 1.5))
        d.ellipse([fx - fr, fy - fr * 1.5, fx + fr, fy + fr * 1.5], fill=255)
    # thumb pressing the match against the fingers
    th = _bez([(x + s * 0.26, y + s * 0.16), (x + s * 0.10, y + s * 0.02),
               (x - s * 0.02, y - s * 0.02)], 12)
    lower = [(px + s * 0.05, py + s * 0.09) for px, py in th]
    d.polygon(th + lower[::-1], fill=255)
    _figure_fill(img, m, color, rim, (0, -1), rim_strength=0.95, blur_r=1.2)
    if match:
        mm = Image.new('L', (w, h), 0)
        dm = ImageDraw.Draw(mm)
        dm.line([(x - s * 0.02, y - s * 0.02), (tipx, tipy + s * 0.06)], fill=255,
                width=max(2, int(s * 0.028)))
        _apply_mask(img, _finish_mask(mm, 0.6), '#c9b088' if glow_amt > 0 else '#5a4a3a')
        hr = s * 0.035
        draw_ellipse(img, [tipx - hr, tipy + s * 0.02, tipx + hr, tipy + s * 0.09], '#6a2a20', blur_r=0.6)
    return img


def old_hands(img, cx, cy, scale, color='#141019', rim='#c9a26a'):
    """Orla's knotted hands resting on a surface, seen from across the table:
    two low mounds with fingers extended forward, knuckles slightly swollen."""
    h, w, _ = img.shape
    x, y = cx * w, cy * h
    s = scale * h
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    for side, dy in ((-1, 0), (1, s * 0.05)):
        px = x + side * s * 0.33
        # forearm entering from the bottom edge up to the wrist
        d.polygon([(px - s * 0.15, h), (px - s * 0.12, y + dy + s * 0.10),
                   (px + s * 0.12, y + dy + s * 0.10), (px + s * 0.16, h)], fill=255)
        # back of the hand: a low mound above the wrist
        d.ellipse([px - s * 0.24, y + dy - s * 0.14, px + s * 0.24, y + dy + s * 0.16], fill=255)
        # fingers extend up-frame (away from us), foreshortened, resting flat
        for i in range(4):
            fx = px - s * 0.175 + i * s * 0.115
            fl = s * (0.30 + 0.05 * np.sin(i * 2.1 + side)) * 0.62
            splay = (i - 1.5) * s * 0.028
            base_y = y + dy - s * 0.10
            tip_y = base_y - fl
            d.line([(fx, base_y), (fx + splay, tip_y)],
                   fill=255, width=max(3, int(s * 0.085)))
            jx, jy = fx + splay * 0.4, base_y - fl * 0.45
            d.ellipse([jx - s * 0.032, jy - s * 0.032, jx + s * 0.032, jy + s * 0.032], fill=255)
            d.ellipse([fx + splay - s * 0.038, tip_y - s * 0.038,
                       fx + splay + s * 0.038, tip_y + s * 0.038], fill=255)
        # thumb angled inward across the table
        d.line([(px - side * s * 0.20, y + dy + s * 0.02),
                (px - side * s * 0.33, y + dy - s * 0.14)],
               fill=255, width=max(3, int(s * 0.078)))
    _figure_fill(img, m, color, rim, (0, -1), rim_strength=0.7, blur_r=1.4)
    return img


def eye_closeup(img, cx, cy, scale, iris_color='#7a5a3a', reflect_color='#ffd98a',
                reflect_amt=0.8, openness=1.0, skin='#120e16'):
    """Single stylized eye filling frame; reflection of light in iris."""
    h, w, _ = img.shape
    x, y = cx * w, cy * h
    s = scale * h
    img[:] = img * 0.35 + hx(skin)[None, None, :] * 0.65
    ew, eh = s * 1.15, s * 0.52 * max(0.05, openness)
    # almond opening from two smooth bezier lids
    upper = _bez([(x - ew, y + eh * 0.05), (x - ew * 0.35, y - eh * 1.25),
                  (x + ew * 0.55, y - eh * 1.05), (x + ew, y - eh * 0.05)], 30)
    lower = _bez([(x + ew, y - eh * 0.05), (x + ew * 0.45, y + eh * 0.75),
                  (x - ew * 0.45, y + eh * 0.72), (x - ew, y + eh * 0.05)], 30)
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    d.polygon(upper + lower, fill=255)
    mask = _finish_mask(m, s * 0.015)
    white = np.array([0.46, 0.42, 0.42], np.float32) * 0.34
    _apply_mask(img, mask, white)
    ir = s * 0.34
    iy = y - eh * 0.05
    irx = x + s * 0.05
    mi = Image.new('L', (w, h), 0)
    di = ImageDraw.Draw(mi)
    di.ellipse([irx - ir, iy - ir, irx + ir, iy + ir], fill=255)
    iris_mask = _finish_mask(mi, 1.0) * mask
    _apply_mask(img, iris_mask, iris_color)
    g = _rng(31)
    ms = Image.new('L', (w, h), 0)
    ds = ImageDraw.Draw(ms)
    for i in range(26):
        a = g.uniform(0, 2 * np.pi)
        r0, r1 = ir * 0.35, ir * g.uniform(0.75, 0.98)
        ds.line([(irx + np.cos(a) * r0, iy + np.sin(a) * r0), (irx + np.cos(a) * r1, iy + np.sin(a) * r1)],
                fill=int(g.uniform(90, 200)), width=max(1, int(s * 0.008)))
    smask = _finish_mask(ms, 0.4) * _finish_mask(mi, 0.0)
    _apply_mask(img, smask * 0.6, '#2a1c12')
    pr = ir * 0.42
    mp = Image.new('L', (w, h), 0)
    dp = ImageDraw.Draw(mp)
    dp.ellipse([irx - pr, iy - pr, irx + pr, iy + pr], fill=255)
    _apply_mask(img, _finish_mask(mp, 1.0) * mask, '#0a0708')
    if reflect_amt > 0:
        glow(img, irx - ir * 0.3, iy - ir * 0.35, ir * 0.5, reflect_color, intensity=0.9 * reflect_amt, falloff=1.6)
        soft_disc(img, irx - ir * 0.28, iy - ir * 0.4, ir * 0.13, '#ffffff', alpha=0.9 * reflect_amt, soft=0.6)
        soft_disc(img, irx + ir * 0.35, iy + ir * 0.3, ir * 0.06, '#ffffff', alpha=0.5 * reflect_amt, soft=0.8)
    # lash band: thick soft-edged stroke following the upper lid
    lid = Image.new('L', (w, h), 0)
    dl = ImageDraw.Draw(lid)
    band = upper + [(px, py + s * 0.09) for px, py in upper[::-1]]
    dl.polygon(band, fill=255)
    _apply_mask(img, _finish_mask(lid, s * 0.012), '#060409')
    # soft lower-lid shadow line
    low = Image.new('L', (w, h), 0)
    dlo = ImageDraw.Draw(low)
    dlo.line(lower[:18], fill=140, width=max(2, int(s * 0.02)))
    _apply_mask(img, _finish_mask(low, s * 0.015), '#0a0710')
    return img


def bell_closeup(img, cx, cy, scale, color='#2c2418', shine='#e8c87a'):
    h, w, _ = img.shape
    x, y = cx * w, cy * h
    s = scale * h
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    d.pieslice([x - s * 0.5, y - s * 0.55, x + s * 0.5, y + s * 0.45], start=180, end=360, fill=255)
    d.rectangle([x - s * 0.5, y - s * 0.06, x + s * 0.5, y + s * 0.06], fill=255)
    d.ellipse([x - s * 0.09, y + s * 0.02, x + s * 0.09, y + s * 0.2], fill=255)
    d.line([(x, y - s * 0.55), (x, y - s * 0.75)], fill=255, width=max(2, int(s * 0.06)))
    _figure_fill(img, m, color, shine, (-1, -1), rim_strength=0.8, blur_r=0.8)
    return img


def smoke_wisp(img, x, y, height, color='#9aa4b8', seed=33, alpha=0.18):
    h, w, _ = img.shape
    g = _rng(seed)
    px, py = x * w, y * h
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    for i in range(14):
        t = i / 13
        r = (3 + t * 16) * (height * h / 200)
        px += g.uniform(-6, 6) + t * 8
        py -= height * h / 14
        d.ellipse([px - r, py - r, px + r, py + r], fill=int(140 * (1 - t * 0.7)))
    mask = _finish_mask(m, 6) * alpha
    return _apply_mask(img, mask, color)


# ---------------------------------------------------------------- sprite banks

_FIGURES = {}


def _register_figures():
    _FIGURES.update({'yuma': yuma, 'espen': yuma, 'ilsa': ilsa, 'orla': ilsa,
                     'deepwalker': deepwalker, 'bellfarer': deepwalker})


def render_figure_rgba(kind, height_px, pose='stand', phase=0.0, facing=1,
                       rim=None, color='#0c0e14', jar_glow=0.0, seed=17):
    """Render one character pose into a tight RGBA sprite (float32).

    The figure is drawn on a small transparent canvas; alpha comes from the
    silhouette mask plus any emitted light (rim, lantern, jar glow)."""
    if not _FIGURES:
        _register_figures()
    fn = _FIGURES[kind]
    ch = int(height_px * 1.30)
    cw = int(height_px * 1.20)
    img = np.zeros((ch, cw, 3), dtype=np.float32)
    kw = dict(color=color, rim=rim, facing=facing, seed=seed)
    if fn is yuma:
        kw.update(pose=pose, phase=phase, jar_glow=jar_glow)
    elif fn is ilsa:
        kw.update(pose=pose, breath=np.sin(phase * 2 * np.pi))
    else:
        kw.update(breath=phase * 2 * np.pi)
    mask = fn(img, 0.5, 0.96, height_px / ch, **kw)
    lum = img.max(axis=2)
    alpha = np.clip(mask + lum * 1.6, 0.0, 1.0).astype(np.float32)
    rgba = np.concatenate([img, alpha[..., None]], axis=2)
    return rgba


def figure_bank(kind, height_px, pose='stand', facing=1, rim=None,
                color='#0c0e14', jar_glow=0.0, seed=17, frames=8):
    """A cycle of poses for in-shot animation (anime-on-twos feel)."""
    cyclic = pose in ('walk', 'run', 'climb')
    bank = []
    for i in range(frames):
        ph = i / frames
        bank.append(render_figure_rgba(kind, height_px, pose=pose,
                                       phase=ph if cyclic else np.sin(ph * 2 * np.pi) * 0.5,
                                       facing=facing, rim=rim, color=color,
                                       jar_glow=jar_glow, seed=seed))
    return bank
