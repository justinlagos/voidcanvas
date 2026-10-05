import { describe, expect, it } from 'vitest'
import { COMPOSITE_FRAGMENT_SHADER, GPU_BLEND_MODES, gpuBlendIndex, gpuBlendSupported } from '../webgl-compositor'

describe('WebGL tile compositor contract', () => {
  it('accelerates only explicitly implemented blend modes', () => {
    expect(gpuBlendSupported('multiply')).toBe(true)
    expect(gpuBlendSupported('soft-light')).toBe(true)
    expect(gpuBlendSupported('hue')).toBe(false)
    expect(gpuBlendSupported('color')).toBe(false)
  })

  it('assigns stable contiguous shader mode indexes', () => {
    expect(GPU_BLEND_MODES.map(gpuBlendIndex)).toEqual(GPU_BLEND_MODES.map((_, i) => i))
  })

  it('keeps alpha compositing in the shader rather than fixed-function blending', () => {
    expect(COMPOSITE_FRAGMENT_SHADER).toContain('float ao = asrc + ab - asrc * ab')
    expect(COMPOSITE_FRAGMENT_SHADER).toContain('asrc * ab * B')
    expect(COMPOSITE_FRAGMENT_SHADER).toContain('softLight')
  })
})
