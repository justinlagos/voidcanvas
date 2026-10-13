import { describe, expect, it } from 'vitest'
import { editTargetFor, focusPresetAllows, inspectorCapabilities, nodeKindFor, scopeFor } from '../capabilities'

describe('B01 capability registry', () => {
  it('exposes at most 5 primary actions but keeps full list searchable', () => {
    const { primary, all } = inspectorCapabilities('raster', 'move')
    expect(primary.length).toBeLessThanOrEqual(5)
    expect(all.length).toBeGreaterThanOrEqual(primary.length)
  })
  it('maps layer types to node kinds', () => {
    expect(nodeKindFor({ type: 'text' } as never)).toBe('text')
    expect(nodeKindFor(null, { groupSelected: true })).toBe('group')
  })
  it('distinguishes edit targets without switching apps', () => {
    expect(editTargetFor({ type: 'text' } as never, { editingMask: true, editingText: true })).toBe('mask')
    expect(editTargetFor({ type: 'text' } as never, { editingMask: false, editingText: true })).toBe('story')
    expect(editTargetFor(null, { editingMask: false, editingText: false })).toBe('document')
  })
  it('focus presets never change eligibility', () => {
    for (const p of ['Essentials', 'Vector', 'Photo', 'Typography', 'Publication', 'Production'])
      expect(focusPresetAllows(p, 'raster')).toBe(true)
  })
  it('computes scope explicitly', () => {
    expect(scopeFor(2, false, 1)).toBe('selection')
    expect(scopeFor(1, true, 1)).toBe('group')
  })
})
