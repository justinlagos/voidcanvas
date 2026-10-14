import type { Layer } from './types'
import type { LinkedLayer } from './cascade-integrity'

export type CascadeChoice = 'variant' | 'master'
export type CascadeDecision =
  | { ok: true; layer: LinkedLayer }
  | { ok: false; reason: string }

const SCALARS = new Set([
  'name','visible','opacity','blend','role',
  'text','fontFamily','fontWeight','italic','color','align','lineHeight',
  'letterSpacing','underline','strike','caps','fill','stroke','strokeWidth',
])

/** Only conflicts with a deterministic, non-destructive resolution receive actions. */
export function canResolveCascadeConflict(layer: Layer, key: string): boolean {
  return SCALARS.has(key) ||
    (key === 'asset' && layer.type === 'raster') ||
    (key === 'vector path' && layer.type === 'shape')
}

const snapshot = (v: unknown): unknown => v === undefined ? null : JSON.parse(JSON.stringify(v))

function copyCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return canvas // Node unit tests validate metadata; Chromium verifies detached pixels
  const c = document.createElement('canvas')
  c.width = canvas.width; c.height = canvas.height
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(canvas, 0, 0)
  return c
}

/**
 * Single-conflict decision. Keep the variant's ID, local coordinates, effects,
 * crop, clipping and masks. Never mutate the original layer or baselines.
 * Unsupported structural conflicts remain review-only.
 */
export function decideCascadeConflict(
  variant: Layer,
  master: Layer,
  conflict: string,
  choice: CascadeChoice,
  proposal?: Layer,
): CascadeDecision {
  const v = variant as LinkedLayer
  if (v.srcId !== master.id || v.type !== master.type) return { ok: false, reason: 'The linked source is no longer compatible.' }
  if (!v.cascadeConflicts?.includes(conflict)) return { ok: false, reason: 'This conflict is no longer pending.' }
  if (!canResolveCascadeConflict(variant, conflict)) return { ok: false, reason: 'This structural conflict requires manual editing.' }
  if (choice !== 'variant' && choice !== 'master') return { ok: false, reason: 'Unknown resolution choice.' }

  const next = {
    ...variant,
    cascadeBase: { ...(v.cascadeBase ?? {}) },
    cascadeVariantBase: v.cascadeVariantBase ? { ...v.cascadeVariantBase } : undefined,
    cascadeConflicts: v.cascadeConflicts.filter(x => x !== conflict),
  } as LinkedLayer
  const patch = next as unknown as Record<string, unknown>
  const source = master as unknown as Record<string, unknown>

  if (SCALARS.has(conflict)) {
    next.cascadeBase![conflict] = source[conflict] ?? null
    if (choice === 'master') {
      if (Object.prototype.hasOwnProperty.call(source, conflict)) patch[conflict] = source[conflict]
      else delete patch[conflict]
    }
  } else if (conflict === 'asset' && variant.type === 'raster' && master.type === 'raster') {
    next.cascadeBase!.__assetSignature = master.asset?.id ? master.asset.id + '@' + master.asset.sha256 : null
    if (choice === 'master') {
      if (!master.asset?.id) return { ok: false, reason: 'Master does not have a registered source asset.' }
      const canvas = copyCanvas(master.canvas)
      if (!canvas) return { ok: false, reason: 'Master pixels could not be copied safely.' }
      const out = next as LinkedLayer & Extract<Layer, { type: 'raster' }>
      out.canvas = canvas
      out.asset = { ...master.asset }
      out.emptyFrame = master.emptyFrame ?? null
    }
  } else if (conflict === 'vector path' && variant.type === 'shape' && master.type === 'shape') {
    next.cascadeBase!.__vectorPath = snapshot(master.subpaths)
    if (choice === 'master') {
      if (!proposal || proposal.type !== 'shape' || proposal.srcId !== master.id)
        return { ok: false, reason: 'Cannot calculate safe target-board vector geometry.' }
      const out = next as LinkedLayer & Extract<Layer, { type: 'shape' }>
      out.subpaths = proposal.subpaths ? snapshot(proposal.subpaths) as typeof proposal.subpaths : undefined
      const base = v.cascadeVariantBase
      if (base && variant.w === base.w) out.w = proposal.w
      if (base && variant.h === base.h) out.h = proposal.h
      next.cascadeVariantBase = { subpaths: snapshot(proposal.subpaths), w: proposal.w, h: proposal.h }
    } else if (proposal?.type === 'shape') {
      next.cascadeVariantBase = { subpaths: snapshot(proposal.subpaths), w: proposal.w, h: proposal.h }
    }
  }
  return { ok: true, layer: next }
}
