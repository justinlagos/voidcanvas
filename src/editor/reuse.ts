import { uid } from './engine'
import { blobToCanvas, canvasToBlob, ensureFont, idb, localFonts, openProject, saveDesign, type ProjectSummary } from './io'
import { groupDepth, inGroup, useEditor } from './store'
import { replaceImage } from './ops'
import type { BlendMode, Effect, Group, Layer, LayerStyles, ShapeLayer, TextLayer } from './types'

/**
 * Phase 7's local-first reuse model.
 *
 * Reusable items live in the existing IndexedDB `account` store under a `reuse:` id. Cross-design
 * references live beside them under `reuse-ref:` ids. Keeping references separate deliberately avoids
 * changing the .void/project schema in Phase 7B while still giving the Library safe dependency awareness.
 * Studio's older reference-derived colour looks remain in the `looks` store and are surfaced read-compatibly.
 */

const PREFIX = 'reuse:'
const REF_PREFIX = 'reuse-ref:'

export type PortableEffect = Omit<Effect, 'id' | 'link' | 'mask' | 'maskAt' | 'hasMask'>
export type AssetKind = 'logo' | 'image' | 'texture' | 'color' | 'font' | 'template'
export type ReuseSlot = 'look' | 'textStyle' | 'logo' | 'image' | 'texture' | 'color' | 'font' | 'template'

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

interface ReusableBase {
  id: string
  name: string
  at: number
  updatedAt: number
  lastUsedAt?: number
}

export interface SavedLook extends ReusableBase {
  kind: 'look'
  appearance: ReusableAppearance
}

export interface SavedTextStyle extends ReusableBase {
  kind: 'textStyle'
  style: TextStyleData
  scope?: 'design' | 'brand'
  designId?: string | null
  brandId?: string | null
}

export interface SavedAsset extends ReusableBase {
  kind: 'asset'
  assetKind: AssetKind
  /** Raster assets are stored once as their source PNG. */
  blob?: Blob
  thumb?: string
  width?: number
  height?: number
  /** Colour asset. */
  color?: string
  /** Font asset. A local font carries its file too, otherwise the family is enough. */
  font?: { family: string; weight?: number; italic?: boolean; blob?: Blob }
  /** Template asset points at an immutable saved template project. */
  templateId?: string
  sourceProjectId?: string | null
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

export interface ReuseReference {
  id: string
  kind: 'reuseRef'
  assetId: string
  projectId: string
  projectName: string
  layerId?: string | null
  slot: ReuseSlot
  at: number
}

export interface ReuseUsage {
  projectId: string
  projectName: string
  refs: number
  lastUsedAt: number
}

export type ReusableItem = SavedLook | SavedTextStyle | SavedAsset | SavedColourLook

type LegacyStudioLook = Omit<SavedColourLook, 'kind' | 'source'>
type LookSource = Layer | Group

const deep = <T,>(v: T): T => (v == null ? v : JSON.parse(JSON.stringify(v)))
const isLayer = (source: LookSource): source is Layer => 'type' in source
const isLocal = (item: ReusableItem): item is SavedLook | SavedTextStyle | SavedAsset => item.kind !== 'colourLook'

/** Resolve an exact selected group so composite Looks remain on the group, not on every child. */
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

/** Effect masks and links are target-specific and never travel inside a reusable Look. */
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
    fontFamily: layer.fontFamily, fontSize: layer.fontSize, fontWeight: layer.fontWeight, italic: layer.italic,
    color: layer.color, align: layer.align, lineHeight: layer.lineHeight, letterSpacing: layer.letterSpacing,
    underline: layer.underline, strike: layer.strike, caps: layer.caps, kerning: layer.kerning,
    wordSpacing: layer.wordSpacing, stretch: layer.stretch, indent: layer.indent, spaceAfter: layer.spaceAfter,
    baselineShift: layer.baselineShift, shadow: deep(layer.shadow ?? null), outline: deep(layer.outline ?? null),
  }
}

export function captureShapeStyle(layer: ShapeLayer): ShapeStyleData {
  return {
    fill: layer.fill, stroke: layer.stroke, strokeWidth: layer.strokeWidth, radius: layer.radius,
    strokeAlign: layer.strokeAlign, strokeCap: layer.strokeCap, strokeJoin: layer.strokeJoin,
    strokeDash: deep(layer.strokeDash),
  }
}

export function captureAppearance(source: LookSource): ReusableAppearance {
  if (!isLayer(source)) return {
    source: 'group',
    common: { opacity: source.opacity, blend: source.blend ?? 'pass', styles: deep(source.styles ?? null) },
    effects: portableEffects(source.effects),
  }
  return {
    source: 'layer',
    common: { opacity: source.opacity, blend: source.blend, fillOpacity: source.fillOpacity, styles: deep(source.styles ?? null) },
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
  return { opacity: appearance.common.opacity, blend: appearance.common.blend, styles: deep(appearance.common.styles ?? null), effects: materializeEffects(appearance.effects) }
}

async function allAccount(): Promise<any[]> { return idb.all<any>('account').catch(() => []) }

async function touchItem(item: ReusableItem) {
  if (!isLocal(item)) return
  const next = { ...item, lastUsedAt: Date.now() }
  await idb.put('account', next).catch(() => {})
}

async function clearSlotReference(projectId: string, layerId: string | null | undefined, slot: ReuseSlot) {
  const rows = await allAccount()
  await Promise.all(rows.filter(r => r?.kind === 'reuseRef' && r.projectId === projectId && (r.layerId ?? null) === (layerId ?? null) && r.slot === slot)
    .map(r => idb.del('account', r.id).catch(() => {})))
}

async function recordUse(item: ReusableItem, slot: ReuseSlot, layerId?: string | null) {
  if (!isLocal(item)) return
  const doc = useEditor.getState().doc
  if (!doc) return
  await clearSlotReference(doc.id, layerId, slot)
  const ref: ReuseReference = {
    id: `${REF_PREFIX}${item.id}:${doc.id}:${layerId ?? 'doc'}:${slot}`,
    kind: 'reuseRef', assetId: item.id, projectId: doc.id, projectName: doc.name, layerId: layerId ?? null, slot, at: Date.now(),
  }
  await Promise.all([idb.put('account', ref), touchItem(item)]).catch(() => {})
}

export async function listAssetUsages(assetId: string): Promise<ReuseUsage[]> {
  const [rows, projects] = await Promise.all([allAccount(), idb.all<ProjectSummary>('index').catch(() => [])])
  const live = new Map(projects.map(p => [p.id, p]))
  const refs = rows.filter(r => r?.kind === 'reuseRef' && r.assetId === assetId && live.has(r.projectId)) as ReuseReference[]
  const grouped = new Map<string, ReuseUsage>()
  for (const r of refs) {
    const p = live.get(r.projectId)!
    const prev = grouped.get(r.projectId)
    grouped.set(r.projectId, {
      projectId: r.projectId, projectName: p.name || r.projectName,
      refs: (prev?.refs ?? 0) + 1, lastUsedAt: Math.max(prev?.lastUsedAt ?? 0, r.at),
    })
  }
  return Array.from(grouped.values()).sort((a, b) => b.lastUsedAt - a.lastUsedAt)
}

export async function usageCounts(items: ReusableItem[]): Promise<Record<string, number>> {
  const [rows, projects] = await Promise.all([allAccount(), idb.all<ProjectSummary>('index').catch(() => [])])
  const live = new Set(projects.map(p => p.id)), wanted = new Set(items.filter(isLocal).map(i => i.id))
  const projectsByAsset = new Map<string, Set<string>>()
  for (const r of rows) if (r?.kind === 'reuseRef' && wanted.has(r.assetId) && live.has(r.projectId)) {
    if (!projectsByAsset.has(r.assetId)) projectsByAsset.set(r.assetId, new Set())
    projectsByAsset.get(r.assetId)!.add(r.projectId)
  }
  return Object.fromEntries(Array.from(projectsByAsset.entries()).map(([id, ps]) => [id, ps.size]))
}

export async function saveLook(name: string, source?: LookSource): Promise<SavedLook | null> {
  const target = source ?? selectedWholeGroup() ?? useEditor.getState().active()
  if (!target || (isLayer(target) && target.type === 'adjustment')) return null
  const now = Date.now()
  const item: SavedLook = { id: `${PREFIX}${uid()}`, kind: 'look', name: name.trim(), at: now, updatedAt: now, appearance: captureAppearance(target) }
  await idb.put('account', item); return item
}

export async function saveTextStyle(name: string, layer?: TextLayer, scope: 'design' | 'brand' = 'design'): Promise<SavedTextStyle | null> {
  let source = layer
  if (!source) { const active = useEditor.getState().active(); if (active?.type === 'text' && useEditor.getState().selectedIds.length === 1) source = active }
  if (!source) return null
  const s = useEditor.getState(), now = Date.now()
  const item: SavedTextStyle = {
    id: `${PREFIX}${uid()}`, kind: 'textStyle', name: name.trim(), at: now, updatedAt: now, style: captureTextStyle(source), scope,
    designId: scope === 'design' ? s.doc?.id ?? null : null,
    brandId: scope === 'brand' ? s.doc?.brandId ?? null : null,
  }
  await idb.put('account', item); return item
}

export async function saveRasterAsset(assetKind: 'logo' | 'image' | 'texture', name: string): Promise<SavedAsset | null> {
  const l = useEditor.getState().active()
  if (l?.type !== 'raster') return null
  const now = Date.now(), blob = await canvasToBlob(l.canvas, 'image/png')
  const item: SavedAsset = {
    id: `${PREFIX}${uid()}`, kind: 'asset', assetKind, name: name.trim() || l.name, at: now, updatedAt: now,
    blob, thumb: l.canvas.toDataURL('image/jpeg', 0.72), width: l.canvas.width, height: l.canvas.height,
    sourceProjectId: useEditor.getState().doc?.id ?? null,
  }
  await idb.put('account', item); return item
}

export async function saveColorAsset(name: string): Promise<SavedAsset | null> {
  const l = useEditor.getState().active()
  const color = l?.type === 'text' ? l.color : l?.type === 'shape' ? l.fill : null
  if (!color) return null
  const now = Date.now(), item: SavedAsset = { id: `${PREFIX}${uid()}`, kind: 'asset', assetKind: 'color', name: name.trim() || color, at: now, updatedAt: now, color }
  await idb.put('account', item); return item
}

export async function saveFontAsset(name: string): Promise<SavedAsset | null> {
  const l = useEditor.getState().active(); if (l?.type !== 'text') return null
  const now = Date.now(), item: SavedAsset = {
    id: `${PREFIX}${uid()}`, kind: 'asset', assetKind: 'font', name: name.trim() || l.fontFamily, at: now, updatedAt: now,
    font: { family: l.fontFamily, weight: l.fontWeight, italic: l.italic, blob: localFonts.get(l.fontFamily) },
  }
  await idb.put('account', item); return item
}

export async function saveTemplateAsset(name: string): Promise<SavedAsset | null> {
  const s = useEditor.getState(); if (!s.doc) return null
  const now = Date.now(), templateId = `tpl-${uid()}`, templateName = name.trim() || `${s.doc.name} template`
  const doc = { ...s.doc, id: templateId, name: templateName, exports: [] }
  await saveDesign(doc, s.layers, s.groups, s.swatches, true)
  const summary = await idb.get<ProjectSummary>('index', templateId).catch(() => undefined)
  const item: SavedAsset = {
    id: `${PREFIX}${uid()}`, kind: 'asset', assetKind: 'template', name: templateName, at: now, updatedAt: now,
    templateId, thumb: summary?.thumb, sourceProjectId: s.doc.id,
  }
  await idb.put('account', item); return item
}

export async function listLibrary(): Promise<ReusableItem[]> {
  const [reuse, studio] = await Promise.all([allAccount(), idb.all<LegacyStudioLook>('looks').catch(() => [])])
  const local = reuse.filter(x => typeof x?.id === 'string' && x.id.startsWith(PREFIX) && (x.kind === 'look' || x.kind === 'textStyle' || x.kind === 'asset')) as (SavedLook | SavedTextStyle | SavedAsset)[]
  const old: SavedColourLook[] = studio.filter(x => x?.id && x?.name && Array.isArray(x?.mean) && Array.isArray(x?.std)).map(x => ({ ...x, kind: 'colourLook', source: 'studio' }))
  return [...local, ...old].sort((a, b) => ((b as any).lastUsedAt ?? b.at) - ((a as any).lastUsedAt ?? a.at))
}

/** Safe by default: referenced local items are not removed unless force=true. */
export async function removeReusableItem(item: ReusableItem, force = false): Promise<{ removed: boolean; usages: ReuseUsage[] }> {
  const usages = isLocal(item) ? await listAssetUsages(item.id) : []
  if (usages.length && !force) return { removed: false, usages }
  await idb.del(item.kind === 'colourLook' ? 'looks' : 'account', item.id)
  if (isLocal(item)) {
    const rows = await allAccount()
    await Promise.all(rows.filter(r => r?.kind === 'reuseRef' && r.assetId === item.id).map(r => idb.del('account', r.id).catch(() => {})))
    if (item.kind === 'asset' && item.assetKind === 'template' && item.templateId) {
      await Promise.all([idb.del('projects', item.templateId).catch(() => {}), idb.del('index', item.templateId).catch(() => {})])
    }
  }
  return { removed: true, usages }
}

export function applyLook(item: SavedLook, ids?: string[]): boolean {
  const s = useEditor.getState()
  if (!ids) {
    const group = selectedWholeGroup()
    if (group && !group.locked) {
      s.updateGroup(group.id, patchForGroup(item.appearance), `Apply Look: ${item.name}`)
      recordUse(item, 'look', `group:${group.id}`).catch(() => {})
      return true
    }
  }
  const targets = (ids ?? s.selectedIds).filter(id => { const l = s.layers.find(x => x.id === id); return !!l && !l.locked && l.type !== 'adjustment' })
  if (!targets.length) return false
  s.updateLayers(targets.map(id => ({ id, patch: patchForLayer(s.layers.find(x => x.id === id)!, item.appearance) })))
  s.commit(`Apply Look: ${item.name}`)
  const fonts = new Set<string>()
  for (const id of targets) { const layer = useEditor.getState().layers.find(x => x.id === id); if (layer?.type === 'text') fonts.add(layer.fontFamily); recordUse(item, 'look', id).catch(() => {}) }
  Promise.all(Array.from(fonts).map(f => ensureFont(f).catch(() => {}))).then(() => useEditor.setState(x => ({ docRev: x.docRev + 1 })))
  return true
}

export function applyTextStyle(item: SavedTextStyle, ids?: string[]): boolean {
  const s = useEditor.getState()
  const targets = (ids ?? s.selectedIds).filter(id => { const l = s.layers.find(x => x.id === id); return l?.type === 'text' && !l.locked })
  if (!targets.length) return false
  s.updateLayers(targets.map(id => ({ id, patch: deep(item.style) as any }))); s.commit(`Apply text style: ${item.name}`)
  for (const id of targets) recordUse(item, 'textStyle', id).catch(() => {})
  ensureFont(item.style.fontFamily, item.style.fontWeight, item.style.italic).then(() => useEditor.setState(x => ({ docRev: x.docRev + 1 }))).catch(() => {})
  return true
}

export function applyColourLook(item: SavedColourLook): boolean {
  const s = useEditor.getState(); if (!s.doc) return false
  s.addAdjustment('colorMatch'); const layer = s.active(); if (layer?.type !== 'adjustment') return false
  s.updateLayer(layer.id, { look: { name: item.name, mean: item.mean, std: item.std }, name: `Look: ${item.name}` } as any, 'Colour match')
  if (item.grain > 1.4) s.notify('That reference has visible grain. Add Filter > Grain on top to match it.')
  return true
}

/** Apply or place one of the wider Phase 7B library assets. */
export async function applyAsset(item: SavedAsset): Promise<boolean> {
  const s = useEditor.getState(); if (!s.doc) return false
  if (item.assetKind === 'template') {
    if (!item.templateId) return false
    const ok = await openProject(item.templateId, true, 'reuse')
    if (ok) await touchItem(item)
    return ok
  }
  if (item.assetKind === 'color') {
    if (!item.color) return false
    const ids = s.selectedIds.filter(id => { const l = s.layers.find(x => x.id === id); return !!l && !l.locked && (l.type === 'text' || l.type === 'shape') })
    if (!ids.length) return false
    s.updateLayers(ids.map(id => { const l = s.layers.find(x => x.id === id)!; return { id, patch: l.type === 'text' ? { color: item.color } : { fill: item.color } } as any })); s.commit(`Apply colour: ${item.name}`)
    ids.forEach(id => recordUse(item, 'color', id).catch(() => {})); return true
  }
  if (item.assetKind === 'font') {
    if (!item.font?.family) return false
    if (item.font.blob && !localFonts.has(item.font.family)) { try { const { registerLocalFont } = await import('./io'); await registerLocalFont(item.font.family, item.font.blob) } catch { /* fall through to normal font loading */ } }
    await ensureFont(item.font.family, item.font.weight ?? 400, item.font.italic ?? false).catch(() => {})
    const ids = s.selectedIds.filter(id => { const l = s.layers.find(x => x.id === id); return l?.type === 'text' && !l.locked })
    if (!ids.length) return false
    s.updateLayers(ids.map(id => ({ id, patch: { fontFamily: item.font!.family } as any }))); s.commit(`Apply font: ${item.name}`)
    ids.forEach(id => recordUse(item, 'font', id).catch(() => {})); return true
  }
  if (!item.blob) return false
  const targets = s.selectedIds.filter(id => { const l = s.layers.find(x => x.id === id); return l?.type === 'raster' && !l.locked })
  if (targets.length) {
    for (const id of targets) { replaceImage(id, await blobToCanvas(item.blob)); await recordUse(item, item.assetKind, id) }
    return true
  }
  const c = await blobToCanvas(item.blob)
  s.addImage(c, c.width, c.height, item.name, { role: item.assetKind === 'logo' ? 'logo' : item.assetKind === 'texture' ? 'decoration' : 'image' })
  const id = useEditor.getState().activeId
  if (id) await recordUse(item, item.assetKind, id)
  return true
}
