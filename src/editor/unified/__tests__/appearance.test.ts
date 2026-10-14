import { describe, expect, it } from 'vitest'
import {
  clamp01,
  effectiveAppearance,
  evaluateGroupAppearance,
  evaluateLayerAppearance,
  groupChain,
  groupCompositeBlend,
  layerAlpha,
  resolveClipBase,
} from '../appearance'
import { emptyStyles } from '../../styles'
import { newEffect } from '../../effects'
import type { Group, Layer } from '../../types'

const layer = (over: Partial<Layer> = {}): Layer => ({
  id: 'L1', name: 'L1', type: 'shape', visible: true, locked: false,
  opacity: 1, blend: 'source-over', x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0,
  mask: null, maskEnabled: true, rev: 1, groupId: null, ...over,
} as unknown as Layer)
const group = (id: string, over: Partial<Group> = {}): Group => ({
  id, name: id, visible: true, opacity: 1, collapsed: false, parentId: null, ...over,
} as Group)

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

  it('maps group pass-through and undefined blend to source-over while preserving explicit blend modes', () => {
    expect(groupCompositeBlend(undefined)).toBe('source-over')
    expect(groupCompositeBlend('pass')).toBe('source-over')
    expect(groupCompositeBlend('multiply')).toBe('multiply')
  })

  it('evaluates group isolation across opacity, blend, effects, styles, masks and scoped adjustments', () => {
    const baseRun = [layer({ id: 'a', groupId: 'g' })]
    expect(evaluateGroupAppearance(group('g'), baseRun).isolated).toBe(false)
    expect(evaluateGroupAppearance(group('g', { opacity: 0.8 }), baseRun)).toMatchObject({
      visible: true, isolated: true, alpha: 0.8, blend: 'source-over',
    })
    expect(evaluateGroupAppearance(group('g', { blend: 'screen' }), baseRun)).toMatchObject({
      isolated: true, blend: 'screen',
    })
    const fx = newEffect('blur')
    expect(evaluateGroupAppearance(group('g', { effects: [fx] }), baseRun)).toMatchObject({
      isolated: true, hasEffects: true,
    })
    expect(evaluateGroupAppearance(group('g', { effects: [fx] }), baseRun, { noFx: true })).toMatchObject({
      isolated: false, hasEffects: false,
    })
    const st = emptyStyles()
    st.dropShadow = { on: true, opacity: 0.5, blend: 'multiply', color: '#000000', angle: 90, distance: 4, size: 8, spread: 0 }
    expect(evaluateGroupAppearance(group('g', { styles: st }), baseRun)).toMatchObject({
      isolated: true, hasStyles: true,
    })
    expect(evaluateGroupAppearance(group('g', { mask: {} as HTMLCanvasElement, maskEnabled: true }), baseRun)).toMatchObject({
      isolated: true, hasMask: true,
    })
    const adjRun = [layer({ id: 'adj', type: 'adjustment', visible: true, reach: 'group', groupId: 'g' } as unknown as Partial<Layer>)]
    expect(evaluateGroupAppearance(group('g'), adjRun)).toMatchObject({
      isolated: true, hasScopedAdjustment: true,
    })
  })

  it('resolves clipping base only to non-adjustment layers', () => {
    const base = layer({ id: 'base', type: 'shape' })
    const adj = layer({ id: 'adj', type: 'adjustment' } as unknown as Partial<Layer>)
    const clipped = layer({ id: 'top', clipId: 'base' })
    const badClip = layer({ id: 'top2', clipId: 'adj' })
    expect(resolveClipBase(clipped, [base, clipped], [base, clipped])?.id).toBe('base')
    expect(resolveClipBase(badClip, [adj, badClip], [adj, badClip])).toBeNull()
    expect(resolveClipBase(layer({ id: 'missing', clipId: 'nope' }), [base], [base])).toBeNull()
  })

  it('evaluates layer rendering plan for offscreen and doc-space passes', () => {
    const base = layer({ id: 'base', type: 'shape' })
    const simple = layer({ id: 's', opacity: 0.6, fillOpacity: 0.5, blend: 'multiply' })
    const p1 = evaluateLayerAppearance(simple, [simple], [simple])
    expect(p1).toMatchObject({
      visible: true,
      alpha: 0.3,
      untypedAlpha: 0.3,
      blend: 'multiply',
      styled: false,
      hasEffects: false,
      needsOffscreenPass: false,
      needsDocSpacePass: false,
      clipBase: null,
    })

    const masked = layer({ id: 'm', mask: {} as HTMLCanvasElement, maskEnabled: true })
    const pMask = evaluateLayerAppearance(masked, [masked], [masked])
    expect(pMask.needsOffscreenPass).toBe(true)
    expect(pMask.needsDocSpacePass).toBe(false)

    const clippedWithFx = layer({
      id: 'c', clipId: 'base', opacity: 0.8, fillOpacity: 0.5,
      effects: [newEffect('invert')],
    })
    const pClip = evaluateLayerAppearance(clippedWithFx, [base, clippedWithFx], [base, clippedWithFx])
    expect(pClip.clipBase?.id).toBe('base')
    expect(pClip.hasEffects).toBe(true)
    expect(pClip.needsOffscreenPass).toBe(true)
    expect(pClip.needsDocSpacePass).toBe(true)
    expect(pClip.untypedAlpha).toBeCloseTo(0.4)
  })
})
