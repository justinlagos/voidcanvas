'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Eye, EyeOff, GripVertical, Link2, MoreHorizontal, Plus, Search, Unlink } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { effects as VOID_EFFECTS } from '@/components/effect-list'
import type { EffectType } from '@/store/useStore'
import { ADJUSTMENT_LABELS, asOneStep, groupChain, selectionUnits, useEditor } from '../store'
import { useUi } from '../ui-store'
import { BLEND_MODES, type AdjustmentKind, type Effect, type Group, type Layer, type LayerStyles, type StyleKind } from '../types'
import { effectLabel, isSpatial, linkedCopies, newEffect, orderMatters, sameTarget, stackOf, type FxTarget } from '../effects'
import { STYLE_KINDS, STYLE_LABELS, defaultStyle, emptyStyles } from '../styles'
import { openModal } from '../actions'
import { Floating } from './ColorPicker'
import { ColorField, Section, Select, Slider, focusRing } from './ui'
import { GradientControls } from './GradientControls'
import { SettingsControls } from './PropertiesPanel'

// The Effects section of Properties, for one target (a layer, a group, a board, the whole design) or for several
// layers at once (linked copies). Pixel effects run in order on the target's pixels; appearance (shadow, glow,
// stroke, overlays) is drawn around the result.

const COLOUR_KINDS: AdjustmentKind[] = ['brightnessContrast', 'hueSaturation', 'levels', 'curves', 'temperature', 'vibrance', 'exposure', 'colorBalance', 'blackWhite', 'photoFilter', 'gradientMap', 'channelMixer', 'invert', 'posterize', 'threshold']
const VOID_GROUPS: [string, string][] = [['enhance', 'Texture and light'], ['artistic', 'Artistic'], ['stylize', 'Stylise'], ['distortion', 'Distortion'], ['color', 'Colour looks']]
const fxName = (e: Pick<Effect, 'kind' | 'effect' | 'unknown'>) => effectLabel(e, ADJUSTMENT_LABELS)
const scopeKey = (e: Pick<Effect, 'kind' | 'effect'>) => (e.kind === 'voidEffect' ? 'void:' + e.effect : e.kind)

/** The parent group a selection unit sits in (null at the top level). */
function parentOf(t: FxTarget, layers: Layer[], groups: Group[]): string | null {
  if (t.type === 'layer') return layers.find(l => l.id === t.id)?.groupId ?? null
  if (t.type === 'group') return groups.find(g => g.id === t.id)?.parentId ?? null
  return null
}

/** The selection as effect targets: whole groups as groups, other layers as layers (adjustments left out). */
export function selectionTargets(): FxTarget[] {
  const s = useEditor.getState()
  return selectionUnits(s.layers, s.groups, s.selectedIds, s.isolatedGroupId)
    .map(u => (u.group ? { type: 'group' as const, id: u.group } : { type: 'layer' as const, id: u.ids[0] }))
    .filter(t => t.type === 'group' || s.layers.find(l => l.id === t.id)?.type !== 'adjustment')
}

/**
 * Add an effect where it belongs. A spatial effect (blur, grain, dots) on a group, or on several layers in the
 * same group, asks once whether it should treat them as one image or each layer on its own.
 */
export function addEffectTo(targets: FxTarget[], fx: Effect) {
  const s = useEditor.getState()
  if (!targets.length) return
  const one = targets.length === 1 ? targets[0] : null
  const sameParent = targets.length > 1 && targets.every(t => parentOf(t, s.layers, s.groups) === parentOf(targets[0], s.layers, s.groups)) && targets.every(t => t.type === 'layer' || t.type === 'group')
  const asks = isSpatial(fx) && ((one?.type === 'group') || sameParent)
  if (!asks) { s.addEffect(targets, fx, `Add ${fxName(fx).toLowerCase()}`); return }
  const remembered = useUi.getState().fxScope?.[scopeKey(fx)]
  if (remembered) { applyScope(targets, fx, remembered); return }
  window.dispatchEvent(new CustomEvent('vc:fxscope', { detail: { targets, fx } }))
}

/** "one": the group (or the selection grouped) gets the effect as one image. "each": linked copies on each layer. */
export function applyScope(targets: FxTarget[], fx: Effect, how: 'one' | 'each') {
  const s = useEditor.getState()
  const label = `Add ${fxName(fx).toLowerCase()}`
  if (how === 'each') {
    // A single group: its direct children each get a linked copy.
    if (targets.length === 1 && targets[0].type === 'group') {
      const gid = targets[0].id
      const kids: FxTarget[] = [...s.layers.filter(l => l.groupId === gid && l.type !== 'adjustment').map(l => ({ type: 'layer' as const, id: l.id })), ...s.groups.filter(g => g.parentId === gid).map(g => ({ type: 'group' as const, id: g.id }))]
      s.addEffect(kids, fx, label); return
    }
    s.addEffect(targets, fx, label); return
  }
  if (targets.length === 1) { s.addEffect(targets, fx, label); return }
  // Several things in one group, as one image: group them first, then the new group gets the effect. One undo step.
  asOneStep(() => {
    s.groupSelected()
    const st = useEditor.getState(); const g = st.layers.find(l => l.id === st.activeId)?.groupId
    if (g) st.addEffect([{ type: 'group', id: g }], fx, label)
  })
}

export function EffectsSection({ targets, title = 'Effects', note }: { targets: FxTarget[]; title?: string; note?: string }) {
  const st = useEditor(useShallow(s => ({ doc: s.doc, layers: s.layers, groups: s.groups })))
  const [open, setOpen] = useState<string | null>(null)
  const [add, setAdd] = useState<DOMRect | null>(null)
  const drag = useRef<number | null>(null)
  const single = targets.length === 1 ? targets[0] : null
  // Several targets: the effects linked across all of them.
  const list: Effect[] = !st.doc || !targets.length ? [] : single ? stackOf(st, single) : stackOf(st, targets[0]).filter(e => e.link && targets.every(t => stackOf(st, t).some(x => x.link === e.link)))
  // A newly added effect opens, so its settings are right there.
  const seen = useRef<{ key: string; ids: string[] } | null>(null)
  const tKey = targets.map(t => t.type + (('id' in t) ? t.id : '')).join(',')
  useEffect(() => {
    const ids = list.map(e => e.id), prev = seen.current
    if (!prev && ids.length) setOpen(ids[ids.length - 1])
    if (prev && prev.key === tKey && ids.length > prev.ids.length) { const added = ids.find(id => !prev.ids.includes(id)); if (added) setOpen(added) }
    seen.current = { key: tKey, ids }
  })
  if (!st.doc || !targets.length) return null
  const t0 = single ?? targets[0]
  const styles: LayerStyles | null | undefined = single?.type === 'layer' ? st.layers.find(l => l.id === single.id)?.styles : single?.type === 'group' ? st.groups.find(g => g.id === single.id)?.styles : null
  const canStyle = !!single && (single.type === 'layer' || single.type === 'group') && (single.type === 'group' || st.layers.find(l => l.id === single.id)?.type !== 'adjustment')
  const styleRows = canStyle ? (styles?.order ?? STYLE_KINDS).filter(k => (styles as any)?.[k]) : []
  const setStyle = (kind: StyleKind, v: any, label?: string) => {
    const s = useEditor.getState()
    const t = single as { type: 'layer' | 'group'; id: string }
    const cur = (t.type === 'layer' ? s.layers.find(l => l.id === t.id)?.styles : s.groups.find(g => g.id === t.id)?.styles) ?? emptyStyles()
    const next = { ...cur, [kind]: v } as LayerStyles
    if (!v) delete (next as any)[kind]
    if (t.type === 'layer') s.updateLayer(t.id, { styles: next }, label)
    else s.updateGroup(t.id, { styles: next }, label)
  }

  return (
    <Section title={title} action={
      <button onClick={e => setAdd(e.currentTarget.getBoundingClientRect())} aria-label="Add an effect" className={`h-6 px-1.5 inline-flex items-center gap-1 rounded text-[11.5px] text-void-300 hover:text-white hover:bg-white/[0.06] ${focusRing}`}><Plus size={13} />Effect</button>
    }>
      <div data-effects-list>
        {!list.length && !styleRows.length && <p className="text-[12px] text-void-500 leading-relaxed">{note ?? (single ? 'Blur, grain, colour and more, on this alone. Nothing below it changes.' : 'Add an effect to all of these at once. The copies stay linked: change one and they all change.')}</p>}
        {orderMatters(list) && <p className="text-[11px] text-amber-200/80 mb-1.5">Order matters here: effects run top to bottom. Drag to change it.</p>}
        <ul className="space-y-1">
          {list.map((fx, i) => (
            <li key={fx.id} draggable={!!single} data-effect={fx.id}
              onDragStart={e => { drag.current = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/vc-fx', fx.id) }}
              onDragOver={e => { if (drag.current !== null) e.preventDefault() }}
              onDrop={e => { e.preventDefault(); if (drag.current !== null && single) useEditor.getState().moveEffect(single, drag.current, i); drag.current = null }}
              className="rounded-lg bg-surface-sunken border border-white/[0.05]">
              <EffectRow t={t0} fx={fx} index={i} count={list.length} single={!!single} expanded={open === fx.id} onExpand={() => setOpen(open === fx.id ? null : fx.id)} />
            </li>
          ))}
          {styleRows.map(k => {
            const v = (styles as any)[k]
            return (
              <li key={k} className="rounded-lg bg-surface-sunken border border-white/[0.05]" data-style={k}>
                <div className="flex items-center gap-1 pl-1 pr-1.5 h-9">
                  <button aria-label={v.on ? `Turn ${STYLE_LABELS[k]} off` : `Turn ${STYLE_LABELS[k]} on`} onClick={() => setStyle(k, { ...v, on: !v.on }, STYLE_LABELS[k])} className={`w-7 h-7 inline-flex items-center justify-center rounded ${focusRing} ${v.on ? 'text-void-200' : 'text-void-600'}`}>{v.on ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                  <button onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k} className={`flex-1 min-w-0 text-left text-[12.5px] truncate ${v.on ? 'text-void-100' : 'text-void-500'} rounded ${focusRing}`}>{STYLE_LABELS[k]}</button>
                  <span className="text-[10.5px] text-void-500">Around</span>
                  <button aria-label={`Remove ${STYLE_LABELS[k]}`} onClick={() => setStyle(k, null, `Remove ${STYLE_LABELS[k].toLowerCase()}`)} className={`w-6 h-6 inline-flex items-center justify-center rounded text-void-500 hover:text-white ${focusRing}`}>×</button>
                </div>
                {open === k && <div className="px-2.5 pb-2.5"><StyleControls kind={k} v={v} set={(nv, label) => setStyle(k, nv, label)} layerTarget={single?.type === 'layer'} /></div>}
              </li>
            )
          })}
        </ul>
        {single?.type === 'group' && <GroupExtras id={single.id} />}
        {single?.type === 'layer' && <ExcludeToggle t={single} />}
        {single?.type === 'group' && <ExcludeToggle t={single} />}
      </div>
      {add && <AddMenu anchor={add} onClose={() => setAdd(null)} targets={targets} canStyle={canStyle}
        onStyle={k => { setStyle(k, defaultStyle(k), `Add ${STYLE_LABELS[k].toLowerCase()}`); setOpen(k) }}
        onFx={fx => { addEffectTo(targets, fx); setOpen(null) }} />}
    </Section>
  )
}

function EffectRow({ t, fx, index, count, single, expanded, onExpand }: { t: FxTarget; fx: Effect; index: number; count: number; single: boolean; expanded: boolean; onExpand: () => void }) {
  const s = useEditor.getState()
  const st = useEditor(useShallow(x => ({ doc: x.doc, layers: x.layers, groups: x.groups, selectedIds: x.selectedIds })))
  const [menu, setMenu] = useState<DOMRect | null>(null)
  const hasSel = useEditor(x => !!x.selection)
  const copies = fx.link ? linkedCopies(st, fx.link) : []
  const up = (patch: Partial<Effect>, label?: string) => s.updateEffect(t, fx.id, patch, label)
  const name = fxName(fx)
  const others = copies.filter(c => !sameTarget(c.t, t))
  const selT = useMemo(() => (expanded ? selectionTargets() : []), [expanded, st.selectedIds]) // eslint-disable-line react-hooks/exhaustive-deps
  const canAddSel = !!fx.link || selT.length > 1
  return (
    <>
      <div className="flex items-center gap-1 pl-1 pr-1 h-9">
        {single && <GripVertical size={13} className="shrink-0 text-void-600 cursor-grab" aria-hidden />}
        <button aria-label={fx.on ? `Turn ${name} off` : `Turn ${name} on`} onClick={() => up({ on: !fx.on }, fx.on ? 'Effect off' : 'Effect on')} className={`w-7 h-7 shrink-0 inline-flex items-center justify-center rounded ${focusRing} ${fx.on ? 'text-void-200' : 'text-void-600'}`}>{fx.on ? <Eye size={14} /> : <EyeOff size={14} />}</button>
        <button onClick={onExpand} aria-expanded={expanded} className={`flex-1 min-w-0 flex items-center gap-1 text-left text-[12.5px] rounded ${focusRing} ${fx.on && !fx.unknown ? 'text-void-100' : 'text-void-500'}`}>
          <ChevronDown size={12} className={`shrink-0 ${expanded ? '' : '-rotate-90'}`} /><span className="truncate">{name}</span>
          {fx.link && <Link2 size={12} className="shrink-0 text-accent-light" aria-label="Linked" />}
          {fx.mask && <span data-effect-masked className="shrink-0 px-1 rounded bg-white/[0.06] text-[10px] text-void-400" title="Shows only where its mask is">{fx.maskOn === false ? 'Mask off' : 'Masked'}</span>}
        </button>
        {fx.opacity < 1 && <span className="text-[10.5px] tabular-nums text-void-500">{Math.round(fx.opacity * 100)}%</span>}
        <button aria-label={`More for ${name}`} onClick={e => setMenu(e.currentTarget.getBoundingClientRect())} className={`w-7 h-7 shrink-0 inline-flex items-center justify-center rounded text-void-400 hover:text-white ${focusRing}`}><MoreHorizontal size={14} /></button>
      </div>
      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2.5" data-effect-settings>
          {fx.unknown ? <p className="text-[12px] text-void-400">This effect was made with a newer Voidcanvas. It is kept in the design and shows again once you update.</p> : (
            <>
              <SettingsControls api={{ value: fx, name, embedded: true, up: (p, label) => up(p as Partial<Effect>, label), commit: label => s.commit(label, { merge: 800 }) }} />
              <Slider label="Strength" value={Math.round(fx.opacity * 100)} min={0} max={100} unit="%" onChange={v => up({ opacity: v / 100 })} onCommit={() => s.commit('Effect strength', { ifChanged: true })} />
              <Select label="Blend" value={fx.blend} options={BLEND_MODES} onChange={v => up({ blend: v }, 'Effect blend')} />
            </>
          )}
          {copies.length > 1 && (
            <div className="rounded-md bg-accent/[0.08] px-2 py-1.5 text-[11.5px] text-void-300" data-effect-links>
              <p><Link2 size={11} className="inline -mt-0.5 mr-1 text-accent-light" />On: {copies.map(c => c.name).join(', ')}. Changing it here changes it on all of them.</p>
              <div className="flex gap-2 mt-1">
                {single && <button onClick={() => s.unlinkEffect(t, fx.id)} className={`inline-flex items-center gap-1 underline underline-offset-2 hover:text-white rounded ${focusRing}`}><Unlink size={11} />Unlink this one</button>}
                {canAddSel && selT.some(x => !copies.some(c => sameTarget(c.t, x))) && <button onClick={() => s.linkEffectTo(t, fx.id, selT)} className={`underline underline-offset-2 hover:text-white rounded ${focusRing}`}>Add the selected layers</button>}
              </div>
              {others.length === 0 && null}
            </div>
          )}
          {single && <MoveTo t={t} fx={fx} />}
        </div>
      )}
      {menu && (
        <Floating anchor={menu} side="left" onClose={() => setMenu(null)} label={`${name} actions`}>
          <div className="w-52 py-1.5" role="menu">
            {([
              ['Duplicate', () => s.duplicateEffect(t, fx.id), single],
              ['Copy', () => { import('../actions').then(m => m.setFxClip([fx])); s.notify(`${name} copied. Paste it onto other layers from the right-click menu.`) }, true],
              ['Move up', () => s.moveEffect(t, index, index - 1), single && index > 0],
              ['Move down', () => s.moveEffect(t, index, index + 1), single && index < count - 1],
              ['Reset', () => s.resetEffect(t, fx.id), !fx.unknown],
              [fx.mask ? 'Mask from the selection' : 'Show only in the selection', () => s.setEffectMask(t, fx.id, 'selection'), !fx.unknown],
              ['Hide in the selection', () => s.setEffectMask(t, fx.id, 'hideSelection'), hasSel],
              ['Invert mask', () => s.setEffectMask(t, fx.id, 'invert'), !!fx.mask],
              [fx.maskOn === false ? 'Turn mask on' : 'Turn mask off', () => s.setEffectMask(t, fx.id, 'toggle'), !!fx.mask],
              ['Remove mask', () => s.setEffectMask(t, fx.id, 'remove'), !!fx.mask],
              ['Remove', () => s.removeEffect(t, fx.id), single],
              ['Remove from all of these', () => { for (const c of copies) useEditor.getState().removeEffect(c.t, c.id) }, !single],
            ] as [string, () => void, boolean][]).filter(x => x[2]).map(([label, run]) => (
              <button key={label} role="menuitem" onClick={() => { setMenu(null); run() }} className="w-full text-left px-3 h-8 text-[12.5px] text-void-100 hover:bg-accent hover:text-white">{label}</button>
            ))}
          </div>
        </Floating>
      )}
    </>
  )
}

/** Move an effect to another layer, a group, the board or the whole design. */
function MoveTo({ t, fx }: { t: FxTarget; fx: Effect }) {
  const st = useEditor(useShallow(x => ({ layers: x.layers, groups: x.groups, doc: x.doc, activeFrameId: x.activeFrameId })))
  const opts: { id: string; label: string; t: FxTarget }[] = [
    ...st.layers.filter(l => l.type !== 'adjustment').slice().reverse().slice(0, 40).map(l => ({ id: 'l' + l.id, label: `Layer: ${l.name}`, t: { type: 'layer' as const, id: l.id } })),
    ...st.groups.map(g => ({ id: 'g' + g.id, label: `Group: ${g.name}`, t: { type: 'group' as const, id: g.id } })),
    ...(st.doc?.frames ?? []).map(f => ({ id: 'b' + f.id, label: `Board: ${f.name}`, t: { type: 'board' as const, id: f.id } })),
    { id: 'doc', label: 'The whole design', t: { type: 'doc' as const } },
  ].filter(o => !sameTarget(o.t, t))
  return (
    <label className="flex items-center justify-between gap-2 text-[12px] text-void-400">Move to
      <select value="" aria-label="Move this effect to" onChange={e => {
        const o = opts.find(x => x.id === e.target.value); if (!o) return
        const s = useEditor.getState()
        s.addEffect([o.t], { ...fx, link: null }, `Move ${fxName(fx).toLowerCase()}`)
        useEditor.getState().removeEffect(t, fx.id)
      }} className={`h-7 min-w-0 flex-1 max-w-[170px] px-1.5 rounded-md bg-void-950 border border-white/[0.06] text-[12px] text-void-100 ${focusRing}`}>
        <option value="">Choose…</option>
        {opts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  )
}

/** Controls for one appearance style (shadow, glow, stroke, overlays). */
function StyleControls({ kind, v, set, layerTarget }: { kind: StyleKind; v: any; set: (v: any, label?: string) => void; layerTarget: boolean }) {
  const s = useEditor.getState()
  const commit = () => s.commit(STYLE_LABELS[kind], { ifChanged: true })
  const num = (key: string, label: string, min: number, max: number, unit = 'px') => <Slider key={key} label={label} value={Math.round(v[key] ?? 0)} min={min} max={max} unit={unit} onChange={x => set({ ...v, [key]: x })} onCommit={commit} />
  return (
    <div className="space-y-2.5">
      {'color' in v && <ColorField label="Colour" value={v.color} onChange={c => c && set({ ...v, color: c })} onCommit={commit} />}
      {(kind === 'dropShadow' || kind === 'innerShadow') && <>{num('distance', 'Distance', 0, 300)}{num('size', 'Blur', 0, 250)}{num('spread', 'Spread / choke', 0, 100, '%')}{num('angle', 'Angle', -180, 180, '°')}</>}
      {(kind === 'outerGlow' || kind === 'innerGlow') && <>{num('size', 'Size', 0, 250)}{num('spread', 'Spread', 0, 100, '%')}</>}
      {kind === 'stroke' && <>{num('size', 'Width', 1, 100)}<Select label="Position" value={v.position} options={[{ id: 'outside', label: 'Outside' }, { id: 'center', label: 'Centre' }, { id: 'inside', label: 'Inside' }]} onChange={p => set({ ...v, position: p }, 'Stroke position')} /></>}
      {kind === 'gradientOverlay' && <GradientControls value={v} patch={p => set({ ...v, ...p })} commit={commit} />}
      {kind === 'bevel' && <>{num('size', 'Size', 1, 100)}{num('depth', 'Depth', 1, 500, '%')}{num('angle', 'Light angle', -180, 180, '°')}{num('soften', 'Soften', 0, 50)}<ColorField label="Highlight" value={v.highlight} onChange={c => c && set({ ...v, highlight: c })} onCommit={commit} /><ColorField label="Shadow" value={v.shadow} onChange={c => c && set({ ...v, shadow: c })} onCommit={commit} /></>}
      <Select label="Blend mode" value={v.blend} options={BLEND_MODES} onChange={blend => set({ ...v, blend }, 'Effect blend mode')} />
      <button className="text-xs text-void-400 underline" onClick={() => set(defaultStyle(kind), 'Reset effect')}>Reset effect</button>
      <Slider label="Opacity" value={Math.round((v.opacity ?? 1) * 100)} min={0} max={100} unit="%" onChange={x => set({ ...v, opacity: x / 100 })} onCommit={commit} />
      {layerTarget && <button onClick={() => openModal('layerStyle')} className={`text-[11.5px] text-void-400 underline underline-offset-2 hover:text-white rounded ${focusRing}`}>Every setting, in Blending options…</button>}
    </div>
  )
}

/** Group only: blend as a group, the group's mask, and handing its effects to each layer. */
function GroupExtras({ id }: { id: string }) {
  const g = useEditor(s => s.groups.find(x => x.id === id))
  const hasSel = useEditor(s => !!s.selection)
  if (!g) return null
  const s = useEditor.getState()
  const forced = !!g.effects?.some(e => e.on) || !!g.mask || STYLE_KINDS.some(k => (g.styles as any)?.[k]?.on)
  const isolated = forced || g.opacity < 1 || (!!g.blend && g.blend !== 'pass')
  const btn = `h-7 px-2 rounded-md text-[12px] bg-void-900 border border-white/[0.06] text-void-200 hover:text-white ${focusRing}`
  return (
    <div className="mt-3 space-y-2.5" data-group-extras>
      <label className="flex items-start gap-2 text-[12.5px] text-void-200">
        <input type="checkbox" checked={isolated} disabled={forced} onChange={e => s.updateGroup(id, { blend: e.target.checked ? 'source-over' : 'pass' }, e.target.checked ? 'Blend as a group' : 'Pass through')} className="mt-0.5" />
        <span>Blend as a group<span className="block text-[11.5px] text-void-500">{forced ? 'Always on while the group has effects or a mask.' : isolated ? 'Its layers are put together first, then blended with what is below as one.' : 'Pass through: each layer blends with what is below on its own.'}</span></span>
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] text-void-400 mr-1">Mask</span>
        {!g.mask ? <>
          <button className={btn} onClick={() => s.setGroupMask(id, hasSel ? 'selection' : 'reveal')}>{hasSel ? 'From selection' : 'Add mask'}</button>
          {hasSel && <button className={btn} onClick={() => s.setGroupMask(id, 'hideSelection')}>Hide selection</button>}
        </> : <>
          <button className={btn} onClick={() => s.setGroupMask(id, 'invert')}>Invert</button>
          <button className={btn} onClick={() => s.setGroupMask(id, 'toggle')}>{g.maskEnabled === false ? 'Turn on' : 'Turn off'}</button>
          {hasSel && <button className={btn} onClick={() => s.setGroupMask(id, 'selection')}>From selection</button>}
          <button className={btn} onClick={() => s.setGroupMask(id, 'remove')}>Remove</button>
        </>}
      </div>
      {!!g.effects?.length && <button className={btn} onClick={() => s.groupFxToContents(id)}>Put these effects on each layer instead</button>}
    </div>
  )
}

/** A layer or group inside a group with effects can stay out of them. */
function ExcludeToggle({ t }: { t: { type: 'layer' | 'group'; id: string } }) {
  const st = useEditor(useShallow(s => ({ layers: s.layers, groups: s.groups })))
  const own = t.type === 'layer' ? st.layers.find(l => l.id === t.id) : st.groups.find(g => g.id === t.id)
  const parentId = t.type === 'layer' ? (own as Layer | undefined)?.groupId : (own as Group | undefined)?.parentId
  const parent = parentId ? st.groups.find(g => g.id === parentId) : null
  if (!own || !parent || !(parent.effects?.some(e => e.on) || STYLE_KINDS.some(k => (parent.styles as any)?.[k]?.on))) return null
  return (
    <label className="mt-3 flex items-start gap-2 text-[12.5px] text-void-200" data-fx-exclude>
      <input type="checkbox" checked={!!own.fxExclude} onChange={e => useEditor.getState().setFxExclude(t, e.target.checked)} className="mt-0.5" />
      <span>Leave out of “{parent.name}” effects<span className="block text-[11.5px] text-void-500">It draws clean, in its place, while the rest of the group keeps the effects.</span></span>
    </label>
  )
}

function AddMenu({ anchor, onClose, targets, canStyle, onStyle, onFx }: { anchor: DOMRect; onClose: () => void; targets: FxTarget[]; canStyle: boolean; onStyle: (k: StyleKind) => void; onFx: (fx: Effect) => void }) {
  const [q, setQ] = useState('')
  const [more, setMore] = useState(false)
  const [asLayer, setAsLayer] = useState(false)
  const pick = (fx: Effect) => { if (asLayer) window.dispatchEvent(new CustomEvent('vc:fxlayerabove', { detail: { fx } })); else onFx(fx) }
  const match = (label: string) => !q || label.toLowerCase().includes(q.toLowerCase())
  const item = (label: string, run: () => void, key: string) => match(label) ? <button key={key} role="menuitem" onClick={() => { onClose(); run() }} className="w-full text-left px-3 h-8 text-[12.5px] text-void-100 hover:bg-accent hover:text-white truncate">{label}</button> : null
  const head = (label: string) => <p className="px-3 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-void-500">{label}</p>
  const several = targets.length > 1
  const inGroup = several && targets.every(t => t.type === 'layer' || t.type === 'group')
  const voids = (cat: string) => VOID_EFFECTS.filter(e => e.category === cat && e.id !== 'none')
  return (
    <Floating anchor={anchor} side="left" onClose={onClose} label="Add an effect">
      <div className="w-64 max-h-[70vh] overflow-y-auto py-1.5" role="menu" data-fx-menu>
        <label className="mx-2 mb-1 flex items-center gap-1.5 h-8 px-2 rounded-md bg-void-950 border border-white/[0.06]"><Search size={13} className="text-void-500" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.stopPropagation()} placeholder="Find an effect" aria-label="Find an effect" className="flex-1 min-w-0 bg-transparent text-[12.5px] outline-none" /></label>
        {inGroup && <label className="mx-3 my-1 flex items-center gap-2 text-[12px] text-void-300"><input type="checkbox" checked={asLayer} onChange={e => setAsLayer(e.target.checked)} />As an adjustment layer above them</label>}
        {head('Blur and texture')}
        {item('Blur', () => pick(newEffect('blur')), 'blur')}
        {voids('enhance').filter(e => ['grain', 'noise', 'vignette', 'bloom', 'sharpen'].includes(e.id)).map(e => item(e.name, () => pick(newEffect('voidEffect', e.id as EffectType)), e.id))}
        {head('Colour')}
        {COLOUR_KINDS.map(k => item(ADJUSTMENT_LABELS[k], () => pick(newEffect(k)), k))}
        {canStyle && <>{head('Around the shape')}{STYLE_KINDS.map(k => item(STYLE_LABELS[k], () => onStyle(k), 'st' + k))}</>}
        {(more || q) ? VOID_GROUPS.map(([cat, label]) => {
          const rows = voids(cat).filter(e => !(cat === 'enhance' && ['grain', 'noise', 'vignette', 'bloom', 'sharpen'].includes(e.id))).map(e => item(e.name, () => pick(newEffect('voidEffect', e.id as EffectType)), e.id)).filter(Boolean)
          return rows.length ? <div key={cat}>{head(label)}{rows}</div> : null
        }) : <button onClick={() => setMore(true)} className="w-full text-left px-3 h-8 text-[12.5px] text-accent-light hover:bg-white/[0.05]">More effects…</button>}
        {several && <p className="px-3 pt-2 text-[11px] text-void-500 leading-relaxed">{asLayer ? 'Goes in as an adjustment layer above them, in a group with them, so it changes them and nothing else.' : `Added to each of the ${targets.length}, linked, so changing one changes all.`}</p>}
      </div>
    </Floating>
  )
}

