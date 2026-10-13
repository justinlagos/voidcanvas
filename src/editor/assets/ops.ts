// C1 store operations: the ONLY writers of asset lineage into the live store.
// Every function commits exactly one named history step (or none on failure),
// so undo/redo of place/fill/replace is a single Ctrl+Z transaction.

import { base, nextRev, useEditor } from '../store'
import { makeCanvas } from '../engine'
import type { NativeAssetRef, RasterLayer } from '../types'
import { getAsset, getOriginal, listAssets, registerAsset, type NativeAsset } from './asset-store'
import { decodeImage, precheckFile, sha256Of, thumbnailOf } from './ingest'
import { coverFit, emptyFrameCanvas, fillFramePatch, isEmptyFrame, replaceContentPatch, type FrameBox } from './place'

export interface IngestResult { asset: NativeAsset; canvas: HTMLCanvasElement; fullW: number; fullH: number }

function syncRegistryState(): void {
  const st = useEditor.getState()
  if (!st.doc) return
  const reg: Record<string, NativeAsset> = {}
  for (const a of listAssets()) reg[a.resourceId] = a
  // Merge with any registry already on the doc (e.g. from an opened file).
  const prev = (st.doc.assets ?? {}) as Record<string, NativeAsset>
  useEditor.setState({ doc: { ...st.doc, assets: { ...prev, ...reg } } })
}

/** Validate + decode + register a user file. Returns null + toast on rejection. */
export async function ingestFile(file: File | Blob, nameHint?: string): Promise<IngestResult | null> {
  const st = useEditor.getState()
  const pre = precheckFile(file as File)
  if (!pre.ok) { st.notify(pre.message); return null }
  let decoded
  try {
    decoded = await decodeImage(file as Blob)
  } catch (e) {
    st.notify((e as Error).message || 'That file is not an image we can open.')
    return null
  }
  const sha = await sha256Of(file as Blob).catch(() => `local-${Date.now().toString(36)}`)
  const name = (nameHint ?? (file as File).name ?? 'Image').replace(/\.[a-z0-9]+$/i, '').slice(0, 40) || 'Image'
  const asset = registerAsset({
    title: name,
    mime: pre.mime,
    width: decoded.width,
    height: decoded.height,
    sha256: sha,
    source: 'user_upload',
    parentId: null,
    recipeId: null,
    thumb: thumbnailOf(decoded.canvas),
  }, file as Blob)
  // The upload joins the document registry immediately (persisted, lineage-tracked),
  // even before it is placed: an unplaced tray asset must survive save/reopen.
  // No history entry: uploading is not an undoable canvas edit.
  syncRegistryState()
  return { asset, canvas: decoded.canvas, fullW: decoded.width, fullH: decoded.height }
}

/** Place an ingested asset as a new raster layer (fit into the active board). */
export function placeAssetAsLayer(result: IngestResult, opts: { role?: RasterLayer['role'] } = {}): string | null {
  const st = useEditor.getState()
  if (!st.doc) return null
  const doc = st.doc
  const frame = doc.frames?.find(f => f.id === st.activeFrameId) ?? doc.frames?.[0] ?? null
  const box: FrameBox = frame
    ? { x: frame.x, y: frame.y, width: frame.width, height: frame.height }
    : { x: 0, y: 0, width: doc.width, height: doc.height }
  const { scale, x, y } = coverFit(box, result.canvas.width, result.canvas.height, 'contain')
  // Contain shows the whole picture; cover would crop on placement. Fill-into-frame uses cover.
  const layer: RasterLayer = {
    ...base(result.asset.title),
    type: 'raster',
    canvas: result.canvas,
    source: 'photo',
    scaleX: scale, scaleY: scale, x, y, rotation: 0,
    frameId: frame?.id ?? null,
    ...(opts.role ? { role: opts.role } : {}),
    asset: {
      id: result.asset.resourceId, parentId: null, title: result.asset.title, mime: result.asset.mime,
      sha256: result.asset.sha256, width: result.asset.width, height: result.asset.height, source: 'user_upload',
    },
  }
  syncRegistryState()
  // Re-read doc after registry sync so the layer commit keeps it.
  st.addLayer(layer, 'Place image')
  syncRegistryState()
  return useEditor.getState().activeId
}

/** Create an empty image frame placeholder at the given geometry. */
export function addEmptyFrame(box: FrameBox, fit: 'cover' | 'contain' = 'cover'): string | null {
  const st = useEditor.getState()
  if (!st.doc) return null
  const frame = st.doc.frames?.find(f => f.id === st.activeFrameId) ?? st.doc.frames?.[0] ?? null
  const layer: RasterLayer = {
    ...base('Image frame'),
    type: 'raster',
    canvas: emptyFrameCanvas(),
    scaleX: Math.max(1, Math.round(box.width)), scaleY: Math.max(1, Math.round(box.height)),
    x: Math.round(box.x), y: Math.round(box.y), rotation: 0,
    frameId: frame?.id ?? null,
    role: 'image',
    asset: null,
    emptyFrame: true,
    frameFit: fit,
  }
  st.addLayer(layer, 'Add image frame')
  return useEditor.getState().activeId
}

/** Fill an empty frame with an ingested asset. Single undo step. */
export function fillFrame(layerId: string, result: IngestResult, fit?: 'cover' | 'contain'): boolean {
  const st = useEditor.getState()
  const layer = st.layers.find(l => l.id === layerId) as RasterLayer | undefined
  if (!layer || layer.type !== 'raster' || !isEmptyFrame(layer)) { st.notify('Select an empty image frame to fill.'); return false }
  const patch = fillFramePatch(layer, result.asset, { canvas: result.canvas, width: result.fullW, height: result.fullH }, fit ?? layer.frameFit ?? 'cover')
  syncRegistryState()
  st.updateLayer(layerId, { ...patch, rev: nextRev() } as Partial<RasterLayer>, 'Place image into frame')
  syncRegistryState()
  return true
}

/**
 * Replace a raster layer's content, preserving transform/mask/crop/effects/
 * clip/frame geometry. Single undo step; lineage parent = previous asset.
 */
export async function replaceLayerContent(layerId: string, file: File | Blob, nameHint?: string): Promise<boolean> {
  const st = useEditor.getState()
  const found = st.layers.find(l => l.id === layerId)
  if (!found || found.type !== 'raster') { st.notify('Select an image layer to replace.'); return false }
  const layer = found as RasterLayer
  if (isEmptyFrame(layer)) {
    const r = await ingestFile(file, nameHint)
    return r ? fillFrame(layerId, r) : false
  }
  const pre = precheckFile(file as File)
  if (!pre.ok) { st.notify(pre.message); return false }
  let decoded
  try { decoded = await decodeImage(file as Blob) }
  catch (e) { st.notify((e as Error).message || 'That file is not an image we can open.'); return false }
  const sha = await sha256Of(file as Blob).catch(() => `local-${Date.now().toString(36)}`)
  const oldId = layer.asset?.id ?? null
  const layerName = (layer as RasterLayer).name
  const name = (nameHint ?? (file as File).name ?? layerName).replace(/\.[a-z0-9]+$/i, '').slice(0, 40) || layerName
  const asset = registerAsset({
    title: name, mime: pre.mime, width: decoded.width, height: decoded.height,
    sha256: sha, source: 'user_upload', parentId: oldId, recipeId: null,
    thumb: thumbnailOf(decoded.canvas),
  }, file as Blob)
  const patch = replaceContentPatch(layer, asset, { canvas: decoded.canvas })
  syncRegistryState()
  st.updateLayer(layerId, { ...patch, rev: nextRev() } as Partial<RasterLayer>, 'Replace image')
  syncRegistryState()
  return true
}

/** Re-register an asset from a Blob already in the store (tray re-place). */
export function assetFromId(resourceId: string): NativeAsset | undefined {
  return getAsset(resourceId)
}

export async function canvasForAsset(resourceId: string): Promise<HTMLCanvasElement | null> {
  const blob = getOriginal(resourceId)
  if (!blob) return null
  try {
    const d = await decodeImage(blob)
    return d.canvas
  } catch { return null }
}

/** Place a tray asset as a new layer (original bytes, not a re-encode). */
export async function placeTrayAsset(resourceId: string): Promise<string | null> {
  const asset = getAsset(resourceId)
  const canvas = await canvasForAsset(resourceId)
  if (!asset || !canvas) { useEditor.getState().notify('That asset is no longer available on this device.'); return null }
  return placeAssetAsLayer({ asset, canvas, fullW: asset.width, fullH: asset.height })
}

/** Fill selected empty frame from a tray asset. */
export async function fillFrameFromTray(layerId: string, resourceId: string, fit?: 'cover' | 'contain'): Promise<boolean> {
  const asset = getAsset(resourceId)
  const canvas = await canvasForAsset(resourceId)
  if (!asset || !canvas) { useEditor.getState().notify('That asset is no longer available on this device.'); return false }
  return fillFrame(layerId, { asset, canvas, fullW: asset.width, fullH: asset.height }, fit)
}

export type { NativeAsset }
export type { NativeAssetRef }
export { makeCanvas as _mk }
