import { guessSpeaker, keywordTag } from './keywordTagger'
import { PLAYBOOKS } from './playbooks'
import { TagSchema, type TaggedUtterance, type Utterance } from './types'

/** Same line, same answer: replays don't spend the free-tier quota twice. */
const cache = new Map<string, TaggedUtterance['tag']>()

/** Tag one "them" line with the AI tagger; fall back to keyword rules if the API fails. */
export async function tagUtterance(u: Utterance, previous: Utterance[]): Promise<TaggedUtterance> {
  if (u.speaker === 'me' && !u.autoSpeaker) return { ...u, tag: { tactics: [], stages: [], quote: '' }, source: 'keywords' }
  const key = `${u.autoSpeaker ? 'auto' : 'them'}|${u.text}`
  const cached = cache.get(key)
  if (cached) return withSpeaker(u, cached, 'llm')
  try {
    const res = await fetch('/api/tag', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: u.text,
        autoSpeaker: u.autoSpeaker || undefined,
        context: previous.slice(-4).map((p) => ({ speaker: p.speaker, text: p.text })),
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const tag = TagSchema.parse(data.tag)
    cache.set(key, tag)
    return withSpeaker(u, tag, 'llm')
  } catch {
    const tag = keywordTag(u.text, PLAYBOOKS)
    return withSpeaker(u, u.autoSpeaker ? { ...tag, speaker: guessSpeaker(u.text) } : tag, 'keywords')
  }
}

/** In auto mode the tagger decides who spoke. When unsure we assume the caller, so nothing is missed. */
function withSpeaker(u: Utterance, tag: TaggedUtterance['tag'], source: TaggedUtterance['source']): TaggedUtterance {
  const speaker = u.autoSpeaker ? (tag.speaker ?? 'them') : u.speaker
  return { ...u, speaker, tag, source }
}

/** Parse "Them: ..." / "Me: ..." lines. Lines without a prefix are left to the AI to attribute. */
export function parseConversation(text: string): Utterance[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^(them|me|caller|scammer|you|i)\s*:\s*(.*)$/i)
      const who = m?.[1].toLowerCase()
      const speaker = who === 'me' || who === 'you' || who === 'i' ? 'me' : 'them'
      return { id: i, speaker, text: (m ? m[2] : line).trim(), autoSpeaker: !m } as Utterance
    })
    .filter((u) => u.text.length > 0)
}
