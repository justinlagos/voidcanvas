export interface RenderBudget {
  overviewMaxEdge: number
  sharpMaxPixels: number
  tileSize: number
  maxResidentTiles: number
  large: boolean
}

/**
 * One policy for editor preview memory. Export remains full-resolution; this only controls interactive previews.
 * The thresholds are deliberately based on document pixels, not device class guesses, so behaviour is stable.
 */
export function renderBudget(width: number, height: number, dpr = 1): RenderBudget {
  const pixels = Math.max(1, width * height)
  const large = pixels > 24_000_000 || Math.max(width, height) > 8192
  const huge = pixels > 80_000_000 || Math.max(width, height) > 16384
  return {
    overviewMaxEdge: huge ? 2048 : large ? 3072 : Math.min(4096, Math.max(2048, Math.round(2560 * Math.min(2, dpr)))),
    sharpMaxPixels: huge ? 18_000_000 : large ? 28_000_000 : 40_000_000,
    tileSize: huge ? 768 : 1024,
    maxResidentTiles: huge ? 12 : large ? 20 : 32,
    large,
  }
}

export interface TileRect { x: number; y: number; w: number; h: number; key: string }

/** Split a visible document region into bounded tiles. Useful for sharp redraws and future worker/GPU renderers. */
export function visibleTiles(region: { x: number; y: number; w: number; h: number }, docW: number, docH: number, tileSize: number): TileRect[] {
  const x0 = Math.max(0, Math.floor(region.x / tileSize)), y0 = Math.max(0, Math.floor(region.y / tileSize))
  const x1 = Math.min(Math.ceil(docW / tileSize), Math.ceil((region.x + region.w) / tileSize))
  const y1 = Math.min(Math.ceil(docH / tileSize), Math.ceil((region.y + region.h) / tileSize))
  const out: TileRect[] = []
  for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
    const x = tx * tileSize, y = ty * tileSize
    out.push({ x, y, w: Math.min(tileSize, docW - x), h: Math.min(tileSize, docH - y), key: `${tx}:${ty}` })
  }
  return out
}
