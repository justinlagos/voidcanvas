import { activationRate, type GrowthExperimentVariant } from './data'

export type ExperimentSignal = 'collecting' | 'flat' | 'possible' | 'strong'

export interface ExperimentAssessment {
  signal: ExperimentSignal
  label: string
  leader?: GrowthExperimentVariant
  runnerUp?: GrowthExperimentVariant
  gap: number
  directionalEvidence: boolean
  autoAllocationEligible: boolean
}

/**
 * Conservative policy, intentionally not a statistical-significance claim.
 * 25 sessions/variant is enough to show a directional hint in admin.
 * Automatic A3 allocation is much stricter: 100 sessions/variant and a 10-point
 * activation-rate lead. Even then a publisher must obey its own budget/rate caps.
 */
export function assessExperiment(variants: GrowthExperimentVariant[]): ExperimentAssessment {
  const ranked = [...variants].sort((a, b) => activationRate(b.activated, b.sessions) - activationRate(a.activated, a.sessions))
  const leader = ranked[0], runnerUp = ranked[1]
  const gap = leader && runnerUp ? activationRate(leader.activated, leader.sessions) - activationRate(runnerUp.activated, runnerUp.sessions) : 0
  const directionalEvidence = ranked.length >= 2 && ranked.every(v => v.sessions >= 25)
  const autoAllocationEligible = ranked.length >= 2 && ranked.every(v => v.sessions >= 100) && gap >= 0.10

  if (!directionalEvidence) return { signal: 'collecting', label: 'Collecting evidence', leader, runnerUp, gap, directionalEvidence, autoAllocationEligible: false }
  if (gap >= 0.08) return { signal: 'strong', label: 'Strong directional lead', leader, runnerUp, gap, directionalEvidence, autoAllocationEligible }
  if (gap >= 0.03) return { signal: 'possible', label: 'Possible lead', leader, runnerUp, gap, directionalEvidence, autoAllocationEligible: false }
  return { signal: 'flat', label: 'No meaningful lead yet', leader, runnerUp, gap, directionalEvidence, autoAllocationEligible: false }
}
