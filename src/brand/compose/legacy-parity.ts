import type { Brand } from '@/studio/brand/tokens'
import type { Node, Page } from './types'

export interface LegacyParityContext {
  brand: Brand
  orientation: 'landscape' | 'portrait'
}

function walk(nodes: Node[], fn: (node: Node) => void) {
  for (const node of nodes) {
    fn(node)
    if (node.t === 'frame') walk(node.children, fn)
  }
}

function text(page: Page, id: string) {
  let hit: Extract<Node, { t: 'text' }> | undefined
  walk(page.nodes, (node) => {
    if (node.t === 'text' && node.id === id) hit = node
  })
  return hit
}

function device(page: Page, id: string) {
  let hit: Extract<Node, { t: 'device' }> | undefined
  walk(page.nodes, (node) => {
    if (node.t === 'device' && node.id === id) hit = node
  })
  return hit
}

function swatches(page: Page) {
  const out: Extract<Node, { t: 'swatch' }>[] = []
  walk(page.nodes, (node) => {
    if (node.t === 'swatch') out.push(node)
  })
  return out
}

/**
 * Transitional Phase 1 parity metadata. The old renderer positions text by alphabetic
 * baseline while the IR stores a layout box. Preserve that baseline explicitly while
 * three existing pages migrate, so preview, PDF and recorded Editor items do not jump.
 * Phase 2 compositions can author their own baselines directly and do not depend on this.
 */
export function applyLegacyParity(source: Page, c: LegacyParityContext): Page {
  const page = structuredClone(source) as Page
  const { brand: b, orientation: o } = c
  const { width: w, height: h } = page
  const m = b.grid.margin

  const section = text(page, 'section-label')
  if (section) section.baseline = m + 24
  const footerName = text(page, 'footer-name')
  const footerPage = text(page, 'footer-page')
  if (footerName) footerName.baseline = h - m * 0.5
  if (footerPage) footerPage.baseline = h - m * 0.5

  if (page.kind === 'cover') {
    const eyebrow = text(page, 'cover-eyebrow')
    const name = text(page, 'brand-name')
    const tagline = text(page, 'tagline')
    const meta = text(page, 'cover-meta')
    const titleBase = h * (o === 'landscape' ? 0.68 : 0.72)
    if (eyebrow) eyebrow.baseline = h * (o === 'landscape' ? 0.52 : 0.58)
    if (name) name.baseline = titleBase
    if (tagline) tagline.baseline = titleBase + 60
    if (meta) meta.baseline = h - m * 0.7
    return page
  }

  if (page.kind === 'colour') {
    const top = m + 96
    const sh = 300
    const barH = o === 'landscape' ? 34 : 44
    const barY = h - m * 1.25 - barH
    const roleSize = o === 'landscape' ? 16 : 19
    const roleLine = o === 'landscape' ? 26 : 30
    const usageSize = o === 'landscape' ? 17 : 20
    const usageLine = usageSize * 1.4

    for (const role of b.roles) {
      const sample = text(page, `colour-${role.id}-sample`)
      const name = text(page, `colour-${role.id}-name`)
      const usage = text(page, `colour-${role.id}-usage`)
      const specs = text(page, `colour-${role.id}-specs`)
      if (sample) sample.baseline = sample.rect.y + (o === 'landscape' ? 26 : 26)
      if (name) {
        const nameBaseline = name.rect.y + 28
        name.baseline = nameBaseline
        if (usage) usage.baseline = nameBaseline + 32
        if (specs) {
          // Current role copy fits one line in the compatibility layout. Match the old
          // para() return value exactly: first usage baseline + one line + 8 px.
          specs.baseline = nameBaseline + 32 + usageLine + 8
          specs.style.lineHeight = roleLine / roleSize
        }
      }
    }

    for (const swatch of swatches(page)) swatch.radius = Math.min(b.radius, 24)

    const usageLabel = text(page, 'usage-label')
    const printNote = text(page, 'print-note')
    if (usageLabel) usageLabel.baseline = barY - 16
    if (printNote) printNote.baseline = barY - 16

    let x = m
    const barW = w - m * 2
    b.ratios.forEach((ratio, index) => {
      const seg = (ratio.pct / 100) * barW
      const node = text(page, `usage-${index}-text`)
      if (node) {
        node.baseline = barY + barH / 2 + 5
        if (seg > 70) node.rect.x = x + 10
        else node.rect.x = x + 6
        node.rect.w = Math.max(node.rect.w, seg + 80)
      }
      x += seg
    })
    return page
  }

  if (page.kind === 'clearspace') {
    const title = text(page, 'clearspace-title')
    const body = text(page, 'clearspace-rule-copy')
    if (title) {
      const titleBaseline = title.rect.y + 28
      title.baseline = titleBaseline
      if (body) body.baseline = titleBaseline + 36
    }
    // The compatibility copy wraps to four lines in landscape. The old para() advances
    // 4 × 27 px and then adds 30 px before drawing the Correct / Incorrect examples.
    const examples = device(page, 'clearspace-examples')
    if (examples && o === 'landscape') examples.rect.y -= 36
    return page
  }

  return page
}
