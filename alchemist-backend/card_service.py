"""Draws the banner image shown under a device notification (Chrome on Android, desktop Chrome/Edge)."""
import io
import os
from functools import lru_cache

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 600
_FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")

INK = (46, 32, 20)
MUTED = (122, 104, 88)
BG = (255, 248, 238)
KINDS = {
    "leave": ("LEAVE", (232, 137, 43)),
    "assignment": ("PROJECT", (214, 106, 24)),
    "info": ("UPDATE", (232, 137, 43)),
}


def _font(name: str, size: int):
    try:
        return ImageFont.truetype(os.path.join(_FONT_DIR, f"Poppins-{name}.ttf"), size)
    except Exception:
        return ImageFont.load_default()


def _wrap(draw, text, font, max_w, max_lines):
    words = text.split()
    lines, cur, i = [], "", 0
    while i < len(words) and len(lines) < max_lines:
        trial = f"{cur} {words[i]}".strip()
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
            i += 1
        else:
            lines.append(cur)
            cur = ""
    if cur and len(lines) < max_lines:
        lines.append(cur)
        cur = ""
    if i < len(words) and lines:  # text was cut: end with an ellipsis that fits
        last = lines[-1]
        while last and draw.textlength(last + "…", font=font) > max_w:
            last = last[:-1]
        lines[-1] = last.rstrip() + "…"
    return lines


def _logo(draw, cx, cy, r, color):
    """The Alchemist mark: nested triangles."""
    for scale, shade in ((1.0, 0.45), (0.68, 0.7), (0.38, 1.0)):
        rr = r * scale
        pts = [(cx, cy - rr), (cx + rr * 0.9, cy + rr * 0.62), (cx - rr * 0.9, cy + rr * 0.62)]
        draw.polygon(pts, fill=tuple(int(255 - (255 - c) * shade) for c in color))


def _tint(color, amount):
    return tuple(int(255 - (255 - c) * amount) for c in color)


@lru_cache(maxsize=256)
def render_card(kind: str, title: str, body: str) -> bytes:
    label, accent = KINDS.get(kind, KINDS["info"])
    S = 2  # draw at 2x then downscale for smooth edges
    img = Image.new("RGB", (W * S, H * S), BG)
    d = ImageDraw.Draw(img)

    # left bar and soft accent washes
    d.rectangle([0, 0, 22 * S, H * S], fill=accent)
    d.ellipse([(W - 330) * S, -170 * S, (W + 170) * S, 330 * S], fill=_tint(accent, 0.16))
    d.ellipse([(W - 200) * S, (H - 170) * S, (W + 120) * S, (H + 150) * S], fill=_tint(accent, 0.10))

    # brand tile
    tile = (70, 62, 182, 174)
    d.rounded_rectangle([v * S for v in tile], radius=30 * S, fill=(255, 255, 255))
    _logo(d, (tile[0] + tile[2]) / 2 * S, (tile[1] + tile[3]) / 2 * S + 2 * S, 42 * S, accent)

    # kind chip
    chip_font = _font("SemiBold", 26 * S)
    cw = d.textlength(label, font=chip_font) + 44 * S
    cx0, cy0 = 214 * S, 90 * S
    d.rounded_rectangle([cx0, cy0, cx0 + cw, cy0 + 56 * S], radius=28 * S, fill=accent)
    d.text((cx0 + 22 * S, cy0 + 28 * S), label, font=chip_font, fill=(255, 255, 255), anchor="lm")

    # title + body
    tfont, bfont = _font("Bold", 52 * S), _font("Regular", 34 * S)
    max_w = (W - 70 - 110) * S
    y = 230 * S
    title_lines = _wrap(d, title, tfont, max_w, 2)
    for line in title_lines:
        d.text((70 * S, y), line, font=tfont, fill=INK)
        y += 68 * S
    y += 8 * S
    for line in _wrap(d, body, bfont, max_w, 2 if len(title_lines) > 1 else 3):
        d.text((70 * S, y), line, font=bfont, fill=MUTED)
        y += 46 * S

    # footer
    d.text((70 * S, (H - 44) * S), "Go Alchemists", font=_font("SemiBold", 26 * S), fill=accent, anchor="lm")

    buf = io.BytesIO()
    img.resize((W, H), Image.LANCZOS).save(buf, "PNG", optimize=True)
    return buf.getvalue()
