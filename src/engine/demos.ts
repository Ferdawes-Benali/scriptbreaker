import { z } from 'zod'
import bankScam from '@/data/demos/bank_scam.json'
import legitBank from '@/data/demos/legit_bank.json'
import family from '@/data/demos/family_emergency.json'

const DemoLineSchema = z.object({
  speaker: z.enum(['them', 'me']),
  text: z.string().min(1),
  /** Hand-written expected stage refs, used by tests and the eval harness. */
  expect: z.array(z.string()).optional(),
  /** True when the line is a legitimate "official channel" signal. */
  legit: z.boolean().optional(),
})

export const DemoSchema = z.object({
  id: z.string(),
  title: z.string(),
  isScam: z.boolean(),
  playbookId: z.string().nullable(),
  note: z.string(),
  lines: z.array(DemoLineSchema).min(2),
})
export type Demo = z.infer<typeof DemoSchema>

export const DEMOS: Demo[] = [bankScam, family, legitBank].map((d) => DemoSchema.parse(d))

/** Turn a demo into "Them: ..." / "Me: ..." text for the paste box. */
export function demoToText(d: Demo): string {
  return d.lines.map((l) => `${l.speaker === 'them' ? 'Them' : 'Me'}: ${l.text}`).join('\n')
}
