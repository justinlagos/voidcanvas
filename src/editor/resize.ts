import { uid } from './engine'
import { relayout } from './layout'
import { ensureFramed } from './store'
import type { Doc, Frame, Group, Layer } from './types'

/**
 * Re-lay a design (or one board of it) as a new single-page design at another size. Uses the same
 * layout as Cascade: groups stay together, panels restack to suit the shape, backgrounds cover.
 */
export function resizeDesign(doc: Doc, layers: Layer[], width: number, height: number, name: string, groups: Group[] = [], frameId?: string | null): { doc: Doc; layers: Layer[] } {
  const f = ensureFramed(doc, layers)
  const master = f.doc.frames!.find(x => x.id === frameId) ?? f.doc.frames![0]
  const t: Frame = { id: uid(), name, x: 0, y: 0, width, height, background: master.background }
  const r = relayout(f.layers.filter(l => l.frameId === master.id), master, t, f.doc, groups)
  const out = r.layers.map(l => ({ ...l, frameId: null, srcId: null } as Layer))
  return { doc: { ...doc, id: uid(), name, width, height, frames: undefined, background: master.background }, layers: out }
}
