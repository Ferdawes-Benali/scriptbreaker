import bank from '../data/playbooks/bank_safe_account.js'
import family from '../data/playbooks/family_emergency.js'
import government from '../data/playbooks/government_fine.js'
import { PlaybookSchema, type Playbook } from './types.js'

/** All playbooks, validated at load time so a bad JSON edit fails loudly. */
export const PLAYBOOKS: Playbook[] = [bank, family, government].map((p) => PlaybookSchema.parse(p))

export function getPlaybook(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id)
}

/** Every valid stage reference, as "playbookId.stageId". */
export const STAGE_REFS: Set<string> = new Set(
  PLAYBOOKS.flatMap((p) => p.stages.map((s) => `${p.id}.${s.id}`)),
)
