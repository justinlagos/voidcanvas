'use client'

// C1.2 Native asset tray: preview, selection, placement, replacement and
// source info without obstructing the canvas. Lives as a dock panel ('assets')
// and reuses the ONE document/history stores; it owns no canvas state.
// Search / Generate are safely gated until their milestones (disabled with
// an explanation, never a dead end).

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, RefreshCw, Search, Sparkles, Frame } from 'lucide-react'
import { useEditor } from '../store'
import { getAsset, listAssets, type NativeAsset } from '../assets/asset-store'
import { canvasForAsset, fillFrameFromTray, ingestFile, placeAssetAsLayer, placeTrayAsset, fillFrame } from '../assets/ops'
import { isEmptyFrame } from '../assets/place'
import type { RasterLayer } from '../types'
import { focusRing } from './ui'

function SourceLine({ asset }: { asset: NativeAsset }) {
  const lineage = useEditor(s => {
    const reg = (s.doc?.assets ?? {}) as Record<string, { parentId: string | null }>
    const chain: string[] = []
    let cur: string | null = asset.resourceId
    const seen = new Set<string>()
    while (cur && reg[cur] && !seen.has(cur)) { seen.add(cur); chain.unshift(cur); cur = reg[cur].parentId }
    return chain
  })
  const dims = `${asset.width} by ${asset.height} px`
  const gen = lineage.length > 1 ? ` · edit ${lineage.indexOf(asset.resourceId) + 1} of ${lineage.length}` : ''
  return (
    <span className="block text-[11px] text-void-500 truncate" title={`${asset.mime} · ${dims} · ${asset.source}${gen}`}>
      {asset.mime.replace('image/', '').toUpperCase()} · {dims}{gen}
    </span>
  )
}

function AssetCard({ asset, onPlace, onFill, onReplace, canFill, canReplace }: {
  asset: NativeAsset
  onPlace: () => void
  onFill: () => void
  onReplace: () => void
  canFill: boolean
  canReplace: boolean
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2" data-asset={asset.resourceId}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {asset.thumb ? <img src={asset.thumb} alt={asset.title} className="w-full aspect-[4/3] object-cover rounded-lg" /> : (
        <span className="block w-full aspect-[4/3] rounded-lg bg-void-800" aria-hidden />
      )}
      <div className="mt-1.5 min-w-0">
        <span className="block text-[12.5px] font-medium truncate" title={asset.title}>{asset.title}</span>
        <SourceLine asset={asset} />
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1">
        <button onClick={onPlace} aria-label={`Place ${asset.title} as a new layer`} className={`h-7 px-1 rounded-md text-[11.5px] bg-white/[0.06] hover:bg-white/[0.1] ${focusRing}`}>Place</button>
        <button onClick={onFill} disabled={!canFill} aria-label={`Fill selected frame with ${asset.title}`} title={canFill ? 'Fill the selected image frame' : 'Select an empty image frame first'} className={`h-7 px-1 rounded-md text-[11.5px] bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 ${focusRing}`}>Fill</button>
        <button onClick={onReplace} disabled={!canReplace} aria-label={`Replace selected image with ${asset.title}`} title={canReplace ? 'Replace the selected image, keeping its position and effects' : 'Select an image layer first'} className={`h-7 px-1 rounded-md text-[11.5px] bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 ${focusRing}`}>Replace</button>
      </div>
    </div>
  )
}

export function AssetTray() {
  const [assets, setAssets] = useState<NativeAsset[]>(() => listAssets())
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const activeId = useEditor(s => s.activeId)
  const layers = useEditor(s => s.layers)
  const active = layers.find(l => l.id === activeId) ?? null
  const activeIsFrame = isEmptyFrame(active)
  const activeIsRaster = !!active && active.type === 'raster' && !isEmptyFrame(active)

  const refresh = () => setAssets(listAssets())
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 1500)
    return () => clearInterval(t)
  }, [])

  const upload = async (files: FileList | File[] | null) => {
    if (!files || !files.length) return
    setError(null)
    setBusy('Uploading…')
    try {
      for (const f of Array.from(files as File[])) {
        const r = await ingestFile(f as File)
        if (r) {
          // Upload lands in the tray (original preserved); placement is explicit.
          refresh()
          useEditor.getState().notify(`“${r.asset.title}” is in the asset tray. Place it when ready.`)
        }
      }
    } finally {
      setBusy(null)
      refresh()
      if (file.current) file.current.value = ''
    }
  }

  const doPlace = async (id: string) => {
    setBusy('Placing…')
    try { await placeTrayAsset(id) } finally { setBusy(null); refresh() }
  }
  const doFill = async (id: string) => {
    if (!activeId) return
    setBusy('Filling…')
    try {
      const asset = getAsset(id)
      const canvas = await canvasForAsset(id)
      if (asset && canvas) await fillFrame(activeId, { asset, canvas, fullW: asset.width, fullH: asset.height })
      else await fillFrameFromTray(activeId, id)
    } finally { setBusy(null); refresh() }
  }
  const doReplace = async (id: string) => {
    if (!activeId) return
    setBusy('Replacing…')
    try {
      const { replaceLayerContent } = await import('../assets/ops')
      const { getOriginal } = await import('../assets/asset-store')
      const blob = getOriginal(id)
      if (blob) await replaceLayerContent(activeId, blob, getAsset(id)?.title)
    } finally { setBusy(null); refresh() }
  }

  return (
    <div className="flex flex-col h-full min-h-0" data-testid="asset-tray" aria-label="Asset tray">
      <div className="flex items-center gap-1.5 p-2">
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden aria-label="Upload images" onChange={e => upload(e.target.files)} />
        <button onClick={() => file.current?.click()} aria-label="Upload images" className={`h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-[12.5px] font-medium hover:brightness-110 ${focusRing}`}>
          <ImagePlus size={14} />Upload
        </button>
        <button disabled title="Image search arrives in a later milestone. Uploads stay on this device." aria-label="Search images (coming soon)" className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-[12.5px] text-void-500 cursor-not-allowed">
          <Search size={14} />Search
        </button>
        <button disabled title="In-editor generation arrives in Sprint C2. Uploads stay on this device." aria-label="Generate image (coming soon)" className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-[12.5px] text-void-500 cursor-not-allowed">
          <Sparkles size={14} />Generate
        </button>
      </div>
      {active && (activeIsFrame || active.type === 'shape') && (
        <p className="px-3 pb-1 text-[11.5px] text-void-400" role="status">
          {activeIsFrame ? 'An empty frame is selected. Upload or pick an asset, then Fill.' : 'A shape is selected. Add an image frame, or clip an image to this shape.'}
        </p>
      )}
      {busy && <p className="px-3 pb-1 text-[11.5px] text-void-300" role="status">{busy}</p>}
      {error && <p className="px-3 pb-1 text-[11.5px] text-red-300" role="alert">{error}</p>}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 grid grid-cols-2 gap-2 content-start"
        onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
        onDrop={e => { if (e.dataTransfer.files.length) { e.preventDefault(); upload(e.dataTransfer.files) } }}
      >
        {assets.length === 0 && (
          <div className="col-span-2 rounded-xl border border-dashed border-white/15 p-4 text-center">
            <Frame size={20} className="mx-auto text-void-500" />
            <p className="mt-1.5 text-[12.5px] text-void-300 font-medium">No assets yet</p>
            <p className="text-[11.5px] text-void-500">Upload a PNG, JPEG, WebP or GIF. Originals stay on this device and ride inside the .void file.</p>
          </div>
        )}
        {assets.map(a => (
          <AssetCard key={a.resourceId} asset={a}
            onPlace={() => doPlace(a.resourceId)}
            onFill={() => doFill(a.resourceId)}
            onReplace={() => doReplace(a.resourceId)}
            canFill={!!activeId && activeIsFrame}
            canReplace={!!activeId && activeIsRaster} />
        ))}
      </div>
      <div className="px-3 py-1.5 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[11px] text-void-500">{assets.length} asset{assets.length === 1 ? '' : 's'} · local only</span>
        <button onClick={refresh} aria-label="Refresh asset tray" className={`inline-flex items-center gap-1 text-[11px] text-void-400 hover:text-white ${focusRing}`}><RefreshCw size={12} />Refresh</button>
      </div>
    </div>
  )
}

// Inline uploading for places without the dock (phone shell, empty-frame callout).
export function UploadButton({ label, onDone, variant }: { label: string; onDone?: (ids: string[]) => void; variant?: 'primary' | 'ghost' }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden aria-label={label}
        onChange={async e => {
          const files = Array.from(e.target.files ?? [])
          if (!files.length) return
          setBusy(true)
          try {
            const ids: string[] = []
            for (const f of files) {
              const r = await ingestFile(f)
              if (r) ids.push(r.asset.resourceId)
            }
            onDone?.(ids)
          } finally { setBusy(false); if (ref.current) ref.current.value = '' }
        }} />
      <button onClick={() => ref.current?.click()} aria-label={label} disabled={busy}
        className={variant === 'ghost'
          ? `h-8 px-3 rounded-lg text-[12.5px] text-void-100 hover:bg-white/[0.06] ${focusRing}`
          : `h-8 px-3 rounded-lg bg-accent text-white text-[12.5px] font-medium hover:brightness-110 ${focusRing}`}>
        {busy ? 'Uploading…' : label}
      </button>
    </>
  )
}
