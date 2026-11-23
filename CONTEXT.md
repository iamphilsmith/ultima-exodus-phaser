# Ultima Exodus: Context

A single-player RPG tribute to Ultima III: Exodus. The server owns the rules and
the saved state; the client draws and collects keys. Read this at the start of a
session. How to run things is in `README.md`.

## Status

The migration from the original Phaser/tRPC build is complete and the old stack is
removed (`legacy-stack-final` tag, if it is ever needed). Working end to end:
intro and main menu, party organisation (register, create, form, disperse,
terminate), the overworld with wrapping and fog of war, all 12 towns and castles,
and conflicts (two maps, no combat). Everything not yet built is under Deferred.

## How it works

- Every command (`move`, `interact`, `attack`) goes to the server, which loads the
  saved state, applies the rules, saves, and returns one full `GameStateSnapshot`.
  The client redraws from it. Roster commands return their status plus the full
  `RosterSnapshot`.
- An expected game outcome (roster full, blocked move) is a normal 200 with a
  status. Only malformed input is a 400.
- Map and tile data are fetched once and cached by the client; `GET api/tiles`
  carries the solid and vision-blocking rules. See `ARCHITECTURE.md` for the
  endpoint list and data model.

## Layout

```
server/
  UltimaExodus.Engine/        Rules, no dependency on the other projects
    Terrain, Maps, Locations, Heroes, Movement, Conflicts, State
  UltimaExodus.Data/          MapSourceLoader, MapSources/ (map JSON), EF Core
                              persistence and migrations; depends on Engine
  UltimaExodus.Api/           Endpoints (Program.cs), Contracts, GameService,
                              RosterService, DebugOptions; depends on both
  UltimaExodus.Engine.Tests/  xUnit; also in-memory SQLite tests that run the
                              real migrations
client/src/app/
  services/                   HTTP services (map, game, roster, tile catalogue,
                              hero options) and their snapshot types
  utils/api-base-url.ts       apiBaseUrl(), used by every service
  game-canvas/                Angular component that hosts Phaser and hands the
                              services to the scenes
  game/                       Scenes (intro, main menu, world, party organisation),
                              views (overworld, conflict, org/ screens), pure logic
                              (line of sight, tile lookup, form rules, log rows)
dotnet-tools.json             pins dotnet-ef (repo root)
```

## Conventions

- **Project references run one way:** `Engine <- Data <- Api`. A wrong-way reference
  fails at restore as a circular dependency, not a clear error.
- **Rules are pure and live in Engine**, with xUnit tests. Entities the rules need
  (`Hero`, `PartySlot`) are plain classes in Engine; the DbContext maps them with
  the fluent API, no EF attributes.
- **Tile rules live only on the server** (`TileCatalogue`); the client never
  hardcodes them. The Tiled `solid` properties in the map JSON are `false` on
  purpose and are ignored.
- **`GameService.CategoryFor` decides which kind of map the party is on.** A map id
  it does not know is treated as the overworld, so every new location or conflict
  map must be added to it.
- **One request in flight** on the client, shared by move, interact and attack;
  overlapping requests race on the saved row. Forms ignore keys while a request is
  pending.
- **Enums serialise as strings per enum** (an attribute), never with a global
  `JsonStringEnumConverter`: that would turn `MapData.category` into a string and
  break the client's numeric `MapCategory`.
- **Keep Phaser out of anything a spec imports**; Phaser touches the canvas on load.
  Pure logic sits in its own file (`shell-layout.ts` holds `tilePixel` for this
  reason), and a thin Phaser view draws it.
- **Phaser creates scenes, Angular does not**, so a scene cannot `inject()`.
  `GameCanvas` injects the services and passes them to