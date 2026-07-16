"""Small helpers shared across the SALTGLASS engine. Floats are [0,1] RGB unless noted."""
import numpy as np

W, H = 1920, 1080
FPS = 24
OVER = 1.4  # base stills are rendered OVER× larger for camera headroom
BW, BH = int(W * OVER), int(H * OVER)  # 2688 x 1512


def rng(seed):
    return np.random.default_rng(seed)


def hx(s):
    """'#rrggbb' -> float rgb array"""
    s = s.lstrip('#')
    return np.array([int(s[i:i + 2], 16) / 255.0 for i in (0, 2, 4)], dtype=np.float32)


def lerp(a, b, t):
    return a + (b - a) * t


def smoothstep(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def ease_in_out(t):
    return smoothstep(t)


def ease_out(t):
    t = np.clip(t, 0.0, 1.0)
    return 1 - (1 - t) ** 3


def ease_in(t):
    t = np.clip(t, 0.0, 1.0)
    return t ** 3


def to_u8(img):
    return (np.clip(img, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8)


def from_u8(img):
    return img.astype(np.float32) / 255.0


def screen(base, layer):
    """Screen blend, both float."""
    return 1.0 - (1.0 - base) * (1.0 - layer)


def add_clip(base, layer):
    return np.clip(base + layer, 0.0, 1.0)


def over(base, rgba):
    """Alpha-composite float RGBA layer over float RGB base."""
    a = rgba[..., 3:4]
    return base * (1 - a) + rgba[..., :3] * a
