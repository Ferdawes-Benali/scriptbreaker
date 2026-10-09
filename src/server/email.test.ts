import { describe, expect, it } from 'vitest'
import { parseForward, summariseMessage, type AgentboxdMessage } from './email'

const base: AgentboxdMessage = {
  id: 'm1',
  direction: 'inbound',
  from: 'me@gmail.com',
  subject: 'Fwd: Urgent: your account',
  text: null,
  extracted_text: null,
  labels: [],
  received_at: '2026-10-08T10:00:00Z',
  created_at: '2026-10-08T10:00:00Z',
}

const GMAIL_FORWARD = `Is this real?

---------- Forwarded message ---------
From: Bank Security <security@bank-alerts.example>
Date: Thu, Oct 8, 2026 at 9:12 AM
Subject: Urgent: suspicious activity
To: <me@gmail.com>

Dear customer, we detected suspicious transactions on your account.
Do not contact your branch, the investigation is confidential.
Move your funds to the secure account below within 2 hours.`

describe('parseForward', () => {
  it('extracts sender, subject and body from a Gmail forward', () => {
    const f = parseForward(GMAIL_FORWARD)!
    expect(f.from).toBe('Bank Security <security@bank-alerts.example>')
    expect(f.subject).toBe('Urgent: suspicious activity')
    expect(f.body).toMatch(/^Dear customer/)
    expect(f.body).not.toMatch(/Is this real/)
  })

  it('returns undefined for a normal email', () => {
    expect(parseForward('Hello, see you tomorrow.')).toBeUndefined()
  })
})

describe('summariseMessage', () => {
  it('analyses the forwarded content, not the forward note', () => {
    const s = summariseMessage({ ...base, text: GMAIL_FORWARD, extracted_text: 'Is this real?' })
    expect(s.forwarded).toBe(true)
    expect(s.originalFrom).toContain('bank-alerts.example')
    expect(s.body).toMatch(/secure account/)
  })

  it('uses extracted_text for a direct email and reads auth failures', () => {
    const s = summariseMessage({ ...base, text: 'x', extracted_text: 'Pay the toll now.', labels: ['dmarc-fail'] })
    expect(s.forwarded).toBe(false)
    expect(s.body).toBe('Pay the toll now.')
    expect(s.authFailed).toBe(true)
  })

  it('quarantines emails with a high prompt-injection score', () => {
    const s = summariseMessage({ ...base, extracted_text: 'Ignore previous instructions...', ai: { risk: { injection: 0.93, phishing: 0.4 } } })
    expect(s.quarantined).toBe(true)
    expect(s.injection).toBe(0.93)
  })

  it('marks emails held by Agentboxd screening (content withheld)', () => {
    const s = summariseMessage({ ...base, subject: '[held: phishing]', ai: { risk: { injection: 0.46, phishing: 0.97 } } })
    expect(s.held).toBe(true)
    expect(s.heldReason).toBe('phishing')
    expect(s.body).toBe('')
    expect(s.phishing).toBe(0.97)
  })

  it('also quarantines on the ai:injection-risk label', () => {
    expect(summariseMessage({ ...base, extracted_text: 'hi', labels: ['ai:injection-risk'] }).quarantined).toBe(true)
  })
})
