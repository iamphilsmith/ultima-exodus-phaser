import { randomUUID } from 'crypto'
import { router, publicProcedure } from '../trpc.ts'
import { db } from '../db/index.ts'
import { heroes } from '../db/schema.ts'
import { HeroCreationSchema } from '../schemas/hero-creation.schema.ts'
import { ROSTER_MAX_SIZE, STARTING_HIT_POINTS } from '../../src/entities/hero.ts'

export const heroRouter = router({
    list: publicProcedure
        .query(() => {
            const all = db.select().from(heroes).all()
            const bySlot = new Map(all.map(h => [h.rosterSlot, h]))
            return Array.from({ length: ROSTER_MAX_SIZE }, (_, slotIndex) => ({
                slotIndex,
                hero: bySlot.get(slotIndex) ?? null,
            }))
        }),

    create: publicProcedure
        .input(HeroCreationSchema)
        .mutation(({ input }) => {
            const all = db.select().from(heroes).all()
            const usedSlots = new Set(all.map(h => h.rosterSlot))

            let rosterSlot = 0
            while (usedSlots.has(rosterSlot) && rosterSlot < ROSTER_MAX_SIZE) rosterSlot++
            if (rosterSlot >= ROSTER_MAX_SIZE) throw new Error('Roster is full')

            const hero = {
                id: randomUUID(),
                rosterSlot,
                ...input,
                maxHitPoints: STARTING_HIT_POINTS,
                hitPoints: STARTING_HIT_POINTS,
                maxMagicPoints: 0, // TODO: vary by class once spellcasting is designed
                magicPoints: 0,
                experience: 0,
                level: 1,
                status: 'good' as const,
                gold: 0,
                food: 0,
                equippedWeaponId: null,
                equippedArmorId: null,
                createdAt: new Date(),
            }

            db.insert(heroes).values(hero).run()
            return hero
        }),
})