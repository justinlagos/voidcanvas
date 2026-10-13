import { describe, expect, it, vi } from 'vitest'
import { createMockGenerationProvider, dimensionsFor, validateGenerationRequest, type GenerationRequest } from '../mock-provider'
const req: GenerationRequest = { prompt: 'Rocket on a launchpad', aspect: 'portrait', count: 2, capability: 'text-to-image' }
describe('C2 mock generation provider (no network)', () => {
  it('validates prompt, candidate count and variation reference', () => {
    expect(validateGenerationRequest(req)).toBeNull()
    expect(validateGenerationRequest({ ...req, prompt: '' })).toBeTruthy()
    expect(validateGenerationRequest({ ...req, count: 5 })).toBeTruthy()
    expect(validateGenerationRequest({ ...req, capability: 'variation' })).toBeTruthy()
  })
  it('maps supported aspect ratios to bounded dimensions', () => {
    expect(dimensionsFor('portrait')).toEqual({ width: 768, height: 1024 })
    expect(dimensionsFor('landscape')).toEqual({ width: 1024, height: 768 })
  })
  it('returns explicitly labeled PNG test candidates and progress', async () => {
    const render = vi.fn(async () => new Blob(['fake test png bytes'], { type: 'image/png' }))
    const progress: number[] = []
    const provider = createMockGenerationProvider(render)
    const result = await provider.generate(req, { onProgress: n => progress.push(n) })
    expect(provider.remote).toBe(false)
    expect(provider.price).toBe(0)
    expect(result).toHaveLength(2)
    expect(result.every(c => c.mock && c.mime === 'image/png')).toBe(true)
    expect(progress).toEqual([0.5, 1])
  })
  it('does not render when cancelled before request', async () => {
    const render = vi.fn(async () => new Blob(['x'], { type: 'image/png' }))
    const ctrl = new AbortController(); ctrl.abort()
    await expect(createMockGenerationProvider(render).generate(req, { signal: ctrl.signal })).rejects.toMatchObject({ name: 'AbortError' })
    expect(render).not.toHaveBeenCalled()
  })
  it('rejects empty encoded candidates', async () => {
    const provider = createMockGenerationProvider(async () => new Blob([], { type: 'image/png' }))
    await expect(provider.generate({ ...req, count: 1 })).rejects.toThrow('invalid PNG')
  })
})
