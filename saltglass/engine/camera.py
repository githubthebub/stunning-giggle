"""Camera: eased crop windows over the oversized base still."""
import numpy as np
from PIL import Image

from .util import W, H, BW, BH, ease_in_out


MOVES = {
    'hold':      {'z0': 1.06, 'z1': 1.06, 'dx': 0.0,  'dy': 0.0},
    'push_in':   {'z0': 1.0,  'z1': 1.22, 'dx': 0.0,  'dy': 0.0},
    'pull_back': {'z0': 1.22, 'z1': 1.0,  'dx': 0.0,  'dy': 0.0},
    'pan_left':  {'z0': 1.14, 'z1': 1.14, 'dx': -1.0, 'dy': 0.0},
    'pan_right': {'z0': 1.14, 'z1': 1.14, 'dx': 1.0,  'dy': 0.0},
    'tilt_up':   {'z0': 1.14, 'z1': 1.14, 'dx': 0.0,  'dy': -1.0},
    'tilt_down': {'z0': 1.14, 'z1': 1.14, 'dx': 0.0,  'dy': 1.0},
    'drift':     {'z0': 1.08, 'z1': 1.13, 'dx': 0.25, 'dy': -0.12},
}


class Camera:
    def __init__(self, move='hold', dur=6.0, focus=(0.5, 0.5), shake=0.0, seed=5):
        m = MOVES.get(move, MOVES['hold'])
        self.dur = dur
        self.z0, self.z1 = m['z0'], m['z1']
        self.dx, self.dy = m['dx'], m['dy']
        self.focus = focus
        self.shake = shake
        g = np.random.default_rng(seed)
        self.sph = g.uniform(0, 6.28, 4)

    def window(self, t):
        """Return crop (x0, y0, cw, ch) in base px at time t (seconds)."""
        u = ease_in_out(t / max(0.001, self.dur))
        z = self.z0 + (self.z1 - self.z0) * u
        cw, ch = BW / z, BH / z
        max_dx = (BW - cw) / 2
        max_dy = (BH - ch) / 2
        fx, fy = self.focus
        cx = BW * fx + self.dx * max_dx * (2 * u - 1)
        cy = BH * fy + self.dy * max_dy * (2 * u - 1)
        if self.shake > 0:
            s = self.shake
            cx += s * (np.sin(t * 31 + self.sph[0]) + 0.6 * np.sin(t * 57 + self.sph[1]))
            cy += s * (np.sin(t * 37 + self.sph[2]) + 0.6 * np.sin(t * 47 + self.sph[3]))
        x0 = np.clip(cx - cw / 2, 0, BW - cw)
        y0 = np.clip(cy - ch / 2, 0, BH - ch)
        return x0, y0, cw, ch

    def frame(self, base_img_u8, t):
        """Crop + resize to (W, H). base_img_u8: uint8 PIL Image of base.
        BILINEAR: the softness suits the animatic look and halves the cost."""
        x0, y0, cw, ch = self.window(t)
        crop = base_img_u8.resize((W, H), Image.BILINEAR, box=(x0, y0, x0 + cw, y0 + ch))
        return crop, (x0, y0, W / cw)
