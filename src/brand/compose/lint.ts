import { contrast } from '@/studio/brand/color'
import type { Brand } from '@/studio/brand/tokens'
import { resolvePaint } from './paint'
import { rectContains, validRect, type Node, type Page, type Rect, type TextNode } from './types'

export type LintLevel = 'good' | 'check' | 'attention'

export interface LintFinding {
  level: LintLevel
  code:
    | 'invalid-rect'
    | 'outside-page'
    | 'text-too-small'
    | 'low-contrast'
    | 'unexpected-overlap'
  nodeId?: string
  otherNodeId?: string
  message: string
}

export interface RasterSampler {
  /** Average colour under this rectangle, as a six-digit hex value. */
  average(rect: Rect): string | null
}

export interface LintOptions {
  raster?: RasterSampler
  /** CSS-pixel equivalent of 7pt at 96 dpi. */
  minimumTextPx?: number
  overlapTolerance?: number
}

const pageRect = (page: Page): Rect => ({ x: 0, y: 0, w: page.size.w, h: page.size.h })

const intersects = (a: Rect, b: Rect, tolerance = 0) =>
  a.x < b.x + b.w - tolerance &&
  a.x + a.w > b.x + tolerance &&
  a.y < b.y + b.h - tolerance &&
  a.y + a.h > b.y + tolerance

function flatten(nodes: Node[], parents: string[] = []): { node: Node; parents: string[]; order: number }[] {
  const out: { node: Node; parents: string[]; order: number }[] = []
  let order = 0
  const walk = (list: Node[], chain: string[]) => {
    for (const node of list) {
      out.push({ node, parents: chain, order: order++ })
      if (node.t === 'frame') walk(node.children, [...chain, node.id])
    }
  }
  walk(nodes, parents)
  return out
}

function directBackground(page: Page, brand: Brand, target: TextNode, nodes: ReturnType<typeof flatten>) {
  const targetIndex = nodes.findIndex((entry) => entry.node.id === target.id)
  for (let i = targetIndex - 1; i >= 0; i--) {
    const candidate = nodes[i].node
    if (!rectContains(candidate.rect, target.rect, 0.5)) continue
    if (candidate.t === 'frame' && candidate.fill) return resolvePaint(candidate.fill, brand)
    if (candidate.t === 'swatch') return resolvePaint(candidate.color, brand)
  }
  return resolvePaint(page.background, brand)
}

function textContrastNeed(node: TextNode) {
  const px = node.style.size
  const bold = (node.style.weight ?? 400) >= 700
  return px >= 24 || (bold && px >= 18.66) ? 3 : 4.5
}

export function lint(page: Page, brand: Brand, options: LintOptions = {}): LintFinding[] {
  const findings: LintFinding[] = []
  const minimumTextPx = options.minimumTextPx ?? (7 / 72) * 96
  const overlapTolerance = options.overlapTolerance ?? 1
  const flat = flatten(page.nodes)

  for (const { node } of flat) {
    if (!validRect(node.rect)) {
      findings.push({ level: 'attention', code: 'invalid-rect', nodeId: node.id, message: `${node.id} has invalid geometry.` })
      continue
    }
    if (!rectContains(pageRect(page), node.rect, 0.5)) {
      findings.push({ level: 'attention', code: 'outside-page', nodeId: node.id, message: `${node.id} leaves the page safe area.` })
    }
    if (node.t === 'text') {
      if (node.style.size < minimumTextPx) {
        findings.push({ level: 'attention', code: 'text-too-small', nodeId: node.id, message: `${node.id} is below the 7pt minimum.` })
      }
      const fg = resolvePaint(node.color, brand)
      const bg = options.raster?.average(node.rect) ?? directBackground(page, brand, node, flat)
      if (bg) {
        const ratio = contrast(fg, bg)
        const need = textContrastNeed(node)
        if (ratio + 1e-6 < need) {
          findings.push({ level: 'attention', code: 'low-contrast', nodeId: node.id, message: `${node.id} reaches ${ratio.toFixed(1)}:1 contrast and needs ${need}:1.` })
        }
      }
    }
  }

  const collisionKinds = new Set<Node['t']>(['text', 'logo', 'swatch'])
  for (let i = 0; i < flat.length; i++) {
    const a = flat[i]
    if (!collisionKinds.has(a.node.t)) continue
    for (let j = i + 1; j < flat.length; j++) {
      const b = flat[j]
      if (!collisionKinds.has(b.node.t)) continue
      if (a.parents.includes(b.node.id) || b.parents.includes(a.node.id)) continue
      if (!intersects(a.node.rect, b.node.rect, overlapTolerance)) continue
      // Text laid over a swatch is a normal labelled-swatch construction. Other collisions are worth checking.
      if ((a.node.t === 'text' && b.node.t === 'swatch') || (a.node.t === 'swatch' && b.node.t === 'text')) continue
      findings.push({
        level: 'check',
        code: 'unexpected-overlap',
        nodeId: a.node.id,
        otherNodeId: b.node.id,
        message: `${a.node.id} overlaps ${b.node.id}.`,
      })
    }
  }

  return findings
}

export const hasLintFailure = (findings: LintFinding[]) => findings.some((finding) => finding.level === 'attention')
