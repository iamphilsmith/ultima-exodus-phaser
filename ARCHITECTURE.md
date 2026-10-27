# Ultima Exodus — Architecture

> **Status: migration underway.** This document describes the target architecture
> for a rewrite from the old thick-client (Phaser + tRPC + SQLite) stack to
> a thin-client / server-authoritative stack, undertaken primarily as a vehicle
> to learn Angular and C#/.NET. 
> **Phases 0–4 (scaffolding, static map delivery — see "Map delivery" below —
> shell rendering, the overworld movement loop, and town/castle movement) are
> complete** and match what's described here; see "Persistence", "Game
> endpoints", "Locations" and "Example: full snapshot shape" below. Everything
> else on this page is not yet built.
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
Covers the overworld, town and castle tiles (Phase 4, step 23e): water and
mountains; building walls; signs, counters and bars; doors; and the NPC/creature
tiles baked into each map's tile layer (see `CONTEXT.md` for the tile roles).
**Conflict maps must be included in the same catalogue expansion pass** — not
treated as a later addition. Checked during Phase 4: the two conflict maps use
only tiles 0, 1, 2, 13, 20 and 24, all covered, so no extra entries were
needed. Tile solidity comes only from this catalogue, never from the Tiled
`solid` properties.

**Delivery — implemented (Phase 3, step 19a).** `GET api/tiles` returns
`{ default, overrides }`: the few tiles with special rules, keyed by tile
index, plus the default for every other tile. The client's
`TileCatalogueService` fetches it once and then looks tiles up synchronously
for fog of war. It is a separate endpoint rather than part of `MapData`
because every tile-based map shares the same 80-tile sheet, and no tile has
conflicting attributes across maps. Dungeons are not tile-based and don't use
the catalogue.

The endpoint will attempt to load a source file for any `MapCategory`
including `Conflict`, but conflict-map *sourcing/selection* (deciding which
map to serve for a given encounter) isn't implemented yet — that's
`ConflictMapSelector`'s job, still to come.

Conflict maps are the one category the client never requests by name up
front — the server selects the `MapId` when an encounter triggers and hands
it to the client inside the encounter snapshot.

---

## Persistence

**Status: implemented (Phase 3, step 14).** Mutable game state is stored with
EF Core and SQLite, in `UltimaExodus.Data/Persistence/`. Map data stays
file-backed and does not use the database.

- `GameState` holds the party's saved position (`TileX`, `TileY`, `MapId`).
  Single-player with no login means exactly one row, with a fixed `Id` of 1
  (the key is never database-generated).
- Migrations are applied at startup via `Database.Migrate()`. The `.db` file is
  gitignored.
- The **action log is not persisted.** It lives in memory on the server
  (`ActionLog`, a singleton capped at 50 entries), so it survives a page
  refresh but is cleared when the API restarts.
- While the party is inside a town or castle, `MapId`, `TileX` and `TileY` hold
  the position in that location (Phase 4), so a refresh resumes there. Leaving
  restores the overworld tile from `LocationCatalogue` (see "Locations"); no
  return position is stored.

---

## Game endpoints

**Status: implemented (Phase 3; generalised in Phase 4).** All three return a
full `GameStateSnapshot`.

```
POST api/move       body: { "direction": "North" | "South" | "East" | "West" }
POST api/interact   (no body; E)
GET  api/state      (no body; returns the current state without moving)
```

- The endpoints dispatch on the map the party is on (`GameService`), so the
  client never chooses a rule set. A map that is in `LocationCatalogue` is a
  town or castle; anything else is the overworld.
- **Overworld move:** `OverworldMovement` (`UltimaExodus.Engine/Movement/`) wraps
  at the map edges and blocks on solid tiles. **Location move:**
  `LocationMovement` does not wrap; stepping off any edge exits to the
  location's overworld tile. Both save the position, append a log line (`North`,
  `North BLK` when blocked, `Leaving...` on exit) and return the snapshot. A
  blocked move is a normal `200` response with the position unchanged.
- **Interact:** on an overworld tile that is a location entrance, enters it (spawn
  tile, enter message such as `Britain`); anywhere else logs `Nothing here`.
- `direction` is a string enum, applied to the `Direction` type only. A global
  string-enum converter would also change `MapData.category` from a number to
  a string.
- `GET api/state` creates the default save (tile (5,5) on `world-sosaria`) if
  none exists. It is safe to call repeatedly.
- The client keeps one request in flight at a time, since two overlapping calls
  would both read the same saved position.
- **Debug no-clip:** `OverworldMovement` and `LocationMovement` take an
  `ignoreSolid` flag (default false), set from `DebugOptions` (`Debug:NoClip`).
  It is only bound from configuration in Development, so production cannot
  enable it, and the pure engine never reads config. An edge exit is a rule, not
  collision, so no-clip does not stop it. Run with
  `dotnet run --launch-profile http-noclip`; changing it needs a restart.

---

## Locations

**Status: implemented (Phase 4).** `LocationCatalogue`
(`UltimaExodus.Engine/Locations/`) holds the 12 overworld entrances, each a
`LocationDef`: map id (the map file name, e.g. `town-devil-guard`), category,
the overworld map and tile that triggers entry, the spawn tile (towns (0,32),
castles (32,63)) and the enter message.

- `FindByWorldTile` answers E on the overworld; `FindByMapId` answers leaving.
  Each town or castle has exactly one overworld entrance, so the tile to return
  to is the entrance itself, and `GameState` needs no extra columns.
- The old client-side `SOSARIA_LOCATIONS` was not ported. Ambrosia shrines are
  still deferred; `LocationDef.WorldMapId` leaves room for them.
- The client draws every tile-based map with the same `OverworldView` viewport.
  For town and castle maps it does not wrap, hides out-of-bounds tiles and draws
  no fog (fog in towns is deferred).

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
    PartyPosition Position,
    List<LogEntry> Log,
    WorldClock Clock,
    List<MapEntity> Entities,
    List<EffectSequence> Effects,
    PartyStatus Party
);

public record PartyPosition(string MapId, MapCategory Category, int X, int Y); // Category is serialised as a number
public record LogEntry(string Text);
public record WorldClock(int Moon1Phase, int Moon2Phase, string Wind);
public record PartyStatus(List<PartyMemberStatus> Members);
```

**Status: implemented (Phase 3, steps 16 and 21; `Category` added in Phase 4).** Returned in full on every
action — no diffing on either side. For now: `Clock` is hardcoded to match the
old static display; `Party` is a hardcoded stub (four members, mirroring the
HUD) until Phase 5, and its interior shape may change then; `Entities` and
`Effects` are always empty until dynamic entities and combat exist. The
earlier design sketch used a `DungeonPosition` type here; the implemented
`PartyPosition` (map id, category and tile) covers the overworld, towns and
castles, and dungeon facing and level will be added when the dungeon phase is built.
---

## Resolved during Phase 0 / Phase 1 / Phase 2 / Phase 3

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
- **Movement rules location**: `OverworldMovement` (and, from Phase 4,
  `LocationMovement`) in `UltimaExodus.Engine/Movement/` is a pure function
  (map + position + compass `Direction` in, a result out) with no database, HTTP
  or logging. `GameService` orchestrates it. The
  client maps keys to compass directions (Up → North).
- **Tile attribute delivery**: a separate `GET api/tiles` endpoint, cached once
  by the client — see "Tile catalogue" above.
- **Action log storage**: held in server memory, not persisted — see
  "Persistence" above.
- **Snapshot position type**: `PartyPosition(MapId, Category, X, Y)`, not `DungeonPosition`.

## Resolved during Phase 4 (town / castle)

- **Endpoints dispatch on the current map.** `POST api/move`, `GET api/state`
  and `POST api/interact` replaced `api/overworld/move` and `api/overworld/state`
  (step 23b), avoiding a parallel endpoint set per map type in Phases 5-7. See
  "Game endpoints".
- **Locations live on the server** in `LocationCatalogue`; the return tile on
  exit is a reverse lookup, not stored state, so `GameState` needed no new
  columns. See "Locations".
- **Position inside a town is persisted** in the existing `GameState` row, so a
  refresh resumes in the town (the old build did not). Verified in the browser;
  it needed no client code beyond reading `category` from the snapshot (23c)
  and rebuilding the view on a map change (24a).
- **Movement rules:** `LocationMovement.TryMove` (non-wrapping; `Blocked` and
  `Exited` results) sits beside `OverworldMovement`, which is unchanged. The
  direction offsets are shared in `DirectionExtensions.ToOffset`.
- **Debug no-clip:** see "Game endpoints". Added to `OverworldMovement` in 23f
  and built into `LocationMovement` in 23g.
- **Collision data:** only the server `TileCatalogue`; the Tiled `solid`
  properties are all `false` on purpose and are never read by the new stack.
- **Client:** one viewport class (`OverworldView`, name kept) for every
  tile-based map. Its tile lookup (`wrap`, `lookupTile` in `game/map-tile.ts`)
  is Phaser-free and unit-tested. No-wrap mode and no fog are chosen from
  `map.category`.
- **Castle Exodus entry** stays at (32,63); checked in play.

## Open questions / not yet decided

- Effect-type vocabulary (see Combat section above)
- Whether hero/party state ownership questions from the old architecture
  (see `CONTEXT.md`) carry over in modified form once the server is fully
  authoritative
- Deployment topology: whether Angular `dist/` will be served by the .NET app
  (same origin, eliminating CORS in production) — deferred but acknowledged
  as an important distinction to settle before cutover
- Whether the action log should be persisted across API restarts (currently
  in-memory only)