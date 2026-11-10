# Migration Plan — Angular + Phaser + C#

> Companion to `ARCHITECTURE.md` (target design) and `CONTEXT.md` (current
> implementation). This document sequences the migration itself: one commit
> per step, ordered so the app is always in a coherent, buildable state.
>
> **Note on step numbering:** Phase 1 below was revised after implementation
> to match what was actually built (see the note at the start of that phase).
> This shifted every step number from Phase 2 onward by +3 relative to the
> original plan — if an older note or commit message references a step
> number from Phase 2 onward, it may be off by 3 versus the numbering here.
> Phase 3 adds a sub-step, 19a, rather than renumbering. Phase 4 does the same
> with lettered sub-steps (23a-23h, 24a-24d); steps 25 onward keep their numbers.
> Phase 5 does it too (26a-26b, 27a-27f, 28a-28c, 31a); steps 29, 30, 31 and 32
> keep theirs.
> Phase 6 does it too (33a-33g); steps 34 onward keep their numbers.

---

## Ground rules

- **Parity before features.** Every step below replicates something that
  already works in the old Vite/Phaser/tRPC/Express stack. Nothing new
  (dynamic world clock, real combat resolution, dungeon rendering, NPC
  dialogue) is in scope until the "Cutover" phase is reached — see
  "Explicitly deferred" at the bottom.
- **One step = one commit.** Each step below is sized to be a single,
  reviewable commit with a clear before/after.
- **The old stack keeps running untouched until cutover.** Build the new
  Angular/C# stack alongside the current one (`client-angular/` and
  `server-dotnet/` as new top-level folders) rather than modifying the
  old `src/`/`server/` in place. This gives a working reference to
  compare against at every step, and a fallback if something stalls.
- **Order follows player-encounter order**, same principle as the original
  build: intro → menu → party org → overworld → town → conflict stub. This
  mirrors how `CONTEXT.md` describes the original build sequence.
- **Verify, don't assume, at each phase boundary.** The "Confirm parity"
  steps are checkpoints — if the new stack doesn't match old-stack behaviour,
  fix it there rather than carrying the discrepancy into the next phase.

---

## Phase 0 — Scaffolding ✅ complete

Goal: both new stacks exist and can talk to each other. No game logic yet.

1. **Scaffold C# solution** — `UltimaExodus.sln` with three projects:
   `UltimaExodus.Api` (ASP.NET Core Web API), `UltimaExodus.Engine` (class
   library, game rules), `UltimaExodus.Data` (data loading/persistence). No
   implementation yet, just structure and that it builds.
2. **Add a health-check endpoint** — `GET /api/health` returning a static
   payload. Confirms the API runs standalone.
3. **Scaffold Angular workspace** — new Angular project in
   `client-angular/`, default template, confirms `ng serve` runs.
4. **Wire Angular → API** — Angular `HttpClient` call to `/api/health`,
   displayed on screen. Confirms the two processes can talk (CORS, ports;
   see `CONTEXT.md` for the Codespaces-specific gotchas hit here).
5. **Mount empty Phaser instance inside Angular** — one Angular component
   hosting a blank Phaser game at the correct internal resolution
   (320×192, 3x zoom). No sprites yet — just confirms the mounting pattern
   works before any rendering logic goes in it.

---

## Phase 1 — Static map delivery ✅ complete

Goal: the map endpoint from `ARCHITECTURE.md` exists and Angular can fetch
from it. Still nothing rendered.

> **Revised from the original plan.** The original step 6 here called for a
> persistence layer (EF Core + SQLite) at the very start of this phase. That
> turned out to be unnecessary: map data is static, file-backed content
> (Tiled JSON read fresh per request), not mutable game state — it doesn't
> need a database. A real persistence layer is still needed, but not until
> mutable state (hero position) shows up in Phase 3 (`GameState` entity,
> step 14 below). The steps below describe what was actually built instead,
> at finer granularity than originally planned.

6. **Add shared tile catalogue** — `TileProperties`/`TileCatalogue` in
   `UltimaExodus.Engine/Terrain/`. Scoped to overworld tiles only (solid,
   vision-blocking); conflict-map tiles deferred to a future catalogue
   expansion — see `ARCHITECTURE.md`.
7. **Add `MapCategory`/`MapData`/`MapEntity` records** — per
   `ARCHITECTURE.md`, in `UltimaExodus.Engine/Maps/`.
8. **Add map source loader** — `MapSourceLoader` in
   `UltimaExodus.Data/Maps/`, reading Tiled JSON from a `MapSources/`
   folder and converting `tile.index - 1` server-side, so the client never
   handles Tiled's 1-based tile numbering.
9. **Add map retrieval endpoint** — `GET api/maps/{category}/{mapId}`.
   Built overworld-first, then generalized to every `MapCategory` once
   proven out on a second map type (a town map).
10. **Add Angular `MapService`** — fetch-and-cache service with an
    in-flight-request guard, preventing duplicate fetches when the same
    uncached map is requested concurrently (a real race condition found
    and fixed during verification, not just a caching nicety).
11. **Confirm round trip** — `MapService.getMap()` wired into `App`,
    verified via the Network tab that both caching and the in-flight guard
    work as intended, across two map categories (world + town).

---

## Phase 2 — Shell rendering parity ✅ complete

Goal: the permanent HUD chrome (border, panels, log) renders identically to
the old build, entirely client-side — this is pure rendering, so it should
port almost unchanged from the old `GameHUD`.

> **Revised from the original plan.** Step 12 was built as five smaller
> commits rather than one, at finer granularity than originally planned —
> see `CONTEXT.md`'s "Phase 2" section for what each actually did.

12. **Port `WorldScene`'s shell-rendering methods** — there's no separate
    `GameHUD` file; the border, hardcoded moon phase text, hardcoded wind
    direction text, hardcoded party panel, and log panel are all methods on
    `WorldScene.ts` itself (`drawBorder`, `drawMoonPhase`, `drawWindDirection`,
    `drawPartyPanel`, `drawLogPanel`, plus the log-scrolling logic and the
    shared `writeText` charset helper). Copy these into the new
    Angular-hosted Phaser instance. No server calls involved.
    - 12a. Serve the charset asset, add `WorldScene`, enable `pixelArt`.
    - 12b. Extract `game/shell-layout.ts` (layout constants) and
      `game/bitmap-text.ts` (`writeText`/`charFrame`).
    - 12c. Port border, moon phase, wind direction.
    - 12d. Port party panel.
    - 12e. Port log panel and the public `addLogMessage` hook.
13. **Confirm shell parity** — visual diff against the old build (panel
    positions, border thickness, text placement). Done as a direct
    side-by-side comparison against the old build rather than a scripted
    screenshot diff — judged unnecessary rigor for a straight port of a
    few small methods.
---

## Phase 3 — Overworld movement loop ✅ complete

> Route and class names below are as built in this phase. Phase 4 step 23b
> renamed them: `api/overworld/move` and `api/overworld/state` became
> `api/move` and `api/state`, `OverworldService` became `GameService`, and the
> client's `services/overworld.ts` became `services/game.ts`.

Goal: the core gameplay loop — the biggest phase, since it's the first place
client and server actually cooperate on live game state.

> **Revised from the original plan.** Decisions made during Phase 3:
> - Step 16's snapshot includes a hardcoded stub `Party` (matching the Phase 2
>   party panel), so the DTO shape stays stable until Phase 5 supplies real data.
> - The server builds the log text (`North`, `North BLK`) and holds the log in
>   memory (`ActionLog`, capped at 50 entries) — it owns the full log, so this
>   moves out of the client rather than being ported as-is. It is not persisted:
>   it survives a page refresh but not an API restart.
> - Step 19a was added before fog of war: tile attributes are served from a
>   separate endpoint, because every tile-based map shares one tile sheet.
>   It is a sub-step, so later numbering is unchanged.
> - Step 21 gained a read-only "current state" endpoint so the client has a
>   position to render before the first keypress.
> - Tests were added beyond the original plan: an xUnit project for Engine
>   rules, and Vitest specs for the pure client logic (`canSee`, `logRows`,
>   `TileCatalogueService`).

14. ✅ **Add `GameState` persistence entity** — `GameState` (`TileX`, `TileY`,
    `MapId`) and `UltimaExodusDbContext` in `UltimaExodus.Data/Persistence/`,
    EF Core + SQLite. Single row with a fixed `Id` of 1 (`ValueGeneratedNever`).
    `InitialGameState` migration, applied at startup via `Database.Migrate()`,
    so there is no manual DB step on a fresh environment. `dotnet-ef` is a local
    tool (`dotnet tool restore`).
15. ✅ **Port movement + collision logic into `UltimaExodus.Engine`** —
    `OverworldMovement.TryMove(map, x, y, direction)` in `Engine/Movement/`,
    returning a `MoveResult` (new position + `Blocked`). Wraps at the map edges
    and blocks on solid tiles via `TileCatalogue`. Verified with a new xUnit
    project, `UltimaExodus.Engine.Tests`.
16. ✅ **Add `POST api/overworld/move` endpoint** — takes
    `{ "direction": "North" | "South" | "East" | "West" }` and returns a
    `GameStateSnapshot`. `OverworldService` (`UltimaExodus.Api/Services/`) loads
    or creates the single `GameState` row (default tile (5,5) on
    `world-sosaria`), calls `OverworldMovement`, saves, appends `North` /
    `North BLK` to the in-memory `ActionLog`, and returns the snapshot. Clock
    values are hardcoded to match the old static moon phase/wind display —
    making them dynamic is out of scope until cutover. `Party` is a hardcoded
    stub until Phase 5; `Entities` and `Effects` are empty lists. An undefined
    direction returns 400.
17. ✅ **Port `InputService` into Angular** — `game/input-service.ts` (same shape
    as the old class, polled from `WorldScene.update()`), `game/input-direction.ts`,
    and an Angular `OverworldService` (`services/overworld.ts`) that calls the
    move endpoint. Arrow keys are wired; the E/A/Esc callbacks exist but nothing
    registers on them until later phases. The scene allows one request in flight
    at a time.
18. ✅ **Render viewport from move response** — `game/overworld-view.ts`: 121 tile
    images whose frames change on each snapshot, same "camera fixed, grid
    redraws" pattern as the old client. Map geometry comes from the cached
    `MapService`; tile numbers are already 0-based, so they are the sheet frame
    numbers.
19a. ✅ **Serve tile attributes to the client** — `GET api/tiles` returns
    `{ default, overrides }` from `TileCatalogue`; the client's
    `TileCatalogueService` fetches it once (concurrent callers share one
    request) on the first snapshot. A separate endpoint was chosen over
    extending `MapData` because every tile-based map uses the same 80-tile
    sheet and no tile has conflicting attributes between maps; dungeons are not
    tile-based and don't use the catalogue.
19. ✅ **Port fog-of-war raycasting to the new client** — `game/line-of-sight.ts`
    (`canSee`, a pure function with unit tests) plus fog drawing in
    `OverworldView`. Stays entirely client-side per `ARCHITECTURE.md`; ported
    algorithm, not rewritten.
20. ✅ **Wire log panel to server-provided log** — the panel shows the newest
    seven entries from the snapshot's `Log` (`game/log-rows.ts` pads short
    logs with blank rows at the top). The temporary SPACE test hook and
    `addLogMessage` were removed.
21. ✅ **Persist and restore position** — each move is saved to SQLite;
    `GET api/overworld/state` returns the current snapshot without moving, and
    `WorldScene` calls it on start so a fresh session resumes at the last saved
    tile, with fog and log, before any keypress.
22. ✅ **Confirm overworld parity** — movement, wrapping, blocked moves (`BLK`
    appended, position unchanged), fog of war and save/restore were compared
    side by side with the old stack and match. No fix commit was needed.
    Differences, all intended or cosmetic: the log is held by the server, so it
    survives a page refresh; the old 60 ms walking "bump" of the avatar is not
    ported; E/A/Esc are not wired.

---

## Phase 4 — Town / castle parity ✅ complete

Goal: E on an overworld location tile enters the town or castle, the party walks
it with real collision, and walking off any edge returns to the overworld tile it
came from. Same viewport, same server-authoritative loop as Phase 3.

> **Revised from the original plan.** Decisions made while scoping and building
> this phase (branch `phase-4-town-castle`, from `main`):
> - **One set of dispatching endpoints.** `POST api/overworld/move` and
>   `GET api/overworld/state` became `POST api/move` and `GET api/state`, plus a
>   new `POST api/interact` (E). The server looks at the map the party is on and
>   applies that map's rules, so there are no parallel town endpoints. The
>   rename was its own refactor commit (23b), done before any town code.
> - **No schema change.** `GameState.MapId`/`TileX`/`TileY` simply hold the town
>   position while inside. Each town or castle has exactly one overworld
>   entrance, so the exit position is found by reverse lookup in the location
>   table (`LocationCatalogue`), not stored.
> - **Refresh inside a town resumes in the town.** This differs from the old
>   build, which dropped you on the overworld (it never saved the town position).
>   Intended, like the server-held log in Phase 3.
> - **Town/castle collision comes from the server `TileCatalogue`**, not from the
>   Tiled `solid` properties (which are all `false` on purpose; see
>   `CONTEXT.md`). This phase was the catalogue-expansion pass; the rules are in
>   step 23e.
> - **One viewport.** `OverworldView`'s 121-sprite viewport is reused for towns
>   and castles with a no-wrap mode (out-of-bounds tiles hidden), rather than a
>   separate `TownView`. No fog in towns/castles, matching the old build.
> - **Debug no-clip override.** A server-side flag, honoured in Development only,
>   makes solid tiles passable for testing (e.g. crossing water). It was added to
>   `OverworldMovement` in 23f and built into `LocationMovement` in 23g (which
>   did not exist at 23f). Walking off a town edge still exits; that is a rule,
>   not collision.
> - **Castle Exodus entry stays at (32,63).** The old table's TODO and the
>   missing gate tile in the bottom row made it look doubtful, but it was
>   checked in play and is correct.
> - Conflict-map tiles were checked against the catalogue as the architecture
>   rule requires: they use only tiles 0, 1, 2, 13, 20 and 24, all covered by the
>   rules below, so no extra catalogue entries were needed.

**Behaviour matched (old `TownView` / `OverworldView`):** E on an overworld tile
listed in `SOSARIA_LOCATIONS` logs the location's enter message and loads it.
Towns spawn at (0,32), castles at (32,63). Walking off any edge logs `Leaving...`
and returns to the overworld; a blocked move logs `<Dir> BLK`; E inside logs
`Nothing here`. No wrapping, no fog.

**Server**

23a. ✅ **Copy the remaining map sources** — the 11 maps not yet in
    `UltimaExodus.Data/MapSources/` (`castle-british`, `castle-exodus`,
    `town-dawn`, `town-death`, `town-devil-guard`, `town-fawn`, `town-grey`,
    `town-montor_e`, `town-montor_w`, `town-moon`, `town-yew`). No code. All 12
    load from `api/maps/...` as 64×64 / 4096 tiles.
23b. ✅ **Rename and generalize the endpoints** — `POST api/move`,
    `GET api/state`, and the service renamed `GameService`. Pure refactor; the
    overworld behaved identically afterwards. (The client's injected service must
    not be called `game`: it clashes with `Phaser.Scene.game`; it is `gameService`.)
23c. ✅ **Add `Category` to `PartyPosition`** — serialised as a number, like
    `MapData.category`. The client reads it instead of hardcoding
    `MapCategory.World`.
23d. ✅ **Add `LocationCatalogue`** (`UltimaExodus.Engine/Locations/`) — the 12
    entries (overworld x,y → map id, category, entry x,y, enter message), keyed by
    map file name (`town-devil-guard`, not `devil`). Forward lookup for entering,
    reverse lookup (map id → overworld x,y) for leaving. Unit tests, plus
    map-backed tests (via a `Data` reference in `Engine.Tests`) that every map
    loads, every spawn is in bounds and walkable, and every entrance sits on
    overworld tile 6 (town) or 7 (castle). Ambrosia shrines stay deferred.
23e. ✅ **Expand `TileCatalogue` for towns and castles** — with tests (both ends
    of each range, plus the tiles just outside them). Rules:
    - **Solid + vision-blocking:** 35 (white block, building and castle walls).
    - **Solid:** 37-57 (sign frame, letters, counters, tables, cell bars);
      32 (yellow barred doors); 31 (the Exodus machine block); and every
      creature/NPC tile: 10, 11, 13, 14, 15, 16-30, 63-79 (they are baked into the
      tile layer, and 63-79 are the second animation frames).
    - **Fix:** tile 10 was mislabelled "town/castle" (non-solid); it is a horse,
      so it became solid. The real overworld entrances are 6 (town) and 7
      (castle), both walkable by default.
    - **Unchanged (walkable):** 1, 2 (ground, brush), 3 (forest, vision only),
      8 (red brick road/floor, the most common town tile), 9 (chests; walkable
      for later), 33 (dark red lava-like floor; walkable until damage exists),
      34 (blue star tile). 0 (water) and 4 (mountain) were already solid.
    - Because the catalogue is shared, the creature tiles are also solid on the
      overworld (one sea serpent, one tile-24 monster): a small intended change
      beyond parity. Built with ranges in a loop; the client receives it through
      `GET api/tiles` unchanged (64 overrides).
23f. ✅ **Add the no-clip override** — `ignoreSolid` parameter (default false) on
    `OverworldMovement.TryMove`, fed from `DebugOptions` (`Debug:NoClip`), which
    is bound from configuration in Development only. The engine stays pure. Turn
    it on with the `http-noclip` launch profile
    (`dotnet run --launch-profile http-noclip`). Read at startup, so changing it
    needs an API restart.
23g. ✅ **Add `LocationMovement.TryMove`** (`Engine/Movement/`) — no wrapping;
    returns `LocationMoveResult(X, Y, Blocked, Exited)`, and takes the same
    `ignoreSolid` flag (an edge exit is not collision, so no-clip does not stop
    it). `OverworldMovement` and its `MoveResult` are untouched. The direction
    offsets were shared between the two in `DirectionExtensions.ToOffset`.
23h. ✅ **Wire the service** — `GameService.MoveAsync` dispatches on the current
    map; `InteractAsync` enters a location when E is pressed on its overworld
    tile (spawn, enter message, `GameState` updated), and logs `Nothing here`
    everywhere else (overworld without a location, and inside a town). A move off
    an edge exits to the reverse-lookup overworld tile with `Leaving...`.
    `CategoryFor` finds a map's category from the catalogue (a map that is not a
    location is the overworld). Verified with curl.

**Client**

24a. ✅ **Per-map viewport lifecycle** — `OverworldView.destroy()` and a `mapId`
    getter; `WorldScene` rebuilds the view whenever the snapshot's `mapId`
    changes (it used to create it once with `??=`).
24b. ✅ **No-wrap mode** — for town/castle maps, out-of-bounds tiles are hidden
    and fog is skipped. The tile lookup moved to a Phaser-free `game/map-tile.ts`
    (`wrap`, `lookupTile`) so it is unit-tested.
24c. ✅ **Wire E** — `onInteract` calls `POST api/interact` through
    `GameService.interact()`; move and interact share one in-flight guard.
24d. ✅ **Restore into the right view** — needed no code: 23c (category from the
    snapshot) and 24a (rebuild on map change) already made a refresh inside a
    town resume there. Verified in the browser.

**Close-out**

25. ✅ **Confirm town/castle parity** — `scripts/parity-check.ps1` (run against the
    API with the no-clip profile) walks into and out of all 12 locations and
    checks map, category, spawn, enter message, `Nothing here` inside, and the
    exit landing on the same overworld tile with `Leaving...`: 96 checks, all
    passing. Browser checks: collision (roads walk; walls, signs, counters, water
    and mountains block), Castle Exodus's entry, refresh inside a town. Then this
    docs commit.

---

## Phase 5 — Party organization parity ✅ complete

Goal: the pre-game party management screens (Register, Create Character, Form
Party, Disperse, Terminate) work end to end against the C# server, and the HUD
party panel shows the real party instead of the hardcoded stub.

> **Revised from the original plan.** Decisions made while scoping and building
> this phase (branch `phase-5-party-organisation`, from `main`):
> - **Screens are Phaser scenes, not Angular components.** The old
>   `PartyOrganizationScene` and its `OrgView` sub-screens are ported with the
>   same pattern, drawn with the bitmap charset, consistent with "everything is
>   rendered inside the canvas". Angular supplies only services
>   (`RosterService`, `HeroOptionsService`), which `GameCanvas` passes to the
>   scene through its constructor, as it does for `WorldScene`.
> - **Validation is plain C# in `UltimaExodus.Engine`** (`CreationRules`), unit
>   tested, with no FluentValidation dependency. The server stays authoritative;
>   the client validates only to give the same immediate messages as the old build.
> - **`Hero` and `PartySlot` are plain classes in Engine** (no EF attributes).
>   Engine cannot reference Data, and the rules need to see heroes. Mapping is
>   configured with the fluent API in `UltimaExodusDbContext`.
> - **Starting values keep the old database values:** hit points 100, magic
>   points 0, food 0, gold 0, experience 0, level 1, status good. They live as
>   constants in one place (`HeroDefaults`), so changing them later is one edit.
>   (The original game starts with 150 hit points, food and gold; if that is
>   wanted later, it is a change to `HeroDefaults` only.)
> - **Schema:** `Heroes` and `PartySlots` are ported. `PartySlots` keeps its
>   shape (slot index 0-3 as the key) but gets a **unique index on `HeroId`**,
>   which the old schema lacked. `Heroes.RosterEntry` gets a **unique index
>   filtered to `Terminated = 0`**. `heroInventory`, `equippedWeaponId` and
>   `equippedArmorId` are deferred: nothing in the old build reads or writes them.
> - **Roster entries are stored 1-20**, as the player sees them. The old build
>   stored 0-19 and added 1 for display, a mismatch that invites off-by-one
>   bugs. The field is `RosterEntry`.
> - **Two old bugs are not ported.** `party.form` looked heroes up by roster
>   slot without excluding terminated ones, so a terminated hero could join a
>   party, or a reused slot made forming fail. Every query here excludes
>   terminated heroes, and the filtered index makes the bad state impossible.
> - **Game outcomes are not errors.** "Roster is full", "slot already empty",
>   "can not terminate a character in the party", "a party is already formed"
>   and "each position must be different" return 200 with a status. Only
>   malformed input (blank name, stats not totalling 50, unknown race, a wrong
>   count or out-of-range entry) returns 400. Every command returns the full
>   updated `RosterSnapshot`, so the client never refetches.
> - **Option lists come from the server.** `GET api/hero-options` returns races,
>   classes, sexes and the creation limits, so the client does not duplicate
>   them (same reasoning as `api/tiles`). Initials such as `MHF` (sex, race,
>   class) are computed server-side.
> - **Temporary entry point.** The new client has no main menu until Phase 6, so
>   an `O` key hook on `WorldScene` starts the organisation scene. The scene
>   takes an `exitTo` scene key (default `world`); Phase 6 changes it to
>   `main-menu` and deletes the hook.
> - **No party formed:** the HUD party panel is blank and the world is still
>   walkable. Requiring a party before play is Phase 6's R/O/J gating.
> - **Out of scope:** magic points by class (still 0, as in the old TODO),
>   race/class restrictions on stats, inventory and equipment, and the
>   Ultima III BCD roster files.

**Behaviour matched (old `PartyOrganizationScene` and `hero`/`party` routers):**

- Roster of 20 entries, shown 1-based; created heroes take the lowest free
  entry.
- Creation: name 1-12 characters, sex, race (Human, Elf, Dwarf, Bobbit, Fuzzy)
  and class (Fighter, Paladin, Barbarian, Thief, Cleric, Wizard, Druid,
  Illusionist, Alchemist) chosen with left/right; four stats (strength,
  dexterity, intelligence, wisdom) each 0-25 that must total exactly 50. A wrong
  total shows `Total must be 50 (currently N)`, clears the stats and restarts at
  strength.
- Form: four distinct, non-empty entries, only when no party exists. Messages:
  `Must be 01-20`, `Already selected`, `A party is already formed`,
  `Each roster position must be different`, `One or more roster positions are
  empty`, `Party formed - press any key`.
- Disperse always succeeds and shows `Party dispersed`.
- Terminate is a soft delete: `Register slot is already empty`,
  `Can not terminate a character in the party`, `NN Terminated`.
- Register rows: `NN P NAME(12) INI  Lnn`, red for party members with their
  position number, bright blue otherwise, `-- Empty --` for free entries.

**Intended differences from the old build:**

- The two bug fixes above.
- The HUD party panel shows the real party (blank when there is none).
- Wording and layout fixes forced by the screen: the charset has only 128
  glyphs, so the old messages' em dash (`—`) is a hyphen, and only 38
  characters fit between the borders, so `Total must be 50 (currently N)` /
  `Re-enter stats`, `Creation failed` / `Check stats and try again` and
  `Can not terminate a character` / `in the party` are split over two lines.
- Leaving the "roster is full" and "a party is already formed" screens returns
  to the options menu; the old build left party organisation altogether.
- Keys are ignored while a request is in flight (the old Create screen could
  create a hero twice if Y was pressed twice).
- A failed request shows `Server unavailable` / `Failed to ...` instead of
  doing nothing.

**Server**

26a. ✅ **Add the hero domain to `UltimaExodus.Engine/Heroes/`** — `Sex`, `Race`,
    `HeroClass`, `HeroStatus` (string enums, converter on the enum); `Hero`
    and `PartySlot`; `HeroLimits` (name 12, stats 0-25, total 50, roster 20,
    party 4) and `HeroDefaults`; and the pure rules `CreationRules.Validate`,
    `Roster.NextFreeEntry`, `Roster.CheckTerminate` and `PartyRules.CheckForm`
    (checks, in order: party already formed, wrong shape, duplicates, empty
    entries). xUnit tests at both ends of every range and just outside them.
26b. ✅ **Persist heroes and the party** — `DbSet<Hero>` and `DbSet<PartySlot>`,
    enums stored as text, the two unique indexes above. Migration
    `AddHeroesAndParty`. Tests run the real migration against in-memory SQLite
    and check each constraint (shared entry rejected, terminated entry reusable,
    one hero in two party slots rejected, party slot must reference a real hero).
27a. ✅ **`GET api/hero-options`** — `HeroInitials` and `HeroOptions` (races,
    classes, sexes, limits). A test fails if an enum value is added without an
    initial.
27b. ✅ **`GET api/roster`** — `RosterSnapshot`: always 20 entries, each with its
    hero (name, initials, level) and party position (1-4) or empty, plus a
    `PartyFormed` flag. Built by the pure `RosterSnapshotBuilder`; `RosterService`
    (`UltimaExodus.Api/Services/`, registered scoped) only loads the rows.
27c. ✅ **`POST api/roster/create`** — statuses `Created`, `RosterFull`; 400 for
    invalid input.
27d. ✅ **`POST api/roster/terminate`** — `{ "entry": 1-20 }`; statuses
    `Terminated`, `Empty`, `InParty`. `RosterService` tests run against
    in-memory SQLite, including the old slot-reuse bug.
27e. ✅ **`POST api/party/form` and `POST api/party/disperse`** — form takes
    `{ "entries": [n, n, n, n] }` in party order; statuses `Formed`,
    `AlreadyFormed`, `Duplicate`, `EmptyEntry`; a malformed request is a 400.
    The four party slots are saved in one `SaveChanges`.
27f. ✅ **Real party in the game snapshot** — `StubState.Party` removed (the clock
    stub stays). `PartyStatusBuilder` (`Engine/State/`) maps heroes onto
    `PartyMemberStatus` (`Type` = sex/race/class initials, condition letter
    G/P/S/U/D from the status). `GameService` loads the party for every
    snapshot, so building the snapshot became async. An empty party gives an
    empty `Members` list. `scripts/party-check.ps1` drives the whole lifecycle
    through the API from an empty database.

**Client**

28a. ✅ **Services and DTOs** — `RosterService` and `HeroOptionsService`
    (`@Service()`, `inject()`) with TypeScript mirrors of the DTOs and status
    unions. A 400 rejects the promise; the calling screen decides what to show.
28b. ✅ **Scene infrastructure** — `PartyOrganizationScene` (key `organize-party`,
    started with `{ exitTo }`), the `OrgView` / `OrgContext` interfaces,
    `writeTextCentered` (with the pure `centredStartX`), `NumericLineInput` and
    `TextLineInput`, `loadSpritesheetOnce` so any scene can start first, the
    scene registered in `GameCanvas`, the temporary `O` hook on `WorldScene`,
    and `WorldScene.create()` resetting its leftover fields (a restart reuses the
    same scene object).
28c. ✅ **Options menu and Register screen** — `OptionsMenuView`, `RegisterView`,
    and the pure `registerRow` formatter. Disperse (`D`) is wired in the menu.
    `showMenu()` was added to `OrgContext` so screens do not import each other.
29. ✅ **Create Character screen** — the rules and key handling are the pure,
    unit-tested `CreateCharacterForm`; `CreateCharacterView` draws it and calls
    the server. Lists and limits come from `HeroOptionsService`.
30. ✅ **Form Party screen** — pure `FormPartyForm` plus `FormPartyView`; reads
    `partyFormed` from the roster on load.
31. ✅ **Terminate Character screen** — pure `TerminateCharacterForm` plus
    `TerminateCharacterView`, soft delete only.
31a. ✅ **Party panel from the snapshot** — the pure, unit-tested `partyRows`
    formats a member into the panel's four rows, and `WorldScene.showParty`
    redraws the panel on every snapshot (fewer than four members is fine).

**Close-out**

32. ✅ **Confirm party organization parity** — `scripts/party-check.ps1` runs the
    whole lifecycle against the API from an empty database (create, form in a
    chosen order, refusals while a party exists, disperse, terminate, slot reuse
    and the terminated-hero cases) and checks the statuses and the snapshot's
    party. Browser checks, step by step: every screen's layout, colours and
    messages; the 20-entry limit and the four-distinct rule; refusing to
    terminate a party member; that a refresh keeps the roster and party; and that
    the HUD matches the formed party. Then this docs commit.

---

## Phase 6 — Main menu / intro parity ✅ complete

Goal: the game opens on the intro screen and the main menu (Return to the View /
Organize a Party / Journey Onward), and party organisation and the world are
reached from the menu instead of the temporary `O` hook.

> **Revised from the original plan.** Decisions made while scoping and building
> this phase (branch `phase-6-main-menu-intro`, from `main` after the Phase 5
> merge):
> - **Screens are Phaser scenes, not Angular components**, as in Phase 5. The
>   original step said "port to Angular"; Angular supplies only services
>   (`MapService` to `IntroScene`, `RosterService` to `MainMenuScene`), passed
>   through the constructors by `GameCanvas`.
> - **"First access in a session" means a page load.** `IntroScene` is the first
>   scene in `GameCanvas`'s list, so every load, including a refresh, starts
>   there. No server call and no `sessionStorage`. A refresh mid-game therefore
>   returns to the intro; revisit when a conflict can be in progress.
> - **Only Journey Onward is gated.** With no party formed, `J` shows a red
>   `Form a party first` on the menu and stays put. `R` and `O` always work. The
>   old build had no gating (`J` always entered the world).
> - **The party is checked when `J` is pressed**, not when the menu opens: the
>   menu is revisited after organisation changes the party, and the scene
>   object is reused.
> - **The intro map comes from the server** (`world-intro` is already in
>   `MapSources`; `GET api/maps/world/world-intro` is 19x6) and is drawn as plain
>   images, not a Tiled tilemap. Tile values are already 0-based frames.
> - **Client only:** no new endpoints, no schema change.
> - **Out of scope:** an in-game way back to the menu. Once in the world, the
>   only way out is a refresh (as in the old build).

**Behaviour matched (old `IntroScene`, `IntroView` and `MainMenuScene`):**

- Intro: blue frame with a divider at y=80, `EXODUS` in white at 5x scale at
  y=12, the 19x6 map strip at (8, 88), cyan `◄PRESS  <SPACE>►` on the bottom
  border. SPACE goes to the menu.
- Menu: black background, `EXODUS` at 3x scale, two cyan tagline lines,
  `Option:` with its glyph, then the three cyan options, then the two white
  copyright lines. `R` returns to the intro, `O` opens party organisation, `J`
  enters the world.

**Steps**

33a. ✅ **Check the intro map endpoint** — `world-intro` served as category 0,
     19x6, 114 tiles. No change needed.
33b. ✅ **Menu logic** — `menu/main-menu-actions.ts`: `menuOutcome(key,
     partyFormed)` and the refusal message, pure and unit-tested.
33c. ✅ **`IntroScene`** — frame, title, map strip and SPACE. A failed map load
     is logged and SPACE still works.
33d. ✅ **`MainMenuScene`** — layout above, red message at y=140, an in-flight
     guard, state reset in `init()`, and `Server unavailable` when the roster
     request fails.
33e. ✅ **Wire the scenes** — `GameCanvas` order is intro, main-menu, world,
     organize-party. The `TEMPORARY (Phase 5)` `O` hook and its
     `openPartyOrganization` method are gone from `WorldScene`, along with a
     leftover debug `console.log`. Organisation's default `exitTo` is now
     `main-menu`, and the menu also passes it explicitly.
33f. ✅ **Confirm menu parity** — `parity-check.ps1` and `party-check.ps1` pass.
     Browser checks: intro and menu layouts against the old build; SPACE, `R`,
     `O` then `M`; `J` with and without a party; `J` with the API stopped; rapid
     key presses; `O` does nothing in the world.
33g. ✅ **Docs commit.**

Known differences from the old build: `J` is refused when no party is formed;
`Server unavailable` is shown if the roster request fails; the intro map loads
from the server.
---

## Phase 7 — Conflict view stub parity

The old `ConflictView` is itself a stub (maps decoded, not a real combat
loop) — this phase matches that same level of completeness, not more.

34. **Add conflict map selection + stub enter endpoint** — `POST
    api/conflict/enter` using the `ConflictMapSelector` lookup already
    designed in `ARCHITECTURE.md`; returns a snapshot with the selected
    static map and placeholder party/monster entity positions.
35. **Port stub `ConflictView` to the new client** — renders the selected
    map and static positions, no combat loop, matching the old stub state.

---

## Phase 8 — Cutover

36. **Full parity smoke test** — walk every item in `CONTEXT.md`'s "Working
    ✅" list against the new stack end to end.
37. **Remove the legacy stack** — delete `server/`, the old `src/`,
    `drizzle.config.ts`, related npm scripts; promote `client-angular/` and
    `server-dotnet/` to their permanent locations (e.g. repo root or
    `client/`/`server/`).
38. **Update docs to reflect the new stack as current** — flip the "planned
    migration" banners in `README.md` and `CONTEXT.md` to describe the
    Angular/C# stack as the actual current implementation; fold
    `ARCHITECTURE.md`'s content into `CONTEXT.md` where it's no longer
    forward-looking.

---

## Explicitly deferred (post-parity — not part of this plan)

These are real features but are **out of scope** until every step above is
committed and confirmed:

- Dynamic world clock (real moon phase / wind calculation, replacing the
  hardcoded values carried through Phase 3)
- Full combat resolution and the effect-sequencing vocabulary
  (`EffectSequence.Type` enum) from `ARCHITECTURE.md`
- Dungeon renderer wiring — the raycasting calculation service and
  `DungeonView`, per `dungeon-view.md`
- NPC dialogue and real shop transactions (beyond whatever stub exists today)
- Ambrosia shrine coordinates
- The avatar's 60 ms walking "bump" tween from the old `OverworldView` (cosmetic)
- Fog of war in towns and castles (the old `TownView` has none either)
- A runtime toggle for no-clip (a key plus a Development-only endpoint); it is a
  config/launch-profile flag read at startup for now
- Lava damage (tile 33 is walkable until damage exists) and key/lock handling for
  the yellow barred doors (tile 32, solid for now)
- Interacting with chests, NPCs and signs (chests are walkable, creature and sign
  tiles solid, as placeholders)
- Hero inventory and equipment (`heroInventory`, equipped weapon and armour ids),
  magic points by class (still 0 for every hero), and race/class restrictions on
  the starting stats
- Saving hero changes made during play (damage, food, gold, experience) until
  combat, shops and a world clock exist; heroes are created and listed only
- Starting hit points, food and gold (100 / 0 / 0, as the old database had them;
  the original game uses 150) — a change to `HeroDefaults` when wanted
- Revisiting solidity of the creature tiles baked into conflict maps (Phase 7: units move)