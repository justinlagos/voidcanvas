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

/**
 * Deterministic local trial images: simple gradient scenes with a motif
 * silhouette, always watermarked SAMPLE — NOT STOCK. Placeholders for
 * layout trials, never presented as photography. Renderer injected for tests.
 */
export async function renderSamplePng(seed: number, w: number, h: number, motif: SampleMotif = 'dunes'): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const hue = (seed * 47) % 360
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, `hsl(${hue},45%,60%)`)
  g.addColorStop(0.65, `hsl(${(hue + 40) % 360},42%,46%)`)
  g.addColorStop(1, `hsl(${(hue + 70) % 360},38%,30%)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const u = Math.min(w, h)
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  if (motif === 'rocket') {
    // Nose cone, body, fins, exhaust glow over a dark pad.
    ctx.fillStyle = 'rgba(255,244,220,0.9)'
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.2, u * 0.09, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(20,22,30,0.92)'
    ctx.beginPath()
    ctx.moveTo(w * 0.5, h * 0.18); ctx.lineTo(w * 0.56, h * 0.42); ctx.lineTo(w * 0.44, h * 0.42); ctx.closePath(); ctx.fill()
    ctx.fillRect(w * 0.46, h * 0.42, w * 0.08, h * 0.1)
    ctx.beginPath()
    ctx.moveTo(w * 0.46, h * 0.52); ctx.lineTo(w * 0.4, h * 0.62); ctx.lineTo(w * 0.46, h * 0.58); ctx.closePath(); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(w * 0.54, h * 0.52); ctx.lineTo(w * 0.6, h * 0.62); ctx.lineTo(w * 0.54, h * 0.58); ctx.closePath(); ctx.fill()
    const fg = ctx.createRadialGradient(w * 0.5, h * 0.66, 4, w * 0.5, h * 0.66, u * 0.22)
    fg.addColorStop(0, 'rgba(255,220,150,0.95)'); fg.addColorStop(1, 'rgba(255,150,80,0)')
    ctx.fillStyle = fg
    ctx.fillRect(0, h * 0.44, w, h * 0.44)
    ctx.fillStyle = 'rgba(10,10,14,0.95)'
    ctx.fillRect(0, h * 0.88, w, h * 0.12)
  } else if (motif === 'mountains') {
    ctx.fillStyle = 'rgba(255,246,220,0.9)'
    ctx.beginPath(); ctx.arc(w * 0.72, h * 0.26, u * 0.08, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(24,30,44,0.9)'
    ctx.beginPath()
    ctx.moveTo(0, h * 0.72); ctx.lineTo(w * 0.24, h * 0.34); ctx.lineTo(w * 0.42, h * 0.62); ctx.lineTo(w * 0.62, h * 0.4); ctx.lineTo(w * 0.84, h * 0.68); ctx.lineTo(w, h * 0.55); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill()
  } else if (motif === 'portrait') {
    ctx.fillStyle = 'rgba(20,20,26,0.85)'
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.38, u * 0.14, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.86, u * 0.24, Math.PI, 0); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(2, u * 0.008)
    ctx.strokeRect(w * 0.14, h * 0.1, w * 0.72, h * 0.8)
  } else if (motif === 'waves') {
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    for (let i = 0; i < 4; i++) {
      const y = h * (0.5 + i * 0.13)
      ctx.beginPath()
      ctx.moveTo(0, y)
      for (let x = 0; x <= w; x += w / 24) ctx.lineTo(x, y + Math.sin(x / w * Math.PI * 4 + i * 1.7) * h * 0.03)
      ctx.lineTo(w, y + h * 0.09); ctx.lineTo(0, y + h * 0.09); ctx.closePath(); ctx.fill()
    }
  } else if (motif === 'forest') {
    ctx.fillStyle = 'rgba(255,250,220,0.55)'
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.16, u * 0.1, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(14,34,22,0.9)'
    for (let i = 0; i < 5; i++) {
      const x = w * (0.12 + i * 0.19), th = h * (0.34 + ((seed + i * 3) % 5) * 0.05)
      ctx.beginPath()
      ctx.moveTo(x, h * 0.3); ctx.lineTo(x + w * 0.07, h * 0.3 + th); ctx.lineTo(x - w * 0.07, h * 0.3 + th); ctx.closePath(); ctx.fill()
      ctx.fillRect(x - w * 0.012, h * 0.3 + th, w * 0.024, h * 0.12)
    }
    ctx.fillRect(0, h * 0.86, w, h * 0.14)
  } else {
    ctx.fillStyle = 'rgba(255,250,230,0.9)'
    ctx.beginPath(); ctx.arc(w * 0.68, h * 0.24, u * 0.1, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.beginPath()
    ctx.moveTo(0, h * 0.7)
    for (let x = 0; x <= w; x += w / 16) ctx.lineTo(x, h * 0.7 - Math.sin(x / w * Math.PI * 2 + seed) * h * 0.08)
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill()
  }
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.font = `bold ${Math.round(h / 12)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText('SAMPLE — NOT STOCK', w / 2, h * 0.9)
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'),
  )
}

export type SampleMotif = 'rocket' | 'mountains' | 'portrait' | 'waves' | 'forest' | 'dunes'

export interface SampleEntry {
  seed: number
  title: string
  keywords: string
  width: number
  height: number
  orientation: 'landscape' | 'portrait' | 'square'
  color: string
  motif: SampleMotif
}

/**
 * Procedural trial scenes (keyword-searchable, poster-useful compositions).
 * Every render is watermarked SAMPLE — NOT STOCK and carries sample rights:
 * generated on this device, free to use, never presented as photography.
 */
export const SAMPLE_LIBRARY: SampleEntry[] = [
  { seed: 3, title: 'Rocket launch at dusk', keywords: 'rocket launch space fire sky poster', width: 1080, height: 1350, orientation: 'portrait', color: 'ember', motif: 'rocket' },
  { seed: 7, title: 'Mountain dusk', keywords: 'mountain dusk landscape sky peaks', width: 1200, height: 800, orientation: 'landscape', color: 'blue', motif: 'mountains' },
  { seed: 11, title: 'Studio portrait backdrop', keywords: 'portrait studio backdrop person headshot', width: 1000, height: 1000, orientation: 'square', color: 'amber', motif: 'portrait' },
  { seed: 15, title: 'Ocean waves', keywords: 'ocean waves water sea surf', width: 1200, height: 800, orientation: 'landscape', color: 'slate', motif: 'waves' },
  { seed: 21, title: 'Forest light', keywords: 'forest trees light woods nature', width: 800, height: 1200, orientation: 'portrait', color: 'green', motif: 'forest' },
  { seed: 29, title: 'Desert noon', keywords: 'desert dunes sun sand heat', width: 1000, height: 1000, orientation: 'square', color: 'orange', motif: 'dunes' },
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
  renderer: (seed: number, w: number, h: number, motif: SampleMotif) => Promise<Blob> = renderSamplePng,
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
      return SAMPLE_LIBRARY.filter(e => {
        if (filters.orientation && filters.orientation !== 'any' && e.orientation !== filters.orientation) return false
        if (!q) return true
        const hay = `${e.title} ${e.keywords} ${e.color} ${e.orientation} sample`.toLowerCase()
        return q.split(/\s+/).every(word => hay.includes(word))
      }).map(e => ({
        id: 'sample-' + e.seed,
        title: e.title,
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
      const blob = await renderer(entry.seed, entry.width, entry.height, entry.motif)
      cache.set(entry.seed, blob)
      return blob
    },
  }
}
