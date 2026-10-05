import type { Brand } from '@/studio/brand/tokens'
import type { LogoInfo } from '@/studio/brand/logo'
import type { PageSpec } from '@/studio/brand-pages'
import { composeBrandDocument } from './document'
import { DIRECTION_FAMILIES, familyCompatibility, type DirectionFamily } from './families'
import type { Page } from './types'
import { measureShape } from '@/lib/intelligence/shape'

export interface RuntimeComposeInput {
  brand: Brand
  logo: LogoInfo | null
  pages: readonly PageSpec[]
  salt: number
  layoutSalt: number
}

function logoShape(logo: LogoInfo | null) {
  if (!logo) return null
  const ctx = logo.img.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const pixels = ctx.getImageData(0, 0, logo.width, logo.height).data
  return measureShape(pixels, logo.width, logo.height, logo.profile)
}

export function chooseRuntimeFamily(brand: Brand, logo: LogoInfo | null): DirectionFamily {
  const shape = logoShape(logo)
  const achromatic = logo ? !logo.profile.chromatic : false
  const scored = DIRECTION_FAMILIES.map((family, index) => ({
    family,
    index,
    score: familyCompatibility({
      family,
      achromatic,
      logoCharacter: shape?.character,
      aspect: logo?.profile.aspect ?? 1,
      personality: brand.personality,
    }),
  }))
  scored.sort((a, b) => b.score - a.score || a.index - b.index)
  return scored[0].family
}

/**
 * Compose the current visible Brand page list through the V2 engine while preserving the
 * designer's page order. Pages with a manually selected legacy variant stay on the legacy
 * renderer until the Phase 4 layout filmstrip can represent that explicit choice natively.
 */
export function composeRuntimePages(input: RuntimeComposeInput): {
  family: DirectionFamily
  irByIndex: Map<number, Page>
  legacyIndexes: Set<number>
} {
  const visible = input.pages.map((spec, index) => ({ spec, index })).filter(({ spec }) => spec.on)
  const family = chooseRuntimeFamily(input.brand, input.logo)
  const enabledKinds = visible
    .filter(({ spec }) => spec.kind !== 'cover')
    .map(({ spec }) => spec.kind)

  const doc = composeBrandDocument({
    brand: input.brand,
    family,
    seed: input.salt * 97 + input.layoutSalt * 193,
    logoAspect: input.logo?.profile.aspect,
    enabledKinds: enabledKinds as Parameters<typeof composeBrandDocument>[0]['enabledKinds'],
  })

  const byKind = new Map(doc.pages.map((page) => [page.kind, page]))
  const irByIndex = new Map<number, Page>()
  const legacyIndexes = new Set<number>()

  for (const { spec, index } of visible) {
    // Non-zero variants are explicit choices in the current builder. Do not silently rewrite them.
    if (spec.variant > 0) {
      legacyIndexes.add(index)
      continue
    }
    const page = byKind.get(spec.kind)
    if (page) irByIndex.set(index, page)
    else legacyIndexes.add(index)
  }

  return { family, irByIndex, legacyIndexes }
}
