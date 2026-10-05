import { describe, expect, it } from 'vitest'
import { resolveOpenRequest } from './open'

describe('Open in Voidcanvas gateway', () => {
  it('maps a resource link to a known internal destination with attribution', () => {
    const r = resolveOpenRequest({ to: 'tools', tool: 'halftone', source: 'resource', campaign: 'free-psd-site', content: 'hero-button' })
    expect(r.destination).toBe('/tools/halftone')
    expect(r.href).toContain('utm_source=resource')
    expect(r.href).toContain('utm_campaign=free-psd-site')
  })

  it('cannot become an open redirect', () => {
    const r = resolveOpenRequest({ to: 'https://evil.example/path', source: 'evil.example' })
    expect(r.destination).toBe('/editor')
    expect(r.href.startsWith('/editor?')).toBe(true)
    expect(r.href).not.toContain('evil.example')
  })

  it('falls back to the tools hub for unknown tool slugs', () => {
    expect(resolveOpenRequest({ to: 'tools', tool: 'does-not-exist' }).destination).toBe('/tools')
  })

  it('accepts only known source ids', () => {
    expect(resolveOpenRequest({ source: 'creator' }).source).toBe('creator')
    expect(resolveOpenRequest({ source: 'made-up-network' }).source).toBe('resource')
  })
})
