/**
 * SEARCH-A safe import — external bytes enter ONLY through the validated C1
 * pipeline. Never pipes a remote URL into the renderer: bytes are fetched
 * once via the provider's authorised download path, then:
 * MIME whitelist + size (precheckFile), dimension/decompression guards,
 * EXIF-aware decode, SHA-256 original preservation, thumbnail, registry
 * sync with the rights record attached. Timeouts and quota errors surface
 * as messages, never partial assets.
 */
import { decodeImage, precheckFile, sha256Of, thumbnailOf } from '../ingest'
import { listAssets, registerAsset, type NativeAsset } from '../asset-store'
import { useEditor } from '../../store'
import type { RightsRecord } from './rights'
import type { SearchProvider, SearchResult } from './providers'

export const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024
export const DOWNLOAD_TIMEOUT_MS = 30000

export interface DecodedLike {
  canvas: HTMLCanvasElement
  width: number
  height: number
}

export interface ImportDeps {
  decode?: (blob: Blob) => Promise<DecodedLike>
  sha?: (blob: Blob) => Promise<string>
}

export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s.`)), ms)
  })
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer))
}

function syncRegistryState(): void {
  const st = useEditor.getState()
  if (!st.doc) return
  const reg: Record<string, NativeAsset> = {}
  for (const a of listAssets()) reg[a.resourceId] = a
  const prev = (st.doc.assets ?? {}) as Record<string, NativeAsset>
  try {
    useEditor.setState({ doc: { ...st.doc, assets: { ...prev, ...reg } } })
  } catch {
    /* node/unit context */
  }
}

/**
 * Import one provider result: download → validate → register with rights.
 * Returns the asset; placement (place/fill/replace) stays explicit via C1 ops.
 */
export async function importSearchResult(
  provider: SearchProvider,
  result: SearchResult,
  rights: RightsRecord,
  deps: ImportDeps = {},
): Promise<NativeAsset> {
  const avail = provider.availability()
  if (!avail.available) throw new Error(avail.reason)
  const blob = await withTimeout(provider.download(result.id), DOWNLOAD_TIMEOUT_MS, 'Download')
  if (!(blob instanceof Blob)) throw new Error('The provider returned an unusable download.')
  if (blob.size > MAX_DOWNLOAD_BYTES) throw new Error(`That file is ${(blob.size / 1048576).toFixed(1)} MB. The limit is 50 MB.`)
  const pre = precheckFile({ type: blob.type, size: blob.size } as File)
  if (!pre.ok) throw new Error(pre.message)
  const decode = deps.decode ?? decodeImage
  let decoded: DecodedLike
  try {
    decoded = await withTimeout(decode(blob), DOWNLOAD_TIMEOUT_MS, 'Image decode')
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'That file is not an image we can open.')
  }
  const sha = deps.sha ?? sha256Of
  const digest = await sha(blob).catch(() => `external-${Date.now().toString(36)}`)
  const thumb = (() => {
    try {
      return thumbnailOf(decoded.canvas)
    } catch {
      return ''
    }
  })()
  const asset = registerAsset(
    {
      title: result.title.slice(0, 40) || 'Stock image',
      mime: pre.mime,
      width: decoded.width,
      height: decoded.height,
      sha256: digest,
      source: 'external_search',
      parentId: null,
      recipeId: result.id,
      rights,
      thumb,
    },
    blob,
  )
  syncRegistryState()
  return asset
}
