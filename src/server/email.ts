/**
 * Turns an Agentboxd message into what Scriptbreaker needs, without trusting any of it.
 * Field names follow the Agentboxd Message type (agentboxd SDK, index.d.ts).
 */

export interface AgentboxdMessage {
  id: string
  direction: 'inbound' | 'outbound'
  from: string
  subject: string | null
  text: string | null
  extracted_text: string | null
  labels: string[]
  received_at: string | null
  created_at: string
  ai?: {
    verification?: { auth_failed?: boolean } | null
    risk?: { injection: number; phishing: number }
  }
  /** Agentboxd screening: `held` mail has its content withheld from agents until a person releases it. */
  screening?: { state?: string; reason?: string | null } | null
}

export interface EmailSummary {
  id: string
  /** Who sent it to the inbox. For a forward, that is the person who forwarded it. */
  from: string
  subject: string
  receivedAt: string
  /** True when the email is a forward; then `originalFrom`/`originalSubject` describe the scam email. */
  forwarded: boolean
  originalFrom?: string
  originalSubject?: string
  /** The text to analyse (the forwarded content for a forward). Untrusted. */
  body: string
  /** Sender failed SPF/DMARC (only meaningful when not forwarded). */
  authFailed: boolean
  /** Agentboxd's prompt-injection probability, 0-1, when available. */
  injection: number | null
  /** Agentboxd's own phishing/scam probability, 0-1: an independent second opinion. */
  phishing: number | null
  /** Hidden instructions aimed at AI tools: we never send this text to our AI. */
  quarantined: boolean
  /** Agentboxd held it (e.g. phishing): content withheld until released in the Agentboxd dashboard. */
  held: boolean
  heldReason?: string
}

const MAX_BODY = 3000
const FORWARD_MARKER = /^-{2,}\s*(forwarded message|original message|message transféré|message d'origine)\s*-{2,}\s*$|^begin forwarded message:?$/im

function headerValue(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`^(?:${name})\\s*:\\s*(.+)$`, 'im'))
  return m?.[1].trim()
}

/** Pull the forwarded email out of a forward: its sender, subject and body. */
export function parseForward(text: string): { from?: string; subject?: string; body: string } | undefined {
  const marker = text.match(FORWARD_MARKER)
  if (!marker || marker.index === undefined) return undefined
  const rest = text.slice(marker.index + marker[0].length).replace(/^\s+/, '')
  // Header block: lines like "From: ...", "Date: ...", "Subject: ...", "To: ..." until the first blank line.
  const split = rest.search(/\r?\n\s*\r?\n/)
  const head = split >= 0 ? rest.slice(0, split) : ''
  const body = split >= 0 ? rest.slice(split).trim() : rest.trim()
  return {
    from: headerValue(head, 'From|De'),
    subject: headerValue(head, 'Subject|Objet'),
    body,
  }
}

export function summariseMessage(m: AgentboxdMessage): EmailSummary {
  const raw = (m.text ?? m.extracted_text ?? '').replace(/\r\n/g, '\n')
  const fwd = parseForward(raw)
  const body = (fwd ? fwd.body : (m.extracted_text ?? raw)).trim().slice(0, MAX_BODY)
  const injection = m.ai?.risk?.injection ?? null
  const labels = m.labels ?? []
  const heldBySubject = m.subject?.match(/^\[held: ([^\]]+)\]/)
  const held = m.screening?.state === 'held' || !!heldBySubject
  return {
    id: m.id,
    from: m.from,
    subject: held ? 'Held by Agentboxd' : (m.subject ?? '(no subject)'),
    receivedAt: m.received_at ?? m.created_at,
    forwarded: !!fwd,
    originalFrom: fwd?.from,
    originalSubject: fwd?.subject,
    body,
    authFailed: labels.includes('spf-fail') || labels.includes('dmarc-fail') || !!m.ai?.verification?.auth_failed,
    injection,
    phishing: m.ai?.risk?.phishing ?? null,
    quarantined: labels.includes('ai:injection-risk') || (injection !== null && injection >= 0.8),
    held,
    heldReason: held ? (m.screening?.reason ?? heldBySubject?.[1] ?? 'suspicious') : undefined,
  }
}
