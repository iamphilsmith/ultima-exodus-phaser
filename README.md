# Ultima Exodus

A reimplementation of Ultima III: Exodus. An Angular/Phaser client draws the game;
a C# ASP.NET Core server owns the rules and the saved state.

## Stack

- Client: Angular 22, Phaser 4, TypeScript (`client/`)
- Server: ASP.NET Core minimal API on .NET 10, EF Core with SQLite (`server/`)
- Tests: xUnit (server), Angular's test runner (client)

## Layout

```
client/     Angular app; game scenes live in src/app/game
server/     UltimaExodus.slnx
  UltimaExodus.Api/            HTTP endpoints, startup, the database file
  UltimaExodus.Engine/         Game rules
  UltimaExodus.Data/           EF Core persistence, map JSON sources
  UltimaExodus.Engine.Tests/   xUnit tests
assets/     Authoring sources: Tiled maps, sprite sheets, Python tools, reference
docs/       Rendering and dungeon-view specifications
scripts/    PowerShell checks that run against a live API
```

## Running

First time: `cd client && npm install`. You need the .NET 10 SDK and the Angular CLI.
Python 3 with Pillow (`requirements.txt`) is only needed for the tools in `assets/`.

**Dev mode** (two processes; the client reloads as you edit):

```
cd server/UltimaExodus.Api
dotnet run                     # API on http://localhost:5223

cd client
ng serve                       # game on http://localhost:4200
```

**Play mode** (one process, the production setup):

```
cd client
ng build                       # writes into server/UltimaExodus.Api/wwwroot

cd server/UltimaExodus.Api
dotnet run --launch-profile play   # game and API on http://localhost:5223
```

Run the API from inside `UltimaExodus.Api/`: the SQLite file `ultima-exodus.db`
is created in the working directory.

Other launch profile: `http-noclip` walks through solid tiles (Development only;
play mode ignores it).

**Reset the game:** stop the API and delete `ultima-exodus.db*`.

## Tests

```
cd server && dotnet test
cd client && ng test --watch=false
```

`scripts/` holds three checks against a running API. `party-check.ps1` needs a
fresh database; `parity-check.ps1` and `conflict-check.ps1` need the `http-noclip`
profile. Each script's header says how to run it.

## More

- `CONTEXT.md`: where things stand, conventions, gotchas, deferred work
- `ARCHITECTURE.md`: how client and server divide the work, endpoints, data
- `docs/`: rendering reference and dungeon-view specifications