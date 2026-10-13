// B07: local-only asset tray with original/derived lineage. No network, no cloud.
// Tray owns asset bytes metadata; placement returns ordinary Layer patches for
// the ONE store to commit. Prompt storage is opt-in and never logged.
export type AssetSource = 'user_upload' | 'local_library' | 'brand_library' | 'external_search' | 'generated' | 'derived'

export interface LocalAsset {
  resourceId: string
  sha256: string
  source: AssetSource
  title: string
  width: number
  height: number
  mime: string
  parentId: string | null
  recipeId: string | null
  accepted: boolean
  mock: true
}

export interface AssetRecipe {
  recipeId: string
  prompt: string
  provider: 'mock-test-provider'
  params: Record<string, number | string>
  storePrompt: boolean
}

let seq = 0
const rid = (p: string) => p + '-test-' + (++seq) + '-' + Date.now().toString(36)

export function fakeSha(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h.toString(16).padStart(8, '0').repeat(8).slice(0, 64)
}

export function ingestUpload(title: string, width: number, height: number, mime = 'image/png'): LocalAsset {
  const resourceId = rid('upload')
  return { resourceId, sha256: fakeSha(resourceId), source: 'user_upload', title, width, height, mime, parentId: null, recipeId: null, accepted: true, mock: true }
}

export function deriveAsset(parent: LocalAsset, op: string, recipe: AssetRecipe | null): LocalAsset {
  const resourceId = rid('derived')
  return {
    resourceId, sha256: fakeSha(resourceId + op), source: parent.source === 'generated' ? 'derived' : parent.source,
    title: parent.title + ' (' + op + ')', width: parent.width, height: parent.height, mime: parent.mime,
    parentId: parent.resourceId, recipeId: recipe ? recipe.recipeId : null, accepted: false, mock: true,
  }
}

export function acceptAsset(a: LocalAsset): LocalAsset { return { ...a, accepted: true } }
export function rejectAsset(a: LocalAsset): LocalAsset { return { ...a, accepted: false } }

// Lineage: walk parents to the original. Originals are never overwritten.
export function lineageOf(all: LocalAsset[], leafId: string): LocalAsset[] {
  const byId = new Map(all.map(a => [a.resourceId, a]))
  const out: LocalAsset[] = []
  let cur = byId.get(leafId) ?? null
  while (cur) { out.unshift(cur); cur = cur.parentId ? byId.get(cur.parentId) ?? null : null }
  return out
}

export function placementPatch(asset: LocalAsset, frame: { x: number; y: number; width: number; height: number }, keepTransformOf?: { x: number; y: number } | null): { name: string; x: number; y: number; assetRef: string } {
  return { name: asset.title, x: keepTransformOf ? keepTransformOf.x : frame.x, y: keepTransformOf ? keepTransformOf.y : frame.y, assetRef: asset.resourceId }
}
