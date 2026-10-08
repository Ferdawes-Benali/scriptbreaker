import { z } from 'zod'

/** Social-engineering tactics the tagger can detect in a single line. */
export const TACTICS = [
  'impersonation', // claims to be someone you know (relative, friend, boss)
  'authority', // claims to be an institution: bank, police, tax office, company
  'problem_creation', // invents a problem: fraud on your account, fine, accident
  'fear', // threatens loss, arrest, harm
  'urgency', // pushes you to act right now
  'isolation', // keeps you on the line, away from others
  'secrecy', // asks you not to tell anyone
  'reassurance', // "this is normal", "you're protected", builds trust
  'credential_request', // asks for codes, passwords, PINs, card details
  'remote_access', // asks you to install an app or share your screen
  'payment_channel_switch', // gift cards, crypto, wire, courier, unusual link
  'money_movement', // asks you to send, transfer or withdraw money
  'verification_avoidance', // resists call-backs, video, official channels
  'official_channel', // LEGIT signal: sends you to the official app/number/branch
] as const

export const TacticSchema = z.enum(TACTICS)
export type Tactic = z.infer<typeof TacticSchema>

export const StageSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string(),
  description: z.string(),
  weight: z.number().min(0.5).max(3),
  optional: z.boolean().optional(),
  tactics: z.array(TacticSchema).min(1),
  signals: z.array(z.string()).min(2).max(8),
  /** How we phrase a prediction of this stage, e.g. "They will ask you to move your money..." */
  expectedAsk: z.string(),
  breakMove: z.string(),
})
export type Stage = z.infer<typeof StageSchema>

export const PlaybookSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string(),
  description: z.string(),
  sources: z.array(z.string().url()).min(1),
  stages: z.array(StageSchema).min(4).max(7),
})
export type Playbook = z.infer<typeof PlaybookSchema>

export type Speaker = 'them' | 'me'

export interface Utterance {
  id: number
  speaker: Speaker
  text: string
  /** True when nobody said who spoke (live mic, unlabelled paste): the tagger decides. */
  autoSpeaker?: boolean
}

/** What the tagger (LLM or keyword fallback) returns for one line. */
export const TagSchema = z.object({
  tactics: z.array(TacticSchema).default([]),
  /** Stage refs as "playbookId.stageId". Unknown refs are dropped later. */
  stages: z.array(z.string()).default([]),
  /** The exact words that justify the tags, copied from the line. */
  quote: z.string().default(''),
  /** Who the tagger thinks said the line, when asked (auto speaker mode). */
  speaker: z.enum(['them', 'me']).optional(),
})
export type Tag = z.infer<typeof TagSchema>

export interface TaggedUtterance extends Utterance {
  tag: Tag
  source: 'llm' | 'keywords'
}

export interface PlaybookState {
  playbookId: string
  score: number
  /** Indexes of reached stages. */
  reached: number[]
  /** Highest reached stage index, -1 if none. */
  maxStage: number
  /** 0-100. */
  risk: number
}

export interface Prediction {
  playbookId: string
  stageIndex: number
  stageId: string
  stageName: string
  expectedAsk: string
  /** Utterance id after which the prediction was made. */
  madeAfter: number
  /** Utterance id that fulfilled it, if any. */
  fulfilledBy?: number
}

export interface EngineResult {
  states: PlaybookState[]
  /** Sorted by score, highest first. */
  leader?: PlaybookState
  risk: number
  currentStage?: Stage
  prediction?: Prediction
  /** Every prediction made so far, newest last. */
  history: Prediction[]
}
