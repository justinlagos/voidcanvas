// Font intelligence: what kind of face a family name is, and what stands in for it when it is
// missing. Classification comes from a table of common families plus the words in the name
// ("Condensed", "Serif", "Mono"), so a PSD set in Gotham Bold gets a geometric sans, not Inter.

export type FontClass = 'grotesk' | 'geometric' | 'humanist' | 'serif' | 'slab' | 'didone' | 'display' | 'script' | 'mono' | 'condensed'
export type Width = 'condensed' | 'normal' | 'wide'
export interface FontInfo { family: string; cls: FontClass; width: Width; weight: number }

const T: Record<string, [FontClass, Width?]> = {
  // Available in Voidcanvas (Google Fonts)
  Inter: ['grotesk'], Poppins: ['geometric'], Montserrat: ['geometric'], 'Space Grotesk': ['grotesk'], 'DM Sans': ['geometric'], 'Archivo Black': ['display', 'wide'],
  'Bebas Neue': ['condensed', 'condensed'], Oswald: ['condensed', 'condensed'], Anton: ['condensed', 'condensed'], 'Playfair Display': ['didone'], 'DM Serif Display': ['didone'],
  Lora: ['serif'], Fraunces: ['serif'], Caveat: ['script'], 'Permanent Marker': ['script'], 'JetBrains Mono': ['mono'],
  Manrope: ['geometric'], 'IBM Plex Sans': ['grotesk'], 'IBM Plex Mono': ['mono'], 'DM Mono': ['mono'], 'Space Mono': ['mono'], Nunito: ['geometric'], Fredoka: ['geometric'],
  'Bricolage Grotesque': ['grotesk'], 'Work Sans': ['grotesk'], 'Source Sans 3': ['humanist'], 'Cormorant Garamond': ['serif'], Archivo: ['grotesk'], Syne: ['display', 'wide'],
  'Instrument Serif': ['serif'], 'Libre Baskerville': ['serif'], 'EB Garamond': ['serif'], Outfit: ['geometric'], Sora: ['geometric'],
  // Common in client files
  Helvetica: ['grotesk'], 'Helvetica Neue': ['grotesk'], Arial: ['grotesk'], Roboto: ['grotesk'], 'Open Sans': ['humanist'], Lato: ['humanist'], 'Segoe UI': ['humanist'], Calibri: ['humanist'],
  Verdana: ['humanist', 'wide'], Tahoma: ['humanist'], 'Franklin Gothic': ['grotesk'], Univers: ['grotesk'], Akzidenz: ['grotesk'], 'Akzidenz-Grotesk': ['grotesk'], 'Neue Haas Grotesk': ['grotesk'], Aktiv: ['grotesk'],
  Futura: ['geometric'], Gotham: ['geometric'], 'Proxima Nova': ['geometric'], Avenir: ['geometric'], 'Avenir Next': ['geometric'], Circular: ['geometric'], Gilroy: ['geometric'], Raleway: ['geometric'], Museo: ['geometric'], 'Museo Sans': ['geometric'], Brandon: ['geometric'], 'Brandon Grotesque': ['geometric'], Avant: ['geometric'], 'ITC Avant Garde': ['geometric'], Century: ['geometric'], 'Century Gothic': ['geometric'], Quicksand: ['geometric'], Comfortaa: ['geometric'],
  'Myriad Pro': ['humanist'], Myriad: ['humanist'], Frutiger: ['humanist'], 'Gill Sans': ['humanist'], Optima: ['humanist'], 'Fira Sans': ['humanist'], 'PT Sans': ['humanist'], Ubuntu: ['humanist'], 'Noto Sans': ['humanist'],
  Georgia: ['serif'], 'Times New Roman': ['serif'], Times: ['serif'], Garamond: ['serif'], 'Adobe Garamond': ['serif'], Baskerville: ['serif'], Caslon: ['serif'], Minion: ['serif'], 'Minion Pro': ['serif'], Palatino: ['serif'], Cambria: ['serif'], Merriweather: ['serif'], 'PT Serif': ['serif'], 'Crimson Text': ['serif'], 'Source Serif': ['serif'], Tiempos: ['serif'], Freight: ['serif'], 'Freight Text': ['serif'],
  Bodoni: ['didone'], Didot: ['didone'], 'Big Caslon': ['didone'], Abril: ['didone'], 'Abril Fatface': ['didone'], Prata: ['didone'],
  Rockwell: ['slab'], 'Roboto Slab': ['slab'], Clarendon: ['slab'], Arvo: ['slab'], Bitter: ['slab'], Zilla: ['slab'], 'Zilla Slab': ['slab'], Sentinel: ['slab'], Archer: ['slab'], Courier: ['mono'], 'Courier New': ['mono'], Consolas: ['mono'], Menlo: ['mono'], Monaco: ['mono'], 'Fira Code': ['mono'], 'Source Code Pro': ['mono'], 'Roboto Mono': ['mono'], 'SF Mono': ['mono'],
  Impact: ['condensed', 'condensed'], 'Druk': ['condensed', 'condensed'], 'Tungsten': ['condensed', 'condensed'], 'Knockout': ['condensed', 'condensed'], 'League Gothic': ['condensed', 'condensed'], 'Roboto Condensed': ['condensed', 'condensed'], 'Barlow Condensed': ['condensed', 'condensed'], 'Fjalla One': ['condensed', 'condensed'],
  'Brush Script': ['script'], 'Brush Script MT': ['script'], Pacifico: ['script'], Lobster: ['script'], 'Dancing Script': ['script'], 'Great Vibes': ['script'], Satisfy: ['script'], 'Kaushan Script': ['script'], Allura: ['script'], Sacramento: ['script'], 'Comic Sans MS': ['script'],
  Cooper: ['display'], 'Cooper Black': ['display', 'wide'], Recoleta: ['display'], 'Eurostile': ['display', 'wide'], 'Bank Gothic': ['display', 'wide'], Monument: ['display', 'wide'], 'Monument Extended': ['display', 'wide'], 'Chivo': ['grotesk'], 'Trade Gothic': ['grotesk'],
}
const WORKHORSE: Record<FontClass, string> = { grotesk: 'Inter', geometric: 'DM Sans', humanist: 'Source Sans 3', serif: 'Lora', slab: 'Lora', didone: 'Playfair Display', display: 'Archivo Black', script: 'Caveat', mono: 'JetBrains Mono', condensed: 'Oswald' }
const SAME_GROUP: Record<FontClass, FontClass[]> = {
  grotesk: ['grotesk', 'humanist', 'geometric'], geometric: ['geometric', 'grotesk', 'humanist'], humanist: ['humanist', 'grotesk', 'geometric'],
  serif: ['serif', 'slab', 'didone'], slab: ['slab', 'serif'], didone: ['didone', 'serif'], display: ['display', 'geometric', 'grotesk'], script: ['script', 'display'], mono: ['mono'], condensed: ['condensed', 'display', 'grotesk'],
}

/** Strip the style words off a PostScript-ish name and read them. */
export function classifyFontName(name: string): FontInfo {
  // "HelveticaNeueLTStd-BdCn" reads as "Helvetica Neue LT Std Bd Cn": PostScript names carry their style as abbreviations.
  const raw = name.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2').replace(/\s+/g, ' ').trim()
  const lower = raw.toLowerCase()
  const weight = /\b(black|blk|heavy|hv|ultra|extra ?bold|extrabold|xbd|xb)\b/.test(lower) ? 800 : /\b(bold|bd)\b/.test(lower) ? 700 : /\b(semi ?bold|demi ?bold|demi|sb|db)\b/.test(lower) ? 600 : /\b(medium|md)\b/.test(lower) ? 500 : /\b(light|lt|thin|th|hairline|extra ?light|xlt|el)\b/.test(lower) ? 300 : 400
  const widthWord: Width | null = /\b(condensed|narrow|compressed|cond|cn|cd|comp|nar)\b/.test(lower) ? 'condensed' : /\b(extended|expanded|wide|ext|exp|xt)\b/.test(lower) ? 'wide' : null
  // Longest table key that the name starts with (so "Helvetica Neue LT Std" finds Helvetica Neue).
  let hit: string | null = null
  for (const k of Object.keys(T)) { const kl = k.toLowerCase(); if ((lower === kl || lower.startsWith(kl + ' ') || lower.includes(' ' + kl) || lower.startsWith(kl)) && (!hit || k.length > hit.length)) hit = k }
  let cls: FontClass, width: Width
  if (hit) { cls = T[hit][0]; width = widthWord ?? T[hit][1] ?? 'normal' }
  else {
    cls = /\bmono|code|courier\b/.test(lower) ? 'mono' : /\bscript|hand|brush|marker|signature\b/.test(lower) ? 'script' : /\bslab|egyptian\b/.test(lower) ? 'slab' : /\bdidone|modern|fatface\b/.test(lower) ? 'didone' : /\bserif|roman|garamond|antiqua|book\b/.test(lower) && !/\bsans\b/.test(lower) ? 'serif' : widthWord === 'condensed' ? 'condensed' : /\bdisplay|poster|headline|black\b/.test(lower) ? 'display' : /\bgeo|round|circle\b/.test(lower) ? 'geometric' : 'grotesk'
    width = widthWord ?? (cls === 'condensed' ? 'condensed' : 'normal')
  }
  if (widthWord === 'condensed' && cls !== 'mono' && cls !== 'script') cls = 'condensed'
  return { family: raw, cls, width, weight }
}

export interface FontSuggestion { closest: string; safer: string; ranked: { family: string; score: number; why: string }[]; missing: FontInfo }

/** Replacements from the families the app can load, best first, with a plain reason. */
export function suggestReplacements(missing: string, available: string[]): FontSuggestion {
  const m = classifyFontName(missing)
  const groups = SAME_GROUP[m.cls]
  const ranked = available.filter(f => f !== missing).map(family => {
    const a = classifyFontName(family)
    let score = 0
    const gi = groups.indexOf(a.cls)
    if (a.cls === m.cls) score += 5; else if (gi > 0) score += 3 - gi * 0.5; else score -= 3
    if (a.width === m.width) score += 1.5; else if (m.width === 'condensed' || a.width === 'condensed') score -= 2
    // Display faces should only stand in for display faces.
    if (a.cls === 'display' && m.cls !== 'display' && m.cls !== 'condensed') score -= 2
    const why = a.cls === m.cls ? `Same kind of face (${CLASS_WORD[a.cls]})${a.width === m.width ? ', same width' : ''}.` : gi > 0 ? `Close: ${CLASS_WORD[a.cls]} for a ${CLASS_WORD[m.cls]}.` : `Different kind of face (${CLASS_WORD[a.cls]}).`
    return { family, score, why }
  }).sort((x, y) => y.score - x.score)
  const closest = ranked[0]?.family ?? WORKHORSE[m.cls]
  const safer = available.includes(WORKHORSE[m.cls]) ? WORKHORSE[m.cls] : available.includes('Inter') ? 'Inter' : closest
  return { closest, safer, ranked, missing: m }
}

export const CLASS_WORD: Record<FontClass, string> = { grotesk: 'neutral sans', geometric: 'geometric sans', humanist: 'humanist sans', serif: 'serif', slab: 'slab serif', didone: 'high-contrast serif', display: 'display face', script: 'script', mono: 'monospace', condensed: 'condensed sans' }
