import type { LintFinding, Node, Page, Rect } from './types'

export interface RasterSampler {
  /** Return sampled contrast ratio for text rendered inside this node's box. */
  textContrast(node: Extract<Node, { t: 'text' }>): number | null
  /** Return true when the requested font rendered without fallback glyphs. */
  glyphsLoaded?(node: Extract<Node, { t: 'text' }>): boolean
}

const inside = (r: Rect, w: number, h: number) =>
  r.x >= 0 && r.y >= 0 && r.w >= 0 && r.h >= 0 && r.x + r.w <= w && r.y + r.h <= h

const overlap = (a: Rect, b: Rect) => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

function flatNodes(nodes: Node[], out: Node[] = []) {
  for (const node of nodes) {
    out.push(node)
    if (node.t === 'frame') flatNodes(node.children, out)
  }
  return out
}

function isContent(node: Node) {
  return node.t === 'text' || node.t === 'logo' || node.t === 'swatch'
}

export function lintPage(page: Page, raster?: RasterSampler): LintFinding[] {
  const findings: LintFinding[] = []
  const nodes = flatNodes(page.nodes)

  for (const node of nodes) {
    if (!inside(node.rect, page.width, page.height)) {
      findings.push({
        id: 'bounds',
        level: 'attention',
        nodeId: node.id,
        message: 'Element leaves the page bounds.',
      })
    }

    if (node.t === 'text') {
      if (node.style.size < 7) {
        findings.push({
          id: 'min-type-size',
          level: 'attention',
          nodeId: node.id,
          message: 'Text is below the 7 pt equivalent minimum.',
        })
      }

      const ratio = raster?.textContrast(node)
      if (ratio != null) {
        const large = node.style.size >= 24 || (node.style.size >= 18.66 && node.style.weight >= 700)
        const need = large ? 3 : 4.5
        if (ratio < need) {
          findings.push({
            id: 'contrast',
            level: 'attention',
            nodeId: node.id,
            message: `Text contrast is ${ratio.toFixed(2)}:1; this size needs ${need}:1.`,
          })
        }
      }

      if (raster?.glyphsLoaded && !raster.glyphsLoaded(node)) {
        findings.push({
          id: 'font-fallback',
          level: 'attention',
          nodeId: node.id,
          message: 'The requested font does not contain every glyph in this text.',
        })
      }
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    if (!isContent(a)) continue
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]
      if (!isContent(b)) continue
      const area = overlap(a.rect, b.rect)
      if (!area) continue
      const smaller = Math.max(1, Math.min(a.rect.w * a.rect.h, b.rect.w * b.rect.h))
      // Tiny edge contacts are tolerated. Anything substantial should be intentional and represented
      // by a containing frame rather than two unrelated semantic nodes occupying the same space.
      if (area / smaller > 0.04) {
        findings.push({
          id: 'overlap',
          level: 'attention',
          nodeId: `${a.id}:${b.id}`,
          message: 'Content elements overlap unexpectedly.',
        })
      }
    }
  }

  if (!findings.length)
    findings.push({ id: 'layout', level: 'good', message: 'Layout checks passed.' })

  return findings
}

export function lintPasses(findings: LintFinding[]) {
  return !findings.some((finding) => finding.level === 'attention')
}
