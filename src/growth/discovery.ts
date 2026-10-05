export type SearchCompetition = 'L' | 'M' | 'H'
export type SearchOpportunityLevel = 'L' | 'M' | 'H'
export type SearchStatus = 'live' | 'existing' | 'planned' | 'skip'

export interface SearchOpportunityEvidence {
  query: string
  cluster: string
  intent: string
  audience: string
  problem: string
  outcome: string
  existing: string
  gap: string
  title: string
  primary: string
  secondary: string
  competition: SearchCompetition
  opportunity: SearchOpportunityLevel
  connection: string
  type: string
  cta: string
  links: string
  priority: number
  status: SearchStatus
}

export interface SearchDiscoveryArtifact {
  schema: 1
  source: string
  evidence: string
  total: number
  clusters: string[]
  statuses: Partial<Record<SearchStatus, number>>
  opportunities: SearchOpportunityEvidence[]
}

export interface RankedSearchOpportunity extends SearchOpportunityEvidence {
  evidenceScore: number
  action: 'protect' | 'improve' | 'build' | 'hold'
}

const opportunityWeight: Record<SearchOpportunityLevel, number> = { L: 1, M: 2, H: 3 }
const competitionWeight: Record<SearchCompetition, number> = { L: 3, M: 2, H: 1 }

/**
 * 0-100 evidence score using only fields the existing SEO research actually
 * contains. It deliberately does not invent volume, CPC or keyword difficulty.
 */
export function scoreSearchEvidence(x: SearchOpportunityEvidence): number {
  const opportunity = opportunityWeight[x.opportunity]
  const competition = competitionWeight[x.competition]
  const priority = Math.max(1, Math.min(5, Number.isFinite(x.priority) ? x.priority : 5))
  const priorityWeight = 6 - priority
  const hasConnection = x.connection.trim().length > 0 ? 1 : 0
  const hasGap = x.gap.trim().length > 0 ? 1 : 0
  const intentWeight = /commercial|workflow/i.test(x.intent) ? 2 : 1

  const raw =
    opportunity * 22 +
    competition * 12 +
    priorityWeight * 7 +
    hasConnection * 5 +
    hasGap * 4 +
    intentWeight * 4

  return Math.max(0, Math.min(100, Math.round(raw / 1.5)))
}

export function actionForSearchEvidence(x: SearchOpportunityEvidence): RankedSearchOpportunity['action'] {
  if (x.status === 'skip') return 'hold'
  const score = scoreSearchEvidence(x)
  if (x.status === 'live') return score >= 65 ? 'protect' : 'improve'
  if (x.status === 'existing') return score >= 60 ? 'improve' : 'hold'
  return score >= 60 ? 'build' : 'hold'
}

export function rankSearchOpportunities(rows: SearchOpportunityEvidence[]): RankedSearchOpportunity[] {
  return rows
    .map(x => ({ ...x, evidenceScore: scoreSearchEvidence(x), action: actionForSearchEvidence(x) }))
    .sort((a, b) => b.evidenceScore - a.evidenceScore || a.priority - b.priority || a.query.localeCompare(b.query))
}

export function summarizeSearchOpportunities(rows: SearchOpportunityEvidence[]) {
  const ranked = rankSearchOpportunities(rows)
  const clusters = Array.from(new Set(rows.map(x => x.cluster))).sort()
  const counts = { live: 0, existing: 0, planned: 0, skip: 0, protect: 0, improve: 0, build: 0, hold: 0 }
  for (const x of ranked) {
    counts[x.status]++
    counts[x.action]++
  }
  return { total: rows.length, clusters, counts, top: ranked.slice(0, 20) }
}
