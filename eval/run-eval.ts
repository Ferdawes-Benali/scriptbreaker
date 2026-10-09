/**
 * Runs the evaluation set through the real AI tagger and writes docs/eval.md.
 * Run (PowerShell):  npm run eval
 * Takes a few minutes: it paces calls to stay under free-tier rate limits.
 */
import { writeFileSync } from 'node:fs'
import { keywordTag } from '../src/engine/keywordTagger.js'
import { PLAYBOOKS } from '../src/engine/playbooks.js'
import { configFromEnv, tagLine } from '../src/server/tagger.js'
import { EVAL_SET } from './conversations.js'
import { formatReport, scoreConversation, type ConversationScore } from './metrics.js'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const cfg = configFromEnv(process.env)
  let calls = 0
  let failures = 0
  const ai: ConversationScore[] = []
  for (const c of EVAL_SET) {
    const score = await scoreConversation(c, async (text, context) => {
      await sleep(1200)
      calls++
      try {
        return (await tagLine(cfg, { text, context })).tag
      } catch {
        failures++
        return keywordTag(text, PLAYBOOKS)
      }
    })
    ai.push(score)
    console.log(`${c.id}: matched ${score.leader ?? '-'}, max risk ${score.maxRisk}`)
  }
  const baseline = await Promise.all(EVAL_SET.map((c) => scoreConversation(c, async (t) => keywordTag(t, PLAYBOOKS))))

  const md = `# Evaluation

Run on ${new Date().toISOString().slice(0, 10)} with model \`${cfg.model}\` (fallback \`${cfg.fallbackModel ?? 'none'}\`).
${EVAL_SET.length} scripted conversations written by the team: 12 scams (4 per scam script, worded differently from the playbooks) and 12 legitimate calls chosen to look like scams (real bank alerts, relatives asking for money, tax office calls).
AI tagger calls: ${calls}, failed and fell back to keyword rules: ${failures}.

These are small, hand-written test sets, not real calls. They show the approach works; they are not a measure of real-world accuracy.

${formatReport('AI tagger + playbook engine', ai)}
${formatReport('Baseline: keyword rules + playbook engine (no AI)', baseline)}`
  writeFileSync('docs/eval.md', md)
  console.log('\n' + md)
}

main()
