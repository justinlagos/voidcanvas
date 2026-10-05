import type { DirectionFamily } from './families'
import type { Page, PageGenome } from './types'

type Candidate = { page: Page; score: number }

export interface RhythmState {
  pages: PageGenome[]
  floods: number
  denseLast: boolean | null
}

export function createRhythmState(): RhythmState {
  return { pages: [], floods: 0, denseLast: null }
}

function isFlood(page: Page) {
  return page.genome.colourBlocking === 'flood' || Number(page.genome.parameters.colourFlood ?? 0) >= 0.6
}

function isDense(page: Page) {
  return page.genome.density >= 0.62
}

export function rhythmScore(page: Page, family: DirectionFamily, state: RhythmState) {
  let score = 1
  const prev = state.pages[state.pages.length - 1]
  if (prev?.compositionId === page.genome.compositionId) score -= 0.8

  const dense = isDense(page)
  if (state.denseLast !== null && state.denseLast === dense) score -= 0.18

  if (isFlood(page)) {
    const expected = Math.max(1, Math.round((state.pages.length + 1) * ((family.colourFlood[0] + family.colourFlood[1]) / 2)))
    if (state.floods >= expected) score -= 0.28
  }

  const previousAxis = prev?.axis
  if (previousAxis && previousAxis === page.genome.axis) score -= 0.08

  const previousGrid = prev?.grid
  if (previousGrid && previousGrid === page.genome.grid) score -= 0.06

  return score
}

export function chooseForRhythm(candidates: readonly Candidate[], family: DirectionFamily, state: RhythmState) {
  if (!candidates.length) return null
  const ranked = candidates
    .map((candidate, index) => ({
      candidate,
      rank: candidate.score + rhythmScore(candidate.page, family, state),
      index,
    }))
    .sort((a, b) => b.rank - a.rank || a.index - b.index)
  return ranked[0].candidate
}

export function acceptIntoRhythm(page: Page, state: RhythmState): RhythmState {
  return {
    pages: [...state.pages, page.genome],
    floods: state.floods + (isFlood(page) ? 1 : 0),
    denseLast: isDense(page),
  }
}

export function sequenceHasConsecutiveStructureRepeat(pages: readonly Page[]) {
  for (let i = 1; i < pages.length; i++) {
    if (pages[i - 1].genome.compositionId === pages[i].genome.compositionId) return true
  }
  return false
}
