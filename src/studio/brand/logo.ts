import { contrast, rgbToHex } from './color'
import type { Brand, Check } from './tokens'

// A logo is analysed once when it is added: trimmed to its visible pixels, knocked out
// if it sits on a flat background (a JPG on white, say), and its main colour measured
// so the guideline can say where it works and where it needs the reversed version.

export type MarkMode = 'original' | 'white' | 'dark'
export interface LogoInfo {
  img: HTMLCanvasElement        // trimmed, transparent background
  width: number; height: number
  color: string                 // the main colour of the mark
  colors: { hex: string; share: number }[] // colours along the outer edge, most common first
  knockedOut: boolean           // a flat background was removed
  svg: string | null            // original SVG source, kept for the HTML handoff
  fileName: string
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const u = URL.createObjectURL(blob), i = new Image(); i.onload = () => { res(i); setTimeout(() => URL.revokeObjectURL(u), 0) }; i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Logo could not be read')) }; i.src = u })
}

export async function analyseLogo(file: File): Promise<LogoInfo> {
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)
  const svg = isSvg ? await file.text() : null
  const im = await loadImage(file)
  const nw = im.naturalWidth || 1000, nh = im.naturalHeight || 1000
  const k = Math.min(1, 1600 / Math.max(nw, nh)) * (isSvg ? Math.max(1, 1200 / Math.max(nw, nh)) : 1)
  const W = Math.max(1, Math.round(nw * k)), H = Math.max(1, Math.round(nh * k))
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.drawImage(im, 0, 0, W, H)
  const d = x.getImageData(0, 0, W, H), p = d.data

  // Opaque corners on all four sides mean a flat background we should knock out.
  const at = (i: number, j: number) => (j * W + i) * 4
  const corners = [at(0, 0), at(W - 1, 0), at(0, H - 1), at(W - 1, H - 1)]
  const opaque = corners.every(o => p[o + 3] > 250)
  const bg = [0, 1, 2].map(ch => corners.reduce((a, o) => a + p[o + ch], 0) / 4)
  const flat = opaque && corners.every(o => Math.abs(p[o] - bg[0]) + Math.abs(p[o + 1] - bg[1]) + Math.abs(p[o + 2] - bg[2]) < 30)
  if (flat) {
    for (let o = 0; o < p.length; o += 4) {
      const dist = Math.abs(p[o] - bg[0]) + Math.abs(p[o + 1] - bg[1]) + Math.abs(p[o + 2] - bg[2])
      p[o + 3] = Math.round(Math.min(1, Math.max(0, (dist - 24) / 60)) * p[o + 3])
    }
    x.putImageData(d, 0, 0)
  }

  // Trim, and bucket the colours along the mark's outer edge: those are what meet the background.
  // A detail enclosed by the mark (a dot inside a square) does not affect legibility on the page.
  let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>()
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const o = at(i, j)
    if (p[o + 3] > 200) {
      if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j
      const edge = i === 0 || j === 0 || i === W - 1 || j === H - 1 || p[at(i - 1, j) + 3] < 128 || p[at(i + 1, j) + 3] < 128 || p[at(i, j - 1) + 3] < 128 || p[at(i, j + 1) + 3] < 128
      if (!edge) continue
      const key = ((p[o] >> 5) << 6) | ((p[o + 1] >> 5) << 3) | (p[o + 2] >> 5)
      const bk = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 }
      bk.r += p[o]; bk.g += p[o + 1]; bk.b += p[o + 2]; bk.n++; buckets.set(key, bk); n++
    } else if (p[o + 3] > 128) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j }
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1 }
  const tw = x1 - x0 + 1, th = y1 - y0 + 1
  const t = document.createElement('canvas'); t.width = tw; t.height = th
  t.getContext('2d')!.drawImage(c, x0, y0, tw, th, 0, 0, tw, th)
  const colors = Array.from(buckets.values()).sort((a, c) => c.n - a.n).slice(0, 6)
    .map(bk => ({ hex: rgbToHex([bk.r / bk.n / 255, bk.g / bk.n / 255, bk.b / bk.n / 255]), share: n ? bk.n / n : 0 }))
  const color = colors[0]?.hex ?? '#000000'
  return { img: t, width: tw, height: th, color, colors, knockedOut: flat, svg, fileName: file.name }
}

/** Worst contrast among the edge colours that make up at least 12% of the outline. Tiny details are ignored. */
export function markContrast(info: LogoInfo | null, fallback: string, bg: string) {
  const main = info ? info.colors.filter(c => c.share >= 0.12) : []
  const list = main.length ? main.map(c => c.hex) : [info?.color ?? fallback]
  return Math.min(...list.map(h => contrast(h, bg)))
}

/** A flat single-colour version of the mark, for reversed and mono use. */
export function monoMark(info: LogoInfo, hex: string): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = info.width; c.height = info.height
  const x = c.getContext('2d')!
  x.drawImage(info.img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = hex; x.fillRect(0, 0, c.width, c.height)
  return c
}

export interface LogoPlacement { bg: string; bgName: string; mode: MarkMode; ratio: number; originalRatio: number; ok: boolean }

/** For each background, which version of the logo to use and whether it clears 3:1 (WCAG non-text contrast). */
export function logoPlacements(b: Brand, info: LogoInfo | null): LogoPlacement[] {
  const bgs: [string, string][] = [[b.surfaces.light, 'Light surface'], [b.roles[0].hex, 'Brand'], [b.surfaces.dark, 'Dark surface'], [b.roles[1].hex, 'Secondary']]
  return bgs.map(([bg, bgName]) => {
    const orig = markContrast(info, b.roles[0].hex, bg), white = contrast('#ffffff', bg), dark = contrast(b.surfaces.inkOnLight, bg)
    // Keep the original colours wherever they hold up. Only fall back to a mono version when they do not.
    if (orig >= 3) return { bg, bgName, mode: 'original' as MarkMode, ratio: orig, originalRatio: orig, ok: true }
    const mode: MarkMode = white >= dark ? 'white' : 'dark'
    const ratio = Math.max(white, dark)
    return { bg, bgName, mode, ratio, originalRatio: orig, ok: ratio >= 3 }
  })
}

export function logoChecks(b: Brand, info: LogoInfo | null): Check[] {
  if (!info) return [{ ok: true, text: 'Logo contrast: add a logo to check it against the palette' }]
  return logoPlacements(b, info).map(p => ({
    ok: p.ok,
    text: p.mode === 'original'
      ? `Logo on ${p.bgName.toLowerCase()}: full colour holds at ${p.ratio.toFixed(2)}:1`
      : `Logo on ${p.bgName.toLowerCase()}: full colour is ${p.originalRatio.toFixed(2)}:1, use the ${p.mode === 'white' ? 'reversed white' : 'dark mono'} version (${p.ratio.toFixed(2)}:1)${p.ok ? '' : ', still under 3:1'}`,
  }))
}

export const toDataUrl = (c: HTMLCanvasElement) => c.toDataURL('image/png')
