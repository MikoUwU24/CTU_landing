import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload, type Payload } from 'payload'
import config from '../payload.config'
import type { Article } from '../payload-types'
import { paragraphsToLexical } from './lexical'
import { validateContent } from './validate'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const seedDir = path.join(root, 'seed')
const dryRun = process.argv.includes('--dry-run')

async function upsertMedia(payload: Payload, file: string, alt: string) {
  const existing = await payload.find({ collection: 'media', where: { filename: { equals: file } }, limit: 1 })
  if (existing.docs[0]) return existing.docs[0].id
  const filePath = path.join(seedDir, 'images', file)
  if (!existsSync(filePath)) throw new Error(`Missing seed image: ${filePath}`)
  const doc = await payload.create({ collection: 'media', data: { alt }, filePath })
  console.log('media', file)
  return doc.id
}

async function main() {
  const result = validateContent(JSON.parse(readFileSync(path.join(seedDir, 'content.json'), 'utf8')))
  if (!result.ok) {
    console.error(result.errors.join('\n'))
    process.exit(1)
  }
  const c = result.content
  if (dryRun) {
    console.log(`OK: ${c.articles.length} articles, foreword ${c.foreword.paragraphs.length} paras, board ${c.masthead.board.length} roles`)
    return
  }
  const payload = await getPayload({ config })

  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('Missing env var: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD')
  const users = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
  if (!users.docs[0]) await payload.create({ collection: 'users', data: { email, password, role: 'admin', name: 'Quản trị' } })

  const coverId = await upsertMedia(payload, c.issue.coverImage, `Bìa Tạp chí Mỹ thuật số ${c.issue.number}`)
  const issues = await payload.find({ collection: 'issues', where: { number: { equals: c.issue.number } }, limit: 1 })
  const issueData = { number: c.issue.number, period: c.issue.period, coverImage: coverId, isCurrent: true }
  const issue = issues.docs[0]
    ? await payload.update({ collection: 'issues', id: issues.docs[0].id, data: issueData })
    : await payload.create({ collection: 'issues', data: issueData })

  for (const a of c.articles) {
    const imageIds = []
    for (const f of a.images) imageIds.push(await upsertMedia(payload, f, a.title))
    const heroId = a.heroImage ? await upsertMedia(payload, a.heroImage, a.title) : undefined
    const bodyImages = imageIds.filter((id) => id !== heroId)
    const data = {
      title: a.title, titleAccent: a.titleAccent, slug: a.slug, sapo: a.sapo, page: a.page,
      featured: a.featured, issue: issue.id, heroImage: heroId,
      body: paragraphsToLexical(a.paragraphs, { pullQuote: a.isLorem ? null : a.pullQuote, imageIds: bodyImages }) as Article['body'],
      _status: 'published' as const,
    }
    const found = await payload.find({ collection: 'articles', where: { slug: { equals: a.slug } }, limit: 1, draft: true })
    if (found.docs[0]) await payload.update({ collection: 'articles', id: found.docs[0].id, data })
    else await payload.create({ collection: 'articles', data })
    console.log('article', a.page, a.slug)
  }

  await payload.updateGlobal({
    slug: 'foreword',
    data: { title: c.foreword.title, signature: c.foreword.signature, body: paragraphsToLexical(c.foreword.paragraphs) as Article['body'] },
  })
  await payload.updateGlobal({
    slug: 'masthead',
    data: { ...c.masthead, board: c.masthead.board.map((b) => ({ role: b.role, names: b.names.map((name) => ({ name })) })) },
  })
  console.log('seed done')
  process.exit(0)
}

// `payload run` exits once the module finishes evaluating, so main() must be awaited (top-level await).
try {
  await main()
} catch (e) {
  console.error(e)
  process.exit(1)
}
