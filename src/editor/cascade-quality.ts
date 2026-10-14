import { layerBounds, textLayout } from './engine'
import { hasActiveStyles } from './styles'
import type { Doc, Frame, Group, Layer, Rect, TextLayer } from './types'

/** Diagnostics describe observable compromises. They do not claim design taste is machine-verifiable. */
export type CascadeIssueCode = 'missing-essential' | 'outside-board' | 'unsafe-margin' | 'unreadable-type' | 'text-collision' | 'text-box-overflow' | 'essential-off-board' | 'essential-hidden' | 'invalid-geometry'
export interface CascadeIssue {
  code: CascadeIssueCode
  severity: 'critical' | 'review'
  layerId: string
  name: string
  message: string
}
export interface CascadeQuality { issues: CascadeIssue[]; criticalCount: number; reviewCount: number }
const essential = (l: Layer) => l.role === 'logo' || l.role === 'headline' || l.role === 'cta'
const rectOverlap = (a: Rect, b: Rect) => {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  return w * h
}

/**
 * Audit a proposed linked board against the actual, generated layer geometry.
 * A missing user-designated logo, headline or CTA is a hard failure; geometric
 * or typography risks are review notices, since deliberate overlaps exist.
 *
 * Measure is injectable so the tests are deterministic without browser fonts.
 */
export function auditCascadeLayout(
  master: Layer[], generated: Layer[], target: Frame, doc: Doc,
  options: {
    skippedSourceIds?: ReadonlySet<string>
    measure?: (l: Layer) => Rect
    /** Browser text metrics, injectable to avoid font/platform variability in tests. */
    lines?: (l: TextLayer) => { text: string; width: number; first: boolean }[]
    groups?: Group[]
    masterGroups?: Group[]
  } = {},
): CascadeQuality {
  const issues: CascadeIssue[] = []
  const skipped = options.skippedSourceIds ?? new Set<string>()
  const ids = new Set(generated.map(l => l.srcId).filter(Boolean))
  const measured = options.measure ?? ((l: Layer) => layerBounds(l, doc))
  const bounds = new Map<string, Rect>()
  const shown = (l: Layer, groups: Group[] = []) => {
    if (!l.visible || l.opacity <= 0 || (l.fillOpacity === 0 && !hasActiveStyles(l))) return false
    let gid = l.groupId, guard = 0
    while (gid && guard++ < 64) {
      const g = groups.find(g => g.id === gid)
      if (!g) break
      if (!g.visible || g.opacity <= 0) return false
      gid = g.parentId
    }
    return true
  }
  for (const m of master) {
    if (!essential(m) || !shown(m, options.masterGroups ?? options.groups) || skipped.has(m.id)) continue
    const instance = generated.find(l => l.srcId === m.id)
    if (instance && !shown(instance, options.groups)) {
      issues.push({ code: 'essential-hidden', severity: 'critical', layerId: instance.id, name: instance.name,
        message: `Required ${m.role} "${m.name}" is hidden or fully transparent` })
      continue
    }
    if (ids.has(m.id)) continue
    issues.push({ code: 'missing-essential', severity: 'critical', layerId: m.id, name: m.name, message: `Required ${m.role} "${m.name}" is missing` })
  }

  const safe = Math.min(target.width, target.height) * 0.03
  const safeX = target.print ? 3 / target.print.widthMm * target.width : safe
  const safeY = target.print ? 3 / target.print.heightMm * target.height : safe
  const minType = Math.max(12, Math.min(target.width, target.height) * 0.018)
  for (const l of generated) {
    if (!shown(l, options.groups) || l.type === 'adjustment') continue
    const b = measured(l)
    if (![b.x, b.y, b.w, b.h].every(Number.isFinite) || b.w <= 0 || b.h <= 0) {
      issues.push({ code: 'invalid-geometry', severity: essential(l) ? 'critical' : 'review', layerId: l.id, name: l.name,
        message: `"${l.name}" has no valid visible dimensions` })
      continue
    }
    bounds.set(l.id, b)
    const isText = l.type === 'text'
    const isCritical = essential(l)
    // A one-character glyph wider than an area-text box cannot wrap further.
    // The renderer may draw it outside the intended paragraph area, so flag it
    // rather than silently treating the box as a successful fit.
    if (isText && l.boxWidth && l.boxWidth > 0 && (options.lines || typeof document !== 'undefined')) {
      const lines = options.lines ? options.lines(l) : textLayout(l).lines
      const available = l.boxWidth - 4
      if (lines.some(line => line.width + (line.first ? l.indent ?? 0 : 0) > available + 0.5)) {
        issues.push({ code: 'text-box-overflow', severity: 'review', layerId: l.id, name: l.name,
          message: `"${l.name}" contains type wider than its paragraph box` })
      }
    }
    if (isText && l.fontSize * Math.abs(l.scaleY) < minType) {
      issues.push({ code: 'unreadable-type', severity: 'review', layerId: l.id, name: l.name,
        message: `"${l.name}" may be too small to read at this size` })
    }
    // Backgrounds, full-bleed images and intentional decorative crops are exempt.
    if (!isText && !isCritical) continue
    const ex = b.x < target.x - 1 || b.y < target.y - 1 ||
      b.x + b.w > target.x + target.width + 1 || b.y + b.h > target.y + target.height + 1
    // An essential layer can technically be present by srcId yet contribute
    // ZERO visible pixels because all its geometry is outside the board.
    // Such a "successful" Cascade must not be created silently.
    const visibleWidth = Math.max(0, Math.min(b.x + b.w, target.x + target.width) - Math.max(b.x, target.x))
    const visibleHeight = Math.max(0, Math.min(b.y + b.h, target.y + target.height) - Math.max(b.y, target.y))
    if (isCritical && (!visibleWidth || !visibleHeight)) {
      issues.push({ code: 'essential-off-board', severity: 'critical', layerId: l.id, name: l.name,
        message: `Required ${l.role} "${l.name}" is completely outside the board` })
    } else if (ex) {
      issues.push({ code: 'outside-board', severity: 'review', layerId: l.id, name: l.name,
        message: `"${l.name}" extends beyond the board` })
    } else if (isCritical && (b.x < target.x + safeX || b.y < target.y + safeY ||
      b.x + b.w > target.x + target.width - safeX || b.y + b.h > target.y + target.height - safeY)) {
      issues.push({ code: 'unsafe-margin', severity: 'review', layerId: l.id, name: l.name,
        message: target.print ? `"${l.name}" is within 3 mm of the trim edge` : `"${l.name}" is near the board edge` })
    }
  }

  // Collision is diagnostic, never proof of a bad composition. Shared group
  // members often overlap deliberately (wordmarks, stacked text and effects).
  const textLayers = generated.filter(l => l.type === 'text' && l.visible && bounds.has(l.id))
  const ordered = textLayers.slice().sort((a, b) => bounds.get(a.id)!.x - bounds.get(b.id)!.x)
  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i], ba = bounds.get(a.id)!
    for (let j = i + 1; j < ordered.length && bounds.get(ordered[j].id)!.x < ba.x + ba.w; j++) {
      const b = ordered[j], bb = bounds.get(b.id)!
      if (a.groupId && a.groupId === b.groupId) continue
      const area = rectOverlap(ba, bb)
      if (area <= 0 || area / Math.min(ba.w * ba.h, bb.w * bb.h) < 0.2) continue
      issues.push({ code: 'text-collision', severity: 'review', layerId: b.id, name: b.name,
        message: `"${a.name}" and "${b.name}" overlap; check legibility` })
    }
  }
  return {
    issues,
    criticalCount: issues.filter(i => i.severity === 'critical').length,
    reviewCount: issues.filter(i => i.severity === 'review').length,
  }
}
