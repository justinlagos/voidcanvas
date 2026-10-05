import { describe, expect, it } from 'vitest'
import { DIRECTION_FAMILIES, familyById, familyCompatibility } from './families'

describe('Brand V2 direction families', () => {
  it('ships the twelve distinct direction families from the V2 plan', () => {
    expect(DIRECTION_FAMILIES).toHaveLength(12)
    expect(new Set(DIRECTION_FAMILIES.map((f) => f.id)).size).toBe(12)
    expect(DIRECTION_FAMILIES.every((f) => f.grids.length && f.axes.length && f.eyeMotion.length)).toBe(true)
  })

  it('steers an achromatic identity toward monochrome studio without forbidding alternatives', () => {
    const mono = familyCompatibility({ family: familyById('monochrome-studio'), achromatic: true, logoCharacter: 'orthogonal' })
    const soft = familyCompatibility({ family: familyById('soft'), achromatic: true, logoCharacter: 'orthogonal' })
    expect(mono).toBeGreaterThan(soft)
    expect(soft).toBeGreaterThan(0)
  })

  it('steers diagonal marks toward kinetic and geometric directions', () => {
    const kinetic = familyCompatibility({ family: familyById('kinetic'), achromatic: false, logoCharacter: 'diagonal' })
    const quiet = familyCompatibility({ family: familyById('quiet-luxury'), achromatic: false, logoCharacter: 'diagonal' })
    expect(kinetic).toBeGreaterThan(quiet)
  })
})
