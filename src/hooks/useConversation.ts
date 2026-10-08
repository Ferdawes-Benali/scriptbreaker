import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { runEngine } from '@/engine/engine'
import { PLAYBOOKS } from '@/engine/playbooks'
import { tagUtterance } from '@/engine/tagClient'
import type { Speaker, TaggedUtterance, Utterance } from '@/engine/types'

export interface ConversationLine extends Utterance {
  tagged?: TaggedUtterance
}

/**
 * Holds the conversation, tags "them" lines one by one in order (a queue),
 * and runs the engine on every line that has been tagged so far.
 */
export function useConversation() {
  const [lines, setLines] = useState<ConversationLine[]>([])
  const nextId = useRef(0)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const generation = useRef(0) // bumps on reset so late answers from an old run are dropped
  const all = useRef<Utterance[]>([]) // plain copy of every line, for tagging context

  /** speaker 'auto' = we don't know who spoke; the AI decides. */
  const addLine = useCallback((speaker: Speaker | 'auto', text: string) => {
    const clean = text.trim()
    if (!clean) return
    const auto = speaker === 'auto'
    const line: ConversationLine = { id: nextId.current++, speaker: auto ? 'them' : speaker, text: clean, autoSpeaker: auto }
    const gen = generation.current
    all.current = [...all.current, line]
    setLines((prev) => [...prev, line])

    queue.current = queue.current.then(async () => {
      if (gen !== generation.current) return
      const previous = all.current.filter((l) => l.id < line.id)
      const tagged = await tagUtterance(line, previous)
      if (gen !== generation.current) return
      setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, speaker: tagged.speaker, tagged } : l)))
    })
  }, [])

  /** Fix a wrong speaker after the fact. Only lines the AI read (auto) carry tactics, so flipping is meaningful. */
  const flipSpeaker = useCallback((id: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id || !l.tagged) return l
        const speaker: Speaker = l.speaker === 'them' ? 'me' : 'them'
        return { ...l, speaker, tagged: { ...l.tagged, speaker } }
      }),
    )
  }, [])

  const reset = useCallback(() => {
    generation.current++
    queue.current = Promise.resolve()
    nextId.current = 0
    all.current = []
    setLines([])
  }, [])

  /** The engine only sees the tagged prefix, so results never jump ahead of the transcript. */
  const tagged = useMemo(() => {
    const out: TaggedUtterance[] = []
    for (const l of lines) {
      if (!l.tagged) break
      out.push(l.tagged)
    }
    return out
  }, [lines])

  const result = useMemo(() => runEngine(PLAYBOOKS, tagged), [tagged])
  const pending = lines.length - tagged.length
  const usedFallback = tagged.some((t) => t.speaker === 'them' && t.source === 'keywords')

  return { lines, addLine, flipSpeaker, reset, result, pending, usedFallback }
}

/** Plays a scripted conversation line by line at roughly speaking speed. */
export function useReplay(onLine: (speaker: Speaker, text: string) => void) {
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [total, setTotal] = useState(0)
  const script = useRef<{ speaker: Speaker; text: string }[]>([])
  const timer = useRef<number | undefined>(undefined)

  const stop = useCallback(() => {
    window.clearTimeout(timer.current)
    setPlaying(false)
  }, [])

  const start = useCallback(
    (lines: { speaker: Speaker; text: string }[]) => {
      window.clearTimeout(timer.current)
      script.current = lines
      setTotal(lines.length)
      setPosition(0)
      setPlaying(true)
    },
    [],
  )

  useEffect(() => {
    if (!playing) return
    if (position >= script.current.length) {
      setPlaying(false)
      return
    }
    const line = script.current[position]
    // First line quickly; then wait as long as it takes to say the previous line (~15 chars/s).
    const prev = script.current[position - 1]
    const delay = position === 0 ? 300 : Math.min(5000, 900 + (prev.text.length / 15) * 1000)
    timer.current = window.setTimeout(() => {
      onLine(line.speaker, line.text)
      setPosition((p) => p + 1)
    }, delay)
    return () => window.clearTimeout(timer.current)
  }, [playing, position, onLine])

  return { playing, position, total, start, stop }
}
