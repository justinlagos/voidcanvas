import { makeCanvas, renderDoc, uid } from './engine'
import { boardGap, occupied, placeRowBelow } from './frames'
import { analyse, regroup, relayout, type Panel } from './layout'
import { inferRoles, orderLikeMaster, syncFormats } from './adapt'
import { ensureFramed, prune, useEditor } from './store'
import type { Doc, Frame, Layer } from './types'
import type { SizePreset } from './presets'

// Cascade: lay the active board out at other sizes, as linked boards under it.

/** The master board Cascade works from, and its panels, for the dialog. */
export function cascadeSource(frameId: string | null): { doc: Doc; layers: Layer[]; master: Frame; panels: Panel[] } | null {
  const s = useEditor.getState(); if (!s.doc) return null
  const { doc, layers } = ensureFramed(s.doc, s.layers)
  const master = doc.frames!.find(f => f.id === frameId) ?? doc.frames![0]
  const panels = analyse(layers.filter(l => l.frameId === master.id), master, doc, s.groups, { preserveGroups: true }).panels
  return { doc, layers, master, panels }
}

/** A small picture of how a size will come out, before anything is created. */
export function previewCascade(frameId: string | null, p: { width: number; height: number }, skip: Set<string>, px = 180): { url: string; dropped: string[]; droppedIds: string[]; review: string[] } | null {
  const src = cascadeSource(frameId); if (!src) return null
  const { doc, layers, master } = src
  const groups = useEditor.getState().groups
  const t: Frame = { id: 'preview', name: 'preview', x: 0, y: 0, width: p.width, height: p.height, background: master.background }
  const r = relayout(layers.filter(l => l.frameId === master.id), master, t, doc, groups, x => !skip.has(x.id), { preserveAll: true })
  const scale = Math.min(1, px / Math.max(p.width, p.height))
  const c = makeCanvas(Math.max(1, Math.round(p.width * scale)), Math.max(1, Math.round(p.height * scale)))
  renderDoc(c, { ...doc, frames: [t] }, r.layers, { groups, scale, noCache: true, fxDraft: true, noShadow: true, region: { x: 0, y: 0, w: p.width, h: p.height }, frameRects: [t] })
  return { url: c.toDataURL('image/jpeg', 0.75), dropped: r.dropped, droppedIds: r.droppedIds, review: r.review }
}

/**
 * Build one linked board per size, laid out from the master, in a tidy row under everything that
 * is already there. One undo step.
 */
export function cascadeToFrames(sourceFrameId: string | null, presets: SizePreset[], skip: Set<string> = new Set()): boolean {
  const st = useEditor.getState()
  if (!st.doc) return false
  const { doc, layers: base } = ensureFramed(st.doc, st.layers)
  const master = doc.frames!.find(f => f.id === sourceFrameId) ?? doc.frames![0]
  const masterLayers = base.filter(l => l.frameId === master.id)
  const sourcePanels = analyse(masterLayers, master, doc, st.groups, { preserveGroups: true }).panels
  const excludedSourceIds = Array.from(new Set(sourcePanels.filter(p => skip.has(p.id))
    .flatMap(p => p.blocks.flatMap(b => b.layers.map(l => l.id)))))
  const sizes = presets.filter(p => !(p.width === master.width && p.height === master.height))
    .slice().sort((a, b) => b.width / b.height - a.width / a.height)
  if (!sizes.length) { st.notify('The board is already that size.'); return false }
  const gap = boardGap([master, ...sizes])
  const spots = placeRowBelow(occupied(doc, base), master.x, sizes, gap)
  let layers = [...base], groups = [...st.groups]
  const frames = [...doc.frames!]
  const notes: string[] = []
  const failures: string[] = []
  sizes.forEach((p, i) => {
    const f: Frame = { id: uid(), name: p.label, x: spots[i].x, y: spots[i].y, width: p.width, height: p.height, background: master.background, linkedFrom: master.id, cascadeExcludedSrcIds: excludedSourceIds }
    const r = relayout(masterLayers, master, f, doc, st.groups, x => !skip.has(x.id), { preserveAll: true })
    const g = regroup(r.layers, st.groups)
    layers = layers.concat(g.layers); groups = groups.concat(g.groups)
    frames.push(f)
    const auto = r.droppedIds.filter(id => !skip.has(id))
    if (auto.length) failures.push(`${p.label}: missing ${auto.join(', ')}`)
    if (r.review.length) notes.push(`${p.label}: ${r.review.join('; ')}`)
  })
  // Never publish a partially generated cascade if the strict engine omitted
  // content that the designer did not explicitly exclude.
  if (failures.length) {
    st.notify(`Cascade stopped: ${failures.join('; ')}. No boards were created.`)
    return false
  }
  st.applyBoards({ ...doc, frames }, layers, groups, `Cascade to ${sizes.length} size${sizes.length === 1 ? '' : 's'}`, master.id)
  st.notify(`${sizes.length} board${sizes.length === 1 ? '' : 's'} created from “${master.name}”.${notes.length ? ' Review before exporting: ' + notes.slice(0, 3).join('; ') : ' Review all formats before exporting.'} Undo removes them.`)
  return true
}

/** Safely refresh shared content without discarding each variant's adjusted layout. */
export function resyncVariants(masterId: string) {
  const s = useEditor.getState()
  const doc = s.doc
  if (!doc?.frames) return
  const master = doc.frames.find(f => f.id === masterId)
  if (!master) return
  const children = doc.frames.filter(f => f.linkedFrom === masterId)
  if (!children.length) { s.notify('This board has no linked variants. Use Cascade to create some.'); return }

  // Resetting variant geometry here used to silently erase manual crop and
  // positioning decisions. Sync content instead; deliberate re-layout remains
  // a separate editor command.
  const roles = inferRoles(s.layers, master, doc)
  const result = syncFormats(doc, s.layers, masterId, roles)
  if (!result.changed) { s.notify('Linked variants already match the master.'); return }
  const layers = orderLikeMaster(result.layers, masterId)
  s.applyBoards({ ...doc }, layers, prune(s.groups, layers), 'Update linked variants', masterId)
  s.notify(`Updated shared content on ${children.length} linked variant${children.length === 1 ? '' : 's'}. Manual layout positions were preserved.`)
}
