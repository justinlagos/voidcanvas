import type { Doc, Frame } from './types'

// Pure helpers for export: which boards, what size, what the files are called.
// Kept free of the canvas so they can be unit tested.

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'pdf'

/** Browsers refuse canvases past these limits (Chrome and Safari are the tightest). */
export const MAX_SIDE = 16384
export const MAX_AREA = 16384 * 16384 * 0.25 // ~67 MP, safe on Safari and phones

/** The boards of a design, or one pseudo-board for a design without boards. */
export function exportBoards(doc: Doc): Frame[] {
  if (doc.frames?.length) return doc.frames
  return [{ id: '__doc', name: doc.name, x: 0, y: 0, width: doc.width, height: doc.height, background: doc.background }]
}

/**
 * Parse a page list like "1-3, 5, 8-" against n boards. Returns 0-based indexes in the order
 * written, without repeats. Numbers outside 1..n are dropped. Returns null when nothing valid.
 */
export function parseRange(input: string, n: number): number[] | null {
  const out: number[] = []
  const seen = new Set<number>()
  const add = (i: number) => { if (i >= 0 && i < n && !seen.has(i)) { seen.add(i); out.push(i) } }
  for (const raw of input.split(/[,;\s]+/)) {
    const part = raw.trim(); if (!part) continue
    const m = /^(\d*)\s*[-–]\s*(\d*)$/.exec(part)
    if (m && (m[1] || m[2])) {
      const a = m[1] ? parseInt(m[1], 10) : 1, b = m[2] ? parseInt(m[2], 10) : n
      const lo = Math.min(a, b), hi = Math.max(a, b)
      const list: number[] = []
      for (let i = lo; i <= Math.min(hi, n); i++) list.push(i - 1)
      ;(a <= b ? list : list.reverse()).forEach(add)
    } else if (/^\d+$/.test(part)) add(parseInt(part, 10) - 1)
    else return null
  }
  return out.length ? out : null
}

/** Write a set of 0-based indexes back as a compact page list: [0,1,2,4] becomes "1-3, 5". */
export function formatRange(idx: number[]): string {
  const s = Array.from(new Set(idx)).sort((a, b) => a - b)
  const parts: string[] = []
  for (let i = 0; i < s.length; i++) {
    let j = i
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++
    parts.push(j > i ? `${s[i] + 1}-${s[j] + 1}` : `${s[i] + 1}`)
    i = j
  }
  return parts.join(', ')
}

/** Largest scale every chosen board can be rendered at. */
export function maxScale(boards: { width: number; height: number }[]): number {
  let k = Infinity
  for (const b of boards) k = Math.min(k, MAX_SIDE / Math.max(b.width, b.height), Math.sqrt(MAX_AREA / (b.width * b.height)))
  return Number.isFinite(k) ? k : 1
}

/** The size buttons to offer: 0.5x only when 1x does not fit, and never above the browser limit. */
export function scaleOptions(boards: { width: number; height: number }[]): number[] {
  const top = maxScale(boards)
  const opts = [1, 2, 3, 4].filter(k => k <= top + 1e-9)
  if (!opts.length) {
    const k = Math.floor(top * 100) / 100
    return [Math.max(0.05, k)]
  }
  return opts
}

const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim()

export const extFor = (f: ExportFormat) => (f === 'jpeg' ? 'jpg' : f)

/** File name for one board: "01 Square post 1080x1080.png". Numbers keep the order in a zip. */
export function boardFileName(b: { name: string; width: number; height: number }, index: number, total: number, format: ExportFormat, scale: number, numbered = true): string {
  const digits = String(total).length < 2 ? 2 : String(total).length
  const w = Math.round(b.width * scale), h = Math.round(b.height * scale)
  const name = clean(b.name) || 'Board'
  const sizeTag = name.includes(`${w}x${h}`) || name.includes(`${w}×${h}`) ? '' : ` ${w}x${h}`
  return `${numbered ? String(index + 1).padStart(digits, '0') + ' ' : ''}${name}${sizeTag}.${extFor(format)}`
}

/** Make names unique inside a zip. */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>()
  return names.map(n => {
    const c = seen.get(n) ?? 0
    seen.set(n, c + 1)
    if (!c) return n
    const dot = n.lastIndexOf('.')
    return dot > 0 ? `${n.slice(0, dot)} (${c + 1})${n.slice(dot)}` : `${n} (${c + 1})`
  })
}

/**
 * PDF page size in points for a board. Big boards are print work at 300 dpi, screen boards at
 * 96 dpi, the same rule single-page exports have always used.
 */
export function pdfPageSize(b: { width: number; height: number }): { w: number; h: number; dpi: number } {
  const dpi = Math.max(b.width, b.height) > 2000 ? 300 : 96
  return { w: (b.width / dpi) * 72, h: (b.height / dpi) * 72, dpi }
}

/** What the primary button says, so the result is never a surprise. */
export function resultLabel(format: ExportFormat, count: number, pdfSplit: boolean): string {
  const F = format === 'jpeg' ? 'JPG' : format.toUpperCase()
  if (format === 'pdf') return count === 1 ? 'Download PDF' : pdfSplit ? `Download ${count} PDFs (zip)` : `Download PDF, ${count} pages`
  return count === 1 ? `Download ${F}` : `Download ${count} ${F}s (zip)`
}
