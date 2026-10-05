import { describe, expect, it } from 'vitest'
import { TOOLS } from './defs'
import { metadataForTool, relatedTools, validateToolDef, validateToolRegistry } from './factory'

describe('tool factory', () => {
  it('accepts the current registry', () => {
    expect(validateToolRegistry(TOOLS)).toEqual({ ok: true, errors: [] })
  })

  it('rejects thin or malformed tool definitions', () => {
    const r = validateToolDef({ slug: 'Bad Slug', effect: 'halftone', name: 'Bad', tagline: 'tiny', about: 'thin', faqs: [] })
    expect(r.ok).toBe(false)
    expect(r.errors.length).toBeGreaterThanOrEqual(5)
  })

  it('creates canonical metadata from the same definition used by the tool', () => {
    const m = metadataForTool(TOOLS.halftone)
    expect(m.alternates?.canonical).toBe('/tools/halftone')
    expect(String(m.title)).toContain('Halftone Generator')
  })

  it('derives related tools from the registry without the current tool', () => {
    const related = relatedTools(TOOLS, 'halftone', 4)
    expect(related.map(x => x.slug)).not.toContain('halftone')
    expect(related.length).toBe(Math.min(4, Object.keys(TOOLS).length - 1))
  })
})
