# Dungeon View Rendering Specification

> **Replaces** the earlier polygon/depth-plane approach. This specification describes
> the confirmed cube-grid model developed through iterative render testing.

---

## 1. Conceptual Model

The first-person dungeon view is modelled as a **7×6 grid of cubes** viewed end-on
from a fixed position at the front of the centre column. Each cube is referenced by
a **column letter** (A–G) and **row number** (0–5).

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

- **Row 0** = nearest to the viewer
- **Row 5** = furthest from the viewer
- **Column D** = centre column; vanishing point lies at its centre
- **^** = fixed viewer position, always at the centre of D0

---

## 2. Viewer Position

The viewer is always fixed at the **centre of D0** regardless of tunnel shape or width.

```javascript
const VIEWER_X = 0;      // world-space centre of column D
const VIEWER_Z = -0.01;  // just in front of row 0's near face
const VIEWER_Y = 0;      // vertical centre (floor and ceiling are symmetric)
```

This is a **permanent constant** — it never shifts to follow the tunnel layout.

---

## 3. World Space & Projection

Each cube is `CUBE` units (80px) in world space. Column D has `colOffset = 0`;
columns to the left are negative, to the right positive.

```javascript
const colOffset = col - 3; // A=-3, B=-2, C=-1, D=0, E=+1, F=+2, G=+3
const x0 = colOffset * CUBE - CUBE / 2;
const x1 = colOffset * CUBE + CUBE / 2;
const wz_near = row * CUBE;
const wz_far  = (row + 1) * CUBE;
```

Simple perspective projection (no camera matrix needed):

```javascript
function project(wx, wy, wz) {
  const rx = wx - VIEWER_X;
  const ry = wy - VIEWER_Y;
  const rz = wz - VIEWER_Z;
  if (rz <= 0) return null; // behind viewer — discard
  const f = FOV / rz;
  return { sx: VPX + rx * f, sy: VPY + ry * f };
}
```

**Confirmed FOV value: 170.** Verified by side-by-side consistency testing — at this
value tier 0 (the cell the player stands in) occupies a sensible fraction of the
frame (floor and ceiling both visible, not cropped, not dominating the whole view),
and this proportion holds consistently regardless of corridor length or what lies
beyond the current cell.

**Canvas / viewport must be square.** Testing showed FOV and viewport aspect ratio
are coupled — the same FOV value produces different apparent tier-0 sizes on a
non-square canvas. A **square viewport (264×264px in prototype testing)** was
confirmed to give consistent, predictable results. This differs from the
176×213px (non-square) viewport documented in the earlier polygon-based approach —
that figure should be treated as superseded.

**Canvas vanishing point:** `VPX = W/2`, `VPY = H/2` (screen centre).

### FOV / Aspect Ratio Validation Method

Confirmed via two tests:
1. **Fixed FOV, varying corridor depth** — render the same straight corridor at
   depths 2, 4, and 6 cells, same FOV, same (square) canvas. Tier 0's rendered
   footprint must be pixel-identical across all three, since tier 0's own geometry
   never depends on what lies beyond it. Any visible difference indicates a bug,
   not a tuning issue.
2. **Fixed scene, varying FOV** — render the same corridor at several FOV values
   to confirm FOV behaves as an independent zoom control once aspect ratio is
   fixed.

Cell labels (e.g. "D0", "D1") rendered directly on each floor face are the most
reliable way to confirm exactly which cells are in frame — relying on visual
proportion alone risked misreading which cell was actually visible (e.g. mistaking
D1 for D0 when FOV was too high and pushed the near cell out of frame).

---

## 4. Tunnel Definition

The dungeon map is expressed as a **set of open cells**. Every cell not in the set
is treated as **solid rock**.

```javascript
// Example: single straight corridor down column D
const TUNNEL = new Set([
  'D0','D1','D2','D3','D4','D5'
]);

// Internally stored as "col_index,row_index"
const TUNNEL = new Set(['3,0','3,1','3,2','3,3','3,4','3,5']);

const isOpen = (col, row) => TUNNEL.has(`${col},${row}`);
```

---

## 5. Colour Scheme

| Surface | Colour | Hex | Notes |
|---|---|---|---|
| Floor | Grey | `#c8c8c8` at 100% | Scaled by brightness |
| Ceiling | Grey | `#c8c8c8` at 100% | Mirror of floor |
| Side walls | Blue | `#0088fe` at 100% | Parallel to line of sight |
| Forward walls | Orange | `#fd6700` at 100% | Perpendicular to line of sight |
| Background / solid | Black | `#000000` | Never explicitly drawn |

All colours are multiplied by the cell's **brightness factor** (see §6).

```javascript
function tint(rgb, brightness) {
  const b = brightness / 100;
  return `rgb(${Math.round(rgb[0]*b)},${Math.round(rgb[1]*b)},${Math.round(rgb[2]*b)})`;
}
```

---

## 6. Torchlight Brightness

Each cell has a brightness percentage. The table is centred on D0 (100%) and
decays to 0 at all edges, so no special clipping rules are needed — cells at 0%
simply aren't drawn.

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

```javascript
const BRIGHTNESS = [
  [ 40,  60,  80, 100,  80,  60,  40],  // row 0 (nearest)
  [ 20,  40,  60,  80,  60,  40,  20],  // row 1
  [  0,  20,  40,  60,  40,  20,   0],  // row 2
  [  0,   0,  20,  40,  20,   0,   0],  // row 3
  [  0,   0,   0,  20,   0,   0,   0],  // row 4
  [  0,   0,   0,   0,   0,   0,   0],  // row 5 (furthest)
];
```

---

## 7. Face Rendering Rules

For each **open cell**, render the following faces:

| Face | Condition | Colour |
|---|---|---|
| Floor (y = +CUBE/2) | Always | Grey @ brightness |
| Ceiling (y = -CUBE/2) | Always | Grey @ brightness (mirror of floor) |
| Left wall (x = x0) | Left neighbour is solid | Blue @ brightness |
| Right wall (x = x1) | Right neighbour is solid | Blue @ brightness |
| Forward wall (z = wz_far) | Forward neighbour is solid or out of bounds | Orange @ brightness |

Faces with brightness = 0 are skipped (they would be invisible black).

### Door Cells

A door cell (`0xC0`) is **solid**, not open — the player cannot occupy its volume,
and it does not render floor/ceiling. It behaves exactly like a normal solid cell
**except** for exactly one face, which renders a door glyph instead of plain wall
fill.

- The door face is defined explicitly (per dungeon data), not inferred purely from
  which neighbours happen to be open. A solid cell could theoretically border
  multiple open neighbours; only the designated door face shows the door.
- If the door face borders an open cell to the side, render it on a **blue** side
  wall, with the door glyph drawn in the correct perspective shape for that depth
  tier (matching whatever quad the side wall would otherwise have).
- If the door face borders an open cell ahead, render it on an **orange** forward
  wall, as a flat rectangular door inset.
- All other faces of a door cell render as ordinary solid wall (or are simply not
  drawn, if no open neighbour faces them) — invisible, same as any solid cell.
- In practice, a door cell should only ever have one solid-bordered face requiring
  a door glyph; a door appearing on two simultaneously visible faces (e.g. at a
  T-junction corner) is not expected to occur in real dungeon layouts and should
  be treated as a data anomaly if encountered.
- Door open/closed state is a movement-logic concern, not a rendering concern —
  the renderer always draws the door cell as solid-with-glyph; whether the player
  can currently pass through is resolved elsewhere.

---

## 8. Painter's Algorithm

All faces are collected into a list and **sorted back-to-front by avgZ** before
drawing. This ensures correct occlusion without a depth buffer.

```javascript
const avgZ = (wz_near + wz_far) / 2;
faces.sort((a, b) => b.avgZ - a.avgZ);
```

Forward walls use `avgZ = wz_far - 0.5` to ensure they sort in front of the
floor/ceiling of the same cell.

---

## 9. Wireframe Overlay (Debug)

All 6 faces of each open cube are stroked in faint white (`rgba(255,255,255,0.15)`,
lineWidth 0.5) as a debug aid. This overlay sits on top of filled faces and can be
toggled off for the final game renderer.

---

## 10. Cell Labels (Debug)

Each open cell is labelled (e.g. `D2`) at the centre of its floor face in faint
white monospace text. Useful for verifying tunnel layouts. Remove for production.

---

## 11. Key Implementation Notes

- **Viewer never moves.** Tunnel shape changes what is open/solid; the projection
  origin is always D0 centre.
- **No special edge rules.** The brightness table decays to 0 naturally, so the
  renderer needs no knowledge of the grid boundary.
- **Solid cells are never drawn.** Only open cells contribute faces. Solid rock is
  implicit black from the canvas clear.
- **Internal walls disappear automatically.** When two adjacent cells are both open,
  neither generates a wall face on their shared boundary — the corridor opens up.
- **Out-of-bounds neighbours are treated as solid.** This means the outermost open
  cells always get side/forward walls if they sit at the grid edge.
- **Ceiling is a perfect mirror of the floor.** VIEWER_Y = 0 ensures symmetry.
  Eye height adjustment (if needed later) can be done by offsetting VIEWER_Y.
