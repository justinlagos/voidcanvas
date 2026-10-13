import { describe, expect, it } from 'vitest'
import { acceptAsset, deriveAsset, ingestUpload, lineageOf, placementPatch } from '../asset-tray'
import type { AssetRecipe } from '../asset-tray'

describe('B07 local asset tray (no cloud)', () => {
  it('keeps original + derived lineage, never overwrites source', () => {
    const orig = ingestUpload('Rocket', 1024, 1024)
    const recipe: AssetRecipe = { recipeId: 'r1', prompt: 'more smoke', provider: 'mock-test-provider', params: {}, storePrompt: false }
    const derived = deriveAsset(orig, 'region-edit', recipe)
    const accepted = acceptAsset(derived)
    const all = [orig, derived, accepted]
    expect(lineageOf(all, derived.resourceId).map(a => a.resourceId)).toEqual([orig.resourceId, derived.resourceId])
    expect(orig.accepted).toBe(true)
    expect(derived.accepted).toBe(false)
  })
  it('preserves crop/transform on replace by default', () => {
    const a = ingestUpload('Photo', 800, 600)
    const p = placementPatch(a, { x: 0, y: 0, width: 1080, height: 1350 }, { x: 44, y: 55 })
    expect(p).toMatchObject({ x: 44, y: 55, assetRef: a.resourceId })
  })
})
