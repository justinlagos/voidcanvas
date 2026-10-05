import { profileBytes } from './colour'
import type { CmykColour, DocumentColourSettings, RgbColour } from './document-colour'

let runtime: Promise<any> | null = null
const engines = new Map<string, Promise<NativeIccEngine>>()

async function cmsModule() {
  if (!runtime) runtime = import(/* webpackIgnore:true */ String('/colour/lcms.js'))
    .then(m => m.instantiate({ locateFile: () => '/colour/lcms.wasm' }))
    .catch(e => { runtime = null; throw e })
  return runtime
}

export interface NativeIccEngine {
  cms: any
  rgb: number
  cmyk: number
  rgbToCmyk: number
  cmykToRgb: number
  close(): void
}

const intentNumber = (settings: Pick<DocumentColourSettings, 'intent'>) => settings.intent === 'perceptual' ? 0 : 1
const BPC = 0x2000

/**
 * Bidirectional transform for an editable CMYK working profile. Unlike the proof path, this returns native CMYK
 * channel values as well as display RGB values, so stored values do not have to round-trip through hex colours.
 */
export async function nativeIccEngine(settings: DocumentColourSettings): Promise<NativeIccEngine> {
  if (settings.model !== 'cmyk' || !settings.profile) throw Error('A CMYK document needs an embedded ICC working profile.')
  const key = `${settings.profile}|${settings.intent}|${settings.blackPointCompensation ? 1 : 0}`
  const hit = engines.get(key); if (hit) return hit
  const pending = (async () => {
    const bytes = profileBytes(settings.profile!)
    if (bytes.length < 128 || bytes.length > 8e6 || String.fromCharCode(...Array.from(bytes.slice(36, 40))) !== 'acsp') throw Error('The working profile is not a valid ICC profile.')
    const cms = await cmsModule()
    const cmyk = cms.cmsOpenProfileFromMem(bytes, bytes.length)
    if (!cmyk) throw Error('The CMYK working profile could not be opened.')
    if (cms.cmsGetColorSpaceASCII(cmyk) !== 'CMYK') { cms.cmsCloseProfile(cmyk); throw Error('The working profile must describe CMYK colours.') }
    const rgb = cms.cmsCreate_sRGBProfile()
    const rgbFormat = cms.cmsFormatterForColorspaceOfProfile(rgb, 1, false)
    const cmykFormat = cms.cmsFormatterForColorspaceOfProfile(cmyk, 1, false)
    const flags = settings.blackPointCompensation ? BPC : 0
    const intent = intentNumber(settings)
    const rgbToCmyk = cms.cmsCreateTransform(rgb, rgbFormat, cmyk, cmykFormat, intent, flags)
    const cmykToRgb = cms.cmsCreateTransform(cmyk, cmykFormat, rgb, rgbFormat, intent, flags)
    if (!rgbToCmyk || !cmykToRgb) {
      if (rgbToCmyk) cms.cmsDeleteTransform(rgbToCmyk)
      if (cmykToRgb) cms.cmsDeleteTransform(cmykToRgb)
      cms.cmsCloseProfile(rgb); cms.cmsCloseProfile(cmyk)
      throw Error('The ICC profile cannot build the required RGB/CMYK transforms.')
    }
    let closed = false
    return {
      cms, rgb, cmyk, rgbToCmyk, cmykToRgb,
      close() {
        if (closed) return; closed = true
        cms.cmsDeleteTransform(rgbToCmyk); cms.cmsDeleteTransform(cmykToRgb)
        cms.cmsCloseProfile(rgb); cms.cmsCloseProfile(cmyk)
        engines.delete(key)
      },
    }
  })()
  engines.set(key, pending); pending.catch(() => engines.delete(key))
  return pending
}

const pct = (n: number) => Math.max(0, Math.min(100, n))
const byte = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

export async function rgbToNativeCmyk(rgb: RgbColour, settings: DocumentColourSettings): Promise<CmykColour> {
  const e = await nativeIccEngine(settings)
  const src = new Uint8Array([byte(rgb.r), byte(rgb.g), byte(rgb.b)])
  const out = e.cms.cmsDoTransform(e.rgbToCmyk, src, 1) as Uint8Array
  return { model: 'cmyk', c: pct(out[0] * 100 / 255), m: pct(out[1] * 100 / 255), y: pct(out[2] * 100 / 255), k: pct(out[3] * 100 / 255), a: rgb.a }
}

export async function cmykToDisplayRgb(cmyk: CmykColour, settings: DocumentColourSettings): Promise<RgbColour> {
  const e = await nativeIccEngine(settings)
  const src = new Uint8Array([
    byte(pct(cmyk.c) * 255 / 100), byte(pct(cmyk.m) * 255 / 100),
    byte(pct(cmyk.y) * 255 / 100), byte(pct(cmyk.k) * 255 / 100),
  ])
  const out = e.cms.cmsDoTransform(e.cmykToRgb, src, 1) as Uint8Array
  return { model: 'rgb', r: out[0], g: out[1], b: out[2], a: cmyk.a }
}

/** Batch conversion used by future native raster tiles; channels are packed 0..255, four bytes per pixel. */
export async function rgbBytesToCmyk(rgb: Uint8Array, settings: DocumentColourSettings) {
  if (rgb.length % 3) throw Error('RGB buffer must contain three bytes per pixel.')
  const e = await nativeIccEngine(settings)
  return e.cms.cmsDoTransform(e.rgbToCmyk, rgb, rgb.length / 3) as Uint8Array
}

export async function cmykBytesToRgb(cmyk: Uint8Array, settings: DocumentColourSettings) {
  if (cmyk.length % 4) throw Error('CMYK buffer must contain four bytes per pixel.')
  const e = await nativeIccEngine(settings)
  return e.cms.cmsDoTransform(e.cmykToRgb, cmyk, cmyk.length / 4) as Uint8Array
}
