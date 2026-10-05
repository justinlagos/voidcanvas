import { describe, expect, it } from 'vitest'
import { documentColour, exceedsInkLimit, isPureBlack, LEGACY_SRGB, normalizeNativeColour, planColourConversion, totalAreaCoverage, type CmykColour, type DocumentColourSettings } from '../document-colour'

describe('native document colour model', () => {
  it('keeps old documents explicitly backward-compatible as sRGB', () => {
    expect(documentColour({})).toEqual(LEGACY_SRGB)
  })

  it('preserves native CMYK channel intent and diagnoses total ink', () => {
    const black: CmykColour = { model: 'cmyk', c: 0, m: 0, y: 0, k: 100 }
    expect(isPureBlack(black)).toBe(true)
    expect(totalAreaCoverage({ model: 'cmyk', c: 80, m: 70, y: 60, k: 50 })).toBe(260)
    expect(exceedsInkLimit({ model: 'cmyk', c: 80, m: 70, y: 60, k: 50 }, { maxInk: 240 })).toBe(true)
  })

  it('clamps invalid native channel values without converting colour models', () => {
    expect(normalizeNativeColour({ model: 'cmyk', c: -4, m: 120, y: 40, k: 20 })).toEqual({ model: 'cmyk', c: 0, m: 100, y: 40, k: 20, a: undefined })
  })

  it('separates metadata planning from destructive pixel conversion', () => {
    const cmyk: DocumentColourSettings = { model: 'cmyk', profile: 'abc', profileName: 'Printer', intent: 'relative-colorimetric', blackPointCompensation: true, preserveBlack: true, maxInk: 300 }
    const p = planColourConversion({}, cmyk)
    expect(p.before.model).toBe('rgb')
    expect(p.after.model).toBe('cmyk')
    expect(p.requiresPixelConversion).toBe(true)
  })
})
