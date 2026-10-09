import { describe, expect, it } from 'vitest'
import { guessSpeaker } from './keywordTagger'
import { parseConversation } from './tagClient'

describe('speaker handling', () => {
  it('keeps explicit Them:/Me: labels and marks unlabelled lines as auto', () => {
    const u = parseConversation('Them: This is your bank.\nMe: Oh no.\nPlease transfer the money now.')
    expect(u.map((x) => [x.speaker, !!x.autoSpeaker])).toEqual([
      ['them', false],
      ['me', false],
      ['them', true],
    ])
  })

  it('offline guess: reactions are "me", claims and instructions are "them"', () => {
    expect(guessSpeaker('Oh no, what kind of transactions?')).toBe('me')
    expect(guessSpeaker("I'll hang up and call the number on my card.")).toBe('me')
    expect(guessSpeaker('This is Daniel from the fraud department.')).toBe('them')
    expect(guessSpeaker('Transfer your savings to a secure account now.')).toBe('them')
  })
})

import { splitSentences } from './tagClient'

describe('splitSentences', () => {
  it('splits an email into sentence lines and merges tiny fragments', () => {
    const s = splitSentences('Dear customer. We detected suspicious transactions on your account. Do not contact your branch! Move your funds now.')
    expect(s).toEqual([
      'Dear customer. We detected suspicious transactions on your account.',
      'Do not contact your branch! Move your funds now.',
    ])
  })

  it('caps the number of lines', () => {
    const body = Array.from({ length: 30 }, (_, i) => `This is sentence number ${i} of a long email.`).join(' ')
    expect(splitSentences(body, 10)).toHaveLength(10)
  })
})
