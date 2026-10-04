import { base, useEditor } from './store'
import { cloneCanvas, ctx2d, layerSize, makeCanvas, renderDoc, uid } from './engine'
import { blobToCanvas, openProject, restoreStored, saveProject, storeDesign } from './io'
import { readVoid, writeVoid } from './voidfile'
import { useTabs } from './tabs'
import type { Doc, Layer, RasterLayer } from './types'

async function sourceFile(doc: Doc, layers: Layer[], groups: import('./types').Group[] = []) {
  const { smartParent, ...d } = doc
  return writeVoid((await storeDesign(d, layers, groups, [])).stored)
}
export async function convertSmart() {
  const s = useEditor.getState(),
    l = s.active()
  if (!s.doc || !l || l.type === 'adjustment' || l.locked || l.lockPixels) return
  if (l.type === 'raster' && l.smart) return
  const { w, h } = layerSize(l, s.doc),
    doc: Doc = {
      id: uid(),
      name: l.name + ' contents',
      width: w,
      height: h,
      background: null,
      dpi: s.doc.dpi,
    }
  const child = {
    ...l,
    id: uid(),
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    clipId: null,
    groupId: null,
    frameId: null,
    opacity: 1,
    blend: 'source-over',
    styles: null,
    effects: null,
  } as Layer
  const c = makeCanvas(w, h)
  renderDoc(c, doc, [child], { transparent: true, noCache: true, frameRects: [] })
  const contents = await sourceFile(doc, [child])
  if (useEditor.getState().doc?.id !== s.doc.id || useEditor.getState().active()?.rev !== l.rev) return
  const smart: RasterLayer = {
    ...l,
    type: 'raster',
    canvas: c,
    mask: null,
    vmask: null,
    smart: { id: uid(), contents },
  } as RasterLayer
  s.updateLayer(l.id, smart, 'Convert to smart object')
}
export async function editSmart() {
  const s = useEditor.getState(),
    l = s.active()
  if (!s.doc || l?.type !== 'raster' || !l.smart) return
  const parent = { docId: s.doc.id, layerId: l.id, sourceId: l.smart.id }
  await saveProject()
  if (l.smart.editOriginal && l.smart.original && /\.ps[db]$/i.test(l.smart.originalName ?? '')) {
    await import('./import-formats').then((m) => m.importPsd(l.smart!.original!, l.smart!.originalName!))
    const child = useEditor.getState().doc
    if (child && child.id !== parent.docId) {
      useEditor.setState({ doc: { ...child, smartParent: parent } })
      useTabs.getState().sync()
    }
    return
  }
  const p = await readVoid(new Uint8Array(await l.smart.contents.arrayBuffer()))
  const r = await restoreStored(p.project)
  useEditor.getState().loadProject({ ...r.doc, smartParent: parent }, r.layers, p.project.swatches, r.groups)
  useTabs.getState().sync()
}
export async function applySmart() {
  const s = useEditor.getState(),
    doc = s.doc,
    parent = doc?.smartParent
  if (!doc || !parent) return
  const contents = await sourceFile(doc, s.layers, s.groups),
    c = makeCanvas(doc.width, doc.height)
  renderDoc(c, doc, s.layers, { groups: s.groups, transparent: true, noCache: true, frameRects: [] })
  await saveProject()
  if (!(await openProject(parent.docId))) {
    s.notify('The parent design could not be opened. Contents remain saved in this tab.')
    return
  }
  const st = useEditor.getState(),
    l = st.layers.find((l) => l.id === parent.layerId)
  if (l?.type !== 'raster' || l.smart?.id !== parent.sourceId || l.locked || l.lockPixels) {
    st.notify('The parent object changed or is locked. The edited contents remain in their saved tab.')
    return
  }
  st.updateLayer(
    l.id,
    {
      canvas: c,
      smart: { ...l.smart, contents, editOriginal: false },
      scaleX: (l.scaleX * l.canvas.width) / c.width,
      scaleY: (l.scaleY * l.canvas.height) / c.height,
    },
    'Update smart contents',
  )
  useTabs.getState().sync()
  await saveProject()
}
export async function replaceSmart(file: File) {
  const s = useEditor.getState(),
    l = s.active()
  if (!s.doc || l?.type !== 'raster' || !l.smart || l.locked || l.lockPixels) return
  let contents: Blob, c: HTMLCanvasElement
  if (/\.void$/i.test(file.name)) {
    const p = await readVoid(new Uint8Array(await file.arrayBuffer())),
      r = await restoreStored(p.project)
    c = makeCanvas(r.doc.width, r.doc.height)
    renderDoc(c, r.doc, r.layers, { groups: r.groups, transparent: true, noCache: true, frameRects: [] })
    contents = file
  } else {
    c = await blobToCanvas(file)
    const doc: Doc = { id: uid(), name: file.name, width: c.width, height: c.height, background: null }
    contents = await sourceFile(doc, [{ ...base(file.name), type: 'raster', canvas: cloneCanvas(c) }])
  }
  if (
    useEditor.getState().doc?.id !== s.doc.id ||
    useEditor.getState().layers.find((x) => x.id === l.id)?.rev !== l.rev
  )
    return
  s.updateLayer(
    l.id,
    {
      canvas: c,
      smart: { ...l.smart, contents, original: file, originalName: file.name, editOriginal: false },
      scaleX: (l.scaleX * l.canvas.width) / c.width,
      scaleY: (l.scaleY * l.canvas.height) / c.height,
    },
    'Replace smart contents',
  )
}
export function pickSmartReplacement() {
  const i = document.createElement('input')
  i.type = 'file'
  i.accept = 'image/*,.void'
  i.onchange = () => {
    if (i.files?.[0]) replaceSmart(i.files[0]).catch((e) => useEditor.getState().notify(String(e)))
  }
  i.click()
}
