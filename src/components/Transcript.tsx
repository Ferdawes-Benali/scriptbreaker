import { useEffect, useRef } from 'react'
import type { ConversationLine } from '@/hooks/useConversation'
import type { Prediction, Reaction } from '@/engine/types'
import { TACTIC_LABEL } from '@/lib/labels'

interface Props {
  lines: ConversationLine[]
  history: Prediction[]
  reactions: Reaction[]
  interim?: string
  /** Swap Caller/You on a line the AI attributed wrongly. */
  onFlip?: (id: number) => void
}

/** The call, set like a screenplay: the scam is a script, so we print it as one. */
export function Transcript({ lines, history, reactions, interim, onFlip }: Props) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [lines.length, interim])

  if (lines.length === 0 && !interim) {
    return (
      <div className="grid h-full min-h-64 place-items-center p-8 text-center text-ink-soft">
        <p className="max-w-xs">Replay a demo call, paste a conversation, or listen live. The call will appear here as it happens.</p>
      </div>
    )
  }

  return (
    <div className="font-script text-[15px] leading-relaxed">
      {lines.map((l) => {
        const them = l.speaker === 'them'
        const fulfilled = history.find((p) => p.fulfilledBy === l.id)
        const reaction = reactions.find((r) => r.replyId === l.id)
        const tactics = l.tagged?.tag.tactics ?? []
        return (
          <div key={l.id} className="mb-5">
            <div className={`mb-1 text-center font-bold ${them ? 'text-ink' : 'text-ink-soft'}`}>
              {l.autoSpeaker && !l.tagged ? (
                <span className="font-normal text-ink-soft">…</span>
              ) : l.autoSpeaker && onFlip ? (
                <button
                  onClick={() => onFlip(l.id)}
                  title="Wrong person? Click to swap Caller and You."
                  className="rounded px-1 underline decoration-rule decoration-dotted underline-offset-4 hover:bg-paper"
                >
                  {them ? 'Caller' : 'You'}
                </button>
              ) : them ? (
                'Caller'
              ) : (
                'You'
              )}
            </div>
            <p className={`mx-auto max-w-[36ch] ${them ? '' : 'text-ink-soft'}`}>{l.text}</p>

            {them && (l.tagged || !l.autoSpeaker) && (
              <div className="mx-auto mt-2 flex max-w-[44ch] flex-wrap items-center justify-center gap-1.5 font-sans text-xs">
                {!l.tagged && <span className="text-ink-soft">reading…</span>}
                {tactics.map((t) => (
                  <span
                    key={t}
                    title={TACTIC_LABEL[t].help + (l.tagged?.tag.quote ? `\n"${l.tagged.tag.quote}"` : '')}
                    className={`rounded-full px-2 py-0.5 ${TACTIC_LABEL[t].legit ? 'bg-safe-soft text-safe' : 'bg-alarm-soft text-alarm'}`}
                  >
                    {TACTIC_LABEL[t].label}
                  </span>
                ))}
                {l.tagged?.source === 'keywords' && (
                  <span className="text-ink-soft" title="The AI tagger was unreachable, so simple keyword rules labelled this line.">
                    keyword rules
                  </span>
                )}
              </div>
            )}

            {reaction && (
              <div className="mt-2 flex justify-center font-sans">
                {reaction.verdict === 'deflect' ? (
                  <span className="max-w-[44ch] rounded-md bg-alarm px-2.5 py-1 text-center text-sm font-semibold text-white">
                    Pushed back when you tried to check. Real organisations let you call back.
                  </span>
                ) : (
                  <span className="max-w-[44ch] rounded-md bg-safe px-2.5 py-1 text-center text-sm font-semibold text-white">
                    Accepted your check. A good sign, but still call back yourself.
                  </span>
                )}
              </div>
            )}

            {fulfilled && (
              <div className="mt-2 flex justify-center">
                <span className="animate-stamp inline-block rounded border-2 border-cue px-2 py-0.5 font-sans text-sm font-bold text-ink">
                  Called it: predicted before they said it
                </span>
              </div>
            )}
          </div>
        )
      })}

      {interim && (
        <div className="mb-5 opacity-60">
          <div className="mb-1 text-center text-ink-soft">listening…</div>
          <p className="mx-auto max-w-[36ch] italic">{interim}</p>
        </div>
      )}
      <div ref={end} />
    </div>
  )
}
