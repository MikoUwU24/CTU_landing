import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRebuildTrigger, shouldRebuild } from '../src/lib/rebuild'

describe('shouldRebuild', () => {
  it('fires when publishing', () => {
    expect(shouldRebuild({ operation: 'update', doc: { _status: 'published' }, previousDoc: { _status: 'draft' } })).toBe(true)
  })
  it('fires when unpublishing', () => {
    expect(shouldRebuild({ operation: 'update', doc: { _status: 'draft' }, previousDoc: { _status: 'published' } })).toBe(true)
  })
  it('skips draft-only saves', () => {
    expect(shouldRebuild({ operation: 'update', doc: { _status: 'draft' }, previousDoc: { _status: 'draft' } })).toBe(false)
  })
  it('fires for collections without drafts', () => {
    expect(shouldRebuild({ operation: 'create', doc: {}, previousDoc: null })).toBe(true)
  })
  it('on delete: fires for published docs and for collections without drafts, skips drafts', () => {
    expect(shouldRebuild({ operation: 'delete', doc: { _status: 'published' } })).toBe(true)
    expect(shouldRebuild({ operation: 'delete', doc: {} })).toBe(true)
    expect(shouldRebuild({ operation: 'delete', doc: { _status: 'draft' } })).toBe(false)
  })
})

describe('createRebuildTrigger', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('debounces bursts into one POST', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }))
    const onResult = vi.fn()
    const t = createRebuildTrigger({ url: () => 'https://hook', delayMs: 30_000, fetchFn, onResult })
    t.request(); t.request(); t.request()
    await vi.advanceTimersByTimeAsync(29_000)
    expect(fetchFn).not.toHaveBeenCalled()
    t.request()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(fetchFn).toHaveBeenCalledWith('https://hook', { method: 'POST' })
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ ok: true, status: 201 }))
  })

  it('reports HTTP errors', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }))
    const onResult = vi.fn()
    const t = createRebuildTrigger({ url: () => 'https://hook', delayMs: 10, fetchFn, onResult })
    t.request()
    await vi.advanceTimersByTimeAsync(10)
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ ok: false, status: 500, error: 'nope' }))
  })

  it('reports network errors', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('ECONNRESET'))
    const onResult = vi.fn()
    const t = createRebuildTrigger({ url: () => 'https://hook', delayMs: 10, fetchFn, onResult })
    t.request()
    await vi.advanceTimersByTimeAsync(10)
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error: 'ECONNRESET' }))
  })

  it('reports missing URL instead of throwing', async () => {
    const onResult = vi.fn()
    const t = createRebuildTrigger({ url: () => undefined, delayMs: 10, fetchFn: vi.fn(), onResult })
    t.request()
    await vi.advanceTimersByTimeAsync(10)
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error: 'Missing env var: WEB_DEPLOY_HOOK_URL' }))
  })

  it('passes the pending promise to keepAlive', () => {
    const keepAlive = vi.fn()
    const t = createRebuildTrigger({ url: () => 'https://hook', delayMs: 10, fetchFn: vi.fn(), onResult: vi.fn(), keepAlive })
    t.request()
    expect(keepAlive).toHaveBeenCalledWith(expect.any(Promise))
  })
})
