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

## Phase 3 — Overworld movement loop

Goal: the core gameplay loop — the biggest phase, since it's the first place
client and server actually cooperate on live game state.

14. **Add `GameState` persistence entity** — mirrors the old `game_state`
    table (`tileX`, `tileY`, `mapId`). This is where a real database layer
    (EF Core + SQLite, per the original Phase 1 plan) actually belongs.
15. **Port movement + collision logic into `UltimaExodus.Engine`** — solid
    tiles (water, mountains), overworld wrap-at-edges behaviour, ported from
    the old `OverworldView` logic. Reuses `TileCatalogue` from Phase 1.
16. **Add `POST api/overworld/move` endpoint** — takes a direction, returns
    a `GameStateSnapshot` (position, log, clock, empty entities list for
    now). Clock values are hardcoded to match the old static moon
    phase/wind display — making them dynamic is out of scope until cutover.
17. **Port `InputService` into Angular** — arrow keys/E/A/Escape → calls to
    the move endpoint, same key mapping as the old build.
18. **Render viewport from move response** — 11×11 tile redraw around hero
    position, same "camera fixed, grid redraws" pattern as the old client.
19. **Port fog-of-war raycasting to the new client** — stays entirely
    client-side per `ARCHITECTURE.md`; ported algorithm, not rewritten.
20. **Wire log panel to server-provided log** — display the `Log` list from
    the snapshot instead of a local buffer.
21. **Persist and restore position** — confirm `move` persists to SQLite
    each call; add restore-on-load so a fresh session resumes at the last
    saved tile.
22. **Confirm overworld parity** — movement, wrapping, fog of war, and
    save/restore all match the old stack. Fix-only commit if needed.

---

## Phase 4 — Town / castle parity

23. **Add town/castle movement + entry endpoints** — port `TownView`'s
    non-wrapping, edge-exits-to-overworld rules into the engine.
24. **Port `TownView`-equivalent client mode** — entry from the overworld
    location lookup (`SOSARIA_LOCATIONS`), edge-exit back to overworld.
25. **Confirm town/castle parity** — all current town/castle maps enter and
    exit correctly. Fix-only commit if needed.

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
