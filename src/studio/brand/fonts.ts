import type { FontRef } from './tokens'

// Google fonts load from Google. Uploaded fonts are registered with FontFace from the
// file bytes, so they stay on this device and their names are never sent anywhere.

const google = new Map<string, Promise<void>>()
const local = new Map<string, { face: FontFace; bytes: ArrayBuffer; format: string }>()

function linkOnce(href: string) {
  return new Promise<boolean>(res => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href
    l.onload = () => res(true); l.onerror = () => { l.remove(); res(false) }
    setTimeout(() => res(true), 3000)
    document.head.appendChild(l)
  })
}

function loadGoogle(family: string) {
  if (!google.has(family)) {
    const fam = family.trim().replace(/ /g, '+')
    google.set(family, (async () => {
      // Ask for the weights the guideline uses. Single-weight families reject that, so fall back.
      const ok = await linkOnce(`https://fonts.googleapis.com/css2?family=${fam}:wght@400;500;600;700&display=swap`)
      if (!ok) await linkOnce(`https://fonts.googleapis.com/css2?family=${fam}&display=swap`)
    })())
  }
  return google.get(family)!
}

export async function loadFont(f: FontRef, weights = [400, 600, 700]) {
  if (typeof document === 'undefined') return
  if (f.source === 'google') await loadGoogle(f.family)
  await Promise.all(weights.map(w => document.fonts.load(`${w} 32px "${f.family}"`).catch(() => null)))
}

export async function registerLocalFont(file: File): Promise<FontRef> {
  const family = file.name.replace(/\.(woff2?|otf|ttf)$/i, '').replace(/[-_]+/g, ' ').replace(/\b(regular|variable|vf)\b/gi, '').trim() || 'Custom font'
  const bytes = await file.arrayBuffer()
  const face = new FontFace(family, bytes, { weight: '100 900' })
  await face.load()
  document.fonts.add(face)
  const ext = (file.name.split('.').pop() || 'woff2').toLowerCase()
  local.set(family, { face, bytes, format: ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext })
  return { family, source: 'local' }
}

export const cssFamily = (f: FontRef, fallback: 'sans' | 'serif' | 'mono' = 'sans') =>
  `"${f.family}", ${fallback === 'mono' ? 'ui-monospace, monospace' : fallback === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif'}`

/** @font-face rule with the file inlined, for exports that must work offline. */
export function localFontFace(family: string): string | null {
  const f = local.get(family); if (!f) return null
  const u8 = new Uint8Array(f.bytes); let bin = ''
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + 0x8000)))
  const mime = f.format === 'truetype' ? 'font/ttf' : f.format === 'opentype' ? 'font/otf' : `font/${f.format}`
  return `@font-face{font-family:"${family}";src:url(data:${mime};base64,${btoa(bin)}) format("${f.format}");font-weight:100 900;font-display:swap}`
}

const b64 = (buf: ArrayBuffer) => { const u8 = new Uint8Array(buf); let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + 0x8000))); return btoa(bin) }

/**
 * Google families as @font-face rules with the font files inlined, so an export works offline.
 * Only the latin subset is kept (the guideline is in English and the file stays small). Returns null
 * for any family that could not be fetched, so the caller can fall back to a link.
 */
export async function inlineGoogleFontFaces(families: string[], weights = [400, 600, 700]): Promise<{ css: string; missing: string[] }> {
  const out: string[] = [], missing: string[] = []
  for (const family of families) {
    try {
      const fam = family.trim().replace(/ /g, '+')
      let res = await fetch(`https://fonts.googleapis.com/css2?family=${fam}:wght@${weights.join(';')}&display=swap`)
      if (!res.ok) res = await fetch(`https://fonts.googleapis.com/css2?family=${fam}&display=swap`)
      if (!res.ok) throw new Error(String(res.status))
      const css = await res.text()
      // Blocks are "/* latin */ @font-face {...}". Keep latin and latin-ext only.
      const blocks = css.split(/(?=\/\* [a-z-]+ \*\/)/).filter(b => /^\/\* latin(-ext)? \*\//.test(b.trim()))
      const chosen = blocks.length ? blocks : css.split(/(?=@font-face)/).filter(b => b.includes('@font-face'))
      const rules: string[] = []
      for (const block of chosen) {
        const m = block.match(/url\((https:[^)]+)\)\s*format\('([^']+)'\)/)
        if (!m) continue
        const fr = await fetch(m[1]); if (!fr.ok) throw new Error(String(fr.status))
        const mime = m[2] === 'woff2' ? 'font/woff2' : m[2] === 'woff' ? 'font/woff' : 'font/ttf'
        rules.push(block.replace(/\/\* [a-z-]+ \*\/\s*/g, '').replace(m[1], `data:${mime};base64,${b64(await fr.arrayBuffer())}`).trim())
      }
      if (!rules.length) throw new Error('no faces')
      out.push(rules.join('\n'))
    } catch { missing.push(family) }
  }
  return { css: out.join('\n'), missing }
}
