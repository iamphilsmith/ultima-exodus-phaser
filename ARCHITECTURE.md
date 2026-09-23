# Ultima Exodus — Architecture

> **Status: migration underway.** This document describes the target architecture
> for a rewrite from the old thick-client (Phaser + tRPC + SQLite) stack to
> a thin-client / server-authoritative stack, undertaken primarily as a vehicle
> to learn Angular and C#/.NET. **Phase 0 (scaffolding) and Phase 1 (static map
> delivery — see "Map delivery" below), and Phase 2 (shell rendering parity) are
> complete** and match what's described here; everything else on this page is 
> still target design, not yet built.
> See `CONTEXT.md` for full current implementation state and `MIGRATION_PLAN.md`
> for build sequencing. Sections below are updated as each part is actually built.

---

## Why this shift

The old architecture (documented in `CONTEXT.md`) is thick-client: all game
logic runs in Phaser, the server is a dumb persistence layer. That was a
reasonable starting point, but the project's purpose is to learn interesting
technology, not just to finish a game. The new direction:

- **Angular** front end hosting Phaser for rendering
- **C#/.NET** back end owning game rules and persistence
- Client sends a **user action**, server returns **complete new state**, client renders

This is a genuine architectural inversion, not a reskin — most of the *rendering*
code (map decoding, charset rendering, dungeon raycasting math) carries over
largely unchanged, but the *rules* layer (movement validation, encounters,
combat, leveling) is being rewritten in C#, not ported line-by-line.

---

## Core interaction model

1. Client captures a discrete user action (move, attack, interact, menu submit).
2. Client calls one server endpoint for that action.
3. Server validates and resolves the action against authoritative game state,
   persists any changes, and returns a **full state snapshot** (not a diff).
4. Client plays any animation effects in the snapshot, then renders the
   resulting state.

One call, one response, per player action. No optimistic client-side prediction —
deliberately, to avoid the reconciliation complexity that comes with it. This
project is expected to run locally most of the time, so round-trip latency is
not a concern worth designing around.

---

## Client / server responsibility split

### Server-owned (rules, requires a round trip)

- Movement validation & collision (overworld, town, castle, dungeon)
- Random encounters (RNG and encounter tables)
- Combat resolution (turn order, hit/damage/spell math, XP, leveling)
- Shop transactions, NPC dialogue outcomes (price, inventory, gold, quest flags)
- World clock (moon phase, wind direction) — server ticks and owns this; client
  only ever displays what it's told
- Conflict map selection (see below) — a static lookup, but the inputs
  (party terrain, opponent type) are only known server-side at the moment of
  an encounter, so the server picks the map and hands the client its ID
- The full action log — returned in its entirety each turn, so the server has
  complete control over its content (this replaces the client-side log buffer
  in the old implementation)

### Client-owned (pure UI/rendering, no round trip)

- Menu navigation and cursor position (pre-game party management screens)
- In-progress form input (typing a hero name) — only the final submitted
  payload goes to the server, not each keystroke
- Rendering and animation: sprites, camera, HUD, log panel display
- Dungeon raycasting — static dungeon geometry is content, not state; the
  server sends party position + facing, the client combines that with cached
  map data to render the view (see "Map delivery" below)
- Fog-of-war style occlusion — terrain (mountains, walls, thick forest)
  blocking view is implemented as part of the client rendering algorithm, not
  as persisted "explored tiles" state

### Session model

Single-player, local-first. No login. Game state is available whenever the
app is started; the only fixed rule is that the first access in a session
always routes to the intro screen.

### Failed / rejected actions

There is no distinct error response for a game-legal-but-blocked action (e.g.
walking into a wall). These are valid actions with an in-fiction outcome
(unchanged position + a log entry), not application errors, so they return
the same snapshot shape as any successful action.

---

## Map delivery

**Status: implemented (Phase 1).** Static map geometry (tiles) and dynamic map
contents (monsters, whirlpools, NPCs) have different lifetimes and are
delivered differently.

- **Static geometry** — fetched once per `(category, mapId)` via a map
  endpoint, cached client-side for the session (in-memory; no need for
  persistent browser storage given local-first usage). The endpoint accepts
  any `MapCategory`, including `Conflict`.
- **Dynamic entities** — monster/whirlpool/NPC positions change every turn,
  so they travel in the per-action state snapshot, not the map payload.
  Entities carry a stable `Id` per spawn so the client can distinguish "this
  monster moved" from "a new one appeared," and so combat effects can
  reference a specific entity by ID. `MapEntity` is defined but not yet
  populated by anything — that starts once dynamic entities appear in a
  later phase.

```csharp
public enum MapCategory { World, Town, Castle, Dungeon, Conflict }

public record MapData(
    string MapId,
    MapCategory Category,
    int Width,
    int Height,
    int[] Tiles   // Raw tile indices, 0-based (Tiled's 1-based index minus 1,
                  // converted server-side by the loader — the client never
                  // handles Tiled's numbering). Walkable/solid and vision-
                  // blocking are NOT baked in here; they're looked up per-tile
                  // via the shared tile catalogue below.
);

public record MapEntity(
    string Id,
    string Type,   // "Monster:Orc", "Whirlpool", "NPC:Guard"
    int X,
    int Y
);
```

```
GET api/maps/{category}/{mapId} -> MapData
```

### Tile catalogue

A static lookup (`TileCatalogue` in `UltimaExodus.Engine/Terrain/`) maps a raw
tile index to two properties:

- **Solid** — blocks movement. The server remains sole authority on movement
  validation regardless of what the client believes; this property is sent to
  the client mainly for future UX polish (e.g. pre-emptively greying out an
  invalid direction before a round trip).
- **VisionBlocking** — blocks fog-of-war raycasting. Required client-side,
  since the vision algorithm runs per-frame locally and can't afford a round
  trip per glance.

Any tile index not explicitly listed defaults to non-solid, non-vision-blocking.
Currently scoped to overworld tiles only. **When expanded to cover
town/castle/dungeon, conflict maps must be included in the same catalogue
expansion pass** — not treated as a later addition — since conflict encounters
will need the same walkability/vision data once combat is implemented.

The endpoint will attempt to load a source file for any `MapCategory`
including `Conflict`, but conflict-map *sourcing/selection* (deciding which
map to serve for a given encounter) isn't implemented yet — that's
`ConflictMapSelector`'s job, still to come.

Conflict maps are the one category the client never requests by name up
front — the server selects the `MapId` when an encounter triggers and hands
it to the client inside the encounter snapshot.

---

## Conflict map selection

Static lookup: **party surface type × opponent movement type**, with land-vs-land
opponents further keyed by the specific terrain tile the party is standing on.

| Party | Opponent | Map |
|---|---|---|
| Boat | Sea creature | `conflict-sea` |
| Boat | Land monster | `conflict-boat-land` |
| Boat | Pirate | `conflict-boat` |
| Land | Sea creature | `conflict-land-sea` |
| Land | Pirate | `conflict-land-boat` |
| Land | Land monster | one of `conflict-grass` / `conflict-shrub` / `conflict-forest` / `conflict-pavement`, by current tile |

`OpponentMovement` (Land / Sea / Pirate) is a static property on each
monster's data entry — Pirate is currently a single monster hardcoded to that
category, not a broader "human/boat" class. Revisit if more boat-based
opponents are added later.

```csharp
public enum PartySurface { Land, Boat }
public enum OpponentMovement { Land, Sea, Pirate }
public enum LandTerrainType { Grass, Shrub, Forest, Pavement }

public static class ConflictMapSelector
{
    public static string Select(PartySurface party, OpponentMovement opponent, LandTerrainType? landTerrain = null)
        => (party, opponent) switch
        {
            (PartySurface.Boat, OpponentMovement.Sea)    => "conflict-sea",
            (PartySurface.Boat, OpponentMovement.Land)   => "conflict-boat-land",
            (PartySurface.Boat, OpponentMovement.Pirate) => "conflict-boat",
            (PartySurface.Land, OpponentMovement.Sea)    => "conflict-land-sea",
            (PartySurface.Land, OpponentMovement.Pirate) => "conflict-land-boat",
            (PartySurface.Land, OpponentMovement.Land)   => landTerrain switch
            {
                LandTerrainType.Grass    => "conflict-grass",
                LandTerrainType.Shrub    => "conflict-shrub",
                LandTerrainType.Forest   => "conflict-forest",
                LandTerrainType.Pavement => "conflict-pavement",
                _ => throw new ArgumentException("Land terrain required when party and opponent are both land-based")
            },
            _ => throw new ArgumentException($"No conflict map for {party}/{opponent}")
        };
}
```

**Not yet implemented** — this class doesn't exist in the codebase yet; it's
target design, slotted for Phase 7 per `MIGRATION_PLAN.md`.

---

## Combat & effect sequencing

Combat responses (and any other multi-step visual outcome, e.g. a ranged
attack) are modeled as a **final state plus an ordered list of effects** to
animate through before the client settles on that state. The server never
describes *how* to animate something — only *what happened* — the client owns
interpreting each effect into sprites/tweens.

```csharp
public record EffectSequence(
    string Type,       // "SpellHit", "ArrowFly", "MonsterDeath" — fixed vocabulary, TBD
    string SourceId,
    string? TargetId,  // matches a MapEntity.Id
    int DelayMs
);
```

**Open TODO:** the fixed effect-type vocabulary needs to be designed before
combat implementation begins, not discovered incrementally during it.

---

## Example: full snapshot shape

```csharp
public record GameStateSnapshot(
    DungeonPosition Position,
    List<LogEntry> Log,
    WorldClock Clock,
    List<MapEntity> Entities,
    List<EffectSequence> Effects,
    PartyStatus Party
);
```

Returned in full on every action — no diffing on either side. Not yet
implemented — this is Phase 3+ territory per `MIGRATION_PLAN.md`.

---

## Resolved during Phase 0 / Phase 1 / Phase 2

- **C# solution/project layout**: `UltimaExodus.Engine` (domain logic, no
  dependencies on the other two), `UltimaExodus.Data` (data loading —
  depends on `Engine`), `UltimaExodus.Api` (HTTP endpoints — depends on
  both). See `CONTEXT.md` for full current-state detail.
- **Angular ↔ Phaser mounting pattern**: resolved in Phase 0 — Phaser mounts
  inside an Angular component (`GameCanvas`) at the game's native 320×192
  internal resolution, 3x zoom.
- **Shell rendering location**: layout constants live in
  `client-angular/src/app/game/shell-layout.ts`, the `writeText`/`charFrame`
  helper in `game/bitmap-text.ts`, and the ported `drawBorder`/`drawMoonPhase`/
  `drawWindDirection`/`drawPartyPanel`/`drawLogPanel` methods on
  `game/world-scene.ts`'s `WorldScene` class — same shape as the old
  inline-on-`WorldScene.ts` layout, just split into smaller files.

## Open questions / not yet decided

- Effect-type vocabulary (see Combat section above)
- Whether hero/party state ownership questions from the old architecture
  (see `CONTEXT.md`) carry over in modified form once the server is fully
  authoritative
- Deployment topology: whether Angular `dist/` will be served by the .NET app
  (same origin, eliminating CORS in production) — deferred but acknowledged
  as an important distinction to settle before cutover
