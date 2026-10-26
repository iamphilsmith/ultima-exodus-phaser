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

## Phase 4 — Town / castle parity (planned)

Goal: E on an overworld location tile enters the town or castle, the party walks
it with real collision, and walking off any edge returns to the overworld tile it
came from. Same viewport, same server-authoritative loop as Phase 3.

> **Revised from the original plan.** Decisions made while scoping this phase
> (branch `phase-4-town-castle`, from `main`):
> - **One set of dispatching endpoints.** `POST api/overworld/move` and
>   `GET api/overworld/state` become `POST api/move` and `GET api/state`, plus a
>   new `POST api/interact` (E). The server looks at the map the party is on and
>   applies that map's rules, so there are no parallel town endpoints. The
>   rename is its own refactor commit (23b), done before any town code.
> - **No schema change.** `GameState.MapId`/`TileX`/`TileY` simply hold the town
>   position while inside. Each town or castle has exactly one overworld
>   entrance, so the exit position is found by reverse lookup in the location
>   table (`LocationCatalogue`), not stored.
> - **Refresh inside a town resumes in the town.** This differs from the old
>   build, which dropped you on the overworld (it never saved the town position).
>   Intended, like the server-held log in Phase 3.
> - **Town/castle collision comes from the server `TileCatalogue`**, not from the
>   Tiled `solid` properties (which are all `false` on purpose; see
>   `CONTEXT.md`). This phase is the catalogue-expansion pass; see step 23e for
>   the tile list.
> - **One viewport.** `OverworldView`'s 121-sprite viewport is reused for towns
>   and castles with a no-wrap mode (out-of-bounds tiles hidden), rather than a
>   separate `TownView`. No fog in towns/castles, matching the old build.
> - **Debug no-clip override.** A server-side flag, on by config in Development
>   only, makes solid tiles passable for testing (e.g. crossing water).
>   Walking off a town edge still exits; that is a rule, not collision.
> - **Castle Exodus entry stays at (32,63).** It is unverified (the old table's
>   TODO is still open and the bottom row has no gate tile, unlike Castle
>   British's gate at columns 31-33). Implement as-is, observe in play, and
>   correct the one `LocationCatalogue` entry if needed.
> - Conflict-map tiles were checked against the catalogue as the architecture
>   rule requires: they use only tiles 0, 1, 2, 13, 20 and 24, all covered by the
>   rules below, so no extra catalogue entries are needed.

**Behaviour to match (old `TownView` / `OverworldView`):** E on an overworld tile
listed in `SOSARIA_LOCATIONS` logs the location's enter message and loads it.
Towns spawn at (0,32), castles at (32,63). Walking off any edge logs `Leaving...`
and returns to the overworld; a blocked move logs `<Dir> BLK`; E inside logs
`Nothing here`. No wrapping, no fog.

**Server**

23a. **Copy the remaining map sources** — the 11 maps not yet in
    `UltimaExodus.Data/MapSources/` (`castle-british`, `castle-exodus`,
    `town-dawn`, `town-death`, `town-devil-guard`, `town-fawn`, `town-grey`,
    `town-montor_e`, `town-montor_w`, `town-moon`, `town-yew`). No code. Confirm
    all 12 load from `api/maps/...` as 64×64 / 4096 tiles.
23b. **Rename and generalize the endpoints** — `POST api/move`, `GET api/state`,
    and the service renamed to match (e.g. `GameService`). Pure refactor; the
    overworld must behave identically afterwards. Client service and docs follow.
23c. **Add `Category` to `PartyPosition`** — serialised as a number, like
    `MapData.category`. The client reads it instead of hardcoding
    `MapCategory.World`.
23d. **Add `LocationCatalogue`** (`UltimaExodus.Engine/`) — the 12 entries
    (overworld x,y → map id, category, entry x,y, enter message), keyed by map
    file name (`town-devil-guard`, not `devil`). Forward lookup for entering,
    reverse lookup (map id → overworld x,y) for leaving. Tests: hit/miss, unique
    coordinates, reverse round-trip, every id has a source file. Ambrosia
    shrines stay deferred.
23e. **Expand `TileCatalogue` for towns and castles** — with tests (one tile
    from each group, plus unchanged ones). Rules:
    - **Solid + vision-blocking:** 35 (white block, building and castle walls).
    - **Solid:** 37-57 (sign frame, letters, counters, tables, cell bars);
      32 (yellow barred doors); 31 (the Exodus machine block); and every
      creature/NPC tile: 10, 11, 13, 14, 15, 16-30, 63-79 (they are baked into the
      tile layer, and 63-79 are the second animation frames).
    - **Fix:** tile 10 was mislabelled "town/castle" (non-solid); it is a horse,
      so it becomes solid. The real overworld entrances are 6 (town) and 7
      (castle), both already walkable by default.
    - **Unchanged (walkable):** 1, 2 (ground, brush), 3 (forest, vision only),
      8 (red brick road/floor, the most common town tile), 9 (chests; walkable
      for later), 33 (dark red lava-like floor; walkable until damage exists),
      34 (blue star tile). 0 (water) and 4 (mountain) are already solid.
    - Because the catalogue is shared, the creature tiles are also solid on the
      overworld (one sea serpent, one tile-24 monster): a small intended change
      beyond parity. Built with a loop for the ranges; the client receives it
      through `GET api/tiles` unchanged.
23f. **Add the no-clip override** — `ignoreSolid` parameter (default false) on
    both movement classes, fed from a Development-only config setting
    (`Debug:NoClip`) via the service. The engine stays pure. A runtime toggle
    (Development-only endpoint + key) is optional and can come later.
23g. **Add `LocationMovement.TryMove`** (`Engine/Movement/`) — no wrapping;
    returns a result with `Blocked` and `Exited`. `OverworldMovement` and its
    `MoveResult` are untouched. Tests: all four edges, blocked and open moves,
    no-clip.
23h. **Wire the service** — E on a location tile enters it (spawn, enter
    message, `GameState` updated); a move off an edge exits to the reverse-lookup
    overworld tile with `Leaving...`; E in a town logs `Nothing here`; E on an
    overworld tile with no location is handled (the old build logged `[x,y]` as a
    debug aid, no longer needed). Verify with curl after setting the position in
    the SQLite file.

**Client**

24a. **Per-map viewport lifecycle** — add `destroy()` to `OverworldView`;
    `WorldScene` rebuilds the view whenever the snapshot's `mapId` changes
    (it currently creates it once with `??=`).
24b. **No-wrap mode** — for town/castle maps, out-of-bounds tiles are hidden and
    fog is skipped.
24c. **Wire E** — register `onInteract` on `InputService` and call
    `POST api/interact`.
24d. **Restore into the right view** — `GET api/state` picks the map category
    from the snapshot, so a refresh inside a town resumes there.

**Close-out**

25. **Confirm town/castle parity** — enter all 12 locations; check enter message,
    spawn and movement; walk off each edge and confirm you return to the same
    overworld tile; refresh inside a town and after leaving. Check Castle
    Exodus's entry and correct it if needed (use no-clip to explore). Fix-only
    commit if needed, then a docs commit: mark steps done, update `ARCHITECTURE.md`
    (endpoint names, `PartyPosition.Category`, tile catalogue scope) and
    `CONTEXT.md`.

---

## Phase 5 — Party organization parity

26. **Add hero/roster persistence entities** — port `heroes`,
    `heroInventory`, `partySlots` schema into EF Core; port the 50-point
    stat-total validation rule (creation only, not leveling) to
    FluentValidation or DataAnnotations.
27. **Add party organization API endpoints** — register/list, create
    character, terminate (soft-delete), form/disperse party.
28. **Port Register screen to Angular.**
29. **Port Create Character screen to Angular** — including stat allocation
    and the 50-point validation.
30. **Port Form Party screen to Angular.**
31. **Port Terminate Character screen to Angular** — soft-delete only, same
    as before.
32. **Confirm party organization parity** — every sub-screen matches the old
    `PartyOrganizationScene` behaviour. Fix-only commit if needed.

---

## Phase 6 — Main menu / intro parity

33. **Port intro + main menu screens to Angular** — R/O/J gating, and the
    rule that the first access in a session always routes to the intro
    screen (per `ARCHITECTURE.md`'s session model — this is enforced
    client-side, no server call needed).

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
- Lava damage (tile 33 is walkable until damage exists) and key/lock handling for
  the yellow barred doors (tile 32, solid for now)
- Interacting with chests, NPCs and signs (chests are walkable, creature and sign
  tiles solid, as placeholders)
- Revisiting solidity of the creature tiles baked into conflict maps (Phase 7: units move)