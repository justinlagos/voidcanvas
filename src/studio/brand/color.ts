// Colour maths for the brand system. Ramps are built in OKLCH so each step has
// even perceived lightness across hues, then clamped back into sRGB.

export type RGB = [number, number, number] // 0..1
export type OKLCH = [number, number, number] // L 0..1, C 0..~0.37, H degrees

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0')
  return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16) / 255) as RGB
}
export function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')
}
export const isHex = (s: string) => /^#([0-9a-f]{6})$/i.test(s.trim())

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)

export function rgbToOklch(rgb: RGB): OKLCH {
  const [r, g, b] = rgb.map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.sqrt(A * A + B * B)
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360
  return [L, C, H]
}

function oklchToLinear([L, C, H]: OKLCH): RGB {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}
const inGamut = (lin: RGB) => lin.every(v => v >= -0.0001 && v <= 1.0001)

/** OKLCH to hex, reducing chroma until the colour fits sRGB. Hue and lightness are kept. */
export function oklchToHex([L, C, H]: OKLCH): string {
  let lo = 0, hi = C
  if (inGamut(oklchToLinear([L, C, H]))) lo = C
  else for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if (inGamut(oklchToLinear([L, mid, H]))) lo = mid; else hi = mid }
  return rgbToHex(oklchToLinear([L, lo, H]).map(v => toGamma(Math.min(1, Math.max(0, v)))) as RGB)
}
export const hexToOklch = (hex: string) => rgbToOklch(hexToRgb(hex))

// ── ramps ──
export const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const
export type RampStep = (typeof RAMP_STEPS)[number]
const RAMP_L: Record<RampStep, number> = { 50: 0.975, 100: 0.94, 200: 0.88, 300: 0.8, 400: 0.71, 500: 0.62, 600: 0.53, 700: 0.44, 800: 0.35, 900: 0.26 }
export type Ramp = Record<RampStep, string>

/** A 50 to 900 ramp around one hue. Chroma eases off at the light and dark ends so tints stay clean. */
export function ramp(hex: string, chromaScale = 1): Ramp {
  const [, C, H] = hexToOklch(hex)
  const out = {} as Ramp
  for (const s of RAMP_STEPS) {
    const L = RAMP_L[s]
    const edge = 1 - Math.pow(Math.abs(L - 0.58) / 0.42, 2) * 0.65
    out[s] = oklchToHex([L, C * chromaScale * edge, H])
  }
  return out
}

/** Which step of a ramp the source colour sits closest to, by lightness. */
export function nearestStep(hex: string): RampStep {
  const L = hexToOklch(hex)[0]
  return RAMP_STEPS.reduce((best, s) => (Math.abs(RAMP_L[s] - L) < Math.abs(RAMP_L[best] - L) ? s : best), 500 as RampStep)
}

// ── contrast (WCAG 2.x relative luminance) ──
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a: string, b: string) {
  const la = luminance(a), lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
export type Grade = 'AAA' | 'AA' | 'AA large' | 'Fail'
export function grade(ratio: number): Grade {
  return ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : 'Fail'
}
/** Whichever of the two inks reads better on the background. */
export const bestInk = (bg: string, light: string, dark: string) => (contrast(bg, light) >= contrast(bg, dark) ? light : dark)

// ── print reference ──
/** Naive device CMYK. No ICC profile, so treat as a starting point for the printer, not a spec. */
export function approxCmyk(hex: string): [number, number, number, number] {
  const [r, g, b] = hexToRgb(hex)
  const k = 1 - Math.max(r, g, b)
  if (k >= 0.999) return [0, 0, 0, 100]
  return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map(v => Math.round(v * 100)) as [number, number, number, number]
}
export const rgb255 = (hex: string) => hexToRgb(hex).map(v => Math.round(v * 255)) as [number, number, number]
export const fmtOklch = (hex: string) => { const [l, c, h] = hexToOklch(hex); return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})` }
