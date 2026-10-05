import type { Brand } from '@/studio/brand/tokens'
import type { Paint, TextStyle } from './types'

export function resolvePaint(paint: Paint, brand: Brand): string {
  if ('hex' in paint) return paint.hex
  switch (paint.role) {
    case 'brand':
      return paint.step ? brand.roles[0].ramp[paint.step] : brand.roles[0].hex
    case 'secondary':
      return paint.step ? brand.roles[1].ramp[paint.step] : brand.roles[1].hex
    case 'accent':
      return paint.step ? brand.roles[2].ramp[paint.step] : brand.roles[2].hex
    case 'surface-light':
      return brand.surfaces.light
    case 'surface-dark':
      return brand.surfaces.dark
    case 'ink':
      return brand.surfaces.inkOnLight
    case 'paper':
      return '#ffffff'
    case 'neutral':
      return brand.neutral[paint.step ?? 50]
  }
}

export function fontFor(style: TextStyle, brand: Brand) {
  switch (style.role) {
    case 'display':
    case 'heading':
    case 'subheading':
      return brand.fonts.heading.family
    case 'mono':
      return brand.fonts.mono.family
    default:
      return brand.fonts.body.family
  }
}

export function canvasFont(style: TextStyle, brand: Brand) {
  const italic = style.italic ? 'italic ' : ''
  return `${italic}${style.weight ?? 400} ${style.size}px "${fontFor(style, brand)}"`
}

export function cssFontFamily(style: TextStyle, brand: Brand) {
  return JSON.stringify(fontFor(style, brand))
}
