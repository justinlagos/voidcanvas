import type { Brand } from '@/studio/brand/tokens'
import type { Paint, PaintResolver, TextRole } from './types'

export interface BrandPaintHooks {
  drawLogo?: PaintResolver['drawLogo']
  drawImage?: PaintResolver['drawImage']
  drawDevice?: PaintResolver['drawDevice']
  drawSpecimen?: PaintResolver['drawSpecimen']
}

function withAlpha(hex: string, alpha?: number) {
  if (alpha == null || alpha >= 0.999) return hex
  const h = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(h)) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}

export function brandPaint(brand: Brand, paint: Paint): string {
  if ('hex' in paint) return withAlpha(paint.hex, paint.alpha)

  let hex: string
  switch (paint.role) {
    case 'brand':
      hex = paint.step ? brand.roles[0].ramp[paint.step] : brand.roles[0].hex
      break
    case 'secondary':
      hex = paint.step ? brand.roles[1].ramp[paint.step] : brand.roles[1].hex
      break
    case 'accent':
      hex = paint.step ? brand.roles[2].ramp[paint.step] : brand.roles[2].hex
      break
    case 'surface-light':
    case 'paper':
      hex = brand.surfaces.light
      break
    case 'surface-dark':
      hex = brand.surfaces.dark
      break
    case 'ink':
      hex = brand.surfaces.inkOnLight
      break
    case 'neutral':
      hex = brand.neutral[paint.step ?? 500]
      break
    case 'on-brand':
      // Text and marks on the brand colour: its own legible ink.
      hex = brand.roles[0].ink
      break
  }
  return withAlpha(hex, paint.alpha)
}

export function brandFont(brand: Brand, family: TextRole['family']) {
  return brand.fonts[family].family
}

export function createBrandPaintResolver(
  brand: Brand,
  hooks: BrandPaintHooks = {},
): PaintResolver {
  return {
    colour: (paint) => brandPaint(brand, paint),
    font: (family) => brandFont(brand, family),
    ...hooks,
  }
}
