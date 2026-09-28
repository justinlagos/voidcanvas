// Browser glue for the intelligence layer: files and canvases in, pixels out, variants back
// to canvases. Everything measurable lives in the pure modules next to this file.

import { profilePixels, artworkBounds, knockOutFlatBackground, type AssetProfile } from './asset'
import { grayscalePixels, knockoutPixels, planVariants, variantProfile, type VariantId, type VariantPlan } from './logo'
import { readPhoto, type PhotoRead } from './photo'

export interface AnalysedLogo {
  /** Trimmed to the artwork, flat background removed. The original file is not touched. */
  canvas: HTMLCanvasElement
  width: number
  height: number
  profile: AssetProfile
  svg: string | null
  fileName: string
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const u = URL.createObjectURL(blob), i = new Image(); i.onload = () => { res(i); setTimeout(() => URL.revokeObjectURL(u), 0) }; i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('The file could not be read as an image')) }; i.src = u })
}

/** Read a logo file: knock out a flat background, trim to the artwork, and measure it. */
export async function analyseLogoFile(file: Blob & { name?: string }): Promise<AnalysedLogo> {
  const name = file.name ?? 'logo'
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(name)
  const svg = isSvg ? await file.text() : null
  const im = await loadImage(file)
  const nw = im.naturalWidth || 1000, nh = im.naturalHeight || 1000
  const k = Math.min(1, 1600 / Math.max(nw, nh)) * (isSvg ? Math.max(1, 1200 / Math.max(nw, nh)) : 1)
  const W = Math.max(1, Math.round(nw * k)), H = Math.max(1, Math.round(nh * k))
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.drawImage(im, 0, 0, W, H)
  const d = x.getImageData(0, 0, W, H)
  const flat = knockOutFlatBackground(d.data, W, H)
  if (flat) x.putImageData(d, 0, 0)
  const b = artworkBounds(d.data, W, H)
  const t = document.createElement('canvas'); t.width = b.w; t.height = b.h
  const tx = t.getContext('2d', { willReadFrequently: true })!
  tx.drawImage(c, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h)
  const td = tx.getImageData(0, 0, b.w, b.h)
  const profile = profilePixels(td.data, b.w, b.h, { alreadyKnockedOut: true, flatBackground: flat })
  c.width = 0
  return { canvas: t, width: b.w, height: b.h, profile, svg, fileName: name }
}

/** Measure an already-drawn canvas (a layer's pixels, say). */
export function profileCanvas(c: HTMLCanvasElement, max = 400): AssetProfile {
  const k = Math.min(1, max / Math.max(c.width, c.height))
  const w = Math.max(1, Math.round(c.width * k)), h = Math.max(1, Math.round(c.height * k))
  const s = document.createElement('canvas'); s.width = w; s.height = h
  const x = s.getContext('2d', { willReadFrequently: true })!
  x.drawImage(c, 0, 0, w, h)
  const p = profilePixels(x.getImageData(0, 0, w, h).data, w, h)
  s.width = 0
  return { ...p, width: c.width, height: c.height, bounds: { x: Math.round(p.bounds.x / k), y: Math.round(p.bounds.y / k), w: Math.round(p.bounds.w / k), h: Math.round(p.bounds.h / k) } }
}

export interface DerivedVariant { id: VariantId; plan: VariantPlan; canvas: HTMLCanvasElement; profile: AssetProfile }

/** Make the valid variants as canvases. The primary is the trimmed original. */
export function deriveVariants(logo: AnalysedLogo, ink: string, brand?: string | null): DerivedVariant[] {
  const plans = planVariants(logo.profile, ink, brand)
  const x = logo.canvas.getContext('2d', { willReadFrequently: true })!
  const src = x.getImageData(0, 0, logo.width, logo.height).data
  const out: DerivedVariant[] = []
  for (const plan of plans) {
    if (!plan.valid) { out.push({ id: plan.id, plan, canvas: logo.canvas, profile: variantProfile(logo.profile, plan) }); continue }
    if (plan.id === 'primary' || !plan.derived) { out.push({ id: plan.id, plan, canvas: logo.canvas, profile: logo.profile }); continue }
    const px = plan.id === 'grayscale' ? grayscalePixels(src) : knockoutPixels(src, plan.fill ?? '#000000')
    const c = document.createElement('canvas'); c.width = logo.width; c.height = logo.height
    const id = c.getContext('2d')!.createImageData(logo.width, logo.height); id.data.set(px)
    c.getContext('2d')!.putImageData(id, 0, 0)
    out.push({ id: plan.id, plan, canvas: c, profile: variantProfile(logo.profile, plan) })
  }
  return out
}

/** Recolour any canvas to one colour, keeping its alpha (used by the Editor's "Use reversed"). */
export function recolourCanvas(c: HTMLCanvasElement, hex: string): HTMLCanvasElement {
  const o = document.createElement('canvas'); o.width = c.width; o.height = c.height
  const x = o.getContext('2d')!
  x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = hex; x.fillRect(0, 0, o.width, o.height)
  return o
}

export function readPhotoCanvas(c: HTMLCanvasElement | HTMLImageElement, max = 240): PhotoRead {
  const w0 = (c as HTMLCanvasElement).width || (c as HTMLImageElement).naturalWidth, h0 = (c as HTMLCanvasElement).height || (c as HTMLImageElement).naturalHeight
  const k = Math.min(1, max / Math.max(w0, h0))
  const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k))
  const s = document.createElement('canvas'); s.width = w; s.height = h
  const x = s.getContext('2d', { willReadFrequently: true })!
  x.drawImage(c, 0, 0, w, h)
  const r = readPhoto(x.getImageData(0, 0, w, h).data, w, h)
  s.width = 0
  return { ...r, width: w0, height: h0 }
}

/** Serialisable copy of a profile for storage (it already is plain data, but keep the shape explicit). */
export const plainProfile = (p: AssetProfile): AssetProfile => JSON.parse(JSON.stringify(p))
