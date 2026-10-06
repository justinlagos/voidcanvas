import { describe, expect, it } from 'vitest'
import { actionForSearchEvidence, rankSearchOpportunities, scoreSearchEvidence, summarizeSearchOpportunities, type SearchOpportunityEvidence } from './discovery'

const row = (overrides: Partial<SearchOpportunityEvidence> = {}): SearchOpportunityEvidence => ({
  query: 'example query',
  cluster: 'Example cluster',
  intent: 'informational',
  audience: 'designer',
  problem: 'A real user problem',
  outcome: 'A useful outcome',
  existing: '',
  gap: 'A clear content or workflow gap',
  title: 'Example title',
  primary: 'example query',
  secondary: 'example secondary',
  competition: 'M',
  opportunity: 'M',
  connection: 'Editor workflow',
  type: 'guide',
  cta: 'Open the Editor',
  links: '',
  priority: 3,
  status: 'planned',
  ...overrides,
})

describe('search opportunity evidence', () => {
  it('ranks high-opportunity low-competition evidence above weaker crowded evidence', () => {
    const strong = row({ query: 'strong', opportunity: 'H', competition: 'L', priority: 1 })
    const weak = row({ query: 'weak', opportunity: 'L', competition: 'H', priority: 5 })
    expect(scoreSearchEvidence(strong)).toBeGreaterThan(scoreSearchEvidence(weak))
    expect(rankSearchOpportunities([weak, strong])[0].query).toBe('strong')
  })

  it('recommends building a planned item only when the evidence threshold is crossed', () => {
    expect(actionForSearchEvidence(row({ opportunity: 'H', competition: 'L', priority: 1 }))).toBe('build')
    expect(actionForSearchEvidence(row({ opportunity: 'L', competition: 'H', priority: 5, connection: '', gap: '' }))).toBe('hold')
  })

  it('protects strong live acquisition surfaces rather than treating them as new content', () => {
    expect(actionForSearchEvidence(row({ status: 'live', opportunity: 'H', competition: 'L', priority: 1 }))).toBe('protect')
  })

  it('summarises status and action counts without inventing search-volume fields', () => {
    const rows = [
      row({ query: 'a', status: 'live', opportunity: 'H', competition: 'L', priority: 1 }),
      row({ query: 'b', status: 'planned', opportunity: 'H', competition: 'L', priority: 2 }),
      row({ query: 'c', status: 'existing', opportunity: 'L', competition: 'H', priority: 5, connection: '', gap: '' }),
    ]
    const s = summarizeSearchOpportunities(rows)
    expect(s.total).toBe(3)
    expect(s.clusters).toEqual(['Example cluster'])
    expect(s.counts.live).toBe(1)
    expect(s.counts.planned).toBe(1)
    expect(s.counts.existing).toBe(1)
    expect('volume' in s).toBe(false)
    expect('keywordDifficulty' in s).toBe(false)
  })
})
