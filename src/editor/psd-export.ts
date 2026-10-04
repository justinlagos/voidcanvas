import { writePsd } from 'ag-psd'
import { layerBounds, makeCanvas, renderDoc } from './engine'
import { assertProductionSafe } from './hardening'
import { downloadBlob } from './io'
import type { Doc, Group, Layer } from './types'

const safe = (n: string) => n.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'design'

/** Layered interchange export. Unsupported live constructs rasterise per layer, never as one flattened page. */
export function layeredPsd(doc: Doc, layers: Layer[], groups: Group[]): ArrayBuffer {
  assertProductionSafe(doc, layers, groups)
  const rendered = new Map<string, any>()
  for (const layer of layers) {
    if (!layer.visible) continue
    const b = layerBounds(layer, doc)
    const x = Math.floor(Math.max(0, b.x)), y = Math.floor(Math.max(0, b.y))
    const r = Math.ceil(Math.min(doc.width, b.x + b.w)), bot = Math.ceil(Math.min(doc.height, b.y + b.h))
    if (r <= x || bot <= y) continue
    const region = { x, y, w: r - x, h: bot - y }
    const canvas = makeCanvas(region.w, region.h)
    renderDoc(canvas, doc, [layer], { groups: [], region, scale: 1, noShadow: true, noCache: true, fullRes: true })
    rendered.set(layer.id, { name: layer.name || 'Layer', left: x, top: y, canvas, opacity: Math.round((layer.opacity ?? 1) * 255), hidden: !layer.visible })
  }
  const groupNodes = new Map<string, any>()
  for (const g of groups) groupNodes.set(g.id, { name: g.name || 'Group', opened: true, children: [] as any[] })
  const root: any[] = []
  for (const layer of [...layers].reverse()) {
    const node = rendered.get(layer.id); if (!node) continue
    const parent = layer.groupId ? groupNodes.get(layer.groupId) : null
    ;(parent?.children ?? root).push(node)
  }
  for (const g of [...groups].reverse()) {
    const node = groupNodes.get(g.id); if (!node || !node.children.length) continue
    const parentId = (g as any).parentId ?? (g as any).groupId ?? null
    const parent = parentId ? groupNodes.get(parentId) : null
    ;(parent?.children ?? root).push(node)
  }
  return writePsd({ width: doc.width, height: doc.height, children: root } as any) as ArrayBuffer
}

export function downloadLayeredPsd(doc: Doc, layers: Layer[], groups: Group[]) {
  const bytes = layeredPsd(doc, layers, groups)
  downloadBlob(new Blob([bytes], { type: 'image/vnd.adobe.photoshop' }), `${safe(doc.name)}.psd`)
}
