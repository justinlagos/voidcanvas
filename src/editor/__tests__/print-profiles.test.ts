import { describe, expect, it } from 'vitest'
import { preferredRecommendation, recommendationsFor } from '../print-profiles'

describe('printer profile policy', () => {
  it('offers a UK/Europe starting point without pretending to provide ICC bytes', () => {
    const p = preferredRecommendation('uk-europe')
    expect(p?.profileName).toMatch(/FOGRA51/)
    expect(p?.requiresProfileFile).toBe(true)
  })

  it('keeps Nigerian guidance conservative and printer-profile-first', () => {
    const p = preferredRecommendation('nigeria')
    expect(p?.profileName).toMatch(/FOGRA39/)
    expect(p?.maxInk).toBe(300)
    expect(p?.description).toMatch(/printer/i)
    expect(p?.requiresProfileFile).toBe(true)
  })

  it('does not invent a custom profile', () => {
    expect(recommendationsFor('custom')).toEqual([])
    expect(preferredRecommendation('custom')).toBeNull()
  })
})
