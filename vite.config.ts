/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/**
 * Local dev only: serve the Vercel functions in /api from `npm run dev`,
 * so we don't need the Vercel CLI. In production Vercel runs /api itself.
 */
function localApi(): Plugin {
  return {
    name: 'local-api',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v

      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/([a-z-]+)$/)
        if (!match || req.method !== 'POST') return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.ts`)
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const response: Response = await mod.POST(
            new Request(`http://localhost${req.url}`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: Buffer.concat(chunks).toString(),
            }),
          )
          res.statusCode = response.status
          res.setHeader('content-type', 'application/json')
          res.end(await response.text())
        } catch (e) {
          server.config.logger.error(String(e))
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'local api error' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApi()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'eval/**/*.test.ts'],
  },
})
