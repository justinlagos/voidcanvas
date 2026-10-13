import { describe, expect, it } from 'vitest'
import { precheckFile, validateDimensions, MAX_PIXELS } from '../ingest'

describe('C1.1 ingest validation', () => {
  it('accepts PNG/JPEG/WebP/GIF within limits', () => {
    for (const t of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) {
      expect(precheckFile({ type: t, size: 1024 }).ok).toBe(true)
    }
  })
  it('rejects unsupported MIME with guidance', () => {
    const r = precheckFile({ type: 'image/tiff', size: 100 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('unsupported-type')
  })
  it('rejects oversize files', () => {
    const r = precheckFile({ type: 'image/png', size: 60 * 1024 * 1024 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('too-large')
  })
  it('rejects empty files', () => {
    const r = precheckFile({ type: 'image/png', size: 0 })
    expect(r.ok).toBe(false)
  })
  it('guards decompression bombs by pixel count', () => {
    expect(validateDimensions(8000, 8000).ok).toBe(false) // 64MP
    if (!validateDimensions(8000, 8000).ok) void MAX_PIXELS
    expect(validateDimensions(4000, 3000).ok).toBe(true)
  })
  it('rejects absurd dimensions', () => {
    expect(validateDimensions(13000, 100).ok).toBe(false)
    expect(validateDimensions(0, 100).ok).toBe(false)
  })
})
