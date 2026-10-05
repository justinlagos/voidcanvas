import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/analytics'

export interface GrowthTotals {
  sessions: number
  designers: number
  started: number
  worked: number
  activated: number
  exported: number
}

export interface GrowthSource {
  source: string
  sessions: number
  designers: number
  started: number
  worked: number
  activated: number
  exported: number
}

export interface GrowthLanding {
  landing: string
  sessions: number
  designers: number
  started: number
  activated: number
  exported: number
}

export interface GrowthCampaign {
  source: string
  medium: string
  campaign: string
  content: string
  sessions: number
  activated: number
}

export interface GrowthAttribution {
  days: number
  generated_at: string
  definition: string
  totals: GrowthTotals
  sources: GrowthSource[]
  landings: GrowthLanding[]
  campaigns: GrowthCampaign[]
}

export interface GrowthExperimentSummary {
  experiment: string
  sessions: number
  activated: number
  variants: number
}

export interface GrowthExperimentVariant {
  experiment: string
  variant: string
  sessions: number
  designers: number
  started: number
  worked: number
  activated: number
  exported: number
}

export interface GrowthExperiments {
  days: number
  generated_at: string
  definition: string
  experiments: GrowthExperimentSummary[]
  variants: GrowthExperimentVariant[]
}

async function growthRpc<T>(fn: string, password: string, days: number): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_password: password, p_days: days }),
  })
  if (!r.ok) throw new Error(`Request failed (${r.status})`)
  const j = await r.json()
  if (j?.error) throw new Error(j.error)
  return j as T
}

export const loadGrowthAttribution = (password: string, days = 30) => growthRpc<GrowthAttribution>('vc_admin_growth', password, days)
export const loadGrowthExperiments = (password: string, days = 30) => growthRpc<GrowthExperiments>('vc_admin_experiments', password, days)

export const activationRate = (activated: number, sessions: number) => sessions > 0 ? activated / sessions : 0
