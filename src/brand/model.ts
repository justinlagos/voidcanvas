import { RAMP_STEPS } from '@/studio/brand/color'
import type { ClientBrand } from '@/studio/jobs'
import {
  buildBrand,
  initialTokens,
  resolve,
  type Brand,
  type BrandTokens,
} from '@/studio/brand/tokens'

export const SECTIONS = [
  'overview',
  'colors',
  'typography',
  'logo',
  'logo-usage',
  'clear-space',
  'photography',
  'graphic-system',
  'tone-of-voice',
  'applications',
  'downloads',
] as const
export type Section = (typeof SECTIONS)[number]
export type Visibility = 'link' | 'public'
export interface Asset {
  name: string
  data: string
}
export interface Guideline {
  system: Brand
  pages: Asset[]
  source?: {
    tokens: import('@/studio/brand/tokens').BrandTokens
    pages: import('@/studio/brand-pages').PageSpec[]
    orientation: import('@/studio/brand-pages').Orientation
    decisions: import('@/studio/brand/logo').LogoDecisions
    logoFile: Blob | null
  }
}
export interface Snapshot {
  name: string
  colors: ClientBrand['colors']
  display: string
  body: string
  scale?: ClientBrand['scale']
  logoMin: number
  clearSpace: number
  voice: string[]
  dos: string[]
  donts: string[]
  logos: (Asset & { variant?: string; w: number; h: number })[]
  imagery: Asset[]
  system: Brand
  pages: Asset[]
}
export interface Publication {
  slug: string
  version: number
  updatedAt: string
  visibility: Visibility
  snapshot: Snapshot
}
export interface StoredPublication extends Publication {
  owner: string
  sourceId: string
  live: boolean
}
export const validSlug = (s: string) => /^[a-z0-9][a-z0-9-]{2,47}$/.test(s)
export const brandSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
export const MAX_PUBLICATION = 4_000_000

export function tokensFor(b: ClientBrand): BrandTokens {
  const original = b.guideline?.source?.tokens
  const t = {
    ...(original ??
      resolve({
        ...initialTokens(),
        name: b.name,
        brandColor:
          b.colors.find((c) => c.role === 'primary')?.hex ?? '#111111',
      })),
    name: b.name,
  }
  t.brandColor = b.colors.find((c) => c.role === 'primary')?.hex ?? t.brandColor
  t.heading = {
    value: {
      family: b.display,
      source:
        original?.heading.value.family === b.display
          ? original.heading.value.source
          : 'google',
    },
    locked: true,
  }
  t.body = {
    value: {
      family: b.body,
      source:
        original?.body.value.family === b.body
          ? original.body.value.source
          : 'google',
    },
    locked: true,
  }
  t.logoClear = { value: b.clearSpace, locked: true }
  t.logoMin = { value: b.logoMin, locked: true }
  if (b.logoRules?.minPrint)
    t.logoMinPrint = { value: b.logoRules.minPrint.value, locked: true }
  if (b.scale) {
    t.baseSize = { value: b.scale.base, locked: true }
    t.scaleRatio = { value: b.scale.ratio, locked: true }
  }
  for (const role of ['secondary', 'accent'] as const) {
    const c = b.colors.find((c) => c.role === role)
    if (c) t[role] = { value: c.hex, locked: true }
  }
  return t
}
export function systemFor(b: ClientBrand): Brand {
  const s = buildBrand(tokensFor(b))
  s.voice = { tone: b.voice.join(', '), dos: b.dos, donts: b.donts }
  const background = b.colors.find((c) => c.role === 'background'),
    ink = b.colors.find((c) => c.role === 'text')
  if (background) s.surfaces.light = background.hex
  if (ink) s.surfaces.inkOnLight = ink.hex
  return s
}

/** Reject malformed payloads before they become a publicly readable record. React renders all text as text. */
export function validateSnapshot(x: unknown): x is Snapshot {
  try {
    return checkedSnapshot(x)
  } catch {
    return false
  }
}
function checkedSnapshot(x: unknown): boolean {
  if (!x || typeof x !== 'object') return false
  const s = x as Snapshot
  const text = (v: unknown) => typeof v === 'string' && v.length <= 4000
  const list = (v: unknown) =>
    Array.isArray(v) && v.length <= 100 && v.every(text)
  const n = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 10000
  const asset = (a: Asset) =>
    a &&
    text(a.name) &&
    typeof a.data === 'string' &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a.data)
  if (
    !text(s.name) ||
    !s.name.trim() ||
    !text(s.display) ||
    !text(s.body) ||
    !n(s.logoMin) ||
    !n(s.clearSpace) ||
    !list(s.voice) ||
    !list(s.dos) ||
    !list(s.donts)
  )
    return false
  if (
    !Array.isArray(s.colors) ||
    s.colors.length > 100 ||
    !s.colors.every(
      (c) =>
        /^#[0-9a-f]{6}$/i.test(c.hex) &&
        [
          'primary',
          'secondary',
          'accent',
          'neutral',
          'background',
          'text',
        ].includes(c.role),
    )
  )
    return false
  if (
    ![s.logos, s.imagery, s.pages].every(
      (a) => Array.isArray(a) && a.length <= 60 && a.every(asset),
    )
  )
    return false
  if (
    !s.logos.every(
      (l) => n(l.w) && n(l.h) && (l.variant === undefined || text(l.variant)),
    )
  )
    return false
  const b = s.system
  if (
    !b ||
    !text(b.name) ||
    !text(b.tagline) ||
    !b.fonts ||
    ![b.fonts.heading, b.fonts.body, b.fonts.mono].every(
      (f) => f && text(f.family) && ['google', 'local'].includes(f.source),
    )
  )
    return false
  if (
    !Array.isArray(b.scale) ||
    b.scale.length > 30 ||
    !b.scale.every(
      (t) =>
        text(t.label) &&
        n(t.rem) &&
        n(t.px) &&
        n(t.weight) &&
        n(t.lineHeight) &&
        typeof t.tracking === 'number' &&
        Number.isFinite(t.tracking) &&
        ['heading', 'body'].includes(t.family),
    )
  )
    return false
  if (
    !Array.isArray(b.roles) ||
    !Array.isArray(b.semantic) ||
    !b.neutral ||
    !b.surfaces ||
    !b.logo ||
    !b.grid ||
    !Array.isArray(b.spacing) ||
    !Array.isArray(b.principles)
  )
    return false
  if (
    b.principles.length > 30 ||
    !b.principles.every((p) => text(p.title) && text(p.body))
  )
    return false
  if (
    ![
      b.logo.minWidth,
      b.logo.minPrint,
      b.logo.clearSpace,
      b.grid.cols,
      b.grid.gutter,
      b.grid.margin,
      b.radius,
      ...b.spacing,
    ].every(n)
  )
    return false
  const colors = [...b.roles, ...b.semantic]
  if (
    colors.length > 20 ||
    !colors.every(
      (c) =>
        text(c.id) &&
        text(c.name) &&
        text(c.usage) &&
        c.ramp &&
        RAMP_STEPS.every(
          (k) =>
            typeof c.ramp[k] === 'string' && /^#[0-9a-f]{6}$/i.test(c.ramp[k]),
        ),
    )
  )
    return false
  if (
    !RAMP_STEPS.every(
      (k) =>
        typeof b.neutral[k] === 'string' &&
        /^#[0-9a-f]{6}$/i.test(b.neutral[k]),
    )
  )
    return false
  const hexes = [
    ...Object.values(b.surfaces),
    ...Object.values(b.neutral),
    ...colors.flatMap((c) => [c.hex, c.ink, ...Object.values(c.ramp)]),
  ]
  return hexes.every((v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v))
}
