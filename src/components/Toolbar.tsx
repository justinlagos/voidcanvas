'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Download, RotateCcw, Undo2, Trash2, Layers } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { sendHandoff } from '@/editor/io'

export function Toolbar() {
  const { originalImage, setOriginalImage, resetParams, undo, history, activeEffect, setActiveEffect } = useStore()

  const handleDownload = useCallback((format: 'png' | 'jpg' | 'webp') => {
    const canvas = (document.querySelector('canvas[data-result-canvas]') || document.querySelector('canvas')) as HTMLCanvasElement | null
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `voidcanvas-${activeEffect}-${Date.now()}.${format}`

    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      webp: 'image/webp',
    }
    link.href = canvas.toDataURL(mimeTypes[format], 0.95)
    link.click()
  }, [activeEffect])

  const router = useRouter()
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

  const handleClear = useCallback(() => {
    setOriginalImage(null)
    setActiveEffect('none')
    resetParams()
  }, [setOriginalImage, setActiveEffect, resetParams])

  if (!originalImage) return null

  return (
    <div className="flex items-center gap-1.5">
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={undo}
        disabled={history.length === 0}
        title="Undo"
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-void-800/80 hover:bg-void-700
          disabled:opacity-30 disabled:cursor-not-allowed rounded-md transition-colors border border-void-700/40"
      >
        <Undo2 size={14} />
        <span className="text-xs">Undo</span>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={resetParams}
        title="Reset parameters"
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-void-800/80 hover:bg-void-700 rounded-md transition-colors border border-void-700/40"
      >
        <RotateCcw size={14} />
        <span className="text-xs">Reset</span>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleClear}
        title="Clear image"
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-void-800/80 hover:bg-red-900/40 rounded-md transition-colors border border-void-700/40"
      >
        <Trash2 size={14} />
        <span className="text-xs">Clear</span>
      </motion.button>

      <div className="w-px h-5 bg-void-700/50 mx-1" />

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={(e) => openInEditor(e.shiftKey)}
        title="Opens the photo with the effect on its own live layer. Shift-click to send one flattened image instead."
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors"
      >
        <Layers size={14} />
        <span className="text-xs font-medium whitespace-nowrap">Open in Editor</span>
      </motion.button>

      {/* Export dropdown-like buttons */}
      <div className="flex items-center gap-0.5 bg-void-900 rounded-md p-0.5 border border-void-800/50">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleDownload('png')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-void-900 rounded-[5px] transition-colors"
        >
          <Download size={12} />
          <span className="text-[11px] font-semibold">PNG</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleDownload('jpg')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-void-800 rounded-[5px] transition-colors"
        >
          <span className="text-[11px] font-medium text-void-300">JPG</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleDownload('webp')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-void-800 rounded-[5px] transition-colors"
        >
          <span className="text-[11px] font-medium text-void-300">WebP</span>
        </motion.button>
      </div>
    </div>
  )
}
