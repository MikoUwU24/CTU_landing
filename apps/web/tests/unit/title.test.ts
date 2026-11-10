import { describe, expect, it } from 'vitest'
import { splitTitle } from '../../src/lib/title'

describe('splitTitle', () => {
  it('marks the accent part, case-insensitive, preserving original casing', () => {
    expect(splitTitle('Hội họa Việt Nam đương đại', 'việt nam')).toEqual([
      { text: 'Hội họa ', accent: false },
      { text: 'Việt Nam', accent: true },
      { text: ' đương đại', accent: false },
    ])
  })
  it('accent at start', () => {
    expect(splitTitle('Sắc màu kí ức', 'Sắc màu')).toEqual([
      { text: 'Sắc màu', accent: true },
      { text: ' kí ức', accent: false },
    ])
  })
  it('no or missing accent returns whole title', () => {
    expect(splitTitle('Kí ức', null)).toEqual([{ text: 'Kí ức', accent: false }])
    expect(splitTitle('Kí ức', 'xyz')).toEqual([{ text: 'Kí ức', accent: false }])
  })
})
