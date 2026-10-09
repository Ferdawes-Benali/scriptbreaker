/**
 * Diagnoses the Agentboxd connection step by step. Prints status codes and Agentboxd's replies, never the key.
 * Run (PowerShell):  npm run inbox-check
 */
const BASE = process.env.AGENTBOXD_BASE_URL ?? 'https://api.agentboxd.com'
const KEY = process.env.AGENTBOXD_API_KEY

async function step(label: string, path: string, init: RequestInit = {}) {
  const t = Date.now()
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    })
    const body = await res.text()
    console.log(`\n[${label}] ${init.method ?? 'GET'} ${path} -> ${res.status} (${Date.now() - t} ms)`)
    console.log(body.slice(0, 500))
    return { status: res.status, json: (() => { try { return JSON.parse(body) } catch { return undefined } })() }
  } catch (e) {
    console.log(`\n[${label}] ${path} -> network error: ${e instanceof Error ? e.message : e}`)
    return { status: 0, json: undefined }
  }
}

async function main() {
  console.log(`Base URL: ${BASE}`)
  console.log(`Key set: ${KEY ? `yes (starts with ${KEY.slice(0, 3)}, length ${KEY.length})` : 'NO - add AGENTBOXD_API_KEY to .env.local'}`)
  if (!KEY) return
  await step('1 list inboxes (checks the key)', '/v1/inboxes?limit=5')
  const created = await step('2 create inbox', '/v1/inboxes', {
    method: 'POST',
    body: JSON.stringify({ username: 'scriptbreaker', display_name: 'Scriptbreaker', client_id: 'scriptbreaker-demo-inbox' }),
  })
  let id = created.json?.id
  if (!id) {
    const retry = await step('2b create inbox without username', '/v1/inboxes', {
      method: 'POST',
      body: JSON.stringify({ display_name: 'Scriptbreaker', client_id: 'scriptbreaker-demo-inbox' }),
    })
    id = retry.json?.id
  }
  if (id) await step('3 list messages', `/v1/inboxes/${id}/messages?limit=5&direction=inbound`)
}

main()
