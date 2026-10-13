/**
 * SEARCH-A search providers — authorised stock sources + local trial library.
 *
 * Real providers (Unsplash, Pexels, Pixabay) are interface-conformant but
 * DISABLED: no API keys are configured, so search() and download() refuse
 * before any network. Their rule summaries encode the researched terms
 * (attribution, download tracking, hotlink/cache rules, rate limits) so the
 * UI can state requirements honestly and the future keyed implementation
 * has a conformance checklist. Nothing here is scraped; only official APIs.
 *
 * The Sample library is ON: clearly labelled local trial images (generated
 * gradients, free to use) that exercise the full search → rights → import →
 * place pipeline without credentials. It never pretends to be stock.
 */
import type { RightsRecord } from './rights'

export interface SearchFilters {
  query: string
  orientation?: 'any' | 'landscape' | 'portrait' | 'square'
  color?: string | null
}

export interface SupportedFilters {
  orientation: boolean
  color: boolean
  /** Only these filters may be shown for the provider. */
  note: string
}

export interface SearchResult {
  id: string
  title: string
  thumbUrl: string | null
  /** Data URL for the fixture provider; null until downloaded for remote ones. */
  previewUrl: string | null
  width: number
  height: number
  rights: RightsRecord
}

export type ProviderAvailability = { available: true } | { available: false; reason: string }

export interface SearchProvider {
  readonly id: string
  readonly displayName: string
  readonly filters: SupportedFilters
  /** Integration rules the UI and importer must honour. */
  readonly rules: readonly string[]
  availability(): ProviderAvailability
  search(filters: SearchFilters, opts?: { signal?: AbortSignal }): Promise<SearchResult[]>
  /** Resolve the authorised download bytes for a result id. */
  download(id: string, opts?: { signal?: AbortSignal }): Promise<Blob>
}

export class SearchDisabledError extends Error {
  constructor(
    readonly providerId: string,
    readonly reason: string,
  ) {
    super(`${providerId} is disabled: ${reason}`)
    this.name = 'SearchDisabledError'
  }
}

const NO_KEY = 'No API key is configured and this source has not been approved. Nothing was requested.'

function disabledProvider(
  id: string,
  displayName: string,
  filters: SupportedFilters,
  rules: readonly string[],
): SearchProvider {
  const refuse = (): never => {
    throw new SearchDisabledError(id, NO_KEY)
  }
  return {
    id,
    displayName,
    filters,
    rules,
    availability: () => ({ available: false, reason: NO_KEY }),
    search: async () => refuse(),
    download: async () => refuse(),
  }
}

/**
 * Unsplash API. Researched terms: commercial use broadly permitted under the
 * Unsplash Licence, but API use REQUIRES attribution (photographer +
 * Unsplash, with profile link), hotlinking via returned URLs, calling
 * download_location on use, 50 req/h demo / 1,000 req/h production,
 * key proxied server-side.
 */
export function createUnsplashAdapter(): SearchProvider {
  return disabledProvider('unsplash', 'Unsplash', { orientation: true, color: true, note: 'Orientation and colour filters are supported by the API.' }, [
    'Credit the photographer and Unsplash with a profile link on every use.',
    'Use the image URLs returned by the API (hotlink); do not re-host silently.',
    'Call the download_location endpoint when a photo is used.',
    '50 requests/hour demo, 1,000/hour after production approval.',
    'Keep the access key server-side; proxy client searches.',
  ])
}

/**
 * Pexels API. General licence presented as commercial-use without
 * attribution; indexed API terms: free, ~200 req/h and 20,000/month default,
 * higher limits subject to review. Hotlink/download rules could NOT be
 * verified (docs blocked in research) — confirm before enabling.
 */
export function createPexelsAdapter(): SearchProvider {
  return disabledProvider('pexels', 'Pexels', { orientation: true, color: true, note: 'Orientation and colour filters are supported by the API.' }, [
    'Confirm the current API hotlink, caching and download rules in the official docs before enabling (unverified in research).',
    'Default limits are approximately 200 requests/hour and 20,000/month.',
    'Licence presented as commercial-use without attribution; re-verify at integration time.',
  ])
}

/**
 * Pixabay API. Content Licence; show content provenance in results.
 * Default 100 requests/60s per key; cache responses 24h; no permanent
 * hotlinking — download used images; no systematic mass downloads.
 */
export function createPixabayAdapter(): SearchProvider {
  return disabledProvider('pixabay', 'Pixabay', { orientation: true, color: false, note: 'The API supports orientation and category filters; colour is not offered here.' }, [
    'Show where each result comes from in the search UI.',
    'Cache API responses for 24 hours; do not mass-download.',
    'Download used images instead of permanently hotlinking.',
    'Standalone sale/redistribution prohibited — re-verify the licence summary before enabling.',
  ])
}

export const REAL_SEARCH_ADAPTERS = [createUnsplashAdapter, createPexelsAdapter, createPixabayAdapter]

/** Deterministic local trial images (gradient scenes). Renderer injected for tests. */
export async function renderSamplePng(seed: number, w: number, h: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const hue = (seed * 47) % 360
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, `hsl(${hue},45%,62%)`)
  g.addColorStop(1, `hsl(${(hue + 60) % 360},40%,38%)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath()
  ctx.arc(w * (0.3 + (seed % 5) * 0.1), h * 0.35, Math.min(w, h) * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.font = `bold ${Math.round(h / 12)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText('SAMPLE — NOT STOCK', w / 2, h * 0.82)
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'),
  )
}

export interface SampleEntry {
  seed: number
  width: number
  height: number
  orientation: 'landscape' | 'portrait' | 'square'
  color: string
}

export const SAMPLE_LIBRARY: SampleEntry[] = [
  { seed: 3, width: 1200, height: 800, orientation: 'landscape', color: 'blue' },
  { seed: 7, width: 800, height: 1200, orientation: 'portrait', color: 'amber' },
  { seed: 11, width: 1000, height: 1000, orientation: 'square', color: 'green' },
  { seed: 15, width: 1200, height: 800, orientation: 'landscape', color: 'rose' },
  { seed: 21, width: 800, height: 1200, orientation: 'portrait', color: 'slate' },
  { seed: 29, width: 1000, height: 1000, orientation: 'square', color: 'orange' },
]

function rightsForSample(seed: number): RightsRecord {
  return {
    provider: 'sample-library',
    providerDisplayName: 'Sample library',
    creator: null,
    creatorUrl: null,
    sourceUrl: null,
    licence: 'VoidCanvas sample — free to use',
    licenceUrl: null,
    commercialUse: 'verified',
    attributionRequired: false,
    creditText: null,
    restrictions: 'Trial image generated on this device, not a stock photograph.',
    retrievedAt: Date.now(),
    sourceId: 'sample-' + seed,
  }
}

/** Local trial provider: honest samples for pipeline trials without credentials. */
export function createSampleLibraryProvider(
  renderer: (seed: number, w: number, h: number) => Promise<Blob> = renderSamplePng,
): SearchProvider {
  const cache = new Map<number, Blob>()
  return {
    id: 'sample-library',
    displayName: 'Sample library (local trial images)',
    filters: { orientation: true, color: false, note: 'Trial library supports orientation filtering.' },
    rules: [
      'Locally generated trial images — free to use, not stock photography.',
      'Exercises the full search, rights, import and placement pipeline.',
    ],
    availability: () => ({ available: true }),
    search: async filters => {
      const q = filters.query.trim().toLowerCase()
      return SAMPLE_LIBRARY.filter(
        e =>
          (filters.orientation === 'any' || !filters.orientation || e.orientation === filters.orientation) &&
          (!q || e.color.includes(q) || e.orientation.includes(q) || 'sample'.includes(q)),
      ).map(e => ({
        id: 'sample-' + e.seed,
        title: `Sample ${e.orientation} ${e.color}`,
        thumbUrl: null,
        previewUrl: null,
        width: e.width,
        height: e.height,
        rights: rightsForSample(e.seed),
      }))
    },
    download: async id => {
      const entry = SAMPLE_LIBRARY.find(e => 'sample-' + e.seed === id)
      if (!entry) throw new Error('Unknown sample: ' + id)
      const hit = cache.get(entry.seed)
      if (hit) return hit
      const blob = await renderer(entry.seed, entry.width, entry.height)
      cache.set(entry.seed, blob)
      return blob
    },
  }
}
