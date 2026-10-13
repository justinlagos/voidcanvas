import { describe, expect, it } from 'vitest'
import { applyLocalEdit, buildVariant, legacyResyncLosesOverrides, requiredDropCheck, threeWayMerge } from '../variant-prototype'

describe('B06 VariantGraph prototype + override-loss regression', () => {
  it('documents the production bug: legacy resync drops overrides', () => {
    // Current src/editor/cascade.ts resyncVariants deletes/recreates children.
    // This pure model pins the failure mode the Sprint B fixtures must catch.
    expect(legacyResyncLosesOverrides({ x: 10, color: '#fff' }).preserved).toBe(0)
  })
  it('preserves local overrides and flags conflicts', () => {
    const base = { x: 0, color: '#000' }
    const masterNow = { x: 0, color: '#f00' }
    let v = buildVariant('L1', 'V1', 3, { x: 0, color: '#000' })
    v = applyLocalEdit(v, 'x', 120)
    const r = threeWayMerge(base, masterNow, v)
    expect(r.merged).toMatchObject({ x: 120, color: '#f00' })
    const v2 = applyLocalEdit(buildVariant('L1', 'V1', 3, { color: '#000' }), 'color', '#0f0')
    expect(threeWayMerge(base, masterNow, v2).conflicts.map(c => c.prop)).toEqual(['color'])
  })
  it('never silently drops required content', () => {
    expect(requiredDropCheck('headline', false).leftOut).toBe(true)
    expect(requiredDropCheck('headline', false).reason).toMatch(/required/)
  })
})
