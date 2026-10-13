import { describe, expect, it, vi } from 'vitest'
import { enterRefineArea, exitRefineArea, refineStillValid, refineTargetError, type RefineHost } from '../session'

const host = (): RefineHost & { calls: string[] } => {
  const calls: string[] = []
  return {
    calls,
    setTool: t => {
      calls.push('tool:' + t)
    },
    setRefine: id => {
      calls.push('refine:' + id)
    },
    notify: m => {
      calls.push('notify:' + m)
    },
  }
}

describe('C3 refine session', () => {
  it('enters refine mode on an editable raster layer', () => {
    const h = host()
    expect(enterRefineArea(h, { id: 'l1', type: 'raster', name: 'Photo' })).toBe(true)
    expect(h.calls).toEqual(['refine:l1', 'tool:marquee'])
  })
  it('refuses non-raster, locked and missing layers with guidance', () => {
    expect(refineTargetError(null)).toMatch(/Select an image/)
    expect(refineTargetError({ id: 't', type: 'text' })).toMatch(/Rasterize/)
    expect(refineTargetError({ id: 'l', type: 'raster', locked: true })).toMatch(/locked/)
    expect(refineTargetError({ id: 'l', type: 'raster', lockPixels: true })).toMatch(/pixels are locked/)
    const h = host()
    expect(enterRefineArea(h, { id: 't', type: 'text' })).toBe(false)
    expect(h.calls.some(c => c.startsWith('notify:'))).toBe(true)
    expect(h.calls.some(c => c.startsWith('refine:'))).toBe(false)
  })
  it('exits cleanly and invalidates removed layers', () => {
    const h = host()
    exitRefineArea(h)
    expect(h.calls).toEqual(['refine:null'])
    expect(refineStillValid({ id: 'l', type: 'raster' })).toBe(true)
    expect(refineStillValid(undefined)).toBe(false)
    expect(refineStillValid({ id: 'l', type: 'raster', locked: true })).toBe(false)
  })
})
