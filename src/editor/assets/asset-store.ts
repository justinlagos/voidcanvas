// C1 asset registry: original-preserving, lineage-tracking, local-first.
//
// Design (no duplicate stores):
// - The editor document + history + canvas layers stay the single source of
//   truth for what is ON the canvas (existing useEditor store).
// - This module owns only what the canvas cannot: original upload bytes
//   (Blob per asset, never re-encoded) + the asset registry + parent lineage.
// - Placement helpers return ordinary Layer patches; callers commit them with
//   the ONE history system (updateLayer/addLayer + commit). No parallel undo.
// - Reuses B07 pure helpers (lineageOf, placementPatch) so the tested lineage
//   semantics stay identical between mock and native flows.

import { lineageOf as b07Lineage, placementPatch as b07Placement, type LocalAsset } from '../unified/asset-tray'

export type NativeSource = 'user_upload' | 'local_library' | 'brand_library' | 'external_search' | 'generated' | 'derived'

export interface NativeAsset {
  resourceId: string
  /** Alias of resourceId for Doc.assets record compatibility. */
  id: string
  title: string
  mime: string
  width: number // decoded full-resolution dimensions
  height: number
  sha256: string
  source: NativeSource
  parentId: string | null
  recipeId: string | null
  createdAt: number
  thumb: string // data URL preview; regenerable, never the source
}

export interface AssetRegistry extends Record<string, NativeAsset> {}

// In-memory originals. Persisted into .void as `asset:<resourceId>` blobs
// (see io.ts); rehydrated on open. Memory-only otherwise: nothing uploads.
const originals = new Map<string, Blob>()
const registry = new Map<string, NativeAsset>()

let seq = 0
export function newResourceId(prefix = 'asset'): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function registerAsset(meta: Omit<NativeAsset, 'resourceId' | 'id' | 'createdAt'> & { resourceId?: string }, original: Blob): NativeAsset {
  const resourceId = meta.resourceId ?? newResourceId('asset')
  const asset: NativeAsset = { ...meta, resourceId, id: resourceId, createdAt: Date.now() }
  registry.set(resourceId, asset)
  originals.set(resourceId, original)
  return asset
}

export function getAsset(id: string): NativeAsset | undefined {
  return registry.get(id)
}

export function getOriginal(id: string): Blob | undefined {
  return originals.get(id)
}

export function listAssets(): NativeAsset[] {
  return Array.from(registry.values()).sort((a, b) => b.createdAt - a.createdAt)
}

export function rememberRegistry(all: NativeAsset[], blobs: Record<string, Blob>): void {
  registry.clear()
  for (const a of all) registry.set(a.resourceId, a)
  for (const [k, b] of Object.entries(blobs ?? {}) as [string, Blob][]) {
    if (k.startsWith('asset:')) originals.set(k.slice(6), b)
  }
}

export function snapshotRegistry(): NativeAsset[] {
  return listAssets()
}

export function originalBlobs(): Record<string, Blob> {
  const out: Record<string, Blob> = {}
  for (const [id, b] of Array.from(originals.entries())) out[`asset:${id}`] = b
  return out
}

export function clearAssetStore(): void {
  registry.clear()
  originals.clear()
}

/** B07-compatible view of a native asset (lineage semantics shared). */
export function toLocalAsset(a: NativeAsset): LocalAsset {
  return {
    resourceId: a.resourceId, sha256: a.sha256, source: a.source, title: a.title,
    width: a.width, height: a.height, mime: a.mime, parentId: a.parentId,
    recipeId: a.recipeId, accepted: true, mock: true,
  }
}

/** Walk parents to the original using B07 semantics. */
export function nativeLineage(all: NativeAsset[], leafId: string): NativeAsset[] {
  const local = all.map(toLocalAsset)
  const ids = new Set(b07Lineage(local, leafId).map(a => a.resourceId))
  const order = new Map(all.map((a, i) => [a.resourceId, i]))
  void order
  const chain = b07Lineage(local, leafId).map(l => all.find(a => a.resourceId === l.resourceId)!).filter(Boolean)
  void ids
  return chain
}

/** Placement patch reusing B07 transform-preserving semantics. */
export function nativePlacementPatch(
  asset: NativeAsset,
  frame: { x: number; y: number; width: number; height: number },
  keepTransformOf?: { x: number; y: number } | null,
): { name: string; x: number; y: number; assetRef: string } {
  return b07Placement(toLocalAsset(asset), frame, keepTransformOf)
}
