// server/routers/party.ts
import { router, publicProcedure } from '../trpc.ts'
import { db } from '../db/index.ts'
import { partySlots, heroes } from '../db/schema.ts'
import { z } from 'zod'
import { inArray } from 'drizzle-orm'

export const partyRouter = router({
    getActive: publicProcedure
        .query(() => {
            const slots = db.select().from(partySlots).all()
            return slots.filter(s => s.heroId !== null)
        }),

    disperse: publicProcedure
        .mutation(() => {
            db.delete(partySlots).run()
            return { success: true }
        }),
    
    form: publicProcedure
        .input(z.object({
            // rosterSlots are the 1-based Entry# numbers the player typed in.
            rosterSlots: z.array(z.number().int().min(1).max(20)).length(4),
        }))
        .mutation(({ input }) => {
            const existing = db.select().from(partySlots).all().filter(s => s.heroId !== null)
            if (existing.length > 0) {
                throw new Error('A party is already formed — disperse it first')
            }

            const unique = new Set(input.rosterSlots)
            if (unique.size !== 4) {
                throw new Error('Each roster position must be different')
            }

            // rosterSlots in the DB are 0-based; the UI shows 1-based Entry# numbers.
            const zeroBased = input.rosterSlots.map(n => n - 1)
            const found = db.select().from(heroes).where(inArray(heroes.rosterSlot, zeroBased)).all()

            if (found.length !== 4) {
                throw new Error('One or more roster positions are empty')
            }

            db.delete(partySlots).run()
            const bySlot = new Map(found.map(h => [h.rosterSlot, h]))
            const rows = zeroBased.map((rosterSlot, partySlotIndex) => ({
                slotIndex: partySlotIndex,
                heroId: bySlot.get(rosterSlot)!.id,
            }))
            db.insert(partySlots).values(rows).run()

            return rows
        }),
})