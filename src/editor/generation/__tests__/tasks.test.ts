import { describe, expect, it, vi } from 'vitest'
import { decideCommit, isAbortError, markStaleIfMovedOn, startGeneration } from '../tasks'
import type { GeneratedCandidate, GenerationProvider } from '../mock-provider'

function fakeCandidate(id: string): GeneratedCandidate {
  return { id, blob: new Blob(['x'], { type: 'image/png' }), mime: 'image/png', width: 1024, height: 1024, name: id, mock: true }
}

function providerWith(candidates: GeneratedCandidate[], impl?: Partial<GenerationProvider>): GenerationProvider {
  return {
    id: 'mock-test-provider',
    mock: true,
    remote: false,
    price: 0,
    capabilities: ['text-to-image', 'variation'],
    generate: vi.fn(async (_req, opts) => {
      opts?.onProgress?.(1)
      return candidates
    }),
    ...impl,
  }
}

describe('C2 generation tasks (cancel + stale protection)', () => {
  it('completes a text-to-image run with progress', async () => {
    const progress: number[] = []
    const run = await startGeneration({
      provider: providerWith([fakeCandidate('a'), fakeCandidate('b')]),
      prompt: 'Rocket poster at dusk',
      aspect: 'portrait',
      count: 2,
      docRevision: 7,
      onProgress: n => progress.push(n),
    })
    expect(run.task.state).toBe('ready')
    expect(run.candidates).toHaveLength(2)
    expect(progress).toEqual([1])
  })

  it('cancels via AbortSignal without candidates', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const slow: GenerationProvider = {
      id: 'mock-test-provider',
      mock: true,
      remote: false,
      price: 0,
      capabilities: ['text-to-image', 'variation'],
      generate: async (_req, opts) => {
        if (opts?.signal?.aborted) throw new DOMException('Generation cancelled.', 'AbortError')
        return []
      },
    }
    const run = await startGeneration({
      provider: slow,
      prompt: 'Rocket poster',
      aspect: 'square',
      count: 1,
      docRevision: 3,
      signal: ctrl.signal,
    })
    expect(run.task.state).toBe('canceled')
    expect(run.candidates).toHaveLength(0)
  })

  it('surfaces provider failures as failed tasks', async () => {
    const failing = providerWith([], {
      generate: async () => {
        throw new Error('mock outage')
      },
    })
    const run = await startGeneration({
      provider: failing,
      prompt: 'Rocket poster',
      aspect: 'square',
      count: 1,
      docRevision: 3,
    })
    expect(run.task.state).toBe('failed')
    expect(run.task.error).toMatch(/mock outage/)
  })

  it('fails empty candidate lists without committing', async () => {
    const run = await startGeneration({
      provider: providerWith([]),
      prompt: 'Rocket poster',
      aspect: 'square',
      count: 1,
      docRevision: 3,
    })
    expect(run.task.state).toBe('failed')
  })

  it('quarantines stale revisions at commit time', async () => {
    const run = await startGeneration({
      provider: providerWith([fakeCandidate('a')]),
      prompt: 'Rocket poster',
      aspect: 'square',
      count: 1,
      docRevision: 7,
    })
    const stale = markStaleIfMovedOn(run, 8)
    expect(stale.stale).toBe(true)
    const decision = decideCommit(run.task, 8)
    expect(decision.ok).toBe(false)
    expect(decision.reason).toMatch(/stale/)
    expect(decideCommit(run.task, 7).ok).toBe(true)
    const committed = decideCommit(run.task, 7).task
    // An already-committed task must refuse a second commit (no silent double-apply).
    expect(decideCommit(committed, 7).ok).toBe(false)
  })

  it('detects AbortError by name', () => {
    expect(isAbortError(new DOMException('x', 'AbortError'))).toBe(true)
    expect(isAbortError(new Error('nope'))).toBe(false)
  })
})
