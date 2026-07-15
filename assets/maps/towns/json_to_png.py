#!/usr/bin/env python3
"""
json_to_png.py – Render a Phaser Tiled JSON map to a full-resolution PNG.

Usage:
    python json_to_png.py <input.json> <output.png> --tileset shapes.png [--scale N]

The script reads the "Ground" tile layer from the Tiled JSON, then composites tiles
from the tileset image onto an output canvas.

Options:
    --tileset PATH   Path to the tileset PNG (default: ../assets/shapes.png, or auto-
                     resolved relative to the JSON file)
    --scale N        Integer scale factor applied to each tile (default: 1 → 16×16 px
                     per tile, producing a 1024×1024 output for a 64×64 map).
                     Use --scale 4 for a 4096×4096 "zoomed" render.
    --layer NAME     Name of the tile layer to render (default: "Ground")
"""

import argparse
import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")


def find_tileset_image(json_path: Path, hint: str | None) -> Path:
    """Locate the tileset image, trying several candidate paths."""
    candidates = []
    if hint:
        candidates.append(Path(hint))

    # Try path relative to the JSON file (as stored in the Tiled JSON)
    candidates.append(json_path.parent / "../../assets/shapes.png")
    candidates.append(json_path.parent / "../assets/shapes.png")
    candidates.append(json_path.parent / "shapes.png")
    candidates.append(Path("shapes.png"))

    for c in candidates:
        if c.is_file():
            return c.resolve()

    sys.exit(
        "Could not find the tileset image. Pass --tileset /path/to/shapes.png explicitly."
    )


def load_tileset(image_path: Path, tile_w: int, tile_h: int, columns: int) -> list[Image.Image]:
    """
    Slice the tileset PNG into individual tile Images.
    Returns a list indexed from 0; tiled_id 1 → index 0.
    """
    sheet = Image.open(image_path).convert("RGBA")
    tiles = []
    rows = sheet.height // tile_h
    for row in range(rows):
        for col in range(columns):
            x = col * tile_w
            y = row * tile_h
            tile = sheet.crop((x, y, x + tile_w, y + tile_h))
            tiles.append(tile)
    return tiles


def render_layer(
    tile_data: list[int],
    map_w: int,
    map_h: int,
    tileset_tiles: list[Image.Image],
    tile_w: int,
    tile_h: int,
    scale: int,
) -> Image.Image:
    """Composite all tiles onto a new RGBA canvas."""
    out_w = map_w * tile_w * scale
    out_h = map_h * tile_h * scale
    canvas = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 255))

    for idx, tiled_id in enumerate(tile_data):
        if tiled_id == 0:
            continue  # empty cell

        sprite_index = tiled_id - 1   # convert 1-indexed Tiled ID to 0-indexed list
        if sprite_index < 0 or sprite_index >= len(tileset_tiles):
            continue  # out of range; skip silently

        col = idx % map_w
        row = idx // map_w
        px  = col * tile_w * scale
        py  = row * tile_h * scale

        tile_img = tileset_tiles[sprite_index]
        if scale != 1:
            tile_img = tile_img.resize(
                (tile_w * scale, tile_h * scale),
                resample=Image.NEAREST,
            )

        canvas.paste(tile_img, (px, py), tile_img)

    return canvas


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Render a Phaser Tiled JSON map to a PNG image."
    )
    parser.add_argument("input",    type=Path, help="Input Tiled JSON file")
    parser.add_argument("output",   type=Path, help="Output PNG file")
    parser.add_argument("--tileset", default=None,
                        help="Path to the tileset PNG (shapes.png)")
    parser.add_argument("--scale",   type=int, default=1,
                        help="Integer pixel scale factor (default: 1)")
    parser.add_argument("--layer",   default="Ground",
                        help="Name of the tile layer to render (default: Ground)")
    args = parser.parse_args()

    if args.scale < 1:
        sys.exit("--scale must be a positive integer.")

    # ── Load JSON ──
    with args.input.open() as f:
        tiled = json.load(f)

    # ── Find the requested layer ──
    ground_layer = next(
        (l for l in tiled["layers"] if l["type"] == "tilelayer" and l["name"] == args.layer),
        None,
    )
    if ground_layer is None:
        available = [l["name"] for l in tiled["layers"] if l["type"] == "tilelayer"]
        sys.exit(
            f"Layer '{args.layer}' not found. Available tile layers: {available}"
        )

    map_w = ground_layer["width"]
    map_h = ground_layer["height"]

    # ── Tileset metadata from JSON ──
    ts = tiled["tilesets"][0]
    tile_w   = ts["tilewidth"]
    tile_h   = ts["tileheight"]
    columns  = ts["columns"]

    # ── Locate tileset image ──
    tileset_path = find_tileset_image(args.input, args.tileset)
    print(f"Tileset: {tileset_path}")

    # ── Slice tileset ──
    tileset_tiles = load_tileset(tileset_path, tile_w, tile_h, columns)
    print(f"Loaded {len(tileset_tiles)} tiles from tileset")

    # ── Render ──
    print(f"Rendering {map_w}×{map_h} map at scale {args.scale}× …")
    canvas = render_layer(
        ground_layer["data"],
        map_w, map_h,
        tileset_tiles,
        tile_w, tile_h,
        args.scale,
    )

    canvas.convert("RGB").save(args.output)
    print(f"Saved → {args.output}  ({canvas.width}×{canvas.height} px)")


if __name__ == "__main__":
    main()
