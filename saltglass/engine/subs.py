"""Subtitle typesetting: burned-in anime-sub styling with per-speaker tint,
narration styled separately; plus SRT export. Sprites are cached per event."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from .util import W, H

FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_SERIF = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf'
FONT_SERIF_FALLBACK = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'

SPEAKER_TINT = {
    'ESPEN': (255, 244, 224),
    'ORLA': (232, 226, 248),
    'BELLFARER': (214, 240, 240),
    'HULDA': (245, 222, 226),
    'NARRATION': (238, 216, 168),
    # legacy aliases from pre-rename drafts
    'YUMA': (255, 244, 224),
    'ILSA': (232, 226, 248),
    'DEEPWALKER': (214, 240, 240),
    'MARDA': (245, 222, 226),
}
DEFAULT_TINT = (245, 245, 245)

_cache = {}


def _font(size, serif=False):
    key = ('f', size, serif)
    if key not in _cache:
        if serif:
            try:
                _cache[key] = ImageFont.truetype(FONT_SERIF, size)
            except OSError:
                _cache[key] = ImageFont.truetype(FONT_SERIF_FALLBACK, size)
        else:
            _cache[key] = ImageFont.truetype(FONT_BOLD, size)
    return _cache[key]


def wrap(text, limit=44):
    words = text.split()
    lines, cur = [], ''
    for w_ in words:
        if len(cur) + len(w_) + 1 <= limit or not cur:
            cur = (cur + ' ' + w_).strip()
        else:
            lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    if len(lines) > 2:  # rebalance into 2 lines
        mid = len(words) // 2
        lines = [' '.join(words[:mid]), ' '.join(words[mid:])]
    return lines


def sprite(text, speaker=''):
    """Render an RGBA subtitle sprite; returns (rgba float array, anchor)."""
    key = (text, speaker)
    if key in _cache:
        return _cache[key]
    narration = speaker == 'NARRATION'
    size = 46 if not narration else 44
    font = _font(size, serif=narration)
    lines = wrap(text)
    pad = 14
    line_h = size + 12
    tw = 4
    im = Image.new('RGBA', (W, line_h * len(lines) + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    tint = SPEAKER_TINT.get(speaker, DEFAULT_TINT)
    for i, line in enumerate(lines):
        bbox = d.textbbox((0, 0), line, font=font, stroke_width=tw)
        lw = bbox[2] - bbox[0]
        x = (W - lw) // 2
        y = pad + i * line_h
        d.text((x, y), line, font=font, fill=(*tint, 255),
               stroke_width=tw, stroke_fill=(10, 8, 12, 235))
    arr = np.asarray(im, dtype=np.float32) / 255.0
    # trim vertical empties
    rows = np.where(arr[..., 3].max(axis=1) > 0.01)[0]
    if len(rows):
        arr = arr[max(0, rows[0] - 4):rows[-1] + 5]
    out = (arr, narration)
    _cache[key] = out
    return out


def draw(frame, text, speaker, alpha=1.0):
    """Composite subtitle onto (H,W,3) float frame. Narration sits higher."""
    arr, narration = sprite(text, speaker)
    sh = arr.shape[0]
    y0 = int(H * (0.80 if narration else 1.0)) - sh - (0 if narration else int(H * 0.055))
    y1 = y0 + sh
    a = arr[..., 3:4] * alpha
    frame[y0:y1] = frame[y0:y1] * (1 - a) + arr[..., :3] * a
    return frame


def fmt_ts(t):
    ms = int(round(t * 1000))
    h_, rem = divmod(ms, 3600000)
    m_, rem = divmod(rem, 60000)
    s_, ms = divmod(rem, 1000)
    return f'{h_:02d}:{m_:02d}:{s_:02d},{ms:03d}'


def write_srt(events, path):
    """events: list of (start, end, speaker, text) absolute seconds."""
    out = []
    for i, (t0, t1, spk, text) in enumerate(sorted(events), 1):
        label = f'[{spk.title()}] ' if spk and spk != 'NARRATION' else ''
        if spk == 'NARRATION':
            body = f'<i>{text}</i>'
        else:
            body = label + text
        out.append(f'{i}\n{fmt_ts(t0)} --> {fmt_ts(t1)}\n{body}\n')
    with open(path, 'w') as f:
        f.write('\n'.join(out))
