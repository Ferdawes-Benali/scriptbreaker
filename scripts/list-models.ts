/**
 * Lists the chat models your API key can use.
 * Run (PowerShell):  npm run list-models
 */
import OpenAI from 'openai'
import { configFromEnv } from '../src/server/tagger.js'

async function main() {
  const cfg = configFromEnv(process.env)
  const client = new OpenAI({ baseURL: cfg.baseURL, apiKey: cfg.apiKey })
  const ids: string[] = []
  for await (const m of client.models.list()) ids.push(m.id)
  const chat = ids.filter((id) => !/whisper|tts|guard|embed|playai|orpheus|compound/i.test(id)).sort()
  console.log(`Provider: ${cfg.baseURL}`)
  console.log(`Chat models available to this key (${chat.length}):`)
  for (const id of chat) console.log(`  ${id}`)
}

main()
