# Post-cutover cleanup plan

Goal: a tidier codebase and a client `game/` folder that is easy to scan, with no
change in behaviour. Branch `cleanup` from `main`. Every step ends with
`dotnet test`, `ng test --watch=false` and `ng build` green, and is one commit.

The findings below come from a read of the code just before the folders were
renamed. Some may already be fixed (you removed `Class1.cs` and two "ported from"
comments), so re-run the greps in step 3 before acting on them.

## Findings

| Area | Finding |
|---|---|
| Client `game/` | 22 files sit directly in `game/`: scenes, views, input, HUD helpers, pure logic and 8 specs, all mixed together. Only `org/` and `menu/` are subfolders, and `menu/` holds one file. |
| `WorldScene` | The largest client file (286 lines). It does three jobs: HUD drawing (border, moon, wind, party panel, log panel), key handling and requests, and applying snapshots. |
| Server tests | `UltimaExodus.Engine.Tests` has 16 test files in one flat folder, and tests Engine, Data and Api (it references all three), so the name is misleading. |
| `Program.cs` | 161 lines: service registration, CORS, migration, and every endpoint inline. |
| `UltimaExodus.Api.http` | Still the template file: its only request is `GET /weatherforecast`, which does not exist. |
| Scaffold leftovers | Possible second `Class1.cs` (Data), empty `game-canvas.html`, `game-canvas.css`, `app.css`, an empty routes array, and a 1-line `styles.css`. |
| Stale comments | About 14 comments refer to "the old build", "phase 2/5" or "step 18" (`StubState.cs`, `HeroDefaults.cs`, `HeroOptions.cs`, `LocationCatalogue.cs`, `RosterService.cs`, `UltimaExodusDbContext.cs`, three test files, `world-scene.ts`, `overworld-view.ts`). |
| `.gitignore` | `--pycache--/` is a typo (should be `__pycache__/`). Vite-era leftovers (`dist-ssr`, `*.local`, npm/yarn/pnpm logs). The last line `dotnet/` has no trailing newline. |
| Build warning | `CS8618` on `TiledMapJson.Name`. |
| Internal names | `client-angular` remains as the project key in `angular.json` (and its two `buildTarget` strings) and as the `name` in `package.json`. |

One correction to what I said earlier: the `dotnet/` line in `.gitignore` is **not**
stray. It ignores the `dotnet/runfile-discovery/` folder that running `dotnet` from
the repo root creates. Keep it and add a comment saying so.

## Decisions (settled)

1. **Specs live in a separate tree**, `client/src/tests/`, mirroring `client/src/app/`.
   Specs import their subject through an alias (`@app/*` in `tsconfig.json`), and
   `skipTests` is set for the component and service schematics so `ng generate` does
   not create colocated specs.
2. **The server test project is renamed** to `UltimaExodus.Tests`, with folders.
3. **Both optional refactors are in** (step 9): the HUD out of `WorldScene`, and a
   split `Program.cs`. `StubState` waits for the dynamic world clock.

## Target client layout

```
client/src/app/game/
  scenes/   intro-scene, main-menu-scene (+ main-menu-actions), world-scene,
            party-organization-scene
  views/    overworld-view, conflict-view, map-view, map-tile, line-of-sight
  hud/      shell-layout, bitmap-text, log-rows, party-rows, assets
  input/    input-service, input-direction, pending-attack
  org/      unchanged (the organisation screens and their forms)
```

Specs do not live here. They move to a mirrored tree:

```
client/src/tests/
  game/   hud/, views/, scenes/, input/, org/   (same folders as src/app/game)
  services/
  app.spec.ts, game-canvas.spec.ts
```

No source folder ends up with more than about ten files. If step 9 extracts the HUD,
`hud/` gains one new file.

## Target server test layout

```
UltimaExodus.Tests/
  Engine/  Conflicts/ (AttackResolver, ConflictMapSelector, MonsterCatalogue)
           Heroes/ (HeroOptions, HeroRules, RosterSnapshot)
           Locations/, Movement/, State/ (PartyStatusBuilder), Terrain/
  Data/    GameStatePersistence, HeroPersistence, LocationCatalogueMap, ConflictMap
  Api/     GameServiceConflict, RosterService
```

The assignments are from file names; check the odd ones (`ConflictMapTests`,
`RosterSnapshotTests`) by opening them.

## Steps

1. **Baseline.** `git checkout -b cleanup`; run `dotnet test`, `ng test --watch=false`,
   `ng build`, and the three check scripts once. Everything is green before you start.
2. **Scaffold leftovers.** Confirm both `Class1.cs` files are gone. Rewrite
   `UltimaExodus.Api.http` with real requests (`/api/health`, `/api/state`, a move,
   `/api/roster`), or delete it. Remove the empty `game-canvas.html`/`.css`,
   `app.css` and `styles.css` if the components do not need them (inline the template
   instead), and decide whether to drop the unused router.
   Commit: `Remove scaffold leftovers`.
3. **Stale comments.** Re-run
   `git grep -n -i "old build\|old stack\|phase [0-9]\|step [0-9]\|ported" -- "*.cs" "*.ts"`
   and rewrite each hit to say what the code does now, or delete the comment.
   Commit: `Remove stale comments`.
4. **`.gitignore`.** Fix `__pycache__/`, drop the Vite leftovers, add a comment on
   `dotnet/`, end the file with a newline. Commit: `Tidy .gitignore`.
5. **`CS8618`.** Add `required` to `TiledMapJson.Name` (or `= ""`), then build.
   Commit: `Fix nullable warning in TiledMapJson`.
6. **Internal names.** Rename the `client-angular` project key and its `buildTarget`
   strings in `angular.json`, and `name` in `package.json` and `package-lock.json`.
   Verify `ng serve`, `ng build` and `ng test` all still work.
   Commit: `Rename the Angular project to client`.
7. **Client folders and specs.**
   - **7a. Alias and trial.** Add `"paths": { "@app/*": ["./src/app/*"] }` to
     `tsconfig.json` and `skipTests: true` for the component and service schematics
     in `angular.json`. Move ONE spec to `src/tests/`, import its subject through
     `@app/...`, and confirm `ng test --watch=false` finds and runs it. If the alias
     does not resolve, stop and settle that before going further.
     Commit: `Client: path alias for specs, schematics skip tests`.
   - **7b to 7e. Source folders**, one commit each: `input/`, `hud/`, `views/`,
     `scenes/`. Move files in the VS Code explorer so it rewrites the imports (check
     `typescript.updateImportsOnFileMove.enabled`). Specs still sit beside their
     source at this point, so the editor updates their imports too. After each move,
     run `ng build` and `ng test --watch=false`.
   - **7f. Move the specs** into `src/tests/`, mirroring the final folders, one
     commit per source folder (`org/`, `services/`, then the rest). Rename imports to
     `@app/...`. The test count must not change.
8. **Server tests.** Move the files into folders (a rename-only commit), then
   rename the project to `UltimaExodus.Tests`: its folder, `.csproj`, the `slnx`
   entry, and the namespaces, in a second commit. Verify with `dotnet test` (the
   count stays at 211).
9. **Refactors, one commit each.**
   - Extract the HUD drawing from `WorldScene` into `hud/hud.ts`. `WorldScene` keeps
     input, requests and snapshot handling.
   - Split `Program.cs`: an extension method for service registration, and one
     extension class per endpoint group (maps and tiles, roster and party, game).
   Behaviour must not change; run the three scripts after each.
10. **Docs.** Update the layout trees in `CONTEXT.md` and `README.md`, and the file
    paths named in `docs/rendering-reference.md` and `ARCHITECTURE.md`. Keep the
    wording as short as it is.
11. **Close out.** Full regression (both test suites, `ng build`, `play` mode in the
    browser, the three scripts), then merge `cleanup` into `main`.

## Risks

- A moved file with a stale import fails `ng build`, so build after every move.
- Specs that mock Phaser use a global `vi.mock('phaser')`, so moving them does not
  change the mock.
- `tsconfig.spec.json` already includes `src/**/*.spec.ts`, so `src/tests/` is picked
  up with no config change. A spec outside `src/` would not be.
- The `@app/*` alias must work under both `ng build` and `ng test`; 7a proves it
  before the bulk move.
- Renaming the test project touches the `slnx`, `.csproj` references and
  namespaces; do it in its own commit so it can be reverted alone.

## Left for later

- Generating the client's TypeScript types from the API's OpenAPI document instead
  of mirroring them by hand (`services/game.ts`, `roster.ts` and others).
- `StubState` and the hardcoded clock: replace together with the dynamic world clock.
