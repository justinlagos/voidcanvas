import { makeCanvas, renderDoc, uid } from './engine'
import { boardGap, occupied, placeRowBelow } from './frames'
import { analyse, regroup, relayout, type Panel } from './layout'
import { ensureFramed, prune, useEditor } from './store'
import type { Doc, Frame, Layer } from './types'
import type { SizePreset } from './presets'
import { stampCascadeBaseline, reconcileCascadeBoard } from './cascade-integrity'
import { auditCascadeLayout, type CascadeIssue } from './cascade-quality'
import { decideCascadeConflict, type CascadeChoice } from './cascade-resolve'

// Cascade: lay the active board out at other sizes, as linked boards under it.

/** The master board Cascade works from, and its panels, for the dialog. */
export function cascadeSource(frameId: string | null): { doc: Doc; layers: Layer[]; master: Frame; panels: Panel[] } | null {
  const s = useEditor.getState(); if (!s.doc) return null
  const { doc, layers } = ensureFramed(s.doc, s.layers)
  const master = doc.frames!.find(f => f.id === frameId) ?? doc.frames![0]
  const panels = analyse(layers.filter(l => l.frameId === master.id), master, doc, s.groups).panels
  return { doc, layers, master, panels }
}

/** A small picture of how a size will come out, before anything is created. */
export function previewCascade(frameId: string | null, p: { width: number; height: number }, skip: Set<string>, px = 180): { url: string; dropped: string[]; issues: CascadeIssue[] } | null {
  const src = cascadeSource(frameId); if (!src) return null
  const { doc, layers, master } = src
  const groups = useEditor.getState().groups
  const t: Frame = { id: 'preview', name: 'preview', x: 0, y: 0, width: p.width, height: p.height, background: master.background }
  const r = relayout(layers.filter(l => l.frameId === master.id), master, t, doc, groups, x => !skip.has(x.name))
  const scale = Math.min(1, px / Math.max(p.width, p.height))
  const c = makeCanvas(Math.max(1, Math.round(p.width * scale)), Math.max(1, Math.round(p.height * scale)))
  renderDoc(c, { ...doc, frames: [t] }, r.layers, { groups, scale, noCache: true, fxDraft: true, noShadow: true, region: { x: 0, y: 0, w: p.width, h: p.height }, frameRects: [t] })
  const skipped = new Set(src.panels.filter(p => skip.has(p.name)).flatMap(p => p.blocks.flatMap(b => b.layers.map(l => l.id))))
  const quality = auditCascadeLayout(layers.filter(l => l.frameId === master.id), r.layers, t, doc, { skippedSourceIds: skipped })
  return { url: c.toDataURL('image/jpeg', 0.75), dropped: r.dropped, issues: quality.issues }
}

/**
 * Build one linked board per size, laid out from the master, in a tidy row under everything that
 * is already there. One undo step.
 */
export function cascadeToFrames(sourceFrameId: string | null, presets: SizePreset[], skip: Set<string> = new Set()) {
  const st = useEditor.getState()
  if (!st.doc) return
  const { doc, layers: base } = ensureFramed(st.doc, st.layers)
  const master = doc.frames!.find(f => f.id === sourceFrameId) ?? doc.frames![0]
  const masterLayers = base.filter(l => l.frameId === master.id)
  const sizes = presets.filter(p => !(p.width === master.width && p.height === master.height))
    .slice().sort((a, b) => b.width / b.height - a.width / a.height)
  if (!sizes.length) { st.notify('The board is already that size.'); return }
  const gap = boardGap([master, ...sizes])
  const spots = placeRowBelow(occupied(doc, base), master.x, sizes, gap)
  let layers = [...base], groups = [...st.groups]
  const frames = [...doc.frames!]
  const notes: string[] = []
  const skippedIds = new Set(analyse(masterLayers, master, doc, st.groups).panels
    .filter(p => skip.has(p.name)).flatMap(p => p.blocks.flatMap(b => b.layers.map(l => l.id))))
  let missingEssential = false
  let layoutRisks = 0
  sizes.forEach((p, i) => {
    const f: Frame = { id: uid(), name: p.label, x: spots[i].x, y: spots[i].y, width: p.width, height: p.height, background: master.background, linkedFrom: master.id }
    const r = relayout(masterLayers, master, f, doc, st.groups, x => !skip.has(x.name))
    const g = regroup(r.layers, st.groups)
    const quality = auditCascadeLayout(masterLayers, g.layers, f, doc, { skippedSourceIds: skippedIds })
    if (quality.criticalCount) { missingEssential = true; notes.push(`${p.label}: essential content missing`) }
    layoutRisks += quality.reviewCount
    layers = layers.concat(stampCascadeBaseline(g.layers, masterLayers)); groups = groups.concat(g.groups)
    frames.push(f)
    const auto = r.dropped.filter(n => !skip.has(n))
    if (auto.length) notes.push(`${p.label}: left out ${auto.join(', ')}`)
  })
  if (missingEssential) {
    st.notify('Cascade stopped: a required logo, headline or CTA was missing in a destination. No boards were created.')
    return
  }
  st.applyBoards({ ...doc, frames }, layers, groups, `Cascade to ${sizes.length} size${sizes.length === 1 ? '' : 's'}`, master.id)
  st.notify(`${sizes.length} board${sizes.length === 1 ? '' : 's'} laid out from “${master.name}”.${notes.length ? ' ' + notes.join('. ') + ' (too small to read at that size).' : ''}${layoutRisks ? ` Check ${layoutRisks} layout warning(s) in the previews.` : ''} Undo removes them.`)
}

/** Reconcile linked boards in one undo step without destroying edited instances. */
export function resyncVariants(masterId: string) {
  const s = useEditor.getState()
  const doc = s.doc; if (!doc?.frames) return
  const master = doc.frames.find(f => f.id === masterId); if (!master) return
  const children = doc.frames.filter(f => f.linkedFrom === masterId)
  if (!children.length) { s.notify('This board has no linked variants. Use Cascade to create some.'); return }
  const masterLayers = s.layers.filter(l => l.frameId === masterId)
  let layers = [...s.layers]
  let groups = [...s.groups]
  let conflicts: string[] = [], reused = 0, added = 0
  for (const child of children) {
    const old = layers.filter(l => l.frameId === child.id)
    const proposed = regroup(relayout(masterLayers, master, child, doc, s.groups).layers, s.groups)
    const r = reconcileCascadeBoard(masterLayers, old, groups, proposed.layers, proposed.groups)
    layers = layers.filter(l => l.frameId !== child.id).concat(r.layers)
    const existing = new Set(groups.map(g => g.id))
    groups = groups.concat(r.groups.filter(g => !existing.has(g.id)))
    conflicts = conflicts.concat(r.conflicts)
    reused += r.reused; added += r.added
  }
  s.applyBoards({ ...doc }, layers, prune(groups, layers), 'Update linked variants', masterId)
  s.notify(`Updated ${children.length} linked board(s): preserved ${reused} object identities, added ${added} new objects.` +
    (conflicts.length ? ` ${conflicts.length} conflict(s): ${conflicts.slice(0, 2).join('; ')}. Variant artwork was kept.` : ''))
}

/**
 * An explicit designer choice: keep a local override or inherit the current
 * master property. Uses exactly one existing store history transaction.
 */
export function resolveCascadeConflict(layerId: string, key: string, choice: CascadeChoice): boolean {
  const s = useEditor.getState()
  const doc = s.doc
  const variant = s.layers.find(l => l.id === layerId)
  const board = doc?.frames?.find(f => f.id === variant?.frameId)
  const masterBoard = doc?.frames?.find(f => f.id === board?.linkedFrom)
  const master = s.layers.find(l => l.id === variant?.srcId && l.frameId === masterBoard?.id)
  if (!doc || !variant || !board?.linkedFrom || !masterBoard || !master) {
    s.notify('Cannot resolve this conflict because its source board or layer is missing.')
    return false
  }
  if (variant.locked || master.locked) {
    s.notify('Unlock the linked object and its master before resolving the conflict.')
    return false
  }
  // Relayout the ENTIRE master composition to preserve the target's vector
  // geometry contract. A one-layer relayout changes slot allocation.
  const proposal = key === 'vector path'
    ? relayout(s.layers.filter(l => l.frameId === masterBoard.id), masterBoard, board, doc, s.groups)
        .layers.find(l => l.srcId === master.id)
    : undefined
  const result = decideCascadeConflict(variant, master, key, choice, proposal)
  if (!result.ok) { s.notify(result.reason); return false }
  s.updateLayer(layerId, result.layer, 'Resolve Cascade conflict')
  s.notify(choice === 'variant' ? 'Kept the linked board’s own ' + key + '.' : 'Used the master’s ' + key + ' for this linked object.')
  return true
}
