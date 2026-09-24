'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Download, RotateCcw, Undo2, Trash2, Layers } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { sendHandoff } from '@/editor/io'
import { noteExportForPrompt, track } from '@/lib/analytics'

type Format = 'png' | 'jpg' | 'webp'
const MIME: Record<Format, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }

/** The Effects actions: undo, reset, clear, open in Editor, download. Shared by the header (desktop) and the bottom bar (phone). */
export function useEffectsActions() {
  const { originalImage, setOriginalImage, resetParams, undo, history, activeEffect, setActiveEffect } = useStore()
  const router = useRouter()

  const download = useCallback((format: Format) => {
    const canvas = (document.querySelector('canvas[data-result-canvas]') || document.querySelector('canvas')) as HTMLCanvasElement | null
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `voidcanvas-${activeEffect}-${Date.now()}.${format}`
    link.href = canvas.toDataURL(MIME[format], 0.95)
    link.click()
    track('export', { format, effect: activeEffect }); noteExportForPrompt()
  }, [activeEffect])

  // Send the photo plus the effect as its own live filter layer, so the effect stays
  // editable (and can be hidden, masked or re-tuned) in the Editor.
  // The photo goes at the same size the effect was previewed at, so pixel-based
  // settings (dot size, block size, blur radius) look the same on the other side.
  const openInEditor = useCallback(async (flatten = false) => {
    const result = document.querySelector('canvas[data-result-canvas]') as HTMLCanvasElement | null
    if (!result || !originalImage) return
    const { activeEffect: effect, params } = useStore.getState()
    let blob: Blob | null
    if (flatten || effect === 'none') {
      blob = await new Promise<Blob | null>(r => result.toBlob(r, 'image/png'))
    } else {
      const img = new Image()
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = originalImage })
      const c = document.createElement('canvas'); c.width = result.width; c.height = result.height
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/png'))
    }
    if (!blob) return
    const label = effect.replace(/([A-Z])/g, ' $1').replace(/^./, ch => ch.toUpperCase())
    const id = flatten || effect === 'none'
      ? await sendHandoff({ from: 'effects', name: effect === 'none' ? 'Photo' : `${label} result`, images: [{ name: effect === 'none' ? 'Photo' : `${label} (flattened)`, blob }] })
      : await sendHandoff({ from: 'effects', name: `${label} design`, images: [{ name: 'Photo', blob }], liveEffect: { effect, params: { ...params } } })
    router.push(`/editor?inbox=${id}`)
  }, [originalImage, router])

  const clear = useCallback(() => {
    setOriginalImage(null)
    setActiveEffect('none')
    resetParams()
  }, [setOriginalImage, setActiveEffect, resetParams])

  return { hasImage: !!originalImage, canUndo: history.length > 0, undo, reset: resetParams, clear, openInEditor, download }
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
        title="Opens the photo with the effect on its own live layer. Shift-click to send one flattened image instead."
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors"
      >
        <Layers size={14} /><span className="text-xs font-medium whitespace-nowrap">Open in Editor</span>
      </motion.button>

      <div className="flex items-center gap-0.5 bg-void-900 rounded-md p-0.5 border border-void-800/50">
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => a.download('png')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-void-900 rounded-[5px] transition-colors">
          <Download size={12} /><span className="text-[11px] font-semibold">PNG</span>
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
  if (!a.hasImage) return null
  const icon = 'flex flex-col items-center justify-center gap-0.5 min-w-[40px] h-11 rounded-md text-void-300 hover:text-white disabled:opacity-30 text-[10px]'
  return (
    <div data-mobile-actions className="lg:hidden shrink-0 flex items-center gap-1 px-2 border-t border-void-800/60 bg-void-950/95 backdrop-blur-sm" style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))', paddingTop: 6 }}>
      <button onClick={a.undo} disabled={!a.canUndo} aria-label="Undo" className={icon}><Undo2 size={16} />Undo</button>
      <button onClick={a.reset} aria-label="Reset parameters" className={icon}><RotateCcw size={16} />Reset</button>
      <button onClick={a.clear} aria-label="Clear image" className={icon}><Trash2 size={16} />Clear</button>
      <span className="flex-1" />
      <button onClick={() => a.openInEditor(false)} aria-label="Open in Editor" className="flex items-center gap-1.5 h-10 px-3 bg-accent text-white rounded-md text-[12px] font-medium whitespace-nowrap"><Layers size={14} />Editor</button>
      <div className="flex items-center gap-0.5 bg-void-900 rounded-md p-0.5 border border-void-800/50">
        <button onClick={() => a.download('png')} className="flex items-center gap-1 h-9 px-2 bg-white text-void-900 rounded-[5px] text-[11px] font-semibold"><Download size={12} />PNG</button>
        <button onClick={() => a.download('jpg')} className="h-9 px-2 text-[11px] font-medium text-void-300">JPG</button>
        <button onClick={() => a.download('webp')} className="h-9 px-2 text-[11px] font-medium text-void-300">WebP</button>
      </div>
    </div>
  )
}
