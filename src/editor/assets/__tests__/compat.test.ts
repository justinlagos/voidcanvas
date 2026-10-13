import { describe, expect, it } from 'vitest'
import {
  manifestCompatibility, projectHasLineage, readVoid, writeVoid,
  VOID_LINEAGE_MIN_READER, VOID_LINEAGE_VERSION, VOID_MIN_READER, VOID_VERSION,
  type VoidProject,
} from '../../voidfile'
import { unzip } from '../../zip'

const dec = new TextDecoder()
async function manifestOf(file: Blob): Promise<{ version: number; minReader: number }> {
  const files = await unzip(new Uint8Array(await file.arrayBuffer()))
  return JSON.parse(dec.decode(files.get('manifest.json')!))
}

function plainProject(): VoidProject {
  return {
    id: 'd-plain', doc: { id: 'd-plain', name: 'Plain', width: 800, height: 600, background: '#fff' },
    layers: [{ id: 'L1', type: 'text', name: 'T', text: 'Hi', fontFamily: 'Inter' }],
    groups: [], swatches: [],
    blobs: { L1: new Blob(['x'], { type: 'image/png' }) },
  }
}

function lineageProject(): VoidProject {
  const p = plainProject()
  const sha = 'c'.repeat(64)
  return {
    ...p,
    id: 'd-lin',
    doc: {
      ...p.doc, id: 'd-lin',
      assets: { r1: { resourceId: 'r1', id: 'r1', parentId: null, title: 'A', mime: 'image/png', sha256: sha, width: 4, height: 4, source: 'user_upload', recipeId: null, createdAt: 1 } },
    },
    layers: [
      { id: 'L1', type: 'raster', name: 'Photo', asset: { id: 'r1', parentId: null, title: 'A', mime: 'image/png', sha256: sha, width: 4, height: 4, source: 'user_upload' } },
    ],
    blobs: { L1: new Blob(['pixels'], { type: 'image/png' }), ['asset:' + sha]: new Blob(['orig'], { type: 'image/png' }) },
  }
}

describe('C1.1 .void lineage safeguard (conditional v6)', () => {
  it('stamps lineage files v6 and plain files v5', async () => {
    expect(projectHasLineage(lineageProject())).toBe(true)
    expect(projectHasLineage(plainProject())).toBe(false)
    const lin = await manifestOf(await writeVoid(lineageProject()))
    expect(lin.version).toBe(VOID_LINEAGE_VERSION)
    expect(lin.minReader).toBe(VOID_LINEAGE_MIN_READER)
    const plain = await manifestOf(await writeVoid(plainProject()))
    expect(plain.version).toBe(VOID_VERSION - 1)
    expect(plain.minReader).toBe(VOID_MIN_READER)
  })

  it('a v5 reader refuses lineage files instead of silently degrading them', () => {
    expect(manifestCompatibility({ version: 6, minReader: 6 }, 5)).toBe('refuse-newer')
    expect(manifestCompatibility({ version: 5, minReader: 5 }, 5)).toBe('ok')
    expect(manifestCompatibility({ version: 6, minReader: 6 }, 6)).toBe('ok')
    expect(manifestCompatibility({ version: 7, minReader: 5 }, 6)).toBe('open-partial')
    expect(manifestCompatibility({ version: 3 }, 5)).toBe('ok') // legacy manifests without minReader
  })

  it('v6 lineage files round-trip in this build with all records intact', async () => {
    const { project, version, notes } = await readVoid(new Uint8Array(await (await writeVoid(lineageProject())).arrayBuffer()))
    expect(version).toBe(6)
    expect(notes).toEqual([])
    expect(project.doc.assets?.r1?.sha256).toBe('c'.repeat(64))
    expect(project.layers.find(l => l.id === 'L1')?.asset?.id).toBe('r1')
    expect(project.blobs['asset:' + 'c'.repeat(64)]).toBeTruthy()
  })

  it('detects lineage from a lone layer ref or orphan original blob', () => {
    const base = lineageProject()
    expect(projectHasLineage({ ...base, doc: { ...base.doc, assets: {} } })).toBe(true)
    expect(projectHasLineage({ ...base, doc: { ...base.doc, assets: {} }, layers: [] })).toBe(true)
    expect(projectHasLineage(plainProject())).toBe(false)
  })
})
