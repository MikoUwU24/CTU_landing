import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.unstubAllGlobals() })

describe('cms client (fixtures)', () => {
  it('reads fixtures when CMS_FIXTURES=1 and sorts by page', async () => {
    vi.stubEnv('CMS_FIXTURES', '1')
    const cms = await import('../../src/lib/cms')
    const arts = await cms.getArticles()
    expect(arts.map((a) => a.page)).toEqual([3, 5])
    expect((await cms.getArticle('sac-mau-ki-uc'))?.title).toBe('Sắc màu kí ức')
    expect((await cms.getCurrentIssue())?.number).toBe('034')
  })
})

describe('cms client (http)', () => {
  it('throws a clear error when CMS_URL is missing', async () => {
    vi.stubEnv('CMS_FIXTURES', '')
    vi.stubEnv('CMS_URL', '')
    const cms = await import('../../src/lib/cms')
    await expect(cms.getArticles()).rejects.toThrow('Missing env var: CMS_URL')
  })
  it('requests published articles with depth and fails loudly on HTTP error', async () => {
    vi.stubEnv('CMS_FIXTURES', '')
    vi.stubEnv('CMS_URL', 'https://cms.example')
    const fetchMock = vi.fn(async (u: string) =>
      new URL(u).pathname === '/api/issues' ? Response.json({ docs: [] }) : new Response('down', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const cms = await import('../../src/lib/cms')
    await expect(cms.getArticles()).rejects.toThrow('CMS 503')
    const url = new URL(fetchMock.mock.calls.map((c) => c[0]).find((u) => new URL(u).pathname === '/api/articles')!)
    expect(url.pathname).toBe('/api/articles')
    expect(url.searchParams.get('where[_status][equals]')).toBe('published')
    expect(url.searchParams.get('sort')).toBe('page')
  })
  it('scopes articles to the current issue', async () => {
    vi.stubEnv('CMS_FIXTURES', '')
    vi.stubEnv('CMS_URL', 'https://cms.example')
    const fetchMock = vi.fn(async (u: string) =>
      new URL(u).pathname === '/api/issues'
        ? Response.json({ docs: [{ id: 7, number: '034', period: 'x' }] })
        : Response.json({ docs: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const cms = await import('../../src/lib/cms')
    await cms.getArticles()
    const artUrl = new URL(fetchMock.mock.calls.map((c) => c[0]).find((u) => new URL(u).pathname === '/api/articles')!)
    expect(artUrl.searchParams.get('where[issue][equals]')).toBe('7')
    expect(artUrl.searchParams.get('where[_status][equals]')).toBe('published')
  })
  it('falls back to all published articles when there is no current issue', async () => {
    vi.stubEnv('CMS_FIXTURES', '')
    vi.stubEnv('CMS_URL', 'https://cms.example')
    const fetchMock = vi.fn(async (u: string) => Response.json({ docs: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const cms = await import('../../src/lib/cms')
    await cms.getArticles()
    const artUrl = new URL(fetchMock.mock.calls.map((c) => c[0]).find((u) => new URL(u).pathname === '/api/articles')!)
    expect(artUrl.searchParams.has('where[issue][equals]')).toBe(false)
  })
})
