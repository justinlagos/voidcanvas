import { describe, expect, it } from 'vitest'
import { copyEffect, freshFx, fxKey, groupUnits, isSpatial, linkedCopies, markUnknown, moveInList, newEffect, orderMatters, patchEffect, stackOf, withStacks, type FxTarget } from '../effects'
import type { Doc, Effect, Group, Layer } from '../types'
import { readVoid, writeVoid, type VoidProject } from '../voidfile'

const layer = (id: string, extra: Partial<Layer> = {}): Layer => ({ id, name: id, type: 'shape', shape: 'rect', x: 0, y: 0, w: 10, h: 10, fill: '#000', visible: true, locked: false, opacity: 1, blend: 'source-over', scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: false, rev: 1, ...extra } as unknown as Layer)
const group = (id: string, extra: Partial<Group> = {}): Group => ({ id, name: id, visible: true, opacity: 1, collapsed: false, parentId: null, ...extra })
const doc = (extra: Partial<Doc> = {}): Doc => ({ id: 'd', name: 'D', width: 100, height: 100, background: '#fff', ...extra } as Doc)

describe('effect stacks', () => {
  it('a new effect has usual settings, is on, at full strength', () => {
    const b = newEffect('blur')
    expect(b).toMatchObject({ kind: 'blur', on: true, opacity: 1, blend: 'source-over', values: { radius: 8 } })
    const g = newEffect('voidEffect', 'grain')
    expect(g.effect).toBe('grain')
    expect(g.effectParams?.intensity).toBeTypeOf('number')
  })

  it('knows which effects work across space', () => {
    expect(isSpatial(newEffect('blur'))).toBe(true)
    expect(isSpatial(newEffect('voidEffect', 'grain'))).toBe(true)
    expect(isSpatial(newEffect('hueSaturation'))).toBe(false)
    expect(isSpatial(newEffect('voidEffect', 'duotone'))).toBe(false)
  })

  it('moves an effect up and down the stack, and says when order matters', () => {
    expect(moveInList(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveInList(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(orderMatters([newEffect('blur')])).toBe(false)
    expect(orderMatters([newEffect('blur'), newEffect('voidEffect', 'halftone')])).toBe(true)
  })

  it('a copy gets a new id and loses its link unless asked, and keeps a mask as it is', () => {
    const mask = {} as HTMLCanvasElement
    const e: Effect = { ...newEffect('blur'), link: 'L1', mask }
    const c = copyEffect(e)
    expect(c.id).not.toBe(e.id)
    expect(c.link).toBeNull()
    expect(c.mask).toBe(mask)
    expect(copyEffect(e, true).link).toBe('L1')
  })

  it('duplicates get their own effects, linked to each other but not to the originals', () => {
    const a = { ...newEffect('blur'), link: 'L1' }, b = { ...newEffect('invert'), link: 'L1' }, solo = newEffect('posterize')
    const links = new Map<string, string>()
    const [ca] = freshFx([a], links)!, [cb, cs] = freshFx([b, solo], links)!
    expect(ca.id).not.toBe(a.id)
    expect(ca.link).toBeTruthy()
    expect(ca.link).not.toBe('L1')
    expect(cb.link).toBe(ca.link)
    expect(cs.link).toBeNull()
  })

  it('a change to a linked effect reaches every copy, and nothing else', () => {
    const st = { doc: doc(), groups: [] as Group[], layers: [
      layer('A', { effects: [{ ...newEffect('hueSaturation'), id: 'e1', link: 'K' }] } as any),
      layer('B', { effects: [{ ...newEffect('blur'), id: 'e0' }, { ...newEffect('hueSaturation'), id: 'e2', link: 'K' }] } as any),
      layer('C', { effects: [{ ...newEffect('hueSaturation'), id: 'e3' }] } as any),
    ] }
    expect(linkedCopies(st, 'K').map(c => c.name)).toEqual(['A', 'B'])
    const changes = patchEffect(st, { type: 'layer', id: 'A' }, 'e1', { values: { hue: 0, saturation: -100, lightness: 0 } })
    const next = { ...st, ...withStacks(st, changes) }
    expect(stackOf(next, { type: 'layer', id: 'A' })[0].values.saturation).toBe(-100)
    expect(stackOf(next, { type: 'layer', id: 'B' })[1].values.saturation).toBe(-100)
    expect(stackOf(next, { type: 'layer', id: 'B' })[0].kind).toBe('blur')
    expect(stackOf(next, { type: 'layer', id: 'C' })[0].values.saturation).toBe(0)
    // Ids and links stay each copy's own.
    expect(stackOf(next, { type: 'layer', id: 'B' })[1].id).toBe('e2')
  })

  it('reads and writes the stacks of layers, groups, boards and the design', () => {
    const fx = newEffect('invert')
    const st = { doc: doc({ frames: [{ id: 'F', name: 'F', x: 0, y: 0, width: 10, height: 10 } as any] }), layers: [layer('A')], groups: [group('G')] }
    const targets: FxTarget[] = [{ type: 'layer', id: 'A' }, { type: 'group', id: 'G' }, { type: 'board', id: 'F' }, { type: 'doc' }]
    const next = { ...st, ...withStacks(st, targets.map(t => ({ t, list: [fx] }))) }
    for (const t of targets) expect(stackOf(next as any, t)).toEqual([fx])
    expect(st.layers[0].effects).toBeUndefined()
  })

  it('the cache key changes with settings, strength and the mask, not with the id', () => {
    const e = newEffect('blur')
    expect(fxKey([e])).toBe(fxKey([{ ...e, id: 'other' }]))
    expect(fxKey([e])).not.toBe(fxKey([{ ...e, opacity: 0.5 }]))
    expect(fxKey([e])).not.toBe(fxKey([{ ...e, mask: {} as HTMLCanvasElement }]))
    expect(fxKey([{ ...e, mask: {} as HTMLCanvasElement, maskOn: false }])).toBe(fxKey([e]))
    expect(fxKey([{ ...e, on: false }])).toBe(fxKey([]))
  })
})

describe('leaving children out of a group effect', () => {
  const groups = [group('G'), group('N', { parentId: 'G' })]
  it('keeps one run when nothing is left out', () => {
    const run = [layer('a', { groupId: 'G' }), layer('b', { groupId: 'N' }), layer('c', { groupId: 'G' })]
    const u = groupUnits(run, 'G', groups)
    expect(u).toHaveLength(1)
    expect(u[0].excluded).toBe(false)
    expect(u[0].layers.map(l => l.id)).toEqual(['a', 'b', 'c'])
  })
  it('splits the group around a child that is left out', () => {
    const run = [layer('a', { groupId: 'G' }), layer('logo', { groupId: 'G', fxExclude: true }), layer('c', { groupId: 'G' }), layer('d', { groupId: 'G' })]
    const u = groupUnits(run, 'G', groups)
    expect(u.map(x => [x.layers.map(l => l.id), x.excluded])).toEqual([[['a'], false], [['logo'], true], [['c', 'd'], false]])
  })
  it('a nested group left out keeps its layers together, as one child', () => {
    const g2 = [group('G'), group('N', { parentId: 'G', fxExclude: true })]
    const run = [layer('a', { groupId: 'G' }), layer('n1', { groupId: 'N' }), layer('n2', { groupId: 'N' }), layer('c', { groupId: 'G' })]
    const u = groupUnits(run, 'G', g2)
    expect(u.map(x => [x.layers.map(l => l.id), x.excluded])).toEqual([[['a'], false], [['n1', 'n2'], true], [['c'], false]])
  })
})

describe('effects from a newer Voidcanvas', () => {
  it('are marked, kept and not drawn', () => {
    const list = markUnknown([newEffect('blur'), { ...newEffect('blur'), kind: 'lightLeak' as any }, { ...newEffect('voidEffect', 'grain'), effect: 'hologram' as any }])!
    expect(list.map(e => !!e.unknown)).toEqual([false, true, true])
    expect(fxKey(list)).toBe(fxKey([list[0]]))
  })

  it('.void keeps them, with a note, and keeps effect masks', async () => {
    const png = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })
    const p: VoidProject = {
      id: 'd1', doc: { id: 'd1', name: 'Poster', width: 100, height: 100, background: '#fff', effects: [{ ...newEffect('invert'), id: 'dx' }] } as any,
      layers: [{ id: 'L1', type: 'shape', name: 'Box', effects: [{ ...newEffect('blur'), id: 'e1', hasMask: true }, { ...newEffect('blur'), id: 'e2', kind: 'lightLeak' }] } as any],
      groups: [{ id: 'G', name: 'G', effects: [{ ...newEffect('voidEffect', 'grain'), id: 'g1' }] } as any],
      swatches: [], blobs: { 'fx:L1:e1:mask': png }, fonts: {},
    }
    const r = await readVoid(new Uint8Array(await (await writeVoid(p)).arrayBuffer()))
    const fx = (r.project.layers[0] as any).effects
    expect(fx.map((e: any) => e.kind)).toEqual(['blur', 'lightLeak'])
    expect(fx[0].hasMask).toBe(true)
    expect(Object.keys(r.project.blobs)).toContain('fx:L1:e1:mask')
    expect((r.project.groups![0] as any).effects[0].effect).toBe('grain')
    expect((r.project.doc as any).effects[0].kind).toBe('invert')
    expect(r.notes.join(' ')).toMatch(/1 effect is from a newer Voidcanvas/)
  })
})
