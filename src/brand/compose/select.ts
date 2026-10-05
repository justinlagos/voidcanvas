import type { DirectionFamily } from './families'
import { recentCompositionPenalty } from './genome'
import { acceptIntoRhythm, chooseForRhythm, type RhythmState } from './rhythm'
import type { LintFinding, Page, PageGenome } from './types'

export interface CompositionCandidate {
  page: Page
  fit: number
  lint: LintFinding[]
}

const hardFail = (findings: readonly LintFinding[]) => findings.some((f) => f.level === 'attention')

export function viableCandidates(candidates: readonly CompositionCandidate[]) {
  return candidates.filter((candidate) => !hardFail(candidate.lint))
}

export function selectComposition(input: {
  candidates: readonly CompositionCandidate[]
  family: DirectionFamily
  rhythm: RhythmState
  recent?: readonly PageGenome[]
  recentWindow?: number
}) {
  const viable = viableCandidates(input.candidates)
  if (!viable.length) return null

  const scored = viable.map((candidate) => {
    const lintPenalty = candidate.lint.filter((f) => f.level === 'check').length * 0.05
    const recentPenalty = recentCompositionPenalty(candidate.page.genome, input.recent ?? [], input.recentWindow ?? 8)
    return {
      page: candidate.page,
      score: candidate.fit - lintPenalty - recentPenalty,
      candidate,
    }
  })

  const picked = chooseForRhythm(scored.map((x) => ({ page: x.page, score: x.score })), input.family, input.rhythm)
  if (!picked) return null
  const original = scored.find((x) => x.page === picked.page)!.candidate
  return { candidate: original, rhythm: acceptIntoRhythm(original.page, input.rhythm) }
}
