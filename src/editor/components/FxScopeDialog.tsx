'use client'

import { useEffect, useState } from 'react'
import { useEditor, ADJUSTMENT_LABELS } from '../store'
import { layerBounds, makeCanvas, renderDoc } from '../engine'
import { copyEffect, effectLabel, type FxTarget } from '../effects'
import type { Effect, Group, Layer } from '../types'
import { useUi } from '../ui-store'
import { Button, Modal } from './ui'
import { applyScope } from './EffectsSection'

// Asked once when a blur, grain or other spatial effect goes on a group, or on several layers in one group:
// should it treat them as one image, or each layer on its own? Each choice shows what it would look like.

export function FxScopeDialog({ targets, fx, onClose }: { targets: FxTarget[]; fx: Effect; onClose: () => void }) {
  const [shots, setShots] = useState<{ one: string; each: string } | null>(null)
  const [remember, setRemember] = useState(false)
  const name = effectLabel(fx, ADJUSTMENT_LABELS)
  const key = fx.kind === 'voidEffect' ? 'void:' + fx.effect : fx.kind

  useEffect(() => {
    let live = true
    const t = setTimeout(() => { try { const r = previews(targets, fx); if (live) setShots(r) } catch { if (live) setShots({ one: '', each: '' }) } }, 30)
    return () => { live = false; clearTimeout(t) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (how: 'one' | 'each') => {
    if (remember) useUi.getState().setPref('fxScope', { ...(useUi.getState().fxScope ?? {}), [key]: how })
    onClose()
    applyScope(targets, fx, how)
  }
  const card = (how: 'one' | 'each', title: string, text: string, img?: string) => (
    <button onClick={() => choose(how)} data-fx-scope={how} className="flex-1 min-w-0 text-left rounded-xl border border-white/[0.08] bg-surface-sunken hover:border-accent/70 p-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
      <div className="h-36 rounded-lg bg-[repeating-conic-gradient(#2a2a31_0%_25%,#202026_0%_50%)] bg-[length:16px_16px] flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img ? <img src={img} alt="" className="max-w-full max-h-full object-contain" /> : <span className="text-[12px] text-void-500">{shots ? '' : 'Drawing…'}</span>}
      </div>
      <p className="mt-2 text-[13px] font-medium text-void-100">{title}</p>
      <p className="text-[12px] text-void-400 leading-snug">{text}</p>
    </button>
  )
  return (
    <Modal title={`${name}: one image, or each layer?`} onClose={onClose} wide>
      <div className="p-5 space-y-4" data-fx-scope-dialog>
        <div className="flex flex-col sm:flex-row gap-3">
          {card('one', 'As one image', `The ${name.toLowerCase()} runs over what the layers make together, like one flat picture.`, shots?.one)}
          {card('each', 'On each layer', `Each layer gets its own ${name.toLowerCase()}, linked, so changing one changes them all.`, shots?.each)}
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[12.5px] text-void-300"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Remember for {name}</label>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}

/** Small pictures of both choices, drawing only the layers involved. */
function previews(targets: FxTarget[], fx: Effect): { one: string; each: string } {
  const st = useEditor.getState(); const doc = st.doc!
  const inScope = (l: Layer) => targets.some(t => (t.type === 'layer' && t.id === l.id) || (t.type === 'group' && inGroupId(l, t.id, st.groups)))
  const list = st.layers.filter(inScope)
  if (!list.length) return { one: '', each: '' }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const l of list) { if (l.type === 'adjustment') continue; const b = layerBounds(l, doc); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h) }
  if (!(x1 > x0)) return { one: '', each: '' }
  const pad = 24, region = { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 }
  const scale = Math.min(1, 420 / Math.max(region.w, region.h))
  const draw = (layers: Layer[], groups: Group[]) => { const c = makeCanvas(1, 1); renderDoc(c, doc, layers, { groups, scale, region, noCache: true, fxDraft: true, transparent: true, frameRects: doc.frames ?? [] }); return c.toDataURL('image/png') }
  // As one image: one group carries the effect. For several things, a preview group holds them.
  let oneLayers = list, oneGroups = st.groups
  if (targets.length === 1 && targets[0].type === 'group') {
    const g0 = targets[0].id
    oneGroups = st.groups.map(g => (g.id === g0 ? { ...g, effects: [...(g.effects ?? []), copyEffect(fx)] } : g))
  } else {
    const gid = '__preview', parent = parentOf(targets[0], st.layers, st.groups)
    oneGroups = [...st.groups.map(g => (targets.some(t => t.type === 'group' && t.id === g.id) ? { ...g, parentId: gid } : g)), { id: gid, name: 'Preview', visible: true, opacity: 1, collapsed: false, parentId: parent, effects: [copyEffect(fx)] }]
    oneLayers = list.map(l => (targets.some(t => t.type === 'layer' && t.id === l.id) ? ({ ...l, groupId: gid } as Layer) : l))
  }
  const one = draw(oneLayers, oneGroups)
  // Each layer: every layer in scope carries its own copy.
  const each = draw(list.map(l => (l.type === 'adjustment' ? l : { ...l, effects: [...(l.effects ?? []), copyEffect(fx)] } as Layer)), st.groups)
  return { one, each }
}

function parentOf(t: FxTarget, layers: Layer[], groups: Group[]): string | null {
  if (t.type === 'layer') return layers.find(l => l.id === t.id)?.groupId ?? null
  if (t.type === 'group') return groups.find(g => g.id === t.id)?.parentId ?? null
  return null
}

function inGroupId(l: Layer, gid: string, groups: Group[]): boolean {
  let id = l.groupId ?? null, n = 0
  while (id && n++ < 64) { if (id === gid) return true; id = groups.find(g => g.id === id)?.parentId ?? null }
  return false
}
