import type { Brand } from '@/studio/brand/tokens'
import type { DirectionFamily } from './families'
import type { Page } from './types'
import { BODY_STRUCTURES, composeBodyCandidates, isBodyPageKind } from './body-pages'
import { CLOSING_STRUCTURES, composeClosingCandidates } from './closing'

export type InteriorKind =
  | 'principles' | 'logo' | 'clearspace' | 'minsize' | 'misuse' | 'photo'
  | 'colour' | 'ramps' | 'access' | 'type' | 'scale' | 'mockups' | 'voice'
  | 'tokens' | 'closing'

export interface InteriorContext {
  kind: InteriorKind
  brand: Brand
  family: DirectionFamily
  seed: number
  pageNo?: number
  pageCount?: number
  deviceAngle?: number
  logoAspect?: number
}

/**
 * Every interior page is composed around its real content. Content pages place the content the brand
 * supplies (logo tests, palette, contrast pairs, type) in one of six structures; the closing page has six
 * full-page structures of its own. There is no generic "title, intro, cards" template any more.
 */
export function composeInteriorCandidates(ctx: InteriorContext): Page[] {
  if (ctx.kind === 'closing') return composeClosingCandidates({ brand: ctx.brand, family: ctx.family, seed: ctx.seed, logoAspect: ctx.logoAspect })
  if (isBodyPageKind(ctx.kind)) return composeBodyCandidates({ ...ctx, kind: ctx.kind })
  throw new Error(`No compositions for page kind ${ctx.kind}`)
}

export const INTERIOR_LAYOUTS = BODY_STRUCTURES
export const INTERIOR_KINDS: readonly InteriorKind[] = ['principles', 'logo', 'clearspace', 'minsize', 'misuse', 'photo', 'colour', 'ramps', 'access', 'type', 'scale', 'mockups', 'voice', 'tokens', 'closing']

export function interiorCompositionCount(kind: InteriorKind) {
  return kind === 'closing' ? CLOSING_STRUCTURES.length : BODY_STRUCTURES.length
}
