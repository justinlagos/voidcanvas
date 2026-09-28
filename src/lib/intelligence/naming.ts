// Names a designer would give things, suggested from what the file is called and what it looks like.

import type { AssetProfile } from './asset'
import type { VariantId } from './logo'

const CAMERA = /^(img|dsc|dscf|dscn|pxl|p\d{6,}|screenshot|screen shot|screen recording|image|photo|picture|untitled|unnamed|download|capture|scan|whatsapp image|file)[\s_\-]*[\d\s_\-().:at]*$/i

/** True for names a camera or a screenshot tool made up. */
export const isMeaningless = (fileName: string) => { const base = fileName.replace(/\.[a-z0-9]+$/i, '').trim(); return !base || CAMERA.test(base) || /^[\da-f\-]{12,}$/i.test(base) || /^\d+$/.test(base) }

const words = (fileName: string) => fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[_\-.]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim()

export function orientation(w: number, h: number): 'Portrait' | 'Landscape' | 'Square' | 'Wide' | 'Tall' {
  const a = w / Math.max(1, h)
  return a > 2.4 ? 'Wide' : a > 1.15 ? 'Landscape' : a < 0.42 ? 'Tall' : a < 0.87 ? 'Portrait' : 'Square'
}

/** Layer name for a picture dropped on the canvas. */
export function suggestImageName(fileName: string, w: number, h: number): string {
  if (!isMeaningless(fileName)) return words(fileName).slice(0, 40)
  return `Image · ${orientation(w, h)}`
}

/** Brand asset name: "Logo / Primary", "Logo / Wordmark / Reversed". */
export function suggestLogoName(fileName: string, p: AssetProfile | null, variant: VariantId = 'primary'): string {
  const name = words(fileName).toLowerCase()
  const hinted: VariantId | null = /\b(white|rev|reverse|reversed|knockout|neg|negative|inverse|inverted)\b/.test(name) ? 'reversed'
    : /\b(mono|black|blk|one[\s-]?colou?r|1c|single)\b/.test(name) ? 'mono-dark'
    : /\b(grey|gray|greyscale|grayscale|bw|b&w)\b/.test(name) ? 'grayscale' : null
  const v = variant !== 'primary' ? variant : hinted ?? (p && p.mono && p.tone === 'light' && !p.chromatic ? 'reversed' : 'primary')
  const form = /\b(icon|symbol|mark|monogram|emblem|badge|bug)\b/.test(name) ? 'Symbol' : /\b(word|wordmark|text|type|logotype)\b/.test(name) ? 'Wordmark' : /\b(horizontal|landscape|wide|lockup)\b/.test(name) ? 'Horizontal' : /\b(stacked|vertical|portrait|square)\b/.test(name) ? 'Stacked'
    : p ? (p.kind === 'mark' ? 'Symbol' : p.kind === 'wordmark' ? 'Wordmark' : p.kind === 'lockup' ? 'Horizontal' : null) : null
  const label = { primary: 'Primary', reversed: 'Reversed', 'mono-dark': 'Mono dark', 'mono-brand': 'One colour', grayscale: 'Greyscale' }[v]
  return form ? `Logo / ${form} / ${label}` : `Logo / ${label}`
}

/** File name for an exported asset: brand, form, variant, size. */
export function assetFileName(brand: string, logoName: string, ext: string) {
  const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s/-]/g, '').trim().replace(/\s*\/\s*/g, '-').replace(/[\s-]+/g, '-')
  return `${slug(brand) || 'brand'}_${slug(logoName)}.${ext}`
}
