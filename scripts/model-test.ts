/**
 * D0.4 model bake-off. Sends sample lines to each candidate model and reports
 * JSON validity, label accuracy against hand-written labels, and latency.
 *
 * Run (PowerShell):  npm run model-test
 * Other models:      $env:MODELS='model-a,model-b'; npm run model-test
 */
import { configFromEnv, tagLine } from '../src/server/tagger.js'

const CANDIDATES = (process.env.MODELS ?? 'openai/gpt-oss-20b,openai/gpt-oss-120b,qwen/qwen3-32b')
  .split(',')
  .map((m) => m.trim())

const SAMPLES: { text: string; expect: string[] }[] = [
  { text: 'Hi, this is Daniel from the fraud department at your bank.', expect: ['bank_safe_account.fraud_team_contact'] },
  { text: "Please don't hang up, and don't tell anyone at the branch. An employee may be involved.", expect: ['bank_safe_account.isolate'] },
  { text: 'To protect your savings we need you to move them to a secure holding account right now.', expect: ['bank_safe_account.safe_account_transfer'] },
  { text: "Grandma, it's me. I've been in an accident and I'm in big trouble.", expect: ['family_emergency.distress_call'] },
  { text: 'Your licence will be suspended tonight unless you pay the toll with gift cards.', expect: ['government_fine.unusual_payment'] },
  { text: 'You can block the payment yourself in your banking app. We will never ask for your code.', expect: [] },
  { text: 'Sure, see you at dinner on Sunday!', expect: [] },
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const base = configFromEnv(process.env)
  console.log(`Provider: ${base.baseURL}\n`)
  for (const model of CANDIDATES) {
    let valid = 0
    let correct = 0
    const times: number[] = []
    for (const s of SAMPLES) {
      await sleep(1500) // stay under free-tier tokens-per-minute limits
      try {
        const r = await tagLine({ ...base, model, fallbackModel: undefined }, { text: s.text })
        valid++
        times.push(r.ms)
        const ok = s.expect.length === 0 ? r.tag.stages.length === 0 : s.expect.every((e) => r.tag.stages.includes(e))
        if (ok) correct++
        else console.log(`  [${model}] miss: "${s.text.slice(0, 50)}..." -> ${JSON.stringify(r.tag.stages)}`)
      } catch (e) {
        console.log(`  [${model}] error: ${e instanceof Error ? e.message : e}`)
      }
    }
    const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
    console.log(`${model}: valid JSON ${valid}/${SAMPLES.length}, correct ${correct}/${SAMPLES.length}, avg ${avg} ms\n`)
  }
}

main()
