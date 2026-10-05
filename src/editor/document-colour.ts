import type { Doc } from './types'

export type WorkingColourModel = 'rgb' | 'cmyk' | 'gray' | 'lab'
export type RenderingIntent = 'perceptual' | 'relative-colorimetric'

/**
 * Working-space identity belongs to the editable document, not only to export. Existing designs omit this and
 * therefore remain sRGB documents until explicitly converted.
 */
export interface DocumentColourSettings {
  model: WorkingColourModel
  /** Base64 ICC bytes for profile-managed spaces. sRGB may omit this and use the built-in profile. */
  profile?: string
  profileName: string
  intent: RenderingIntent
  blackPointCompensation: boolean
  /** Keep neutral/black-only CMYK values on K where the selected profile/transform allows it. */
  preserveBlack?: boolean
  /** Optional production policy, percentage sum of C+M+Y+K. */
  maxInk?: number
}

declare module './types' {
  interface Doc {
    /** Native working colour space. Missing means legacy sRGB. */
    colour?: DocumentColourSettings
  }
}

export interface RgbColour { model: 'rgb'; r: number; g: number; b: number; a?: number }
export interface CmykColour { model: 'cmyk'; c: number; m: number; y: number; k: number; a?: number }
export interface GrayColour { model: 'gray'; gray: number; a?: number }
export interface LabColour { model: 'lab'; l: number; a: number; b: number; alpha?: number }
export type NativeColour = RgbColour | CmykColour | GrayColour | LabColour

export const LEGACY_SRGB: DocumentColourSettings = {
  model: 'rgb',
  profileName: 'sRGB IEC61966-2.1',
  intent: 'relative-colorimetric',
  blackPointCompensation: true,
}

export function documentColour(doc: Pick<Doc, 'colour'>): DocumentColourSettings {
  return doc.colour ?? LEGACY_SRGB
}

export function normalizeChannel(n: number, max = 100) {
  return Math.max(0, Math.min(max, Number.isFinite(n) ? n : 0))
}

export function normalizeNativeColour(v: NativeColour): NativeColour {
  if (v.model === 'rgb') return { ...v, r: normalizeChannel(v.r, 255), g: normalizeChannel(v.g, 255), b: normalizeChannel(v.b, 255), a: v.a == null ? undefined : normalizeChannel(v.a, 1) }
  if (v.model === 'cmyk') return { ...v, c: normalizeChannel(v.c), m: normalizeChannel(v.m), y: normalizeChannel(v.y), k: normalizeChannel(v.k), a: v.a == null ? undefined : normalizeChannel(v.a, 1) }
  if (v.model === 'gray') return { ...v, gray: normalizeChannel(v.gray), a: v.a == null ? undefined : normalizeChannel(v.a, 1) }
  return { ...v, l: normalizeChannel(v.l), a: Math.max(-128, Math.min(127, v.a)), b: Math.max(-128, Math.min(127, v.b)), alpha: v.alpha == null ? undefined : normalizeChannel(v.alpha, 1) }
}

export function totalAreaCoverage(v: CmykColour) {
  return normalizeChannel(v.c) + normalizeChannel(v.m) + normalizeChannel(v.y) + normalizeChannel(v.k)
}

export function exceedsInkLimit(v: CmykColour, settings: Pick<DocumentColourSettings, 'maxInk'>) {
  return settings.maxInk != null && totalAreaCoverage(v) > settings.maxInk
}

/** Pure K is important production intent; profiles may convert its display value but the stored channels remain native. */
export function isPureBlack(v: CmykColour, tolerance = 0.01) {
  return v.k > tolerance && v.c <= tolerance && v.m <= tolerance && v.y <= tolerance
}

export interface ColourMigration {
  before: DocumentColourSettings
  after: DocumentColourSettings
  requiresPixelConversion: boolean
}

/** Metadata planning only. Pixel/channel conversion is deliberately a separate committed operation. */
export function planColourConversion(doc: Pick<Doc, 'colour'>, next: DocumentColourSettings): ColourMigration {
  const before = documentColour(doc)
  return {
    before,
    after: { ...next },
    requiresPixelConversion: before.model !== next.model || before.profile !== next.profile || before.profileName !== next.profileName,
  }
}
