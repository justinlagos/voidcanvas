'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { makeChannel, runEffect } from '@/lib/effect-runner'
import { FX_WORK, scaleParams, workSize } from '@/lib/effect-scale'
import { ZoomIn, ZoomOut, Maximize2, SplitSquareHorizontal } from 'lucide-react'

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const originalCanvasRef = useRef<HTMLCanvasElement>(null)
  const originalImageRef = useRef<HTMLImageElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const {
    originalImage, activeEffect, params, setIsProcessing,
    zoom, setZoom, showComparison, setShowComparison, comparisonPosition, setComparisonPosition,
  } = useStore()

  const [isDraggingSlider, setIsDraggingSlider] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 })

  // Rendering runs in a Worker (see effect-runner). Two channels: a quick low-res preview that keeps up with
  // slider drags, and the full working-size render that follows once the sliders settle. For effects that
  // render fast the preview step is skipped.
  const fullChan = useRef(makeChannel()), previewChan = useRef(makeChannel())
  const lastFullMs = useRef(0)
  const fullTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const PREVIEW_MAX = 420
  const SLOW_MS = 120

  const drawSource = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) => { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, w, h) }

  const renderFull = useCallback(() => {
    const canvas = canvasRef.current, img = originalImageRef.current
    if (!canvas || !img) return
    const effect = activeEffect, p = params
    fullChan.current.request(async () => {
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return
      setIsProcessing(true)
      try {
        if (effect === 'none') { drawSource(ctx, img, canvas.width, canvas.height); lastFullMs.current = 0; return }
        const work = document.createElement('canvas'); work.width = canvas.width; work.height = canvas.height
        const wctx = work.getContext('2d', { willReadFrequently: true })!
        drawSource(wctx, img, work.width, work.height)
        const { img: done, ms } = await runEffect(wctx.getImageData(0, 0, work.width, work.height), effect, p)
        lastFullMs.current = ms
        // Drop the result if the user has moved on.
        const cur = useStore.getState(); if (cur.activeEffect !== effect || cur.params !== p) return
        ctx.putImageData(done, 0, 0)
      } finally { setIsProcessing(false) }
    })
  }, [activeEffect, params, setIsProcessing])

  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current, img = originalImageRef.current
    if (!canvas || !img || activeEffect === 'none') return
    const effect = activeEffect, p = params
    previewChan.current.request(async () => {
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return
      const small = workSize(canvas.width, canvas.height, PREVIEW_MAX)
      const k = Math.max(small.width, small.height) / Math.max(canvas.width, canvas.height)
      const work = document.createElement('canvas'); work.width = small.width; work.height = small.height
      const wctx = work.getContext('2d', { willReadFrequently: true })!
      drawSource(wctx, img, work.width, work.height)
      const { img: done } = await runEffect(wctx.getImageData(0, 0, work.width, work.height), effect, scaleParams(effect, p, k))
      const cur = useStore.getState(); if (cur.activeEffect !== effect || cur.params !== p) return
      wctx.putImageData(done, 0, 0)
      ctx.imageSmoothingQuality = 'high'; ctx.drawImage(work, 0, 0, canvas.width, canvas.height)
    })
  }, [activeEffect, params])

  const render = useCallback(() => {
    if (fullTimer.current) clearTimeout(fullTimer.current)
    if (lastFullMs.current > SLOW_MS) {
      // Slow effect: show a quick low-res version now, the real one once the sliders settle.
      renderPreview()
      fullTimer.current = setTimeout(renderFull, 280)
    } else renderFull()
  }, [renderFull, renderPreview])

  // Render original for comparison
  const renderOriginal = useCallback(() => {
    const canvas = originalCanvasRef.current
    const img = originalImageRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }, [])

  // Zoom that shows the whole image with a little air around it, never above 100%.
  const fitZoom = useCallback((w: number, h: number) => {
    const box = containerRef.current
    if (!box || !w || !h) return 100
    const z = Math.min((box.clientWidth - 32) / w, (box.clientHeight - 32) / h, 1) * 100
    return Math.max(10, Math.floor(z / 5) * 5)
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

      const { width, height } = workSize(img.width, img.height, FX_WORK)
      canvas.width = width; canvas.height = height
      setSourceSize({ width: img.width, height: img.height })
      lastFullMs.current = 0
      if (origCanvas) { origCanvas.width = width; origCanvas.height = height }
      setCanvasSize({ width, height })
      originalImageRef.current = img
      setZoom(fitZoom(width, height))
      render()
      renderOriginal()
    }
    img.src = originalImage
  }, [originalImage, render, renderOriginal, fitZoom, setZoom])

  // Re-render on effect/param change
  useEffect(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    animationRef.current = requestAnimationFrame(render)
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current) }
  }, [render])

  // Comparison slider: pointer events, so mouse, touch and pen all drag it. Position is relative to the image, not the scroll area.
  const handleSliderMove = useCallback((clientX: number) => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect || !rect.width) return
    const x = ((clientX - rect.left) / rect.width) * 100
    setComparisonPosition(Math.max(0, Math.min(100, x)))
  }, [setComparisonPosition])

  const onSliderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDraggingSlider(true)
    handleSliderMove(e.clientX)
  }, [handleSliderMove])
  const onSliderPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => { if (isDraggingSlider) handleSliderMove(e.clientX) }, [isDraggingSlider, handleSliderMove])
  const onSliderPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => { setIsDraggingSlider(false); try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* already released */ } }, [])
  const onSliderKey = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowLeft') { e.preventDefault(); setComparisonPosition(Math.max(0, comparisonPosition - step)) }
    if (e.key === 'ArrowRight') { e.preventDefault(); setComparisonPosition(Math.min(100, comparisonPosition + step)) }
    if (e.key === 'Home') { e.preventDefault(); setComparisonPosition(0) }
    if (e.key === 'End') { e.preventDefault(); setComparisonPosition(100) }
  }, [comparisonPosition, setComparisonPosition])

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
          <span className="text-[11px] text-void-500 font-mono tabular-nums" title={sourceSize.width > canvasSize.width ? `Preview at ${canvasSize.width} × ${canvasSize.height}. Downloads are ${sourceSize.width} × ${sourceSize.height}.` : undefined}>
            {sourceSize.width || canvasSize.width} × {sourceSize.height || canvasSize.height}
          </span>
          <div className="w-px h-4 bg-void-800" />
          <div className="flex items-center gap-1 bg-void-900 rounded-md p-0.5">
            <button
              onClick={() => setZoom(zoom <= 50 ? zoom - 10 : zoom - 25)}
              className="p-1 rounded hover:bg-void-800 text-void-400 hover:text-void-200 transition-colors"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] text-void-400 font-mono w-10 text-center tabular-nums">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(zoom < 50 ? zoom + 10 : zoom + 25)}
              className="p-1 rounded hover:bg-void-800 text-void-400 hover:text-void-200 transition-colors"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setZoom(fitZoom(canvasSize.width, canvasSize.height))}
              title="Fit to view"
              aria-label="Fit to view"
              className="p-1 rounded hover:bg-void-800 text-void-400 hover:text-void-200 transition-colors"
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={() => setZoom(100)}
              title="Actual size"
              className="px-1 rounded hover:bg-void-800 text-[10px] font-mono text-void-400 hover:text-void-200 transition-colors"
            >
              1:1
            </button>
          </div>
        </div>
      </div>

      {/* Canvas area. The image box has real layout size, so it scrolls at any zoom, and margin:auto centres it only when it fits (no clipping at the top for tall images). */}
      <div
        ref={containerRef}
        className="flex-1 flex bg-void-950 overflow-auto relative min-h-0"
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
        <div
          ref={wrapperRef}
          className="relative m-auto shrink-0"
          style={{ width: Math.max(1, Math.round(canvasSize.width * zoom / 100)), height: Math.max(1, Math.round(canvasSize.height * zoom / 100)) }}
        >
          {/* Processed canvas */}
          <canvas
            ref={canvasRef}
            data-result-canvas
            className="block w-full h-full"
            style={showComparison ? { clipPath: `inset(0 ${100 - comparisonPosition}% 0 0)` } : {}}
          />

          {/* Original canvas. Always mounted so it is sized and painted with the image; only shown while comparing. */}
          <canvas
            ref={originalCanvasRef}
            data-original-canvas
            aria-hidden={!showComparison}
            className={`absolute inset-0 block w-full h-full ${showComparison ? '' : 'invisible'}`}
            style={showComparison ? { clipPath: `inset(0 0 0 ${comparisonPosition}%)` } : {}}
          />

          {showComparison && (
            <>
              {/* Slider line. Wide hit area for fingers, thin visible line. */}
              <div
                role="slider"
                aria-label="Compare original and edited"
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(comparisonPosition)}
                tabIndex={0}
                className="absolute top-0 bottom-0 w-8 -ml-4 cursor-col-resize z-10 touch-none outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
                style={{ left: `${comparisonPosition}%` }}
                onPointerDown={onSliderPointerDown}
                onPointerMove={onSliderPointerMove}
                onPointerUp={onSliderPointerUp}
                onPointerCancel={onSliderPointerUp}
                onKeyDown={onSliderKey}
              >
                <div className="absolute top-0 bottom-0 left-1/2 w-[2px] -translate-x-1/2 bg-white/80" />
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
