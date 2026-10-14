// U1 appearance contract. Pure helpers that state, in one place, how a layer's
// visibility and alpha combine with its group chain. They mirror the rule the
// renderer already applies (engine.ts: `globalAlpha = l.opacity * (styled ? 1 : fill)`,
// with groups multiplying along parentId). They own no state and are not wired
// into the renderer yet; that happens after the U1 store integration lands.
import type { Group, Layer } from '../types'

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
