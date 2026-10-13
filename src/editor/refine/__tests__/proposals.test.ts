import { describe, expect, it } from 'vitest'
import { acceptProposal, runProposals } from '../proposals'

const input = { docId: 'doc-1', docRevision: 7, layerId: 'layer-9' }

describe('C3-B proposal runner', () => {
  it('returns local + AI candidates with ready tasks', async () => {
    const run = await runProposals(input, {
      local: async () => 'local-out',
      ai: async () => ({ output: 'ai-out' }),
    }, { liveRev: () => 7 })
    expect(run.candidates.map(c => c.method)).toEqual(['local', 'ai'])
    expect(run.failures).toEqual([])
    expect(run.candidates.every(c => c.task.state === 'ready')).toBe(true)
    expect(run.stale).toBe(false)
  })
  it('reports AI unavailability honestly instead of faking it', async () => {
    const run = await runProposals(input, {
      local: async () => 'local-out',
      ai: async () => ({ output: null, unavailable: 'Model declined.' }),
    }, { liveRev: () => 7 })
    expect(run.candidates.map(c => c.method)).toEqual(['local'])
    expect(run.failures).toEqual([{ method: 'ai', label: 'AI removal (on-device)', error: 'Model declined.' }])
  })
  it('marks the run stale when the doc moved on', async () => {
    const run = await runProposals(input, {
      local: async () => 'x',
      ai: async () => ({ output: null, unavailable: 'no' }),
    }, { liveRev: () => 9 })
    expect(run.stale).toBe(true)
  })
  it('accepts only against live state (stale + missing layer refuse)', async () => {
    const run = await runProposals(input, {
      local: async () => 'x',
      ai: async () => ({ output: null, unavailable: 'no' }),
    }, { liveRev: () => 7 })
    const [c] = run.candidates
    expect(acceptProposal(c, { docRevision: 7, layerExists: true }).ok).toBe(true)
    expect(acceptProposal(c, { docRevision: 8, layerExists: true }).ok).toBe(false)
    const run2 = await runProposals(input, {
      local: async () => 'y',
      ai: async () => ({ output: null, unavailable: 'no' }),
    }, { liveRev: () => 7 })
    expect(acceptProposal(run2.candidates[0], { docRevision: 7, layerExists: false }).ok).toBe(false)
  })
  it('cancellation yields no candidates and no failures', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const run = await runProposals(input, {
      local: async () => 'x',
      ai: async () => ({ output: 'y' }),
    }, { liveRev: () => 7, signal: ctrl.signal })
    expect(run.candidates).toEqual([])
    expect(run.failures).toEqual([])
  })
})
