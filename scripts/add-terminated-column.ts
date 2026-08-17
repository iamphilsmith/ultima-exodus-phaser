// scripts/add-terminated-column.ts
import Database from 'better-sqlite3'

const db = new Database('./game.db')
db.exec(`ALTER TABLE heroes ADD COLUMN terminated INTEGER NOT NULL DEFAULT 0`)
db.close()

console.log('Added terminated column to heroes')