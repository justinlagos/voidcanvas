import { applyEffect } from './effects'
import { EXPORT_MAX, scaleParams, workSize } from './effect-scale'
import type { EffectParams, EffectType } from '@/store/useStore'
import type { EffectJob, EffectResult } from './effects.worker'

// Effects run in a Worker so sliders and the rest of the page stay responsive. Only the newest job of a
// given channel is kept: while one render is in flight, later requests replace each other and the last
// one runs when the worker is free. Falls back to the main thread where Workers are unavailable.

let worker: Worker | null = null
let workerBroken = false
let nextId = 1
const waiting = new Map<number, { resolve: (r: EffectResult) => void; reject: (e: unknown) => void }>()

function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === 'undefined') return null
  if (!worker) {
    try {
      worker = new Worker(new URL('./effects.worker.ts', import.meta.url))
      worker.onmessage = (e: MessageEvent<EffectResult>) => { const w = waiting.get(e.data.id); if (w) { waiting.delete(e.data.id); w.resolve(e.data) } }
      worker.onerror = (e) => { workerBroken = true; waiting.forEach(w => w.reject(e)); waiting.clear(); worker = null }
    } catch { workerBroken = true; worker = null }
  }
  return worker
}

/** Apply an effect to image data, off the main thread when possible. Resolves with the result and the time it took. */
export function runEffect(img: ImageData, effect: EffectType, params: EffectParams): Promise<{ img: ImageData; ms: number }> {
  const w = getWorker()
  if (!w) {
    const t0 = performance.now()
    return Promise.resolve({ img: applyEffect(null, img, effect, params), ms: performance.now() - t0 })
  }
  const id = nextId++
  const copy = new Uint8ClampedArray(img.data) // keep the caller's buffer intact
  const job: EffectJob = { id, width: img.width, height: img.height, data: copy.buffer as ArrayBuffer, effect, params }
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve: r => resolve({ img: new ImageData(new Uint8ClampedArray(r.data), r.width, r.height), ms: r.ms }), reject })
    w.postMessage(job, [job.data])
  })
}

/**
 * Latest-wins channel: call `request` as often as you like; at most one job runs at a time and only the most
 * recent request is honoured once the worker is free. Stale results are dropped.
 */
export function makeChannel() {
  let busy = false
  let pending: (() => Promise<void>) | null = null
  const pump = async () => {
    if (busy || !pending) return
    busy = true
    const job = pending; pending = null
    try { await job() } finally { busy = false; pump() }
  }
  return {
    request(job: () => Promise<void>) { pending = job; pump() },
  }
}

export type ImageSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap

/**
 * Render an effect at up to `maxLongEdge` px from a source image. Pixel-based settings are scaled from the
 * working size so the result matches the preview, only at full resolution.
 */
export async function renderEffectAt(src: ImageSource, effect: EffectType, params: EffectParams, maxLongEdge = EXPORT_MAX): Promise<HTMLCanvasElement> {
  const sw = 'naturalWidth' in src ? src.naturalWidth || src.width : src.width
  const sh = 'naturalHeight' in src ? src.naturalHeight || src.height : src.height
  const out = workSize(sw, sh, maxLongEdge)
  const work = workSize(sw, sh)
  const k = Math.max(out.width, out.height) / Math.max(work.width, work.height)
  const c = document.createElement('canvas'); c.width = out.width; c.height = out.height
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, out.width, out.height)
  if (effect !== 'none') {
    const img = ctx.getImageData(0, 0, out.width, out.height)
    const { img: done } = await runEffect(img, effect, scaleParams(effect, params, k))
    ctx.putImageData(done, 0, 0)
  }
  return c
}
