import { cloneCanvas, ctx2d, makeCanvas } from './engine'

/** Rebuild from unmasked paint. Reapplying a feathered selection to the same pixels fades its edges. */
export function constrainPaint(raw: HTMLCanvasElement, selection: HTMLCanvasElement | null, out = makeCanvas(raw.width, raw.height)) {
  const x = ctx2d(out)
  x.save(); x.resetTransform(); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'
  x.clearRect(0, 0, out.width, out.height); x.drawImage(raw, 0, 0)
  if (selection) { x.globalCompositeOperation = 'destination-in'; x.drawImage(selection, 0, 0) }
  x.restore()
  return out
}

export function applyPaint(src: HTMLCanvasElement, paint: HTMLCanvasElement, opts: { opacity?: number; erase?: boolean; lockAlpha?: boolean; selection?: HTMLCanvasElement | null } = {}) {
  const out = cloneCanvas(src)
  // Alpha lock protects existing transparency, including against erasure.
  if (opts.erase && opts.lockAlpha) return out
  const x = ctx2d(out)
  x.globalAlpha = opts.opacity ?? 1
  x.globalCompositeOperation = opts.erase ? 'destination-out' : opts.lockAlpha ? 'source-atop' : 'source-over'
  x.drawImage(opts.selection ? constrainPaint(paint, opts.selection) : paint, 0, 0)
  return out
}

/** Retouch algorithms feather beyond the painted hole. A pixel selection remains the final boundary. */
export function restrictResult(src: HTMLCanvasElement, result: HTMLCanvasElement, selection: HTMLCanvasElement | null) {
  if (!selection) return result
  const out = cloneCanvas(src), x = ctx2d(out)
  x.globalCompositeOperation = 'destination-out'; x.drawImage(selection, 0, 0)
  x.globalCompositeOperation = 'lighter'; x.drawImage(constrainPaint(result, selection), 0, 0)
  return out
}
