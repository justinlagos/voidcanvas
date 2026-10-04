import { uid } from './engine'
import { ensureFont, idb } from './io'
import { groupDepth, inGroup, useEditor } from './store'
import type { BlendMode, Effect, Group, Layer, LayerStyles, ShapeLayer, TextLayer } from './types'

/**
 * Phase 7's local-first reuse model. The first items are Looks and text styles; images, logos,
 * colours, fonts and templates can join this union without creating another storage API.
 *
 * Reuse records live in the existing local IndexedDB `account` store under a namespaced id.
 * That avoids a database migration while keeping them isolated from the account record (`self`).
 * Studio's older reference-derived colour looks remain in the `looks` store and are surfaced
 * through listLibrary() as read-compatible items rather than copied or silently migrated.
 */

const PREFIX = 'reuse:'

export type PortableEffect = Omit<Effect, 'id' | 'link' | 'mask' | 'maskAt' | 'hasMask'>

export type TextStyleData = Pick<TextLayer,
  'fontFamily' | 'fontSize' | 'fontWeight' | 'italic' | 'color' | 'align' | 'lineHeight' |
  'letterSpacing' | 'underline' | 'strike' | 'caps' | 'kerning' | 'wordSpacing' | 'stretch' |
  'indent' | 'spaceAfter' | 'baselineShift' | 'shadow' | 'outline'
>

export type ShapeStyleData = Pick<ShapeLayer,
  'fill' | 'stroke' | 'strokeWidth' | 'radius' | 'strokeAlign' | 'strokeCap' | 'strokeJoin' | 'strokeDash'
>

export interface ReusableAppearance {
  source: 'layer' | 'group'
  common: {
    opacity: number
    blend: BlendMode | 'pass'
    fillOpacity?: number
    styles?: LayerStyles | null
  }
  effects: PortableEffect[]
  text?: TextStyleData
  shape?: ShapeStyleData
}

export interface SavedLook {
  id: string
  kind: 'look'
  name: string
  at: number
  updatedAt: number
  appearance: ReusableAppearance
}

export interface SavedTextStyle {
  id: string
  kind: 'textStyle'
  name: string
  at: number
  updatedAt: number
  style: TextStyleData
}

/** Existing Studio "Take the look" records, represented in the same library result. */
export interface SavedColourLook {
  id: string
  kind: 'colourLook'
  name: string
  at: number
  source: 'studio'
  thumb: string
  mean: [number, number, number]
  std: [number, number, number]
  grain: number
}

export type ReusableItem = SavedLook | SavedTextStyle | SavedColourLook

type LegacyStudioLook = Omit<SavedColourLook, 'kind' | 'source'>
type LookSource = Layer | Group

const deep = <T,>(v: T): T => (v == null ? v : JSON.parse(JSON.stringify(v)))
const isLayer = (source: LookSource): source is Layer => 'type' in source

/**
 * When selecting a group, the editor selects every descendant layer. This resolves that exact
 * selection back to the deepest matching group, so a saved/applied Look targets the group
 * composite instead of silently duplicating the treatment onto each child.
 */
export function selectedWholeGroup(): Group | null {
  const s = useEditor.getState()
  if (!s.selectedIds.length) return null
  const selected = new Set(s.selectedIds)
  const matches = s.groups.filter(g => {
    const members = s.layers.filter(l => inGroup(l, g.id, s.groups))
    return members.length > 0 && members.length === selected.size && members.every(l => selected.has(l.id))
  })
  matches.sort((a, b) => groupDepth(b.id, s.groups) - groupDepth(a.id, s.groups))
  return matches[0] ?? null
}

/**
 * Effect masks are deliberately target-specific and are not baked into a reusable Look.
 * Links are also target-specific. Applying a Look creates fresh effect ids and no links, so
 * a saved Look can never accidentally keep editing the source layer or share a stale mask.
 */
export function portableEffects(effects: Effect[] | null | undefined): PortableEffect[] {
  return (effects ?? []).map(effect => {
    const { id: _id, link: _link, mask: _mask, maskAt: _maskAt, hasMask: _hasMask, ...portable } = effect
    return deep({ ...portable, maskOn: false }) as PortableEffect
  })
}

export function materializeEffects(effects: PortableEffect[]): Effect[] {
  return effects.map(effect => ({ ...deep(effect), id: uid(), link: null, mask: null, maskAt: null, hasMask: false, maskOn: false } as Effect))
}

export function captureTextStyle(layer: TextLayer): TextStyleData {
  return {
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    fontWeight: layer.fontWeight,
    italic: layer.italic,
    color: layer.color,
    align: layer.align,
    lineHeight: layer.lineHeight,
    letterSpacing: layer.letterSpacing,
    underline: layer.underline,
    strike: layer.strike,
    caps: layer.caps,
    kerning: layer.kerning,
    wordSpacing: layer.wordSpacing,
    stretch: layer.stretch,
    indent: layer.indent,
    spaceAfter: layer.spaceAfter,
    baselineShift: layer.baselineShift,
    shadow: deep(layer.shadow ?? null),
    outline: deep(layer.outline ?? null),
  }
}

export function captureShapeStyle(layer: ShapeLayer): ShapeStyleData {
  return {
    fill: layer.fill,
    stroke: layer.stroke,
    strokeWidth: layer.strokeWidth,
    radius: layer.radius,
    strokeAlign: layer.strokeAlign,
    strokeCap: layer.strokeCap,
    strokeJoin: layer.strokeJoin,
    strokeDash: deep(layer.strokeDash),
  }
}

export function captureAppearance(source: LookSource): ReusableAppearance {
  if (!isLayer(source)) {
    return {
      source: 'group',
      common: { opacity: source.opacity, blend: source.blend ?? 'pass', styles: deep(source.styles ?? null) },
      effects: portableEffects(source.effects),
    }
  }
  return {
    source: 'layer',
    common: {
      opacity: source.opacity,
      blend: source.blend,
      fillOpacity: source.fillOpacity,
      styles: deep(source.styles ?? null),
    },
    effects: portableEffects(source.effects),
    ...(source.type === 'text' ? { text: captureTextStyle(source) } : {}),
    ...(source.type === 'shape' ? { shape: captureShapeStyle(source) } : {}),
  }
}

function patchForLayer(layer: Layer, appearance: ReusableAppearance): any {
  return {
    opacity: appearance.common.opacity,
    blend: appearance.common.blend === 'pass' ? 'source-over' : appearance.common.blend,
    fillOpacity: appearance.common.fillOpacity,
    styles: deep(appearance.common.styles ?? null),
    effects: materializeEffects(appearance.effects),
    ...(layer.type === 'text' && appearance.text ? appearance.text : {}),
    ...(layer.type === 'shape' && appearance.shape ? appearance.shape : {}),
  }
}

function patchForGroup(appearance: ReusableAppearance): Partial<Group> {
  return {
    opacity: appearance.common.opacity,
    blend: appearance.common.blend,
    styles: deep(appearance.common.styles ?? null),
    effects: materializeEffects(appearance.effects),
  }
}

export async function saveLook(name: string, source?: LookSource): Promise<SavedLook | null> {
  const target = source ?? selectedWholeGroup() ?? useEditor.getState().active()
  if (!target || (isLayer(target) && target.type === 'adjustment')) return null
  const now = Date.now()
  const item: SavedLook = { id: `${PREFIX}${uid()}`, kind: 'look', name: name.trim(), at: now, updatedAt: now, appearance: captureAppearance(target) }
  await idb.put('account', item)
  return item
}

export async function saveTextStyle(name: string, layer?: TextLayer): Promise<SavedTextStyle | null> {
  let source = layer
  if (!source) {
    const active = useEditor.getState().active()
    if (active?.type === 'text' && useEditor.getState().selectedIds.length === 1) source = active
  }
  if (!source) return null
  const now = Date.now()
  const item: SavedTextStyle = { id: `${PREFIX}${uid()}`, kind: 'textStyle', name: name.trim(), at: now, updatedAt: now, style: captureTextStyle(source) }
  await idb.put('account', item)
  return item
}

export async function listLibrary(): Promise<ReusableItem[]> {
  const [reuse, studio] = await Promise.all([
    idb.all<any>('account').catch(() => []),
    idb.all<LegacyStudioLook>('looks').catch(() => []),
  ])
  const local = reuse.filter(x => typeof x?.id === 'string' && x.id.startsWith(PREFIX) && (x.kind === 'look' || x.kind === 'textStyle')) as (SavedLook | SavedTextStyle)[]
  const old: SavedColourLook[] = studio
    .filter(x => x?.id && x?.name && Array.isArray(x?.mean) && Array.isArray(x?.std))
    .map(x => ({ ...x, kind: 'colourLook', source: 'studio' }))
  return [...local, ...old].sort((a, b) => b.at - a.at)
}

export async function removeReusableItem(item: ReusableItem): Promise<void> {
  await idb.del(item.kind === 'colourLook' ? 'looks' : 'account', item.id)
}

export function applyLook(item: SavedLook, ids?: string[]): boolean {
  const s = useEditor.getState()
  if (!ids) {
    const group = selectedWholeGroup()
    if (group && !group.locked) {
      s.updateGroup(group.id, patchForGroup(item.appearance), `Apply Look: ${item.name}`)
      return true
    }
  }
  const targets = (ids ?? s.selectedIds).filter(id => {
    const l = s.layers.find(x => x.id === id)
    return !!l && !l.locked && l.type !== 'adjustment'
  })
  if (!targets.length) return false
  s.updateLayers(targets.map(id => {
    const layer = s.layers.find(x => x.id === id)!
    return { id, patch: patchForLayer(layer, item.appearance) }
  }))
  s.commit(`Apply Look: ${item.name}`)
  const fonts = new Set<string>()
  for (const id of targets) {
    const layer = useEditor.getState().layers.find(x => x.id === id)
    if (layer?.type === 'text') fonts.add(layer.fontFamily)
  }
  Promise.all(Array.from(fonts).map(f => ensureFont(f).catch(() => {}))).then(() => useEditor.setState(x => ({ docRev: x.docRev + 1 })))
  return true
}

export function applyTextStyle(item: SavedTextStyle, ids?: string[]): boolean {
  const s = useEditor.getState()
  const targets = (ids ?? s.selectedIds).filter(id => {
    const l = s.layers.find(x => x.id === id)
    return l?.type === 'text' && !l.locked
  })
  if (!targets.length) return false
  s.updateLayers(targets.map(id => ({ id, patch: deep(item.style) as any })))
  s.commit(`Apply text style: ${item.name}`)
  ensureFont(item.style.fontFamily, item.style.fontWeight, item.style.italic)
    .then(() => useEditor.setState(x => ({ docRev: x.docRev + 1 })))
    .catch(() => {})
  return true
}

export function applyColourLook(item: SavedColourLook): boolean {
  const s = useEditor.getState()
  if (!s.doc) return false
  s.addAdjustment('colorMatch')
  const layer = s.active()
  if (layer?.type !== 'adjustment') return false
  s.updateLayer(layer.id, { look: { name: item.name, mean: item.mean, std: item.std }, name: `Look: ${item.name}` } as any, 'Colour match')
  if (item.grain > 1.4) s.notify('That reference has visible grain. Add Filter > Grain on top to match it.')
  return true
}
