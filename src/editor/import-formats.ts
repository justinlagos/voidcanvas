import { readPsd } from 'ag-psd'
import { ctx2d, makeCanvas, uid } from './engine'
import { nextRev, useEditor } from './store'
import type { Doc, Frame, Group, Layer, RasterLayer } from './types'

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

/** Photoshop artboard background: 1 white, 2 black, 3 transparent, 4 custom colour. */
function artboardBackground(ab: any): string | null {
  const t = ab?.backgroundType
  if (t === 3) return null
  if (t === 2) return '#000000'
  if (t === 4 && ab.color) { const c = ab.color; const h = (v: number) => Math.round(Math.max(0, Math.min(255, v ?? 0))).toString(16).padStart(2, '0'); return `#${h(c.r)}${h(c.g)}${h(c.b)}` }
  return '#ffffff'
}

/**
 * Open a .psd as a real layered document: every raster layer, its position, opacity, blend mode and group.
 * Photoshop artboards become Void Canvas boards, keeping their size, background and arrangement,
 * with the layers inside each artboard belonging to that board. Groups inside an artboard stay groups.
 * Layers outside any artboard stay on the pasteboard, as in Photoshop.
 */
export async function importPsd(file: Blob, name: string) {
  const ed = useEditor.getState()
  const buf = await file.arrayBuffer()
  const psd = readPsd(buf, { skipThumbnail: true, useImageData: false })
  const W = psd.width, H = psd.height
  const docName = name.replace(/\.psd$/i, '')
  const layers: Layer[] = []
  const groups: Group[] = []

  const walk = (nodes: any[], groupId: string | null, frameId: string | null) => {
    for (const n of nodes) {
      if (n.children) {
        const g: Group = { id: uid(), name: n.name || 'Group', visible: n.hidden !== true, opacity: n.opacity ?? 1, collapsed: false }
        groups.push(g)
        walk(n.children, g.id, frameId)
        continue
      }
      const c = n.canvas as HTMLCanvasElement | undefined
      if (!c || !c.width || !c.height) continue
      const l = {
        ...baseLayer(n.name || 'Layer'), type: 'raster', canvas: c,
        x: n.left ?? 0, y: n.top ?? 0, opacity: n.opacity ?? 1,
        visible: n.hidden !== true, blend: PSD_BLEND[n.blendMode as string] ?? 'source-over', groupId, frameId,
      } as RasterLayer
      layers.push(l)
    }
  }

  const top: any[] = psd.children ?? []
  const artboards = top.filter(n => n.artboard?.rect)

  if (!artboards.length) {
    walk(top, null, null)
    if (!layers.length) { ed.notify('That PSD has no layers we can read. Try flattening it first.'); return }
    for (const l of layers) delete (l as any).frameId
    ed.newDoc({ name: docName, width: W, height: H, background: null })
    useEditor.setState({ layers, groups, activeId: layers[layers.length - 1].id, selectedIds: [layers[layers.length - 1].id] })
    useEditor.getState().commit('Import PSD')
    useEditor.setState({ dirty: true })
    ed.notify(`Imported ${layers.length} layer${layers.length === 1 ? '' : 's'} from the PSD.`)
    return
  }

  // Boards in Photoshop's own positions. Artboard contents are walked with the board's id,
  // so nested groups stay groups and never turn into boards.
  const frames: Frame[] = []
  for (const n of top) {
    if (n.artboard?.rect) {
      const r = n.artboard.rect
      const f: Frame = { id: uid(), name: n.name || `Board ${frames.length + 1}`, x: r.left, y: r.top, width: Math.max(1, r.right - r.left), height: Math.max(1, r.bottom - r.top), background: artboardBackground(n.artboard) }
      frames.push(f)
      walk(n.children ?? [], null, f.id)
    } else walk([n], null, null)
  }
  if (!layers.length && !frames.length) { ed.notify('That PSD has no layers we can read. Try flattening it first.'); return }

  // Shift everything so the top-left of the work sits at 0,0, and size the document to hold it all.
  const boxes = [...frames.map(f => ({ x: f.x, y: f.y, r: f.x + f.width, b: f.y + f.height })),
    ...layers.filter(l => !l.frameId).map(l => { const c = (l as RasterLayer).canvas; return { x: l.x, y: l.y, r: l.x + c.width, b: l.y + c.height } })]
  const minX = Math.min(...boxes.map(b => b.x)), minY = Math.min(...boxes.map(b => b.y))
  const maxX = Math.max(...boxes.map(b => b.r)), maxY = Math.max(...boxes.map(b => b.b))
  for (const f of frames) { f.x -= minX; f.y -= minY }
  for (const l of layers) { l.x -= minX; l.y -= minY }
  const doc: Doc = { id: uid(), name: docName, width: Math.ceil(maxX - minX), height: Math.ceil(maxY - minY), background: null, frames }
  ed.loadFramed(doc, layers, undefined, groups)
  useEditor.setState({ dirty: true })
  const loose = layers.filter(l => !l.frameId).length
  ed.notify(`Imported ${frames.length} board${frames.length === 1 ? '' : 's'} from the PSD${loose ? `, plus ${loose} layer${loose === 1 ? '' : 's'} outside them` : ''}.`)
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
