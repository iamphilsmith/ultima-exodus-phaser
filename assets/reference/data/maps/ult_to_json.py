#!/usr/bin/env python3
"""
ult_to_json.py – Convert an Ultima III town/castle .ULT file to a Phaser-compatible Tiled JSON map.

Usage:
    python ult_to_json.py <input.ult> <output.json> [--name MAP_NAME]

    e.g.

    python ult_to_json.py town-lcb.ult lcb.json --name lcb

The ULT town/castle format (0x1228 bytes):
    0x0000 – 0x0FFF   64×64 tile map  (4096 bytes)
    0x1000 – 0x100F   Up to 8 sign text offsets (2 bytes each, LE; add 0x1000 for absolute offset)
    0x1010 – 0x117F   Sign/dialog text strings (NUL-terminated ASCII; 0x0A = newline)
    0x1180 – 0x119F   NPC tile bytes (32 NPCs; divide by 4 for 0-indexed sprite, +1 for Tiled ID)
    0x11A0 – 0x11BF   NPC floor tile bytes (32 NPCs)
    0x11C0 – 0x11DF   NPC starting X coordinates (32 NPCs)
    0x11E0 – 0x11FF   NPC starting Y coordinates (32 NPCs)
    0x1200 – 0x121F   NPC movement flag + dialog index (32 NPCs)
    0x1220 – 0x1227   Unused

Tile ID formula:  tiled_id = raw_byte // 4 + 1   (1-indexed; tileset is 10 columns wide)

Chest encoding: raw bytes 0x24–0x27 all map to tiled_id 10 (chest); low 2 bits encode the
    underlying floor tile (brick/grass/forest/deep-forest) – stored in the NPC data at runtime.

Outputs a Tiled-format JSON with:
    - One tile layer ("Ground") containing the 64×64 map
    - An object layer ("NPCs") with one object per active NPC
    - An object layer ("Signs") with one object per sign (tile-located where text tiles appear)
    - A "custom properties" block at the map level with sign texts and dialog strings
"""

import argparse
import json
import sys
from pathlib import Path


# ── Constants ──────────────────────────────────────────────────────────────────

MAP_WIDTH  = 64
MAP_HEIGHT = 64
TILE_SIZE  = 16   # pixels per tile in the tileset

TILESET_NAME       = "shapes"
TILESET_IMAGE      = "../assets/shapes.png"
TILESET_TILE_W     = 16
TILESET_TILE_H     = 16
TILESET_COLUMNS    = 10
TILESET_TILE_COUNT = 80   # 80 tiles total in shapes.png

# Offsets within the .ULT file
OFFSET_MAP       = 0x0000
OFFSET_SIGNS     = 0x1000
OFFSET_TEXT_BASE = 0x1000   # sign offsets are relative to this
OFFSET_NPC_TILE  = 0x1180
OFFSET_NPC_FLOOR = 0x11A0
OFFSET_NPC_X     = 0x11C0
OFFSET_NPC_Y     = 0x11E0
OFFSET_NPC_FLAGS = 0x1200
NUM_NPCS         = 32
NUM_SIGN_SLOTS   = 8

# NPC movement flag (high nibble of flags byte)
MOVEMENT = {
    0x0: "wanders",
    0x4: "stationary",
    0x8: "merchant",
    0xC: "hostile",
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def raw_to_tiled(raw: int) -> int:
    """Convert a raw ULT byte to a 1-indexed Tiled tile ID."""
    return raw // 4 + 1


def read_cstring(data: bytes, offset: int) -> str:
    """Read a NUL-terminated string from data at offset. 0x0A bytes become newlines."""
    end = data.index(0, offset)
    raw = data[offset:end]
    return raw.replace(b'\x0a', b'\n').decode('ascii', errors='replace')


def parse_signs(data: bytes) -> list[dict]:
    """
    Parse up to NUM_SIGN_SLOTS sign text strings.
    Each slot holds a 2-byte LE offset relative to OFFSET_TEXT_BASE.
    A zero offset (or offset pointing past the text area) means no sign.
    Returns a list of dicts: {index, text_offset, text}
    """
    signs = []
    for i in range(NUM_SIGN_SLOTS):
        slot_addr = OFFSET_SIGNS + i * 2
        raw_offset = int.from_bytes(data[slot_addr:slot_addr + 2], 'little')
        if raw_offset == 0:
            continue
        abs_offset = OFFSET_TEXT_BASE + raw_offset
        if abs_offset >= OFFSET_NPC_TILE:
            continue  # out of text area
        text = read_cstring(data, abs_offset)
        if text.strip():
            signs.append({
                "index": i,
                "text_offset": abs_offset,
                "text": text.strip(),
            })
    return signs


def parse_npcs(data: bytes) -> list[dict]:
    """
    Parse the 32 NPC records. NPCs with a zero tile byte are considered empty/unused.
    Returns a list of dicts for active NPCs.
    """
    npcs = []
    for i in range(NUM_NPCS):
        tile_byte  = data[OFFSET_NPC_TILE  + i]
        floor_byte = data[OFFSET_NPC_FLOOR + i]
        x          = data[OFFSET_NPC_X     + i]
        y          = data[OFFSET_NPC_Y     + i]
        flags      = data[OFFSET_NPC_FLAGS + i]

        if tile_byte == 0:
            continue

        movement_code = (flags >> 4) & 0xF
        dialog_index  = flags & 0x0F

        npcs.append({
            "index":          i,
            "tile_id":        raw_to_tiled(tile_byte),
            "floor_tile_id":  raw_to_tiled(floor_byte),
            "x":              x,
            "y":              y,
            "movement":       MOVEMENT.get(movement_code, f"unknown_0x{movement_code:X}"),
            "dialog_index":   dialog_index,
            "flags_raw":      flags,
        })
    return npcs


def parse_map(data: bytes) -> list[int]:
    """
    Parse the 64×64 tile map, returning a flat list of 4096 Tiled tile IDs (row-major).
    Chest bytes (0x24–0x27) are normalised to tiled_id 10.
    """
    tiles = []
    for raw in data[OFFSET_MAP:OFFSET_MAP + MAP_WIDTH * MAP_HEIGHT]:
        # Normalise chest variants (low 2 bits encode floor type, not tile ID)
        if 0x24 <= raw <= 0x27:
            tiles.append(10)   # chest tiled_id regardless of floor variant
        else:
            tiles.append(raw_to_tiled(raw))
    return tiles


# ── Tiled JSON builder ─────────────────────────────────────────────────────────

def build_tiled_json(map_name: str, tiles: list[int], npcs: list[dict], signs: list[dict]) -> dict:
    """Assemble the full Tiled-format JSON dict."""

    map_pixel_w = MAP_WIDTH  * TILE_SIZE
    map_pixel_h = MAP_HEIGHT * TILE_SIZE

    # ── Ground layer ──
    ground_layer = {
        "id":      1,
        "name":    "Ground",
        "type":    "tilelayer",
        "x":       0,
        "y":       0,
        "width":   MAP_WIDTH,
        "height":  MAP_HEIGHT,
        "opacity": 1,
        "visible": True,
        "data":    tiles,
    }

    # ── NPC object layer ──
    npc_objects = []
    for npc in npcs:
        npc_objects.append({
            "id":      1000 + npc["index"],
            "name":    f"NPC_{npc['index']}",
            "type":    "npc",
            "x":       npc["x"] * TILE_SIZE,
            "y":       npc["y"] * TILE_SIZE,
            "width":   TILE_SIZE,
            "height":  TILE_SIZE,
            "visible": True,
            "properties": [
                {"name": "tile_id",       "type": "int",    "value": npc["tile_id"]},
                {"name": "floor_tile_id", "type": "int",    "value": npc["floor_tile_id"]},
                {"name": "movement",      "type": "string", "value": npc["movement"]},
                {"name": "dialog_index",  "type": "int",    "value": npc["dialog_index"]},
            ],
        })

    npc_layer = {
        "id":      2,
        "name":    "NPCs",
        "type":    "objectgroup",
        "x":       0,
        "y":       0,
        "opacity": 1,
        "visible": True,
        "objects": npc_objects,
    }

    # ── Sign object layer ──
    # Signs don't carry map coordinates in the ULT file – the sign text is triggered
    # when the player reads a tile in the town containing text characters.
    # We store them as point objects at (0,0) with their index and text as properties.
    sign_objects = []
    for sign in signs:
        sign_objects.append({
            "id":      2000 + sign["index"],
            "name":    f"Sign_{sign['index']}",
            "type":    "sign",
            "x":       0,
            "y":       0,
            "width":   0,
            "height":  0,
            "point":   True,
            "visible": True,
            "properties": [
                {"name": "sign_index", "type": "int",    "value": sign["index"]},
                {"name": "text",       "type": "string", "value": sign["text"]},
            ],
        })

    sign_layer = {
        "id":      3,
        "name":    "Signs",
        "type":    "objectgroup",
        "x":       0,
        "y":       0,
        "opacity": 1,
        "visible": True,
        "objects": sign_objects,
    }

    # ── Tileset reference ──
    tileset = {
        "firstgid":   1,
        "name":       TILESET_NAME,
        "image":      TILESET_IMAGE,
        "imagewidth":  TILESET_COLUMNS * TILESET_TILE_W,
        "imageheight": (TILESET_TILE_COUNT // TILESET_COLUMNS) * TILESET_TILE_H,
        "tilewidth":  TILESET_TILE_W,
        "tileheight": TILESET_TILE_H,
        "tilecount":  TILESET_TILE_COUNT,
        "columns":    TILESET_COLUMNS,
        "margin":     0,
        "spacing":    0,
    }

    # ── Root map ──
    tiled_map = {
        "version":      "1.10",
        "tiledversion": "1.10.0",
        "type":         "map",
        "orientation":  "orthogonal",
        "renderorder":  "right-down",
        "width":        MAP_WIDTH,
        "height":       MAP_HEIGHT,
        "tilewidth":    TILE_SIZE,
        "tileheight":   TILE_SIZE,
        "infinite":     False,
        "nextlayerid":  4,
        "nextobjectid": 3000,
        "properties": [
            {"name": "mapName", "type": "string", "value": map_name},
            {"name": "mapType", "type": "string", "value": "town"},
        ],
        "tilesets": [tileset],
        "layers": [ground_layer, npc_layer, sign_layer],
    }

    return tiled_map


# ── Entry point ────────────────────────────────────────────────────────────────

def convert(ult_path: Path, json_path: Path, map_name: str) -> None:
    data = ult_path.read_bytes()

    expected_min = OFFSET_NPC_FLAGS + NUM_NPCS  # 0x1220
    if len(data) < expected_min:
        sys.exit(f"Error: {ult_path} is too small ({len(data)} bytes); expected at least {expected_min}.")

    tiles = parse_map(data)
    npcs  = parse_npcs(data)
    signs = parse_signs(data)

    tiled_json = build_tiled_json(map_name, tiles, npcs, signs)

    json_path.write_text(json.dumps(tiled_json, indent=2))

    print(f"Converted {ult_path.name} → {json_path.name}")
    print(f"  Map:   {MAP_WIDTH}×{MAP_HEIGHT} tiles")
    print(f"  NPCs:  {len(npcs)} active")
    print(f"  Signs: {len(signs)}")
    for s in signs:
        preview = s['text'][:50].replace('\n', ' / ')
        print(f"    [{s['index']}] {preview!r}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert an Ultima III town/castle .ULT file to Phaser Tiled JSON."
    )
    parser.add_argument("input",  type=Path, help="Input .ULT file")
    parser.add_argument("output", type=Path, help="Output .json file")
    parser.add_argument("--name", default=None,
                        help="Map name for the JSON (defaults to input stem, e.g. 'lcb')")
    args = parser.parse_args()

    map_name = args.name or args.input.stem.lower()
    convert(args.input, args.output, map_name)


if __name__ == "__main__":
    main()
