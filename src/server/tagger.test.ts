import { describe, expect, it } from 'vitest'
import { SYSTEM_PROMPT, parseTag } from './tagger'

describe('parseTag', () => {
  it('keeps known tactics and stage refs', () => {
    const tag = parseTag(
      '{"tactics":["isolation","secrecy"],"stages":["bank_safe_account.isolate"],"quote":"don\'t hang up"}',
    )
    expect(tag).toEqual({ tactics: ['isolation', 'secrecy'], stages: ['bank_safe_account.isolate'], quote: "don't hang up" })
  })

  it('drops invented tactics and stage refs instead of failing', () => {
    const tag = parseTag('{"tactics":["isolation","mind_control"],"stages":["bank_safe_account.nope","x.y"],"quote":""}')
    expect(tag.tactics).toEqual(['isolation'])
    expect(tag.stages).toEqual([])
  })

  it('accepts a fenced code block', () => {
    expect(parseTag('```json\n{"tactics":[],"stages":[],"quote":""}\n```').tactics).toEqual([])
  })

  it('throws on non-JSON so the caller can retry', () => {
    expect(() => parseTag('Sure! Here are the tags...')).toThrow()
  })

  it('removes duplicate stage refs', () => {
    expect(parseTag('{"stages":["bank_safe_account.isolate","bank_safe_account.isolate"]}').stages).toHaveLength(1)
  })
})

describe('system prompt', () => {
  it('lists every playbook stage and treats input as untrusted', () => {
    expect(SYSTEM_PROMPT).toContain('bank_safe_account.safe_account_transfer')
    expect(SYSTEM_PROMPT).toContain('government_fine.unusual_payment')
    expect(SYSTEM_PROMPT).toMatch(/untrusted data/i)
  })
})
