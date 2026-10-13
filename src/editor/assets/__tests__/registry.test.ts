import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAssetStore, getOriginal, listAssets, originalBlobs, registerAsset,
  rememberRegistry, scopeRegistryToDoc, type NativeAsset,
} from '../asset-store'

const blob = (s: string, type = 'image/png') => new Blob([s], { type })
const meta = (resourceId: string, sha256: string, parentId: string | null = null) => ({
  resourceId, title: resourceId, mime: 'image/png', width: 10, height: 10,
  sha256, source: 'user_upload' as const, parentId, recipeId: null, thumb: '',
})

beforeEach(() => clearAssetStore())

describe('C1 asset registry scoping + dedup', () => {
  it('stores identical bytes once across uploads and replacements', () => {
    const a = registerAsset(meta('a', 's'.repeat(64)), blob('same-bytes'))
    const b = registerAsset(meta('b', 's'.repeat(64), a.resourceId), blob('same-bytes'))
    expect(Object.keys(originalBlobs())).toEqual(['asset:' + 's'.repeat(64)])
    expect(getOriginal(a.resourceId)).toBe(getOriginal(b.resourceId))
  })

  it('scopes to the incoming document: drops foreign entries, keeps refs + ancestors', () => {
    const a = registerAsset(meta('a', 'a'.repeat(64)), blob('A'))
    const b = registerAsset(meta('b', 'b'.repeat(64), 'a'), blob('B'))
    registerAsset(meta('foreign', 'f'.repeat(64)), blob('F'))
    expect(listAssets()).toHaveLength(3)
    // Incoming doc references only b; ancestor a must be retained.
    scopeRegistryToDoc({ assets: { b: { resourceId: 'b' } } }, [{ asset: { id: 'b' } }])
    expect(listAssets().map(x => x.resourceId).sort()).toEqual(['a', 'b'])
    expect(getOriginal('foreign')).toBeUndefined()
    expect(getOriginal('a')).toBeTruthy()
    void b
  })

  it('rememberRegistry rebuilds from file blobs and prunes orphans', () => {
    const all = [
      { ...meta('a', 'a'.repeat(64)), id: 'a', createdAt: 1 },
      { ...meta('b', 'b'.repeat(64), 'a'), id: 'b', createdAt: 2 },
    ]
    rememberRegistry(all, { ['asset:' + 'a'.repeat(64)]: blob('A'), ['asset:' + 'b'.repeat(64)]: blob('B'), ['asset:' + 'z'.repeat(64)]: blob('orphan') })
    expect(Object.keys(originalBlobs()).sort()).toEqual(['asset:' + 'a'.repeat(64), 'asset:' + 'b'.repeat(64)])
    expect(getOriginal('b')).toBeTruthy()
  })
})
