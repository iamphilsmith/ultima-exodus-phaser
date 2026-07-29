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
    entities/       # Game objects (Hero, etc.)
    lib/            # Client utilities (tRPC client, action log)
    scenes/         # Phaser scenes (WorldScene, etc.)
    types/          # Shared TypeScript types
  server/           # Express + tRPC backend
    db/             # Drizzle client and schema
    routers/        # tRPC routers (hero, etc.)
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

Hero position is automatically saved to `game.db` after every move. On page load, the hero's last position is restored from the database. There is no manual save required.
