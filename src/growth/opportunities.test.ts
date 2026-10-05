import { describe, expect, it } from 'vitest'
import { OPPORTUNITIES, scoreOpportunity, type OpportunityInput } from './opportunities'

const base: OpportunityInput = {
  id: 'x', title: 'x', intent: 'x', audience: 'x', problem: 'x', capability: 'cascade', surface: 'learn',
  demand: 5, relevance: 5, advantage: 5, conversion: 5, shareability: 5, confidence: 5, competition: 5,
  risk: 'low', autonomy: 'A2',
}

describe('growth opportunity scoring', () => {
  it('stays inside 0-100', () => {
    expect(scoreOpportunity({ ...base, demand: -50, competition: 99, risk: 'high' })).toBeGreaterThanOrEqual(0)
    expect(scoreOpportunity({ ...base, demand: 99, relevance: 99, advantage: 99, conversion: 99, shareability: 99, confidence: 99, competition: -10 })).toBeLessThanOrEqual(100)
  })

  it('rewards native product advantage more than raw demand alone', () => {
    const generic = scoreOpportunity({ ...base, demand: 10, relevance: 5, advantage: 2, conversion: 4, competition: 9 })
    const native = scoreOpportunity({ ...base, demand: 6, relevance: 10, advantage: 10, conversion: 10, competition: 5 })
    expect(native).toBeGreaterThan(generic)
  })

  it('penalises risk and competition', () => {
    const safe = scoreOpportunity({ ...base, competition: 2, risk: 'low' })
    const risky = scoreOpportunity({ ...base, competition: 9, risk: 'high' })
    expect(safe).toBeGreaterThan(risky)
  })

  it('ships a unique, descending seed queue', () => {
    expect(new Set(OPPORTUNITIES.map(o => o.id)).size).toBe(OPPORTUNITIES.length)
    for (let i = 1; i < OPPORTUNITIES.length; i++) expect(OPPORTUNITIES[i - 1].score).toBeGreaterThanOrEqual(OPPORTUNITIES[i].score)
  })
})
