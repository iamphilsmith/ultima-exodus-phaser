# Ultima Exodus

A single-player RPG built with Phaser 4 and TypeScript, inspired by the classic Ultima series.

Original game had the following dimensions. 
// Left border: 8 px
// map = 11 x 16 = 176 px
// divider: 8px
// width of action log and character info: 15 x 8 = 120 px
// Right border: 8 px
// Total: 8 + 176 + 8 + 120 + 8 = 320 px wide

// Vertical
// Top border: 8 px
// map = 11 x 16 = 176 px
// Bottom border: 8 px
// Total: 8 + 176 + 8 = 192 px tall


## Tech Stack

| Layer | Technology |
|---|---|
| Game engine | Phaser 4 |
| Language | TypeScript |
| Frontend bundler | Vite |
| Backend server | Express + tRPC |
| Database | SQLite via Drizzle ORM |

---

## Project Structure

```
root/
  assets/           # Maps, sprites, tilesets
  src/              # Phaser client code
    data/           # Predefined game data (races, classes, sex, conflict maps, world locations)
    entities/       # Pure data types (Hero, Party) — no Phaser dependency
    lib/            # Client utilities (tRPC client, action log)
    mapviews/       # MapView implementations (Intro, Overworld, Town, Conflict)
    orgviews/       # OrgView implementations for "Organize a Party" (register, create, form, terminate)
      input/        # Shared typed-input primitives (NumericLineInput, TextLineInput)
    scenes/         # Phaser scenes (Intro, MainMenu, PartyOrganization, World)
    services/       # Input handling (InputService, InputDirection)
    types/          # Shared TypeScript types
    ui/             # Shared bitmap-font text rendering helpers
    world/          # Shared Phaser rendering objects (PartyAvatar)
  server/           # Express + tRPC backend
    db/             # Drizzle client and schema
    routers/        # tRPC routers (gameState, hero, party)
    schemas/        # Zod validation schemas shared by routers (hero-creation, etc.)
  migrations/       # Auto-generated DB migration files
  game.db           # SQLite database file (created on first db:push)
  drizzle.config.ts # Drizzle ORM configuration
  vite.config.ts    # Vite bundler configuration
```

---

## Commands

### Development

```bash
npm run dev
```
Starts both the Vite client and Express server concurrently. This is the main command for development.
- Vite client runs on `http://localhost:5173`
- Express/tRPC server runs on `http://localhost:3000`
- Vite proxies all `/trpc` requests to the Express server, avoiding CORS issues

```bash
npm run dev:client
```
Starts only the Vite development server (Phaser frontend). Use this if the backend is already running separately.

```bash
npm run dev:server
```
Starts only the Express + tRPC backend server using `tsx` (TypeScript runner — no build step required). Use this if you want to restart the server independently of the client.

Note: if starting in Codespaces, you'll need to access the url by looking for the "Ports" tab in the bottom row of the VS Code instance. The url will have a port of 5173.

---

### Database

```bash
npm run db:push
```
Syncs your Drizzle schema (`server/db/schema.ts`) directly to `game.db` without generating migration files. Use this during development when you change the schema and want to apply it immediately. Creates `game.db` if it does not exist.

**Note:** `db:push` recreates a table (rather than a simple `ALTER TABLE`) for some changes, which can fail with `SQLITE_CONSTRAINT_FOREIGNKEY` if other tables hold a foreign key into it (e.g. adding a column to `heroes`, which `heroInventory` and `partySlots` both reference). If you hit this, apply the column addition manually via a one-off `better-sqlite3` script instead, then re-run `db:push` to confirm it reports "No changes detected."

```bash
npm run db:generate
```
Generates a SQL migration file in the `migrations/` folder based on changes to `server/db/schema.ts`. Use this if you want to keep an audit trail of schema changes rather than pushing directly. Run `db:push` or apply the migration manually after generating.

---

## First Time Setup

```bash
# Install dependencies
npm install

# Create the database and apply schema
npm run db:push

# Start the game
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## Save System

Party position (`tileX`, `tileY`, `mapId`) is stored in a single-row `game_state` table, separate from hero data, and is automatically saved after every overworld move. On page load, the party's last position is restored from the database. There is no manual save required.

Hero/roster data (stats, equipment, etc.) is saved immediately on each mutation (character creation, termination, party formation) rather than on a timer — there's no separate "save the roster" step.

---

## Party & Roster System

Accessible from the Main Menu via "Organize a Party."

- **Roster**: up to 20 hero slots (`ROSTER_MAX_SIZE`), each identified by a stable "Entry#" (1–20) shown throughout the UI. Creating a character fills the lowest free slot; terminating a character frees it for reuse.
- **Active Party**: exactly 4 roster members, tracked in a separate `party_slots` table. Only one party can be active at a time — it must be dispersed before a new one can be formed.
- **Termination is a soft delete**: terminated heroes are flagged (`terminated`) rather than removed from the database, so character data can potentially be restored later. A hero currently in the active party cannot be terminated.
- Race, class, and sex each have a single-letter initial (e.g. `MHF` = Male/Human/Fighter) used in compact displays like the register; full names are used during character creation.

Sub-screens live in `src/orgviews/`, each implementing the shared `OrgView` interface (`load`/`teardown`), following the same pattern as `MapView` implementations in `src/mapviews/`.