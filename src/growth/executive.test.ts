import { describe, expect, it } from 'vitest'
import { buildExecutiveBrief } from './executive'
import type { GrowthAttribution } from './data'

const data: GrowthAttribution = {
  days: 30, generated_at: new Date(0).toISOString(), definition: 'test',
  totals: { sessions: 100, designers: 90, started: 55, worked: 40, activated: 30, exported: 28 },
  sources: [
    { source: 'google', sessions: 50, designers: 47, started: 35, worked: 30, activated: 20, exported: 19 },
    { source: 'pinterest', sessions: 12, designers: 11, started: 9, worked: 8, activated: 8, exported: 7 },
  ],
  landings: [], campaigns: [],
}

describe('executive growth brief', () => {
  it('reports measured totals and qualified source rather than the tiny high-rate source', () => {
    const b = buildExecutiveBrief(data)
    expect(b.headline).toContain('30 activated designers')
    expect(b.headline).toContain('30%')
    expect(b.summary).toContain('google')
    expect(b.summary).not.toContain('Pinterest is the strongest')
  })

  it('exposes only the deterministic decision queue counts', () => {
    const b = buildExecutiveBrief(data)
    expect(b.automationCandidateCount).toBeGreaterThan(0)
    expect(b.founderDecisionCount).toBe(0)
  })
})
