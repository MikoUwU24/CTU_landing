export type RebuildResult = { ok: boolean; status?: number; error?: string; at: string }

type Status = { _status?: string } | null | undefined

/**
 * `publishedNow`: for the ambiguous draft-over-published case (doc 'draft', previousDoc 'published'),
 * whether the main (published) row is still published after the save. A draft-only save leaves it
 * published (no rebuild); a real unpublish makes it a draft (rebuild). When omitted, that case is
 * treated as an unpublish.
 */
export function shouldRebuild(args: { doc: Status; previousDoc?: Status; operation: 'create' | 'update' | 'delete'; publishedNow?: boolean }): boolean {
  const now = args.doc?._status
  const before = args.previousDoc?._status
  if (args.operation === 'delete') return now === 'published' || now === undefined
  if (now === undefined && before === undefined) return true // collection/global without drafts
  if (now === 'draft' && before === 'published' && args.publishedNow === true) return false
  return now === 'published' || before === 'published'
}

/** Looks up the main row's status; on any lookup failure logs and returns undefined so the caller rebuilds. */
export async function resolvePublishedNow(lookup: () => Promise<Status>): Promise<boolean | undefined> {
  try {
    return (await lookup())?._status === 'published'
  } catch (e) {
    console.error('[rebuild] published-status lookup failed; rebuilding', e)
    return undefined
  }
}

export function createRebuildTrigger(opts: {
  url: () => string | undefined
  delayMs: number
  fetchFn?: typeof fetch
  onResult: (r: RebuildResult) => Promise<void> | void
  keepAlive?: (p: Promise<unknown>) => void
}) {
  const fetchFn = opts.fetchFn ?? fetch
  let timer: ReturnType<typeof setTimeout> | undefined
  let resolvePending: (() => void) | undefined
  let pending: Promise<void> | undefined

  async function fire() {
    const at = new Date().toISOString()
    const url = opts.url()
    let result: RebuildResult
    if (!url) {
      result = { ok: false, error: 'Missing env var: WEB_DEPLOY_HOOK_URL', at }
    } else {
      try {
        const res = await fetchFn(url, { method: 'POST' })
        result = res.ok ? { ok: true, status: res.status, at } : { ok: false, status: res.status, error: await res.text(), at }
      } catch (e) {
        result = { ok: false, error: e instanceof Error ? e.message : String(e), at }
      }
    }
    if (!result.ok) console.error('[rebuild] deploy hook failed', result)
    await opts.onResult(result)
  }

  function request() {
    if (timer) clearTimeout(timer)
    if (!pending) {
      pending = new Promise<void>((resolve) => { resolvePending = resolve })
      opts.keepAlive?.(pending)
    }
    timer = setTimeout(async () => {
      timer = undefined
      const done = resolvePending
      pending = undefined
      resolvePending = undefined
      try {
        await fire()
      } catch (e) {
        console.error('[rebuild] onResult failed', e)
      } finally {
        done?.()
      }
    }, opts.delayMs)
  }

  return { request, flush: () => pending ?? Promise.resolve() }
}
