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
- **Location and conflict move:**