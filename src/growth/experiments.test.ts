import { describe, expect, it } from 'vitest'
import { assessExperiment } from './experiments'
import type { GrowthExperimentVariant } from './data'

const v = (variant: string, sessions: number, activated: number): GrowthExperimentVariant => ({ experiment: 'hero', variant, sessions, designers: sessions, started: sessions, worked: sessions, activated, exported: activated })

describe('experiment assessment', () => {
  it('refuses to call a lead from tiny samples', () => {
    const r = assessExperiment([v('a', 10, 1), v('b', 10, 8)])
    expect(r.signal).toBe('collecting')
    expect(r.autoAllocationEligible).toBe(false)
  })

  it('can show a directional lead without allowing autonomous allocation', () => {
    const r = assessExperiment([v('a', 30, 15), v('b', 30, 10)])
    expect(r.signal).toBe('strong')
    expect(r.autoAllocationEligible).toBe(false)
  })

  it('only allows future A3 allocation after a large sample and clear gap', () => {
    const r = assessExperiment([v('a', 120, 72), v('b', 120, 48)])
    expect(r.signal).toBe('strong')
    expect(r.autoAllocationEligible).toBe(true)
  })
})
