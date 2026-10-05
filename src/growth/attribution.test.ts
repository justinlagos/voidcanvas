import { describe, expect, it } from 'vitest'
import { buildGrowthUrl, readExperiment, safeGrowthTag, validateGrowthLink } from './attribution'

describe('growth attribution', () => {
  it('normalises human labels into safe ids', () => {
    expect(safeGrowthTag('Cascade Launch / Oct 2026')).toBe('cascade-launch-oct-2026')
  })

  it('builds a canonical campaign URL with experiment tags', () => {
    expect(buildGrowthUrl('/tools/halftone', {
      source: 'pinterest', medium: 'organic', campaign: 'halftone-search', content: 'before-after-01', experiment: 'pin-thumb', variant: 'b',
    })).toBe('/tools/halftone?utm_source=pinterest&utm_medium=organic&utm_campaign=halftone-search&utm_content=before-after-01&vc_exp=pin-thumb&vc_var=b')
  })

  it('requires experiment and variant together', () => {
    expect(validateGrowthLink({ source: 'google', medium: 'organic', campaign: 'psd', experiment: 'headline' })).toContain('experiment and variant must be supplied together.')
  })

  it('only reads complete experiment pairs', () => {
    expect(readExperiment('?vc_exp=hero&vc_var=b')).toEqual({ experiment: 'hero', variant: 'b' })
    expect(readExperiment('?vc_exp=hero')).toEqual({})
  })
})
