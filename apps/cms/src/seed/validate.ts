export type SeedArticle = {
  slug: string; title: string; titleAccent: string; page: number; featured: boolean
  sapo: string; tocBlurb: string; heroImage: string | null; images: string[]
  paragraphs: string[]; pullQuote: string | null; isLorem: boolean
}
export type SeedContent = {
  issue: { number: string; period: string; coverImage: string }
  foreword: { title: string; paragraphs: string[]; signature: string }
  masthead: {
    board: { role: string; names: string[] }[]
    publisher: string; address: string; phone: string; website: string; email: string; coverCredit: string
  }
  articles: SeedArticle[]
}

export function validateContent(raw: unknown): { ok: true; content: SeedContent } | { ok: false; errors: string[] } {
  const errors: string[] = []
  const c = raw as Partial<SeedContent>
  if (!c?.issue?.number) errors.push('issue.number: required')
  if (!c?.foreword?.paragraphs?.length) errors.push('foreword.paragraphs: required')
  if (!c?.masthead?.board?.length) errors.push('masthead.board: required')
  const arts = c?.articles ?? []
  if (arts.length !== 8) errors.push(`articles: expected 8, got ${arts.length}`)
  for (const a of arts) {
    if (!a.slug || !a.title) errors.push(`article ${a.page}: slug/title required`)
    if (a.titleAccent && !a.title.toLowerCase().includes(a.titleAccent.toLowerCase()))
      errors.push(`article ${a.slug}: titleAccent "${a.titleAccent}" not in title`)
    // "## " entries are subheadings, not body paragraphs
    if (!a.paragraphs?.some((p) => !p.startsWith('## '))) errors.push(`article ${a.slug}: paragraphs required`)
  }
  return errors.length ? { ok: false, errors } : { ok: true, content: c as SeedContent }
}
