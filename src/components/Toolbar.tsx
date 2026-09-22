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
  // Pass the current result to the Editor as the first layer of a new design.
  const openInEditor = useCallback(() => {
    const canvas = (document.querySelector('canvas[data-result-canvas]') || document.querySelector('canvas')) as HTMLCanvasElement | null
    if (!canvas) return
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const name = activeEffect === 'none' ? 'Photo' : `${activeEffect} effect`
      const id = await sendHandoff({ from: 'effects', name, images: [{ name, blob }] })
      router.push(`/editor?inbox=${id}`)
    }, 'image/png')
  }, [activeEffect, router])

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
        onClick={openInEditor}
        title="Keep working on this in the Editor: add layers, type and retouching"
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
