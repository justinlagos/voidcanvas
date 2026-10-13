import { describe, expect, it } from 'vitest'
import { cancel, canCommit, commitTask, complete, consent, createTask, fail, MOCK_COST, showDisclosure, start } from '../generation-tasks'

describe('B08 mock provider + consent machine (offline, no charges)', () => {
  it('is visibly mocked with zero cost', () => {
    const t = createTask(7, ['img-photo'], 'text-to-image')
    expect(t.provider).toBe('mock-test-provider')
    expect(t.mock).toBe(true)
    expect(t.costEstimate).toBe(MOCK_COST)
  })
  it('requires disclosure before consent and runs the happy path', () => {
    let t = createTask(7, ['img-photo'], 'region-edit')
    t = showDisclosure(t)
    t = consent(t, true)
    t = start(t)
    t = complete(t, 'asset-1')
    expect(canCommit(t, 7).ok).toBe(true)
    expect(commitTask(t, 7).state).toBe('committed')
  })
  it('quarantines stale revisions instead of overwriting', () => {
    let t = createTask(7, ['img-photo'], 'variation')
    t = showDisclosure(t); t = consent(t, true); t = start(t); t = complete(t, 'asset-9')
    expect(canCommit(t, 8)).toEqual({ ok: false, reason: 'stale-revision: keep in tray' })
    expect(commitTask(t, 8).error).toMatch(/stale/)
  })
  it('supports cancel and failure without damaging source', () => {
    let t = cancel(showDisclosure(createTask(1, [], 'text-to-image')))
    expect(t.state).toBe('canceled')
    let f = showDisclosure(createTask(1, [], 'text-to-image'))
    f = consent(f, true); f = start(f); f = fail(f, 'mock outage')
    expect(f.state).toBe('failed')
  })
})
