import { PREDICTION_THRESHOLD, runEngine } from '../src/engine/engine.js'
import { PLAYBOOKS } from '../src/engine/playbooks.js'
import type { Tag, TaggedUtterance } from '../src/engine/types.js'
import type { EvalConversation } from './conversations.js'

export type Tagger = (text: string, context: { speaker: 'them' | 'me'; text: string }[]) => Promise<Tag>

export interface ConversationScore {
  id: string
  isScam: boolean
  expected: string | null
  leader?: string
  maxRisk: number
  /** Index of the first line after which a warning (prediction) was showing. */
  warnedAt?: number
  /** Index of the line where money/codes were first asked for. */
  moneyAt?: number
  /** Predictions made / predictions that came true. */
  predictions: number
  fulfilled: number
}

export async function scoreConversation(c: EvalConversation, tag: Tagger): Promise<ConversationScore> {
  const tagged: TaggedUtterance[] = []
  let maxRisk = 0
  let warnedAt: number | undefined
  for (let i = 0; i < c.lines.length; i++) {
    const l = c.lines[i]
    const context = c.lines.slice(Math.max(0, i - 4), i).map((x) => ({ speaker: x.speaker, text: x.text }))
    const t: Tag = l.speaker === 'them' ? await tag(l.text, context) : { tactics: [], stages: [], quote: '' }
    tagged.push({ id: i, speaker: l.speaker, text: l.text, tag: t, source: 'llm' })
    const r = runEngine(PLAYBOOKS, tagged)
    maxRisk = Math.max(maxRisk, r.risk)
    if (warnedAt === undefined && r.risk >= PREDICTION_THRESHOLD) warnedAt = i
  }
  const final = runEngine(PLAYBOOKS, tagged)
  const moneyAt = c.lines.findIndex((l) => l.money)
  return {
    id: c.id,
    isScam: c.isScam,
    expected: c.playbookId,
    leader: final.leader?.playbookId,
    maxRisk,
    warnedAt,
    moneyAt: moneyAt >= 0 ? moneyAt : undefined,
    predictions: final.history.length,
    fulfilled: final.history.filter((p) => p.fulfilledBy !== undefined).length,
  }
}

export interface Summary {
  scams: number
  legit: number
  /** Scams where the right scam script was identified. */
  playbookCorrect: number
  /** Scams flagged (warning shown) at any point. */
  detected: number
  /** Scams where the warning appeared before the money/code request was spoken. */
  warnedBeforeAsk: number
  /** Legitimate calls that triggered a warning. */
  falseAlarms: number
  predictionsMade: number
  predictionsFulfilled: number
}

export function summarise(scores: ConversationScore[]): Summary {
  const scams = scores.filter((s) => s.isScam)
  const legit = scores.filter((s) => !s.isScam)
  return {
    scams: scams.length,
    legit: legit.length,
    playbookCorrect: scams.filter((s) => s.leader === s.expected).length,
    detected: scams.filter((s) => s.warnedAt !== undefined).length,
    warnedBeforeAsk: scams.filter((s) => s.warnedAt !== undefined && s.moneyAt !== undefined && s.warnedAt < s.moneyAt).length,
    falseAlarms: legit.filter((s) => s.warnedAt !== undefined).length,
    predictionsMade: scams.reduce((a, s) => a + s.predictions, 0),
    predictionsFulfilled: scams.reduce((a, s) => a + s.fulfilled, 0),
  }
}

export function formatReport(title: string, scores: ConversationScore[]): string {
  const s = summarise(scores)
  const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : 'n/a')
  const rows = scores
    .map(
      (c) =>
        `| ${c.id} | ${c.isScam ? 'scam' : 'legit'} | ${c.leader ?? '-'} | ${c.maxRisk} | ${c.warnedAt ?? '-'} | ${c.moneyAt ?? '-'} |`,
    )
    .join('\n')
  return `## ${title}

| Metric | Result |
| --- | --- |
| Right scam script identified | ${s.playbookCorrect}/${s.scams} (${pct(s.playbookCorrect, s.scams)}) |
| Scams flagged | ${s.detected}/${s.scams} (${pct(s.detected, s.scams)}) |
| Warned before the money/code request | ${s.warnedBeforeAsk}/${s.scams} (${pct(s.warnedBeforeAsk, s.scams)}) |
| Next-step predictions that came true | ${s.predictionsFulfilled}/${s.predictionsMade} (${pct(s.predictionsFulfilled, s.predictionsMade)}) |
| False alarms on legitimate calls | ${s.falseAlarms}/${s.legit} |

<details><summary>Per conversation</summary>

| Conversation | Type | Matched script | Max risk | Warned after line | Money asked at line |
| --- | --- | --- | --- | --- | --- |
${rows}

</details>
`
}
