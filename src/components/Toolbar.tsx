'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Download, RotateCcw, Undo2, Trash2, Layers, PlusSquare, MoreHorizontal, X } from 'lucide-react'
import { useStore, fullStack } from '@/store/useStore'
import { sendHandoff } from '@/editor/io'
import { noteExportForPrompt, track } from '@/lib/analytics'
import { renderStackAt } from '@/lib/effect-runner'
import { EXPORT_MAX } from '@/lib/effect-scale'
import { effects } from './effect-list'

type Format = 'png' | 'jpg' | 'webp'
const MIME: Record<Format, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }

/** The Effects actions: undo, reset, clear, open in Editor, download. Shared by the header (desktop) and the bottom bar (phone). */
export function useEffectsActions() {
  const { originalImage, setOriginalImage, resetParams, undo, history, activeEffect, setActiveEffect, clearStack } = useStore()
  const router = useRouter()

  const [exporting, setExporting] = useState(false)
  // Downloads are rendered again at the photo's own size (capped at EXPORT_MAX on the long edge), not the preview size.
  const download = useCallback(async (format: Format) => {
    if (!originalImage || exporting) return
    setExporting(true)
    try {
      const img = new Image()
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('image')); img.src = originalImage })
      const list = fullStack(useStore.getState(), true)
      const c = await renderStackAt(img, list, EXPORT_MAX)
      const effect = list.map(e => e.effect).join('-') || 'photo'
      const blob = await new Promise<Blob | null>(r => c.toBlob(r, MIME[format], 0.95))
      if (!blob) throw new Error('encode')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `voidcanvas-${effect}-${c.width}x${c.height}.${format}`
      link.href = url
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      track('export', { format, effect, w: c.width, h: c.height }); noteExportForPrompt()
    } catch {
      // Fall back to the preview canvas rather than fail outright.
      const canvas = document.querySelector('canvas[data-result-canvas]') as HTMLCanvasElement | null
      if (canvas) { const link = document.createElement('a'); link.download = `voidcanvas-${activeEffect}.${format}`; link.href = canvas.toDataURL(MIME[format], 0.95); link.click() }
    } finally { setExporting(false) }
  }, [activeEffect, originalImage, exporting])

  // Send the photo plus the effect as its own live filter layer, so the effect stays
  // editable (and can be hidden, masked or re-tuned) in the Editor.
  // The photo goes at the same size the effect was previewed at, so pixel-based
  // settings (dot size, block size, blur radius) look the same on the other side.
  const openInEditor = useCallback(async (flatten = false) => {
    const result = document.querySelector('canvas[data-result-canvas]') as HTMLCanvasElement | null
    if (!result || !originalImage) return
    const list = fullStack(useStore.getState(), true)
    const none = !list.length
    let blob: Blob | null
    if (flatten || none) {
      blob = await new Promise<Blob | null>(r => result.toBlob(r, 'image/png'))
    } else {
      const img = new Image()
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = originalImage })
      const c = document.createElement('canvas'); c.width = result.width; c.height = result.height
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/png'))
    }
    if (!blob) return
    const label = none ? 'Photo' : list.length > 1 ? 'Effects' : nameOf(list[0].effect)
    const id = flatten || none
      ? await sendHandoff({ from: 'effects', name: none ? 'Photo' : `${label} result`, images: [{ name: none ? 'Photo' : `${label} (flattened)`, blob }] })
      : await sendHandoff({ from: 'effects', name: `${label} design`, images: [{ name: 'Photo', blob }], liveEffects: list.map(e => ({ effect: e.effect, params: { ...e.params } })) })
    router.push(`/editor?inbox=${id}`)
  }, [originalImage, router])

  // The design open in this browser tab, if any: the effects can go onto what is selected in it.
  const openDesign = useOpenDesign()
  const addToDesign = useCallback(async () => {
    const list = fullStack(useStore.getState(), true)
    if (!openDesign || !list.length) return
    const id = await sendHandoff({ from: 'effects', name: openDesign.name, images: [], addEffects: { projectId: openDesign.id, effects: list.map(e => ({ effect: e.effect, params: { ...e.params } })) } })
    track('effect.toDesign', { count: list.length })
    router.push(`/editor?inbox=${id}`)
  }, [openDesign, router])

  const clear = useCallback(() => {
    setOriginalImage(null)
    setActiveEffect('none')
    clearStack()
    resetParams()
  }, [setOriginalImage, setActiveEffect, clearStack, resetParams])

  const hasFx = useStore(s => fullStack(s, true).length > 0)
  return { hasImage: !!originalImage, canUndo: history.length > 0, undo, reset: resetParams, clear, openInEditor, download, exporting, openDesign: hasFx ? openDesign : null, addToDesign }
}

const nameOf = (effect: string) => effects.find(e => e.id === effect)?.name ?? effect

/** The design open in the Editor in this browser tab (the Editor keeps the list for the tab). */
function useOpenDesign(): { id: string; name: string } | null {
  const [d, setD] = useState<{ id: string; name: string } | null>(null)
  useEffect(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem('vc-open') || 'null') as { tabs: { id: string; name: string }[]; active: string | null } | null
      const t = v?.active ? v.tabs.find(x => x.id === v.active) : null
      if (t) setD({ id: t.id, name: t.name })
    } catch { /* no design open */ }
  }, [])
  return d
}

const ghost = 'flex items-center gap-1.5 px-2.5 py-1.5 bg-void-800/80 hover:bg-void-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-md transition-colors border border-void-700/40'

/** Desktop and tablet: sits in the header. Hidden below md, where MobileActionBar takes over. */
export function Toolbar() {
  const a = useEffectsActions()
  if (!a.hasImage) return null

  return (
    <div className="hidden lg:flex items-center gap-1.5">
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={a.undo} disabled={!a.canUndo} title="Undo" className={ghost}>
        <Undo2 size={14} /><span className="text-xs">Undo</span>
      </motion.button>
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={a.reset} title="Reset parameters" className={ghost}>
        <RotateCcw size={14} /><span className="text-xs">Reset</span>
      </motion.button>
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={a.clear} title="Clear image" className={`${ghost} hover:!bg-red-900/40`}>
        <Trash2 size={14} /><span className="text-xs">Clear</span>
      </motion.button>

      <div className="w-px h-5 bg-void-700/50 mx-1" />

      <motion.button
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={(e) => a.openInEditor(e.shiftKey)}
        title="Opens the photo in the Editor with these effects on it, still editable. Shift-click to send one flattened image instead."
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors"
      >
        <Layers size={14} /><span className="text-xs font-medium whitespace-nowrap">Open in Editor</span>
      </motion.button>

      {a.openDesign && (
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={a.addToDesign} data-fx-to-design
          title={`Puts these effects on what you have selected in “${a.openDesign.name}”, where you can still change them.`}
          className={ghost}
        >
          <PlusSquare size={14} /><span className="text-xs whitespace-nowrap">Add to my design</span>
        </motion.button>
      )}

      <div className={`flex items-center gap-0.5 bg-void-900 rounded-md p-0.5 border border-void-800/50 ${a.exporting ? 'opacity-60 pointer-events-none' : ''}`} title="Downloads at the photo's full size">
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => a.download('png')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-void-900 rounded-[5px] transition-colors">
          <Download size={12} /><span className="text-[11px] font-semibold">{a.exporting ? 'Saving' : 'PNG'}</span>
        </motion.button>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => a.download('jpg')} className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-void-800 rounded-[5px] transition-colors">
          <span className="text-[11px] font-medium text-void-300">JPG</span>
        </motion.button>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => a.download('webp')} className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-void-800 rounded-[5px] transition-colors">
          <span className="text-[11px] font-medium text-void-300">WebP</span>
        </motion.button>
      </div>
    </div>
  )
}

/** Phone: a sticky bar at the bottom of the page, so export and Open in Editor are always within thumb reach. */
export function MobileActionBar() {
  const a = useEffectsActions()
  const [menu, setMenu] = useState<'export' | 'more' | null>(null)
  useEffect(() => { if (!menu) return; const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null) }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close) }, [menu])
  if (!a.hasImage) return null
  const icon = 'shrink-0 flex items-center justify-center w-11 h-11 rounded-lg text-void-300 hover:bg-void-800 disabled:opacity-30'
  return (
    <div data-mobile-actions className="relative lg:hidden shrink-0 flex items-center gap-2 px-3 border-t border-void-800 bg-void-950" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))', paddingTop: 8 }}>
      {menu && <>
        <button aria-label="Close actions" className="fixed inset-0 z-30 cursor-default" onClick={() => setMenu(null)} />
        <section aria-label={menu === 'export' ? 'Download image' : 'Image actions'} className="absolute z-40 bottom-full mb-2 left-3 right-3 rounded-2xl border border-void-700 bg-void-950 shadow-2xl p-3">
          <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-medium">{menu === 'export' ? 'Download image' : 'Image actions'}</h2><button aria-label="Close actions panel" onClick={() => setMenu(null)} className={icon}><X size={16} /></button></div>
          {menu === 'export' ? <div className="grid grid-cols-3 gap-2">{(['png', 'jpg', 'webp'] as const).map(f => <button key={f} disabled={a.exporting} onClick={() => { a.download(f); setMenu(null) }} className="h-12 rounded-lg bg-white text-void-950 text-sm font-medium">{f === 'webp' ? 'WebP' : f.toUpperCase()}</button>)}</div> : <div className="grid gap-1">
            <button onClick={() => { a.reset(); setMenu(null) }} className="flex items-center gap-3 h-11 px-3 text-sm rounded-lg hover:bg-void-800"><RotateCcw size={16} />Reset effect settings</button>
            {a.openDesign && <button onClick={a.addToDesign} data-fx-to-design className="flex items-center gap-3 h-11 px-3 text-sm rounded-lg hover:bg-void-800"><PlusSquare size={16} />Add to my design</button>}
            <button onClick={() => { a.clear(); setMenu(null) }} className="flex items-center gap-3 h-11 px-3 text-sm rounded-lg text-rose-300 hover:bg-void-800"><Trash2 size={16} />Clear image</button>
          </div>}
        </section>
      </>}
      <button onClick={a.undo} disabled={!a.canUndo} aria-label="Undo" className={icon}><Undo2 size={18} /></button>
      <button onClick={() => setMenu(menu === 'more' ? null : 'more')} aria-label="More image actions" aria-expanded={menu === 'more'} className={icon}><MoreHorizontal size={20} /></button>
      <button onClick={() => a.openInEditor(false)} className="flex flex-1 min-w-0 justify-center items-center gap-2 h-11 px-2 border border-void-700 text-white rounded-lg text-xs font-medium whitespace-nowrap"><Layers size={15} />Open in Editor</button>
      <button disabled={a.exporting} onClick={() => setMenu(menu === 'export' ? null : 'export')} aria-expanded={menu === 'export'} className="flex shrink-0 items-center justify-center gap-1.5 h-11 px-3 bg-white text-void-950 rounded-lg text-xs font-semibold whitespace-nowrap"><Download size={15} />{a.exporting ? 'Saving…' : 'Save'}</button>
    </div>
  )
}
