'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { applyEffect } from '@/lib/effects'
import { ZoomIn, ZoomOut, Maximize2, SplitSquareHorizontal } from 'lucide-react'

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const originalCanvasRef = useRef<HTMLCanvasElement>(null)
  const originalImageRef = useRef<HTMLImageElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    originalImage, activeEffect, params, setIsProcessing,
    zoom, setZoom, showComparison, setShowComparison, comparisonPosition, setComparisonPosition,
  } = useStore()

  const [isDraggingSlider, setIsDraggingSlider] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const img = originalImageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    setIsProcessing(true)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    if (activeEffect !== 'none') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const processed = applyEffect(ctx, imageData, activeEffect, params)
      ctx.putImageData(processed, 0, 0)
    }

    setIsProcessing(false)
  }, [activeEffect, params, setIsProcessing])

  // Render original for comparison
  const renderOriginal = useCallback(() => {
    const canvas = originalCanvasRef.current
    const img = originalImageRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }, [])

  // Load image
  useEffect(() => {
    if (!originalImage) {
      originalImageRef.current = null
      return
    }
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      const origCanvas = originalCanvasRef.current
      if (!canvas) return

      const maxSize = 1200
      let width = img.width, height = img.height
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize; width = maxSize
        } else {
          width = (width / height) * maxSize; height = maxSize
        }
      }
      canvas.width = width; canvas.height = height
      if (origCanvas) { origCanvas.width = width; origCanvas.height = height }
      setCanvasSize({ width, height })
      originalImageRef.current = img
      render()
      renderOriginal()
    }
    img.src = originalImage
  }, [originalImage, render, renderOriginal])

  // Re-render on effect/param change
  useEffect(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    animationRef.current = requestAnimationFrame(render)
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current) }
  }, [render])

  // Comparison slider drag
  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    setComparisonPosition(Math.max(0, Math.min(100, x)))
  }, [setComparisonPosition])

  useEffect(() => {
    if (!isDraggingSlider) return
    const onMove = (e: MouseEvent) => handleSliderMove(e.clientX)
    const onUp = () => setIsDraggingSlider(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDraggingSlider, handleSliderMove])

  if (!originalImage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-void-950 rounded-2xl border border-void-800/50 m-4">
        <p className="text-void-500 text-lg">Upload an image to begin</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Canvas toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-void-800/40">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              showComparison
                ? 'bg-white text-void-900'
                : 'bg-void-900 text-void-400 hover:bg-void-800 hover:text-void-300'
            }`}
          >
            <SplitSquareHorizontal size={13} />
            Compare
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-void-500 font-mono tabular-nums">
            {canvasSize.width} × {canvasSize.height}
          </span>
          <div className="w-px h-4 bg-void-800" />
          <div className="flex items-center gap-1 bg-void-900 rounded-md p-0.5">
            <button
              onClick={() => setZoom(zoom - 25)}
              className="p-1 rounded hover:bg-void-800 text-void-400 hover:text-void-200 transition-colors"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] text-void-400 font-mono w-10 text-center tabular-nums">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(zoom + 25)}
              className="p-1 rounded hover:bg-void-800 text-void-400 hover:text-void-200 transition-colors"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="p-1 rounded hover:bg-void-800 text-void-400 hover:text-void-200 transition-colors"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center bg-void-950 overflow-auto relative"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #151518 25%, transparent 25%),
            linear-gradient(-45deg, #151518 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #151518 75%),
            linear-gradient(-45deg, transparent 75%, #151518 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
      >
        <div className="relative" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}>
          {/* Processed canvas */}
          <canvas
            ref={canvasRef}
            className="block"
            style={showComparison ? { clipPath: `inset(0 ${100 - comparisonPosition}% 0 0)` } : {}}
          />

          {/* Original canvas for comparison */}
          {showComparison && (
            <>
              <canvas
                ref={originalCanvasRef}
                className="absolute inset-0 block"
                style={{ clipPath: `inset(0 0 0 ${comparisonPosition}%)` }}
              />
              {/* Slider line */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-white/80 cursor-col-resize z-10"
                style={{ left: `${comparisonPosition}%`, transform: 'translateX(-50%)' }}
                onMouseDown={(e) => { e.preventDefault(); setIsDraggingSlider(true) }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                  <SplitSquareHorizontal size={14} className="text-void-900" />
                </div>
              </div>
              {/* Labels */}
              <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 rounded text-[10px] font-medium text-white/80 backdrop-blur-sm">
                EDITED
              </div>
              <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 rounded text-[10px] font-medium text-white/80 backdrop-blur-sm">
                ORIGINAL
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
