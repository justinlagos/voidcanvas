import { describe, it, expect } from 'vitest'
import { canResolveCascadeConflict, decideCascadeConflict } from '../cascade-resolve'
import type { Layer } from '../types'

const layer = (id: string, srcId: string | null, overrides: Record<string, unknown> = {}): Layer => ({
  id, srcId, frameId: srcId ? 'V' : 'M', name: 'Headline', type: 'text',
  text: 'Original', color: '#111111', x: 500, y: 70, scaleX: 1, scaleY: 1,
  fontSize: 36, fontFamily: 'Inter', fontWeight: 600, italic: false, align: 'left',
  lineHeight: 1.2, letterSpacing: 0, visible: true, locked: false,
  opacity: 1, blend: 'source-over', mask: null, maskEnabled: false, rev: 4, ...overrides,
} as Layer)
const linked = (overrides: Record<string, unknown> = {}) => layer('variant-id', 'master', {
  text: 'Local headline', cascadeConflicts: ['text','color'],
  cascadeBase: { text: 'Master headline', color: '#222222' },
  ...overrides,
})

describe('Cascade explicit conflict resolution', () => {
  it('lists only safe decisions, not type changes or unsupported mask structure', () => {
    const l = linked()
    expect(canResolveCascadeConflict(l, 'text')).toBe(true)
    expect(canResolveCascadeConflict(l, 'asset')).toBe(false)
    expect(canResolveCascadeConflict(l, 'vector path')).toBe(false)
    expect(canResolveCascadeConflict(l, 'Layer "Headline": master changed type')).toBe(false)
  })
  it('Keep Variant clears only one conflict, preserves source lineage, other warnings and placement', () => {
    const old = linked()
    const res = decideCascadeConflict(old, layer('master', null, { text: 'Master headline' }), 'text', 'variant')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.layer.id).toBe('variant-id')
    expect((res.layer as any).text).toBe('Local headline')
    expect(res.layer.x).toBe(500)
    expect(res.layer.srcId).toBe('master')
    expect(res.layer.cascadeConflicts).toEqual(['color'])
    expect((old as any).cascadeConflicts).toEqual(['text','color'])
  })
  it('Use Master resolves one scalar without losing other overrides', () => {
    const res = decideCascadeConflict(linked(), layer('master', null, { text: 'Updated', color: '#37c' }), 'text', 'master')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect((res.layer as any).text).toBe('Updated')
    expect((res.layer as any).color).toBe('#111111')
    expect(res.layer.cascadeConflicts).toEqual(['color'])
    expect(res.layer.cascadeBase?.text).toBe('Updated')
  })
  it('refuses missing and unsupported conflicts instead of changing objects', () => {
    expect(decideCascadeConflict(linked(), layer('master', null), 'bad key', 'master').ok).toBe(false)
    const wrongSource = layer('unrelated', null)
    expect(decideCascadeConflict(linked(), wrongSource, 'text', 'master').ok).toBe(false)
  })
  it('Use Master image restores asset ID; Keep Variant preserves local image and placement', () => {
    const asset = (id: string) => ({ id, parentId: null, sha256: id + '-hash', mime: 'image/png', title: id,
      width: 16, height: 16, source: 'user_upload' as const })
    const raster = (id: string, srcId: string | null, name: string) => ({
      ...layer(id, srcId), type: 'raster', canvas: { width: 16, height: 16 }, asset: asset(name),
      cascadeConflicts: srcId ? ['asset'] : undefined, cascadeBase: { __assetSignature: 'A@A-hash' },
    }) as unknown as Layer
    const local = raster('v-image', 'master', 'LOCAL')
    const master = raster('master', null, 'B')
    const kept = decideCascadeConflict(local, master, 'asset', 'variant')
    expect(kept.ok).toBe(true)
    if (!kept.ok) return
    expect((kept.layer as any).asset.id).toBe('LOCAL')
    const used = decideCascadeConflict(local, master, 'asset', 'master')
    expect(used.ok).toBe(true)
    if (!used.ok) return
    expect((used.layer as any).asset.id).toBe('B')
    expect(used.layer.x).toBe(500)
    expect(used.layer.cascadeConflicts).toEqual([])
  })
  it('Vector Use Master takes target-board path, not master-board path', () => {
    const path = (n: number) => [{ closed: true, nodes: [{ x: n, y: 0, inX: n, inY: 0, outX: n, outY: 0 }] }]
    const shape = (id: string, srcId: string | null, n: number) => ({
      ...layer(id, srcId), type: 'shape', shape: 'path', subpaths: path(n),
      w: 120, h: 90, radius: 0, fill: '#000', stroke: null, strokeWidth: 0,
      cascadeConflicts: srcId ? ['vector path'] : undefined,
      cascadeBase: { __vectorPath: path(4) },
      cascadeVariantBase: { subpaths: path(9), w: 120, h: 90 },
    }) as Layer
    const v = shape('variant', 'master', 777), m = shape('master', null, 15), proposed = shape('generated', 'master', 44)
    const result = decideCascadeConflict(v, m, 'vector path', 'master', proposed)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect((result.layer as any).subpaths).toEqual(path(44))
    expect(result.layer.id).toBe('variant')
    expect(result.layer.x).toBe(500)
    expect(result.layer.cascadeConflicts).toEqual([])
    expect((v as any).subpaths).toEqual(path(777))
    expect(decideCascadeConflict(v, m, 'vector path', 'master').ok).toBe(false)
  })
})
