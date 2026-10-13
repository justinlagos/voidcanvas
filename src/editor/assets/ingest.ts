// C1.1 Native asset ingestion: validated local image upload.
// Local-first: no network, no AI calls. Original bytes are preserved by the
// caller (asset-store); this module validates + decodes + thumbnails.
//
// Validation covers: MIME whitelist, file size, decoded dimensions and
// decompression-bomb risk (pixel count). EXIF orientation is honoured via
// createImageBitmap(imageOrientation:'from-image') with an <img> fallback
// (modern browsers apply EXIF there too). Colour is left to the browser's
// colour-managed decode; embedded ICC is honoured where the browser supports
// it (documented limitation, fixture-covered).

export const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
export type AcceptedMime = (typeof ACCEPTED_MIME)[number]

export const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB per file
export const MAX_DIMENSION = 12000 // px on either side
export const MAX_PIXELS = 50_000_000 // ~50 MP decompression-bomb guard
export const MIN_DIMENSION = 1

export interface IngestRejection {
  ok: false
  code:
    | 'unsupported-type'
    | 'too-large'
    | 'too-small'
    | 'dimensions'
    | 'decompression-risk'
    | 'decode-failed'
  message: string
}

export interface IngestValidation {
  ok: true
  mime: string
  size: number
  width: number
  height: number
}

/** Pure pre-decode checks (MIME + file size). Decode-dependent checks live in validateDimensions. */
export function precheckFile(file: { type: string; size: number; name?: string }): { ok: true; mime: string } | IngestRejection {
  const mime = (file.type || '').toLowerCase()
  if (!(ACCEPTED_MIME as readonly string[]).includes(mime)) {
    const ext = (file.name || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
    // Common alias: jpg files sometimes arrive with empty type in paste/drop.
    if (ext === 'jpg' || ext === 'jpeg') {
      if (file.size > MAX_FILE_BYTES) return { ok: false, code: 'too-large', message: `That image is ${(file.size / 1048576).toFixed(1)} MB. The limit is 50 MB.` }
      return { ok: true, mime: 'image/jpeg' }
    }
    return {
      ok: false,
      code: 'unsupported-type',
      message: mime
        ? `“${mime}” is not supported yet. Use PNG, JPEG, WebP or GIF.`
        : 'That file is not a supported image. Use PNG, JPEG, WebP or GIF.',
    }
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, code: 'too-large', message: `That image is ${(file.size / 1048576).toFixed(1)} MB. The limit is 50 MB.` }
  }
  if (file.size <= 0) {
    return { ok: false, code: 'too-small', message: 'That file is empty.' }
  }
  return { ok: true, mime }
}

/** Pure dimension checks, unit-testable without a DOM. */
export function validateDimensions(width: number, height: number): { ok: true } | IngestRejection {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < MIN_DIMENSION || height < MIN_DIMENSION) {
    return { ok: false, code: 'dimensions', message: 'That image has no readable pixels.' }
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return { ok: false, code: 'dimensions', message: `That image is ${Math.round(width)} by ${Math.round(height)} px. The limit is ${MAX_DIMENSION} px on a side.` }
  }
  if (width * height > MAX_PIXELS) {
    return {
      ok: false,
      code: 'decompression-risk',
      message: `That image would use ${(width * height / 1e6).toFixed(0)} MP of memory. The limit is ${MAX_PIXELS / 1e6} MP.`,
    }
  }
  return { ok: true }
}

export interface DecodedImage {
  canvas: HTMLCanvasElement
  width: number
  height: number
  mime: string
}

/**
 * Decode an image Blob to a canvas, honouring EXIF orientation.
 * Downscales only when the image exceeds `maxSide` (default 4096, the
 * editor's proven editing resolution); the original Blob is untouched and
 * must be preserved separately by the caller for full-resolution lineage.
 */
export async function decodeImage(blob: Blob, maxSide = 4096): Promise<DecodedImage> {
  const mime = blob.type || 'image/png'
  let src: ImageBitmap | HTMLImageElement | null = null
  let w = 0, h = 0
  try {
    src = await createImageBitmap(blob, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    w = src.width; h = src.height
  } catch {
    src = await new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image()
      const url = URL.createObjectURL(blob)
      img.onload = () => { URL.revokeObjectURL(url); res(img) }
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode-failed')) }
      img.src = url
    })
    w = (src as HTMLImageElement).naturalWidth || (src as HTMLImageElement).width
    h = (src as HTMLImageElement).naturalHeight || (src as HTMLImageElement).height
  }
  const dim = validateDimensions(w, h)
  if (!dim.ok) {
    if (src && 'close' in src) (src as ImageBitmap).close?.()
    throw Object.assign(new Error(dim.message), { code: dim.code })
  }
  const k = Math.min(1, maxSide / Math.max(w, h))
  const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k))
  const c = document.createElement('canvas')
  c.width = cw; c.height = ch
  const x = c.getContext('2d')!
  x.imageSmoothingQuality = 'high'
  x.drawImage(src as CanvasImageSource, 0, 0, cw, ch)
  if (src && 'close' in (src as ImageBitmap)) (src as ImageBitmap).close?.()
  return { canvas: c, width: w, height: h, mime }
}

/**
 * Thumbnail data URL (max `maxSide` px) rendered from an existing canvas.
 * Never replaces the full-resolution source; purely for tray preview.
 */
export function thumbnailOf(canvas: HTMLCanvasElement, maxSide = 256): string {
  const k = Math.min(1, maxSide / Math.max(1, canvas.width, canvas.height))
  const t = document.createElement('canvas')
  t.width = Math.max(1, Math.round(canvas.width * k))
  t.height = Math.max(1, Math.round(canvas.height * k))
  const x = t.getContext('2d')!
  x.imageSmoothingQuality = 'high'
  x.drawImage(canvas, 0, 0, t.width, t.height)
  return t.toDataURL('image/jpeg', 0.72)
}

export async function sha256Of(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const d = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('')
}
