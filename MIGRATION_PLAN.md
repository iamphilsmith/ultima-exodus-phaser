# Migration Plan — Angular + Phaser + C#

> Companion to `ARCHITECTURE.md` (target design) and `CONTEXT.md` (current
> implementation). This document sequences the migration itself: one commit
> per step, ordered so the app is always in a coherent, buildable state.

---

## Ground rules

- **Parity before features.** Every step below replicates something that
  already works in the current Vite/Phaser/tRPC/Express stack. Nothing new
  (dynamic world clock, real combat resolution, dungeon rendering, NPC
  dialogue) is in scope until the "Cutover" phase is reached — see
  "Explicitly deferred" at the bottom.
- **One step = one commit.** Each step below is sized to be a single,
  reviewable commit with a clear before/after.
- **The old stack keeps running untouched until cutover.** Build the new
  Angular/C# stack alongside the current one (e.g. `client-angular/` and
  `server-dotnet/` as new top-level folders) rather than modifying the
  existing `src/`/`server/` in place. This gives you a working reference to
  compare against at every step, and a fallback if something stalls.
- **Order follows player-encounter order**, same principle as the original
  build: intro → menu → party org → overworld → town → conflict stub. This
  mirrors how `CONTEXT.md` describes the current build sequence.
- **Verify, don't assume, at each phase boundary.** The "Confirm parity"
  steps are checkpoints — if the new stack doesn't match old-stack behaviour,
  fix it there rather than carrying the discrepancy into the next phase.

---

## Phase 0 — Scaffolding

Goal: both new stacks exist and can talk to each other. No game logic yet.

1. **Scaffold C# solution** — `UltimaExodus.sln` with three projects:
   `UltimaExodus.Api` (ASP.NET Core Web API), `UltimaExodus.Engine` (class
   library, game rules), `UltimaExodus.Data` (persistence). No implementation
   yet, just structure and that it builds.
2. **Add a health-check endpoint** — `GET /api/health` returning a static
   payload. Confirms the API runs standalone.
3. **Scaffold Angular workspace** — new Angular project in
   `client-angular/`, default template, confirms `ng serve` runs.
4. **Wire Angular → API** — Angular `HttpClient` call to `/api/health`,
   displayed on screen. Confirms the two processes can talk (CORS, ports).
5. **Mount empty Phaser instance inside Angular** — one Angular component
   hosting a blank Phaser game at the correct internal resolution
   (320×192, 3x zoom). No sprites yet — just confirms the mounting pattern
   works before any rendering logic goes in it.

---

## Phase 1 — Static map delivery

Goal: the map endpoint from `ARCHITECTURE.md` exists and Angular can fetch
from it. Still nothing rendered.

6. **Add persistence layer** — EF Core + SQLite in `UltimaExodus.Data`
   (keeping SQLite for continuity with the current stack; revisit later if a
   reason to switch appears). No entities yet, just the wiring and that
   migrations run.
7. **Add map retrieval endpoint (overworld only)** — `MapData`/`MapCategory`
   DTOs per `ARCHITECTURE.md`; `GET api/maps/{category}/{mapId}` reading the
   existing Sosaria Tiled JSON from disk. Start with one map to prove the
   shape before porting the rest.
8. **Add Angular MapService** — fetch-and-cache service per
   `ARCHITECTURE.md`'s caching design; confirm it retrieves and logs the
   Sosaria tile array. No rendering yet.

---

## Phase 2 — Shell rendering parity

Goal: the permanent HUD chrome (border, panels, log) renders identically to
today, entirely client-side — this is pure rendering, so it should port
almost unchanged from the current `GameHUD`.

9. **Port `GameHUD` rendering** — border, hardcoded moon phase text,
   hardcoded wind direction text, hardcoded party panel, log panel — copied
   into the new Angular-hosted Phaser instance. No server calls involved.
10. **Confirm shell parity** — visual diff against the current build (panel
    positions, border thickness, text placement). Fix-only commit if needed.

---

## Phase 3 — Overworld movement loop

Goal: the core gameplay loop — the biggest phase, since it's the first place
client and server actually cooperate on live game state.

11. **Add `GameState` persistence entity** — mirrors the current
    `game_state` table (`tileX`, `tileY`, `mapId`).
12. **Port movement + collision logic into `UltimaExodus.Engine`** — solid
    tiles (water, mountains), overworld wrap-at-edges behaviour, ported from
    the current `OverworldView` logic.
13. **Add `POST api/overworld/move` endpoint** — takes a direction, returns
    a `GameStateSnapshot` (position, log, clock, empty entities list for
    now). Clock values are hardcoded to match today's static moon
    phase/wind display — making them dynamic is out of scope until cutover.
14. **Port `InputService` into Angular** — arrow keys/E/A/Escape → calls to
    the move endpoint, same key mapping as today.
15. **Render viewport from move response** — 11×11 tile redraw around hero
    position, same "camera fixed, grid redraws" pattern as the current
    client.
16. **Port fog-of-war raycasting to the new client** — stays entirely
    client-side per `ARCHITECTURE.md`; ported algorithm, not rewritten.
17. **Wire log panel to server-provided log** — display the `Log` list from
    the snapshot instead of a local buffer.
18. **Persist and restore position** — confirm `move` persists to SQLite
    each call; add restore-on-load so a fresh session resumes at the last
    saved tile.
19. **Confirm overworld parity** — movement, wrapping, fog of war, and
    save/restore all match the old stack. Fix-only commit if needed.

---

## Phase 4 — Town / castle parity

20. **Add town/castle movement + entry endpoints** — port `TownView`'s
    non-wrapping, edge-exits-to-overworld rules into the engine.
21. **Port `TownView`-equivalent client mode** — entry from the overworld
    location lookup (`SOSARIA_LOCATIONS`), edge-exit back to overworld.
22. **Confirm town/castle parity** — all current town/castle maps enter and
    exit correctly. Fix-only commit if needed.

---

## Phase 5 — Party organization parity

23. **Add hero/roster persistence entities** — port `heroes`,
    `heroInventory`, `partySlots` schema into EF Core; port the 50-point
    stat-total validation rule (creation only, not leveling) to
    FluentValidation or DataAnnotations.
24. **Add party organization API endpoints** — register/list, create
    character, terminate (soft-delete), form/disperse party.
25. **Port Register screen to Angular.**
26. **Port Create Character screen to Angular** — including stat allocation
    and the 50-point validation.
27. **Port Form Party screen to Angular.**
28. **Port Terminate Character screen to Angular** — soft-delete only, same
    as today.
29. **Confirm party organization parity** — every sub-screen matches current
    `PartyOrganizationScene` behaviour. Fix-only commit if needed.

---

## Phase 6 — Main menu / intro parity

30. **Port intro + main menu screens to Angular** — R/O/J gating, and the
    rule that the first access in a session always routes to the intro
    screen (per `ARCHITECTURE.md`'s session model — this is enforced
    client-side, no server call needed).

---

## Phase 7 — Conflict view stub parity

Current `ConflictView` is itself a stub (maps decoded, not a real combat
loop) — this phase matches that same level of completeness, not more.

31. **Add conflict map selection + stub enter endpoint** — `POST
    api/conflict/enter` using the `ConflictMapSelector` lookup already
    designed in `ARCHITECTURE.md`; returns a snapshot with the selected
    static map and placeholder party/monster entity positions.
32. **Port stub `ConflictView` to the new client** — renders the selected
    map and static positions, no combat loop, matching today's stub state.

---

## Phase 8 — Cutover

33. **Full parity smoke test** — walk every item in `CONTEXT.md`'s "Working
    ✅" list against the new stack end to end.
34. **Remove the legacy stack** — delete `server/`, the old `src/`,
    `drizzle.config.ts`, related npm scripts; promote `client-angular/` and
    `server-dotnet/` to their permanent locations (e.g. repo root or
    `client/`/`server/`).
35. **Update docs to reflect the new stack as current** — flip the "planned
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
