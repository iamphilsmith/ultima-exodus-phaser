# Ultima Exodus — Project Context

A single-player RPG tribute to Ultima III: Exodus, built with Phaser 4 and TypeScript.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Game engine | Phaser 4 |
| Language | TypeScript |
| Bundler | Vite |
| Backend | Express + tRPC |
| ORM | Drizzle |
| Database | SQLite (better-sqlite3) |

---

## Architecture Decisions

- **Thick client** — all game logic runs in Phaser. The server is a dumb persistence layer only.
- **Save on every move** — hero position is saved to SQLite after every tile movement via tRPC.
- **Single player row** — hero is always `id: 'player'`, upserted on save.
- **No Phaser camera follow** — camera is fixed at 0,0. The tile grid redraws around the hero position instead.
- **Full Phaser rendering** — no HTML/CSS UI. Everything including text, borders, and panels is rendered inside the Phaser canvas.

---

## Canvas Layout

Internal resolution: **320 × 192px**, displayed at **3x zoom** (960 × 576px on screen).

```

Left & Right border (8px)
Top & Bottom border (8px)
Divider (8px)
MHF is the code for the type of hero
M = Money
L = Level
H = Hit points
F = Food
The # in the middle of the map is the hero
Map is 11 x 11 tiles, each tile is 16px x 16px

****** Moon phase*************>1<*******
*┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐*    Gregory    *
*└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘* MHF M:00 L:01 *
*┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐* H:0150 F:0074 *
*└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘*******>2<*******
*┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐*    Gregory    *
*└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘* MHF M:00 L:01 *
*┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐* H:0150 F:0074 *
*└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘*******>2<*******
*┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐*    Gregory    *
*└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘* MHF M:00 L:01 *
*┌┐┌┐┌┐┌┐┌┐##┌┐┌┐┌┐┌┐┌┐* H:0150 F:0074 *
*└┘└┘└┘└┘└┘##└┘└┘└┘└┘└┘*******>2<*******
*┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐*    Gregory    *
*└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘* MHF M:00 L:01 *
*┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐* H:0150 F:0074 *
*└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘*****************
*┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐*>
*└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘*>
*┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐*>
*└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘*>
*┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐*>
*└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘*>
**** Wind direction ****>South


```

| Zone | X | Y | W | H | Additional content
|---|---|---|---|---|---|
| Top border | 0 | 0 | 320 | 8 | Moon phase centered above map |
| Left border | 0 | 0 | 8 | 192 | |
| Map tiles | 8 | 8 | 176 | 176 | |
| Divider | 184 | 0 | 8 | 192 | |
| Party panel | 192 | 0 | 128 | 128 | |
| Action log | 192 | 128 | 128 | 64 | |
| Right border | 312 | 0 | 8 | 192 | |
| Bottom border | 0 | 184 | 320 | 8 | Wind direction centered below map |

---

## Map

- Format: Tiled JSON
- Overworld file: `assets/maps/worlds/world-sosaria.json`, layer `sosaria-layer`, tileset `sosaria`
- Castle files: `assets/maps/castles/castle-british.json`, `castle-exodus.json`
- Town files: `assets/maps/towns/town-*.json`
- All maps: 64×64 tiles
- Overworld wraps at edges — hero can walk off any edge and appear on the opposite side
- Town/castle maps do not wrap — out-of-bounds tiles hidden (alpha 0); walking off any edge exits back to overworld
- Tile index offset: `tile.index - 1` (Tiled is 1-based, Phaser frames are 0-based)

---

## Assets

| File | Location | Description |
|---|---|---|
| `shapes_ega_final.png` | `assets/sprites/` | 80 terrain tiles, 16×16px, 10 cols × 8 rows, RGB solid background |
| `charset_ega_final.png` | `assets/sprites/` | 128 characters, 16×16px source frames, 16 cols × 8 rows, RGBA transparent background. Loaded with `frameWidth: 16, frameHeight: 16` giving 128 frames. Rendered at 8×8 via `setDisplaySize(8, 8)` in `writeText` and `drawLogPanel`. |
| `world-sosaria.json` | `assets/maps/worlds/` | Tiled map JSON, 64×64, overworld Sosaria |
| `world-ambrosia.json` | `assets/maps/worlds/` | Tiled map JSON, 64×64, layer `ambrosia-layer`, tileset `ambrosia` |
| `castle-british.json` | `assets/maps/castles/` | Tiled map JSON, 64×64 |
| `castle-exodus.json` | `assets/maps/castles/` | Tiled map JSON, 64×64 |
| `town-*.json` | `assets/maps/towns/` | Tiled map JSON, 64×64, one per town |

### Dungeon Maps (JSON, custom format)

Each dungeon JSON has the structure:
`{ name, file, levels: [ { level, sign?, width: 16, height: 16, cells: [ { type, feature?, x, y, raw } ] } ] }`

Cell `type` values: `corridor`, `wall`, `secret_door`, `door`, `ladder_up`, `ladder_down`, `ladder_up_down`
Cell `feature` values (optional): `chest`, `fountain`, `pit`, `altar`, `special`, `darkness`

| File | Location | Description |
|---|---|---|
| `fire.json` | `assets/maps/` | Dungeon of Fire — 8 levels |
| `dardin.json` | `assets/maps/` | Dardin's Pit — 8 levels |
| `m.json` | `assets/maps/` | Dungeon of Doom — 8 levels |
| `mine.json` | `assets/maps/` | Mines of Morinia — 8 levels |
| `p.json` | `assets/maps/` | Dungeon of the Snake — 8 levels |
| `perinian.json` | `assets/maps/` | Perinian Depths — 8 levels |
| `time.json` | `assets/maps/` | Dungeon of Time — 8 levels |

### Charset Mapping
- Tile 0-15: special icons and border characters
- Tile 16: `►` right arrow (action log bullet)
- Tile 17: `◄` left arrow
- Tile 32: space — printable ASCII starts here
- Frame index formula: `charCode` (e.g. 'A' = 65, '0' = 48)
- Background is transparent so `setTint()` controls text colour

### EGA Colours Used
```typescript
const EGA_BLACK = 0x000000
const EGA_BLUE  = 0x0000a8
const EGA_CYAN  = 0x54fcfc
const EGA_WHITE = 0xfcfcfc
```

---

## Tile Properties (in sosaria.json)

| Tile | Property |
|---|---|
| Water (0) | solid: true |
| Mountains (4) | solid: true, vision-blocking: true |
| Forest (3) | vision-blocking: true |
| Town/castle (10) | solid: false |

---

## Fog of War

- Vision uses a raycasting algorithm in viewport-relative coordinates (not map coordinates)
- This correctly handles map wrapping at edges
- `canSeeTile(0, 0, offsetX, offsetY)` — ray always starts at hero (0,0 in offset space)
- Map coordinates are only used mid-ray for tile property lookups

---

## Current Status

### Working ✅
- Map renders with EGA tileset
- Hero renders and moves with nudge tween animation
- Map wraps correctly at all edges
- Fog of war works including at wrap boundaries
- Save/load hero position via tRPC + SQLite
- Border and panel layout fully rendered in Phaser
- Party panel renders hardcoded character data (4 characters, 3 rows each with ►N◄ header)
- Character names centred in party panel name row (class glyph right-aligned at col 15)
- Action log renders from bottom upward — new messages push older ones up, pre-filled with empty rows so bullets always show
- Moon phase display hardcoded in top border, centred above map: `►(0)(1)◄`
- Wind direction display hardcoded in bottom border, centred below map: `►South Wind◄`
- Charset rendering working via `frameWidth: 16, frameHeight: 16` + `setDisplaySize(8, 8)`
- `InputService` wired — arrow keys emit `InputDirection` enum, `E` emits interact, Escape emits cancel
- `InputDirection` enum (`Up/Down/Left/Right`) with `DIRECTION_OFFSETS` and `DIRECTION_NAME` lookup tables
- `MapView` interface extracted — `load()`, `handleMove()`, `handleInteract()`, `teardown()`; `onExit` carries optional `LocationDef` destination
- `OverworldView` implemented — wrapping movement, fog of war, save on move
- `TownView` implemented — no wrapping, walk off any edge exits back to overworld; handles both towns and castles
- Town and castle enter/exit fully wired and confirmed
- `WorldScene` reduced to permanent shell — border, panels, log, input wiring, view transitions
- `world-locations.ts` — all Sosaria overworld coordinates confirmed and wired

### Still To Do 📋
- Wire real moon phase data to `drawMoonPhase()`
- Wire real wind direction data to `drawWindDirection()`
- Populate party panel from real character data (BCD-encoded, from ROSTER.ULT / PARTY.ULT)
- Add fog of war to `TownView`
- Step ④: `CombatView` — static 11×11 map, party + monster positions, no fog
- Step ⑤: `DungeonView` — first-person renderer (see Dungeon View section below)
- Ambrosia shrine entry/exit coordinates (stubbed)
- Eventually: tile animation, character sprites, title screen, NPC dialog system

---

## Charset Notes 🔧
- Phaser 4 ignores `frameWidth/frameHeight` from `preload` for the charset sheet in some cases
- Workaround: load with `frameWidth: 16, frameHeight: 16` (128 frames), render at 8×8 via `setDisplaySize`
- The charset PNG (`256×128px`) has 32 columns × 16 rows of 8×8 glyphs at screen resolution, but the logical frame layout is 16 cols × 8 rows at 16×16 — Phaser sees 128 frames correctly
- `charFrame(ch)` returns `ch.charCodeAt(0)`
- Special sentinels in `writeText`: `\x10` = frame 16 (►), `\x11` = frame 17 (◄)

---

## Text Rendering Patterns

```typescript
// Write a string to the canvas using charset sprites
writeText(text: string, x: number, y: number, tint: number)
// Special sentinels: \x10 = ► (frame 16), \x11 = ◄ (frame 17)

// Action log: pre-built grid of Image objects (LOG_ROWS × 15 cols)
// addLogMessage(msg) — push to end, slice to LOG_ROWS, refreshLog()
// New messages appear at bottom; older messages scroll upward

// Name centering in party panel (15-char wide panel, col 15 = class glyph):
const nameCol = PANEL_W_CHARS - 1   // 14 chars for name
const pad     = Math.ceil((nameCol - char.name.length) / 2)
const nameLine = char.name.padStart(char.name.length + pad).padEnd(nameCol) + char.cls
```

---

## Key Files

```
src/
  data/world-locations.ts       — LocationDef + WorldTileEntry types; SOSARIA_LOCATIONS and AMBROSIA_LOCATIONS
  entities/Hero.ts              — tileX, tileY, sprite, worldX/Y getters
  scenes/WorldScene.ts          — permanent shell: border, panels, log, input wiring, view transitions
  mapviews/MapView.ts           — interface: load(), handleMove(), handleInteract(), teardown()
  mapviews/OverworldView.ts     — wrapping movement, fog of war, save on move
  mapviews/TownView.ts          — non-wrapping movement, edge-exit back to overworld
  services/InputDirection.ts    — InputDirection enum + offset/name lookup tables
  services/InputService.ts      — keyboard → named action emitter
  lib/trpc.ts                   — tRPC client
server/
  index.ts                  — Express + tRPC server on port 3000
  trpc.ts                   — tRPC init
  routers/hero.ts           — load/save procedures
  db/index.ts               — Drizzle + better-sqlite3 client
  db/schema.ts              — heroes table (id, tileX, tileY, mapId)
drizzle.config.ts           — points to ./game.db
vite.config.ts              — proxy /trpc → localhost:3000
```

---

## Architecture — Map System

### Target Architecture

```
InputService          — one keyboard listener, emits named actions
      │
WorldScene            — permanent shell: border, panels, party info, action log
      │
      ▼
MapView (interface)   — load(), handleMove(), handleInteract(), teardown()
      │
      ├── OverworldView   wrapping movement, fog of war, save on move          ✅
      ├── TownView        no wrapping, walk off edge exits to overworld         ✅
      ├── CombatView      static 11×11 map, party + monster positions           📋
      └── DungeonView     first-person renderer                                 📋
```

### View Transition Pattern

```typescript
private async enterOverworld(): Promise<void> {
    if (this.activeView) this.activeView.teardown()
    const view = new OverworldView(SOSARIA_LOCATIONS)
    await view.load(this, (msg) => this.addLogMessage(msg), (destination) => {
        if (destination) this.enterLocation(destination)
    })
    this.activeView = view
}

private async enterLocation(def: LocationDef): Promise<void> {
    this.activeView.teardown()
    const view = new TownView()
    view.setLocation(def)
    await view.load(this, (msg) => this.addLogMessage(msg), () => this.enterOverworld())
    this.activeView = view
}
```

### Map Behaviour Reference

| View | Wrapping | Exit condition | Fog of war |
|---|---|---|---|
| OverworldView | Yes | None (top level) | Raycasting, vision-blocking tiles |
| TownView | No | Walk off any edge → return to Overworld | TBD |
| CombatView | No | Win/lose/flee condition | None (full visibility) |
| DungeonView | No | Ladder up from level 1 | Render distance only |

---

## Dungeon View — First-Person Renderer

> The DungeonView renderer uses a **cube-grid perspective model** developed and
> confirmed through iterative HTML/Canvas prototype testing. The full specification
> is in `dungeon-view.md`. Key facts are summarised here.

### Conceptual Model

The first-person view is modelled as a **7-column × 6-row grid of cubes** viewed
end-on from a fixed position at the front of the centre column (D0). The grid is
always player-relative — the calculation service transforms absolute dungeon
coordinates + player facing into this relative grid before passing it to the renderer.

```
-------------------------------------------
|  A5 |  B5 |  C5 |  D5 |  E5 |  F5 |  G5 |
-------------------------------------------
|  A4 |  B4 |  C4 |  D4 |  E4 |  F4 |  G4 |
-------------------------------------------
|  A3 |  B3 |  C3 |  D3 |  E3 |  F3 |  G3 |
-------------------------------------------
|  A2 |  B2 |  C2 |  D2 |  E2 |  F2 |  G2 |
-------------------------------------------
|  A1 |  B1 |  C1 |  D1 |  E1 |  F1 |  G1 |
-------------------------------------------
|  A0 |  B0 |  C0 |  D0 |  E0 |  F0 |  G0 |
-------------------------------------------
_____________________^_____________________
```

- Row 0 = player's current cell (always D0 from renderer's perspective)
- Row 5 = furthest visible depth
- Column D = centre / vanishing point column
- Viewer always fixed at centre of D0 regardless of tunnel shape

### Confirmed Renderer Constants

```javascript
const CUBE      = 80;      // world-space cube size (px)
const VIEWER_X  = 0;       // centre of column D
const VIEWER_Z  = -0.01;   // just in front of row 0's near face
const VIEWER_Y  = 0;       // vertical centre — floor and ceiling are symmetric
const FOV       = 170;     // confirmed by consistency testing (see below)
// Viewport: SQUARE canvas. 264×264px in prototype.
// VPX = W/2, VPY = H/2 (vanishing point at screen centre)
```

**FOV=170 on a square canvas** was confirmed by side-by-side testing: render the
same straight tunnel at depths 2, 4, and 6 cells — tier 0's floor/ceiling/wall
footprint must be pixel-identical across all three. Any visible difference indicates
a bug. FOV and viewport aspect ratio are coupled; a non-square canvas changes the
apparent tier-0 size even at the same FOV value.

### Torchlight Brightness Table

Centred on D0 (100%), decays to 0 at all grid edges. Cells at 0% are not drawn.
This means no special edge-clipping logic is needed — blackness at the limits of
vision is implicit.

```
-------------------------------------------
|   0 |   0 |   0 |   0 |   0 |   0 |   0 |  row 5
-------------------------------------------
|   0 |   0 |   0 |  20 |   0 |   0 |   0 |  row 4
-------------------------------------------
|   0 |   0 |  20 |  40 |  20 |   0 |   0 |  row 3
-------------------------------------------
|   0 |  20 |  40 |  60 |  40 |  20 |   0 |  row 2
-------------------------------------------
|  20 |  40 |  60 |  80 |  60 |  40 |  20 |  row 1
-------------------------------------------
|  40 |  60 |  80 | 100 |  80 |  60 |  40 |  row 0
-------------------------------------------
```

### Colour Scheme

| Surface | Colour | Notes |
|---|---|---|
| Floor | Grey `#c8c8c8` @ brightness | |
| Ceiling | Grey `#c8c8c8` @ brightness | Perfect mirror of floor (VIEWER_Y = 0) |
| Side walls | Blue `#0088fe` @ brightness | Parallel to line of sight |
| Forward walls | Orange `#fd6700` @ brightness | Perpendicular to line of sight |
| Background | Black `#000000` | Never explicitly drawn; implicit from canvas clear |

### Cell Value Array

The renderer consumes a **flat array of 42 values** (7 cols × 6 rows, row-major,
row 0 first). Values reuse the raw `.ULT` byte encoding:

| Value | Meaning | Render behaviour |
|---|---|---|
| `0x00` | Floor / corridor | Open. Floor + ceiling + walls per neighbours. |
| `0x02` | Fountain | Open + fountain overlay glyph. |
| `0x05` | Mark | Open + mark glyph on floor plane. |
| `0x06` | Gremlin | Open + monster overlay (separate entity layer TBD). |
| `0x08` | Sign | Open + sign glyph on forward wall. |
| `0x10` | Ladder up | Open + ladder-up glyph. |
| `0x20` | Ladder down | Open + ladder-down glyph. |
| `0x30` | Ladder up+down | Open + bidirectional ladder glyph. |
| `0x40` | Chest | Open + chest glyph on floor plane. |
| `0x80` | Solid wall | Solid. Generates walls on open neighbours. |
| `0xA0` | False wall | Solid (no visual distinction from `0x80`). |
| `0xC0` | Door | Solid + door glyph on one designated face (see below). |
| `0x03` | Strange wind | Solid-pass-through. No visual. Game logic only. |
| `0x04` | Trap | Open. No visual. Game logic only. |

Solidity check: `SOLID_VALUES = {0x80, 0xA0, 0xC0}`. Everything else is open.
Out-of-bounds cells (grid window extends past 16×16 dungeon edge) are treated as `0x80`.

### Door Rendering

- A door cell (`0xC0`) is **solid** — no floor/ceiling rendered, player cannot occupy it.
- It has exactly one **door face**: the face bordering the corridor it connects to.
- That face renders a door glyph (brown inset rectangle with planks + handle) in
  place of plain wall fill — blue/perspective if it's a side face, orange/flat if
  it's a forward face.
- All other faces of a door cell are invisible solid rock (no open neighbour).
- Open/closed state is movement-logic only; the renderer always draws the door.
- The door face direction is defined explicitly in the dungeon data, not inferred
  purely from neighbour-openness.

### Torch-out Blackness

When the player's torch is extinguished, the renderer applies a global brightness
multiplier of 0 to all faces. This is a render-state flag, not a per-cell value —
it overrides the brightness table entirely, producing a completely black viewport.

### Face Rendering Rules (painter's algorithm, back-to-front)

For each **open cell** in the 42-array, render:
1. Floor (y = +CUBE/2) — grey @ brightness, always
2. Ceiling (y = -CUBE/2) — grey @ brightness, always (mirror of floor)
3. Left wall (x = x0) — blue @ brightness, only if left neighbour is solid
4. Right wall (x = x1) — blue @ brightness, only if right neighbour is solid
5. Forward wall (z = wz_far) — orange @ brightness, only if forward neighbour is solid or out of bounds

Sort all faces by `avgZ` descending before drawing. Forward walls use
`avgZ = wz_far - 0.5` to sort in front of floor/ceiling at the same depth.

### Planned Glyphs (next session)

All glyphs are scaled proportionally to depth tier (distance from viewer):

| Cell type | Glyph style |
|---|---|
| Ladder up | Two vertical rails + rungs, glyph in upper half |
| Ladder down | Two vertical rails + rungs, glyph in lower half |
| Ladder up+down | Combined bidirectional ladder |
| Fountain | Glyph on floor plane |
| Gremlin | Monster overlay (entity layer, TBD) |
| Mark | Glyph on floor plane |
| Sign | Glyph on forward wall face |
| Chest | Glyph on floor plane |
| Door | Inset brown rectangle on wall face (side = blue bg, forward = orange bg) |

### Calculation Service (next thread)

The renderer knows nothing about absolute dungeon coordinates or player facing. A
**calculation service** (separate module) transforms:

**Input:** dungeon level grid (16×16 array of cell bytes) + player absolute position
(x, y) + player facing (N/S/E/W)

**Output:** 42-value flat array in renderer-relative coordinates (always player at D0,
always looking forward into increasing row numbers)

Out-of-bounds cells (window extends past 16×16 boundary) are filled with `0x80`
(solid). Dungeons never wrap — they are fully encased in solid rock.

---

## Commands

```bash
npm run dev          # start both client and server
npm run dev:client   # Vite only (port 5173)
npm run dev:server   # Express/tRPC only (port 3000)
npm run db:push      # sync schema to game.db
npm run db:generate  # generate migration files
```

---

## Reference Documents

| File | Description |
|---|---|
| `dungeon-view.md` | Full dungeon renderer spec — cube grid model, projection constants, face rules, door rules |
| `dungeon-cell-values.md` | Cell value lookup table — ULT byte → render behaviour mapping |
| `original-file-format.md` | Tile mapping reference with confidence levels (HIGH/MEDIUM/LOW) |
