// Brand intelligence: the logo system a client brand carries, suggested rules with their
// source, and a quiet health read. The guideline is one view of this; the Editor and
// Studio read the same data.

import type { AssetProfile } from './asset'
import type { Level } from './contrast'
import type { VariantId } from './logo'

export type RuleSource = 'suggested' | 'designer'
export interface Rule<T> { value: T; source: RuleSource }
export interface BackgroundRule { hex: string; name: string; use: VariantId; level: Level; source: RuleSource; why?: string }
export interface LogoRules {
  /** Clear space as a share of the mark's height. */
  clearSpace: Rule<number>
  /** Smallest width on screen, px on a 1080-wide design. */
  minWidth: Rule<number>
  /** Smallest width in print, mm. */
  minPrint: Rule<number>
  /** Which version to use on which background. */
  backgrounds: BackgroundRule[]
}

/** Suggested rules from the artwork alone. Labelled suggested until the designer changes them. */
export function suggestRules(p: AssetProfile | null): Pick<LogoRules, 'clearSpace' | 'minWidth' | 'minPrint'> {
  if (!p) return { clearSpace: { value: 0.5, source: 'suggested' }, minWidth: { value: 40, source: 'suggested' }, minPrint: { value: 15, source: 'suggested' } }
  // Wide wordmarks need less relative clear space than compact symbols; open marks (low coverage) need more.
  const clear = p.aspect >= 3 ? 0.25 : p.aspect >= 1.6 ? 0.5 : p.coverage < 0.35 ? 1 : 0.5
  // Minimum width: the thinnest stroke must stay at least 1 px on screen and 0.25 mm in print.
  const strokePx = p.minStroke * (1 / p.aspect) // stroke as a share of width
  const minWidth = Math.max(24, Math.min(240, Math.ceil((1.25 / Math.max(0.004, strokePx)) / 4) * 4))
  const minPrint = Math.max(8, Math.min(80, Math.ceil(0.3 / Math.max(0.004, strokePx))))
  return { clearSpace: { value: clear, source: 'suggested' }, minWidth: { value: minWidth, source: 'suggested' }, minPrint: { value: minPrint, source: 'suggested' } }
}

/** Fine detail lost at a given on-screen width: the thinnest stroke in device pixels. */
export function strokeAt(p: AssetProfile, widthPx: number): number { return (widthPx / p.aspect) * p.minStroke }

export interface HealthItem { label: string; level: Level; note?: string }
export interface HealthGroup { title: string; items: HealthItem[] }

export interface BrandLike {
  colors: { hex: string; role: string }[]
  display: string
  body: string
  logos: { name: string; variant?: VariantId; derivedFrom?: string | null; profile?: AssetProfile | null }[]
  logoRules?: LogoRules | null
  logoMin?: number
  clearSpace?: number
}

/** A brand health read: what is there, what is worth checking, what is missing. Quiet by design. */
export function brandHealth(b: BrandLike): HealthGroup[] {
  const has = (v: VariantId) => b.logos.some(l => (l.variant ?? 'primary') === v)
  const primary = b.logos.find(l => (l.variant ?? 'primary') === 'primary')
  const logo: HealthItem[] = []
  if (!b.logos.length) logo.push({ label: 'No logo yet', level: 'attention', note: 'Add the logo file to check it against the palette.' })
  else {
    logo.push({ label: 'Primary', level: has('primary') ? 'good' : 'attention', note: has('primary') ? undefined : 'Only derived versions are here. Add the supplied artwork.' })
    logo.push({ label: 'Reversed', level: has('reversed') ? 'good' : 'check', note: has('reversed') ? undefined : primary?.profile && !primary.profile.mono && primary.profile.internalEdges >= 0.12 ? 'Cannot be derived from this artwork. Ask the client for it.' : 'Missing. Derive it or add the file.' })
    logo.push({ label: 'Mono', level: has('mono-dark') || has('mono-brand') ? 'good' : 'check', note: has('mono-dark') || has('mono-brand') ? undefined : 'Useful for print in one ink and stamps.' })
    if (primary?.profile && primary.profile.minStroke < 0.03) logo.push({ label: 'Small-size version', level: 'check', note: 'The mark has fine strokes. A simplified version for small sizes would help.' })
    if (primary?.profile?.flatBackground) logo.push({ label: 'Supplied on a flat background', level: 'check', note: 'The file had no transparency. It was knocked out; a vector or transparent PNG would be cleaner.' })
  }
  const roleOf = (r: string) => b.colors.find(c => c.role === r)
  const colours: HealthItem[] = [
    { label: 'Primary', level: roleOf('primary') ? 'good' : 'attention', note: roleOf('primary') ? undefined : 'No colour has the primary role.' },
    { label: 'Secondary', level: roleOf('secondary') ? 'good' : 'check' },
    { label: 'Background and text', level: roleOf('background') && roleOf('text') ? 'good' : 'check', note: roleOf('background') && roleOf('text') ? undefined : 'Set a background and a text colour so pairings can be checked.' },
  ]
  const dark = b.logoRules?.backgrounds.filter(r => r.level === 'attention') ?? []
  if (dark.length) colours.push({ label: 'Background pairing', level: 'check', note: `No logo version clears the target on ${dark.map(d => d.name.toLowerCase()).join(', ')}.` })
  const type: HealthItem[] = [
    { label: 'Headings', level: b.display ? 'good' : 'attention' },
    { label: 'Body', level: b.body ? 'good' : 'attention' },
    ...(b.display && b.body && b.display === b.body ? [{ label: 'One family throughout', level: 'good' as Level, note: 'Hierarchy will come from size and weight.' }] : []),
  ]
  const rules: HealthItem[] = []
  const cs = b.logoRules?.clearSpace, mw = b.logoRules?.minWidth, mp = b.logoRules?.minPrint
  rules.push({ label: 'Clear space', level: cs ? (cs.source === 'designer' ? 'good' : 'check') : b.clearSpace ? 'check' : 'attention', note: cs?.source === 'designer' ? 'Set by you.' : 'Suggested from the artwork. Confirm it.' })
  rules.push({ label: 'Minimum size', level: mw ? (mw.source === 'designer' ? 'good' : 'check') : b.logoMin ? 'check' : 'attention', note: mw?.source === 'designer' ? 'Set by you.' : 'Suggested from the thinnest stroke. Confirm it.' })
  if (mp) rules.push({ label: 'Minimum print size', level: mp.source === 'designer' ? 'good' : 'check', note: mp.source === 'designer' ? 'Set by you.' : `Suggested: ${mp.value} mm.` })
  rules.push({ label: 'Background rules', level: b.logoRules?.backgrounds.length ? 'good' : 'check', note: b.logoRules?.backgrounds.length ? undefined : 'Not tested yet.' })
  return [{ title: 'Logo', items: logo }, { title: 'Colours', items: colours }, { title: 'Typography', items: type }, { title: 'Rules', items: rules }]
}

export function healthSummary(groups: HealthGroup[]): { level: Level; text: string } {
  const items = groups.flatMap(g => g.items)
  const attention = items.filter(i => i.level === 'attention').length, check = items.filter(i => i.level === 'check').length
  if (attention) return { level: 'attention', text: `${attention} need${attention === 1 ? 's' : ''} attention` }
  if (check) return { level: 'check', text: `${check} worth checking` }
  return { level: 'good', text: 'Complete' }
}
