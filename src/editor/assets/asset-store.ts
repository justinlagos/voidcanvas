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
  /** SEARCH-A: provenance/licensing for external assets. Additive + optional: old readers ignore it, .void round-trips it as plain JSON. */
  rights?: import('./search/rights').RightsRecord | null
  createdAt: number
  thumb: string // data URL preview; regenerable, never the source
}

export interface AssetRegistry extends Record<string, NativeAsset> {}

// In-memory originals, keyed by SHA-256 so identical bytes are stored once no
// matter how many registry entries (uploads, replacements) reference them.
// Persisted into .void as `asset:<sha256>` blobs (see io.ts); rehydrated on
// open. Memory-only otherwise: nothing uploads.
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
  originals.set(asset.sha256, original)
  return asset
}

export function getAsset(id: string): NativeAsset | undefined {
  return registry.get(id)
}

export function getOriginal(id: string): Blob | undefined {
  const a = registry.get(id)
  return a ? originals.get(a.sha256) : undefined
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
  // Drop originals no registry entry references (e.g. replaced-away uploads
  // from older saves) so reopened projects stay lean.
  const live = new Set(all.map(a => a.sha256))
  for (const sha of Array.from(originals.keys())) if (!live.has(sha)) originals.delete(sha)
}

export function snapshotRegistry(): NativeAsset[] {
  return listAssets()
}

export function originalBlobs(): Record<string, Blob> {
  const out: Record<string, Blob> = {}
  for (const [sha, b] of Array.from(originals.entries())) out[`asset:${sha}`] = b
  return out
}

export function clearAssetStore(): void {
  registry.clear()
  originals.clear()
}

/**
 * Scope the module registry to one document (tab switches, opens, new docs).
 * Keeps entries the document references (registry + layer refs + their ancestor
 * chains) and drops everything else, so one design's tray never leaks into
 * another and saves never carry foreign originals.
 */
export function scopeRegistryToDoc(
  doc: { assets?: Record<string, { resourceId: string }> | null } | null | undefined,
  layers: readonly unknown[] | null | undefined,
): void {
  const keep = new Set<string>()
  for (const id of Object.keys(doc?.assets ?? {})) keep.add(id)
  for (const l of layers ?? []) {
    const id = (l as { asset?: { id?: unknown } | null } | null)?.asset?.id
    if (typeof id === 'string') keep.add(id)
  }
  const queue = Array.from(keep)
  while (queue.length) {
    const a = registry.get(queue.pop() as string)
    if (a?.parentId && !keep.has(a.parentId)) { keep.add(a.parentId); queue.push(a.parentId) }
  }
  for (const id of Array.from(registry.keys())) if (!keep.has(id)) registry.delete(id)
  const live = new Set(Array.from(registry.values()).map(a => a.sha256))
  for (const sha of Array.from(originals.keys())) if (!live.has(sha)) originals.delete(sha)
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
