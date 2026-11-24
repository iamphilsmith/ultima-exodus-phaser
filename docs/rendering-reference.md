# Rendering reference

How the client draws the game. Values are checked against
`client/src/app/game/shell-layout.ts` and the tile rules in
`server/UltimaExodus.Engine/Terrain/TileCatalogue.cs`.

## Canvas

The whole UI is drawn inside the Phaser canvas: map, text, borders and panels.
There is no HTML or CSS UI. The camera is fixed at (0, 0); the tile grid is
redrawn around the party rather than following it.

Internal resolution is 320 × 192 px, shown at zoom 3 (960 × 576), pixel art.

| Zone | X | Y | W | H | Notes |
|---|---|---|---|---|---|
| Top border | 0 | 0 | 320 | 8 | Moon phase centred above the map |
| Left border | 0 | 0 | 8 | 192 | |
| Map | 8 | 8 | 176 | 176 | 11 × 11 tiles of 16 px |
| Divider | 184 | 0 | 8 | 192 | |
| Party panel | 192 | 0 | 128 | 128 | 15 characters wide |
| Action log | 192 | 128 | 128 | 64 | 7 rows |
| Right border | 312 | 0 | 8 | 192 | |
| Bottom border | 0 | 184 | 320 | 8 | Wind direction centred below the map |

The moon phase (`►(0)(1)◄`) and wind (`►South Wind◄`) are hardcoded text.
The constants live in `shell-layout.ts`.

## Sprite sheets

Both sheets are loaded as 16 × 16 spritesheets (`loadSpritesheetOnce` in
`assets.ts`) and live in `client/public/assets/sprites/`.

| File | Size | Frames |
|---|---|---|
| `shapes.png` | 160 × 128 | 80 terrain tiles, 10 columns × 8 rows |
| `charset.png` | 256 × 128 | 128 characters, 16 columns × 8 rows |

Characters are drawn at 8 × 8 with `setDisplaySize`, even though the frames are
16 × 16. Phaser 4 needs the charset loaded with `frameWidth: 16, frameHeight: 16`.
Text colour comes from `setTint()`.

**Charset mapping:** frames 0–15 are icons and border pieces; 16 is `►`, 17 is
`◄`; 32 is the space, and printable ASCII follows by character code (`'A'` = 65).
In strings, `\x10` and `\x11` are the sentinels for the two arrows.

**EGA colours** (all in `shell-layout.ts`): black `0x000000`, blue `0x0000a8`,
cyan `0x54fcfc`, white `0xfcfcfc`, green `0x54fc54`, red `0xfc5454`,
bright blue `0x5454fc`.

## Text

- `writeText(scene, text, x, y, tint)` draws left-aligned text and returns the
  images; destroy them to clear or update the text.
- `writeTextCentered(scene, text, y, tint, scale)` centres on the canvas;
  scale 2 draws 16 × 16 characters.
- The action log is `LOG_ROWS` (7) rows of 15 columns. `logRows()` returns the
  rows oldest first, padded with blank rows at the top, so the newest entry is
  on the bottom row.
- Party panel names are centred in 14 columns with the class glyph in the 15th;
  see `party-rows.ts`.

## Maps

- Tiled JSON, 64 × 64. Tiled numbers tiles from 1; the server converts to
  0-based in `MapSourceLoader`, so the client only ever sees 0-based indices.
- The overworld wraps at all four edges. Towns, castles and conflicts do not:
  tiles outside the map are hidden, and walking off an edge leaves the map
  (towns and castles to the entrance, a conflict back to where it started).

| Map | Wraps | Fog of war |
|---|---|---|
| World | yes | yes |
| Town, castle | no | no |
| Conflict | no | no |

## Tiles

Walkability and vision rules live on the server in `TileCatalogue` and reach the
client through `GET api/tiles`. A tile not listed is walkable and does not block
vision. The catalogue is shared by every map, so creature tiles are solid on the
overworld too. The Tiled `solid` properties in the map files are all `false` and
are ignored.

| Tiles | What they are | Rule |
|---|---|---|
| 0 | Water (also moats) | solid |
| 1, 2 | Ground, brush | walkable |
| 3 | Forest | blocks vision |
| 4 | Mountains | solid, blocks vision |
| 6, 7 | Town, castle entrances (overworld) | walkable |
| 8 | Red brick: roads and floors | walkable |
| 9 | Chests | walkable |
| 10, 11, 13–15 | Horse, ships, sea creatures | solid |
| 16–30 | NPCs and monsters | solid |
| 31 | Grey block (the Exodus machine) | solid |
| 32 | Yellow barred doors | solid |
| 33 | Dark red lava-like floor | walkable |
| 34 | Blue star tile (Oracle and Exodus rooms) | walkable |
| 35 | White block: building and castle walls | solid, blocks vision |
| 37–57 | Sign frames and letters, counters, tables, cell bars | solid |
| 63–79 | Second animation frames of the creature tiles | solid |

Conflict maps use only tiles 0, 1, 2, 13, 20 and 24.

## Fog of war

Overworld only. `canSee(dx, dy, blocksVisionAt)` in `line-of-sight.ts` walks a
straight line from the party to the target, in offsets relative to the party
rather than map coordinates, so it works across the wrap. A vision-blocking tile
hides what is behind it, but a blocking tile is itself visible. Map coordinates
are used only for the tile lookups along the ray. Negative offsets use
`Math.floor`, matching the original game's behaviour.