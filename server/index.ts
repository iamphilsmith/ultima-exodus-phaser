import express from 'express'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { router } from './trpc.ts'
import { gameStateRouter } from './routers/game-state.ts'

const appRouter = router({
    gameState: gameStateRouter,
})

export type AppRouter = typeof appRouter

const app = express()

app.use('/trpc', createExpressMiddleware({ router: appRouter }))

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000')
})