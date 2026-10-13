// C1.3 Native placement + replacement. All operations preserve composition:
// transform (x/y/scale/rotation), frame geometry, mask, crop state,
// effects/styles and clipId. Callers commit through the ONE history system.
//
// An empty image frame is an ordinary raster layer with emptyFrame:true and a
// 1x1 transparent canvas. Its displayed box is 1*scale (scaleX=frameW,
// scaleY=frameH). No new layer type, no scene-graph fork, no .void bump:
// old readers see a 1x1 transparent layer and ignore the additive fields.

import { makeCanvas, ctx2d } from '../engine'
import type { Layer, NativeAssetRef, RasterLayer } from '../types'
import type { NativeAsset } from './asset-store'

export interface FrameBox { x: number; y: number; width: number; height: number }

export function emptyFrameCanvas(): HTMLCanvasElement {
  const c = makeCanvas(1, 1)
  ctx2d(c).clearRect(0, 0, 1, 1)
  return c
}

export function isEmptyFrame(l: Layer | null | undefined): boolean {
  return !!l && l.type === 'raster' && !!(l as RasterLayer).emptyFrame
}

/** Displayed box of any layer in document space (axis-aligned approx). */
export function displayBoxOf(l: RasterLayer, canvasW: number, canvasH: number): FrameBox {
  return { x: l.x, y: l.y, width: Math.max(1, canvasW * l.scaleX), height: Math.max(1, canvasH * l.scaleY) }
}

function frameBoxOfPlaceholder(l: RasterLayer): FrameBox {
  return { x: l.x, y: l.y, width: Math.max(1, l.scaleX), height: Math.max(1, l.scaleY) }
}

/**
 * Scale + position to fit content (iw,ih) into `box` with cover (fill+crop)
 * or contain (fit). Centred. Pure + unit-tested.
 */
export function coverFit(box: FrameBox, iw: number, ih: number, fit: 'cover' | 'contain'): { scale: number; x: number; y: number } {
  const s = fit === 'cover' ? Math.max(box.width / iw, box.height / ih) : Math.min(box.width / iw, box.height / ih)
  const w = iw * s, h = ih * s
  return { scale: s, x: box.x + (box.width - w) / 2, y: box.y + (box.height - h) / 2 }
}

/** Patch for filling an empty frame placeholder. Preserves mask/effects/styles/clip/frameId. */
export function fillFramePatch(
  frame: RasterLayer,
  asset: NativeAsset,
  decoded: { canvas: HTMLCanvasElement; width: number; height: number },
  fit: 'cover' | 'contain' = 'cover',
): Partial<RasterLayer> & { asset: NativeAssetRef } {
  const box = frameBoxOfPlaceholder(frame)
  const { scale, x, y } = coverFit(box, decoded.canvas.width, decoded.canvas.height, fit)
  return {
    canvas: decoded.canvas,
    asset: {
      id: asset.resourceId, parentId: asset.parentId, title: asset.title,
      mime: asset.mime, sha256: asset.sha256, width: asset.width, height: asset.height, source: asset.source,
    },
    emptyFrame: null,
    frameFit: fit,
    x, y, scaleX: scale, scaleY: scale,
    rev: frame.rev, // caller bumps via updateLayer/commit path
  }
}

/**
 * Replacement patch: swap canvas + asset pointer only. Transform, mask,
 * crop, effects, styles, clip and frame membership are untouched.
 * Parent lineage: new asset's parentId must already point at the old asset.
 */
export function replaceContentPatch(
  layer: RasterLayer,
  asset: NativeAsset,
  decoded: { canvas: HTMLCanvasElement },
): Partial<RasterLayer> & { asset: NativeAssetRef } {
  void layer
  return {
    canvas: decoded.canvas,
    asset: {
      id: asset.resourceId, parentId: asset.parentId, title: asset.title,
      mime: asset.mime, sha256: asset.sha256, width: asset.width, height: asset.height, source: asset.source,
    },
    emptyFrame: null,
  }
}

/** Lineage chain for a layer from the doc registry (original first). */
export function lineageForLayer(
  registry: Record<string, { resourceId: string; parentId: string | null } | NativeAsset> | null | undefined,
  leafId: string | null | undefined,
): string[] {
  const out: string[] = []
  let cur = leafId ?? null
  const guard = new Set<string>()
  while (cur && registry && (registry as Record<string, { parentId: string | null }>)?.[cur] && !guard.has(cur)) {
    guard.add(cur)
    out.unshift(cur)
    cur = (registry as Record<string, { parentId: string | null }>)[cur].parentId
  }
  return out
}
