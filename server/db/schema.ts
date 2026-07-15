import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const heroes = sqliteTable('heroes', {
    id:    text('id').primaryKey(),
    tileX: integer('tileX').notNull().default(2),
    tileY: integer('tileY').notNull().default(1),
    mapId: text('mapId').notNull().default('world'),
})

export type HeroState = typeof heroes.$inferSelect