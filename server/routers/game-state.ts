// server/routers/game-state.ts
import { router, publicProcedure } from '../trpc.ts'
import { db } from '../db/index.ts'
import { gameState } from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const gameStateRouter = router({
    load: publicProcedure
        .query(() => {
            return db.select().from(gameState).where(eq(gameState.id, 1)).get()
        }),

    save: publicProcedure
        .input(z.object({
            tileX: z.number(),
            tileY: z.number(),
            mapId: z.string(),
        }))
        .mutation(({ input }) => {
            return db.insert(gameState)
                .values({ id: 1, ...input })
                .onConflictDoUpdate({
                    target: gameState.id,
                    set: input,
                })
                .run()
        }),
})