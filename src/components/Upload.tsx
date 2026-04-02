'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload as UploadIcon, ImagePlus, Sparkles } from 'lucide-react'
import { useStore } from '@/store/useStore'

function FloatingParticle({ index }: { index: number }) {
  const size = 2 + Math.random() * 3
  const duration = 4 + Math.random() * 6
  const delay = Math.random() * 4
  const startX = Math.random() * 100
  const startY = Math.random() * 100

  return (
    <motion.div
      className="absolute rounded-full bg-white/10"
      style={{ width: size, height: size, left: `${startX}%`, top: `${startY}%` }}
      animate={{
        y: [0, -30, -10, -40, 0],
        x: [0, 15, -10, 5, 0],
        opacity: [0, 0.6, 0.3, 0.5, 0],
        scale: [0.5, 1, 0.8, 1.1, 0.5],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

export function Upload() {
  const { setOriginalImage, originalImage } = useStore()
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCount, setDragCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => setOriginalImage(event.target?.result as string)
    reader.readAsDataURL(file)
  }, [setOriginalImage])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setDragCount(0)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (event) => setOriginalImage(event.target?.result as string)
    reader.readAsDataURL(file)
  }, [setOriginalImage])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragCount(c => c + 1)
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragCount(c => {
      const next = c - 1
      if (next <= 0) setIsDragOver(false)
      return Math.max(0, next)
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // No compact header version needed — drop zone only shows when no image
  if (originalImage) return null

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className="flex-1 flex items-center justify-center p-12"
    >
      <label className="block w-full max-w-xl cursor-pointer">
        <motion.div
          animate={isDragOver ? { scale: 1.02 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative overflow-hidden rounded-2xl"
        >
          {/* Animated gradient border */}
          <div
            className={`
              absolute inset-0 rounded-2xl p-[1.5px] transition-opacity duration-500
              ${isDragOver ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #10b981, #3b82f6)',
                animation: 'spin 3s linear infinite',
              }}
            />
          </div>

          {/* Main content area */}
          <div
            className={`
              relative flex flex-col items-center justify-center gap-6 py-16 px-8
              rounded-2xl border-2 border-dashed transition-all duration-500
              ${isDragOver
                ? 'border-transparent bg-void-950/95 shadow-[0_0_60px_rgba(139,92,246,0.15)]'
                : 'border-void-700/60 bg-void-950/80 hover:border-void-500/60 hover:bg-void-900/50'
              }
            `}
          >
            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <FloatingParticle key={i} index={i} />
              ))}
            </div>

            {/* Subtle grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-2xl"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
              }}
            />

            {/* Icon */}
            <AnimatePresence mode="wait">
              {isDragOver ? (
                <motion.div
                  key="drop"
                  initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="relative"
                >
                  <div className="w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30">
                    <Sparkles size={36} className="text-violet-400" />
                  </div>
                  <motion.div
                    className="absolute -inset-4 rounded-3xl border border-violet-500/20"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                  className="relative group"
                >
                  <div className="w-20 h-20 flex items-center justify-center rounded-2xl bg-void-800/80 border border-void-700/50 group-hover:border-void-600/50 transition-colors">
                    <UploadIcon size={32} className="text-void-400 group-hover:text-void-300 transition-colors" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Text */}
            <div className="text-center relative z-10 space-y-2">
              <AnimatePresence mode="wait">
                {isDragOver ? (
                  <motion.p
                    key="drop-text"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-lg font-medium text-violet-300"
                  >
                    Release to drop
                  </motion.p>
                ) : (
                  <motion.div
                    key="idle-text"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <p className="text-lg font-medium text-void-200">
                      Drop an image here
                    </p>
                    <p className="text-void-500 text-sm mt-1">or click anywhere to browse</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Format badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 relative z-10"
            >
              {['PNG', 'JPG', 'WebP', 'GIF'].map((fmt) => (
                <span
                  key={fmt}
                  className="px-2.5 py-1 text-[11px] font-mono font-medium text-void-500 bg-void-800/60 border border-void-700/40 rounded-md"
                >
                  {fmt}
                </span>
              ))}
              <span className="text-void-600 text-xs ml-1">up to 10MB</span>
            </motion.div>
          </div>
        </motion.div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
    </div>
  )
}
