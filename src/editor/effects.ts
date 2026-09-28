// Effect stacks: the model. Every layer, group, board and the design itself can carry an ordered list of
// effects (see `Effect` in types.ts). An effect is the settings of an adjustment or a Void effect, with its own
// switch, strength and blend, and an optional link shared by copies of it on other targets. Drawing them lives
// in engine.ts; this file is plain data, so it can be tested without a canvas.

import { effects as VOID_EFFECTS } from '@/components/effect-list'
import { defaultParams, type EffectType } from '@/store/useStore'
import type { AdjustmentKind, AdjustmentLayer, Doc, Effect, Frame, Group, Layer } from './types'

let seq = 0
export const fxId = () => 'fx' + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 5)

/** Built-in kinds an effect can be (everything an adjustment layer can be). */
export const EFFECT_KINDS: AdjustmentKind[] = ['brightnessContrast', 'hueSaturation', 'levels', 'curves', 'temperature', 'blackWhite', 'invert', 'blur', 'vibrance', 'exposure', 'colorBalance', 'channelMixer', 'photoFilter', 'gradientMap', 'posterize', 'threshold', 'lut', 'colorMatch', 'voidEffect']
const KNOWN = new Set<string>(EFFECT_KINDS)
const KNOWN_VOID = new Set<string>(VOID_EFFECTS.map(e => e.id))

export const EFFECT_DEFAULTS: Record<string, Record<string, number>> = {
  brightnessContrast: { brightness: 0, contrast: 0 }, hueSaturation: { hue: 0, saturation: 0, lightness: 0 },
  levels: { black: 0, white: 255, gamma: 100 }, temperature: { temperature: 0, tint: 0 }, blackWhite: { amount: 100 },
  invert: {}, blur: { radius: 8 }, curves: {}, voidEffect: {}, vibrance: { vibrance: 40, saturation: 0 },
  exposure: { exposure: 0, offset: 0, gamma: 100 },
  colorBalance: { sCR: 0, sMG: 0, sYB: 0, mCR: 0, mMG: 0, mYB: 0, hCR: 0, hMG: 0, hYB: 0, preserve: 1 },
  channelMixer: { rr: 100, rg: 0, rb: 0, gr: 0, gg: 100, gb: 0, br: 0, bg: 0, bb: 100, mono: 0 },
  photoFilter: { density: 25, preserve: 1 }, gradientMap: { reverse: 0 }, posterize: { levels: 4 }, threshold: { level: 128 },
  lut: { amount: 100 }, colorMatch: { amount: 80 },
}

/** Colour-only Void effects: they change each pixel on its own, so a group looks the same either way. */
const COLOUR_VOID = new Set<string>([...VOID_EFFECTS.filter(e => e.category === 'color').map(e => e.id), 'posterize', 'threshold', 'solarize'])

/** Does the effect work across space (blur, grain, dots, distortion), so a group as one image differs from each layer? */
export function isSpatial(e: Pick<Effect, 'kind' | 'effect'>): boolean {
  if (e.kind === 'blur') return true
  if (e.kind === 'voidEffect') return !!e.effect && !COLOUR_VOID.has(e.effect)
  return false
}

/** A new effect with its usual settings. */
export function newEffect(kind: AdjustmentKind, effect?: EffectType): Effect {
  const e: Effect = { id: fxId(), kind, values: { ...(EFFECT_DEFAULTS[kind] ?? {}) }, on: true, opacity: 1, blend: 'source-over' }
  if (kind === 'curves') e.points = [[0, 0], [255, 255]]
  if (kind === 'voidEffect' && effect) { e.effect = effect; e.effectParams = { ...defaultParams, seed: Math.random() * 1000 } }
  return e
}

/** The same effect with its usual settings, keeping where it is and whether it is on. */
export function resetEffect(e: Effect): Effect {
  const fresh = newEffect(e.kind, e.effect)
  if (fresh.effectParams && e.effectParams) fresh.effectParams = { ...fresh.effectParams, seed: e.effectParams.seed }
  return { ...fresh, id: e.id, on: e.on, link: e.link }
}

/**
 * Effects for duplicated layers, groups or boards: new ids, and links that tie the copies to each other (through
 * `links`, shared across one duplicate) but not to the originals.
 */
export function freshFx(list: Effect[] | null | undefined, links: Map<string, string>): Effect[] | undefined {
  if (!list?.length) return list ?? undefined
  return list.map(e => {
    let link: string | null = null
    if (e.link) { link = links.get(e.link) ?? fxId(); links.set(e.link, link) }
    return { ...e, id: fxId(), link }
  })
}

/** A copy for another place: a new id, and no link unless asked for. */
export const copyEffect = (e: Effect, keepLink = false): Effect => {
  const { mask, ...rest } = e
  // The mask is pixels: shared as it is (masks are replaced, never changed in place), not copied through JSON.
  return { ...structuredCloneSafe(rest), ...(mask ? { mask } : {}), id: fxId(), link: keepLink ? e.link ?? null : null }
}
function structuredCloneSafe<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

export const hasFx = (list: Effect[] | null | undefined) => !!list?.some(e => e.on && !e.unknown)
export const liveFx = (list: Effect[] | null | undefined) => (list ?? []).filter(e => e.on && !e.unknown)
/** Settings that change what an effect draws, for caches. */
export const fxKey = (list: Effect[] | null | undefined) => JSON.stringify(liveFx(list).map(e => [e.kind, e.values, e.points, e.channelPoints, e.channelLevels, e.bands, e.colors, e.look?.name, e.lut?.name, e.effect, e.effectParams, e.opacity, e.blend, maskOf(e) ? [maskNo(maskOf(e)!), e.maskAt?.x ?? 0, e.maskAt?.y ?? 0] : 0]))
/** The mask an effect draws with, if it has one that is on. */
export const maskOf = (e: Effect) => (e.mask && e.maskOn !== false ? e.mask : null)
const maskNos = new WeakMap<HTMLCanvasElement, number>(); let maskSeq = 0
function maskNo(c: HTMLCanvasElement) { let n = maskNos.get(c); if (!n) { n = ++maskSeq; maskNos.set(c, n) } return n }
/** How far the effects can spread past the pixels they start from, in document pixels (blur). */
export function fxReach(list: Effect[] | null | undefined): number {
  let r = 0
  for (const e of liveFx(list)) if (e.kind === 'blur') r += (e.values.radius ?? 0) * 0.6 * 3 + 2
  return Math.ceil(r)
}

/** Mark effects of kinds this version does not know, so they are kept but not drawn. */
export function markUnknown(list: Effect[] | null | undefined): Effect[] | null | undefined {
  if (!list) return list
  return list.map(e => {
    const unknown = !KNOWN.has(e.kind) || (e.kind === 'voidEffect' && (!e.effect || !KNOWN_VOID.has(e.effect)))
    return unknown === !!e.unknown ? e : { ...e, unknown: unknown || undefined }
  })
}

/** The label of an effect in lists. */
export function effectLabel(e: Pick<Effect, 'kind' | 'effect' | 'unknown'>, adjLabels: Record<string, string>): string {
  if (e.unknown) return 'Effect from a newer version'
  if (e.kind === 'voidEffect') return VOID_EFFECTS.find(x => x.id === e.effect)?.name ?? 'Effect'
  return adjLabels[e.kind] ?? e.kind
}

/** Move one effect from one place in a list to another. */
export function moveInList<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list
  const next = list.slice(); const [x] = next.splice(from, 1); next.splice(Math.max(0, Math.min(next.length, to)), 0, x); return next
}

/** Does the order of these effects change the result? Two effects that are not both colour-only usually do. */
export function orderMatters(list: Effect[] | null | undefined): boolean {
  const on = liveFx(list)
  return on.length > 1 && on.some(isSpatial)
}

// ─── Targets ───────────────────────────────────────────────────────

/** Something that holds an effect stack. */
export type FxTarget = { type: 'layer'; id: string } | { type: 'group'; id: string } | { type: 'board'; id: string } | { type: 'doc' }
export const sameTarget = (a: FxTarget, b: FxTarget) => a.type === b.type && (a.type === 'doc' || (a as any).id === (b as any).id)

interface State { doc: Doc | null; layers: Layer[]; groups: Group[] }

export function stackOf(st: State, t: FxTarget): Effect[] {
  if (t.type === 'layer') return st.layers.find(l => l.id === t.id)?.effects ?? []
  if (t.type === 'group') return st.groups.find(g => g.id === t.id)?.effects ?? []
  if (t.type === 'board') return st.doc?.frames?.find(f => f.id === t.id)?.effects ?? []
  return st.doc?.effects ?? []
}

/** Give each target its new stack, returning the changed parts of the state. */
export function withStacks(st: State, changes: { t: FxTarget; list: Effect[] }[]): { doc?: Doc; layers?: Layer[]; groups?: Group[] } {
  let doc = st.doc, layers = st.layers, groups = st.groups
  const out: { doc?: Doc; layers?: Layer[]; groups?: Group[] } = {}
  for (const { t, list } of changes) {
    const v = list.length ? list : null
    if (t.type === 'layer') { layers = layers.map(l => (l.id === t.id ? ({ ...l, effects: v } as Layer) : l)); out.layers = layers }
    else if (t.type === 'group') { groups = groups.map(g => (g.id === t.id ? { ...g, effects: v } : g)); out.groups = groups }
    else if (doc && t.type === 'board') { doc = { ...doc, frames: (doc.frames ?? []).map(f => (f.id === t.id ? { ...f, effects: v } : f)) }; out.doc = doc }
    else if (doc) { doc = { ...doc, effects: v }; out.doc = doc }
  }
  return out
}

/** Every target holding a copy of this link, with the effect's id there. */
export function linkedCopies(st: State, link: string): { t: FxTarget; id: string; name: string }[] {
  const out: { t: FxTarget; id: string; name: string }[] = []
  for (const l of st.layers) for (const e of l.effects ?? []) if (e.link === link) out.push({ t: { type: 'layer', id: l.id }, id: e.id, name: l.name })
  for (const g of st.groups) for (const e of g.effects ?? []) if (e.link === link) out.push({ t: { type: 'group', id: g.id }, id: e.id, name: g.name })
  for (const f of st.doc?.frames ?? []) for (const e of f.effects ?? []) if (e.link === link) out.push({ t: { type: 'board', id: f.id }, id: e.id, name: f.name })
  for (const e of st.doc?.effects ?? []) if (e.link === link) out.push({ t: { type: 'doc' }, id: e.id, name: 'Whole design' })
  return out
}

/** Change an effect, and every linked copy of it. Id, link and place stay; settings follow. */
export function patchEffect(st: State, t: FxTarget, id: string, patch: Partial<Effect>): { t: FxTarget; list: Effect[] }[] {
  const own = stackOf(st, t).find(e => e.id === id); if (!own) return []
  const { id: _i, link: _l, ...shared } = patch as Effect
  const targets = own.link ? linkedCopies(st, own.link) : [{ t, id, name: '' }]
  const changes: { t: FxTarget; list: Effect[] }[] = []
  for (const c of targets) {
    const list = stackOf(st, c.t).map(e => (e.id === c.id ? { ...e, ...shared } : e))
    const at = changes.find(x => sameTarget(x.t, c.t))
    if (at) at.list = at.list.map(e => (e.id === c.id ? { ...e, ...shared } : e)); else changes.push({ t: c.t, list })
  }
  return changes
}

// ─── Groups: leaving a child out ─────────────────────────────────────

/**
 * The run of layers inside a group, cut into its direct children (a layer, or a nested group's layers), each
 * marked when it is left out of the group's effects. Runs of children that are not left out are drawn and
 * processed together; a child left out draws clean between them.
 */
export function groupUnits(run: Layer[], groupId: string, groups: Group[]): { layers: Layer[]; excluded: boolean }[] {
  const gmap = new Map(groups.map(g => [g.id, g]))
  const directChild = (l: Layer): Group | null => {
    let gid = l.groupId ?? null, prev: Group | null = null, n = 0
    while (gid && gid !== groupId && n++ < 64) { const g = gmap.get(gid); if (!g) return null; prev = g; gid = g.parentId ?? null }
    return gid === groupId ? prev : null
  }
  const out: { layers: Layer[]; excluded: boolean; key: string }[] = []
  for (const l of run) {
    const g = directChild(l)
    const key = g ? 'g' + g.id : 'l' + l.id
    const excluded = g ? !!g.fxExclude : !!l.fxExclude
    const last = out[out.length - 1]
    if (last && last.key === key) last.layers.push(l)
    else out.push({ layers: [l], excluded, key })
  }
  // Neighbouring children that are not left out form one run.
  const merged: { layers: Layer[]; excluded: boolean }[] = []
  for (const u of out) {
    const last = merged[merged.length - 1]
    if (last && !last.excluded && !u.excluded) last.layers.push(...u.layers)
    else merged.push({ layers: [...u.layers], excluded: u.excluded })
  }
  return merged
}

/** Does anything in this design use effects, of any kind? The Stage uses this to decide how sharp to draw. */
export function anyFx(doc: Doc, layers: Layer[], groups: Group[]): boolean {
  return hasFx(doc.effects) || !!doc.frames?.some(f => hasFx(f.effects)) || groups.some(g => hasFx(g.effects)) || layers.some(l => hasFx(l.effects))
}
/** Anything that runs a Void effect (whose look depends on the working size). */
export function anyVoidFx(doc: Doc, layers: Layer[], groups: Group[]): boolean {
  const v = (list?: Effect[] | null) => liveFx(list).some(e => e.kind === 'voidEffect')
  return v(doc.effects) || !!doc.frames?.some(f => v(f.effects)) || groups.some(g => v(g.effects)) || layers.some(l => v(l.effects) || (l.type === 'adjustment' && l.visible && l.kind === 'voidEffect'))
}

/** An adjustment layer's settings as an effect (to move it into a stack), and back. */
export function effectFromAdjustment(a: AdjustmentLayer): Effect {
  const { kind, values, points, channelPoints, channelLevels, bands, colors, look, lut, effect, effectParams } = a
  return JSON.parse(JSON.stringify({ id: fxId(), kind, values, points, channelPoints, channelLevels, bands, colors, look, lut, effect, effectParams, on: true, opacity: a.opacity, blend: a.blend }))
}

export type { Frame }
