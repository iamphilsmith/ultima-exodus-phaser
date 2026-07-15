# Ultima III Dungeon Format — Mapping Reference

## File Structure

Each dungeon `.ULT` file (e.g. `p.ult` = Dungeon of the Snake) has the format:

```
[8 × 256 bytes] = 8 dungeon levels, each a 16×16 grid of 1-byte cells
[variable]      = Clue/message table (see below)
```

Total: 2048 bytes map data + trailing message table.

The dungeon grid is stored **row-major**, left-to-right, top-to-bottom:
- `data[level * 256 + row * 16 + col]` = cell at (row, col) on that level
- Rows and cols are 0-indexed; the outer ring (row/col 0 and 15) is always solid wall (0x80) **in p.ult and mine.ult**, but Dardin's Pit (dardin.ult) uses the full 16×16 grid freely with passable cells in the border rows/cols. Renderers must not assume borders are always walls.

---

## Cell Byte Encoding

Unlike overworld/town maps (which use `raw_byte / 4 + 1` for Tiled tile IDs), dungeon cells use **direct byte values** that encode both structure and content:

| Byte  | Name             | Symbol | Confidence | Notes |
|-------|------------------|--------|------------|-------|
| 0x00  | Floor/Corridor   | —      | CONFIRMED  | Open passable space |
| 0x01  | Ladder Up (variant?) | ↑    | LOW        | Single occurrence in time.ult L8 at (1,1) — the canonical dungeon entry corner. All other dungeons use `0x10` at this position. Tentatively a `ladder_up` variant; could be an alternate encoding for the surface exit. Flagged for future verification. |
| 0x02  | Fountain         | varies | CONFIRMED (existence); LOW (subtype) | Effect type (cure/heal/poison/damage) is **not stored in the ULT**; determined by game engine lookup. See fountain notes below. |
| 0x03  | Strange Wind     | W      | CONFIRMED  | Blows out torches; verified via image + StrategyWiki |
| 0x04  | Trap             | T      | CONFIRMED  | Verified via image + StrategyWiki |
| 0x05  | Mark             | M      | CONFIRMED  | Collectible mark item (e.g. Mark of Snake, Mark of Kings, Mark of Fire). **Not a fountain** — previously misidentified as "fountain_alt". The specific mark identity (which mark at which position) is not encoded in the ULT; it is determined by the game engine based on dungeon + position. |
| 0x06  | Gremlin          | G      | CONFIRMED  | Steals food; clue string "Gremlins!"; verified positions |
| 0x08  | Sign/Message     | §      | CONFIRMED  | Displays the level's clue string. Multiple 0x08 cells on one level all show the same message. L4 of p.ult has zero 0x08 cells, consistent with wiki noting Sign 4 as "(n/a)". **Originally misidentified as ladder_down — corrected after visual cross-reference of p.ult L1.** |
| 0x10  | Ladder Up        | ↑      | CONFIRMED  | Confirmed by position at surface entry point (1,1) on p.ult L1. |
| 0x20  | Ladder Down      | ↓      | CONFIRMED  | L8 of p.ult has zero 0x20 cells (bottom level, nowhere to descend) — strong confirmation. **Originally misidentified as sign — corrected after visual cross-reference of p.ult L1.** |
| 0x30  | Ladder Up + Down | ↕      | CONFIRMED  | Bitwise `0x10 \| 0x20`; a cell that functions as both a ladder up and a ladder down. Appears at (1,1) on every level of mine.ult as the main entry/exit point; also used for secondary bidirectional ladder access points in the lower-right of L2–L6. Not observed in p.ult. |
| 0x40  | Chest            | 📦     | CONFIRMED  | Chest count 53 total / 21 on L1 (p.ult) and 127 total / 24 on L8 (mine.ult) match StrategyWiki exactly. |
| 0x80  | Solid Wall       | ■      | CONFIRMED  | Impassable; outer border always 0x80. |
| 0xa0  | False Wall       | X      | CONFIRMED  | Bitwise `0x80 \| 0x20`; looks like solid wall but is passable. The combination produces distinct behaviour rather than literally being a wall + ladder_down. |
| 0xc0  | Door             | 🚪     | CONFIRMED  | Door positions verified via map image |

**No 0x01 or 0x07 values ever appear in any dungeon file examined.**

---

## Fountain Subtype Notes

**The ULT file does not encode fountain subtype.** All ordinary fountains are stored as `0x02`. The game engine determines whether a fountain cures, heals, poisons, or damages based on its own internal lookup (dungeon + level + possibly position).

For the Dungeon of the Snake specifically (per StrategyWiki):

| Level | Fountain types present | Encoded as |
|-------|----------------------|------------|
| L1    | Cure (C)             | 0x02 ×1   |
| L2    | None                 | —          |
| L3    | None                 | —          |
| L4    | Poison (C), Damage (D) | 0x02 ×4  |
| L5    | Poison (P)           | 0x02 ×8   |
| L6    | Healing (H), Cure (C) | 0x02 ×4  |
| L7    | Healing (H), Cure (C), Damage (D), Poison (P) | 0x02 ×4 |
| L8    | Damage (D)           | 0x02 ×1 | Two additional cells at (15,6) and (15,15) are `0x05` = **marks**, not fountains |

Note: L4's wiki label "C = Poison fountain (no cure)" is confusing notation — the C symbol on the L4 map refers to a **poison** fountain (not a cure fountain as on other levels), and the parenthetical "(no cure)" is an editorial warning that there is no cure fountain available on that level.

Note: the mine.ult L8 clue "Dry hole" now makes complete sense — there are no `0x02` fountain cells at all on that level, only marks and chests.

For the **Mines of Morinia** (mine.ult), per clue strings and StrategyWiki:

| Level | Fountain types present | Encoded as | Notes |
|-------|----------------------|------------|-------|
| L1    | Unknown              | 0x02 ×2   | |
| L2    | Unknown              | 0x02 ×1   | |
| L3    | Unknown              | 0x02 ×0 | One `0x05` mark cell at (5,3) — not a fountain |
| L4    | Unknown              | 0x02 ×2   | |
| L5    | None                 | —          | |
| L6    | None                 | —          | |
| L7    | Unknown              | 0x02 ×4   | Central hub room |
| L8    | None safe ("Dry hole") | —      | No 0x02 cells; two `0x05` marks at (9,3),(15,13) — "Dry hole" clue confirms no drinkable water |

---

## Sign / Message Table

After the 2048 bytes of map data, a small table stores text clues. The first 16 bytes are 8 little-endian 16-bit offsets (relative to start of the remainder block), pointing to null-terminated ASCII strings.

**Sign assignment rule:** Each level has one sign message numbered 1–8. The sign for level N uses clue string index N-1 (0-indexed). Multiple `0x08` cells on the same level all display the same message. `0x08` was originally misidentified as ladder_down; corrected after visual cross-reference confirmed that (1,2) and (2,1) on p.ult L1 are sign cells adjacent to the entry ladder, not a second ladder. The correction is further supported by L4 having zero `0x08` cells (consistent with the wiki noting Sign 4 as "n/a") and L8 having zero `0x20` cells (consistent with it being the bottom level with nowhere to descend).

**`0x30` = ladder_up_down** (`0x10 | 0x20`). A cell that functions as both a ladder up and a ladder down simultaneously. In mine.ult, every level uses `0x30` at position (1,1) as the main bidirectional entry/exit point. Extra `0x30` cells also appear in the lower-right region of L2–L6, with a decreasing count per level (6 on L2, 5 on L3, … 0 on L7), representing additional bidirectional ladder points accessible via magic.

For `p.ult` (Dungeon of the Snake):

| Level | Clue index | Message |
|-------|-----------|---------|
| L1    | 0         | "Clues to follow!" |
| L2    | 1         | "\<Insert\> cards into Exodus!" |
| L3    | 2         | "\<Search\> the Shrines!" |
| L4    | 3         | "Death below!" *(wiki labels this "n/a" — possibly not displayed in original)* |
| L5    | 4         | "Don't drink!" |
| L6    | 5         | "Don't drink!" *(same string, different offset entry)* |
| L7    | 6         | "Gremlins!" |
| L8    | 7         | "Windy gold!" |

**Anomaly:** L8 contains **zero** `0x08` sign cells, yet StrategyWiki shows a Sign 8 ("Windy gold!"). The sign may be triggered by a non-`0x08` mechanism on L8, or may be an automatic floor entry message.

---

## Marks (Special Items — L8)

StrategyWiki shows the **Mark of Snake** (`s`) and **Mark of Kings** (`k`) on the Level 8 map. These are not encoded as distinct byte values in the ULT file. They are likely:
- Hardcoded positions in the game engine, triggered by the `SEARCH` command on a floor cell
- Not represented in the ULT file at all

---

## Dungeon of the Snake — Level Summaries

*(All chest/ladder/fountain counts verified against StrategyWiki where applicable)*

### Level 1
Entry level. **21 chests** (40% of all dungeon chests). Top-left corner entry cluster: ladder_up (1,1) to surface + two sign cells at (1,2) and (2,1). One cure fountain at (3,3), two wind cells, one trap, two gremlins, four doors, many false walls. One ladder_down at (11,11).
- Sign 1: "Clues to follow!"

### Level 2
Large open central room with outer corridor ring. Four sign cells at corners; one ladder_up at (11,11). Three ladder_down cells; three wind cells. No chests.
- Sign 2: "\<Insert\> cards into Exodus!"

### Level 3
Symmetrical cross-shaped corridors. Three sign cells; ladder_down at four corners. One trap at center (8,8). Many false walls. No chests.
- Sign 3: "\<Search\> the Shrines!"

### Level 4
Four fountains (0x02 — types include poison and damage per wiki). Ring of false walls. One ladder_up at (11,11). Four ladder_down cells at corners. Zero sign cells (consistent with wiki noting Sign 4 as "n/a"). Seven chests.
- Sign 4: "Death below!" *(no 0x08 sign cell present — message may not display in-game)*

### Level 5
**Trap gauntlet.** Corner ladder_up cells surrounded by traps. Eight fountains (poison type per wiki) distributed symmetrically. One ladder_down at centre (8,8). One sign cell. No chests.
- Sign 5: "Don't drink!"

### Level 6
Rotationally symmetric. Central hub: ladder_up (8,8), four ladder_down around it, four fountains (healing + cure per wiki), four doors, eight chests in ring. Four sign cells at corners.
- Sign 6: "Don't drink!"

### Level 7
**Gremlin level.** Ten gremlin cells scattered throughout. Four fountain cells (heal/cure/damage/poison mix per wiki). Four corner ladder clusters (up+down pairs). Five sign cells at outer edge. No chests.
- Sign 7: "Gremlins!"

### Level 8
**Bottom level / wind maze.** 16+ wind cells (0x03) — most of any level. One `0x02` fountain at (1,10) — damage type per wiki. Two `0x05` mark cells: **Mark of Snake** at (15,6) and **Mark of Kings** at (15,15) — specific identities are engine-determined, not ULT-encoded. 17 chests. False walls form a central 2×2 cluster. Four sign cells (0x08) present; zero ladder_down cells (confirmed bottom level).
- Sign 8: "Windy gold!" *(sign cells present but sign delivery mechanism not yet confirmed)*

---

## Conversion Notes

### Tile ID formula
Dungeon cells do **NOT** use the `raw_byte / 4 + 1` formula. Cell bytes are used directly as type identifiers.

### DungeonView renderer (TBD)
The dungeon renderer will need to:
1. Read the 16×16 cell grid per level
2. Render in first-person 3D view (original) or top-down overhead view
3. Handle all cell types above with appropriate sprites/effects
4. Support `0xa0` false wall mechanic: renders as wall, treated as floor for collision
5. Fountain subtype will need a separate lookup table keyed by `(dungeon_id, level, row, col)` or similar

---

## Mines of Morinia — Level Summaries

*(Verified against StrategyWiki: https://strategywiki.org/wiki/Ultima_III:_Exodus/Mines_of_Morinia)*

Wiki notes: L2–L7 accessible only via magic (no direct ladder chain from L1 entry). L1 has six ladder_down (0x20) cells in its lower-right quadrant, but these do not form a chain to L8 — each leads to the corresponding level's entry point. Direct descent from L1 to L8 requires magic. 127 total chests; 24 on L8.

### Level 1
Entry level. `0x30` at (1,1) = ladder_up_down (↕). Four sign cells (0x08) at (1,2),(2,1),(9,15),(15,9). Six ladder_down cells (0x20) at (11,15),(13,13),(13,15),(15,11),(15,13),(15,15) — exit cluster in lower-right quadrant. Two fountains, two wind, one trap, two gremlins, four doors, six chests.
- Sign 1: "Mines of Morinia"

### Level 2
Dense false-wall maze (35 false wall cells). One sign cell (0x08) at (11,11). No plain ladder_down (0x20). Five `0x30` ladder_up_down (↕) cells at (13,13),(13,15),(15,11),(15,13),(15,15) plus (1,1). Eight wind, five traps, 12 gremlins, eight doors, ten chests.
- Sign 2: "Terror tunnels!"

### Level 3
Long corridor layout. Two sign cells (0x08) at (0,11) — anomalous border-row position — and (15,10). No plain ladder_down. Four `0x30` ladder_up_down (↕) cells including (1,1). Eight wind, six gremlins, one mark cell (0x05) at (5,3). No chests.
- Sign 3: "Long march!"

### Level 4
Rich chest level — **25 chests**. One sign cell (0x08) at (12,13). No plain ladder_down. Three `0x30` ladder_up_down (↕) cells including (1,1). Two fountains, two traps, two false walls.
- Sign 4: "Misty mines!"

### Level 5
**32 chests** — highest chest count of any level. Two sign cells (0x08) at (12,15),(13,14). No plain ladder_down. Two `0x30` ladder_up_down (↕) cells including (1,1). 13 wind, eight traps, two false walls. No fountains.
- Sign 5: "Mines of madness"

### Level 6
**Gremlin/Trap gauntlet.** 32 gremlins + 15 traps. 21 chests. Two sign cells (0x08) at (13,13),(15,11). No plain ladder_down. One `0x30` ladder_up_down (↕) cell at (1,1). Nine wind, one door, four false walls.
- Sign 6: "G, T, & G!"

### Level 7
**Wind maze.** 175 of 256 cells are wind (0x03) — nearly the entire level. Central hub room (rows 6–8, cols 6–11): ring of 10 sign cells (0x08) surrounding 4 fountain cells, plus two further sign cells at (14,15),(15,14) — 12 sign cells total. No plain ladder_down (0x20). One `0x30` ladder_up_down (↕) at (1,1) for exit. Nine chests, eight traps scattered in wind.
- Sign 7: "Dark prevails!"

### Level 8
Bottom level. **24 chests** (confirmed). No `0x30` cells (bottom level — no ladder_up_down). Two sign cells (0x08) at (1,2),(2,1). Zero ladder_down cells (confirmed bottom level). Two mark cells (0x05) at (9,3),(15,13) — **Mark of Fire** and **Mark of Kings** (identities engine-determined). No fountains ("Dry hole"). Two wind, two traps, two false walls.
- Sign 8: "Dry hole"

---

## Dardin's Pit — Level Summaries

### Key structural differences from p.ult / mine.ult

**No guaranteed outer wall border.** Unlike the other two dungeons, Dardin's Pit uses the full 16×16 grid freely. Many levels have floor, chests, false walls, or special cells in row 0, row 15, col 0, or col 15. The renderer must handle this correctly rather than assuming borders are always solid.

**Vertical shaft via 0x30.** The `ladder_up_down` (0x30) cell at (5,5) appears on both L5 and L6, and L4 has `ladder_down` (0x20) at (5,5). This forms a confirmed three-level vertical shaft: L4↓ → L5↕ → L6↕. This is the first confirmed use of 0x30 as a true multi-level pass-through rather than an entry marker.

**Sign clusters around features.** Sign cells (0x08) are used architecturally — grouped in symmetric diamonds or rings around significant cells (ladder rooms, wind rooms). For example L2 has a 3×3 grid with `ladder_up`, `wind`, and `ladder_down` cells surrounded by signs on all four cardinal sides.

**113 total chests** across 8 levels; L6 alone has 28.

### Level 1
Entry level. Ladder_up at (1,1), two ladder_down at (11,11),(13,13). One sign at (3,3). Six gremlins scattered around open corridors. Two chests, two doors, two false walls, one trap. Open border (row 15 and col 15 are passable floor).
- Sign 1: "Dardin's Pit!"

### Level 2
**False wall maze** — 22 false walls. Central 3×3 feature room at (11–13, 11–13): `ladder_up`/`ladder_down` at corners, `wind` at centre (12,12), sign cells on all four cardinal sides. Four doors frame the entry corridors. One mark (0x05) at (3,11). One fountain, two traps, nine chests.
- Sign 2: "Secret slides!"

### Level 3
**False wall labyrinth** — 104 false wall cells, the most of any level seen. Open 9×9 interior grid (rows 2–10, cols 2–10) is almost entirely false walls with traps at (4,4),(4,8),(8,4),(8,8) and a 3×3 chest cluster at centre (rows 5–7, cols 5–7). Right side (cols 12–15) is a corridor with alternating false walls, traps, signs, and chests. One fountain, one ladder_down, two ladder_up. 17 chests.
- Sign 3: "Beware traps!"

### Level 4
**Open checkerboard layout** — alternating wall/floor columns with no outer border. Seven wind cells, nine gremlins, four traps distributed through corridors. Ladder_up at (11,11), ladder_down at (5,5) — feeds the shaft to L5. Four signs. 14 chests.
- Sign 4: "Ever adventure!"

### Level 5
**Gremlin gauntlet** — 27 gremlins. Entire col 15 and row 15 (except (15,0)) is lined with gremlins, forming a gremlin border wall. Five fountains. One ladder_down (11,11), one ladder_up_down (5,5) — mid-point of the vertical shaft from L4. Two signs. Six chests.
- Sign 5: "Gremlins!"

### Level 6
**Circle of Death** — 22 traps arranged in symmetric rings, 28 chests. Highly symmetric layout. Ladder_up at (11,11), ladder_up_down (5,5) — top of the vertical shaft. Twelve sign cells arranged in the ring pattern around the trap circles, warning the player. No gremlins, no fountains.
- Sign 6: "Circle Death!"

### Level 7
**Colossal cavern** — large open spaces with sparse features. 15 traps, nine gremlins, 19 chests scattered freely. Ladder cluster at (4,5)–(6,5): sign diamond surrounding central ladder_up (5,5). One ladder_down at (11,11). One sign at (11,11). No false walls.
- Sign 7: "Colosal cavern!"

### Level 8
**Trap vault** — 25 traps. A ring of traps (0x04) forms a rectangular border frame along rows 7–15 cols 7–15, with chests inside. One mark (0x05) at (3,3). Two fountains, 12 false walls. Ladder_up at (11,11). Two sign cells at (12,15),(15,12). 18 chests. No ladder_down (bottom level confirmed by absence of 0x20).
- Sign 8: "Traps to gold!"

---

## Dungeon of Fire — Level Summaries

### Key structural features

**Open borders** — full 16×16 grid used freely, consistent with dardin.ult.

**Alternating main shaft** — the primary vertical passage alternates between (5,5) and (11,11) every level, like a helix:
`L1(11,11)↓ → L2(11,11)↑/(5,5)↓ → L3(5,5)↑/(11,11)↓ → L4(11,11)↑/(5,5)↓ → L5(5,5)↑/(11,11)↓ → L6(11,11)↑/(5,5)↓ → L7(5,5)↑/(11,11)↓ → L8(11,11)↑`

**Secondary shaft at (15,1)** — a separate passage through the border column: L5(15,1)↓ → L6(15,1)↕ → L7(15,1)↕ → L8(15,1)↑. L7 also has additional ladder_down cells in col 15 at (4,15),(8,15),(12,15), all leading to corresponding ladder_up cells in L8.

**L8 confirmed bottom level** — 6 ladder_up cells, zero ladder_down.

**69 total chests**; L8 alone has 32.

### Level 1
Entry level. Ladder_up (1,1), ladder_down (11,11). Dense false-wall corridors (16 false walls), eight doors, nine wind cells. Two fountains, two traps. One sign at (1,2). Seven chests. Col 15 and row 15 open (border cells accessible).
- Sign 1: "Beware the fires of hell!"

### Level 2
**Trapped door level.** Four doors, one adjacent trap (13,9). Nine false walls, three fountains. Main shaft: ladder_up (11,11), ladder_down (5,5). Two signs in a diamond around the ladder cluster at (11,10),(12,11). Six chests.
- Sign 2: "Trapped door!"

### Level 3
**Twisty maze.** Zero chests, zero traps, zero gremlins — pure navigation. Only four special cells: sign (4,5) + sign (5,4) flanking ladder_up (5,5); ladder_down (11,11). The entire level is a maze of walls and corridors with no reward or hazard.
- Sign 3: "Twisty maze!"

### Level 4
**Windy walk** — but notably has no wind cells (0x03). 12 chests throughout open corridors. Ladder_up (11,11), ladder_down (5,5). One trap (11,1). One sign (12,11). No false walls.
- Sign 4: "Windy walk!"

### Level 5
**Gremlin city** — 45 gremlins. Also 29 wind cells making navigation brutal. Eight false walls, two fountains, seven traps. Ladder_up (5,5), ladder_down (11,11) and secondary shaft ladder_down at (15,1). Two signs. Six chests.
- Sign 5: "Gremlin city!"

### Level 6
**Devil's den** — 23 traps with four wind cells. Four doors. Ladder_up (11,11), ladder_down (5,5), secondary shaft ladder_up_down at (15,1). Additional ladder_down at (1,13),(1,15). Four signs in two pairs around the trap layout. Six chests.
- Sign 6: "Devils den!"

### Level 7
**Trap gauntlet** — 68 traps covering almost the entire level. 13 sign cells scattered throughout, warning the player. Two ladder_up_down at (1,15),(15,1); ladder_up at (1,13),(5,5); ladder_down at (4,15),(8,15),(11,11),(12,15). No chests; one false wall.
- Sign 7: "Go back! Pits!"

### Level 8
**Chamber of fire** — payoff level. 32 chests (largest of any fire dungeon level). Six fountain cells, eight wind, six gremlins, two traps. Six ladder_up exits: (1,15),(4,15),(8,15),(11,11),(12,15),(15,1) — matching L7's descent points. Two marks (0x05) at (10,4),(14,5). Six doors, one false wall. Two signs.
- Sign 8: "Chamber of fire!"

---

## Dungeon of Mt. Drash — Level Summaries

**Open borders.** 99 total chests, predominantly on L8 (54).

**L7 is the most sign-dense level across all dungeons** — 30 sign cells and 10 ladder_up cells. Clue "Reach up!" matches perfectly: the entire level is a network of ladders flanked by warning signs.

**L8 reward vault** — 54 chests, 19 traps forming concentric rings around the chest clusters, 8 gremlins, 4 fountains, 1 mark.

### Level 1
Ladder_up (1,1), ladder_down (11,11). Heavy door maze (14 doors), 8 false walls, 1 fountain, 1 trap, 1 chest, 1 sign. Open, navigable corridors.
- Sign 1: "Welcome fools to your doom!!"

### Level 2
Dense door maze — 16 doors. 8 false walls, 4 chests, 1 trap, 1 sign. Ladder_up (11,11), ladder_down (5,5). No fountains or gremlins.
- Sign 2: "Secret corners!"

### Level 3
Mixed hazard level. 10 chests, 3 traps, 9 false walls, 2 doors. One `0x30` ladder_up_down at (5,5) — mid-shaft. Ladder_down at (11,11).
- Sign 3: "Traps & Treasure"

### Level 4
**Wind corridor** — 4 wind cells in a passage. 14 doors, 6 false walls. Two ladder_up at (5,5),(11,11), ladder_down at (7,7). No chests.
- Sign 4: "Beware the winds"

### Level 5
**Danger zone** — 15 traps, 12 gremlins, 8 wind cells in the right-side corridor. 4 signs clustered around the ladder cluster. One `0x30` at (7,7), ladder_down at (11,11). 2 fountains, 2 false walls.
- Sign 5: "Danger!"

### Level 6
**Ladder hub** — 10 ladder_down cells and 2 ladder_up; all leading to and from L5/L7. 12 chests arranged along corridors, 4 doors, 6 false walls, 4 signs.
- Sign 6: "Map well!!!"

### Level 7
**Sign and ladder maze** — 30 sign cells, 10 ladder_up, 8 traps, 1 ladder_down. The most sign-dense level of all processed dungeons. Signs surround every ladder_up in diamond clusters.
- Sign 7: "Reach up!"

### Level 8
**Chest vault** — 54 chests (highest in any single level across all dungeons). Concentric rings of 19 traps enclosing the chests. 8 gremlins, 4 fountains, 2 wind, 6 false walls, 4 signs, 1 mark. Ladder_up at (11,11). Zero ladder_down — confirmed bottom level.
- Sign 8: "Windy secret"

---

## Perinian Depths — Level Summaries

**Open borders.** 114 total chests.

**L4 is the most hazard-dense level across all processed dungeons** — 41 wind + 33 traps + 34 gremlins + 33 chests simultaneously, plus 16 signs and 4 ladder_up_down cells. Clue "Quarter each!" likely refers to the four quadrants of hazards.

**L6 has 85 wind cells** — the highest single-cell-type count seen in any level (excluding walls/floors).

**L7 has five `0x30` (ladder_up_down) cells** — most in any single level.

### Level 1
Entry level. Ladder_up (1,1), 2 ladder_down. 2 sign cells at (1,2),(2,1) — the standard entry cluster. 2 marks (0x05) at (11,15),(15,11). 3 fountains, 14 doors, 2 false walls, 4 chests.
- Sign 1: "Perinian depths"

### Level 2
Heavy door maze (17 doors). 5 fountains, 2 ladder_up, 1 ladder_down. 4 sign cells in a diamond around the central ladder cluster at (8,7)–(8,9). 1 chest.
- Sign 2: "Go back!"

### Level 3
**Chest level** — 24 chests, zero hazards, zero fountains. Perfect four-fold rotational symmetry. 4 sign cells, 4 ladder_down, 1 `0x30` at centre (8,8). Clue "Not here!" — all these chests are probably empty/misleading.
- Sign 3: "Not here!"

### Level 4
**Maximum hazard level** — 41 wind, 33 traps, 34 gremlins, 33 chests, 16 signs, 4 ladder_up, 4 ladder_down, 1 `0x30` at (5,5)/(11,5) area. Every cell type simultaneously present.
- Sign 4: "Quarter each!"

### Level 5
Symmetric structure. 12 chests, 4 doors, 4 ladder_up, 8 ladder_down, 1 `0x30`, 8 signs. No hazards.
- Sign 5: "Death awaits!"

### Level 6
**Wind maze** — 85 wind cells. 8 false walls, 8 doors, 8 ladder_up, 4 ladder_down, 1 `0x30`, 8 signs. No chests, no gremlins, no traps — pure wind and navigation.
- Sign 6: "Map well!"

### Level 7
**Gremlin treasure level** — 36 chests, 16 gremlins, 12 traps, 16 signs, five `0x30` ladder_up_down cells. Zero plain ladder_up or ladder_down — all vertical movement via bidirectional ladders.
- Sign 7: "Gremlins!"

### Level 8
**Bottom level** — 5 ladder_up, zero ladder_down confirmed. 2 marks, 20 false walls (labyrinth of secret passages), 16 traps, 4 wind, 2 fountains, 12 signs, 4 chests.
- Sign 8: "Go back!"

---

## Time of Darkness — Level Summaries

**Mostly solid borders** with some open border cells. 119 total chests. Contains the only known `0x01` byte (L8, position (1,1)) — see encoding table.

**L6 has 41 false_wall cells** — second-highest false wall density after dardin.ult L3.

**Multiple `0x30` cells per level** from L2 onwards, reflecting a complex multi-shaft vertical structure.

### Level 1
Entry level. Ladder_up (1,1), 2 ladder_down. 3 fountains, 2 doors, 6 false walls. 1 sign. No chests.
- Sign 1: "Time awaits!"

### Level 2
8 sign cells arranged around key features. 1 `0x30`, 1 ladder_up, 1 ladder_down. 8 gremlins, 1 trap, 1 mark, 10 chests, 12 doors.
- Sign 2: "Gremlin gold!"

### Level 3
**Golden chest level** — 34 chests. 8 wind, 4 signs, 1 `0x30`, 1 ladder_up, 2 ladder_down, 4 doors, 6 false walls.
- Sign 3: "Golden center!"

### Level 4
**Stair junction** — 2 `0x30` cells, 1 ladder_up, 1 ladder_down. 4 signs, 3 gremlins, 4 traps, 2 fountains, 8 doors, 4 false walls. The multiple bidirectional ladders suggest a multi-way junction between levels.
- Sign 4: "Stair to heaven!"

### Level 5
24 chests, 4 traps, 1 `0x30`, 2 ladder_up, 1 ladder_down, 2 signs. Clean layout, minimal hazards.
- Sign 5: "Time runs short!"

### Level 6
**False wall labyrinth** — 41 false walls. 1 `0x30`, 1 ladder_up, 1 ladder_down, 2 signs, 2 chests. Almost the entire navigable space is false walls — nothing is what it seems.
- Sign 6: "Long march!"

### Level 7
22 chests, 1 trap, 1 fountain, 6 doors, 2 false walls, 1 `0x30`, 1 ladder_up, 1 ladder_down, 4 signs.
- Sign 7: "Trap!"

### Level 8
**Bottom level** — 2 ladder_up, zero ladder_down confirmed. Unknown `0x01` at (1,1) — likely ladder_up variant (LOW confidence). 2 marks, 24 chests, 17 traps, 1 fountain, 4 false walls, 2 signs.
- Sign 8: "Very near now!"

---

## Files Processed

| File | Internal Name | Dungeon | Status |
|------|---------------|---------|--------|
| `dungeon-p.ult` | `p.ult` | Dungeon of the Snake | ✅ Complete — `dungeon-p.json`, PNG renders L1–L8 |
| `dungeon-mine.ult` | `mine.ult` | Mines of Morinia | ✅ Complete — `dungeon-mine.json` |
| `dungeon-dardin.ult` | `dardin.ult` | Dardin's Pit | ✅ Complete — `dungeon-dardin.json` |
| `dungeon-fire.ult` | `fire.ult` | Dungeon of Fire | ✅ Complete — `dungeon-fire.json` |
| `dungeon-m.ult` | `m.ult` | Dungeon of Mt. Drash | ✅ Complete — `dungeon-m.json` |
| `dungeon-perinian.ult` | `perinian.ult` | Perinian Depths | ✅ Complete — `dungeon-perinian.json` |
| `dungeon-time.ult` | `time.ult` | Time of Darkness | ✅ Complete — `dungeon-time.json` |

## Files Pending

All other dungeon `.ULT` files (a–o, excluding p) remain to be decoded.

---

## Correction Log

| Date | Correction |
|------|-----------|
| Post-render review | `0x08` and `0x20` byte meanings were swapped in original analysis. Corrected to: `0x08` = sign/message, `0x20` = ladder_down. Evidence: visual cross-reference of p.ult L1 PNG showed (1,2) and (2,1) as sign cells (not ladders), and (11,11) as ladder_down (not sign). Confirmed by: L4 having zero `0x08` cells matching wiki's "n/a" sign, and L8 having zero `0x20` cells matching its status as the bottom level. Applied to both dungeon-p.json and dungeon-mine.json. |
| Ladder clarification | `0x30` (`0x10 \| 0x20`) is a **ladder_up_down** (↕) — a cell that goes both up and down — not a combined ladder+sign as previously described. Renamed from `ladder_up_sign` to `ladder_up_down` throughout. Only present in mine.ult. |
| Mark identification | `0x05` was misidentified as "fountain_alt". Corrected to `mark` (collectible mark item). Evidence: p.ult L8 positions (15,6) and (15,15) confirmed as Mark of Snake and Mark of Kings by game; mine.ult L8 positions (9,3) and (15,13) are Mark of Fire and Mark of Kings. The ULT encodes only that a cell *is* a mark; the specific mark identity is engine-determined by position. |

---

## Verification Sources

- **Verified map image (Level 1):** Annotated map provided directly; all confirmed cell types match
- **StrategyWiki:** https://strategywiki.org/wiki/Ultima_III:_Exodus/Dungeon_of_the_Snake — confirmed chest counts (53 total / 21 L1), fountain subtypes per level, sign messages, gremlin/wind/trap locations, Mark locations
- **StrategyWiki:** https://strategywiki.org/wiki/Ultima_III:_Exodus/Mines_of_Morinia — confirmed L8 chest count (24), level summaries, gremlin/trap/wind distributions, Mark of Fire + Mark of Kings on L8, L2–L7 magic-only access
