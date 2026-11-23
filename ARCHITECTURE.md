# Ultima Exodus: Architecture

The server owns the rules and the saved state; the client draws and collects
keys. This document describes the design and how the parts fit. `CONTEXT.md` has
the conventions and gotchas; `README.md` has how to run it.

## Core interaction model

1. The client captures a discrete user action (move, attack, interact, menu submit).
2. It calls one server endpoint for that action.
3. The server validates and resolves the action against the authoritative state,
   persists any change, and returns a **full state snapshot** (not a diff).
4. The client plays any animation effects in the snapshot, then draws the
   resulting state.

One call, one response, per player action. There is no optimistic client-side
prediction, to avoid reconciliation complexity. The game runs locally most of the
time, so round-trip latency is not a design concern.

## Responsibility split

**Server-owned** (rules; needs a round trip):

- Movement validation and collision, on every map type
- Hero and party state, roster rules, creation and termination
- Conflict map selection: the inputs (party terrain, opponent type) are only known
  server-side when an encounter starts, so the server picks the map and sends its id
- The full action log, returned in its entirety each turn, so the server controls
  its content
- Planned: random encounters, combat resolution, shops and NPC outcomes, and the
  world clock (moon phase and wind; hardcoded for now)

**Client-owned** (pure UI, no round trip):

- Menu navigation and cursor position, and in-progress form input (only the
  submitted payload goes to the server)
- Rendering and animation: sprites, HUD, log panel display
- Fog of war: terrain blocking the view is part of the client's rendering
  algorithm, not persisted "explored" state
- Planned: dungeon raycasting. Static dungeon geometry is content, not state; the
  server sends position and facing and the client renders from cached map data.

**Screens are Phaser scenes**, not Angular components: everything, including text
and menus, is drawn inside the canvas. Angular supplies the services, which
`GameCanvas` passes to the scenes. Each interactive screen is a pure, unit-tested
class (steps, key handling, messages, validation) plus a thin Phaser view that
draws it and calls the server.

**Session model:** single-player and local-first, with no login. A page load always
starts at the intro scene (it is registered first); saved state decides where
Journey Onward goes.

**Failed and rejected actions:** a game-legal but blocked action (walking into a
wall, "roster is full") is a normal `200` carrying an in-fiction outcome, such as an
unchanged position plus a log line, or a status. Only a malformed request, which a
correct client never sends, is a `400`.

## Hosting

In production, the .NET app serves the built Angular client itself, from
`wwwroot`, so the page and the API share one origin and no CORS is involved.
`ng build` writes straight into `server/UltimaExodus.Api/wwwroot`, and the API
runs under the `play` launch profile (Production). There is no SPA fallback, since
the client has no routes, so an unknown `/api/...` path is a real 404.

In development, `ng serve` (port 4200) calls the API (port 5223) cross-origin. The
CORS policy and OpenAPI document exist only in the Development environment, and
`apiBaseUrl()` returns the API origin only when `isDevMode()` is true; in a
production build it returns an empty string.

## Map delivery

Static map geometry and dynamic map contents have different lifetimes and travel
differently.

- **Static geometry** is fetched once per `(category, mapId)` and cached by the
  client in memory for the session. Maps are Tiled JSON read from
  `UltimaExodus.Data/MapSources/`; the database holds no map data.
- **Dynamic entities** (monsters, whirlpools, NPCs) change every turn, so they
  travel in the per-action snapshot. Entities carry a stable `Id` per spawn so the
  client can tell "this monster moved" from "a new one appeared" and so effects can
  reference one. `MapEntity` is defined but nothing populates it yet: NPCs and
  creatures are currently baked into each map's tile layer as ordinary tiles.

```csharp
public enum MapCategory { World, Town, Castle, Dungeon, Conflict }

public record MapData(
    string MapId,
    MapCategory Category,
    int Width,
    int Height,
    int[] Tiles   // Row-major, 0-based tile indices. Tiled numbers tiles from 1;
                  // MapSourceLoader subtracts 1 so the client never sees that.
                  // Solid and vision-blocking are NOT baked in; they come from
                  // the tile catalogue.
);

public record MapEntity(string Id, string Type, int X, int Y);
```

```
GET api/maps/{category}/{mapId} -> MapData     (400 unknown category, 404 no such map)
```

Conflict maps are the one category the client never requests by name up front: the
server selects the `MapId` and hands it over in the snapshot's `Position.MapId`.

### Tile catalogue

`TileCatalogue` (`UltimaExodus.Engine/Terrain/`) maps a raw tile index to two
properties:

- **Solid** blocks movement. The server is the sole authority on movement.
- **VisionBlocking** blocks the fog-of-war ray. Needed client-side, since the
  vision algorithm runs per frame and cannot afford a round trip.

A tile index not listed is non-solid and non-vision-blocking. The catalogue covers
overworld, town, castle and conflict tiles (the tile roles are in
`docs/rendering-reference.md`). Solidity comes only from here, never from the Tiled
`solid` properties, which are all `false` on purpose.

`GET api/tiles` returns `{ default, overrides }`: the few tiles with special rules,
keyed by index, plus the default for the rest. The client's `TileCatalogueService`
fetches it once and looks tiles up synchronously. It is a separate endpoint
because every tile-based map shares the same 80-tile sheet and no tile has
conflicting attributes across maps. Dungeons are not tile-based and do not use it.

## Persistence

Mutable state is stored with EF Core and SQLite in `UltimaExodus.Data/Persistence/`.
Migrations are applied at startup with `Database.Migrate()`; the `.db` file is
git-ignored.

- **`GameState`** holds the party's saved position (`TileX`, `TileY`, `MapId`). It
  is single-player with no login, so there is exactly one row, with a fixed `Id` of 1.
  Inside a town or castle these fields hold the position in that location, so a
  refresh resumes there. Leaving restores the overworld tile from
  `LocationCatalogue`; no return position is stored, because each location has
  exactly one entrance.
- **Conflicts** use nullable `ReturnMapId`, `ReturnTileX` and `ReturnTileY`, set
  together on entry and cleared on exit. A conflict can start from any overworld
  tile, so unlike a town its return position cannot be looked up from the map id.
- **`Heroes` and `PartySlots`.** `Hero` and `PartySlot` are plain classes in
  `UltimaExodus.Engine/Heroes/`, because the rules need them and Engine cannot
  reference Data; the DbContext maps them with the fluent API and stores enums as
  text. A terminated hero is soft-deleted: the row stays with `Terminated` set. A
  unique index on `Heroes.RosterEntry`, filtered to `Terminated = 0`, allows one
  active hero per entry while letting the entry be reused. A unique index on
  `PartySlots.HeroId` keeps a hero out of two positions; the slot index (0-3) is
  the key. The database enforces these as well as the rules, so a bug cannot store
  a bad state.
- **The action log is not persisted.** `ActionLog` is a server-side singleton
  capped at 50 entries, so it survives a page refresh but not an API restart.

## Game endpoints

All four return a full `GameStateSnapshot`.

```
POST api/move       { "direction": "North" | "South" | "East" | "West" }
POST api/interact   (no body; the E key)
POST api/attack     { "direction": "North" | "South" | "East" | "West" }
GET  api/state      (no body; the current state, without moving)
```

The endpoints dispatch on the map the party is on (`GameService.CategoryFor`), so
the client never picks a rule set: a conflict map id is a conflict, a map in
`LocationCatalogue` is a town or castle, anything else is the overworld.

- **Overworld move:** `OverworldMovement` (`UltimaExodus.Engine/Movement/`) wraps at
  the edges and blocks on solid tiles.
- **Location and conflict move:** `LocationMovement` does not wrap; solid tiles
  block, and stepping off any edge exits. All movement rules are pure functions
  (map, position and a compass `Direction` in, a result out) with no database,
  HTTP or logging; `GameService` orchestrates them. The client maps keys to
  directions (Up is North).
- **Log lines:** the direction (`North`), `North BLK` when blocked, `Leaving...` on
  exit, `Nothing here` for E with nothing to do.
- **Interact:** on an overworld location entrance, enters it (spawn tile and enter
  message, such as `Britain`).
- **Attack:** on the overworld, `AttackResolver` looks at the tile next to the party
  in the given direction, wrapping at the edges. A monster tile (`MonsterCatalogue`)
  saves the return position, switches `MapId` to the map from `ConflictMapSelector`,
  places the party at `ConflictDefaults` (5,6) and logs `Conflict`. Anything else,
  including attacking inside a town or conflict, logs `Nothing to attack`. An
  undefined direction is a `400`. Leaving a conflict restores the saved position and
  clears the return columns; if it is missing the party goes to the default start
  rather than being stranded.
- **`direction` is a string enum, applied to the `Direction` type only.** A global
  string-enum converter would also turn `MapData.category` into a string.
- **`GET api/state`** creates the default save (tile (43,20) on `world-sosaria`) if
  none exists. It is safe to call repeatedly.
- **One request in flight.** The client sends one at a time, since two overlapping
  calls would read the same saved position.
- **Debug no-clip:** `OverworldMovement` and `LocationMovement` take an
  `ignoreSolid` flag, set from `DebugOptions` (`Debug:NoClip`). It is bound from
  configuration in Development only, so production cannot enable it, and the pure
  engine never reads config. An edge exit is a rule, not collision, so no-clip does
  not stop it. Run it with `dotnet run --launch-profile http-noclip`; changing it
  needs a restart.

## Locations

`LocationCatalogue` (`UltimaExodus.Engine/Locations/`) holds the 12 overworld
entrances. Each `LocationDef` has the map id (the file name, such as
`town-devil-guard`), the category, the overworld map and tile that triggers entry,
the spawn tile (towns (0,32), castles (32,63)) and the enter message.

- `FindByWorldTile` answers E on the overworld; `FindByMapId` answers leaving.
- Ambrosia shrines are not placed yet; `LocationDef.WorldMapId` leaves room.
- The client draws every tile-based map with the same viewport class
  (`OverworldView`). For towns, castles and conflicts it does not wrap, hides
  out-of-bounds tiles and draws no fog.

## Party organization

The pre-game screens (register, create character, form party, disperse, terminate)
have their own endpoints. Hero and party state is **server-owned**: the client
keeps only the menu cursor and half-typed input and sends the final payload.

```
GET  api/hero-options      races, classes, sexes (name + initial) and the limits
GET  api/roster            RosterSnapshot
POST api/roster/create     CreateHeroRequest  -> { status: Created | RosterFull, entry, roster }
POST api/roster/terminate  { entry }          -> { status: Terminated | Empty | InParty, roster }
POST api/party/form        { entries }        -> { status: Formed | AlreadyFormed | Duplicate | EmptyEntry, roster }
POST api/party/disperse    (no body)          -> RosterSnapshot
```

```csharp
public record RosterSnapshot(List<RosterEntrySnapshot> Entries, bool PartyFormed);
public record RosterEntrySnapshot(int Entry, RosterHeroSnapshot? Hero, int? PartyPosition);
public record RosterHeroSnapshot(string Name, string Initials, int Level);
```

- **Always 20 entries**, empty ones with a null `Hero`, so a screen draws its rows
  straight from the list. `Entry` is 1-20 and `PartyPosition` is 1-4. `Initials`
  (`MHF` = male human fighter) is computed on the server (`HeroInitials`).
- **Every command returns its status and the full updated roster**: no refetch, no
  diffing.
- **Rules are plain C# in Engine** (`UltimaExodus.Engine/Heroes/`):
  `CreationRules.Validate` (name 1-12 characters, each stat 0-25, total exactly 50),
  `Roster.NextFreeEntry`, `Roster.CheckTerminate`, `PartyRules.CheckForm` (checks in
  order: party already formed, wrong shape, duplicates, empty entries).
  `RosterService` loads rows, asks the rules, saves; the roster snapshot is built by
  the pure `RosterSnapshotBuilder`. The client mirrors only the messages, using
  limits from `GET api/hero-options`, the single source for the lists and limits.
- **Terminated heroes count as absent** everywhere: not in the roster, not formable
  into a party, and their entry is free. A party member cannot be terminated;
  disperse first.
- **Creation defaults** come from `HeroDefaults`: 100 hit points, 0 magic points,
  0 food, 0 gold, level 1, status good.
- **The main menu** gates Journey Onward on `partyFormed`, read from `GET api/roster`
  when `J` is pressed. Register and Organise are never gated.

## Conflict map selection

A static lookup: **party surface × opponent movement type**, with land-versus-land
further keyed by the terrain tile the party stands on.

| Party | Opponent | Map |
|---|---|---|
| Boat | Sea creature | `conflict-sea` |
| Boat | Land monster | `conflict-boat-land` |
| Boat | Pirate | `conflict-boat` |
| Land | Sea creature | `conflict-land-sea` |
| Land | Pirate | `conflict-land-boat` |
| Land | Land monster | `conflict-grass`, `-shrub`, `-forest` or `-pavement`, by current tile |

`OpponentMovement` (Land, Sea, Pirate) is a static property of each monster's data
entry; Pirate is a single monster hardcoded to that category.

**Built so far**, in `UltimaExodus.Engine/Conflicts/`: `ConflictMapSelector.Select(
PartySurface, OpponentMovement)` returns a map id or `null` (the endpoint logs a
message rather than throwing), and `IsConflictMap(mapId)`. Only `conflict-grass`
(Land × Land) and `conflict-shore` (Land × Sea; the table's `conflict-land-sea`)
exist as map files; every other combination returns null, and terrain-based
selection is not built. The party surface is hardcoded to Land until boats exist.

- `MonsterCatalogue` maps a monster tile to its `OpponentMovement`: tile 24 is a
  land monster, tile 13 a sea creature. This is a lookup by tile because monsters
  are baked into the overworld tile layer; it is replaced when monsters become
  dynamic.
- Both maps are 11 × 11 with the party figures (tile 20) in the bottom rows and the
  monsters (tile 24 or 13) in the top rows, as solid tiles. `Entities` stays empty.
- **Client:** `ConflictView` draws the fixed 11 × 11 grid once and moves only the
  avatar; `OverworldView` scrolls. Both implement `MapView`, and `WorldScene` picks
  one from `map.category`. The attack prompt is the pure `PendingAttack` class: `A`
  starts it, the next arrow key attacks instead of moving, and Esc cancels.
  `Direction?` and `Attack cancelled` are client-only log lines, shown after the
  server's log until the next snapshot.

## Combat and effect sequencing (planned)

Combat responses, and any other multi-step visual outcome such as a ranged attack,
are modelled as a **final state plus an ordered list of effects** to animate before
the client settles on that state. The server never describes *how* to animate
something, only *what happened*; the client turns each effect into sprites and
tweens.

```csharp
public record EffectSequence(
    string Type,       // "SpellHit", "ArrowFly", "MonsterDeath": fixed vocabulary, TBD
    string SourceId,
    string? TargetId,  // matches a MapEntity.Id
    int DelayMs
);
```

## The snapshot

```csharp
public record GameStateSnapshot(
    PartyPosition Position,
    List<LogEntry> Log,
    WorldClock Clock,
    List<MapEntity> Entities,
    List<EffectSequence> Effects,
    PartyStatus Party
);

public record PartyPosition(string MapId, MapCategory Category, int X, int Y); // Category serialises as a number
public record LogEntry(string Text);
public record WorldClock(int Moon1Phase, int Moon2Phase, string Wind);
public record PartyStatus(List<PartyMemberStatus> Members);
public record PartyMemberStatus(int Slot, string Name, string Condition, string Type,
                                int Magic, int Level, int Hits, int Food);
```

Returned in full on every action. Today `Clock` is hardcoded; `Party` is built from
the saved party (one member per slot in party order, `Slot` 1-4, `Type` the
sex/race/class initials, `Condition` one letter from the hero's status) and is empty
until a party is formed; `Entities` and `Effects` are always empty. Dungeon facing
and level will extend `PartyPosition` when dungeons are built.

## Open questions

- The effect-type vocabulary needs designing before combat is built, not
  discovered during it.
