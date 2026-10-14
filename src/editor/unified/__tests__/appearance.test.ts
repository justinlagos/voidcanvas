import { describe, expect, it } from 'vitest'
import { clamp01, effectiveAppearance, groupChain, layerAlpha } from '../appearance'
import type { Group, Layer } from '../../types'

const layer = (over: Partial<Layer> = {}): Layer => ({ id: 'L1', name: 'L1', type: 'shape', visible: true, opacity: 1, groupId: null, ...over } as unknown as Layer)
const group = (id: string, over: Partial<Group> = {}): Group => ({ id, name: id, visible: true, opacity: 1, collapsed: false, parentId: null, ...over } as Group)

describe('U1 appearance contract', () => {
  it('clamps non-finite and out-of-range values to 0..1', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(clamp01(0.4)).toBe(0.4)
    expect(clamp01(NaN)).toBe(1)
  })

  it('multiplies layer opacity by fill opacity when the layer has no active styles', () => {
    expect(layerAlpha({ opacity: 0.5, fillOpacity: 0.5 }, false)).toBeCloseTo(0.25)
    expect(layerAlpha({ opacity: 0.5 }, false)).toBe(0.5) // fill defaults to 1
  })

  it('ignores fill opacity on styled layers, matching engine.ts', () => {
    expect(layerAlpha({ opacity: 0.5, fillOpacity: 0.2 }, true)).toBe(0.5)
  })

  it('multiplies opacities along the parent group chain', () => {
    const groups = [group('child', { opacity: 0.5, parentId: 'parent' }), group('parent', { opacity: 0.8 })]
    const c = groupChain('child', groups)
    expect(c.alpha).toBeCloseTo(0.4)
    expect(c.hidden).toBe(false)
  })

  it('reports a hidden group anywhere in the chain', () => {
    const groups = [group('child', { parentId: 'parent' }), group('parent', { visible: false })]
    expect(groupChain('child', groups).hidden).toBe(true)
    expect(effectiveAppearance(layer({ groupId: 'child' }), groups, false)).toEqual({ visible: false, alpha: 0 })
  })

  it('treats a layer whose group is missing as ungrouped rather than hidden', () => {
    expect(groupChain('GONE', [])).toEqual({ alpha: 1, hidden: false })
    expect(effectiveAppearance(layer({ groupId: 'GONE' }), [], false).visible).toBe(true)
  })

  it('stops on a cyclic parent chain instead of looping', () => {
    const groups = [group('a', { parentId: 'b' }), group('b', { parentId: 'a', opacity: 0.5 })]
    const c = groupChain('a', groups)
    expect(c.alpha).toBeCloseTo(0.5)
    expect(c.hidden).toBe(false)
  })

  it('combines the layer alpha with its group chain for the final result', () => {
    const groups = [group('g', { opacity: 0.5 })]
    expect(effectiveAppearance(layer({ opacity: 0.5, groupId: 'g' }), groups, false)).toEqual({ visible: true, alpha: 0.25 })
  })

  it('hides a layer the user has switched off, even inside a visible group', () => {
    expect(effectiveAppearance(layer({ visible: false }), [group('g')], false)).toEqual({ visible: false, alpha: 0 })
  })
})
