import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Article, Foreword, Issue, Masthead } from './types'

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
    const data = useFixtures()
      ? await fixture<{ docs: Article[] }>('articles')
      : await api<{ docs: Article[] }>('articles', {
          'where[_status][equals]': 'published', sort: 'page', depth: '1', limit: '200',
        })
    return [...data.docs].sort((a, b) => a.page - b.page)
  })()
  return articlesCache
}

export async function getArticle(slug: string) {
  return (await getArticles()).find((a) => a.slug === slug)
}

export async function getCurrentIssue(): Promise<Issue | undefined> {
  const data = useFixtures()
    ? await fixture<{ docs: Issue[] }>('issues')
    : await api<{ docs: Issue[] }>('issues', { 'where[isCurrent][equals]': 'true', depth: '1', limit: '1' })
  return data.docs[0]
}

export const getForeword = () => (useFixtures() ? fixture<Foreword>('foreword') : api<Foreword>('globals/foreword'))
export const getMasthead = () => (useFixtures() ? fixture<Masthead>('masthead') : api<Masthead>('globals/masthead'))
