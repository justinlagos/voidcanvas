import { renderBudget, visibleTiles } from './performance'
import { pressureDecision } from './stage-production'

export interface TortureFixture {
  id: string
  label: string
  width: number
  height: number
  layers: number
  boards: number
  effects: number
}

export const PHASE9_FIXTURES: TortureFixture[] = [
  { id: '8k-poster', label: '8K photo poster', width: 8192, height: 5464, layers: 61, boards: 1, effects: 14 },
  { id: 'campaign-120', label: '120-board campaign', width: 24000, height: 16000, layers: 438, boards: 120, effects: 36 },
  { id: 'exhibition', label: 'Large exhibition artwork', width: 30000, height: 20000, layers: 84, boards: 1, effects: 22 },
  { id: 'deep-psd', label: 'Deep imported PSD', width: 9000, height: 9000, layers: 320, boards: 12, effects: 48 },
  { id: 'print-brochure', label: 'CMYK print brochure spread', width: 7016, height: 4961, layers: 96, boards: 16, effects: 12 },
]

export interface TortureBudgetResult {
  fixture: TortureFixture
  tileSize: number
  residentTiles: number
  overviewMaxEdge: number
  wholeDocumentTiles: number
  bounded: boolean
}

/** Structural budgets are deterministic in CI; wall-clock/GPU timings belong to real browser runs. */
export function evaluateFixture(fixture: TortureFixture, dpr = 2): TortureBudgetResult {
  const budget = renderBudget(fixture.width, fixture.height, dpr)
  const tiles = visibleTiles({ x: 0, y: 0, w: fixture.width, h: fixture.height }, fixture.width, fixture.height, budget.tileSize)
  return {
    fixture,
    tileSize: budget.tileSize,
    residentTiles: budget.maxResidentTiles,
    overviewMaxEdge: budget.overviewMaxEdge,
    wholeDocumentTiles: tiles.length,
    bounded: budget.maxResidentTiles < tiles.length && budget.overviewMaxEdge <= 4096,
  }
}

export function phase9TortureSummary() {
  const fixtures = PHASE9_FIXTURES.map(x => evaluateFixture(x))
  return {
    fixtures,
    allBounded: fixtures.every(x => x.bounded),
    pressure: {
      elevated: pressureDecision({ heapUsed: 760, heapLimit: 1000 }),
      critical: pressureDecision({ heapUsed: 930, heapLimit: 1000 }),
    },
  }
}
