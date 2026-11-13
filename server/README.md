# server-dotnet — Notes

> Companion notes for the new Angular + C# stack described in
> `ARCHITECTURE.md` and sequenced in `MIGRATION_PLAN.md`. This file tracks
> the operational details (ports, tooling, decisions made along the way)
> that don't belong in either of those documents but need a durable home
> so they aren't rediscovered every session. Covers both `server-dotnet/`
> and `client-angular/` despite the filename/location.

---

## Status

**Phase 0 — Scaffolding. Complete and fully verified**, both locally
(Windows PC) and in a fresh GitHub Codespaces rebuild.

- [x] Step 1 — C# solution scaffolded (`UltimaExodus.slnx`, three projects)
- [x] Step 2 — `/api/health` endpoint live
- [x] Step 3 — Angular workspace scaffolded (`client-angular/`)
- [x] Step 4 — Angular → API wiring
- [x] Step 5 — Empty Phaser mount inside Angular
- [x] Devcontainer rebuild verified — `.NET 10.0.400` and `Angular CLI
      22.1.5` both present, `client-angular/node_modules` installed via
      `postCreateCommand` (not editor auto-install), full run confirmed
      working over Codespaces port forwarding

Both processes (`dotnet run --project UltimaExodus.Api`, `ng serve`) run
side by side, Angular displays the health payload fetched from the C#
API, and a blank Phaser canvas mounts/unmounts cleanly inside an Angular
component. Confirmed working locally *and* in Codespaces. `src/` and
`server/` (old stack) remain untouched throughout.

---

## Ports in use

| Port | Service | Stack | Notes |
|---|---|---|---|
| 3000 | Express + tRPC | Current (old) | Hardcoded in `server/index.ts` |
| 5173 | Vite dev server | Current (old) | Default, proxies `/trpc` → 3000 |
| 5223 | `UltimaExodus.Api` (HTTP) | New | What Angular actually calls in Codespaces — see "Codespaces networking" below |
| 7107 | `UltimaExodus.Api` (HTTPS) | New | What Angular calls for local dev; not used in Codespaces (no need — see below) |
| 4200 | `ng serve` | New | Default Angular CLI port, no collisions found |

---

## Decisions made

### .NET version: pinned to 10.0

Built and confirmed working on .NET 10 (`10.0.400` in Codespaces). The
devcontainer feature is pinned explicitly (`"version": "10.0"`) rather
than left to resolve to whatever's latest at container build time —
reproducibility matters more than always having the newest SDK.

### HTTPS: set up locally, sidestepped in Codespaces

Locally (Windows), a browser-level "always use HTTPS" policy couldn't be
turned off, so the API needed genuine, trusted HTTPS:

- `dotnet dev-certs https --trust` trusts the .NET dev cert at the OS
  level
- Run with `dotnet run --project UltimaExodus.Api --launch-profile https`
  — binds both `https://localhost:7107` and `http://localhost:5223`
- Locally, Angular's `HttpClient` call targets `https://localhost:7107`

In Codespaces this isn't needed at all — GitHub's port-forwarding proxy
terminates TLS itself at the `*.app.github.dev` domain regardless of
which scheme the underlying service speaks, so the plain-HTTP port
(5223) is reachable at a proper `https://` forwarded URL with zero cert
setup. See "Codespaces networking" below for how the client code picks
the right one automatically.

### Launch profile: use `https` explicitly

`launchSettings.json` has both `http` and `https` profiles;
`dotnet run` doesn't reliably default to a predictable one:

```bash
dotnet run --project UltimaExodus.Api --launch-profile https
```

This binds both ports regardless of environment, so the same command
works whether you're then targeting `localhost:7107` (local) or the
forwarded `-5223` URL (Codespaces).

### Codespaces networking — hostname-aware API base URL

Two Codespaces-specific issues had to be solved before Angular could
reach the API from a Codespace, both worth remembering for any future
client-side call to the API (Phase 1's map endpoint will hit the same
pattern):

**1. `localhost` doesn't mean what it means locally.** When the page is
opened via its forwarded `*.app.github.dev` URL, the browser itself is
running on your local machine, not inside the Codespace — so
`https://localhost:7107` in client code tries to reach port 7107 on your
*own* PC, not the Codespace, and fails with `ERR_CONNECTION_REFUSED`.
Fixed by computing the API origin at runtime instead of hardcoding it —
see `app.ts`, `apiBaseUrl()`: when `window.location.hostname` ends in
`.app.github.dev`, swap the `-4200` segment for `-5223` to derive the
API's forwarded hostname; otherwise fall back to
`http://localhost:5223` for local dev.

**2. Forwarded ports default to Private, which blocks cross-origin
`fetch`.** A direct browser navigation to a private forwarded URL works
fine (it carries your GitHub session cookie), but an in-page `fetch()`
from a *different* forwarded origin (4200 calling 5223) does not carry
that cookie by default. GitHub's proxy responds with a 302 to a sign-in
page instead of reaching Kestrel at all — which then surfaces in the
browser as a misleading CORS error, since the sign-in page obviously
doesn't send the API's CORS headers. Fixed by setting the API's ports to
**Public** visibility, either one-off via the Ports panel
(right-click → Port Visibility → Public) or durably via
`devcontainer.json`:

```json
"portsAttributes": {
  "5223": { "visibility": "public" },
  "7107": { "visibility": "public" }
}
```

**Trade-off worth remembering, not just noting:** Public means anyone
with the forwarded URL can hit that port for as long as the Codespace is
running, no GitHub auth required. Fine for a static `/api/health`
payload; worth reconsidering deliberately once Phase 1+ adds endpoints
that do anything more than echo a constant.

**CORS policy also had to widen** beyond the single local origin to
accept the Codespaces domain pattern:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularDev", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            {
                var host = new Uri(origin).Host;
                return host == "localhost" || host.EndsWith(".app.github.dev");
            })
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});
```

### Angular: standalone components, no SSR

`ng new client-angular` was scaffolded with CSS stylesheets, routing
enabled (not used yet), SSR/SSG declined (local-first thin client, no
benefit from SSR), and standalone components (CLI default, no `NgModule`
boilerplate).

`angular.json` also has `"analytics": false` under `cli` — set by the
Angular CLI itself on first run in the Codespace, not a deliberate edit;
harmless, left as-is.

### Angular ↔ Phaser mounting pattern: confirmed

A dedicated `GameCanvas` standalone component owns the `Phaser.Game`
instance directly: created in `ngAfterViewInit()` via a
`@ViewChild(..., { static: true })` div reference, torn down in
`ngOnDestroy()` via `this.game?.destroy(true)` (the `true` also removes
the canvas element from the DOM). Internal resolution 320×192, `zoom: 3`
(960×576 on screen). Phaser pinned to `^4.1.0`, matching the old stack's
version.

### Solution/project layout

`server-dotnet/` and `client-angular/` sit at the repo root as new
top-level folders; neither touches the existing `src/`/`server/` — old
stack keeps running untouched until cutover (Phase 8).
`UltimaExodus.Engine` stays persistence-agnostic (no reference to
`UltimaExodus.Data`); `UltimaExodus.Api` references both and wires them
together.

---

## Devcontainer

`.devcontainer/devcontainer.json` provisions Node 24, Python 3.12, .NET
10, and the Angular CLI, and installs `client-angular/`'s dependencies
explicitly (not relying on the root `npm install`, which doesn't recurse
into nested `package.json` files):

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
  "postCreateCommand": "npm install && npm run db:push && pip install -r requirements.txt && npm install -g @angular/cli && (cd client-angular && npm install)",
  "portsAttributes": {
    "5223": { "visibility": "public" },
    "7107": { "visibility": "public" }
  }
}
```

**Verified against a full rebuild** — `dotnet --version` → `10.0.400`,
`ng version` → CLI `22.1.5`/Node `24.18.0`, `client-angular/node_modules`
populated by `postCreateCommand`, both servers ran and talked to each
other successfully over Codespaces' forwarded ports.

### Gotchas hit along the way

- **`ng serve` doesn't always pick up a newly-`npm install`ed package
  mid-session** (esbuild/Vite caching) — after adding `phaser` locally,
  the dev server kept serving the old bundle until restarted. Restart
  `ng serve` if a new dependency seems to have no effect.
- **Git LFS pre-push hook blocks pushes if `git-lfs` isn't installed in
  the Codespace**, even though this repo doesn't actually use LFS for
  anything (no `.gitattributes` LFS filters). Fix:
  `sudo apt-get install -y git-lfs && git lfs install`. One-time per
  Codespace; harmless to leave installed even though unused.
- **`dotnet` commands run from the repo root (instead of
  `server-dotnet/`) create a stray `dotnet/runfile-discovery/` cache
  folder at the root.** Gitignored now (root `.gitignore`), but the
  better habit is running `dotnet build`/`dotnet run` from inside
  `server-dotnet/` consistently, same as established since Step 1.

---

## Open questions still outstanding

Resolved during Phase 0:
- ~~Angular ↔ Phaser mounting pattern~~
- ~~C# solution/project layout~~
- ~~Local vs. Codespaces networking for client → API calls~~

Still open, out of scope until later phases:
- Effect-type vocabulary — not in scope until combat implementation
  (Phase 7+)
- Whether hero/party state ownership questions from the old architecture
  carry over — not in scope until Phase 5
- Whether the Public port-visibility trade-off (see "Codespaces
  networking" above) needs revisiting once Phase 1 adds real endpoints
  beyond the static health check
