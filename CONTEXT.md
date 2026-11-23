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
  `GameCanvas` injects the services and passes them to the scene constructors.
- **Angular 22 services** use `@Service()` and `inject()`, not constructor DI.
  Components can still use constructor injection.
- **Hero rules:** roster entries 1-20, name 1-12 characters, each stat 0-25 with a
  total of exactly 50, defaults 100 HP, 0 MP, 0 food, 0 gold, level 1. A terminated
  hero keeps its row (soft delete); always filter `!Terminated`.

## Behaviour worth knowing

- A new game starts at (43,20). A conflict starts the party at (5,6).
- A browser refresh always returns to the intro; `J` then resumes the saved
  position, inside a town or a conflict too.
- `J` is refused until a party exists (`Form a party first`).
- `GET api/state` creates the default save row on a fresh database. It is idempotent.
- The action log is in memory on the server, capped at 50 entries, and shown seven
  rows at a time. It survives a browser refresh but not a server restart.
- Moon phase and wind are hardcoded (`StubState` supplies the clock).
- Creature and NPC tiles are solid on every map, the overworld included.
- No-clip (`http-noclip` launch profile) makes solid tiles passable. It is read at
  startup in Development only, so changing it needs a restart.
- No-clip also makes creature tiles walkable inside a conflict, so bumping into them
  is covered by `GameServiceConflictTests`, not by the scripts.

## Environment

- **Migrations** apply automatically at startup. `dotnet-ef` is a local tool: run
  `dotnet tool restore` once per environment, then from `server/`:
  `dotnet ef migrations add <Name> --project UltimaExodus.Data --startup-project UltimaExodus.Api`
- **The database** is `UltimaExodus.Api/ultima-exodus.db`, resolved against the
  working directory, so run the API from inside `UltimaExodus.Api/`. EF puts SQLite
  in WAL mode, so `-wal` and `-shm` files appear beside it (all git-ignored).
- **Bundle budget:** the default Angular budget is too small for Phaser; it is 2 MB
  warning / 3 MB error in the production config. Only `ng build` enforces it.
- **Codespaces** (devcontainer: Node 24, Python 3.12, .NET 10, Angular CLI):
  - In dev mode the page is on `-4200` and the API on `-5223`. `apiBaseUrl()` swaps
    the port segment, because `localhost` in the browser means your own machine.
  - Forwarded ports default to Private, and a private port answers a cross-origin
    `fetch` with a sign-in redirect that shows up as a misleading CORS error. The
    devcontainer sets 5223 and 7107 to Public. Public means anyone with the URL can
    reach the API while the Codespace runs.
  - Play mode is single origin, so only the API port is involved.
  - The Git LFS pre-push hook fails if `git-lfs` is missing, though the repo uses no
    LFS: `sudo apt-get install -y git-lfs && git lfs install`.
- **HTTPS:** only needed if a browser forces it locally. Run
  `dotnet dev-certs https --trust`, then `dotnet run --launch-profile https`
  (https on 7107, http on 5223). Use the plain `http://localhost:5223` URL with curl.
- **Windows:** a stale `dotnet run` serves old code (a new route returns 404) and
  locks the database files. Stop the API (Ctrl+C or
  `Get-Process UltimaExodus.Api | Stop-Process`) before deleting the database.
  Close editor terminals that sit inside a folder before renaming it.
- **Running `dotnet` from the repo root** creates a stray `dotnet/runfile-discovery/`
  folder. Run it from inside `server/`.

## Gotchas

- **System.Text.Json is case-sensitive.** Tiled's lowercase property names bind to
  nothing without `PropertyNameCaseInsensitive = true`, silently: you get empty
  lists, not an exception.
- **`TileCatalogue` static fields initialise in written order:** `Blocking` must be
  declared above `Overrides`. `Enumerable.Range` takes a count, not an end value
  (37-57 is `Range(37, 21)`).
- **A minimal API handler parameter whose type is not registered is treated as the
  request body.** A GET taking an unregistered service fails with
  `Body was inferred...`. Register it: `builder.Services.AddScoped<RosterService>()`.
- **In-memory SQLite tests need one connection open for the test's life**, or the
  database vanishes. `Database.Migrate()` on it tests the real migrations.
- **Call `apiBaseUrl()` with the parentheses.** `${apiBaseUrl}` puts the function's
  source in the URL (symptoms: a 404, or `Unexpected token '<'` from an HTML reply).
  Specs should match the full URL, not `endsWith`.
- **A restarted Phaser scene is the same object**, with stale fields pointing at
  destroyed game objects. Reset them in `create()`. Textures are shared by the whole
  game, so scenes load them through `loadSpritesheetOnce`.
- **Add a view's key listener after its first `await`.** Otherwise the keypress that
  opened the screen is also handled by it (an `E` that opens Register would close it).
  Remove listeners in `teardown()` and make it safe to call twice. A `closed` flag
  stops a late response drawing onto a screen the player has left.
- **Don't name a scene field `input` or `game`:** `Phaser.Scene` already has both.
  The services are `inputService` and `gameService`.
- **Strict TypeScript:** `scene.input.keyboard` is nullable, and `update()` needs
  `override`. Class fields initialise before constructor parameter properties, so a
  field initialiser cannot read `this.someService`.
- **The charset has 128 glyphs and 38 characters fit between the borders.** Non-ASCII
  characters (an em dash) draw as the wrong glyph and longer lines run off the
  screen. The form specs assert every message is at most 38 characters.
- **Specs that mount `GameCanvas` or `App` mock Phaser by hand** (jsdom cannot run its
  canvas check): a full `vi.mock('phaser', ...)` with a self-referencing `default`,
  real classes for `Scene` and `Game`, and no spread inside the factory. Partial
  mocks via `importOriginal()` still crash. Copy the pattern in
  `game-canvas.spec.ts`. These specs also need `provideHttpClientTesting()`.
- **Client specs use Vitest matchers** (`toBe(true)`, not Jasmine's `toBeTrue()`).
  Plain `ng test` keeps watching; use `--watch=false`.
- **Newly created files may not be visible to the compiler until staged in git.**
  `git status` or `git add` forces a fresh read.
- **PowerShell:** `curl` is an alias for `Invoke-WebRequest` (use `curl.exe`, or
  `Invoke-RestMethod` for JSON; add `-SkipHttpErrorCheck` to read a 4xx on PS 7+).
  Don't name a helper `Move`, because aliases beat functions. A function returns
  everything it writes to the screen, so keep check helpers at the top level.

## Check scripts

Run against a live API; each script's header has the exact steps.

- `scripts/party-check.ps1`: the whole party lifecycle. Needs a fresh database.
- `scripts/parity-check.ps1`: walks into and out of all 12 locations. Needs
  `http-noclip`, with the party on the overworld.
- `scripts/conflict-check.ps1`: 35 checks across both overworld monsters. Needs
  `http-noclip`, with the party on the overworld.

Re-run `parity-check.ps1` after changing movement, locations or `GameService`,
since `GameService` builds every snapshot.

## Deferred

- Dynamic world clock: real moon phase and wind, replacing the hardcoded values.
- Full combat and the effect-sequencing vocabulary (`EffectSequence.Type`, see
  `ARCHITECTURE.md`). The conflict view is positions-only today.
- Moving monsters that chase the hero (which means revisiting the solidity of the
  creature tiles baked into conflict maps), and a monster starting a conflict when
  adjacent. Today only the player's `A` starts one.
- Terrain-based conflict map selection and the remaining conflict maps (sea, boat,
  terrain variants); the selector knows only `conflict-grass` and `conflict-shore`.
- A general command handler for keys that need no parameter, a direction or a hero
  number (`Z` for Zats, for example). `A` is wired on its own.
- Dungeon renderer: the raycasting calculation service and `DungeonView`
  (`docs/dungeon-view.md`).
- NPC dialogue, shops, interaction with chests, NPCs and signs, Ambrosia shrine
  coordinates.
- Lava damage (tile 33) and key/lock handling for the barred doors (tile 32).
- Hero inventory and equipment, magic points by class, race/class restrictions on
  starting stats, and saving hero changes made during play (damage, food, gold,
  experience). Starting HP, food and gold are 100 / 0 / 0, where the original game
  uses 150; change `HeroDefaults` when wanted.
- Avatar walking "bump" tween (cosmetic) and fog of war in towns and castles.
- A runtime no-clip toggle (a key plus a Development-only endpoint).

## Reference

- `README.md`: running and testing
- `ARCHITECTURE.md`: design, endpoints, data
- `docs/rendering-reference.md`: canvas, charset, tiles, fog of war
- `docs/dungeon-view.md`, `dungeon-cell-values.md`, `dungeon-render-old.md`: dungeon specs
- `assets/reference/`: original-game reference images, data and commentary
