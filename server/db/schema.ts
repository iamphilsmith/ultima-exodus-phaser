import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const heroes = sqliteTable('heroes', {
  id: text('id').primaryKey(),
  rosterSlot: integer('roster_slot').notNull(),
  terminated: integer('terminated', { mode: 'boolean' }).notNull().default(false),
  name: text('name').notNull(),
  sex: text('sex').notNull(),
  race: text('race').notNull(),
  class: text('class').notNull(),
  strength: integer('strength').notNull(),
  dexterity: integer('dexterity').notNull(),
  intelligence: integer('intelligence').notNull(),
  wisdom: integer('wisdom').notNull(),
  maxHitPoints: integer('max_hit_points').notNull().default(100),
  maxMagicPoints: integer('max_magic_points').notNull(),
  hitPoints: integer('hit_points').notNull().default(100),
  magicPoints: integer('magic_points').notNull(),
  experience: integer('experience').notNull().default(0),
  level: integer('level').notNull().default(1),
  status: text('status').notNull().default('good'),
  gold: integer('gold').notNull().default(0),
  food: integer('food').notNull().default(0),
  equippedWeaponId: text('equipped_weapon_id'),
  equippedArmorId: text('equipped_armor_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const heroInventory = sqliteTable('hero_inventory', {
  id: text('id').primaryKey(),
  heroId: text('hero_id').notNull().references(() => heroes.id),
  itemId: text('item_id').notNull(),
  quantity: integer('quantity').notNull().default(1),
  equipped: integer('equipped', { mode: 'boolean' }).notNull().default(false),
});

export const partySlots = sqliteTable('party_slots', {
  slotIndex: integer('slot_index').primaryKey(), // 0–3, single active party
  heroId: text('hero_id').references(() => heroes.id),
});

export const gameState = sqliteTable('game_state', {
  id: integer('id').primaryKey(),  // always 1 — single-row table
  tileX: integer('tile_x').notNull(),
  tileY: integer('tile_y').notNull(),
  mapId: text('map_id').notNull(),
});

export type HeroState = typeof heroes.$inferSelect