import { describe, expect, it } from 'vitest'
import { buildGrowthDecisions, decisionCounts } from './decisions'
import type { GrowthAttribution } from './data'

const base = (): GrowthAttribution => ({
  days: 30,
  generated_at: new Date(0).toISOString(),
  definition: 'test',
  totals: { sessions: 0, designers: 0, started: 0, worked: 0, activated: 0, exported: 0 },
  sources: [], landings: [], campaigns: [],
})

describe('Growth OS decisions', () => {
  it('holds when samples are too small', () => {
    const data = base()
    data.totals.sessions = 12
    data.sources = [{ source: 'pinterest', sessions: 12, designers: 10, started: 8, worked: 7, activated: 7, exported: 6 }]
    const d = buildGrowthDecisions(data)
    expect(d).toHaveLength(1)
    expect(d[0].action).toBe('hold')
  })

  it('amplifies a qualified source only after enough activation evidence', () => {
    const data = base()
    data.sources = [{ source: 'google', sessions: 30, designers: 28, started: 20, worked: 16, activated: 10, exported: 9 }]
    const d = buildGrowthDecisions(data)
    expect(d[0].action).toBe('amplify')
    expect(d[0].autonomy).toBe('A2')
  })

  it('sends a poor landing to founder diagnosis rather than auto-killing it', () => {
    const data = base()
    data.landings = [{ landing: '/tools/test', sessions: 50, designers: 45, started: 8, activated: 2, exported: 1 }]
    const d = buildGrowthDecisions(data)
    expect(d[0].action).toBe('fix')
    expect(d[0].autonomy).toBe('A1')
    expect(decisionCounts(d).founder).toBe(1)
  })

  it('never auto-pauses a weak campaign', () => {
    const data = base()
    data.campaigns = [{ source: 'linkedin', medium: 'organic', campaign: 'demo', content: 'a', sessions: 60, activated: 2 }]
    const d = buildGrowthDecisions(data)
    expect(d[0].action).toBe('pause-candidate')
    expect(d[0].autonomy).toBe('A1')
  })

  it('repeats a strong campaign as an A2 candidate', () => {
    const data = base()
    data.campaigns = [{ source: 'pinterest', medium: 'organic', campaign: 'halftone', content: 'before-after', sessions: 30, activated: 12 }]
    const d = buildGrowthDecisions(data)
    expect(d[0].action).toBe('repeat')
    expect(d[0].autonomy).toBe('A2')
  })
})
