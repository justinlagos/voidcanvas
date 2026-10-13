/**
 * C2 ingest-generated — register mock candidates as first-class C1 assets.
 * Reuses the C1 pipeline (asset-store + ingest helpers + ops placement):
 * - Original PNG bytes preserved by SHA-256 (deduped like uploads)
 * - source:'generated', parentId chains variation/derived lineage
 * - Registry synced into doc.assets so lineage survives save/reopen (.void v5/v6)
 * - Placement (place/fill/replace) goes through ops.ts: single history step,
 *   transforms/masks/crop/effects preserved, undo/redo free.
 */
import { decodeImage, sha256Of, thumbnailOf } from '../assets/ingest'
import { getAsset, listAssets, registerAsset, type NativeAsset } from '../assets/asset-store'
import { useEditor } from '../store'
import { fillFrame, placeAssetAsLayer, replaceLayerContent } from '../assets/ops'
import type { GeneratedCandidate } from './mock-provider'

export interface GeneratedMeta {
  prompt: string
  aspect: string
  /** Asset this candidate derives from (variation / replace lineage). */
  parentId?: string | null
  title?: string
}

function syncRegistryState(): void {
  const st = useEditor.getState()
  if (!st.doc) return
  const reg: Record<string, NativeAsset> = {}
  for (const a of listAssets()) reg[a.resourceId] = a
  const prev = (st.doc.assets ?? {}) as Record<string, NativeAsset>
  useEditor.setState({ doc: { ...st.doc, assets: { ...prev, ...reg } } })
}

function titleFor(meta: GeneratedMeta, index = 0): string {
  const base = (meta.title ?? meta.prompt).trim().replace(/\s+/g, ' ').slice(0, 40) || 'Generated image'
  return index > 0 ? `${base} (${index + 1})` : base
}

/**
 * Register one provider candidate as a native asset. Browser path: decodes
 * for true dimensions + thumbnail. Unit-test path: pass dims/thumb directly
 * (node has no DOM/canvas).
 */
export async function registerGeneratedCandidate(
  candidate: GeneratedCandidate,
  meta: GeneratedMeta,
  testHooks?: { width?: number; height?: number; thumb?: string; sha?: string },
): Promise<NativeAsset> {
  const sha = testHooks?.sha ?? await sha256Of(candidate.blob).catch(() => `local-${Date.now().toString(36)}`)
  let width = testHooks?.width ?? candidate.width
  let height = testHooks?.height ?? candidate.height
  let thumb = testHooks?.thumb ?? ''
  if (!testHooks?.thumb && typeof document !== 'undefined') {
    try {
      const decoded = await decodeImage(candidate.blob)
      width = decoded.width
      height = decoded.height
      thumb = thumbnailOf(decoded.canvas)
    } catch {
      // Keep provider-advertised dims; tray still lists the asset.
    }
  }
  const asset = registerAsset(
    {
      title: titleFor(meta),
      mime: 'image/png',
      width,
      height,
      sha256: sha,
      source: 'generated',
      parentId: meta.parentId ?? null,
      recipeId: null,
      thumb,
    },
    candidate.blob,
  )
  try {
    syncRegistryState()
  } catch {
    // Node/unit context: no live doc; registry memory still holds the asset.
  }
  return asset
}

/** Register a batch; index-suffixed titles keep the gallery distinguishable. */
export async function registerGeneratedBatch(
  candidates: GeneratedCandidate[],
  meta: GeneratedMeta,
  testHooks?: { thumbs?: string[] },
): Promise<NativeAsset[]> {
  const out: NativeAsset[] = []
  for (let i = 0; i < candidates.length; i++) {
    out.push(
      await registerGeneratedCandidate(candidates[i], { ...meta, title: titleFor(meta, i) }, testHooks?.thumbs ? { thumb: testHooks.thumbs[i] ?? '' } : undefined),
    )
  }
  return out
}

/** Place a registered generated asset as a new image layer (one undo step). */
export function placeGeneratedAsset(assetId: string): Promise<string | null> {
  return import('../assets/ops').then(async ({ canvasForAsset, placeAssetAsLayer: place }) => {
    const asset = getAsset(assetId)
    const canvas = await canvasForAsset(assetId)
    if (!asset || !canvas) {
      useEditor.getState().notify('That generated image is no longer available on this device.')
      return null
    }
    return place({ asset, canvas, fullW: asset.width, fullH: asset.height })
  })
}

/** Fill the selected (or given) empty frame with a generated asset. */
export function fillFrameWithGenerated(layerId: string, assetId: string): Promise<boolean> {
  return import('../assets/ops').then(async ({ canvasForAsset }) => {
    const asset = getAsset(assetId)
    const canvas = await canvasForAsset(assetId)
    if (!asset || !canvas) {
      useEditor.getState().notify('That generated image is no longer available on this device.')
      return false
    }
    return fillFrame(layerId, { asset, canvas, fullW: asset.width, fullH: asset.height })
  })
}

/** Replace a raster layer's content with a generated asset (transform-safe, lineage-chained). */
export async function replaceWithGenerated(layerId: string, assetId: string): Promise<boolean> {
  const { getOriginal } = await import('../assets/asset-store')
  const st = useEditor.getState()
  const layer = st.layers.find(l => l.id === layerId)
  const asset = getAsset(assetId)
  const blob = getOriginal(assetId)
  if (!layer || layer.type !== 'raster' || !asset || !blob) {
    st.notify('Select an image layer to replace.')
    return false
  }
  // Re-register under a derived entry whose parent is the layer's old asset,
  // so original → variation → replacement chains stay intact.
  const oldId = (layer as { asset?: { id?: string } }).asset?.id ?? null
  const { registerAsset: reg, getAsset: get } = await import('../assets/asset-store')
  void reg
  void get
  void placeAssetAsLayer
  void replaceLayerContent
  // If the candidate already derives from this layer (variation flow), reuse it;
  // otherwise chain it now by registering a derived alias sharing the same bytes.
  let effectiveId = assetId
  if (asset.parentId !== oldId && oldId) {
    const { sha256Of: sha } = await import('../assets/ingest')
    const shaVal = asset.sha256 ?? (await sha(blob).catch(() => asset.sha256))
    const derived = (await import('../assets/asset-store')).registerAsset(
      {
        title: asset.title,
        mime: asset.mime,
        width: asset.width,
        height: asset.height,
        sha256: shaVal,
        source: 'generated',
        parentId: oldId,
        recipeId: asset.resourceId,
        thumb: asset.thumb,
      },
      blob,
    )
    effectiveId = derived.resourceId
    try {
      syncRegistryState()
    } catch {
      /* node context */
    }
  }
  const finalBlob = (await import('../assets/asset-store')).getOriginal(effectiveId)
  if (!finalBlob) return false
  return replaceLayerContent(layerId, finalBlob, asset.title)
}
