# Dungeon View — Cell Value Lookup Table

This table defines the values used in the **42-element view array** (7 columns ×
6 rows) consumed by the dungeon renderer. Each value maps directly to a raw `.ULT`
byte from `dungeon-mapping.md`, so the calculation service can pass decoded map
bytes straight through with no re-encoding.

## Design Principle

The view array reuses the **same byte values as the raw `.ULT` format** wherever
possible. This means the calculation service's job is purely geometric (windowing
+ rotation), not translation — a cell's value in the 42-array is the same byte
that was decoded from the dungeon JSON.

The only addition is a single reserved value for cells that fall **outside the
bounds of the 16×16 level grid** (relevant near dungeon edges, where the 7×6
viewer-relative window can extend past the map boundary).

## Lookup Table

| Value | Name | Symbol | Render Behaviour |
|-------|------|--------|-------------------|
| `0x00` | Floor / Corridor | — | Open cell. Renders floor, ceiling, and any required side/forward walls per neighbour solidity. No overlay. |
| `0x01` | Ladder Up (variant) | ↑ | Treat identically to `0x10` for rendering purposes (LOW confidence byte, single known occurrence). Open cell + ladder-up overlay. |
| `0x02` | Fountain | F | Open cell + fountain overlay, drawn on the floor plane at the cell's depth. Subtype not encoded; engine-determined at interaction time, not render time. |
| `0x03` | Strange Wind | W | Open cell. No persistent visual overlay planned (wind is a triggered/audio event, not a static glyph) — confirm before implementation. |
| `0x04` | Trap | T | Open cell. No persistent visual overlay planned (traps are hidden until triggered) — confirm before implementation. |
| `0x05` | Mark | M | Open cell + mark overlay glyph on the floor plane. |
| `0x06` | Gremlin | G | Open cell + monster overlay (gremlin sprite), positioned and animated as an actor rather than a static glyph — likely needs separate entity-layer handling rather than the static overlay system. |
| `0x08` | Sign / Message | § | Open cell + sign overlay (glyph on forward wall face, where applicable), triggers clue string display on interact. |
| `0x10` | Ladder Up | ↑ | Open cell + ladder-up overlay (rails + rungs, per existing `dungeon-view.md` glyph spec, mirrored for "up"). |
| `0x20` | Ladder Down | ↓ | Open cell + ladder-down overlay. |
| `0x30` | Ladder Up + Down | ↕ | Open cell + bidirectional ladder overlay (combined glyph, or up+down rendered together). |
| `0x40` | Chest | 📦 | Open cell + chest overlay on the floor plane. |
| `0x80` | Solid Wall | ■ | Solid. No floor/ceiling/overlay. Generates blue side wall or orange forward wall on any open neighbour. |
| `0xA0` | False Wall | X | Rendered identically to `0x80` (solid) from the player's perspective — visually indistinguishable until passed through. No special render path; passability is a movement-logic concern, not a rendering concern. |
| `0xC0` | Door | 🚪 | Solid-appearing cell with a door overlay on the relevant wall face (closed state) — opens on interact, at which point it should render as `0x00` for that interaction. |
| `0xFF` | *(reserved)* Out of bounds | — | **New value, not present in source ULT data.** Used when the viewer-relative window extends past the 16×16 level grid. Always treated as solid for wall-generation purposes; never rendered with a wall colour fill of its own (it has no "inside" to be lit) — functions purely as an opaque neighbour. |

## Notes on Solidity Classification

For the renderer's "is this neighbour solid?" check (used to decide whether to draw
a blue side wall or orange forward wall), the classification is binary:

```javascript
const SOLID_VALUES = new Set([0x80, 0xA0, 0xC0, 0xFF]);
const isSolid = (value) => SOLID_VALUES.has(value);
const isOpen = (value) => !isSolid(value);
```

Everything else (`0x00`–`0x40` range) is open floor with an optional overlay.

**Doors (`0xC0`) are classified as solid** for wall-generation purposes even
though they're passable — the wall face is drawn, with a door overlay/glyph on
top, and movement logic (not render logic) decides whether the player can step
through after interacting.

**False walls (`0xA0`) are classified as solid** for the same reason — they must
look identical to real walls, otherwise they'd cease to function as a secret.

## Open Items / Decisions Needed

1. **`0x03` Wind and `0x04` Trap** — confirm whether these need any static visual
   indicator at all, or whether they're purely triggered effects (screen shake,
   torch-out animation, damage flash) with zero standing geometry. Current
   assumption: no overlay needed at the tunnel-rendering stage.
2. **`0x06` Gremlin** — likely belongs to a separate monster/entity rendering
   system rather than the static overlay system, since gremlins move and need
   their own update loop. Flagging for a future architecture decision rather
   than folding into this lookup table's overlay logic.
3. **`0x08` Sign** — needs a decision on whether the glyph renders on the forward
   wall face (like a carved rune) or is purely interaction-triggered with no
   visible glyph until interacted with. The PNG top-down renderer shows it as a
   visible `§`/`S` symbol, suggesting a visible in-view glyph is desirable for
   consistency.
4. **`0xC0` Door open state** — needs a decision on whether opened doors persist
   as open for the rest of the session (state tracked in the calculation service
   or a parallel "door state" map) or reset each visit.
