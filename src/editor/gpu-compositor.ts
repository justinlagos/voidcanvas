import type { TileRect } from './performance'
import { tileCacheKey } from './render-graph'

export type GpuBackend = 'webgl2' | 'cpu'

export interface GpuCapabilities {
  backend: GpuBackend
  maxTextureSize: number
  maxTextureUnits: number
  offscreen: boolean
}

export function detectGpu(canvas?: HTMLCanvasElement | OffscreenCanvas): GpuCapabilities {
  const offscreen = typeof OffscreenCanvas !== 'undefined'
  try {
    const target = canvas ?? (offscreen ? new OffscreenCanvas(1, 1) : document.createElement('canvas'))
    const gl = target.getContext('webgl2', { alpha: true, premultipliedAlpha: true }) as WebGL2RenderingContext | null
    if (!gl) return { backend: 'cpu', maxTextureSize: 0, maxTextureUnits: 0, offscreen }
    return {
      backend: 'webgl2',
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
      maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number,
      offscreen,
    }
  } catch {
    return { backend: 'cpu', maxTextureSize: 0, maxTextureUnits: 0, offscreen }
  }
}

interface ResidentTile<T> { key: string; value: T; used: number; bytes: number }
export interface EvictedTile<T> { key: string; value: T; bytes: number }

/** Renderer-agnostic LRU cache. WebGL texture ownership plugs in as T; CPU fallback can use ImageBitmap/canvas. */
export class TileResidency<T> {
  private items = new Map<string, ResidentTile<T>>()
  private clock = 0
  constructor(
    public maxTiles: number,
    public maxBytes = Number.POSITIVE_INFINITY,
    private dispose?: (value: T) => void,
    private onEvict?: (tile: EvictedTile<T>) => void,
  ) {}

  get size() { return this.items.size }
  get bytes() { return Array.from(this.items.values()).reduce((n, x) => n + x.bytes, 0) }

  get(key: string): T | undefined {
    const hit = this.items.get(key); if (!hit) return
    hit.used = ++this.clock
    return hit.value
  }

  set(key: string, value: T, bytes = 0) {
    const old = this.items.get(key)
    if (old && old.value !== value) this.dispose?.(old.value)
    this.items.set(key, { key, value, used: ++this.clock, bytes })
    this.trim()
  }

  delete(key: string) { return this.drop(key, false) }

  /** Change the live budget immediately; excess least-recently-used tiles are spilled through onEvict. */
  rebudget(maxTiles: number, maxBytes = this.maxBytes) {
    this.maxTiles = Math.max(1, Math.floor(maxTiles))
    this.maxBytes = Math.max(0, maxBytes)
    this.trim()
  }

  trimNow() { this.trim() }

  clear() {
    Array.from(this.items.values()).forEach(x => this.dispose?.(x.value))
    this.items.clear()
  }

  private drop(key: string, evicted: boolean) {
    const old = this.items.get(key); if (!old) return false
    this.items.delete(key)
    if (evicted) this.onEvict?.({ key: old.key, value: old.value, bytes: old.bytes })
    this.dispose?.(old.value)
    return true
  }

  private trim() {
    while (this.items.size > this.maxTiles || this.bytes > this.maxBytes) {
      let oldest: ResidentTile<T> | undefined
      Array.from(this.items.values()).forEach(x => { if (!oldest || x.used < oldest.used) oldest = x })
      if (!oldest) break
      this.drop(oldest.key, true)
    }
  }
}

export interface TileRenderRequest {
  projectId: string
  tile: TileRect
  scale: number
  revision: number
}

/** Stable identity shared by GPU, RAM and OPFS caches. */
export function renderTileKey(r: TileRenderRequest) {
  return tileCacheKey(r.projectId, r.tile, r.scale, r.revision)
}
