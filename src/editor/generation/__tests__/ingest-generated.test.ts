import { beforeEach, describe, expect, it } from 'vitest'
import { clearAssetStore, getAsset, listAssets } from '../../assets/asset-store'
import { registerGeneratedBatch, registerGeneratedCandidate } from '../ingest-generated'
import type { GeneratedCandidate } from '../mock-provider'

function candidate(id: string): GeneratedCandidate {
  return { id, blob: new Blob(['bytes-' + id], { type: 'image/png' }), mime: 'image/png', width: 768, height: 1024, name: id, mock: true }
}

describe('C2 ingest-generated (C1 asset registration + lineage)', () => {
  beforeEach(() => clearAssetStore())

  it('registers a candidate as source:generated with preserved bytes', async () => {
    const asset = await registerGeneratedCandidate(candidate('mock-0'), { prompt: 'Rocket poster', aspect: 'portrait' }, { thumb: 'data:image/jpeg;base64,x' })
    expect(asset.source).toBe('generated')
    expect(asset.parentId).toBeNull()
    expect(asset.width).toBe(768)
    expect(getAsset(asset.resourceId)?.title).toContain('Rocket')
    expect(listAssets()).toHaveLength(1)
  })

  it('chains variation lineage via parentId', async () => {
    const original = await registerGeneratedCandidate(candidate('mock-0'), { prompt: 'Rocket poster', aspect: 'square' }, { thumb: '' })
    const variation = await registerGeneratedCandidate(candidate('mock-1'), { prompt: 'Rocket poster', aspect: 'square', parentId: original.resourceId }, { thumb: '' })
    expect(variation.parentId).toBe(original.resourceId)
    expect(listAssets()).toHaveLength(2)
  })

  it('titles batch candidates distinctly', async () => {
    const assets = await registerGeneratedBatch([candidate('a'), candidate('b')], { prompt: 'Launchpad', aspect: 'square' }, { thumbs: ['', ''] })
    expect(assets).toHaveLength(2)
    expect(assets[0].title).not.toBe(assets[1].title)
    expect(new Set(assets.map(a => a.resourceId)).size).toBe(2)
  })
})
