// Sizes in print units as well as pixels. Pixels are what the design is made of; a print unit needs a
// resolution (dpi) to become pixels. Pure, so it can be unit tested.

export type SizeUnit = 'px' | 'mm' | 'cm' | 'in' | 'pt'
export const SIZE_UNITS: { id: SizeUnit; label: string }[] = [
  { id: 'px', label: 'Pixels' }, { id: 'mm', label: 'Millimetres' }, { id: 'cm', label: 'Centimetres' }, { id: 'in', label: 'Inches' }, { id: 'pt', label: 'Points' },
]
const PER_INCH: Record<Exclude<SizeUnit, 'px'>, number> = { in: 1, mm: 25.4, cm: 2.54, pt: 72 }
const DECIMALS: Record<SizeUnit, number> = { px: 0, mm: 1, cm: 2, in: 3, pt: 1 }

/** A length in `unit` as whole pixels at `dpi`. */
export function toPx(v: number, unit: SizeUnit, dpi: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.round(unit === 'px' ? v : (v / PER_INCH[unit]) * dpi)
}
/** Pixels as a length in `unit` at `dpi`, rounded to what that unit is usually written with. */
export function fromPx(px: number, unit: SizeUnit, dpi: number): number {
  const v = unit === 'px' ? px : (px / dpi) * PER_INCH[unit]
  const k = 10 ** DECIMALS[unit]
  return Math.round(v * k) / k
}
/** The resolution to assume for a design: its own, or 300 dpi for print-sized pixels and 72 for screen. */
export const dpiFor = (d: { dpi?: number; width: number; height: number }) => d.dpi ?? (Math.max(d.width, d.height) > 2000 ? 300 : 72)
export const isSizeUnit = (u: unknown): u is SizeUnit => typeof u === 'string' && SIZE_UNITS.some(x => x.id === u)

/** The unit last chosen for sizes, kept on this device. */
export function rememberedUnit(): SizeUnit { try { const u = localStorage.getItem('vc-size-unit'); return isSizeUnit(u) ? u : 'px' } catch { return 'px' } }
export function rememberUnit(u: SizeUnit) { try { localStorage.setItem('vc-size-unit', u) } catch { /* storage blocked */ } }
