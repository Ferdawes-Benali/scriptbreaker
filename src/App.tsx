import { useMemo, useState } from 'react'
import { DEMOS, demoToText } from '@/engine/demos'
import { runEngine } from '@/engine/engine'
import { PLAYBOOKS, getPlaybook } from '@/engine/playbooks'
import { parseConversation, tagUtterance } from '@/engine/tagClient'
import type { TaggedUtterance } from '@/engine/types'

/**
 * Day 0 paste mode: plain and functional, to prove the pipeline end to end.
 * The real interface (timeline, live mic, replay) is built on Day 1.
 */
export default function App() {
  const [text, setText] = useState(demoToText(DEMOS[0]))
  const [tagged, setTagged] = useState<TaggedUtterance[]>([])
  const [busy, setBusy] = useState(false)

  const result = useMemo(() => runEngine(PLAYBOOKS, tagged), [tagged])
  const leaderBook = result.leader && getPlaybook(result.leader.playbookId)

  async function analyse() {
    setBusy(true)
    setTagged([])
    const lines = parseConversation(text)
    const done: TaggedUtterance[] = []
    for (const u of lines) {
      done.push(await tagUtterance(u, done))
      setTagged([...done]) // the result updates line by line, like a live call
    }
    setBusy(false)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Scriptbreaker</h1>
          <p className="text-zinc-400">Scams follow a script. We read ahead. (Day 0 paste mode)</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <div className="mb-2 flex flex-wrap gap-2">
              {DEMOS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setText(demoToText(d))}
                  className="rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800"
                >
                  {d.title}
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              className="w-full rounded border border-zinc-700 bg-zinc-900 p-3 font-mono text-sm"
              placeholder={'Them: Hi, this is the fraud team at your bank...\nMe: Oh no...'}
            />
            <button
              onClick={analyse}
              disabled={busy}
              className="mt-2 rounded bg-orange-500 px-4 py-2 font-semibold text-black disabled:opacity-50"
            >
              {busy ? 'Analysing…' : 'Analyse conversation'}
            </button>

            <ol className="mt-4 space-y-2 text-sm">
              {tagged.map((u) => (
                <li key={u.id} className={u.speaker === 'me' ? 'text-zinc-500' : ''}>
                  <span className="font-semibold">{u.speaker === 'them' ? 'Them' : 'Me'}:</span> {u.text}
                  {u.speaker === 'them' && (
                    <div className="text-xs text-orange-300">
                      {u.tag.tactics.join(' · ') || 'no tactic'} {u.tag.stages.length > 0 && `→ ${u.tag.stages.join(', ')}`}
                      <span className="ml-2 text-zinc-500">[{u.source}]</span>
                    </div>
                  )}
                  {result.history.some((p) => p.fulfilledBy === u.id) && (
                    <div className="text-xs font-bold text-green-400">Predicted ✓</div>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-4">
            <div className="rounded border border-zinc-700 p-4">
              <div className="text-sm text-zinc-400">Risk</div>
              <div className="text-4xl font-bold">{result.risk}</div>
              <div className="text-sm">{leaderBook ? leaderBook.name : 'No script detected yet'}</div>
            </div>

            {leaderBook && result.leader && (
              <div className="rounded border border-zinc-700 p-4">
                <div className="mb-2 text-sm text-zinc-400">Script position</div>
                <ol className="space-y-1 text-sm">
                  {leaderBook.stages.map((s, i) => (
                    <li
                      key={s.id}
                      className={
                        i === result.leader!.maxStage
                          ? 'font-bold text-orange-400'
                          : result.leader!.reached.includes(i)
                            ? 'text-zinc-200'
                            : 'text-zinc-600'
                      }
                    >
                      {i + 1}. {s.name} {s.optional && '(optional)'}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {result.prediction && (
              <div className="rounded border border-orange-500 bg-orange-500/10 p-4">
                <div className="text-sm text-orange-300">Next likely ask</div>
                <div className="text-lg font-semibold">{result.prediction.expectedAsk}</div>
              </div>
            )}

            {result.currentStage && (
              <div className="rounded border border-zinc-700 p-4">
                <div className="text-sm text-zinc-400">Break the script</div>
                <div>{result.currentStage.breakMove}</div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
