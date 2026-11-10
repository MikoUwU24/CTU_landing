import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Article, Foreword, Issue, Masthead, SiteSettings } from './types'

const useFixtures = () => process.env.CMS_FIXTURES === '1'

async function fixture<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(resolve(process.cwd(), 'tests/fixtures', `${name}.json`), 'utf8')) as T
}

async function api<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const base = process.env.CMS_URL
  if (!base) throw new Error('Missing env var: CMS_URL')
  const url = new URL(`/api/${path}`, base)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`CMS ${res.status} for ${url.pathname}: ${await res.text()}`)
  return (await res.json()) as T
}

let articlesCache: Promise<Article[]> | undefined

export function getArticles(): Promise<Article[]> {
  articlesCache ??= (async () => {
    let data: { docs: Article[] }
    if (useFixtures()) {
      data = await fixture<{ docs: Article[] }>('articles')
    } else {
      const issue = await getCurrentIssue()
      data = await api<{ docs: Article[] }>('articles', {
        'where[_status][equals]': 'published', sort: 'page', depth: '1', limit: '200',
        ...(issue?.id != null ? { 'where[issue][equals]': String(issue.id) } : {}),
      })
    }
    return [...data.docs].sort((a, b) => a.page - b.page)
  })()
  return articlesCache
}

export async function getArticle(slug: string) {
  return (await getArticles()).find((a) => a.slug === slug)
}

let issueCache: Promise<Issue | undefined> | undefined

export function getCurrentIssue(): Promise<Issue | undefined> {
  issueCache ??= (async () => {
    const data = useFixtures()
      ? await fixture<{ docs: Issue[] }>('issues')
      : await api<{ docs: Issue[] }>('issues', { 'where[isCurrent][equals]': 'true', depth: '1', limit: '1' })
    return data.docs[0]
  })()
  return issueCache
}

export const getForeword = () => (useFixtures() ? fixture<Foreword>('foreword') : api<Foreword>('globals/foreword'))
export const getMasthead = () => (useFixtures() ? fixture<Masthead>('masthead') : api<Masthead>('globals/masthead'))

export const defaultSiteSettings: SiteSettings = { logoWidthDesktop: 248, logoWidthMobile: 160 }

let settingsCache: Promise<SiteSettings> | undefined

export function getSiteSettings(): Promise<SiteSettings> {
  settingsCache ??= (async () => {
    if (useFixtures()) return defaultSiteSettings
    try {
      const data = await api<Partial<SiteSettings>>('globals/site-settings')
      return {
        logoWidthDesktop: data.logoWidthDesktop ?? defaultSiteSettings.logoWidthDesktop,
        logoWidthMobile: data.logoWidthMobile ?? defaultSiteSettings.logoWidthMobile,
      }
    } catch {
      return defaultSiteSettings
    }
  })()
  return settingsCache
}
