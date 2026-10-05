import type { BlendMode } from './types'
import { gpuBlendSupported, WebGLTileCompositor, type GpuTexture } from './webgl-compositor'

export interface GpuTileLayer {
  source: TexImageSource
  blend: BlendMode
  opacity: number
}

export interface GpuTileResult {
  compositor: WebGLTileCompositor
  texture: GpuTexture
  width: number
  height: number
  /** Dispose after the caller has uploaded/read the result. */
  dispose(): void
}

/**
 * Composite a resolved tile stack entirely on GPU. Returns null instead of approximating when a mode/context is
 * unsupported; callers then use the existing CPU renderer for that tile.
 */
export function composeGpuTile(
  target: HTMLCanvasElement | OffscreenCanvas,
  width: number,
  height: number,
  layers: GpuTileLayer[],
): GpuTileResult | null {
  if (!layers.every(l => gpuBlendSupported(l.blend))) return null
  let compositor: WebGLTileCompositor | null = null
  const owned: GpuTexture[] = []
  try {
    compositor = new WebGLTileCompositor(target)
    let backdrop = compositor.texture(width, height); owned.push(backdrop)
    // Transparent texture allocation initializes implementation-defined memory; explicitly clear it once.
    const gl = compositor.gl
    const clearFb = gl.createFramebuffer(); if (!clearFb) throw Error('WebGL framebuffer allocation failed.')
    gl.bindFramebuffer(gl.FRAMEBUFFER, clearFb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, backdrop.texture, 0)
    gl.viewport(0, 0, width, height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(clearFb)

    for (const layer of layers) {
      const source = compositor.texture(width, height, layer.source); owned.push(source)
      const out = compositor.texture(width, height); owned.push(out)
      compositor.composite(backdrop, source, out, layer.blend as Parameters<WebGLTileCompositor['composite']>[3], layer.opacity)
      // Intermediate backdrop and source are no longer needed.
      compositor.disposeTexture(source); owned.splice(owned.indexOf(source), 1)
      if (backdrop !== owned[0] || layers.length > 0) {
        const i = owned.indexOf(backdrop); if (i >= 0) owned.splice(i, 1)
        compositor.disposeTexture(backdrop)
      }
      backdrop = out
    }

    const final = backdrop
    return {
      compositor,
      texture: final,
      width, height,
      dispose() {
        compositor?.disposeTexture(final)
        compositor?.dispose()
      },
    }
  } catch {
    if (compositor) {
      owned.forEach(t => compositor!.disposeTexture(t))
      compositor.dispose()
    }
    return null
  }
}
