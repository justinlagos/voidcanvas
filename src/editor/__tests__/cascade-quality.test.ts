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
  it('blocks a visible master logo whose variant is hidden by a nested group', () => {
    const m = layer('m', null, 0, 0, 100, 50, 'logo')
    const v = layer('v', 'm', 800, 100, 100, 50, 'logo'); v.groupId = 'child'
    const q = auditCascadeLayout([m], [v], frame, doc, { measure, groups: [
      { id: 'parent', name: 'Hidden', visible: false, opacity: 1, collapsed: false },
      { id: 'child', name: 'Brand', visible: true, opacity: 1, collapsed: false, parentId: 'parent' },
    ] })
    expect(q.issues.map(i => i.code)).toContain('essential-hidden')
    expect(q.criticalCount).toBe(1)
  })
  it('does not demand content deliberately hidden in the master', () => {
    const m = layer('m', null, 0, 0, 100, 50, 'logo'); m.groupId = 'hidden'
    const q = auditCascadeLayout([m], [], frame, doc, { measure, masterGroups: [
      { id: 'hidden', name: 'Hidden', visible: false, opacity: 1, collapsed: false },
    ] })
    expect(q.criticalCount).toBe(0)
  })
  it('blocks nonfinite essential geometry instead of silently passing it', () => {
    const v = layer('v', 'm', NaN, 100, 100, 50, 'logo')
    expect(audit([], [v]).issues.some(i => i.code === 'invalid-geometry' && i.severity === 'critical')).toBe(true)
  })
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
  it('uses a physical 3 mm print margin rather than a percentage of an A4 board', () => {
    const paper: Frame = { ...frame, width: 2480, height: 3508, print: { widthMm: 210, heightMm: 297, dpi: 300 } }
    const brand = layer('brand', 's', paper.x + 4 / 210 * paper.width, 100, 150, 100, 'logo', 'shape')
    const q = () => auditCascadeLayout([], [brand], paper, doc, { measure })
    expect(q().issues.some(i => i.code === 'unsafe-margin')).toBe(false)
    brand.x = paper.x + 2 / 210 * paper.width
    expect(q().issues.find(i => i.code === 'unsafe-margin')?.message).toContain('within 3 mm')
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
  it('blocks a tagged essential layer that is present by srcId but entirely off the board', () => {
    const required = layer('source-logo', null, 0, 0, 100, 40, 'logo')
    const outside = layer('variant-logo', 'source-logo', 1610, 100, 150, 60, 'logo')
    const q = audit([required], [outside])
    expect(q.criticalCount).toBe(1)
    expect(q.issues.find(x => x.code === 'essential-off-board')?.layerId).toBe('variant-logo')
  })
  it('treats a partially cropped logo as a review warning, not a full loss', () => {
    const part = layer('part', 's', 1580, 100, 100, 80, 'logo')
    const q = audit([], [part])
    expect(q.criticalCount).toBe(0)
    expect(q.issues.some(x => x.code === 'outside-board')).toBe(true)
  })
  it('flags paragraph lines whose actual glyph width exceeds their box width', () => {
    const t = layer('oversized', 's', 780, 150, 100, 50)
    if (t.type !== 'text') throw Error('expected text')
    t.boxWidth = 20
    const q = auditCascadeLayout([], [t], frame, doc, {
      measure,
      lines: () => [{ text: 'W', width: 28, first: true }],
    })
    expect(q.issues.some(x => x.code === 'text-box-overflow')).toBe(true)
  })
  it('accounts for paragraph first-line indentation without warning on sound text', () => {
    const t = layer('type', 's', 780, 150, 200, 50)
    if (t.type !== 'text') throw Error('expected text')
    t.boxWidth = 100
    t.indent = 30
    const measureLine = (width: number, first: boolean) => auditCascadeLayout([], [t], frame, doc, {
      measure, lines: () => [{text:'Brand', width, first}],
    })
    expect(measureLine(70, true).issues.some(x => x.code === 'text-box-overflow')).toBe(true)
    expect(measureLine(60, true).issues.some(x => x.code === 'text-box-overflow')).toBe(false)
    expect(measureLine(70, false).issues.some(x => x.code === 'text-box-overflow')).toBe(false)
  })
  it('never blocks untagged decorative or off-board background layers', () => {
    const l = layer('background', null, 2000, 0, 100, 100, undefined, 'shape')
    const q = audit([], [l])
    expect(q.criticalCount).toBe(0)
    expect(q.issues).toEqual([])
  })

})
