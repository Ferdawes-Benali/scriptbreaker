import { useCallback, useEffect, useState } from 'react'

/** Mirrors EmailSummary in src/server/email.ts (kept separate so no server code ships to the browser). */
export interface InboxEmail {
  id: string
  from: string
  subject: string
  receivedAt: string
  forwarded: boolean
  originalFrom?: string
  originalSubject?: string
  body: string
  authFailed: boolean
  injection: number | null
  phishing: number | null
  quarantined: boolean
  held: boolean
  heldReason?: string
}

interface Props {
  /** Analyse this email. `offline` = never send it to the AI (quarantined). */
  onAnalyse: (email: InboxEmail) => void
  selectedId?: string
}

function ago(iso: string): string {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  return `${Math.round(min / 60)} h ago`
}

/** Email channel: a shared Agentboxd inbox. Forward a suspicious email there, then analyse it here. */
export function EmailPanel({ onAnalyse, selectedId }: Props) {
  const [address, setAddress] = useState<string>()
  const [emails, setEmails] = useState<InboxEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [copied, setCopied] = useState(false)

  /** Fetch the inbox. Loading state is set by the caller so the first load can run from an effect. */
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setAddress(data.address)
      setEmails(data.emails)
      setError(undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the inbox.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Fetching from an external system on mount is what effects are for; state is only set after the await.
    // oxlint-disable-next-line react/set-state-in-effect
    load()
  }, [load])

  function refresh() {
    setLoading(true)
    setError(undefined)
    load()
  }

  async function copy() {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: the address is still visible to copy by hand */
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        Forward a suspicious email to the address below, then press Check inbox. Scriptbreaker reads it with the same
        scam scripts as a call. This is a shared demo inbox: don't forward personal emails.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <code className="rounded-md border border-rule bg-white px-3 py-2 font-script text-sm">
          {address ?? (loading ? 'Setting up the inbox…' : 'Inbox unavailable')}
        </code>
        {address && (
          <button onClick={copy} className="rounded-md border border-ink px-3 py-2 text-sm font-semibold">
            {copied ? 'Copied' : 'Copy address'}
          </button>
        )}
        <button onClick={refresh} disabled={loading} className="rounded-md bg-ink px-4 py-2 font-semibold text-sheet disabled:opacity-50">
          {loading ? 'Checking…' : 'Check inbox'}
        </button>
      </div>

      {error && <p className="text-sm text-alarm">{error}</p>}
      {!error && address && emails.length === 0 && !loading && (
        <p className="text-sm text-ink-soft">No emails in the last 48 hours. Forward one, wait a few seconds, then check again.</p>
      )}

      {emails.length > 0 && (
        <ul className="divide-y divide-rule rounded-md border border-rule bg-white">
          {emails.map((e) => (
            <li key={e.id} className={`flex flex-wrap items-center gap-3 px-3 py-2 ${selectedId === e.id ? 'bg-cue-soft' : ''}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{e.originalSubject ?? e.subject}</p>
                <p className="truncate text-sm text-ink-soft">
                  {e.forwarded ? `Forwarded · originally from ${e.originalFrom ?? 'unknown'}` : `From ${e.from}`} · {ago(e.receivedAt)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  {e.held && (
                    <span className="rounded-full bg-alarm px-2 py-0.5 font-semibold text-white">
                      Held by Agentboxd ({e.heldReason}) before any AI could read it
                    </span>
                  )}
                  {e.quarantined && (
                    <span className="rounded-full bg-alarm px-2 py-0.5 font-semibold text-white">
                      Hidden instructions for AI tools: quarantined
                    </span>
                  )}
                  {!e.forwarded && e.authFailed && (
                    <span className="rounded-full bg-alarm-soft px-2 py-0.5 text-alarm">Sender failed authentication (possible spoof)</span>
                  )}
                  {e.phishing !== null && (
                    <span className={`rounded-full px-2 py-0.5 ${e.phishing >= 0.5 ? 'bg-alarm-soft text-alarm' : 'bg-paper text-ink-soft'}`}>
                      Agentboxd phishing check: {Math.round(e.phishing * 100)}%
                    </span>
                  )}
                </div>
              </div>
              {e.held && !e.body ? (
                <span className="max-w-56 text-right text-xs text-ink-soft">
                  Release it in your Agentboxd dashboard to read its scam script here.
                </span>
              ) : (
                <button
                  onClick={() => onAnalyse(e)}
                  className="rounded-md border border-ink px-3 py-1.5 text-sm font-semibold hover:bg-paper"
                >
                  Analyse
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
