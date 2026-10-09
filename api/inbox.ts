import { summariseMessage, type AgentboxdMessage } from '../src/server/email.js'

/**
 * Vercel Function: GET /api/inbox
 * Ensures the shared Scriptbreaker demo inbox exists on Agentboxd and returns its address
 * plus the latest inbound emails, summarised. The Agentboxd key never leaves the server.
 */

const BASE = process.env.AGENTBOXD_BASE_URL ?? 'https://api.agentboxd.com'
const CLIENT_ID = 'scriptbreaker-demo-inbox'
const MAX_AGE_MS = 48 * 3600 * 1000

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${process.env.AGENTBOXD_API_KEY}`,
      'content-type': 'application/json',
      ...init.headers,
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    // Log which call failed and Agentboxd's own error text (never the key), so failures are diagnosable.
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    throw Object.assign(new Error(`Agentboxd ${init.method ?? 'GET'} ${path} -> ${res.status} ${detail}`), { status: res.status })
  }
  return (await res.json()) as T
}

interface Inbox {
  id: string
  address: string
}

/** Idempotent on client_id. If the nice username is taken, Agentboxd picks a readable one. */
async function ensureInbox(): Promise<Inbox> {
  try {
    return await call<Inbox>('/v1/inboxes', {
      method: 'POST',
      body: JSON.stringify({ username: 'scriptbreaker', display_name: 'Scriptbreaker', client_id: CLIENT_ID }),
    })
  } catch (e) {
    if ((e as { status?: number }).status !== 409) throw e
    return call<Inbox>('/v1/inboxes', {
      method: 'POST',
      body: JSON.stringify({ display_name: 'Scriptbreaker', client_id: CLIENT_ID }),
    })
  }
}

/**
 * Seeing held mail needs the `messages:release` permission. Our demo key deliberately does not have it
 * (a public demo should not be able to release phishing), so we fall back to the screened list.
 */
async function listMessages(inboxId: string): Promise<{ data: AgentboxdMessage[] }> {
  const base = `/v1/inboxes/${inboxId}/messages?limit=10&direction=inbound`
  try {
    return await call(`${base}&include_held=true`)
  } catch (e) {
    if ((e as { status?: number }).status !== 403) throw e
    return call(base)
  }
}

export async function GET(): Promise<Response> {
  if (!process.env.AGENTBOXD_API_KEY) return json(503, { error: 'The email channel is not configured on this server.' })
  try {
    const inbox = await ensureInbox()
    const list = await listMessages(inbox.id)
    const now = Date.now()
    const emails = list.data
      .filter((m) => m.direction === 'inbound')
      .filter((m) => !(m.labels ?? []).includes('agentboxd:welcome'))
      .filter((m) => now - Date.parse(m.received_at ?? m.created_at) < MAX_AGE_MS)
      .map(summariseMessage)
    return json(200, { address: inbox.address, emails })
  } catch (e) {
    console.error('inbox failed', e instanceof Error ? e.message : e)
    return json(502, { error: 'Could not reach the email inbox right now.' })
  }
}
