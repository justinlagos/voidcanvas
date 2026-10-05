import { describe, expect, it } from 'vitest'
import { validateGrowthState } from './validate'

describe('Growth OS publication gate', () => {
  it('has no blockers in the current repository state', () => {
    const result = validateGrowthState()
    expect(result.blockers).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('does not silently elevate risky A3 work', () => {
    const result = validateGrowthState()
    expect(result.warnings.filter(x => x.includes('A3 requires explicit review'))).toEqual([])
  })
})
