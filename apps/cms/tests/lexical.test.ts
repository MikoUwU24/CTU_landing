import { describe, expect, it } from 'vitest'
import { paragraphsToLexical } from '../src/seed/lexical'

type N = { type: string; tag?: string; children?: { text?: string }[]; fields?: Record<string, unknown> }

describe('paragraphsToLexical', () => {
  it('emits "## " entries as h3 headings and others as paragraphs', () => {
    const { root } = paragraphsToLexical(['Intro', '## Tiêu đề X', 'Body']) as unknown as { root: { children: N[] } }
    expect(root.children.map((n) => n.type)).toEqual(['paragraph', 'heading', 'paragraph'])
    expect(root.children[1].tag).toBe('h3')
    expect(root.children[1].children?.[0].text).toBe('Tiêu đề X')
    expect(root.children[0].children?.[0].text).toBe('Intro')
  })
  it('counts only body paragraphs for image spacing and pull quote position', () => {
    const paras = ['## H', 'a', 'b', '## H2', 'c', 'd']
    const { root } = paragraphsToLexical(paras, { pullQuote: 'Q', imageIds: [1] }) as unknown as { root: { children: N[] } }
    const kinds = root.children.map((n) => n.type === 'block' ? n.fields?.blockType : n.type)
    // pull quote after 2nd body paragraph ('b'); image after 2nd body paragraph too (every = max(2, floor(4/2)) = 2)
    expect(kinds.filter((k) => k === 'pullQuote')).toHaveLength(1)
    expect(kinds.filter((k) => k === 'image')).toHaveLength(1)
    expect(kinds.indexOf('pullQuote')).toBe(3)
  })
})
