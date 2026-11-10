import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook, Payload } from 'payload'
import { waitUntil } from '@vercel/functions'
import { createRebuildTrigger, shouldRebuild } from '../lib/rebuild'

let payloadRef: Payload | undefined

const trigger = createRebuildTrigger({
  url: () => process.env.WEB_DEPLOY_HOOK_URL,
  delayMs: 30_000,
  keepAlive: (p) => waitUntil(p),
  onResult: async (r) => {
    await payloadRef?.updateGlobal({
      slug: 'rebuild-status',
      data: { lastStatus: r.ok ? `OK (${r.status})` : `LỖI${r.status ? ` (${r.status})` : ''}`, lastError: r.error ?? '', lastAt: r.at },
      overrideAccess: true,
    })
  },
})

export const rebuildAfterChange: CollectionAfterChangeHook = async ({ collection, doc, previousDoc, operation, req }) => {
  payloadRef = req.payload
  // Payload passes no draft-save flag to afterChange. A draft save over a published doc and a real
  // unpublish both look like published -> draft, so read the main row (draft: false) to tell them apart.
  let publishedNow: boolean | undefined
  if (doc?._status === 'draft' && previousDoc?._status === 'published') {
    const main = await req.payload.findByID({ collection: collection.slug, id: doc.id, draft: false, depth: 0, req })
    publishedNow = (main as { _status?: string })._status === 'published'
  }
  if (shouldRebuild({ doc, previousDoc, operation, publishedNow })) trigger.request()
  return doc
}

export const rebuildAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  payloadRef = req.payload
  if (shouldRebuild({ doc, operation: 'delete' })) trigger.request()
  return doc
}

export const rebuildAfterGlobalChange: GlobalAfterChangeHook = ({ doc, req }) => {
  payloadRef = req.payload
  trigger.request()
  return doc
}
