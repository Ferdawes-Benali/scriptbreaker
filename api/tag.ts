import { z } from 'zod'
import { configFromEnv, tagLine } from '../src/server/tagger.js'

/** Vercel Function: POST /api/tag  { text, context? }  ->  { tag, model, ms } */

const BodySchema = z.object({
  text: z.string().min(1).max(600),
  context: z
    .array(z.object({ speaker: z.enum(['them', 'me']), text: z.string().max(600) }))
    .max(4)
    .optional(),
})

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

export async function POST(request: Request): Promise<Response> {
  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await request.json())
  } catch {
    return json(400, { error: 'Body must be { text: string (1-600 chars), context?: [...] }' })
  }

  try {
    const result = await tagLine(configFromEnv(process.env), body)
    return json(200, result)
  } catch (e) {
    // Never echo provider errors (they can contain request details). Log server-side only.
    console.error('tag failed', e instanceof Error ? e.message : e)
    return json(502, { error: 'Tagger unavailable' })
  }
}
