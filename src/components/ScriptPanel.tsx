import type { EngineResult, Playbook } from '@/engine/types'

interface Props {
  result: EngineResult
  playbook?: Playbook
  onSaidIt: (text: string) => void
}

/** Pull the sentence to say out of a break move like: Say: "I'll call my bank back…" */
function sayable(breakMove: string): string | undefined {
  return breakMove.match(/"([^"]+)"/)?.[1]
}

/** The con's script: where they are, what comes next, and how to break it. */
export function ScriptPanel({ result, playbook, onSaidIt }: Props) {
  if (!playbook || !result.leader) {
    return (
      <div className="p-6 text-ink-soft">
        <h2 className="mb-2 font-semibold text-ink">Their script</h2>
        <p>
          Scams follow a few well-worn scripts. As the caller talks, Scriptbreaker matches each line to a step in one of
          them and shows you what they will ask for next.
        </p>
      </div>
    )
  }

  const leader = result.leader
  const prediction = result.prediction
  const move = result.currentStage?.breakMove
  const line = move && sayable(move)

  return (
    <div className="p-6">
      <h2 className="font-semibold">Their script</h2>
      <p className="mb-4 text-ink-soft">{playbook.name}</p>

      <ol className="space-y-1">
        {playbook.stages.map((s, i) => {
          const reached = leader.reached.includes(i)
          const current = i === leader.maxStage
          const cue = prediction?.playbookId === playbook.id && prediction.stageIndex === i
          const called = result.history.some(
            (p) => p.playbookId === playbook.id && p.stageIndex === i && p.fulfilledBy !== undefined,
          )

          if (cue) {
            return (
              <li key={s.id} className="animate-cue my-3 rounded-lg border-2 border-cue bg-cue-soft p-4" aria-live="polite">
                <p className="text-sm font-semibold text-ink-soft">Next, they will likely</p>
                <p className="text-lg font-semibold leading-snug">{s.expectedAsk.replace(/^They will /, '')}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Step {i + 1} of {playbook.stages.length}: {s.name}
                </p>
              </li>
            )
          }

          return (
            <li
              key={s.id}
              className={`flex items-start gap-3 rounded-md px-2 py-1.5 ${current ? 'bg-sheet font-semibold' : ''} ${
                reached ? 'text-ink' : 'text-ink-soft/70'
              }`}
            >
              <span
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs tabular-nums ${
                  reached ? 'bg-alarm text-white' : 'border border-rule'
                }`}
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="flex-1">
                {s.name}
                {s.optional && !reached && <span className="font-normal text-ink-soft"> (sometimes skipped)</span>}
                {current && <span className="block text-sm font-normal text-ink-soft">They are here now</span>}
              </span>
              {called && <span className="animate-stamp text-sm font-bold text-ink">Called it</span>}
            </li>
          )
        })}
      </ol>

      {move && (
        <div className="mt-6 rounded-lg bg-safe-soft p-4">
          <h3 className="font-semibold text-safe">Break the script</h3>
          <p className="mt-1">{move}</p>
          {line && (
            <button
              onClick={() => onSaidIt(line)}
              className="mt-3 rounded-md bg-safe px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
            >
              I said it
            </button>
          )}
        </div>
      )}
    </div>
  )
}
