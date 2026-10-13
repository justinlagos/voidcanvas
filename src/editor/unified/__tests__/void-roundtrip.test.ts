// Real .void format round-trip with image bytes + mask + text + lineage refs.
// Node-safe: blobs are binary, no canvas needed.
import { describe, expect, it } from 'vitest'
import { readVoid, writeVoid, type VoidProject } from '../../voidfile'

const png = (seed: number) => new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, seed])], { type: 'image/png' })
const bytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer())

describe('B.1 mixed-media .void round-trip (real bytes)', () => {
  it('preserves layers, masks, text and asset keys across save/reopen', async () => {
    const project: VoidProject = {
      id: 'unified-mixed', doc: { id: 'unified-mixed', name: 'Unified mixed', width: 1080, height: 1350, background: '#fff' },
      layers: [
        { id: 'vec-badge', type: 'shape', name: 'Vector badge' },
        { id: 'img-photo', type: 'raster', name: 'Photo', hasMask: true },
        { id: 'txt-headline', type: 'text', name: 'Headline', text: 'Launch night', fontFamily: 'Space Grotesk' },
      ],
      groups: [], swatches: ['#111111'],
      blobs: { 'img-photo': png(1), 'img-photo:mask': png(2) },
    }
    const file = await writeVoid(project, { preview: png(9) })
    const reopened = await readVoid(await bytes(file))
    expect(reopened.project.layers.map(l => l.id)).toEqual(['vec-badge', 'img-photo', 'txt-headline'])
    expect(await bytes(reopened.project.blobs['img-photo:mask'])).toEqual(await bytes(png(2)))
    expect(reopened.project.layers.find(l => l.id === 'txt-headline')).toMatchObject({ text: 'Launch night' })
    expect(reopened.notes).toEqual([])
  })
})
