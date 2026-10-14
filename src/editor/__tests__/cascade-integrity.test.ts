import { describe, expect, it } from 'vitest'
import { reconcileCascadeBoard, stampCascadeBaseline } from '../cascade-integrity'
import type { Group, Layer } from '../types'

const text = (id: string, srcId: string | null, board: string, extra: Record<string, unknown> = {}): Layer => ({
  id, srcId, frameId: board, type: 'text', name: 'Headline', text: 'Hello',
  color: '#111111', x: 10, y: 20, scaleX: 1, scaleY: 1,
  fontFamily: 'Inter', fontSize: 32, fontWeight: 600, italic: false,
  align: 'left', lineHeight: 1.2, letterSpacing: 0,
  visible: true, locked: false, opacity: 1, blend: 'source-over',
  mask: null, maskEnabled: false, rev: 1, ...extra,
} as Layer)
const group = (id: string, parentId: string | null = null): Group =>
  ({ id, name: 'Logo', parentId, visible: true, opacity: 1, collapsed: false })

describe('Cascade: preserve real variant identity and local editing', () => {
  it('stamps only JSON-safe inherited scalar baselines', () => {
    const master = text('master', null, 'M')
    const fresh = text('v1', 'master', 'V', { x: 70 })
    const [out] = stampCascadeBaseline([fresh], [master]) as any[]
    expect(out.cascadeBase.text).toBe('Hello')
    expect(out.cascadeBase.color).toBe('#111111')
    expect(out.cascadeBase).not.toHaveProperty('x')
    expect(out.cascadeBase).not.toHaveProperty('mask')
    expect(out.id).toBe('v1')
  })

  it('preserves id, local x, original layout and local override while inheriting untouched text', () => {
    const master = text('master', null, 'M', { text: 'New copy', color: '#e21b22' })
    const old = text('stable-id', 'master', 'V', {
      text: 'Hello', color: '#5a22ee', x: 240,
      cascadeBase: { text: 'Hello', color: '#111111' },
    })
    const fresh = text('random-new-id', 'master', 'V', { text: 'New copy', color: '#e21b22', x: 55 })
    const r = reconcileCascadeBoard([master], [old], [], [fresh], [])
    const updated = r.layers[0] as any
    expect(updated.id).toBe('stable-id')
    expect(updated.x).toBe(240)
    expect(updated.text).toBe('New copy')
    expect(updated.color).toBe('#5a22ee')
    expect(r.conflicts).toHaveLength(1)
    expect(updated.cascadeBase.text).toBe('New copy')
  })

  it('retains variant edits if the master also changes the same property', () => {
    const master = text('m', null, 'M', { text: 'Master changed' })
    const old = text('v', 'm', 'V', { text: 'Variant changed', cascadeBase: { text: 'Original' } })
    const r = reconcileCascadeBoard([master], [old], [], [text('generated', 'm', 'V')], [])
    expect((r.layers[0] as any).text).toBe('Variant changed')
    expect((r.layers[0] as any).cascadeConflicts).toEqual(['text'])
  })

  it('conservatively protects legacy variants with no cascadeBase (old .void)', () => {
    const master = text('m', null, 'M', { text: 'Fresh master' })
    const old = text('v', 'm', 'V', { text: 'Custom old artwork', x: 450 })
    const r = reconcileCascadeBoard([master], [old], [], [text('throwaway', 'm', 'V')], [])
    expect(r.layers[0].id).toBe('v')
    expect((r.layers[0] as any).text).toBe('Custom old artwork')
    expect(r.layers[0].x).toBe(450)
  })

  it('never deletes variant-only artwork or master-deleted descendants', () => {
    const local = text('local', null, 'V', { text: 'Variant-only' })
    const removed = text('linked', 'gone-master', 'V', { text: 'Preserve deleted source' })
    const r = reconcileCascadeBoard([], [local, removed], [], [], [])
    expect(r.layers.map(l => l.id)).toEqual(['local', 'linked'])
    expect(r.conflicts).toEqual([expect.stringContaining('source deleted')])
  })

  it('adds newly introduced master objects without regenerating old ids', () => {
    const masters = [text('m1', null, 'M'), text('m2', null, 'M')]
    const old = stampCascadeBaseline([text('v1', 'm1', 'V')], [masters[0]])
    const fresh = [text('gen1', 'm1', 'V'), text('gen2', 'm2', 'V')]
    const r = reconcileCascadeBoard(masters, old, [], fresh, [])
    expect(r.layers.map(l => l.id)).toEqual(['v1', 'gen2'])
    expect(r.reused).toBe(1)
    expect(r.added).toBe(1)
  })

  it('reuses nested group identity and attaches newly generated siblings to it', () => {
    const masters = [text('m1', null, 'M'), text('m2', null, 'M')]
    const existing = [text('stable', 'm1', 'V', { groupId: 'old-leaf' })]
    const oldGroups = [group('old-root'), group('old-leaf', 'old-root')]
    const fresh = [text('gen1', 'm1', 'V', { groupId: 'new-leaf' }), text('gen2', 'm2', 'V', { groupId: 'new-leaf' })]
    const newGroups = [group('new-root'), group('new-leaf', 'new-root')]
    const r = reconcileCascadeBoard(masters, existing, oldGroups, fresh, newGroups)
    expect(r.groups.map(g => g.id)).toEqual(['old-root', 'old-leaf'])
    expect(r.layers.map(l => l.groupId)).toEqual(['old-leaf', 'old-leaf'])
  })

  it('remaps copied clipping relationships to the local instance rather than the master', () => {
    const masters = [text('base', null, 'M'), text('clip', null, 'M', { clipId: 'base' })]
    const fresh = [text('new-base', 'base', 'V'), text('new-clip', 'clip', 'V', { clipId: 'base' })]
    const r = reconcileCascadeBoard(masters, [], [], fresh, [])
    expect(r.layers[1].clipId).toBe('new-base')
  })
  it('retains 300 masters x 10 variants without id collisions or local edit loss', () => {
    const masters = Array.from({ length: 300 }, (_, i) => text('master-' + i, null, 'M', { text: 'Updated ' + i }))
    const seen = new Set<string>()
    for (let board = 0; board < 10; board++) {
      const frame = 'V' + board
      const previous = masters.map((m, i) => text(frame + '-stable-' + i, m.id, frame, {
        text: 'Old ' + i, x: 20 + i + board,
        cascadeBase: { text: 'Old ' + i },
      }))
      const fresh = masters.map((m, i) => text(frame + '-throwaway-' + i, m.id, frame))
      const r = reconcileCascadeBoard(masters, previous, [], fresh, [])
      expect(r.reused).toBe(300)
      expect(r.added).toBe(0)
      expect(r.conflicts).toHaveLength(0)
      for (const [i, layer] of r.layers.entries()) {
        expect(layer.id).toBe(frame + '-stable-' + i)
        expect((layer as any).text).toBe('Updated ' + i)
        expect(layer.x).toBe(20 + i + board)
        expect(seen.has(layer.id)).toBe(false)
        seen.add(layer.id)
      }
    }
    expect(seen.size).toBe(3000)
  })

})
