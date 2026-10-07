import type { Playbook, Tactic, Tag } from './types'

/**
 * Offline fallback tagger. No AI: plain keyword rules.
 * Used when the LLM is unreachable, and labelled "keywords" in the UI so nobody mistakes it for the model.
 * It is deliberately simple and will miss paraphrases the LLM catches.
 */
const TACTIC_RULES: Record<Tactic, RegExp> = {
  impersonation: /\b(it'?s me|grandma|grandpa|mom|dad|your (son|daughter|grandson|granddaughter))\b/i,
  authority: /\b(fraud (department|team)|security team|bank|police|officer|tax office|customs|toll|lawyer|agent)\b/i,
  problem_creation: /\b(suspicious|unauthori[sz]ed|compromised|hacked|unpaid|owe|warrant|accident|arrested|seized|unusual payment)\b/i,
  fear: /\b(arrest(ed)?|jail|trouble|accident|hospital|suspend(ed)?|lose (everything|your))\b/i,
  urgency: /\b(right now|immediately|today|within the hour|no time|hurry|urgent)\b/i,
  isolation: /\b(don'?t hang up|stay (on the line|with me)|don'?t (call|contact) anyone)\b/i,
  secrecy: /\b(don'?t tell|keep (this|it) (secret|confidential|between us)|confidential|embarrassed)\b/i,
  reassurance: /\b(you'?re (safe|protected)|this is (normal|standard)|trust me)\b/i,
  credential_request: /\b(code|pin|password|card number|verify your identity)\b/i,
  remote_access: /\b(anydesk|teamviewer|install (this|the) app|share your screen)\b/i,
  payment_channel_switch: /\b(gift cards?|bitcoin|crypto|wire|courier|pick up the cash|this link)\b/i,
  money_movement: /\b(transfer|send (the )?money|withdraw|holding account|secure account|move your (money|savings)|need money|bail|pay)\b/i,
  verification_avoidance: /\b(if you hang up|no time for that|phone is broken|can'?t do video|don'?t trust me|don'?t call the number|only chance)\b/i,
  official_channel: /\b(in your banking app|number on the back of your card|we will never ask|visit (a|your) branch|official website)\b/i,
}

const STOP = new Set(['the', 'your', 'you', 'this', 'that', 'with', 'from', 'and', 'for', 'are', 'it', 'its', 'we', 'me', 'to', 'a', 'an', 'is', 'in', 'on', 'of', 'at', 'i', 'my'])

function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))
}

/** A stage matches when most content words of one of its signal phrases appear in the line. */
function signalMatches(line: string, signal: string): boolean {
  const lineWords = new Set(words(line))
  const sig = words(signal)
  if (sig.length === 0) return false
  const hit = sig.filter((w) => lineWords.has(w)).length
  return hit >= Math.min(2, sig.length)
}

export function keywordTag(text: string, playbooks: Playbook[]): Tag {
  const tactics = (Object.keys(TACTIC_RULES) as Tactic[]).filter((t) => TACTIC_RULES[t].test(text))
  const stages: string[] = []
  // A legitimate redirect is not a scam stage, even if it mentions "card" or "code".
  if (!tactics.includes('official_channel')) {
    for (const p of playbooks) {
      for (const s of p.stages) {
        if (s.signals.some((sig) => signalMatches(text, sig))) stages.push(`${p.id}.${s.id}`)
      }
    }
  }
  return { tactics, stages, quote: '' }
}
