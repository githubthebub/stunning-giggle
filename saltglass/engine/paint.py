"""Numpy/PIL painters: gradients, fbm noise, stars, clouds, glow, ridgelines.

All canvases are float32 arrays of shape (h, w, 3) in [0,1].
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .util import hx, lerp, smoothstep, rng as _rng


def canvas(w, h, color='#000000'):
    c = np.empty((h, w, 3), dtype=np.float32)
    c[:] = hx(color) if isinstance(color, str) else color
    return c


def vgrad(w, h, stops, dither=0.004, seed=7):
    """Vertical gradient. stops = [(pos0..1, '#hex'), ...]. Dither kills banding."""
    ys = np.linspace(0.0, 1.0, h, dtype=np.float32)
    pos = np.array([p for p, _ in stops], dtype=np.float32)
    cols = np.stack([hx(c) if isinstance(c, str) else np.asarray(c, np.float32) for _, c in stops])
    img = np.empty((h, w, 3), dtype=np.float32)
    col_line = np.empty((h, 3), dtype=np.float32)
    for ch in range(3):
        col_line[:, ch] = np.interp(ys, pos, cols[:, ch])
    img[:] = col_line[:, None, :]
    if dither:
        g = _rng(seed)
        img += (g.random((h, w, 1), dtype=np.float32) - 0.5) * dither
    return img


def _noise_octave(w, h, cells, seed):
    g = _rng(seed)
    small = g.random((max(2, cells * h // max(w, 1) + 2), cells + 2), dtype=np.float32)
    im = Image.fromarray((small * 255).astype(np.uint8), 'L').resize((w, h), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32) / 255.0


def fbm(w, h, cells=8, octaves=4, gain=0.5, seed=1):
    """Value-noise fbm in [0,1]."""
    total = np.zeros((h, w), dtype=np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        total += amp * _noise_octave(w, h, cells * (2 ** o), seed + o * 131)
        norm += amp
        amp *= gain
    return total / norm


def fbm1d(n, cells=8, octaves=4, gain=0.5, seed=1):
    g = _rng(seed)
    total = np.zeros(n, dtype=np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        c = cells * (2 ** o)
        pts = g.random(c + 2, dtype=np.float32)
        xs = np.linspace(0, c + 1, n)
        total += amp * np.interp(xs, np.arange(c + 2), pts).astype(np.float32)
        norm += amp
        amp *= gain
    return total / norm


def stars(img, density=0.0006, seed=3, max_b=1.0, tint='#ffffff', horizon=1.0):
    """Scatter stars; horizon = fraction of height where stars stop."""
    h, w, _ = img.shape
    g = _rng(seed)
    n = int(w * h * density)
    x = g.integers(0, w, n)
    y = (g.random(n) ** 1.4 * h * horizon).astype(int)
    b = (g.random(n) ** 3.0) * max_b
    col = hx(tint)
    img[y, x] = np.clip(img[y, x] + b[:, None] * col, 0, 1)
    big = b > max_b * 0.55
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        xx = np.clip(x[big] + dx, 0, w - 1)
        yy = np.clip(y[big] + dy, 0, h - 1)
        img[yy, xx] = np.clip(img[yy, xx] + b[big, None] * 0.45 * col, 0, 1)
    return img


def star_field(w, h, density=0.0006, seed=3, horizon=1.0):
    """Return (x, y, brightness, phase) arrays for twinkling overlays."""
    g = _rng(seed)
    n = int(w * h * density)
    x = g.integers(0, w, n)
    y = (g.random(n) ** 1.4 * h * horizon).astype(int)
    b = g.random(n) ** 3.0
    ph = g.random(n) * 6.283
    keep = b > 0.25
    return x[keep], y[keep], b[keep].astype(np.float32), ph[keep].astype(np.float32)


def glow(img, cx, cy, radius, color, intensity=1.0, falloff=2.2):
    """Additive radial glow at (cx, cy) in pixels."""
    h, w, _ = img.shape
    x0, x1 = max(0, int(cx - radius)), min(w, int(cx + radius) + 1)
    y0, y1 = max(0, int(cy - radius)), min(h, int(cy + radius) + 1)
    if x0 >= x1 or y0 >= y1:
        return img
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / radius
    fall = np.clip(1.0 - d, 0, 1) ** falloff * intensity
    col = hx(color) if isinstance(color, str) else color
    img[y0:y1, x0:x1] = np.clip(img[y0:y1, x0:x1] + fall[..., None] * col, 0, 1)
    return img


def soft_disc(img, cx, cy, radius, color, alpha=1.0, soft=0.35):
    """Alpha-blended soft-edged disc (moon, sun)."""
    h, w, _ = img.shape
    r_out = radius * (1 + soft)
    x0, x1 = max(0, int(cx - r_out)), min(w, int(cx + r_out) + 1)
    y0, y1 = max(0, int(cy - r_out)), min(h, int(cy + r_out) + 1)
    if x0 >= x1 or y0 >= y1:
        return img
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    a = np.clip((r_out - d) / (r_out - radius + 1e-6), 0, 1) * alpha
    col = hx(color) if isinstance(color, str) else color
    region = img[y0:y1, x0:x1]
    img[y0:y1, x0:x1] = region * (1 - a[..., None]) + col * a[..., None]
    return img


def clouds(img, band=(0.0, 0.55), cover=0.45, tint='#1a2030', lit='#3a4a66',
           seed=11, cells=5, softness=6, alpha=0.85):
    """Layered soft clouds inside a vertical band of the frame."""
    h, w, _ = img.shape
    y0, y1 = int(band[0] * h), int(band[1] * h)
    bh = max(8, y1 - y0)
    n = fbm(w, bh, cells=cells, octaves=5, seed=seed)
    yy = np.linspace(0, 1, bh, dtype=np.float32)[:, None]
    shape = np.clip(np.sin(np.pi * yy), 0, 1) ** 0.5
    mask = np.clip((n - (1 - cover)) / max(1e-4, cover), 0, 1) * shape
    m = Image.fromarray((mask * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(softness))
    mask = np.asarray(m, dtype=np.float32) / 255.0 * alpha
    base_c, lit_c = hx(tint), hx(lit)
    lum = fbm(w, bh, cells=cells * 2, octaves=3, seed=seed + 5)
    col = base_c[None, None, :] * (1 - lum[..., None]) + lit_c[None, None, :] * lum[..., None]
    region = img[y0:y1]
    img[y0:y1] = region * (1 - mask[..., None]) + col * mask[..., None]
    return img


def ridge_mask(w, h, base_y, amp, cells=6, seed=21, sharp=1.0):
    """Boolean mask (h,w) True below a fbm ridgeline. base_y, amp in 0..1 of height."""
    prof = fbm1d(w, cells=cells, octaves=5, seed=seed)
    prof = (prof - prof.mean()) * sharp
    line = (base_y + prof * amp) * h
    yy = np.arange(h, dtype=np.float32)[:, None]
    return yy > line[None, :]


def fill_mask(img, mask, top_color, bottom_color=None, fade_from=None):
    """Fill mask with vertical gradient between two colors."""
    h, w, _ = img.shape
    tc = hx(top_color) if isinstance(top_color, str) else np.asarray(top_color, np.float32)
    if bottom_color is None:
        bc = tc
    else:
        bc = hx(bottom_color) if isinstance(bottom_color, str) else np.asarray(bottom_color, np.float32)
    ys = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    if fade_from is not None:
        t = np.clip((ys - fade_from) / max(1e-4, 1 - fade_from), 0, 1)
    else:
        t = ys
    col = tc[None, None, :] * (1 - t) + bc[None, None, :] * t
    img[mask] = col.repeat(w, axis=1)[mask]
    return img


def blur(img, radius):
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), 'RGB')
    im = im.filter(ImageFilter.GaussianBlur(radius))
    return np.asarray(im, dtype=np.float32) / 255.0


def bloom(img, threshold=0.72, radius=14, strength=0.6):
    """Cheap bloom: stride-downsample, threshold, blur small, add back."""
    h, w, _ = img.shape
    small = img[::4, ::4]  # view, no copy
    lum = small.max(axis=2)
    m = np.clip((lum - threshold) / (1 - threshold), 0, 1) ** 1.5
    src = (np.clip(small * m[..., None], 0, 1) * 255).astype(np.uint8)
    sim = Image.fromarray(src, 'RGB').filter(ImageFilter.GaussianBlur(radius / 4))
    back = np.asarray(sim.resize((w, h), Image.BILINEAR), dtype=np.float32)
    img += back * (strength / 255.0)
    np.clip(img, 0, 1, out=img)
    return img


def vignette_mask(w, h, strength=0.32, power=2.2):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx = (xx / w - 0.5) * 2
    ny = (yy / h - 0.5) * 2
    d = np.sqrt(nx * nx + ny * ny) / np.sqrt(2)
    return (1.0 - strength * d ** power).astype(np.float32)


def grain_tiles(w, h, n=8, seed=99):
    g = _rng(seed)
    return [(g.standard_normal((h, w, 1)).astype(np.float32)) for _ in range(n)]


def draw_poly(img, pts, color, blur_r=0.0, alpha=1.0):
    """Fill polygon (list of (x, y) pixels) with flat color via PIL mask."""
    h, w, _ = img.shape
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    d.polygon([(float(x), float(y)) for x, y in pts], fill=255)
    if blur_r:
        m = m.filter(ImageFilter.GaussianBlur(blur_r))
    mask = np.asarray(m, dtype=np.float32)[..., None] / 255.0 * alpha
    col = hx(color) if isinstance(color, str) else np.asarray(color, np.float32)
    img[:] = img * (1 - mask) + col * mask
    return img


def poly_mask(w, h, pts, blur_r=0.0):
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    d.polygon([(float(x), float(y)) for x, y in pts], fill=255)
    if blur_r:
        m = m.filter(ImageFilter.GaussianBlur(blur_r))
    return np.asarray(m, dtype=np.float32) / 255.0


def draw_ellipse(img, box, color, blur_r=0.0, alpha=1.0):
    h, w, _ = img.shape
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([float(v) for v in box], fill=255)
    if blur_r:
        m = m.filter(ImageFilter.GaussianBlur(blur_r))
    mask = np.asarray(m, dtype=np.float32)[..., None] / 255.0 * alpha
    col = hx(color) if isinstance(color, str) else np.asarray(color, np.float32)
    img[:] = img * (1 - mask) + col * mask
    return img


def rim_light(img, mask, direction=(-1, 0), width=3, color='#ffd9a0', strength=0.8):
    """Edge glow on the lit side of a silhouette mask (float 0..1)."""
    dx, dy = direction
    shifted = np.roll(mask, (int(dy * width), int(dx * width)), axis=(0, 1))
    edge = np.clip(mask - shifted, 0, 1)
    b = width + 2  # np.roll wraps; kill the phantom edge at frame borders
    edge[:b, :] = 0
    edge[-b:, :] = 0
    edge[:, :b] = 0
    edge[:, -b:] = 0
    e = Image.fromarray((edge * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(1.2))
    edge = np.asarray(e, dtype=np.float32) / 255.0 * strength
    col = hx(color) if isinstance(color, str) else color
    img[:] = np.clip(img + edge[..., None] * col, 0, 1)
    return img
