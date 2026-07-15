import { router, publicProcedure } from '../trpc.ts'
import { db } from '../db/index.ts'
import { heroes } from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const heroRouter = router({
    load: publicProcedure
        .query(() => {
            return db.select().from(heroes).where(eq(heroes.id, 'player')).get()
        }),

    save: publicProcedure
        .input(z.object({
            tileX: z.number(),
            tileY: z.number(),
            mapId: z.string(),
        }))
        .mutation(({ input }) => {
            return db.insert(heroes)
                .values({ id: 'player', ...input })
                .onConflictDoUpdate({
                    target: heroes.id,
                    set: input,
                })
                .run()
        }),
})