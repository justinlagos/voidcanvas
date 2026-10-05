import { describe, expect, it } from 'vitest'
import { familyById } from './families'
import { documentGenomeDistance, pageGenomeDistance, recentCompositionPenalty, samePositionStructureShare, structureSignature } from './genome'
import { createRhythmState, sequenceHasConsecutiveStructureRepeat } from './rhythm'
import { selectComposition, viableCandidates } from './select'
import type { DocGenome, Page, PageGenome } from './types'

const genome = (id: string, extra: Partial<PageGenome> = {}): PageGenome => ({
  compositionId: id,
  grid: 'modular',
  axis: 'left',
  marginRatio: 0.08,
  typeTreatment: 'display-left',
  colourBlocking: 'quiet',
  devices: [],
  density: 0.5,
  parameters: {},
  ...extra,
})

const page = (id: string, extra: Partial<PageGenome> = {}): Page => ({
  kind: 'cover',
  width: 1600,
  height: 900,
  background: { hex: '#ffffff' },
  nodes: [],
  genome: genome(id, extra),
})

const doc = (family: string, ids: string[]): DocGenome => ({ family, parameters: {}, pages: ids.map((id) => genome(id)) })

describe('genome distance', () => {
  it('treats identical structures as zero distance', () => {
    const a = genome('cover-a')
    expect(pageGenomeDistance(a, a)).toBe(0)
  })

  it('weights composition, grid and axis differences strongly', () => {
    const a = genome('cover-a')
    const b = genome('cover-b', { grid: 'hierarchical', axis: 'diagonal', colourBlocking: 'flood', density: 0.8 })
    expect(pageGenomeDistance(a, b)).toBeGreaterThan(0.5)
  })

  it('measures same-position structure reuse', () => {
    const a = doc('editorial', ['a', 'b', 'c', 'd'])
    const b = doc('editorial', ['a', 'x', 'c', 'y'])
    expect(samePositionStructureShare(a, b)).toBe(0.5)
    expect(structureSignature(a)).toBe('a|b|c|d')
  })

  it('different family and page sequence produce substantial document distance', () => {
    expect(documentGenomeDistance(doc('editorial', ['a', 'b', 'c']), doc('kinetic', ['x', 'y', 'z']))).toBeGreaterThan(0.7)
  })

  it('penalises compositions that appeared recently', () => {
    const recent = ['a', 'b', 'c', 'a'].map((id) => genome(id))
    expect(recentCompositionPenalty(genome('a'), recent, 8)).toBeGreaterThan(0.5)
    expect(recentCompositionPenalty(genome('z'), recent, 8)).toBe(0)
  })
})

describe('candidate selection', () => {
  it('removes candidates with attention lint findings', () => {
    const candidates = [
      { page: page('bad'), fit: 1, lint: [{ id: 'x', level: 'attention' as const, message: 'overflow' }] },
      { page: page('good'), fit: 0.7, lint: [] },
    ]
    expect(viableCandidates(candidates).map((x) => x.page.genome.compositionId)).toEqual(['good'])
  })

  it('steers away from a repeated recent composition', () => {
    const family = familyById('editorial')
    const picked = selectComposition({
      family,
      rhythm: createRhythmState(),
      recent: [genome('repeat')],
      candidates: [
        { page: page('repeat'), fit: 0.95, lint: [] },
        { page: page('fresh'), fit: 0.8, lint: [] },
      ],
    })
    expect(picked?.candidate.page.genome.compositionId).toBe('fresh')
  })

  it('uses rhythm to avoid consecutive identical structures', () => {
    const family = familyById('swiss-grid')
    const first = selectComposition({
      family,
      rhythm: createRhythmState(),
      candidates: [{ page: page('same'), fit: 1, lint: [] }],
    })!
    const second = selectComposition({
      family,
      rhythm: first.rhythm,
      candidates: [
        { page: page('same'), fit: 1, lint: [] },
        { page: page('different', { density: 0.25 }), fit: 0.72, lint: [] },
      ],
    })!
    expect(second.candidate.page.genome.compositionId).toBe('different')
    expect(sequenceHasConsecutiveStructureRepeat([first.candidate.page, second.candidate.page])).toBe(false)
  })
})
