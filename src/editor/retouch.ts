import { base, useEditor } from './store'
import { ctx2d, healRegion, layerMatrix, makeCanvas, renderDoc } from './engine'
import type { Layer } from './types'

export function retouchSource() {
  const s = useEditor.getState(),
    l = s.active(),
    doc = s.doc
  if (!doc || !l || l.locked || l.lockPixels || s.editingMask) return null
  const mode = s.options.retouchSample ?? 'all'
  const index = s.layers.findIndex((x) => x.id === l.id)
  const layers =
    mode === 'current'
      ? [{ ...l, clipId: null } as Layer]
      : mode === 'below'
        ? s.layers.slice(0, index + 1)
        : s.layers
  const canvas = makeCanvas(doc.width, doc.height)
  renderDoc(canvas, doc, layers, { groups: s.groups, transparent: true, noCache: true, frameRects: [] })
  return {
    canvas,
    layerId: l.id,
    docId: doc.id,
    rev: s.docRev,
    layers,
    groups: s.groups,
    mode,
    separate: s.options.retouchSeparate !== false,
  }
}
export type RetouchSource = NonNullable<ReturnType<typeof retouchSource>>
export function repair(source: RetouchSource, hole: HTMLCanvasElement, excluded: HTMLCanvasElement = hole) {
  return healRegion(source.canvas, hole, excluded)
}
/** Only the patch is output: the captured original, its transforms and effects remain editable. */
export function applyRepair(
  source: RetouchSource,
  result: HTMLCanvasElement,
  hole: HTMLCanvasElement,
  label = 'Heal',
) {
  const s = useEditor.getState(),
    layer = s.layers.find((l) => l.id === source.layerId)
  if (s.doc?.id !== source.docId || s.docRev !== source.rev || !layer || layer.locked || layer.lockPixels) {
    s.notify('The design changed during the preview. Make a new repair.')
    return false
  }
  const patch = makeCanvas(result.width, result.height),
    x = ctx2d(patch)
  // Repair output is already alpha-blended with the captured source. Recover the donor colour,
  // then emit a patch with coverage once, so feathered selections are not attenuated twice.
  const src = ctx2d(source.canvas).getImageData(0, 0, result.width, result.height).data
  const im = ctx2d(result).getImageData(0, 0, result.width, result.height),
    mask = ctx2d(hole).getImageData(0, 0, result.width, result.height).data
  for (let i = 0; i < im.data.length; i += 4) {
    const a = mask[i + 3] / 255
    if (a > 0 && a < 1) {
      for (let ch = 0; ch < 3; ch++) im.data[i + ch] = (im.data[i + ch] - src[i + ch] * (1 - a)) / a
    }
  }
  x.putImageData(im, 0, 0)
  x.globalCompositeOperation = 'destination-in'
  x.drawImage(hole, 0, 0)
  if (source.separate) {
    const l: Layer = {
      ...base(label + ' patch'),
      type: 'raster',
      canvas: patch,
      frameId: layer.frameId,
      groupId: layer.groupId,
    }
    // Insert directly above the sampled destination, without changing selection or Draw Inside host.
    const i = s.layers.indexOf(layer)
    useEditor.setState({
      layers: [...s.layers.slice(0, i + 1), l, ...s.layers.slice(i + 1)],
      activeId: l.id,
      selectedIds: [l.id],
      editingMask: false,
      docRev: s.docRev + 1,
    })
    s.commit(label)
  } else {
    if (layer.type !== 'raster' || layer.smart || layer.liquify) {
      s.notify('Use a separate patch for editable objects.')
      return false
    }
    const c = makeCanvas(layer.canvas.width, layer.canvas.height),
      y = ctx2d(c)
    y.drawImage(layer.canvas, 0, 0)
    // Patch is document space; painting current pixels must retain their local transform.
    y.setTransform(layerMatrix(layer, s.doc!).inverse())
    y.drawImage(patch, 0, 0)
    s.updateLayer(layer.id, { canvas: c }, label)
  }
  return true
}

export async function repairAsync(source: RetouchSource, hole: HTMLCanvasElement, excluded = hole) {
  const { runPixels } = await import('./pixel-worker')
  const w = source.canvas.width,
    h = source.canvas.height,
    im = ctx2d(source.canvas).getImageData(0, 0, w, h)
  const result = await runPixels({
    kind: 'heal',
    src: im.data,
    w,
    h,
    hole: ctx2d(hole).getImageData(0, 0, w, h).data,
    excluded: ctx2d(excluded).getImageData(0, 0, w, h).data,
  })
  if (!result) return null
  im.data.set(result)
  const out = makeCanvas(w, h)
  ctx2d(out).putImageData(im, 0, 0)
  return out
}
