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

export const rebuildAfterChange: CollectionAfterChangeHook = ({ doc, previousDoc, operation, req }) => {
  payloadRef = req.payload
  if (shouldRebuild({ doc, previousDoc, operation })) trigger.request()
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
