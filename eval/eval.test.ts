import { describe, expect, it } from 'vitest'
import { keywordTag } from '../src/engine/keywordTagger.js'
import { PLAYBOOKS } from '../src/engine/playbooks.js'
import { EVAL_SET } from './conversations.js'
import { formatReport, scoreConversation, summarise } from './metrics.js'

/**
 * Offline baseline with the keyword tagger (no AI). Runs in CI.
 * The real numbers come from `npm run eval`, which uses the AI tagger.
 */
describe('evaluation set (keyword baseline)', () => {
  it('is balanced and labelled', () => {
    expect(EVAL_SET.filter((c) => c.isScam)).toHaveLength(12)
    expect(EVAL_SET.filter((c) => !c.isScam)).toHaveLength(12)
    for (const c of EVAL_SET.filter((x) => x.isScam)) expect(c.lines.some((l) => l.money)).toBe(true)
  })

  it('produces a report', async () => {
    const scores = await Promise.all(EVAL_SET.map((c) => scoreConversation(c, async (t) => keywordTag(t, PLAYBOOKS))))
    const s = summarise(scores)
    console.log(formatReport('Keyword baseline (no AI)', scores))
    expect(s.scams).toBe(12)
  })
})
