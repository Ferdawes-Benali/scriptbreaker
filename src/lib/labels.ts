import type { Tactic } from '@/engine/types'

/** Plain-language names for tactics, shown under each line. */
export const TACTIC_LABEL: Record<Tactic, { label: string; help: string; legit?: boolean }> = {
  impersonation: { label: 'Pretends to be family', help: 'Claims to be someone you know.' },
  authority: { label: 'Claims authority', help: 'Says they are a bank, police, an agency or a company.' },
  problem_creation: { label: 'Invents a problem', help: 'Fraud on your account, a fine, an accident.' },
  fear: { label: 'Fear', help: 'Threatens loss, arrest or harm.' },
  urgency: { label: 'Rushes you', help: 'Pushes you to act right now so you cannot think.' },
  isolation: { label: 'Isolates you', help: 'Keeps you on the line and away from others.' },
  secrecy: { label: 'Asks for secrecy', help: 'Tells you not to tell anyone.' },
  reassurance: { label: 'False reassurance', help: 'Builds trust: "you are protected", "this is standard".' },
  credential_request: { label: 'Asks for codes', help: 'Codes, PINs, passwords or card details.' },
  remote_access: { label: 'Remote access', help: 'Asks you to install an app or share your screen.' },
  payment_channel_switch: { label: 'Unusual payment', help: 'Gift cards, crypto, wire, courier or a link.' },
  money_movement: { label: 'Asks for money', help: 'Send, transfer or withdraw money.' },
  verification_avoidance: { label: 'Blocks checking', help: 'Resists call-backs, video or official channels.' },
  official_channel: { label: 'Official channel', help: 'Points you to the official app, website or number. A good sign.', legit: true },
}

export function riskWord(risk: number): { word: string; tone: 'calm' | 'watch' | 'alarm' } {
  if (risk >= 70) return { word: 'Likely scam', tone: 'alarm' }
  if (risk >= 35) return { word: 'Following a scam script', tone: 'watch' }
  if (risk > 0) return { word: 'Watching', tone: 'calm' }
  return { word: 'Nothing yet', tone: 'calm' }
}
