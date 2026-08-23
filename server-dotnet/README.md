# server-dotnet — Notes

> Companion notes for the new Angular + C# stack described in
> `ARCHITECTURE.md` and sequenced in `MIGRATION_PLAN.md`. This file tracks
> the operational details (ports, tooling, decisions made along the way)
> that don't belong in either of those documents but need a durable home
> so they aren't rediscovered every session.

---

## Status

**Phase 0 — Scaffolding. Complete.** See `MIGRATION_PLAN.md` for the
full step list and what Phase 1 covers next.

- [x] Step 1 — C# solution scaffolded (`UltimaExodus.sln`, three projects)
- [x] Step 2 — `/api/health` endpoint live
- [x] Step 3 — Angular workspace scaffolded (`client-angular/`)
- [x] Step 4 — Angular → API wiring
- [x] Step 5 — Empty Phaser mount inside Angular

Both processes (`dotnet run --project UltimaExodus.Api`, `ng serve`) run
side by side, Angular displays the health payload fetched from the C#
API, and a blank Phaser canvas mounts/unmounts cleanly inside an Angular
component. `src/` and `server/` (old stack) remain untouched throughout.

**Not yet done:** commit + merge this branch, then rebuild the Codespace
to validate the devcontainer changes end-to-end (see "Devcontainer"
section below — this is the one unverified piece of Phase 0).

---

## Ports in use

Tracking every port across both stacks (old and new) to avoid collisions
as the new stack grows.

| Port | Service | Stack | Notes |
|---|---|---|---|
| 3000 | Express + tRPC | Current (old) | Hardcoded in `server/index.ts` |
| 5173 | Vite dev server | Current (old) | Default, proxies `/trpc` → 3000 |
| 5223 | `UltimaExodus.Api` (HTTP) | New | Bound but not what Angular calls; useful for `curl` testing |
| 7107 | `UltimaExodus.Api` (HTTPS) | New | What Angular actually calls — see below |
| 4200 | `ng serve` | New | Default Angular CLI port, no collisions found |

---

## Decisions made

### .NET version: pinned to 10.0

Built and confirmed working on .NET 10. The devcontainer feature is
pinned to this version explicitly (`"version": "10.0"`) rather than left
to resolve to whatever's latest at container build time — reproducibility
matters more than always having the newest SDK for a project like this.

### HTTPS: set up in full, not deferred

Originally planned to skip TLS for Phase 0 and drop
`app.UseHttpsRedirection()` (see Step 2 history). That held until Step 4,
where the Angular dev server's origin turned out to be affected by a
browser policy that force-upgrades outbound `fetch`/`XHR` calls to HTTPS
regardless of what scheme the code requests. Since that policy couldn't
be changed on the affected machine, the fix was to set up HTTPS properly
rather than fight it:

- `dotnet dev-certs https --trust` — trusts the .NET dev cert at the OS
  level (Windows: triggers a one-time confirmation dialog)
- Run the API with `dotnet run --project UltimaExodus.Api --launch-profile https`
  — binds both `https://localhost:7107` and `http://localhost:5223`
- Angular's `HttpClient` call points at `https://localhost:7107/api/health`

Both schemes were confirmed working once the cert was trusted; HTTPS
(7107) is the one in active use. HTTP (5223) is left available for quick
`curl` checks. CORS policy is unaffected either way — it's scoped by the
Angular *page's* origin (`http://localhost:4200`), not by which scheme
the API call uses.

### Launch profile: use `https` explicitly

`launchSettings.json` has both `http` and `https` profiles.
`dotnet run --project UltimaExodus.Api` doesn't reliably default to a
predictable one across environments, so run it explicitly:

```bash
dotnet run --project UltimaExodus.Api --launch-profile https
```

### Angular: standalone components, no SSR

`ng new client-angular` was scaffolded with:
- CSS stylesheets (no SCSS — no current need for it)
- Routing enabled (not used yet, but the eventual menu → party-org →
  overworld screen flow will want it)
- SSR/SSG declined — this is a local-first, single-player thin client per
  `ARCHITECTURE.md`; server-side rendering has no benefit here
- Standalone components (Angular CLI default) — no `NgModule`
  boilerplate

### Angular ↔ Phaser mounting pattern: confirmed

A dedicated `GameCanvas` standalone component owns the `Phaser.Game`
instance directly:
- Created in `ngAfterViewInit()`, targeting a plain `<div #gameContainer>`
  via `@ViewChild(..., { static: true })`
- Torn down in `ngOnDestroy()` via `this.game?.destroy(true)` — the
  `true` argument also removes the canvas element from the DOM, not just
  the internal Phaser state, avoiding orphaned canvases across
  mount/destroy cycles
- Internal resolution 320×192, `zoom: 3` (960×576 on screen), matching
  the existing constant used elsewhere in the project
- Phaser pinned to `^4.1.0`, matching the version already used by the old
  stack (`package.json`), to avoid divergence mid-migration

Confirmed working: blank black canvas renders at the correct size inside
Angular, no console errors, survives repeated refreshes.

### Solution/project layout

`server-dotnet/` sits at the repo root as a new top-level folder,
alongside `client-angular/`. Neither touches the existing `src/`/`server/`
— per the migration plan's ground rule, the old stack keeps running
untouched until cutover (Phase 8).

`UltimaExodus.Engine` is kept persistence-agnostic — it does not
reference `UltimaExodus.Data`. `UltimaExodus.Api` references both and
wires them together. This keeps game rules (`Engine`) testable and
reusable independent of how state is persisted.

---

## Devcontainer

`.devcontainer/devcontainer.json` provisions Node 24, Python 3.12, .NET
10, and the Angular CLI. Current full config:

```json
{
  "name": "Ultima Exodus Dev",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:24",
  "features": {
    "ghcr.io/devcontainers/features/python:1": {
      "version": "3.12"
    },
    "ghcr.io/devcontainers/features/dotnet:2": {
      "version": "10.0"
    }
  },
  "postCreateCommand": "npm install && npm run db:push && pip install -r requirements.txt && npm install -g @angular/cli"
}
```

**Not yet verified against a fresh Codespace build** — all of Phase 0 was
developed locally (Windows PC), not in Codespaces. Next step: commit and
merge this branch, then rebuild the Codespace once to confirm a clean
environment picks up .NET, the Angular CLI, and both new projects with no
manual steps.

**Known gap to check at that rebuild:** the top-level `npm install` in
`postCreateCommand` will not install `client-angular/`'s dependencies —
that's a separate `package.json` in its own folder. Likely fix: extend
`postCreateCommand` with something like
`&& (cd client-angular && npm install)`. Not yet applied since this
hasn't been validated end-to-end.

**Gotcha to watch for during that rebuild:** `ng serve` (esbuild/Vite
under the hood) doesn't always pick up a newly-`npm install`ed package
mid-session — after adding `phaser` locally, the dev server kept serving
the old bundle until restarted. If Phaser or any new dependency seems to
have no effect after installing it in a fresh container, restart
`ng serve` before assuming something's actually broken.

---

## Open questions still outstanding

Carried over from `ARCHITECTURE.md`'s "Open questions / not yet decided"
— resolved during Phase 0:

- ~~Angular ↔ Phaser mounting pattern~~ — resolved above
- ~~C# solution/project layout~~ — resolved above

Still open, out of scope until later phases:

- Effect-type vocabulary — not in scope until combat implementation
  (Phase 7+)
- Whether hero/party state ownership questions from the old architecture
  carry over — not in scope until Phase 5
