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

export async function loadGrowthAttribution(password: string, days = 30): Promise<GrowthAttribution> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/vc_admin_growth`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_password: password, p_days: days }),
  })
  if (!r.ok) throw new Error(`Request failed (${r.status})`)
  const j = await r.json()
  if (j?.error) throw new Error(j.error)
  return j as GrowthAttribution
}

export const activationRate = (activated: number, sessions: number) => sessions > 0 ? activated / sessions : 0
