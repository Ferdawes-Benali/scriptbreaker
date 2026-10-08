import { useCallback, useEffect, useRef, useState } from 'react'

/* Minimal typings for the Web Speech API (Chrome and Edge ship it as webkitSpeechRecognition). */
interface SpeechAlternative { transcript: string }
interface SpeechResult { isFinal: boolean; 0: SpeechAlternative }
interface SpeechEvent { resultIndex: number; results: ArrayLike<SpeechResult> }
interface Recognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: SpeechEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

function getRecognition(): (new () => Recognition) | undefined {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognition) | undefined
}

export const speechSupported = typeof window !== 'undefined' && !!getRecognition()

/**
 * Live transcription in the browser. Final sentences are handed to `onFinal`;
 * the sentence still being spoken is exposed as `interim`.
 * Nothing is recorded: audio goes to the browser's speech service and only the text comes back.
 */
export function useSpeech(onFinal: (text: string) => void, lang = 'en-US') {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string>()
  const rec = useRef<Recognition | undefined>(undefined)
  const wanted = useRef(false)
  const onFinalRef = useRef(onFinal)
  useEffect(() => {
    onFinalRef.current = onFinal
  }, [onFinal])

  const start = useCallback(() => {
    const Ctor = getRecognition()
    if (!Ctor) {
      setError('Live listening needs Chrome or Edge. Use Replay or Paste instead.')
      return
    }
    const r = new Ctor()
    r.continuous = true
    r.interimResults = true
    r.lang = lang
    r.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) onFinalRef.current(res[0].transcript)
        else live += res[0].transcript
      }
      setInterim(live)
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed') setError('Microphone access was blocked. Allow it in the address bar, then try again.')
      else if (e.error !== 'no-speech' && e.error !== 'aborted') setError(`Listening stopped (${e.error}).`)
    }
    // Chrome ends sessions after a pause; restart while the user still wants to listen.
    r.onend = () => {
      if (wanted.current) r.start()
      else setListening(false)
    }
    rec.current = r
    wanted.current = true
    setError(undefined)
    r.start()
    setListening(true)
  }, [lang])

  const stop = useCallback(() => {
    wanted.current = false
    rec.current?.stop()
    setInterim('')
    setListening(false)
  }, [])

  useEffect(() => () => {
    wanted.current = false
    rec.current?.stop()
  }, [])

  return { listening, interim, error, start, stop }
}
