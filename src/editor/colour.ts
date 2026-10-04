import type { Doc } from './types'
type Proof = NonNullable<Doc['proof']>
let runtime: Promise<any> | null = null
const engines = new Map<
  string,
  Promise<{ cms: any; rgb: number; printer: number; convert: number; proof: number; lut: Uint8Array }>
>()
const ready = new Map<string, Uint8Array>()
const failed = new Set<string>()
export function profileBytes(profile: string) {
  return Uint8Array.from(atob(profile), (c) => c.charCodeAt(0))
}
export function encodeProfile(bytes: Uint8Array) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...Array.from(bytes.subarray(i, i + 8192)))
  return btoa(s)
}
async function moduleCms() {
  if (!runtime)
    runtime = import(/* webpackIgnore:true */ String('/colour/lcms.js'))
      .then((m) => m.instantiate({ locateFile: () => '/colour/lcms.wasm' }))
      .catch((e) => {
        runtime = null
        throw e
      })
  return runtime
}
export async function colourEngine(p: Proof) {
  const key = p.profile + '|' + p.intent
  const hit = engines.get(key)
  if (hit) return hit
  const pending = (async () => {
    const bytes = profileBytes(p.profile)
    if (
      bytes.length < 128 ||
      bytes.length > 8e6 ||
      String.fromCharCode(...Array.from(bytes.slice(36, 40))) !== 'acsp'
    )
      throw Error('Choose a valid ICC printer profile, up to 8 MB.')
    const m = await moduleCms(),
      printer = m.cmsOpenProfileFromMem(bytes, bytes.length)
    if (!printer) throw Error('The ICC profile could not be opened.')
    if (m.cmsGetColorSpaceASCII(printer) !== 'CMYK') {
      m.cmsCloseProfile(printer)
      throw Error('The output profile must describe CMYK printer colours.')
    }
    const rgb = m.cmsCreate_sRGBProfile(),
      rgbFormat = m.cmsFormatterForColorspaceOfProfile(rgb, 1, false),
      cmykFormat = m.cmsFormatterForColorspaceOfProfile(printer, 1, false)
    const convert = m.cmsCreateTransform(rgb, rgbFormat, printer, cmykFormat, p.intent, 0x2000)
    const proof = m.cmsCreateProofingTransform(
      rgb,
      rgbFormat,
      rgb,
      rgbFormat,
      printer,
      p.intent,
      p.intent,
      0x4000 | 0x2000,
    )
    if (!convert || !proof) {
      if (convert) m.cmsDeleteTransform(convert)
      if (proof) m.cmsDeleteTransform(proof)
      m.cmsCloseProfile(rgb)
      m.cmsCloseProfile(printer)
      throw Error('The printer profile does not support this transform.')
    }
    const grid = new Uint8Array(33 * 33 * 33 * 3)
    let i = 0
    for (let r = 0; r < 33; r++)
      for (let g = 0; g < 33; g++)
        for (let b = 0; b < 33; b++) {
          grid[i++] = Math.round((r * 255) / 32)
          grid[i++] = Math.round((g * 255) / 32)
          grid[i++] = Math.round((b * 255) / 32)
        }
    const lut = m.cmsDoTransform(proof, grid, 33 ** 3) as Uint8Array
    ready.set(key, lut)
    window.dispatchEvent(new Event('vc:proof-ready'))
    return { cms: m, rgb, printer, convert, proof, lut }
  })()
  engines.set(key, pending)
  pending.catch(() => engines.delete(key))
  // Profile changes release old native handles; at most two printer transforms are retained.
  if (engines.size > 2) {
    const old = Array.from(engines.keys())[0],
      v = engines.get(old)!
    engines.delete(old)
    ready.delete(old)
    v.then((e) => {
      e.cms.cmsDeleteTransform(e.convert)
      e.cms.cmsDeleteTransform(e.proof)
      e.cms.cmsCloseProfile(e.rgb)
      e.cms.cmsCloseProfile(e.printer)
    }).catch(() => {})
  }
  return pending
}
export function softProof(src: HTMLCanvasElement, p?: Proof): HTMLCanvasElement {
  if (!p?.enabled) return src
  const lut = ready.get(p.profile + '|' + p.intent)
  if (!lut) {
    const key = p.profile + '|' + p.intent
    if (failed.has(key)) return src
    colourEngine(p).catch((e) => {
      failed.add(key)
      window.dispatchEvent(new CustomEvent('vc:proof-error', { detail: String(e.message ?? e) }))
    })
    return src
  }
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = src.height
  const x = c.getContext('2d')!,
    im = src.getContext('2d')!.getImageData(0, 0, c.width, c.height),
    d = im.data
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue
    const r = (d[i] * 32) / 255,
      g = (d[i + 1] * 32) / 255,
      b = (d[i + 2] * 32) / 255,
      r0 = Math.floor(r),
      g0 = Math.floor(g),
      b0 = Math.floor(b),
      fr = r - r0,
      fg = g - g0,
      fb = b - b0
    const base = (r0 * 33 * 33 + g0 * 33 + b0) * 3,
      dr = (Math.min(32, r0 + 1) - r0) * 33 * 33 * 3,
      dg = (Math.min(32, g0 + 1) - g0) * 33 * 3,
      db = (Math.min(32, b0 + 1) - b0) * 3
    const w000 = (1 - fr) * (1 - fg) * (1 - fb),
      w001 = (1 - fr) * (1 - fg) * fb,
      w010 = (1 - fr) * fg * (1 - fb),
      w011 = (1 - fr) * fg * fb,
      w100 = fr * (1 - fg) * (1 - fb),
      w101 = fr * (1 - fg) * fb,
      w110 = fr * fg * (1 - fb),
      w111 = fr * fg * fb
    for (let ch = 0; ch < 3; ch++) {
      const j = base + ch
      d[i + ch] =
        lut[j] * w000 +
        lut[j + db] * w001 +
        lut[j + dg] * w010 +
        lut[j + dg + db] * w011 +
        lut[j + dr] * w100 +
        lut[j + dr + db] * w101 +
        lut[j + dr + dg] * w110 +
        lut[j + dr + dg + db] * w111
    }
  }
  x.putImageData(im, 0, 0)
  return c
}
export async function cmykPixels(src: HTMLCanvasElement, p: Proof) {
  const e = await colourEngine(p),
    im = src.getContext('2d')!.getImageData(0, 0, src.width, src.height).data,
    out = new Uint8Array(src.width * src.height * 4)
  for (let start = 0; start < src.width * src.height; start += 32768) {
    const n = Math.min(32768, src.width * src.height - start),
      rgb = new Uint8Array(n * 3)
    for (let j = 0; j < n; j++) {
      const i = (start + j) * 4,
        a = im[i + 3] / 255
      for (let ch = 0; ch < 3; ch++) rgb[j * 3 + ch] = Math.round(im[i + ch] * a + 255 * (1 - a))
    }
    out.set(e.cms.cmsDoTransform(e.convert, rgb, n), start * 4)
    await new Promise((r) => setTimeout(r, 0))
  }
  return out
}
