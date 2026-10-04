import { describe, expect, it } from 'vitest'
import { captureAppearance, captureTextStyle, materializeEffects, portableEffects } from '../reuse'
import type { Effect, ShapeLayer, TextLayer } from '../types'

const fx = (id = 'fx-source'): Effect => ({
  id,
  kind: 'blur',
  values: { radius: 12 },
  on: true,
  opacity: 0.8,
  blend: 'multiply',
  link: 'shared-source-link',
  mask: {} as HTMLCanvasElement,
  maskAt: { x: 20, y: 30 },
  maskOn: true,
  hasMask: true,
})

const text = (): TextLayer => ({
  id: 'text-1', name: 'Headline', type: 'text', text: 'Launch', visible: true, locked: false,
  opacity: 0.9, blend: 'overlay', x: 120, y: 80, scaleX: 1, scaleY: 1, rotation: 0,
  mask: null, maskEnabled: true, rev: 1, fillOpacity: 0.75,
  fontFamily: 'Space Grotesk', fontSize: 64, fontWeight: 700, italic: false, color: '#f4f4f4',
  align: 'center', lineHeight: 1.05, letterSpacing: -1.5, underline: false, strike: false,
  caps: 'all', kerning: true, wordSpacing: 2, stretch: 100, indent: 0, spaceAfter: 8,
  baselineShift: 0, outline: { color: '#000000', width: 2 }, shadow: null,
  effects: [fx()],
})

const shape = (): ShapeLayer => ({
  id: 'shape-1', name: 'Card', type: 'shape', shape: 'rect', visible: true, locked: false,
  opacity: 1, blend: 'source-over', x: 10, y: 10, scaleX: 1, scaleY: 1, rotation: 0,
  mask: null, maskEnabled: true, rev: 1, fill: '#111111', stroke: '#ffffff', strokeWidth: 3,
  radius: 24, w: 400, h: 200, strokeAlign: 'inside', strokeCap: 'round', strokeJoin: 'round',
  strokeDash: [2, 1], effects: [fx('shape-fx')],
})

describe('Phase 7 reusable appearance', () => {
  it('removes target-specific effect identity and masks before saving', () => {
    const saved = portableEffects([fx()])
    expect(saved).toHaveLength(1)
    expect(saved[0]).not.toHaveProperty('id')
    expect(saved[0]).not.toHaveProperty('link')
    expect(saved[0]).not.toHaveProperty('mask')
    expect(saved[0]).not.toHaveProperty('maskAt')
    expect(saved[0]).not.toHaveProperty('hasMask')
    expect(saved[0].maskOn).toBe(false)
    expect(saved[0].values.radius).toBe(12)
    expect(saved[0].blend).toBe('multiply')
  })

  it('creates fresh independent effects every time a Look is applied', () => {
    const portable = portableEffects([fx()])
    const first = materializeEffects(portable)
    const second = materializeEffects(portable)
    expect(first[0].id).not.toBe(second[0].id)
    expect(first[0].link).toBeNull()
    expect(first[0].mask).toBeNull()
    expect(first[0].maskAt).toBeNull()
    expect(first[0].hasMask).toBe(false)
    expect(first[0].maskOn).toBe(false)
    expect(first[0].values).toEqual({ radius: 12 })
  })

  it('captures text styling without text content, identity or position', () => {
    const layer = text()
    const style = captureTextStyle(layer)
    expect(style.fontFamily).toBe('Space Grotesk')
    expect(style.fontWeight).toBe(700)
    expect(style.align).toBe('center')
    expect(style.outline).toEqual({ color: '#000000', width: 2 })
    expect(style).not.toHaveProperty('text')
    expect(style).not.toHaveProperty('id')
    expect(style).not.toHaveProperty('x')
    expect(style).not.toHaveProperty('y')
  })

  it('captures compatible text and shape appearance plus the ordered effect stack', () => {
    const ta = captureAppearance(text())
    expect(ta.common.opacity).toBe(0.9)
    expect(ta.common.blend).toBe('overlay')
    expect(ta.text?.fontSize).toBe(64)
    expect(ta.effects).toHaveLength(1)

    const sa = captureAppearance(shape())
    expect(sa.shape?.fill).toBe('#111111')
    expect(sa.shape?.strokeAlign).toBe('inside')
    expect(sa.shape?.strokeDash).toEqual([2, 1])
    expect(sa.effects).toHaveLength(1)
  })
})
