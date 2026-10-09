import { describe, expect, it } from 'vitest'
import { PLAYBOOKS, STAGE_REFS } from './playbooks'
import { DEMOS, type Demo } from './demos'
import { PREDICTION_THRESHOLD, runEngine } from './engine'
import { keywordTag } from './keywordTagger'
import type { TaggedUtterance } from './types'

const demo = (id: string): Demo => DEMOS.find((d) => d.id === id)!

/** Build tagged utterances from the hand-written "expect" labels (a perfect tagger). */
function perfectTags(d: Demo, upTo = d.lines.length): TaggedUtterance[] {
  return d.lines.slice(0, upTo).map((l, i) => ({
    id: i,
    speaker: l.speaker,
    text: l.text,
    source: 'keywords',
    tag: { tactics: l.legit ? ['official_channel'] : [], stages: l.expect ?? [], quote: '' },
  }))
}

/** Build tagged utterances with the offline keyword tagger. */
function keywordTags(d: Demo, upTo = d.lines.length): TaggedUtterance[] {
  return d.lines.slice(0, upTo).map((l, i) => ({
    id: i,
    speaker: l.speaker,
    text: l.text,
    source: 'keywords',
    tag: keywordTag(l.text, PLAYBOOKS),
  }))
}

describe('playbooks', () => {
  it('loads three valid playbooks', () => {
    expect(PLAYBOOKS.map((p) => p.id)).toEqual(['bank_safe_account', 'family_emergency', 'government_fine'])
  })

  it('every money stage is never the first stage', () => {
    for (const p of PLAYBOOKS) {
      expect(p.stages[0].tactics).not.toContain('money_movement')
    }
  })

  it('demo labels only use stage refs that exist', () => {
    for (const d of DEMOS) for (const l of d.lines) for (const ref of l.expect ?? []) expect(STAGE_REFS).toContain(ref)
  })
})

describe('engine with perfect tags', () => {
  it('Gate A: bank scam reaches stage 4 and predicts the transfer before it is said', () => {
    // Up to and including the isolation line (index 3), before the transfer line.
    const r = runEngine(PLAYBOOKS, perfectTags(demo('bank_scam'), 4))
    expect(r.leader?.playbookId).toBe('bank_safe_account')
    expect(r.leader!.maxStage).toBeGreaterThanOrEqual(3) // 0-based index 3 = 4th stage
    expect(r.risk).toBeGreaterThanOrEqual(PREDICTION_THRESHOLD)
    expect(r.prediction?.stageId).toBe('safe_account_transfer')
    expect(r.prediction?.expectedAsk).toMatch(/move your money/i)
  })

  it('marks the prediction as fulfilled when the transfer line arrives', () => {
    const r = runEngine(PLAYBOOKS, perfectTags(demo('bank_scam'), 6))
    const transfer = r.history.find((p) => p.stageId === 'safe_account_transfer')
    expect(transfer?.fulfilledBy).toBe(5)
  })

  it('full bank scam ends with high risk', () => {
    const r = runEngine(PLAYBOOKS, perfectTags(demo('bank_scam')))
    expect(r.risk).toBeGreaterThanOrEqual(80)
  })

  it('family scam predicts the urgent payment after the secrecy line', () => {
    const r = runEngine(PLAYBOOKS, perfectTags(demo('family_emergency'), 3))
    expect(r.leader?.playbookId).toBe('family_emergency')
    expect(r.prediction?.stageId).toBe('urgent_payment')
  })

  it('legitimate bank alert stays below the prediction threshold', () => {
    const r = runEngine(PLAYBOOKS, perfectTags(demo('legit_bank')))
    expect(r.risk).toBeLessThan(PREDICTION_THRESHOLD)
    expect(r.prediction).toBeUndefined()
  })

  it('ignores lines spoken by "me"', () => {
    const tags = perfectTags(demo('bank_scam')).map((u) => ({ ...u, speaker: 'me' as const }))
    expect(runEngine(PLAYBOOKS, tags).risk).toBe(0)
  })

  it('counts a stage only once', () => {
    const one = perfectTags(demo('bank_scam'), 1)
    const twice = [...one, { ...one[0], id: 1 }]
    expect(runEngine(PLAYBOOKS, twice).risk).toBe(runEngine(PLAYBOOKS, one).risk)
  })

  it('a money demand with no build-up still scores, but less than the full script', () => {
    const d = demo('bank_scam')
    const jump = perfectTags(d).filter((_, i) => i === 5)
    const r = runEngine(PLAYBOOKS, jump)
    expect(r.risk).toBeGreaterThan(0)
    expect(r.risk).toBeLessThan(runEngine(PLAYBOOKS, perfectTags(d)).risk)
  })
})

describe('keyword fallback tagger', () => {
  it('still passes Gate A on the bank demo', () => {
    const r = runEngine(PLAYBOOKS, keywordTags(demo('bank_scam'), 4))
    expect(r.leader?.playbookId).toBe('bank_safe_account')
    expect(r.prediction?.stageId).toBe('safe_account_transfer')
  })

  it('keeps the legitimate bank alert quiet', () => {
    const r = runEngine(PLAYBOOKS, keywordTags(demo('legit_bank')))
    expect(r.prediction).toBeUndefined()
  })
})

describe('reaction judge', () => {
  const u = (id: number, speaker: 'them' | 'me', text: string, tactics: string[] = [], stages: string[] = []) =>
    ({ id, speaker, text, source: 'keywords', tag: { tactics, stages, quote: '' } }) as TaggedUtterance

  const opening = [
    u(0, 'them', 'This is the fraud department at your bank.', ['authority'], ['bank_safe_account.fraud_team_contact']),
    u(1, 'them', 'There are suspicious charges on your account.', ['problem_creation'], ['bank_safe_account.account_threat']),
  ]

  it('flags a caller who pushes back when you offer to call back', () => {
    const convo = [
      ...opening,
      u(2, 'me', "I'll hang up and call the number on the back of my card."),
      u(3, 'them', "No, if you hang up it can't be stopped. Stay with me.", ['verification_avoidance', 'urgency']),
    ]
    const r = runEngine(PLAYBOOKS, convo)
    expect(r.reactions).toEqual([{ attemptId: 2, replyId: 3, verdict: 'deflect' }])
    expect(r.risk).toBeGreaterThan(runEngine(PLAYBOOKS, opening).risk)
  })

  it('lowers risk when the caller happily accepts a call-back', () => {
    const convo = [
      ...opening,
      u(2, 'me', "I'll call you back on the number on my card."),
      u(3, 'them', 'Of course, please do. You can also check in your banking app.', ['official_channel']),
    ]
    const r = runEngine(PLAYBOOKS, convo)
    expect(r.reactions[0].verdict).toBe('accept')
    expect(r.risk).toBeLessThan(runEngine(PLAYBOOKS, opening).risk)
  })

  it('ignores ordinary questions from you', () => {
    const r = runEngine(PLAYBOOKS, [...opening, u(2, 'me', 'Oh no, what happened?'), u(3, 'them', 'Two charges.')])
    expect(r.reactions).toEqual([])
  })
})
