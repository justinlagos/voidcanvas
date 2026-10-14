import { describe, expect, it } from 'vitest'
import { auditCascadeLayout } from '../cascade-quality'
import type { Doc, Frame, Layer, Rect } from '../types'

const frame: Frame = { id: 'V', name: 'Square', x: 600, y: 0, width: 1000, height: 1000, background: '#fff' }
const doc: Doc = { id: 'D', name: 'Example', width: 1600, height: 1000, background: null, frames: [frame] }
const layer = (id: string, srcId: string | null, x: number, y: number, w: number, h: number, role?: Layer['role'], type: 'text' | 'shape' = 'text'): Layer =>
  ({ id, srcId, frameId: 'V', name: id, role: role ?? null, type, visible: true,
    locked: false, opacity: 1, blend: 'source-over', mask: null, maskEnabled: false,
    rev: 1, x, y, w, h, scaleX: 1, scaleY: 1, rotation: 0, fontSize: 45, text: id,
    fontFamily: 'Inter', fontWeight: 600, italic: false, color: '#000', align: 'left',
    lineHeight: 1.2, letterSpacing: 0, shape: 'rect', strokeWidth: 0,
  } as Layer)
const measure = (l: Layer): Rect => ({ x: l.x, y: l.y, w: (l as any).w ?? 120, h: (l as any).h ?? 80 })
const audit = (master: Layer[], output: Layer[], skippedSourceIds?: Set<string>) =>
  auditCascadeLayout(master, output, frame, doc, { measure, skippedSourceIds })

describe('Cascade review diagnostics', () => {
  it('rejects silent loss of tagged logo, headline, or CTA', () => {
    const master = [
      layer('logo', null, 10, 10, 100, 100, 'logo'),
      layer('headline', null, 20, 20, 200, 100, 'headline'),
      layer('cta', null, 20, 220, 120, 80, 'cta'),
    ]
    const q = audit(master, [layer('v-logo', 'logo', 750, 70, 100, 100, 'logo')])
    expect(q.criticalCount).toBe(2)
    expect(q.issues.filter(x => x.code === 'missing-essential').map(x => x.layerId)).toEqual(['headline','cta'])
  })
  it('honours a designer explicitly excluding a panel', () => {
    const q = audit([layer('headline', null, 0, 0, 100, 40, 'headline')], [], new Set(['headline']))
    expect(q.criticalCount).toBe(0)
  })
  it('reports cropped text but exempts full-bleed photographic backgrounds', () => {
    const output = [layer('title', 's', 1550, 50, 200, 100, 'headline'),
      layer('photo', 'p', 570, -100, 1150, 1200, undefined, 'shape')]
    const q = audit([], output)
    expect(q.issues.filter(x => x.code === 'outside-board').map(x => x.layerId)).toEqual(['title'])
  })
  it('flags essential content near safe margins without preventing creation', () => {
    const q = audit([], [layer('brand', 's', 610, 100, 150, 100, 'logo')])
    expect(q.criticalCount).toBe(0)
    expect(q.issues.some(x => x.code === 'unsafe-margin')).toBe(true)
  })
  it('flags unreadable type sizes proportionally to the target dimensions', () => {
    const tiny = layer('fine', 's', 750, 100, 300, 80)
    ;(tiny as any).fontSize = 8
    expect(audit([], [tiny]).issues.some(x => x.code === 'unreadable-type')).toBe(true)
  })
  it('reports unintended text collisions but not same-group lockups', () => {
    const a = layer('a', 'a', 750, 100, 200, 100)
    const b = layer('b', 'b', 800, 130, 200, 100)
    expect(audit([], [a,b]).issues.some(x => x.code === 'text-collision')).toBe(true)
    a.groupId = 'logo'
    b.groupId = 'logo'
    expect(audit([], [a,b]).issues.some(x => x.code === 'text-collision')).toBe(false)
  })
  it('does not raise warnings for a sound composition', () => {
    const m = layer('m', null, 0, 0, 180, 60, 'headline')
    const v = layer('v', 'm', 800, 100, 180, 60, 'headline')
    expect(audit([m], [v]).issues).toEqual([])
  })
})
