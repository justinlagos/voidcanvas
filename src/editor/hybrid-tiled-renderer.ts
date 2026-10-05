import { composeGpuTile, type GpuTileLayer } from './gpu-tile-pipeline'
import { visibleTiles, type TileRect } from './performance'

export interface HybridTileCallbacks {
  /** Resolved tile-sized sources. null means this tile must stay on CPU. */
  gpuLayers(tile: TileRect): Promise<GpuTileLayer[] | null> | GpuTileLayer[] | null
  /** Fidelity fallback for unsupported modes, old browsers and context loss. Must return a tile-sized image. */
  cpuTile(tile: TileRect): Promise<CanvasImageSource> | CanvasImageSource
}

export interface HybridTileStats { tiles: number; gpu: number; cpu: number; failedGpu: number }

export function flipRgbaRows(bytes: Uint8Array, width: number, height: number) {
  const row = width * 4, out = new Uint8ClampedArray(bytes.length)
  for (let y = 0; y < height; y++) out.set(bytes.subarray((height - 1 - y) * row, (height - y) * row), y * row)
  return out
}

export function tileRenderPlan(region: { x: number; y: number; w: number; h: number }, docW: number, docH: number, tileSize: number) {
  return visibleTiles(region, docW, docH, tileSize)
}

function workCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas | null {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
  return null
}

/**
 * Visible-region tiled compositor. WebGL2 is opportunistic per tile; every unsupported blend/context/device falls
 * back to the same CPU semantic resolver. This is the first-class path for older phones rather than a degraded mode.
 */
export async function renderHybridTiled(
  target: HTMLCanvasElement,
  region: { x: number; y: number; w: number; h: number },
  docW: number,
  docH: number,
  tileSize: number,
  callbacks: HybridTileCallbacks,
): Promise<HybridTileStats> {
  const ctx = target.getContext('2d'); if (!ctx) throw Error('2D target is unavailable.')
  const tiles = tileRenderPlan(region, docW, docH, tileSize)
  const stats: HybridTileStats = { tiles: tiles.length, gpu: 0, cpu: 0, failedGpu: 0 }
  for (const tile of tiles) {
    let drawn = false
    const layers = await callbacks.gpuLayers(tile)
    if (layers?.length) {
      const gpuCanvas = workCanvas(tile.w, tile.h)
      if (gpuCanvas) {
        const result = composeGpuTile(gpuCanvas, tile.w, tile.h, layers)
        if (result) {
          try {
            const rgba = flipRgbaRows(result.compositor.read(result.texture), tile.w, tile.h)
            const out = workCanvas(tile.w, tile.h)
            const ox = out?.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
            if (out && ox) {
              ox.putImageData(new ImageData(rgba, tile.w, tile.h), 0, 0)
              ctx.drawImage(out as CanvasImageSource, tile.x, tile.y)
              stats.gpu++; drawn = true
            }
          } finally { result.dispose() }
        } else stats.failedGpu++
      } else stats.failedGpu++
    }
    if (!drawn) {
      const source = await callbacks.cpuTile(tile)
      ctx.drawImage(source, tile.x, tile.y, tile.w, tile.h)
      stats.cpu++
    }
  }
  return stats
}
