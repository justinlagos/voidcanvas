'use client'

/**
 * SEARCH-A search panel — find images with honest licensing, import through
 * the validated C1 pipeline. The Sample library (local trial images) works
 * without credentials; Unsplash/Pexels/Pixabay adapters are shown disabled
 * with their actual requirements until API keys are approved and configured.
 * Only filters each provider supports are rendered.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { useEditor } from '../../store'
import { fillFrameFromTray, placeTrayAsset } from '../ops'
import { getAsset } from '../asset-store'
import { isEmptyFrame } from '../place'
import { Modal, focusRing } from '../../components/ui'
import { commercialWarning, rightsBadge } from './rights'
import {
  createPexelsAdapter,
  createPixabayAdapter,
  createSampleLibraryProvider,
  createUnsplashAdapter,
  type SearchProvider,
  type SearchResult,
} from './providers'
import { importSearchResult } from './import'

const PROVIDERS: SearchProvider[] = [
  createSampleLibraryProvider(),
  createUnsplashAdapter(),
  createPexelsAdapter(),
  createPixabayAdapter(),
]

export function SearchPanel({ onClose }: { onClose: () => void }) {
  const [providerId, setProviderId] = useState('sample-library')
  const [query, setQuery] = useState('')
  const [orientation, setOrientation] = useState<'any' | 'landscape' | 'portrait' | 'square'>('any')
  const [results, setResults] = useState<SearchResult[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'searching' | 'ready' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)

  const provider = useMemo(() => PROVIDERS.find(p => p.id === providerId) ?? PROVIDERS[0], [providerId])
  const avail = provider.availability()
  const activeId = useEditor(s => s.activeId)
  const layers = useEditor(s => s.layers)
  const active = useMemo(() => layers.find(l => l.id === activeId) ?? null, [layers, activeId])
  const canFill = !!activeId && isEmptyFrame(active)
  const canReplace = !!activeId && !!active && active.type === 'raster' && !isEmptyFrame(active)

  useEffect(() => () => abort.current?.abort(), [])

  const search = useCallback(async () => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setStatus('searching')
    setError(null)
    setResults([])
    try {
      const found = await provider.search({ query, orientation }, { signal: ctrl.signal })
      if (ctrl.signal.aborted) return
      setResults(found)
      setStatus('ready')
      // Thumbnails: fixture data URLs in-browser; remote thumbs only as <img src> (never fetched by us here).
      if (provider.id === 'sample-library') {
        const entries: Record<string, string> = {}
        for (const r of found) {
          if (ctrl.signal.aborted) return
          const blob = await provider.download(r.id, { signal: ctrl.signal })
          entries[r.id] = URL.createObjectURL(blob)
        }
        if (!ctrl.signal.aborted) setThumbs(entries)
      }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError' || ctrl.signal.aborted) {
        setStatus('idle')
        return
      }
      setStatus('failed')
      setError(e instanceof Error ? e.message : 'Search failed.')
    }
  }, [provider, query, orientation])

  const take = useCallback(
    async (result: SearchResult, action: 'place' | 'fill' | 'replace') => {
      if (!avail.available) return
      setBusyId(`${action}:${result.id}`)
      setError(null)
      try {
        const asset = await importSearchResult(provider, result, result.rights)
        if (action === 'place') await placeTrayAsset(asset.resourceId)
        else if (action === 'fill' && activeId) await fillFrameFromTray(activeId, asset.resourceId)
        else if (action === 'replace' && activeId) {
          const { replaceLayerContent } = await import('../ops')
          const { getAsset, getOriginal } = await import('../asset-store')
          const blob = getOriginal(asset.resourceId)
          if (blob && (await replaceLayerContent(activeId, blob, asset.title))) {
            // replaceLayerContent registers the layer's new asset without
            // provenance: carry the search rights onto it so the licence
            // survives on the placed layer (same object lives in doc.assets).
            const layer = useEditor.getState().layers.find(l => l.id === activeId)
            const rec = layer?.type === 'raster' && layer.asset ? getAsset(layer.asset.id) : undefined
            if (rec) {
              rec.rights = asset.rights
              rec.recipeId = asset.recipeId
              rec.source = 'external_search'
            }
          }
        }
        useEditor.getState().notify(`“${asset.title}” imported with its licence record. Place details stay in the asset.`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Import failed.')
      } finally {
        setBusyId(null)
      }
    },
    [provider, avail, activeId],
  )

  const detail = results.find(r => r.id === detailId) ?? null

  return (
    <Modal title="Search images" onClose={onClose} track="search" wide>
      <div className="p-5 space-y-4 max-w-2xl" data-testid="search-panel" aria-label="Search images">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label htmlFor="search-provider" className="block text-[12.5px] font-medium mb-1">Source</label>
            <select
              id="search-provider"
              value={providerId}
              onChange={e => {
                setProviderId(e.target.value)
                setResults([])
                setStatus('idle')
                setError(null)
              }}
              className={`h-9 rounded-lg bg-void-900 border border-void-800 px-2 text-[13px] ${focusRing}`}
            >
              {PROVIDERS.map(p => {
                const a = p.availability()
                return (
                  <option key={p.id} value={p.id}>
                    {p.displayName}{a.available ? '' : ' (not configured)'}
                  </option>
                )
              })}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="search-query" className="block text-[12.5px] font-medium mb-1">Keywords</label>
            <input
              id="search-query"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && avail.available) {
                  e.preventDefault()
                  void search()
                }
              }}
              placeholder="Mountains, studio portrait…"
              disabled={!avail.available}
              className={`h-9 w-full rounded-lg bg-void-900 border border-void-800 px-3 text-[13px] placeholder:text-void-600 disabled:opacity-40 ${focusRing}`}
            />
          </div>
          {provider.filters.orientation && (
            <div>
              <label htmlFor="search-orientation" className="block text-[12.5px] font-medium mb-1">Orientation</label>
              <select
                id="search-orientation"
                value={orientation}
                onChange={e => setOrientation(e.target.value as typeof orientation)}
                disabled={!avail.available}
                className={`h-9 rounded-lg bg-void-900 border border-void-800 px-2 text-[13px] disabled:opacity-40 ${focusRing}`}
              >
                <option value="any">Any</option>
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
                <option value="square">Square</option>
              </select>
            </div>
          )}
          <button
            onClick={() => void search()}
            disabled={!avail.available || status === 'searching'}
            className={`h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-accent text-white text-[13px] font-medium hover:brightness-110 disabled:opacity-40 ${focusRing}`}
          >
            {status === 'searching' ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Search
          </button>
        </div>
        {!avail.available && (
          <p role="note" className="text-[12.5px] text-void-400 rounded-lg border border-white/[0.07] px-3 py-2">
            {avail.reason}
            <span className="block mt-1 text-void-500">{provider.rules.join(' ')}</span>
          </p>
        )}
        {status === 'searching' && <p role="status" className="text-[12.5px] text-void-400">Searching…</p>}
        {error && <p role="alert" className="text-[12.5px] text-red-300">{error}</p>}
        {status === 'ready' && results.length === 0 && <p role="status" className="text-[12.5px] text-void-500">No images match. Try different keywords.</p>}
        {results.length > 0 && (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {results.map(r => {
              const badge = rightsBadge(r.rights)
              const thumb = thumbs[r.id]
              return (
                <li key={r.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-2" data-result={r.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {thumb ? (
                    <img src={thumb} alt={r.title} className="w-full aspect-[4/3] object-cover rounded-lg" />
                  ) : (
                    <span className="block w-full aspect-[4/3] rounded-lg bg-void-800 flex items-center justify-center text-[11px] text-void-500 px-2 text-center" aria-hidden>
                      {r.width}×{r.height}
                    </span>
                  )}
                  <span className="block mt-1.5 text-[12.5px] font-medium truncate" title={r.title}>{r.title}</span>
                  <span
                    className={`block text-[11px] ${badge.tone === 'ok' ? 'text-emerald-300' : badge.tone === 'warn' ? 'text-amber-300' : 'text-red-300'}`}
                    title={commercialWarning(r.rights) ?? undefined}
                  >
                    {badge.label}
                  </span>
                  <div className="mt-1.5 grid grid-cols-2 gap-1">
                    <button
                      onClick={() => void take(r, 'place')}
                      disabled={!!busyId}
                      aria-label={`Import and place ${r.title}`}
                      className={`h-7 rounded-md text-[11.5px] bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 ${focusRing}`}
                    >
                      {busyId?.endsWith(r.id) ? 'Importing…' : 'Place'}
                    </button>
                    <button
                      onClick={() => setDetailId(detailId === r.id ? null : r.id)}
                      aria-label={`Licence details for ${r.title}`}
                      aria-expanded={detailId === r.id}
                      className={`h-7 rounded-md text-[11.5px] bg-white/[0.06] hover:bg-white/[0.1] ${focusRing}`}
                    >
                      Licence
                    </button>
                    <button
                      onClick={() => void take(r, 'fill')}
                      disabled={!canFill || !!busyId}
                      aria-label={`Import and fill selected frame with ${r.title}`}
                      title={canFill ? 'Fill the selected image frame' : 'Select an empty image frame first'}
                      className={`h-7 rounded-md text-[11.5px] bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 ${focusRing}`}
                    >
                      Fill
                    </button>
                    <button
                      onClick={() => void take(r, 'replace')}
                      disabled={!canReplace || !!busyId}
                      aria-label={`Import and replace selected image with ${r.title}`}
                      title={canReplace ? 'Replace the selected image' : 'Select an image layer first'}
                      className={`h-7 rounded-md text-[11.5px] bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 ${focusRing}`}
                    >
                      Replace
                    </button>
                  </div>
                  {detailId === r.id ? (
                    <div className="mt-1.5 rounded-lg bg-void-900 p-2 text-[11.5px] text-void-300 space-y-0.5">
                      <p><span className="text-void-500">Source:</span> {r.rights.providerDisplayName}{r.rights.creator ? ' — ' + r.rights.creator : ''}</p>
                      <p><span className="text-void-500">Licence:</span> {r.rights.licence}</p>
                      {r.rights.restrictions && <p><span className="text-void-500">Note:</span> {r.rights.restrictions}</p>}
                      {commercialWarning(r.rights) && <p className="text-amber-300">{commercialWarning(r.rights)}</p>}
                      {getAsset(r.id) ? <p className="text-void-500">Already in this tray.</p> : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
        {detail && <span className="hidden">{detail.id}</span>}
      </div>
    </Modal>
  )
}

export function openSearchPanel() {
  window.dispatchEvent(new CustomEvent('vc:open', { detail: { name: 'search' } }))
}
