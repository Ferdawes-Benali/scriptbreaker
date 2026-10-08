import type {
  EngineResult,
  Playbook,
  PlaybookState,
  Prediction,
  Reaction,
  TaggedUtterance,
} from './types.js'

/**
 * The playbook engine. Deterministic: same tagged conversation in, same result out.
 *
 * The LLM never decides anything here. It only labels lines (tactics + stage refs).
 * This code tracks which scam script is unfolding, in which order, and predicts the next step.
 */

/** Below this risk we stay quiet: no prediction is shown. */
export const PREDICTION_THRESHOLD = 35

/** Credit for a stage reached only through tactic overlap (no explicit stage ref). */
const TACTIC_ONLY_CREDIT = 0.5
/** Credit for a stage reached out of order (behind the furthest stage). */
const OUT_OF_ORDER_CREDIT = 0.5
/** Credit when the conversation jumps more than two stages ahead. */
const BIG_JUMP_CREDIT = 0.8
/** Each "official channel" signal (e.g. "open your banking app") lowers every score. */
const OFFICIAL_CHANNEL_PENALTY = 1.5
/** Resisting a verification attempt is the strongest scam signal we have. */
const DEFLECT_BONUS = 2.5
/** Calmly accepting a call-back or check is a good sign. */
const ACCEPT_PENALTY = 2

/** Your line tries to verify the caller: call back, safe word, branch, video, official app. */
export function isVerificationAttempt(u: TaggedUtterance): boolean {
  if (u.speaker !== 'me') return false
  if (u.tag.tactics.includes('official_channel')) return true
  return /\b(call (you|them|my bank|the bank|it) back|call back|hang up|number on (the back of )?(my|the) card|safe ?word|video call|go to the branch|visit the branch|check (with|on)|verify|official (number|website|app)|my usual number)\b/i.test(
    u.text,
  )
}

/** Their reply to a verification attempt: pushing back or adding pressure = deflect. */
function judgeReply(u: TaggedUtterance): Reaction['verdict'] {
  const t = u.tag.tactics
  if (t.includes('official_channel')) return 'accept'
  if (t.some((x) => x === 'verification_avoidance' || x === 'isolation' || x === 'urgency' || x === 'fear' || x === 'secrecy'))
    return 'deflect'
  if (/\b(don'?t hang up|no time|can'?t|stay (on the line|with me)|why (don'?t|won'?t) you trust)\b/i.test(u.text)) return 'deflect'
  return 'accept'
}

function adjust(p: Playbook, s: PlaybookState, delta: number): PlaybookState {
  if (s.score <= 0) return s
  const score = Math.max(0, s.score + delta)
  return { ...s, score, risk: Math.min(100, Math.round((100 * score) / maxScore(p))) }
}

function maxScore(p: Playbook): number {
  return p.stages.filter((s) => !s.optional).reduce((sum, s) => sum + s.weight, 0)
}

function emptyState(p: Playbook): PlaybookState {
  return { playbookId: p.id, score: 0, reached: [], maxStage: -1, risk: 0 }
}

/** Stage indexes of `p` that this utterance hits, with the credit factor for each. */
function stageHits(p: Playbook, state: PlaybookState, u: TaggedUtterance): Map<number, number> {
  const hits = new Map<number, number>()

  // 1. Explicit stage references from the tagger.
  for (const ref of u.tag.stages) {
    const [pid, sid] = ref.split('.')
    if (pid !== p.id) continue
    const idx = p.stages.findIndex((s) => s.id === sid)
    if (idx >= 0) hits.set(idx, 1)
  }

  // 2. Tactic overlap, only for the next one or two stages (keeps it local and in order).
  if (hits.size === 0 && u.tag.tactics.length > 0) {
    for (let i = state.maxStage + 1; i <= Math.min(state.maxStage + 2, p.stages.length - 1); i++) {
      const stage = p.stages[i]
      if (stage.tactics.some((t) => u.tag.tactics.includes(t))) {
        hits.set(i, TACTIC_ONLY_CREDIT)
        break
      }
    }
  }
  return hits
}

function applyUtterance(p: Playbook, state: PlaybookState, u: TaggedUtterance): PlaybookState {
  const next: PlaybookState = { ...state, reached: [...state.reached] }

  if (u.tag.tactics.includes('official_channel')) {
    next.score = Math.max(0, next.score - OFFICIAL_CHANNEL_PENALTY)
  }

  for (const [idx, credit] of stageHits(p, state, u)) {
    if (next.reached.includes(idx)) continue // a stage only counts once
    let factor = credit
    if (idx < next.maxStage) factor *= OUT_OF_ORDER_CREDIT
    else if (idx > next.maxStage + 2) factor *= BIG_JUMP_CREDIT
    next.score += p.stages[idx].weight * factor
    next.reached.push(idx)
    next.maxStage = Math.max(next.maxStage, idx)
  }

  next.risk = Math.min(100, Math.round((100 * next.score) / maxScore(p)))
  return next
}

/** The next stage worth predicting: first non-optional, unreached stage after the furthest one. */
function nextStageIndex(p: Playbook, state: PlaybookState): number {
  for (let i = state.maxStage + 1; i < p.stages.length; i++) {
    if (!p.stages[i].optional && !state.reached.includes(i)) return i
  }
  return -1
}

function rank(states: PlaybookState[]): PlaybookState[] {
  return [...states].sort((a, b) => b.score - a.score || b.maxStage - a.maxStage)
}

/**
 * Run the engine over a whole conversation, in order.
 * Only lines spoken by "them" move the scores.
 */
export function runEngine(playbooks: Playbook[], conversation: TaggedUtterance[]): EngineResult {
  let states = playbooks.map(emptyState)
  const history: Prediction[] = []
  let open: Prediction | undefined
  const reactions: Reaction[] = []
  let pendingAttempt: number | undefined

  for (const u of conversation) {
    if (u.speaker === 'me') {
      if (isVerificationAttempt(u)) pendingAttempt = u.id
      continue
    }

    states = states.map((s, i) => applyUtterance(playbooks[i], s, u))

    // First reply after you tried to verify: judge it.
    if (pendingAttempt !== undefined) {
      const verdict = judgeReply(u)
      reactions.push({ attemptId: pendingAttempt, replyId: u.id, verdict })
      const delta = verdict === 'deflect' ? DEFLECT_BONUS : -ACCEPT_PENALTY
      states = states.map((s, i) => adjust(playbooks[i], s, delta))
      pendingAttempt = undefined
    }
    const leader = rank(states)[0]
    const p = playbooks.find((pb) => pb.id === leader.playbookId)!

    // Did this line fulfil the open prediction?
    if (open && !open.fulfilledBy) {
      const st = states.find((s) => s.playbookId === open!.playbookId)!
      if (st.reached.includes(open.stageIndex)) open.fulfilledBy = u.id
    }

    // Make a new prediction when risk is high enough and the target changed.
    if (leader.risk >= PREDICTION_THRESHOLD) {
      const idx = nextStageIndex(p, leader)
      const changed = !open || open.fulfilledBy || open.playbookId !== p.id || open.stageIndex !== idx
      if (idx >= 0 && changed) {
        const stage = p.stages[idx]
        open = {
          playbookId: p.id,
          stageIndex: idx,
          stageId: stage.id,
          stageName: stage.name,
          expectedAsk: stage.expectedAsk,
          madeAfter: u.id,
        }
        history.push(open)
      }
    }
  }

  const ranked = rank(states)
  const leader = ranked[0]?.score > 0 ? ranked[0] : undefined
  const p = leader && playbooks.find((pb) => pb.id === leader.playbookId)
  const currentStage = p && leader && leader.maxStage >= 0 ? p.stages[leader.maxStage] : undefined
  const latest = history.at(-1)

  return {
    states: ranked,
    leader,
    risk: leader?.risk ?? 0,
    currentStage,
    prediction: latest && !latest.fulfilledBy && (leader?.risk ?? 0) >= PREDICTION_THRESHOLD ? latest : undefined,
    history,
    reactions,
  }
}
