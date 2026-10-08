import { PREDICTION_THRESHOLD } from '@/engine/engine'
import { riskWord } from '@/lib/labels'

const TONE = {
  calm: 'bg-ink-soft',
  watch: 'bg-cue',
  alarm: 'bg-alarm',
} as const

export function RiskMeter({ risk, playbookName }: { risk: number; playbookName?: string }) {
  const { word, tone } = riskWord(risk)
  return (
    <div className="w-full sm:w-80" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={risk} aria-label="Scam risk">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{word}</span>
        <span className="tabular-nums text-2xl font-bold">{risk}</span>
      </div>
      <div className="relative mt-1 h-2 rounded-full bg-rule">
        <div className={`h-2 rounded-full transition-all duration-500 ${TONE[tone]}`} style={{ width: `${risk}%` }} />
        {/* Below this line Scriptbreaker stays quiet: no prediction is shown. */}
        <div
          className="absolute -top-1 h-4 w-px bg-ink"
          style={{ left: `${PREDICTION_THRESHOLD}%` }}
          title="Predictions start above this line"
        />
      </div>
      <p className="mt-1 truncate text-sm text-ink-soft">{playbookName ? `Matches: ${playbookName}` : 'Listening for a known scam script'}</p>
    </div>
  )
}
