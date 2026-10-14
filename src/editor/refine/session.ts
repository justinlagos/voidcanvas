/**
 * C3 Refine session — entering/exiting the focused regional-editing mode.
 * Pure logic over an injected host so it is unit-testable without the store.
 * The mode itself reuses existing tools (marquee/ellipse/lasso), the existing
 * selection + mask ops and the existing repair/remove operations; this module
 * only guards which layer is being refined and which tool is in hand.
 */
import type { ToolId } from '../types'

export interface RefineLayerRef {
  id: string
  type: string
  locked?: boolean | null
  lockPixels?: boolean | null
  name?: string | null
}

export interface RefineHost {
  setTool: (t: ToolId) => void
  setRefine: (id: string | null) => void
  notify: (msg: string) => void
}

/** Why a layer cannot be refined, or null when it can. */
export function refineTargetError(layer: RefineLayerRef | null | undefined): string | null {
  if (!layer) return 'Select an image layer to refine.'
  if (layer.type !== 'raster') return 'Refine works on image layers. Rasterize text or shapes first.'
  if (layer.locked) return 'This layer is locked. Unlock it to refine.'
  if (layer.lockPixels) return 'This layer’s pixels are locked. Unlock them to refine.'
  return null
}

/**
 * Enter refine mode for a layer: pins the target, hands the user the
 * rectangular selection tool (they can switch to ellipse/lasso/brush),
 * and keeps the current selection so no work is lost.
 */
export function enterRefineArea(host: RefineHost, layer: RefineLayerRef | null | undefined): boolean {
  const err = refineTargetError(layer)
  if (err || !layer) {
    host.notify(err ?? 'Select an image layer to refine.')
    return false
  }
  host.setRefine(layer.id)
  host.setTool('marquee')
  return true
}

export function exitRefineArea(host: RefineHost): void {
  host.setRefine(null)
}

/** Refine mode must end when its layer is gone, locked or no longer raster. */
export function refineStillValid(layer: RefineLayerRef | null | undefined): boolean {
  return refineTargetError(layer) === null
}
