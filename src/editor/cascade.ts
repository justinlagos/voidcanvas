import { layerBounds, makeCanvas, uid } from './engine'
import { nextRev, useEditor } from './store'
import type { Frame, Layer } from './types'
import type { SizePreset } from './presets'

/** Duplicate one board's layers into new boards of other sizes, re-laid to fit. */
export function cascadeToFrames(sourceFrameId: string | null, presets: SizePreset[]) {
  const s = useEditor.getState()
  const doc = s.doc; if (!doc) return
  // Ensure we have frames: if the doc is a plain canvas, wrap it as the first board.
  let frames = doc.frames ? [...doc.frames] : [{ id: uid(), name: doc.name, x: 0, y: 0, width: doc.width, height: doc.height, background: doc.background }]
  let layers = doc.frames ? [...s.layers] : s.layers.map(l => ({ ...l, frameId: frames[0].id }))
  const src = frames.find(f => f.id === sourceFrameId) ?? frames[0]
  const srcLayers = layers.filter(l => l.frameId === src.id)
  let ox = Math.max(...frames.map(f => f.x + f.width)) + 120

  for (const p of presets) {
    if (p.width === src.width && p.height === src.height) continue
    const nf: Frame = { id: uid(), name: p.label, x: ox, y: 0, width: p.width, height: p.height, background: src.background, linkedFrom: src.id }
    ox += p.width + 120
    const fit = Math.min(p.width / src.width, p.height / src.height)
    const cover = Math.max(p.width / src.width, p.height / src.height)
    for (const l of srcLayers) {
      const b = layerBounds({ ...l, x: l.x - src.x, y: l.y - src.y } as Layer, doc)
      const fills = b.w >= src.width * 0.95 && b.h >= src.height * 0.95
      const k = fills ? cover : fit
      const cx = (b.x + b.w / 2) / src.width, cy = (b.y + b.h / 2) / src.height
      const nl = { ...l, id: uid(), frameId: nf.id, rev: nextRev() } as Layer
      if (nl.type === 'text') { nl.fontSize = Math.max(4, nl.fontSize * k); nl.letterSpacing *= k }
      else if (nl.type === 'shape') { nl.w *= k; nl.h *= k; nl.strokeWidth *= k; nl.radius *= k }
      else if (nl.type === 'raster') { nl.scaleX *= k; nl.scaleY *= k }
      const nb = layerBounds(nl, doc)
      nl.x = nf.x + cx * p.width - nb.w / 2
      nl.y = nf.y + cy * p.height - nb.h / 2
      layers.push(nl)
    }
    frames.push(nf)
  }
  const width = Math.max(...frames.map(f => f.x + f.width))
  const height = Math.max(...frames.map(f => f.y + f.height))
  useEditor.getState().loadFramed({ ...doc, width, height, frames, background: null }, layers, undefined, s.groups)
  useEditor.getState().notify(`Cascaded to ${presets.length} boards.`)
}

/** Re-lay a master board's layers into a target frame's geometry, returning fresh layers for that frame. */
function relayInto(srcLayers: Layer[], src: Frame, target: Frame, doc: any): Layer[] {
  const fit = Math.min(target.width / src.width, target.height / src.height)
  const cover = Math.max(target.width / src.width, target.height / src.height)
  return srcLayers.map(l => {
    const b = layerBounds({ ...l, x: l.x - src.x, y: l.y - src.y } as Layer, doc)
    const fills = b.w >= src.width * 0.95 && b.h >= src.height * 0.95
    const k = fills ? cover : fit
    const cx = (b.x + b.w / 2) / src.width, cy = (b.y + b.h / 2) / src.height
    const nl = { ...l, id: uid(), frameId: target.id, rev: nextRev() } as Layer
    if (nl.type === 'text') { nl.fontSize = Math.max(4, nl.fontSize * k); nl.letterSpacing *= k }
    else if (nl.type === 'shape') { nl.w *= k; nl.h *= k; nl.strokeWidth *= k; nl.radius *= k }
    else if (nl.type === 'raster') { nl.scaleX *= k; nl.scaleY *= k }
    const nb = layerBounds(nl, doc)
    nl.x = target.x + cx * target.width - nb.w / 2
    nl.y = target.y + cy * target.height - nb.h / 2
    return nl
  })
}

/** Regenerate every board linked to `masterId` from the master's current content. */
export function resyncVariants(masterId: string) {
  const s = useEditor.getState()
  const doc = s.doc; if (!doc?.frames) return
  const master = doc.frames.find(f => f.id === masterId); if (!master) return
  const children = doc.frames.filter(f => f.linkedFrom === masterId)
  if (!children.length) { s.notify('This board has no linked variants. Use Cascade to create some.'); return }
  const masterLayers = s.layers.filter(l => l.frameId === masterId)
  // drop the children's old layers, rebuild from the master
  let layers = s.layers.filter(l => !children.some(c => c.id === l.frameId))
  for (const child of children) layers = [...layers, ...relayInto(masterLayers, master, child, doc)]
  useEditor.getState().loadFramed({ ...doc }, layers, undefined, s.groups)
  s.notify(`Updated ${children.length} linked variant${children.length === 1 ? '' : 's'} from this board.`)
}
