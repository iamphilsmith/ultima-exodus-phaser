import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/trpc': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  optimizeDeps: {
        exclude: ['phaser']
  }
})