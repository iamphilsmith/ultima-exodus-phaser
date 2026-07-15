#!/usr/bin/env python3
"""
Render Ultima III dungeon JSON to PNG map images.
"""

import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ── Palette ───────────────────────────────────────────────────────────────────
C_WALL        = (20,  18,  20)
C_FLOOR       = (255, 255, 255)
C_FOUNTAIN    = (180, 220, 255)   # pale blue tint for fountains
C_FALSE_BG    = (20,  18,  20)    # inverted: black bg
C_FALSE_FG    = (255, 255, 255)   # inverted: white X
C_FONT_DARK   = (20,  18,  20)
C_FONT_LIGHT  = (255, 255, 255)
C_GRID        = (220, 220, 220)
C_HDR_BG      = (20,  18,  20)
C_HDR_FG      = (255, 255, 255)
C_SUBHDR_BG   = (50,  48,  50)
C_SUBHDR_FG   = (200, 200, 200)
C_LEG_BG      = (35,  33,  35)
C_LEG_FG      = (200, 200, 200)

# ── Layout ────────────────────────────────────────────────────────────────────
CELL    = 28          # px per cell
MARGIN  = 6
HDR1    = 30          # dungeon name bar
HDR2    = 24          # level + sign bar
GRID    = 16
MAP_PX  = CELL * GRID
IMG_W   = MARGIN * 2 + MAP_PX

# Legend height computed dynamically (may be 1 or 2 lines)
LEG_LINE_H = 18
LEG_PAD    = 5

# ── Fonts ─────────────────────────────────────────────────────────────────────
_PATHS = [
    r"C:\Windows\Fonts\arial.ttf",
]
def _font(size):
    for p in _PATHS:
        try: return ImageFont.truetype(p, size)
        except: pass
    return ImageFont.load_default()

F_HDR1   = _font(14)   # dungeon name
F_HDR2   = _font(11)   # level + sign line
F_CELL   = _font(15)   # large cell symbols (G, T, W, ↑, ↓, D, ?)
F_LEG    = _font(10)   # legend text
print("Font")
print(f"Using font: {F_HDR1.path} (size {F_HDR1.size})")

# ── Helpers ───────────────────────────────────────────────────────────────────

def text_wh(font, text):
    bb = font.getbbox(text)
    return bb[2]-bb[0], bb[3]-bb[1]

def draw_centred(draw, text, x0, y0, x1, y1, font, colour):
    bb = font.getbbox(text)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    tx = x0 + (x1-x0-tw)//2
    ty = y0 + (y1-y0-th)//2 - bb[1]
    draw.text((tx, ty), text, font=font, fill=colour)

def cell_rect(row, col, hdr_total):
    x0 = MARGIN + col * CELL
    y0 = hdr_total + MARGIN + row * CELL
    return x0, y0, x0 + CELL, y0 + CELL   # exclusive x1/y1

# ── Cell drawers ──────────────────────────────────────────────────────────────

def fill_cell(draw, x0, y0, x1, y1, colour):
    draw.rectangle([x0, y0, x1-1, y1-1], fill=colour)

def draw_chest(draw, x0, y0, x1, y1):
    """Classic chest: box with lid line and clasp dot."""
    p = 5
    bx0, by0, bx1, by1 = x0+p, y0+p+2, x1-p-1, y1-p-1
    draw.rectangle([bx0, by0, bx1, by1], outline=C_FONT_DARK, width=1, fill=C_FLOOR)
    lid = by0 + (by1-by0)//2
    draw.line([bx0, lid, bx1, lid], fill=C_FONT_DARK, width=1)
    cx = (bx0+bx1)//2
    draw.ellipse([cx-1, lid-1, cx+2, lid+2], fill=C_FONT_DARK)

def draw_cell(draw, cell_type, row, col, hdr_total):
    x0, y0, x1, y1 = cell_rect(row, col, hdr_total)

    # ── Wall ──────────────────────────────────────────────────────────────────
    if cell_type == "wall":
        fill_cell(draw, x0, y0, x1, y1, C_WALL)
        return

    # ── False wall: inverted (black bg, white X) ──────────────────────────────
    if cell_type == "false_wall":
        fill_cell(draw, x0, y0, x1, y1, C_FALSE_BG)
        pad = 5
        draw.line([x0+pad, y0+pad, x1-pad-1, y1-pad-1], fill=C_FALSE_FG, width=2)
        draw.line([x1-pad-1, y0+pad, x0+pad, y1-pad-1], fill=C_FALSE_FG, width=2)
        return

    # ── Mark: solid blue box, white M ────────────────────────────────────────
    if cell_type == "mark":
        fill_cell(draw, x0, y0, x1, y1, (30, 100, 200))
        draw_centred(draw, "M", x0, y0, x1, y1, F_CELL, (255, 255, 255))
        return

    # ── Fountain: pale blue bg ────────────────────────────────────────────────
    bg = C_FOUNTAIN if cell_type == "fountain" else C_FLOOR
    fill_cell(draw, x0, y0, x1, y1, bg)

    if cell_type == "floor":
        return

    if cell_type == "chest":
        draw_chest(draw, x0, y0, x1, y1)
        return

    # ── Single large character fills ──────────────────────────────────────────
    LABELS = {
        "door":           "D",
        "ladder_up":      "\u2191",
        "ladder_down":    "\u2193",
        "ladder_up_down": "\u2195",
        "fountain":       "F",
        "mark":           "M",
        "gremlin":        "G",
        "trap":           "T",
        "wind":           "W",
        "sign":           "S",
    }
    label = LABELS.get(cell_type, cell_type[:1].upper())
    draw_centred(draw, label, x0, y0, x1, y1, F_CELL, C_FONT_DARK)


def draw_grid_lines(draw, grid, hdr_total):
    """Subtle grey lines between adjacent non-wall cells only."""
    for row in range(GRID):
        for col in range(GRID):
            if grid[row][col] == "wall":
                continue
            x0, y0, x1, y1 = cell_rect(row, col, hdr_total)
            if col < GRID-1 and grid[row][col+1] != "wall":
                draw.line([x1-1, y0, x1-1, y1-1], fill=C_GRID, width=1)
            if row < GRID-1 and grid[row+1][col] != "wall":
                draw.line([x0, y1-1, x1-1, y1-1], fill=C_GRID, width=1)


def build_legend_lines(level_types):
    """Return 1 or 2 legend line strings, wrapping if needed."""
    ITEMS = [
        ("ladder_up",      "\u2191 Ladder up"),
        ("ladder_up_down", "\u2195 Ladder up/down"),
        ("ladder_down",    "\u2193 Ladder down"),
        ("chest",          "■ Chest"),
        ("door",           "D Door"),
        ("fountain",       "F Fountain"),
        ("mark",           "M Mark"),
        ("gremlin",        "G Gremlin"),
        ("trap",           "T Trap"),
        ("wind",           "W Wind"),
        ("false_wall",     "X False wall"),
        ("sign",           "S Sign"),
    ]
    seen_labels = set()
    present = []
    for key, label in ITEMS:
        if key in level_types and label not in seen_labels:
            present.append(label)
            seen_labels.add(label)

    # Try fitting on one line; split into two if too wide
    sep = "   "
    full = sep.join(present)
    tw, _ = text_wh(F_LEG, full)
    max_w = IMG_W - 16

    if tw <= max_w:
        return [full]

    # Split roughly in half by item count
    mid = len(present) // 2
    return [sep.join(present[:mid]), sep.join(present[mid:])]


# ── Level renderer ────────────────────────────────────────────────────────────

def render_level(level_data, dungeon_name):
    level_num = level_data["level"]
    sign_msg  = level_data.get("sign_message", "")
    grid      = level_data["grid"]

    level_types = {ct for row in grid for ct in row}
    leg_lines   = build_legend_lines(level_types)
    leg_h       = LEG_PAD * 2 + len(leg_lines) * LEG_LINE_H

    hdr_total = HDR1 + HDR2
    img_h     = hdr_total + MARGIN + MAP_PX + MARGIN + leg_h

    img  = Image.new("RGB", (IMG_W, img_h), C_WALL)
    draw = ImageDraw.Draw(img)

    # ── Header line 1: dungeon name ───────────────────────────────────────────
    draw.rectangle([0, 0, IMG_W, HDR1-1], fill=C_HDR_BG)
    draw_centred(draw, dungeon_name, 0, 0, IMG_W, HDR1, F_HDR1, C_HDR_FG)

    # ── Header line 2: level number + sign ────────────────────────────────────
    draw.rectangle([0, HDR1, IMG_W, hdr_total-1], fill=C_SUBHDR_BG)
    sub = f'Level {level_num}   ·   "{sign_msg}"' if sign_msg else f'Level {level_num}'
    draw_centred(draw, sub, 0, HDR1, IMG_W, hdr_total, F_HDR2, C_SUBHDR_FG)

    # ── Map cells ─────────────────────────────────────────────────────────────
    for row in range(GRID):
        for col in range(GRID):
            draw_cell(draw, grid[row][col], row, col, hdr_total)

    draw_grid_lines(draw, grid, hdr_total)

    # ── Legend ────────────────────────────────────────────────────────────────
    leg_y0 = hdr_total + MARGIN + MAP_PX + MARGIN
    draw.rectangle([0, leg_y0, IMG_W, img_h], fill=C_LEG_BG)
    for i, line in enumerate(leg_lines):
        ty = leg_y0 + LEG_PAD + i * LEG_LINE_H
        bb = F_LEG.getbbox(line)
        tw = bb[2]-bb[0]
        tx = (IMG_W - tw) // 2
        draw.text((tx, ty - bb[1]), line, font=F_LEG, fill=C_LEG_FG)

    return img


# ── Entry point ───────────────────────────────────────────────────────────────

def render_dungeon(json_path, output_dir):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(json_path) as f:
        data = json.load(f)

    dungeon_name = data["name"]
    slug = Path(json_path).stem

    for level_data in data["levels"]:
        lvnum = level_data["level"]
        img = render_level(level_data, dungeon_name)
        out = output_dir / f"{slug}_level{lvnum:02d}.png"
        img.save(out, optimize=True)
        print(f"  {out}")


if __name__ == "__main__":
    json_path  = sys.argv[1] if len(sys.argv) > 1 else "dungeon-p.json"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "."
    render_dungeon(json_path, output_dir)
    print("Done.")
