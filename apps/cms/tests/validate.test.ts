import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { validateContent } from '../src/seed/validate'

const real = JSON.parse(readFileSync(resolve(__dirname, '../../../seed/content.json'), 'utf8'))

describe('validateContent', () => {
  it('accepts the extracted content', () => {
    const r = validateContent(real)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.content.articles).toHaveLength(8)
  })
  it('rejects missing articles', () => {
    const r = validateContent({ ...real, articles: [] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain('articles: expected 8, got 0')
  })
  it('rejects accent not in title', () => {
    const bad = structuredClone(real)
    bad.articles[0].titleAccent = 'xyz'
    const r = validateContent(bad)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0]).toMatch(/titleAccent/)
  })
  it('requires at least one non-heading paragraph', () => {
    const bad = structuredClone(real)
    bad.articles[0].paragraphs = ['## Only a heading']
    const r = validateContent(bad)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join('\n')).toMatch(/paragraphs required/)
  })
})
