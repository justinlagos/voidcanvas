import { RAMP_STEPS, approxCmyk, rgb255, hexToRgb } from './color'
import type { Brand } from './tokens'

// Hand-off formats. Everything is generated locally from the brand.

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand'
const serifish = (f: string) => /serif|garamond|baskerville|lora|playfair|fraunces|cormorant/i.test(f) && !/sans/i.test(f)
const stack = (fam: string, kind: 'text' | 'mono') => `"${fam}", ${kind === 'mono' ? 'ui-monospace, monospace' : serifish(fam) ? 'Georgia, serif' : 'system-ui, sans-serif'}`

function colorEntries(b: Brand): [string, string][] {
  const out: [string, string][] = []
  for (const r of [...b.roles, ...b.semantic]) { out.push([r.id, r.hex]); for (const s of RAMP_STEPS) out.push([`${r.id}-${s}`, r.ramp[s]]) }
  for (const s of RAMP_STEPS) out.push([`neutral-${s}`, b.neutral[s]])
  out.push(['surface-light', b.surfaces.light], ['surface-dark', b.surfaces.dark], ['ink', b.surfaces.inkOnLight])
  return out
}

export function toCss(b: Brand): string {
  const L: string[] = [`/* ${b.name} brand tokens */`, ':root {']
  for (const [k, v] of colorEntries(b)) L.push(`  --color-${k}: ${v};`)
  L.push(`  --font-heading: ${stack(b.fonts.heading.family, 'text')};`, `  --font-body: ${stack(b.fonts.body.family, 'text')};`, `  --font-mono: ${stack(b.fonts.mono.family, 'mono')};`)
  for (const s of b.scale) { const k = s.label.toLowerCase(); L.push(`  --text-${k}: ${s.rem}rem;`, `  --leading-${k}: ${s.lineHeight};`, `  --tracking-${k}: ${s.tracking}em;`, `  --weight-${k}: ${s.weight};`) }
  b.spacing.forEach((v, i) => L.push(`  --space-${i + 1}: ${v / 16}rem;`))
  L.push(`  --radius: ${b.radius >= 999 ? '9999px' : b.radius + 'px'};`, '}')
  return L.join('\n')
}

export function toTailwind(b: Brand): string {
  const colors: Record<string, unknown> = {}
  for (const r of [...b.roles, ...b.semantic]) { const o: Record<string, string> = { DEFAULT: r.hex }; for (const s of RAMP_STEPS) o[s] = r.ramp[s]; colors[r.id] = o }
  const n: Record<string, string> = {}; for (const s of RAMP_STEPS) n[s] = b.neutral[s]; colors.neutral = n
  colors.surface = { light: b.surfaces.light, dark: b.surfaces.dark }; colors.ink = b.surfaces.inkOnLight
  const fontSize: Record<string, [string, Record<string, string>]> = {}
  for (const s of b.scale) fontSize[s.label.toLowerCase()] = [`${s.rem}rem`, { lineHeight: String(s.lineHeight), letterSpacing: `${s.tracking}em`, fontWeight: String(s.weight) }]
  const cfg = { theme: { extend: { colors, fontFamily: { heading: [b.fonts.heading.family], body: [b.fonts.body.family], mono: [b.fonts.mono.family] }, fontSize, borderRadius: { brand: b.radius >= 999 ? '9999px' : `${b.radius}px` } } } }
  return `// ${b.name}: tailwind.config.js\nmodule.exports = ${JSON.stringify(cfg, null, 2)}\n`
}

/** Design Tokens Community Group format. */
export function toJson(b: Brand): string {
  const color: Record<string, unknown> = {}
  for (const [k, v] of colorEntries(b)) color[k] = { $type: 'color', $value: v }
  const typography: Record<string, unknown> = {}
  for (const s of b.scale) typography[s.label.toLowerCase()] = { $type: 'typography', $value: { fontFamily: s.family === 'heading' ? b.fonts.heading.family : b.fonts.body.family, fontSize: `${s.px}px`, fontWeight: s.weight, lineHeight: s.lineHeight, letterSpacing: `${s.tracking}em` } }
  const spacing: Record<string, unknown> = {}; b.spacing.forEach((v, i) => spacing[i + 1] = { $type: 'dimension', $value: `${v}px` })
  return JSON.stringify({ $description: `${b.name} brand tokens`, color, typography, spacing, radius: { $type: 'dimension', $value: `${b.radius}px` } }, null, 2)
}

/** Adobe Swatch Exchange, grouped: roles, semantic, neutral. Opens in Illustrator, Photoshop and InDesign. */
export function toAse(b: Brand): Blob {
  const chunks: Uint8Array[] = []
  const u16 = (n: number) => { const a = new Uint8Array(2); new DataView(a.buffer).setUint16(0, n); return a }
  const u32 = (n: number) => { const a = new Uint8Array(4); new DataView(a.buffer).setUint32(0, n); return a }
  const f32 = (n: number) => { const a = new Uint8Array(4); new DataView(a.buffer).setFloat32(0, n); return a }
  const name = (s: string) => { const a = new Uint8Array(2 + (s.length + 1) * 2); const d = new DataView(a.buffer); d.setUint16(0, s.length + 1); for (let i = 0; i < s.length; i++) d.setUint16(2 + i * 2, s.charCodeAt(i)); return a }
  const cat = (parts: Uint8Array[]) => { const n = parts.reduce((a, p) => a + p.length, 0), o = new Uint8Array(n); let i = 0; for (const p of parts) { o.set(p, i); i += p.length } return o }
  let blocks = 0
  const block = (type: number, body: Uint8Array) => { chunks.push(u16(type), u32(body.length), body); blocks++ }
  const group = (title: string, items: [string, string][]) => {
    block(0xc001, name(title))
    for (const [n, hex] of items) { const [r, g, bl] = hexToRgb(hex); block(0x0001, cat([name(n), new TextEncoder().encode('RGB '), f32(r), f32(g), f32(bl), u16(0)])) }
    chunks.push(u16(0xc002), u32(0)); blocks++
  }
  for (const r of b.roles) group(`${b.name} ${r.name}`, [[r.name, r.hex], ...RAMP_STEPS.map(s => [`${r.name} ${s}`, r.ramp[s]] as [string, string])])
  group(`${b.name} Neutral`, RAMP_STEPS.map(s => [`Neutral ${s}`, b.neutral[s]] as [string, string]))
  group(`${b.name} Semantic`, b.semantic.map(r => [r.name, r.hex] as [string, string]))
  const head = cat([new TextEncoder().encode('ASEF'), u16(1), u16(0), u32(blocks)])
  return new Blob([head, ...chunks] as BlobPart[], { type: 'application/octet-stream' })
}

export const colorSpecLine = (hex: string) => { const [r, g, bl] = rgb255(hex), [c, m, y, k] = approxCmyk(hex); return `RGB ${r} ${g} ${bl}   CMYK ${c} ${m} ${y} ${k}` }
export const fileSlug = slug
