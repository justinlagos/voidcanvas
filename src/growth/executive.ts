import { activationRate, type GrowthAttribution } from './data'
import { buildGrowthDecisions, decisionCounts } from './decisions'

export interface GrowthExecutiveBrief {
  headline: string
  summary: string
  founderDecisionCount: number
  automationCandidateCount: number
  highestPriority?: string
}

const pct = (n: number) => `${Math.round(n * 100)}%`

/**
 * Plain-language brief from measured data only. No LLM inference, no invented
 * causality: it reports the strongest measured source and the deterministic
 * decision rules already visible in the dashboard.
 */
export function buildExecutiveBrief(data: GrowthAttribution): GrowthExecutiveBrief {
  const decisions = buildGrowthDecisions(data)
  const counts = decisionCounts(decisions)
  const overall = activationRate(data.totals.activated, data.totals.sessions)
  const qualified = [...data.sources]
    .filter(x => x.sessions >= 20)
    .sort((a, b) => activationRate(b.activated, b.sessions) - activationRate(a.activated, a.sessions))
  const best = qualified[0]
  const top = decisions.find(d => d.action !== 'hold')

  const sourceSentence = best
    ? `${best.source || 'Direct'} is the strongest source with enough evidence, activating ${pct(activationRate(best.activated, best.sessions))} of ${best.sessions} sessions.`
    : 'No acquisition source has enough sessions for a qualified comparison yet.'

  const actionSentence = top
    ? `Highest-priority action: ${top.action.replace('-', ' ')} ${top.subject}.`
    : 'No action threshold has been crossed; the correct action is to keep measuring.'

  const attentionSentence = counts.founder
    ? `${counts.founder} item${counts.founder === 1 ? '' : 's'} require founder judgement; ${counts.autonomous} are low-risk automation candidates.`
    : `Nothing currently requires founder judgement; ${counts.autonomous} low-risk action candidate${counts.autonomous === 1 ? '' : 's'} can proceed only through a bounded executor.`

  return {
    headline: `${data.totals.activated} activated designers from ${data.totals.sessions} measured sessions (${pct(overall)}).`,
    summary: `${sourceSentence} ${actionSentence} ${attentionSentence}`,
    founderDecisionCount: counts.founder,
    automationCandidateCount: counts.autonomous,
    highestPriority: top?.id,
  }
}
