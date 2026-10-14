// U1 appearance contract. Pure helpers that state, in one place, how layers
// and groups evaluate visibility, alpha, blend mode, isolation, clipping,
// masks and effect stacks. Used directly by the live renderer (engine.ts).
import type { BlendMode, Group, Layer } from '../types'
import { hasActiveStyles } from '../styles'
import { hasFx } from '../effects'

const MAX_GROUP_DEPTH = 64 // same guard the renderer uses against cyclic parentId chains

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.min(1, Math.max(0, n))
}

// Layer's own alpha. Styled layers keep full fill alpha and fade through their styles instead.
export function layerAlpha(layer: Pick<Layer, 'opacity' | 'fillOpacity'>, styled: boolean): number {
  const fill = styled ? 1 : clamp01(layer.fillOpacity ?? 1)
  return clamp01(layer.opacity) * fill
}

// Effective canvas composite operation for a group: 'pass' composites as 'source-over' once isolated.
export function groupCompositeBlend(blend: Group['blend']): BlendMode {
  return !blend || blend === 'pass' ? 'source-over' : blend
}

// Product of group opacities from the layer's group up through its parents.
// `hidden` is true when any group in the chain is hidden.
export function groupChain(groupId: string | null | undefined, groups: Group[]): { alpha: number; hidden: boolean } {
  const byId = new Map(groups.map(g => [g.id, g]))
  let alpha = 1
  let hidden = false
  const seen = new Set<string>()
  let gid = groupId ?? null
  while (gid && !seen.has(gid) && seen.size < MAX_GROUP_DEPTH) {
    seen.add(gid)
    const g = byId.get(gid)
    if (!g) break
    if (!g.visible) hidden = true
    alpha *= clamp01(g.opacity)
    gid = g.parentId ?? null
  }
  return { alpha, hidden }
}

// Final visibility and alpha for one layer as the renderer will draw it.
export function effectiveAppearance(layer: Layer, groups: Group[], styled: boolean): { visible: boolean; alpha: number } {
  const chain = groupChain(layer.groupId, groups)
  const visible = layer.visible && !chain.hidden
  return { visible, alpha: visible ? layerAlpha(layer, styled) * chain.alpha : 0 }
}

export interface GroupAppearancePlan {
  visible: boolean
  isolated: boolean
  alpha: number
  blend: BlendMode
  hasEffects: boolean
  hasStyles: boolean
  hasMask: boolean
  hasScopedAdjustment: boolean
}

// Evaluates how a group run should be composited in engine.ts.
export function evaluateGroupAppearance(
  group: Group,
  run: Layer[],
  opts: { noFx?: boolean } = {},
): GroupAppearancePlan {
  const noFx = !!opts.noFx
  const gFx = !noFx && hasFx(group.effects)
  const gStyled = !noFx && !!group.styles && hasActiveStyles({ styles: group.styles } as Layer)
  const gMask = !!group.mask && group.maskEnabled !== false
  const gReach = run.some(x => x.type === 'adjustment' && x.visible && x.reach === 'group' && x.groupId === group.id)
  const alpha = clamp01(group.opacity)
  const isolated = alpha < 1 || (!!group.blend && group.blend !== 'pass') || gFx || gStyled || gMask || gReach
  return {
    visible: !!group.visible,
    isolated,
    alpha,
    blend: groupCompositeBlend(group.blend),
    hasEffects: gFx,
    hasStyles: gStyled,
    hasMask: gMask,
    hasScopedAdjustment: gReach,
  }
}

// Resolves the clipping base layer for a clipped layer, if valid (non-adjustment).
export function resolveClipBase(layer: Pick<Layer, 'clipId'>, siblings: Layer[], allLayers: Layer[]): Layer | null {
  if (!layer.clipId) return null
  const base = siblings.find(x => x.id === layer.clipId) ?? allLayers.find(x => x.id === layer.clipId)
  if (!base || base.type === 'adjustment') return null
  return base
}

export interface LayerAppearancePlan {
  visible: boolean
  alpha: number
  untypedAlpha: number
  blend: BlendMode
  styled: boolean
  hasEffects: boolean
  hasRasterMask: boolean
  hasVectorMask: boolean
  clipBase: Layer | null
  needsOffscreenPass: boolean
  needsDocSpacePass: boolean
}

// Evaluates a single non-adjustment layer's rendering plan (alpha, blend, masks, clipping, effects, styles).
export function evaluateLayerAppearance(
  layer: Layer,
  siblings: Layer[],
  allLayers: Layer[],
  opts: { noFx?: boolean; hasLiveStroke?: boolean; hasVectorMask?: boolean } = {},
): LayerAppearancePlan {
  const noFx = !!opts.noFx
  const styled = !noFx && hasActiveStyles(layer)
  const fx = !noFx && hasFx(layer.effects)
  const clipBase = resolveClipBase(layer, siblings, allLayers)
  const hasRasterMask = !!layer.mask && layer.maskEnabled !== false
  const hasVecMask = !!opts.hasVectorMask
  const needsDocSpacePass = !!clipBase || styled || fx
  const needsOffscreenPass = hasRasterMask || hasVecMask || !!opts.hasLiveStroke || needsDocSpacePass
  return {
    visible: !!layer.visible,
    alpha: layerAlpha(layer, styled),
    untypedAlpha: layerAlpha(layer, false),
    blend: layer.blend,
    styled,
    hasEffects: fx,
    hasRasterMask,
    hasVectorMask: hasVecMask,
    clipBase,
    needsOffscreenPass,
    needsDocSpacePass,
  }
}
