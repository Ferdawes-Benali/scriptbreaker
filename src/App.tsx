import { useCallback, useState } from 'react'
import { DEMOS } from '@/engine/demos'
import { getPlaybook } from '@/engine/playbooks'
import { parseConversation } from '@/engine/tagClient'
import { useConversation, useReplay } from '@/hooks/useConversation'
import { speechSupported, useSpeech } from '@/hooks/useSpeech'
import { RiskMeter } from '@/components/RiskMeter'
import { Transcript } from '@/components/Transcript'
import { ScriptPanel } from '@/components/ScriptPanel'

type Mode = 'replay' | 'paste' | 'live'

const MODES: { id: Mode; label: string }[] = [
  { id: 'replay', label: 'Replay a call' },
  { id: 'paste', label: 'Paste a chat' },
  { id: 'live', label: 'Listen live' },
]

const EXAMPLE_PASTE = `Them: Hello, this is the tax office. You have an unpaid toll from last month.
Them: If it is not paid today, your licence will be suspended.
Me: I didn't get any letter.
Them: You can pay right now with gift cards from any shop.`

export default function App() {
  const convo = useConversation()
  const { addLine, reset } = convo
  const [mode, setMode] = useState<Mode>('replay')
  const [demoId, setDemoId] = useState(DEMOS[0].id)
  const [pasted, setPasted] = useState(EXAMPLE_PASTE)
  const [typed, setTyped] = useState('')

  const replay = useReplay(addLine)
  // Live and typed lines don't say who spoke: the AI works it out from the words.
  const speech = useSpeech(useCallback((text: string) => addLine('auto', text), [addLine]))

  const playbook = convo.result.leader && getPlaybook(convo.result.leader.playbookId)

  function switchMode(m: Mode) {
    replay.stop()
    speech.stop()
    reset()
    setMode(m)
  }

  function playDemo() {
    const demo = DEMOS.find((d) => d.id === demoId)!
    speech.stop()
    reset()
    replay.start(demo.lines.map((l) => ({ speaker: l.speaker, text: l.text })))
  }

  function readPasted() {
    reset()
    for (const u of parseConversation(pasted)) addLine(u.speaker, u.text)
  }

  function sendTyped(e: React.FormEvent) {
    e.preventDefault()
    addLine('auto', typed)
    setTyped('')
  }

  const demo = DEMOS.find((d) => d.id === demoId)!

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule bg-sheet">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Scriptbreaker</h1>
            <p className="text-ink-soft">Scams follow a script. We read ahead.</p>
          </div>
          <RiskMeter risk={convo.result.risk} playbookName={playbook?.name} />
        </div>
      </header>

      {/* The one thing you must not miss mid-call. */}
      {convo.result.risk >= 70 && (
        <div role="alert" className="bg-alarm text-white">
          <div className="mx-auto max-w-6xl px-4 py-3 text-lg font-semibold sm:px-6">
            Hang up: this call matches a known scam script. Call the organisation back on a number you already have.
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Mode switch */}
        <div role="tablist" aria-label="How to feed the conversation" className="mb-4 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => switchMode(m.id)}
              className={`rounded-full px-4 py-1.5 font-medium ${
                mode === m.id ? 'bg-ink text-sheet' : 'bg-sheet text-ink hover:bg-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Mode controls */}
        <section className="mb-6 rounded-lg bg-sheet p-4">
          {mode === 'replay' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {DEMOS.map((d) => (
                  <label
                    key={d.id}
                    className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
                      demoId === d.id ? 'border-ink bg-white font-semibold' : 'border-rule'
                    }`}
                  >
                    <input type="radio" name="demo" className="sr-only" checked={demoId === d.id} onChange={() => setDemoId(d.id)} />
                    {d.title}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {replay.playing ? (
                  <button onClick={replay.stop} className="rounded-md bg-ink px-4 py-2 font-semibold text-sheet">
                    Pause
                  </button>
                ) : (
                  <button onClick={playDemo} className="rounded-md bg-ink px-4 py-2 font-semibold text-sheet">
                    Play call
                  </button>
                )}
                {replay.total > 0 && (
                  <span className="text-sm text-ink-soft">
                    Line {Math.min(replay.position, replay.total)} of {replay.total}
                  </span>
                )}
                <span className="text-sm text-ink-soft">{demo.note}</span>
              </div>
            </div>
          )}

          {mode === 'paste' && (
            <div className="flex flex-col gap-3">
              <label htmlFor="paste" className="text-sm text-ink-soft">
                One line per message. Start lines with "Them:" or "Me:" if you know who said them; otherwise Scriptbreaker works it out.
              </label>
              <textarea
                id="paste"
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-rule bg-white p-3 font-script text-sm"
              />
              <div>
                <button onClick={readPasted} className="rounded-md bg-ink px-4 py-2 font-semibold text-sheet">
                  Read this conversation
                </button>
              </div>
            </div>
          )}

          {mode === 'live' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-soft">
                Put the call on speaker next to this laptop and press Start. You don't need to do anything else: Scriptbreaker
                works out who is talking and warns you if the call follows a scam script. Audio is turned into text by your
                browser; nothing is recorded.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {speech.listening ? (
                  <button onClick={speech.stop} className="rounded-md bg-alarm px-4 py-2 font-semibold text-white">
                    Stop listening
                  </button>
                ) : (
                  <button
                    onClick={speech.start}
                    disabled={!speechSupported}
                    className="rounded-md bg-ink px-4 py-2 font-semibold text-sheet disabled:opacity-40"
                  >
                    Start listening
                  </button>
                )}
              </div>
              {!speechSupported && <p className="text-sm text-alarm">Live listening needs Chrome or Edge. You can still type lines below.</p>}
              {speech.error && <p className="text-sm text-alarm">{speech.error}</p>}
              <form onSubmit={sendTyped} className="flex gap-2">
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Or type a line from the call"
                  className="flex-1 rounded-md border border-rule bg-white px-3 py-2"
                />
                <button className="rounded-md border border-ink px-3 py-2 font-semibold">Add line</button>
              </form>
            </div>
          )}
        </section>

        {/* The call and their script */}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section aria-label="The call" className="max-h-[70vh] min-h-64 overflow-y-auto rounded-lg bg-white p-6">
            <Transcript
              lines={convo.lines}
              history={convo.result.history}
              reactions={convo.result.reactions}
              interim={speech.interim}
              onFlip={convo.flipSpeaker}
            />
          </section>
          <aside className="rounded-lg bg-sheet">
            <ScriptPanel result={convo.result} playbook={playbook} onSaidIt={(t) => addLine('me', t)} />
          </aside>
        </div>

        <footer className="mt-8 max-w-3xl space-y-1 text-sm text-ink-soft">
          {convo.usedFallback && (
            <p className="text-alarm">
              The AI tagger was unreachable for some lines, so simple keyword rules labelled them. Results may be less accurate.
            </p>
          )}
          <p>
            Demo calls are scripted role-plays. Scriptbreaker knows three scam scripts so far and can miss scams that follow
            a different one. If in doubt, hang up and call the organisation on a number you already have.
          </p>
        </footer>
      </main>
    </div>
  )
}
