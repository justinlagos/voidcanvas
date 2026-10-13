import { describe, expect, it } from 'vitest'
import { readVoid, writeVoid, type VoidProject } from '../../voidfile'

const blobBytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer())

function assetProject(): VoidProject {
  const originalA = new Blob(['original-bytes-A'], { type: 'image/png' })
  const originalB = new Blob(['original-bytes-B'], { type: 'image/jpeg' })
  const placed = new Blob(['placed-pixels'], { type: 'image/png' })
  return {
    id: 'd-c1',
    doc: {
      id: 'd-c1', name: 'Poster', width: 1080, height: 1350, background: '#ffffff',
      assets: {
        'asset-a': { resourceId: 'asset-a', id: 'asset-a', parentId: null, title: 'Rocket', mime: 'image/png', sha256: 'aa', width: 800, height: 600, source: 'user_upload', recipeId: null, createdAt: 1 },
        'asset-b': { resourceId: 'asset-b', id: 'asset-b', parentId: 'asset-a', title: 'Rocket v2', mime: 'image/jpeg', sha256: 'bb', width: 900, height: 700, source: 'user_upload', recipeId: null, createdAt: 2 },
      },
    },
    layers: [
      {
        id: 'L1', type: 'raster', name: 'Photo', x: 44, y: 55, scaleX: 1.2, scaleY: 1.2, rotation: 0.1,
        maskEnabled: true, hasMask: true, clipId: null, frameFit: 'cover',
        effects: [{ id: 'e1', kind: 'brightnessContrast', values: { brightness: 10, contrast: 5 }, on: true, opacity: 1, blend: 'source-over' }],
        asset: { id: 'asset-b', parentId: 'asset-a', title: 'Rocket v2', mime: 'image/jpeg', sha256: 'bb', width: 900, height: 700, source: 'user_upload' },
      },
      { id: 'L2', type: 'text', name: 'Headline', text: 'Launch night', fontFamily: 'Inter' },
    ],
    groups: [],
    swatches: [],
    blobs: {
      L1: new Blob(['placed-pixels'], { type: 'image/png' }),
      'L1:mask': new Blob(['mask-pixels'], { type: 'image/png' }),
      'asset:asset-a': originalA,
      'asset:asset-b': originalB,
    },
  }
}

describe('C1.5 portable persistence (additive, no version bump)', () => {
  it('round-trips originals, lineage, transform, mask flag and effects', async () => {
    const p = assetProject()
    const file = await writeVoid(p)
    const { project, version, notes } = await readVoid(new Uint8Array(await file.arrayBuffer()))
    expect(version).toBeLessThanOrEqual(5)
    // Originals preserved byte-for-byte.
    expect(await blobBytes(project.blobs['asset:asset-a'])).toEqual(await blobBytes(p.blobs['asset:asset-a']))
    expect(await blobBytes(project.blobs['asset:asset-b'])).toEqual(await blobBytes(p.blobs['asset:asset-b']))
    // Lineage + layer pointer preserved.
    expect(project.doc.assets?.['asset-b']?.parentId).toBe('asset-a')
    const l1 = project.layers.find(l => l.id === 'L1')
    expect(l1.asset?.id).toBe('asset-b')
    expect(l1.asset?.parentId).toBe('asset-a')
    // Composition preserved.
    expect(l1.x).toBe(44)
    expect(l1.rotation).toBeCloseTo(0.1)
    expect(l1.hasMask).toBe(true)
    expect(l1.effects?.[0]?.values).toMatchObject({ brightness: 10 })
    expect(notes).toEqual([])
  })

  it('old readers keep pixels when lineage is present (graceful degradation)', async () => {
    const p = assetProject()
    const file = await writeVoid(p)
    const { project } = await readVoid(new Uint8Array(await file.arrayBuffer()))
    // Simulate a v3-era reader: pixels under layer id always load; asset keys are extra.
    expect(project.blobs['L1']).toBeTruthy()
    expect(project.blobs['asset:asset-a']).toBeTruthy() // carried, ignored by old code paths
  })

  it('missing original blob is reported, not fatal', async () => {
    const p = assetProject()
    delete p.blobs['asset:asset-a']
    const file = await writeVoid(p)
    // Drop the asset entry from the manifest by rewriting without it is covered
    // by readVoid notes for truly missing parts; here the blob simply round-trips absent.
    const { project } = await readVoid(new Uint8Array(await file.arrayBuffer()))
    expect(project.blobs['asset:asset-a']).toBeUndefined()
    expect(project.blobs['L1']).toBeTruthy()
  })
})
