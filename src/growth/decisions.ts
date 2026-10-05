import { activationRate, type GrowthAttribution, type GrowthCampaign, type GrowthLanding, type GrowthSource } from './data'

export type GrowthAction = 'amplify' | 'fix' | 'repeat' | 'pause-candidate' | 'hold'
export type DecisionAutonomy = 'A0' | 'A1' | 'A2' | 'A3'
export type DecisionKind = 'source' | 'landing' | 'campaign' | 'system'

export interface GrowthDecision {
  id: string
  kind: DecisionKind
  subject: string
  action: GrowthAction
  autonomy: DecisionAutonomy
  priority: number
  sessions: number
  activated: number
  rate: number
  reason: string
  next: string
}

const pct = (n: number) => `${Math.round(n * 100)}%`
const cap = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

function sourceDecision(x: GrowthSource): GrowthDecision | null {
  const rate = activationRate(x.activated, x.sessions)
  if (x.sessions < 20) return null

  if (x.sessions >= 25 && x.activated >= 8 && rate >= 0.30) return {
    id: `source:${x.source}:amplify`, kind: 'source', subject: x.source || 'direct', action: 'amplify', autonomy: 'A2',
    priority: cap(55 + rate * 80 + Math.min(20, x.activated)), sessions: x.sessions, activated: x.activated, rate,
    reason: `${x.activated} activated designers from ${x.sessions} sessions (${pct(rate)}).`,
    next: 'Increase owned distribution into this source in a capped step, then re-measure activation rather than clicks.',
  }

  if (x.sessions >= 35 && rate <= 0.07) return {
    id: `source:${x.source}:fix`, kind: 'source', subject: x.source || 'direct', action: 'fix', autonomy: 'A1',
    priority: cap(72 + Math.min(18, x.sessions / 5) - rate * 100), sessions: x.sessions, activated: x.activated, rate,
    reason: `${x.sessions} sessions are producing only ${pct(rate)} activation.`,
    next: 'Inspect intent mismatch, landing experience and first-task friction before sending more traffic.',
  }

  return null
}

function landingDecision(x: GrowthLanding): GrowthDecision | null {
  const rate = activationRate(x.activated, x.sessions)
  if (x.sessions < 20) return null

  if (x.sessions >= 25 && x.activated >= 8 && rate >= 0.32) return {
    id: `landing:${x.landing}:amplify`, kind: 'landing', subject: x.landing, action: 'amplify', autonomy: 'A2',
    priority: cap(58 + rate * 75 + Math.min(18, x.activated)), sessions: x.sessions, activated: x.activated, rate,
    reason: `${x.landing} activates ${pct(rate)} of measured sessions.`,
    next: 'Give this page more qualified internal/search distribution while preserving its current task-first experience.',
  }

  if (x.sessions >= 35 && rate <= 0.08) return {
    id: `landing:${x.landing}:fix`, kind: 'landing', subject: x.landing, action: 'fix', autonomy: 'A1',
    priority: cap(78 + Math.min(15, x.sessions / 6) - rate * 100), sessions: x.sessions, activated: x.activated, rate,
    reason: `${x.landing} has enough traffic to judge but only ${pct(rate)} reaches activation.`,
    next: 'Audit the promise-to-product handoff, first interaction, mobile layout, errors and CTA before expanding traffic.',
  }

  return null
}

function campaignDecision(x: GrowthCampaign): GrowthDecision | null {
  const rate = activationRate(x.activated, x.sessions)
  const subject = [x.source, x.campaign, x.content].filter(Boolean).join(' / ') || 'unnamed campaign'
  if (x.sessions < 20) return null

  if (x.sessions >= 25 && x.activated >= 8 && rate >= 0.30) return {
    id: `campaign:${subject}:repeat`, kind: 'campaign', subject, action: 'repeat', autonomy: 'A2',
    priority: cap(52 + rate * 80 + Math.min(18, x.activated)), sessions: x.sessions, activated: x.activated, rate,
    reason: `This campaign converts ${pct(rate)} of sessions into activated designers.`,
    next: 'Generate another bounded variation of the same job, audience and destination; do not simply increase posting frequency.',
  }

  if (x.sessions >= 40 && rate <= 0.05) return {
    id: `campaign:${subject}:pause`, kind: 'campaign', subject, action: 'pause-candidate', autonomy: 'A1',
    priority: cap(75 + Math.min(15, x.sessions / 8) - rate * 100), sessions: x.sessions, activated: x.activated, rate,
    reason: `${x.sessions} sessions produced ${x.activated} activations (${pct(rate)}).`,
    next: 'Stop expanding this campaign and review creative/intent fit. Do not automatically delete or blacklist the channel.',
  }

  return null
}

export function buildGrowthDecisions(data: GrowthAttribution): GrowthDecision[] {
  const out: GrowthDecision[] = []
  for (const source of data.sources) { const d = sourceDecision(source); if (d) out.push(d) }
  for (const landing of data.landings) { const d = landingDecision(landing); if (d) out.push(d) }
  for (const campaign of data.campaigns) { const d = campaignDecision(campaign); if (d) out.push(d) }

  if (!out.length) out.push({
    id: 'system:hold', kind: 'system', subject: 'Growth OS', action: 'hold', autonomy: 'A0', priority: 10,
    sessions: data.totals.sessions, activated: data.totals.activated, rate: activationRate(data.totals.activated, data.totals.sessions),
    reason: 'No source, landing page or campaign has crossed a conservative action threshold yet.',
    next: 'Keep measuring. Do not manufacture a winner from a small sample.',
  })

  return out.sort((a, b) => b.priority - a.priority || b.sessions - a.sessions)
}

export function decisionCounts(decisions: GrowthDecision[]) {
  return {
    founder: decisions.filter(d => d.autonomy === 'A1').length,
    autonomous: decisions.filter(d => d.autonomy === 'A2' || d.autonomy === 'A3').length,
    hold: decisions.filter(d => d.action === 'hold').length,
  }
}
