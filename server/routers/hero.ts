import { randomUUID } from 'crypto'
import { router, publicProcedure } from '../trpc.ts'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.ts'
import { heroes, partySlots } from '../db/schema.ts'
import { HeroCreationSchema } from '../schemas/hero-creation.schema.ts'
import { ROSTER_MAX_SIZE, STARTING_HIT_POINTS } from '../../src/entities/hero.ts'

export const heroRouter = router({
    list: publicProcedure
        .query(() => {
            const all = db.select().from(heroes).where(eq(heroes.terminated, false)).all()
            const bySlot = new Map(all.map(h => [h.rosterSlot, h]))
            return Array.from({ length: ROSTER_MAX_SIZE }, (_, slotIndex) => ({
                slotIndex,
                hero: bySlot.get(slotIndex) ?? null,
            }))
        }),

    create: publicProcedure
        .input(HeroCreationSchema)
        .mutation(({ input }) => {
            const all = db.select().from(heroes).where(eq(heroes.terminated, false)).all()
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

        terminate: publicProcedure
        .input(z.object({
            rosterSlot: z.number().int().min(1).max(ROSTER_MAX_SIZE), // 1-based Entry# from the UI
        }))
        .mutation(({ input }) => {
            const zeroBased = input.rosterSlot - 1

            const hero = db.select().from(heroes)
                .where(and(eq(heroes.rosterSlot, zeroBased), eq(heroes.terminated, false)))
                .get()

            if (!hero) {
                return { status: 'empty' as const }
            }

            const inParty = db.select().from(partySlots)
                .where(eq(partySlots.heroId, hero.id))
                .get()

            if (inParty) {
                return { status: 'in_party' as const }
            }

            db.update(heroes).set({ terminated: true }).where(eq(heroes.id, hero.id)).run()
            return { status: 'terminated' as const, rosterSlot: input.rosterSlot }
        }),
})