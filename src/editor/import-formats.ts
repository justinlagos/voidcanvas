import { readPsd } from 'ag-psd'
import { ctx2d, makeCanvas, uid } from './engine'
import { nextRev, useEditor } from './store'
import type { Doc, Group, Layer, RasterLayer } from './types'

const REV = () => nextRev()
const baseLayer = (name: string) => ({
  id: uid(), name, visible: true, locked: false, opacity: 1, blend: 'source-over' as const,
  x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, mask: null, maskEnabled: true, groupId: null as string | null, rev: REV(),
})

const PSD_BLEND: Record<string, Layer['blend']> = {
  norm: 'source-over', mul: 'multiply', scrn: 'screen', over: 'overlay', dark: 'darken', lite: 'lighten',
  hue: 'hue', sat: 'saturation', colr: 'color', lum: 'luminosity', diff: 'difference', smud: 'exclusion',
  div: 'color-dodge', idiv: 'color-burn', hLit: 'hard-light', sLit: 'soft-light',
}

/** Open a .psd as a real layered document: every raster layer, its position, opacity, blend mode and group. */
export async function importPsd(file: Blob, name: string) {
  const ed = useEditor.getState()
  const buf = await file.arrayBuffer()
  const psd = readPsd(buf, { skipThumbnail: true, useImageData: false })
  const W = psd.width, H = psd.height
  const layers: Layer[] = []
  const groups: Group[] = []

  const walk = (nodes: any[], groupId: string | null) => {
    for (const n of nodes) {
      if (n.children) {
        const g: Group = { id: uid(), name: n.name || 'Group', visible: n.hidden !== true, opacity: n.opacity ?? 1, collapsed: false }
        groups.push(g)
        walk(n.children, g.id)
        continue
      }
      const c = n.canvas as HTMLCanvasElement | undefined
      if (!c || !c.width || !c.height) continue
      const l: RasterLayer = {
        ...baseLayer(n.name || 'Layer'), type: 'raster', canvas: c,
        x: n.left ?? 0, y: n.top ?? 0, opacity: n.opacity ?? 1,
        visible: n.hidden !== true, blend: PSD_BLEND[n.blendMode as string] ?? 'source-over', groupId,
      }
      layers.push(l)
    }
  }
  // PSD stores bottom layer first, which matches our array order.
  walk(psd.children ?? [], null)
  if (!layers.length) { ed.notify('That PSD has no layers we can read. Try flattening it first.'); return }

  ed.newDoc({ name: name.replace(/\.psd$/i, ''), width: W, height: H, background: null })
  useEditor.setState({ layers, groups, activeId: layers[layers.length - 1].id, selectedIds: [layers[layers.length - 1].id] })
  useEditor.getState().commit('Import PSD')
  useEditor.setState({ dirty: true })
  ed.notify(`Imported ${layers.length} layer${layers.length === 1 ? '' : 's'} from the PSD.`)
}

/** Render each PDF page to its own raster layer, stacked, page 1 on top. */
export async function importPdf(file: Blob, name: string) {
  const ed = useEditor.getState()
  ed.setBusy('Opening PDF')
  try {
    const pdfjs: any = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    const pages: HTMLCanvasElement[] = []
    const scaleFor = (vw: number) => Math.min(2, Math.max(1, 1600 / vw))
    for (let i = 1; i <= doc.numPages; i++) {
      ed.setBusy(`Rendering page ${i} of ${doc.numPages}`)
      const page = await doc.getPage(i)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: scaleFor(base.width) })
      const c = makeCanvas(viewport.width, viewport.height)
      await page.render({ canvasContext: ctx2d(c), viewport }).promise
      pages.push(c)
    }
    if (!pages.length) { ed.notify('That PDF has no pages we can read.'); return }
    const w = pages[0].width, h = pages[0].height
    ed.newDoc({ name: name.replace(/\.pdf$/i, ''), width: w, height: h, background: '#ffffff' })
    const layers: Layer[] = pages.map((c, i) => ({ ...baseLayer(`Page ${i + 1}`), type: 'raster', canvas: c, visible: i === 0 } as RasterLayer))
    useEditor.setState({ layers, activeId: layers[0].id, selectedIds: [layers[0].id] })
    useEditor.getState().commit('Import PDF')
    useEditor.setState({ dirty: true })
    ed.notify(doc.numPages > 1 ? `Imported ${doc.numPages} pages as layers. Only page 1 is shown; turn the others on in the Layers panel.` : 'PDF imported.')
  } catch (e) {
    console.error(e); ed.notify('Could not open that PDF. It may be password protected.')
  } finally { ed.setBusy(null) }
}

export function importAny(files: File[]) {
  for (const f of files) {
    const n = f.name.toLowerCase()
    if (n.endsWith('.psd')) importPsd(f, f.name)
    else if (n.endsWith('.pdf')) importPdf(f, f.name)
    else { /* handled by the normal image importer */ }
  }
}
