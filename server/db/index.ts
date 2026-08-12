import { router } from './trpc.ts'
import { gameStateRouter } from './routers/game-state.ts'

const appRouter = router({
    gameState: gameStateRouter,
})