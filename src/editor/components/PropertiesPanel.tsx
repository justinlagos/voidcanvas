'use client'

import * as ops from '../ops'
import { ROLE_LABEL } from '../adapt'
const ROLE_OPTIONS = Object.entries(ROLE_LABEL).map(([id, label]) => ({ id, label }))
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, AlignLeft, AlignRight, AlignStartHorizontal, AlignStartVertical, Eclipse, FolderPlus, FlipHorizontal2, FlipVertical2, ImageOff, Italic, RotateCcw } from 'lucide-react'
import { effects as effectDefinitions } from '@/components/effect-list'
import { effectParams, FINISH_PARAMS } from '@/components/ParamControls'
import { matchPreset, presetsFor } from '@/components/effect-presets'
import { defaultParams, type EffectParams } from '@/store/useStore'
import { ADJUSTMENT_DEFAULTS, HUE_BANDS, layerBounds, layerSize } from '../engine'
import { ColorButton, hexToRgb } from './ColorPicker'
import type { HueBand } from '../types'
const layerSizeOf = (l: TextLayer) => layerSize(l).w
import { FONTS, ensureFont } from '../io'
import { selectionUnits, useEditor } from '../store'
import { EffectsSection, selectionTargets } from './EffectsSection'
import { BLEND_MODES, type AdjustmentLayer, type AdjustmentSettings, type Layer, type ShapeLayer, type TextLayer } from '../types'
import { CURVE_PRESETS, CurvesEditor } from './CurvesEditor'
import { Button, ColorField, IconButton, NumField, Section, Select, Slider, focusRing } from './ui'
import { useShallow } from 'zustand/react/shallow'
import { useUi } from '../ui-store'
import { Link2, Link2Off } from 'lucide-react'
import { PIVOTS, PIVOT_NAMES, pivotPoint, rotatedAbout, type Pivot } from '../pivot'

const ADJ_FIELDS: Record<string, { key: string; label: string; min: number; max: number }[]> = {
  brightnessContrast: [{ key: 'brightness', label: 'Brightness', min: -100, max: 100 }, { key: 'contrast', label: 'Contrast', min: -100, max: 100 }],
  hueSaturation: [{ key: 'hue', label: 'Hue', min: -180, max: 180 }, { key: 'saturation', label: 'Saturation', min: -100, max: 100 }, { key: 'lightness', label: 'Lightness', min: -100, max: 100 }],
  levels: [{ key: 'black', label: 'Darkest point', min: 0, max: 254 }, { key: 'white', label: 'Brightest point', min: 1, max: 255 }, { key: 'gamma', label: 'Midtones', min: 10, max: 300 }],
  temperature: [{ key: 'temperature', label: 'Warmth', min: -100, max: 100 }, { key: 'tint', label: 'Tint', min: -100, max: 100 }],
  blackWhite: [{ key: 'amount', label: 'Amount', min: 0, max: 100 }],
  blur: [{ key: 'radius', label: 'Amount', min: 1, max: 80 }],
  invert: [],
  vibrance: [{ key: 'vibrance', label: 'Vibrance', min: -100, max: 100 }, { key: 'saturation', label: 'Saturation', min: -100, max: 100 }],
  exposure: [{ key: 'exposure', label: 'Exposure (stops × 100)', min: -500, max: 500 }, { key: 'offset', label: 'Offset', min: -50, max: 50 }, { key: 'gamma', label: 'Gamma', min: 10, max: 300 }],
  posterize: [{ key: 'levels', label: 'Levels', min: 2, max: 32 }],
  threshold: [{ key: 'level', label: 'Level', min: 1, max: 255 }],
  lut: [{ key: 'amount', label: 'Strength', min: 0, max: 100 }],
  colorMatch: [{ key: 'amount', label: 'Strength', min: 0, max: 100 }],
}

export async function removeBackground(layerId: string, mode: 'person' | 'any' = 'person') {
  const { removeBackgroundLayer } = await import('../ai-tools')
  return removeBackgroundLayer(layerId, mode)
}

export function PropertiesPanel({ onOpenFilters }: { onOpenFilters: () => void }) {
  const layer = useEditor(s => s.layers.find(l => l.id === s.activeId) ?? null)
  const doc = useEditor(s => s.doc)
  const editingMask = useEditor(s => s.editingMask)
  const swatches = useEditor(s => s.swatches)
  const count = useEditor(s => s.selectedIds.length)
  const group = useEditor(s => { const l = s.layers.find(x => x.id === s.activeId); return l?.groupId ? s.groups.find(g => g.id === l.groupId) ?? null : null })
  const sel = useEditor(useShallow(s => (s.selectedIds.length > 1 ? s.layers.filter(l => s.selectedIds.includes(l.id)) : [])))
  const keyName = useEditor(s => (s.keyObjectId && s.selectedIds.length > 1 ? s.layers.find(l => l.id === s.keyObjectId)?.name ?? null : null))
  const keepRatio = useUi(u => u.keepRatio)
  const activeFrame = useEditor(s => (s.activeFrameId ? s.doc?.frames?.find(f => f.id === s.activeFrameId) ?? null : null))
  const unitsKey = useEditor(s => (s.selectedIds.length > 1 ? JSON.stringify(selectionUnits(s.layers, s.groups, s.selectedIds, s.isolatedGroupId).map(u => u.group ?? u.ids[0])) : ''))
  const unitGroup = useEditor(s => { if (s.selectedIds.length < 2) return null; const u = selectionUnits(s.layers, s.groups, s.selectedIds, s.isolatedGroupId); return u.length === 1 ? u[0].group : null })
  const selTargets = useMemo(() => (unitsKey ? selectionTargets() : []), [unitsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const selKey = unitsKey
  const pivot = useUi(u => u.pivot ?? 'c')
  const s = useEditor.getState()
  if (!doc) return null

  const up = (patch: Partial<Layer>) => layer && s.updateLayer(layer.id, patch)
  const commit = (label: string) => () => s.commit(label)

  if (!layer) {
    return (
      <div>
        <Section title="Design">
          <p className="text-[12.5px] text-void-400 mb-3 tabular-nums">{doc.width} × {doc.height} px</p>
          <ColorField label="Background" value={doc.background} allowNone onChange={v => s.setDoc({ background: v })} onCommit={commit('Background')} />
          {!doc.background && <p className="mt-2 text-[12px] text-void-500">Transparent. PNG and WebP exports keep it see-through.</p>}
        </Section>
        <Section title="Colours">
          <div className="flex flex-wrap gap-1.5">
            {swatches.map(c => (
              <button key={c} aria-label={`Use ${c}`} title={`${c}: drag to apply to text or shapes`} draggable onDragStart={e => { e.dataTransfer.setData('text/vc-color', c); e.dataTransfer.effectAllowed = 'copy' }} onClick={() => s.setFg(c)} className={`w-7 h-7 rounded-md border border-white/10 ${focusRing}`} style={{ background: c }} />
            ))}
          </div>
          <p className="mt-2.5 text-[12px] text-void-500">Select a layer to edit it, or use Add to bring something in.</p>
        </Section>
        {doc.frames?.length && activeFrame ? <EffectsSection targets={[{ type: 'board', id: activeFrame.id }]} title={`Effects on ${activeFrame.name}`} note="Effects here run over everything on this board, after the layers' own effects." /> : null}
        <EffectsSection targets={[{ type: 'doc' }]} title="Effects on the whole design" note={doc.frames?.length ? 'These run last, on every board.' : 'These run last, over everything.'} />
      </div>
    )
  }

  // Positions are measured from the top left of the layer's board (of the page when there are no boards).
  const boardOf = (l: Layer) => (doc.frames?.length ? doc.frames.find(f => f.id === l.frameId) ?? null : null)
  const edit = (label: string) => s.commit(label, { merge: 1000, ifChanged: true })
  const boxOf = (ls: Layer[]) => {
    const bs = ls.filter(l => l.type !== 'adjustment').map(l => layerBounds(l, doc))
    if (!bs.length) return null
    const x = Math.min(...bs.map(b => b.x)), y = Math.min(...bs.map(b => b.y))
    return { x, y, w: Math.max(...bs.map(b => b.x + b.w)) - x, h: Math.max(...bs.map(b => b.y + b.h)) - y }
  }
  /** Average space between the selected layers along one axis, when they do not overlap. */
  const gapOf = (ls: Layer[], axis: 'h' | 'v') => {
    const bs = ls.filter(l => l.type !== 'adjustment').map(l => layerBounds(l, doc)).sort((a, b) => (axis === 'h' ? a.x - b.x : a.y - b.y))
    if (bs.length < 2) return 0
    let sum = 0
    for (let i = 1; i < bs.length; i++) sum += axis === 'h' ? bs[i].x - (bs[i - 1].x + bs[i - 1].w) : bs[i].y - (bs[i - 1].y + bs[i - 1].h)
    return sum / (bs.length - 1)
  }
  const moveAll = (dx: number, dy: number) => {
    const ls = useEditor.getState().layers.filter(l => useEditor.getState().selectedIds.includes(l.id) && !l.locked && !l.lockPosition)
    s.updateLayers(ls.map(l => ({ id: l.id, patch: { x: l.x + dx, y: l.y + dy } })))
    edit('Move')
  }

  const one = count === 1 && layer && layer.type !== 'adjustment'
  const board = one ? boardOf(layer) : sel.length ? boardOf(sel[0]) : null
  const ox = board?.x ?? 0, oy = board?.y ?? 0
  const ratioButton = (
    <IconButton label={keepRatio ? 'Width and height change together' : 'Width and height change separately'} active={keepRatio} onClick={() => useUi.getState().setPref('keepRatio', !keepRatio)} className="!h-8 !w-8">
      {keepRatio ? <Link2 size={15} /> : <Link2Off size={15} />}
    </IconButton>
  )
  const arrange = (
    <Section title={count > 1 ? `${count} layers selected` : 'Position'} collapsible={count === 1} defaultOpen={count > 1}>
      <div className="flex items-center justify-between">
        {([['left', AlignStartVertical, 'Align left'], ['hcenter', AlignCenterVertical, 'Centre horizontally'], ['right', AlignEndVertical, 'Align right'], ['top', AlignStartHorizontal, 'Align top'], ['vcenter', AlignCenterHorizontal, 'Centre vertically'], ['bottom', AlignEndHorizontal, 'Align bottom']] as const).map(([how, Icon, label]) => (
          <IconButton key={how} label={count > 1 ? (keyName ? `${label} to “${keyName}”` : label) : `${label} on the ${board ? 'board' : 'page'}`} onClick={() => s.align(how)}><Icon size={16} /></IconButton>
        ))}
      </div>
      {count > 1 && <p className="mt-1.5 text-[12px] text-void-500">{keyName ? <>Lining up to “{keyName}”. Click it again to stop.</> : 'Click one of them again to line the others up to it.'}</p>}
      {one && (() => {
        const b = layerBounds(layer, doc)
        const setW = (w: number) => { s.setLayerBox(layer.id, keepRatio && b.w > 0 ? { w, h: (b.h * w) / b.w } : { w }); edit('Resize') }
        const setH = (h: number) => { s.setLayerBox(layer.id, keepRatio && b.h > 0 ? { h, w: (b.w * h) / b.h } : { h }); edit('Resize') }
        return (
          <div className="grid grid-cols-[1fr_1fr] gap-1.5 mt-2.5">
            <NumField label="X" title={board ? 'X, from the left of the board' : 'X, from the left of the page'} value={b.x - ox} onCommit={v => { s.setLayerBox(layer.id, { x: v + ox }); edit('Move') }} />
            <NumField label="Y" title={board ? 'Y, from the top of the board' : 'Y, from the top of the page'} value={b.y - oy} onCommit={v => { s.setLayerBox(layer.id, { y: v + oy }); edit('Move') }} />
            <NumField label="W" title="Width" value={b.w} onCommit={setW} />
            <NumField label="H" title="Height" value={b.h} onCommit={setH} />
            <NumField label="°" title="Rotation in degrees" digits={1} value={(layer.rotation * 180) / Math.PI} onCommit={v => { if (layer.locked || layer.lockPosition) { s.notify('This layer is locked. Unlock it to rotate it.'); return } s.updateLayer(layer.id, rotatedAbout(layer, doc, pivotPoint(layer, doc, pivot), ((((v % 360) + 540) % 360) - 180) * Math.PI / 180)); edit('Rotate') }} />
            <div className="flex items-center gap-1.5">
              {ratioButton}
              {/* The point the layer turns around, for the rotation field and the round handle. */}
              <div role="radiogroup" aria-label="Turn around" className="grid grid-cols-3 gap-[3px] p-1 rounded-md bg-surface-sunken border border-white/[0.06]">
                {(Object.keys(PIVOTS) as Pivot[]).map(k => (
                  <button key={k} role="radio" aria-checked={pivot === k} aria-label={`Turn around the ${PIVOT_NAMES[k]}`} title={`Turn around the ${PIVOT_NAMES[k]}`} onClick={() => useUi.getState().setPref('pivot', k)}
                    className={`w-[7px] h-[7px] rounded-[2px] ${pivot === k ? 'bg-accent' : 'bg-void-600 hover:bg-void-400'} ${focusRing}`} />
                ))}
              </div>
            </div>
          </div>
        )
      })()}
      {count > 1 && (() => {
        const bx = boxOf(sel); if (!bx) return null
        return (
          <div className="grid grid-cols-2 gap-1.5 mt-2.5">
            <NumField label="X" title="X of the selection" value={bx.x - ox} onCommit={v => moveAll(v + ox - bx.x, 0)} />
            <NumField label="Y" title="Y of the selection" value={bx.y - oy} onCommit={v => moveAll(0, v + oy - bx.y)} />
          </div>
        )
      })()}
      {count > 1 && (
        <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-1.5 mt-2.5">
          <span className="text-[12px] text-void-500 mr-1">Space</span>
          <div className="flex items-center gap-1">
            {count > 2 && <IconButton label="Distribute horizontally" onClick={() => s.distribute('h')} className="!h-8 !w-8"><AlignHorizontalDistributeCenter size={15} /></IconButton>}
            <NumField label="↔" title="Space between them, across" value={gapOf(sel, 'h')} onCommit={v => s.distribute('h', v)} />
          </div>
          <div className="flex items-center gap-1">
            {count > 2 && <IconButton label="Distribute vertically" onClick={() => s.distribute('v')} className="!h-8 !w-8"><AlignVerticalDistributeCenter size={15} /></IconButton>}
            <NumField label="↕" title="Space between them, down" value={gapOf(sel, 'v')} onCommit={v => s.distribute('v', v)} />
          </div>
        </div>
      )}
      {count > 1 && <Button onClick={() => s.groupSelected()} className="w-full mt-2.5"><FolderPlus size={15} />Group these layers</Button>}
    </Section>
  )

  if (count > 1) {
    // A whole group selected is one object: its own settings and effects.
    if (unitGroup) return <div>{arrange}<GroupPanel id={unitGroup} /></div>
    return <div>{arrange}<SeveralProps layers={sel} /><EffectsSection key={selKey} targets={selTargets} title="Effects on all of these" /></div>
  }
  const hasBoards = !!useEditor.getState().doc?.frames?.length

  return (
    <div>

      {layer.type === 'raster' && (
        <Section title="Quick actions">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => removeBackground(layer.id)} className="col-span-2 !justify-start"><ImageOff size={15} />Remove background</Button>
            <button onClick={() => removeBackground(layer.id, 'any')} className={`col-span-2 -mt-1 text-left text-[12px] text-void-400 hover:text-white underline underline-offset-2 rounded ${focusRing}`}>Not a person? Use the any-subject model (115 MB, needs a recent browser)</button>
            <Button onClick={onOpenFilters} className="col-span-2 !justify-start"><Eclipse size={15} />Filters and adjustments</Button>
            <Button onClick={() => s.flip(layer.id, 'h')}><FlipHorizontal2 size={15} />Mirror</Button>
            <Button onClick={() => s.flip(layer.id, 'v')}><FlipVertical2 size={15} />Flip</Button>
          </div>
        </Section>
      )}

      {layer.type === 'text' && <TextProps layer={layer} />}
      {layer.type === 'shape' && <ShapeProps layer={layer} />}
      {layer.type === 'adjustment' && <AdjustmentProps layer={layer} />}
      {layer.type !== 'adjustment' && <EffectsSection key={layer.id} targets={[{ type: 'layer', id: layer.id }]} />}
      {layer.type === 'text' && layer.onPath && <PathTextProps layer={layer} />}
      {layer.vmask && <VectorMaskProps layer={layer} />}

      {/* Layer-level settings open only when something is off its default, so a fresh layer shows just what matters. */}
      <Section title="Layer" collapsible defaultOpen={layer.opacity < 1 || layer.blend !== 'source-over' || !!layer.role}>
        <div className="space-y-3">
          <Slider label="Opacity" value={Math.round(layer.opacity * 100)} min={0} max={100} unit="%" onChange={v => up({ opacity: v / 100 })} onCommit={commit('Opacity')} />
          <Select label="Blend" value={layer.blend} options={BLEND_MODES} onChange={v => s.updateLayer(layer.id, { blend: v }, 'Blend mode')} />
          {layer.type === 'adjustment' && <ReachSelect layer={layer} />}
          {layer.type !== 'adjustment' && hasBoards && (
            <Select label="Role in formats" value={(layer.role ?? '') as string} options={[{ id: '', label: 'Automatic' }, ...ROLE_OPTIONS]} onChange={v => s.updateLayer(layer.id, { role: (v || null) as any }, 'Layer role')} />
          )}
        </div>
      </Section>
      {layer.type !== 'adjustment' && arrange}

      {group && (
        <Section title={group.name}>
          <div className="space-y-2.5">
            <Slider label="Group opacity" value={Math.round(group.opacity * 100)} min={0} max={100} unit="%" onChange={v => s.updateGroup(group.id, { opacity: v / 100 })} onCommit={commit('Group opacity')} />
            <div className="grid grid-cols-2 gap-2"><Button onClick={() => s.selectGroup(group.id)}>Select all</Button><Button onClick={() => s.ungroup(group.id)}>Ungroup</Button></div>
          </div>
        </Section>
      )}

      <Section title="Mask">
        {layer.mask ? (
          <div className="space-y-2">
            <p className="text-[12px] text-void-400 leading-relaxed">A mask hides parts of a layer without deleting them.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => { s.setEditingMask(!editingMask); if (!editingMask) s.setTool('brush') }} className={editingMask ? '!bg-accent !text-white col-span-2' : 'col-span-2'}>{editingMask ? 'Done painting mask' : 'Paint on mask'}</Button>
              <Button onClick={() => s.updateLayer(layer.id, { maskEnabled: !layer.maskEnabled }, 'Toggle mask')}>{layer.maskEnabled ? 'Turn off' : 'Turn on'}</Button>
              <Button onClick={() => s.invertMask(layer.id)}>Invert</Button>
              <Button onClick={() => s.removeMask(layer.id)} className="col-span-2">Delete mask</Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => { s.addMask(layer.id, !!useEditor.getState().selection); s.setTool('brush') }} className="w-full">
            {useEditor.getState().selection ? 'Mask from selection' : 'Add mask'}
          </Button>
        )}
      </Section>
    </div>
  )
}

/** Where an adjustment layer reaches: everything below it, only its own group, or just the layer below. */
function ReachSelect({ layer }: { layer: AdjustmentLayer }) {
  const s = useEditor.getState()
  const reach = layer.clipId ? 'clip' : layer.reach === 'group' && layer.groupId ? 'group' : 'below'
  const canClip = !!layer.clipId || s.canClip(layer.id)
  const targetName = layer.clipId ? s.layers.find(l => l.id === layer.clipId)?.name : null
  const opts = [{ id: 'below', label: 'Everything below' }, ...(layer.groupId ? [{ id: 'group', label: 'Only this group' }] : []), ...(canClip ? [{ id: 'clip', label: targetName ? `Only “${targetName}”` : 'Only the layer below' }] : [])]
  return (
    <Select label="Affects" value={reach} options={opts} onChange={v => {
      const cur = useEditor.getState()
      if (v === 'clip') { cur.createClippingMask(layer.id); return }
      if (layer.clipId) cur.releaseClippingMask(layer.id)
      useEditor.getState().updateLayer(layer.id, { reach: v as 'below' | 'group' }, v === 'group' ? 'Adjustment: only this group' : 'Adjustment: everything below')
    }} />
  )
}

/** A whole group selected: its name, how it blends, its opacity, and its effects. */
function GroupPanel({ id }: { id: string }) {
  const g = useEditor(s => s.groups.find(x => x.id === id))
  const s = useEditor.getState()
  if (!g) return null
  return (
    <>
      <Section title="Group">
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3"><span className="text-[12px] text-void-400">Name</span>
            <input key={g.id + g.name} defaultValue={g.name} aria-label="Group name" onBlur={e => { const n = e.target.value.trim(); if (n && n !== g.name) s.updateGroup(g.id, { name: n }, 'Rename group') }} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur() }} className={`h-8 min-w-0 flex-1 max-w-[170px] px-2 rounded-md bg-surface-sunken border border-white/[0.06] text-[12.5px] ${focusRing}`} /></label>
          <Slider label="Opacity" value={Math.round(g.opacity * 100)} min={0} max={100} unit="%" onChange={v => s.updateGroup(g.id, { opacity: v / 100 })} onCommit={() => s.commit('Group opacity', { ifChanged: true })} />
          <Select label="Blend" value={(g.blend ?? 'pass') as string} options={[{ id: 'pass', label: 'Pass through' }, ...BLEND_MODES]} onChange={v => s.updateGroup(g.id, { blend: v as any }, 'Group blend')} />
          <div className="grid grid-cols-2 gap-2"><Button onClick={() => s.setIsolated(g.id)}>Edit on its own</Button><Button onClick={() => s.ungroup(g.id)}>Ungroup</Button></div>
        </div>
      </Section>
      <EffectsSection key={g.id} targets={[{ type: 'group', id: g.id }]} title="Group effects" note="Effects here run on what the group makes as one image. Children left out draw clean." />
    </>
  )
}

/** Settings for several selected layers at once. A value that differs between them shows as Mixed until it is set. */
function SeveralProps({ layers }: { layers: Layer[] }) {
  const s = useEditor.getState()
  if (!layers.length) return null
  const ids = layers.map(l => l.id)
  const same = <T,>(get: (l: Layer) => T): { v: T; mixed: boolean } => { const v = get(layers[0]); return { v, mixed: layers.some(l => get(l) !== v) } }
  const setAll = (patch: (l: Layer) => Partial<Layer>) => s.updateLayers(useEditor.getState().layers.filter(l => ids.includes(l.id)).map(l => ({ id: l.id, patch: patch(l) })))
  const opacity = same(l => Math.round(l.opacity * 100))
  const blend = same(l => l.blend)
  const shapes = layers.every(l => l.type === 'shape') ? (layers as ShapeLayer[]) : null
  const texts = layers.every(l => l.type === 'text') ? (layers as TextLayer[]) : null
  const fill = shapes ? same(l => (l as ShapeLayer).fill) : null
  const stroke = shapes ? same(l => (l as ShapeLayer).stroke) : null
  const color = texts ? same(l => (l as TextLayer).color) : null
  const font = texts ? same(l => (l as TextLayer).fontFamily) : null
  const size = texts ? same(l => (l as TextLayer).fontSize) : null
  const lineSpacing = texts ? same(l => (l as TextLayer).lineHeight) : null
  const letterSpacing = texts ? same(l => (l as TextLayer).letterSpacing) : null
  const textAlign = texts ? same(l => (l as TextLayer).align) : null
  const setFont = async (fontFamily: string) => {
    await Promise.all(texts!.map(t => ensureFont(fontFamily, t.fontWeight, t.italic)))
    setAll(() => ({ fontFamily } as Partial<Layer>)); s.commit('Font')
  }
  return (
    <>
      {shapes && (
        <Section title="Style">
          <div className="space-y-3">
            <ColorField label={fill!.mixed ? 'Fill (mixed)' : 'Fill'} value={fill!.v} allowNone onChange={v => setAll(() => ({ fill: v } as Partial<Layer>))} onCommit={() => s.commit('Fill', { ifChanged: true })} />
            <ColorField label={stroke!.mixed ? 'Outline (mixed)' : 'Outline'} value={stroke!.v} allowNone onChange={v => setAll(l => ({ stroke: v, strokeWidth: v && !(l as ShapeLayer).strokeWidth ? 6 : (l as ShapeLayer).strokeWidth } as Partial<Layer>))} onCommit={() => s.commit('Outline', { ifChanged: true })} />
          </div>
        </Section>
      )}
      {texts && (
        <Section title="Type">
          <div className="space-y-3">
            <Select label="Font" value={font!.mixed ? '' : font!.v} options={[...(font!.mixed ? [{ id: '', label: 'Mixed' }] : []), ...FONTS.map(f => ({ id: f, label: f }))]} onChange={f => f && setFont(f)} />
            <NumField label="Size" title="Text size in pixels" value={size!.v} mixed={size!.mixed} onCommit={v => { setAll(() => ({ fontSize: Math.max(1, v) } as Partial<Layer>)); s.commit('Text size', { merge: 1000 }) }} />
            <ColorField label={color!.mixed ? 'Colour (mixed)' : 'Colour'} value={color!.v} onChange={v => v && setAll(() => ({ color: v } as Partial<Layer>))} onCommit={() => s.commit('Text colour', { ifChanged: true })} />
            <Slider label="Line spacing" value={lineSpacing!.v} mixed={lineSpacing!.mixed} min={0.7} max={2.5} step={0.05} onChange={v => setAll(() => ({ lineHeight: v } as Partial<Layer>))} onCommit={() => s.commit('Line spacing', { ifChanged: true })} />
            <Slider label="Letter spacing" value={letterSpacing!.v} mixed={letterSpacing!.mixed} min={-10} max={60} step={0.5} unit="px" onChange={v => setAll(() => ({ letterSpacing: v } as Partial<Layer>))} onCommit={() => s.commit('Letter spacing', { ifChanged: true })} />
            <Select label="Align" value={textAlign!.mixed ? '' : textAlign!.v} options={[...(textAlign!.mixed ? [{ id: '', label: 'Mixed' }] : []), { id: 'left', label: 'Left' }, { id: 'center', label: 'Centre' }, { id: 'right', label: 'Right' }, { id: 'justify', label: 'Justify' }]} onChange={v => { if (!v) return; setAll(() => ({ align: v } as Partial<Layer>)); s.commit('Text alignment') }} />
          </div>
        </Section>
      )}
      <Section title="Layer">
        <div className="space-y-3">
          <Slider label="Opacity" value={opacity.v} mixed={opacity.mixed} min={0} max={100} unit="%" onChange={v => setAll(() => ({ opacity: v / 100 }))} onCommit={() => s.commit('Opacity', { ifChanged: true })} />
          <Select label="Blend" value={blend.mixed ? '' : blend.v} options={[...(blend.mixed ? [{ id: '' as any, label: 'Mixed' }] : []), ...BLEND_MODES]} onChange={v => { if (!v) return; setAll(() => ({ blend: v })); s.commit('Blend mode') }} />
        </div>
      </Section>
    </>
  )
}

function TextProps({ layer }: { layer: TextLayer }) {
  const s = useEditor.getState()
  // Typing happens on the canvas. This field mirrors the text for people who prefer a form, and never takes focus on its own.
  const ta = useRef<HTMLTextAreaElement>(null)
  const up = (patch: Partial<TextLayer>) => s.updateLayer(layer.id, patch)
  // Spacing, paragraph box, outline and shadow are one click away unless already in use.
  const [moreType, setMoreType] = useState(!!layer.boxWidth || !!layer.outline || !!layer.shadow || layer.letterSpacing !== 0 || Math.abs(layer.lineHeight - 1.15) > 0.01)
  const setFont = (fontFamily: string, fontWeight = layer.fontWeight, italic = layer.italic) => ops.setFontNow(layer.id, { fontFamily, fontWeight, italic }, 'Font')
  // Fonts already used in this design (a brand's own families, say) come first, then the built-in list.
  const docFontKey = useEditor(st => Array.from(new Set(st.layers.filter(l => l.type === 'text').map(l => (l as TextLayer).fontFamily))).sort().join('|'))
  const docFonts = docFontKey ? docFontKey.split('|') : []
  const fontOptions = [...docFonts.filter(f => !FONTS.includes(f)).map(f => ({ id: f, label: `${f} (in this design)` })), ...FONTS.map(f => ({ id: f, label: f }))]
  const tog = (on: boolean) => `h-8 w-9 inline-flex items-center justify-center rounded-md ${focusRing} ${on ? 'bg-void-700 text-white' : 'bg-void-900 text-void-400 hover:text-white'}`
  return (
    <Section title="Type">
      <div className="space-y-3">
        <textarea ref={ta} aria-label="Text content" value={layer.text} rows={3} onChange={e => up({ text: e.target.value })} onBlur={() => s.commit('Edit text')}
          className={`w-full px-2.5 py-2 rounded-lg bg-surface-sunken border border-white/[0.06] text-[13px] leading-snug resize-y ${focusRing}`} />
        <Select label="Font" value={layer.fontFamily} options={fontOptions} onChange={f => setFont(f)} />
        <div className="flex items-center gap-1.5">
          <button aria-label="Bold" aria-pressed={layer.fontWeight >= 700} className={tog(layer.fontWeight >= 700) + ' font-bold text-[13px]'} onClick={() => setFont(layer.fontFamily, layer.fontWeight >= 700 ? 400 : 700)}>B</button>
          <button aria-label="Italic" aria-pressed={layer.italic} className={tog(layer.italic)} onClick={() => setFont(layer.fontFamily, layer.fontWeight, !layer.italic)}><Italic size={15} /></button>
          <span className="w-2" />
          {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
            <button key={a} aria-label={`Align ${a}`} aria-pressed={layer.align === a} className={tog(layer.align === a)} onClick={() => s.updateLayer(layer.id, { align: a }, 'Align')}><Icon size={15} /></button>
          ))}
        </div>
        <ColorField label="Colour" value={layer.color} onChange={v => v && up({ color: v })} onCommit={() => s.commit('Text colour')} />
        <button onClick={() => setMoreType(v => !v)} aria-expanded={moreType} className={`text-[12px] text-void-400 hover:text-white inline-flex items-center gap-1 rounded ${focusRing}`}><ChevronDown size={12} className={moreType ? '' : '-rotate-90'} />{moreType ? 'Fewer options' : 'More type options'}</button>
        {moreType && <>
        <label className="flex items-center gap-2 text-[12.5px] text-void-300"><input type="checkbox" checked={!!layer.boxWidth} onChange={e => s.updateLayer(layer.id, { boxWidth: e.target.checked ? Math.max(120, Math.round(layerSizeOf(layer))) : null }, e.target.checked ? 'Text box' : 'Point text')} />Wrap text in a box</label>
        <Slider label="Size" value={layer.fontSize} min={8} max={600} unit="px" onChange={v => up({ fontSize: v })} onCommit={() => s.commit('Text size')} />
        <Slider label="Line spacing" value={layer.lineHeight} min={0.7} max={2.5} step={0.05} onChange={v => up({ lineHeight: v })} onCommit={() => s.commit('Line spacing')} />
        <Slider label="Letter spacing" value={layer.letterSpacing} min={-10} max={60} step={0.5} unit="px" onChange={v => up({ letterSpacing: v })} onCommit={() => s.commit('Letter spacing')} />
        <ColorField label="Outline" allowNone value={layer.outline?.color ?? null} onChange={v => up({ outline: v ? { color: v, width: layer.outline?.width ?? Math.max(2, Math.round(layer.fontSize / 24)) } : null })} onCommit={() => s.commit('Text outline')} />
        {layer.outline && <Slider label="Outline width" value={layer.outline.width} min={1} max={Math.max(12, Math.round(layer.fontSize / 4))} unit="px" onChange={v => up({ outline: { ...layer.outline!, width: v } })} onCommit={() => s.commit('Text outline')} />}
        <ColorField label="Shadow" allowNone value={layer.shadow?.color ?? null} onChange={v => up({ shadow: v ? { color: v, blur: layer.shadow?.blur ?? Math.round(layer.fontSize / 8), x: layer.shadow?.x ?? 0, y: layer.shadow?.y ?? Math.round(layer.fontSize / 16), opacity: layer.shadow?.opacity ?? 0.6 } : null })} onCommit={() => s.commit('Text shadow')} />
        {layer.shadow && <>
          <Slider label="Shadow opacity" value={Math.round((layer.shadow.opacity ?? 1) * 100)} min={0} max={100} unit="%" onChange={v => up({ shadow: { ...layer.shadow!, opacity: v / 100 } })} onCommit={() => s.commit('Text shadow')} />
          <Slider label="Shadow blur" value={layer.shadow.blur} min={0} max={120} unit="px" onChange={v => up({ shadow: { ...layer.shadow!, blur: v } })} onCommit={() => s.commit('Text shadow')} />
          <Slider label="Shadow across" value={layer.shadow.x} min={-100} max={100} unit="px" onChange={v => up({ shadow: { ...layer.shadow!, x: v } })} onCommit={() => s.commit('Text shadow')} />
          <Slider label="Shadow down" value={layer.shadow.y} min={-100} max={100} unit="px" onChange={v => up({ shadow: { ...layer.shadow!, y: v } })} onCommit={() => s.commit('Text shadow')} />
        </>}
        </>}
      </div>
    </Section>
  )
}

function ShapeProps({ layer }: { layer: ShapeLayer }) {
  const s = useEditor.getState()
  const up = (patch: Partial<ShapeLayer>) => s.updateLayer(layer.id, patch)
  return (
    <Section title="Style">
      <div className="space-y-3">
        {layer.shape !== 'line' && <ColorField label="Fill" value={layer.fill} allowNone onChange={v => up({ fill: v })} onCommit={() => s.commit('Fill')} />}
        <ColorField label="Outline" value={layer.stroke} allowNone={layer.shape !== 'line'} onChange={v => up({ stroke: v, strokeWidth: v && !layer.strokeWidth ? 6 : layer.strokeWidth })} onCommit={() => s.commit('Outline')} />
        {layer.stroke && <Slider label="Outline width" value={layer.strokeWidth} min={1} max={120} unit="px" onChange={v => up(layer.shape === 'line' ? { strokeWidth: v, h: Math.max(v, 6) } : { strokeWidth: v })} onCommit={() => s.commit('Outline width')} />}
        {layer.shape === 'polygon' && <>
          <Slider label="Points" value={layer.sides ?? 5} min={3} max={40} onChange={v => up({ sides: v })} onCommit={() => s.commit('Points')} />
          <Slider label="Star depth" value={Math.round((1 - (layer.star ?? 1)) * 100)} min={0} max={90} unit="%" onChange={v => up({ star: 1 - v / 100 })} onCommit={() => s.commit('Star depth')} />
        </>}
        {layer.stroke && layer.shape === 'path' && (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[11.5px] text-void-400">Stroke position
              <select value={layer.strokeAlign ?? 'center'} onChange={e => s.updateLayer(layer.id, { strokeAlign: e.target.value as ShapeLayer['strokeAlign'] }, 'Stroke position')} className="h-7 px-1.5 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] text-void-100">
                <option value="inside">Inside</option><option value="center">Centre</option><option value="outside">Outside</option>
              </select></label>
            <label className="flex flex-col gap-1 text-[11.5px] text-void-400">Dashes
              <select value={(layer.strokeDash ?? []).join(',')} onChange={e => s.updateLayer(layer.id, { strokeDash: e.target.value ? e.target.value.split(',').map(Number) : [] }, 'Stroke dashes')} className="h-7 px-1.5 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] text-void-100">
                <option value="">Solid</option><option value="3,2">Dashed</option><option value="0.01,2">Dotted</option><option value="6,2,1,2">Dash dot</option>
              </select></label>
          </div>
        )}
        {layer.stroke && (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[11.5px] text-void-400">Ends
              <select value={layer.strokeCap ?? 'round'} onChange={e => s.updateLayer(layer.id, { strokeCap: e.target.value as ShapeLayer['strokeCap'] }, 'Stroke ends')} className="h-7 px-1.5 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] text-void-100">
                <option value="butt">Flat</option><option value="round">Round</option><option value="square">Square</option>
              </select></label>
            <label className="flex flex-col gap-1 text-[11.5px] text-void-400">Corners
              <select value={layer.strokeJoin ?? 'round'} onChange={e => s.updateLayer(layer.id, { strokeJoin: e.target.value as ShapeLayer['strokeJoin'] }, 'Stroke corners')} className="h-7 px-1.5 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] text-void-100">
                <option value="miter">Sharp</option><option value="round">Round</option><option value="bevel">Bevel</option>
              </select></label>
          </div>
        )}
        <div>
          <span className="block text-[11.5px] text-void-400 mb-1">Pathfinder {useEditor.getState().selectedIds.length > 1 ? '(selected shapes)' : '(parts of this shape)'}</span>
          <div className="grid grid-cols-3 gap-1">
            {([['unite', 'Unite'], ['minusFront', 'Minus front'], ['intersect', 'Intersect'], ['exclude', 'Exclude'], ['divide', 'Divide'], ['minusBack', 'Minus back']] as const).map(([k, l]) => (
              <button key={k} onClick={() => ops.pathfinderSelected(k)} className="h-7 rounded-md bg-void-800/80 hover:bg-void-700 text-[11.5px] text-void-200">{l}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1">
            <button disabled={!layer.stroke} onClick={() => ops.outlineStroke()} className="h-7 rounded-md bg-void-800/80 hover:bg-void-700 text-[11.5px] text-void-200 disabled:opacity-40">Outline stroke</button>
            <button disabled={!(layer.subpaths ?? []).some(sp => sp.op)} onClick={() => ops.expandPathOps()} className="h-7 rounded-md bg-void-800/80 hover:bg-void-700 text-[11.5px] text-void-200 disabled:opacity-40">Expand parts</button>
          </div>
        </div>
        {layer.shape === 'path' && <p className="text-[11.5px] text-void-500 leading-snug">Edit points with Direct Select (A), or add to this shape with the Pen (hold Shift to start a new part).</p>}
        {layer.shape === 'rect' && <Slider label="Rounded corners" value={layer.radius} min={0} max={Math.round(Math.min(layer.w, layer.h) / 2)} unit="px" onChange={v => up({ radius: v })} onCommit={() => s.commit('Corners')} />}
      </div>
    </Section>
  )
}

export interface SettingsApi {
  value: AdjustmentSettings
  name: string
  up: (patch: Partial<AdjustmentSettings>, label?: string) => void
  commit: (label: string) => void
  /** Inside an effect row: no section header or notes about layers below. */
  embedded?: boolean
}

function AdjustmentProps({ layer }: { layer: AdjustmentLayer }) {
  const s = useEditor.getState()
  return <SettingsControls api={{ value: layer, name: layer.name, up: (p, label) => s.updateLayer(layer.id, p as Partial<AdjustmentLayer>, label), commit: label => s.commit(label) }} />
}

function Wrap({ api, title, action, children }: { api: SettingsApi; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  if (!api.embedded) return <Section title={title} action={action}>{children}</Section>
  return <div className="space-y-2 pt-1">{action && <div className="flex justify-end">{action}</div>}{children}</div>
}

/** Settings for an adjustment or a Void effect: an adjustment layer's, or an effect's in a stack. */
export function SettingsControls({ api }: { api: SettingsApi }) {
  const layer = api.value
  if (layer.kind === 'voidEffect' && layer.effect) {
    const cfg = effectParams[layer.effect] ?? []
    const p = { ...defaultParams, ...layer.effectParams }
    const set = (k: keyof EffectParams, v: number | string) => api.up({ effectParams: { ...p, [k]: v } })
    const presets = presetsFor(layer.effect), current = matchPreset(layer.effect, p as EffectParams)
    const fields = cfg.filter(c => c.key !== 'opacity')
    const controls = fields.map(c => c.type === 'color'
      ? <ColorField key={c.key} label={c.label} value={p[c.key] as string} onChange={v => v && set(c.key, v)} onCommit={() => api.commit('Filter colour')} />
      : <Slider key={c.key} label={c.label} value={p[c.key] as number} min={c.min ?? 0} max={c.max ?? 100} unit={c.unit} onChange={v => set(c.key, v)} onCommit={() => api.commit('Filter setting')} />)
    return (
      <Wrap api={api} title="Filter settings" action={<button aria-label="Reset" title="Reset" onClick={() => api.up({ effectParams: { ...defaultParams } }, 'Reset filter')} className={`text-void-400 hover:text-white rounded ${focusRing}`}><RotateCcw size={14} /></button>}>
        <div className="space-y-3">
          {['blur', 'motionBlur', 'radialBlur'].includes(layer.effect) && <Select label="Blur type" value={layer.effect} options={[{ id: 'blur', label: 'Soft blur' }, { id: 'motionBlur', label: 'Motion / directional' }, { id: 'radialBlur', label: 'Radial / zoom' }]} onChange={effect => api.up({ effect: effect as typeof layer.effect }, 'Blur type')} />}
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Starting points">
              {presets.map(pr => <button key={pr.label} onClick={() => api.up({ effectParams: { ...p, ...pr.values } }, `${pr.label} preset`)} aria-pressed={current === pr.label} className={`h-7 px-2.5 rounded-md text-[12px] border ${focusRing} ${current === pr.label ? 'border-accent bg-accent-soft text-white' : 'border-white/[0.06] bg-surface-sunken text-void-300 hover:text-white'}`}>{pr.label}</button>)}
            </div>
          )}
          <p className="text-xs text-void-500">{effectDefinitions.find(e => e.id === layer.effect)?.description}. Changes preview on the canvas. Use Reset to start again.</p>
          {controls.slice(0, 2)}
          {controls.length > 2 && <details><summary className="text-xs text-void-300 cursor-pointer">More settings · {fields.slice(2).map(c => c.label).join(', ')}</summary><div className="pt-3 space-y-3">{controls.slice(2)}</div></details>}
          <details><summary className="text-xs text-void-300 cursor-pointer">Finish · tone and colour</summary><div className="pt-3 space-y-3">{FINISH_PARAMS.map(c => <Slider key={c.key} label={c.label} value={p[c.key] as number ?? 0} min={-100} max={100} onChange={v => set(c.key, v)} onCommit={() => api.commit('Filter finish')} />)}<p className="text-xs text-void-500">Fine-tune the filtered result before blending it with the original. Zero keeps its original tone.</p></div></details>
          {!api.embedded && <p className="text-[12px] text-void-500 leading-relaxed">Filters affect every layer beneath them and stay editable. Add a mask to limit where they apply.</p>}
        </div>
      </Wrap>
    )
  }
  if (layer.kind === 'blur') {
    const v = layer.values, mode = v.mode ?? 0
    const patch = (p: Record<string, number>) => api.up({ values: { ...v, ...p } })
    const commit = () => api.commit('Blur settings')
    return <Wrap api={api} title="Blur settings" action={<button className="text-xs text-void-400" onClick={() => api.up({ values: { ...ADJUSTMENT_DEFAULTS.blur } }, 'Reset blur')}>Reset</button>}>
      <div className="space-y-3">
        <Select label="Blur type" value={String(mode)} options={[{ id: '0', label: 'Soft blur' }, { id: '1', label: 'Motion / directional' }, { id: '2', label: 'Radial / zoom' }]} onChange={x => api.up({ values: { ...v, mode: Number(x) } }, 'Blur type')} />
        <Slider label={mode === 1 ? 'Blur width / length' : 'Blur radius'} value={v.radius ?? 8} min={0} max={160} unit="px" onChange={radius => patch({ radius })} onCommit={commit} />
        <Slider label="Intensity" value={v.strength ?? 100} min={0} max={100} unit="%" onChange={strength => patch({ strength })} onCommit={commit} />
        {mode === 1 && <Slider label="Direction" value={v.angle ?? 0} min={-180} max={180} unit="°" onChange={angle => patch({ angle })} onCommit={commit} />}
        {mode === 2 && <details><summary className="text-xs text-void-300 cursor-pointer">Blur centre</summary><div className="space-y-3 pt-2">{(['centerX', 'centerY'] as const).map(k => <Slider key={k} label={k === 'centerX' ? 'Centre X' : 'Centre Y'} value={v[k] ?? 50} min={0} max={100} unit="%" onChange={x => patch({ [k]: x })} onCommit={commit} />)}</div></details>}
        <p className="text-xs text-void-500">Radius changes the reach. Intensity blends with the original. Motion adds direction; radial blurs towards a centre.</p>
      </div>
    </Wrap>
  }
  if (layer.kind === 'curves') return <CurvesProps api={api} />
  if (false as boolean) {
    const pts = layer.points ?? [[0, 0], [255, 255]]
    const setPts = (points: [number, number][]) => api.up({ points })
    return (
      <Wrap api={api} title="Curve" action={<button aria-label="Reset" title="Reset" onClick={() => api.up({ points: [[0, 0], [255, 255]] }, 'Reset curve')} className={`text-void-400 hover:text-white rounded ${focusRing}`}><RotateCcw size={14} /></button>}>
        <CurvesEditor points={pts} onChange={setPts} onCommit={() => api.commit('Curves')} />
        <div className="flex flex-wrap gap-1.5 mt-3">
          {CURVE_PRESETS.map(p => <button key={p.label} onClick={() => api.up({ points: p.points }, 'Curves')} className={`h-7 px-2.5 rounded-md text-[12px] bg-surface-sunken border border-white/[0.06] text-void-300 hover:text-white ${focusRing}`}>{p.label}</button>)}
        </div>
        <p className="mt-2.5 text-[12px] text-void-500 leading-relaxed">Click the line to add a point, drag to bend it, double-click a point to remove it.</p>
      </Wrap>
    )
  }
  const special = <SpecialAdjustment api={api} />
  if (['colorBalance', 'channelMixer', 'photoFilter', 'gradientMap', 'levels', 'hueSaturation'].includes(layer.kind)) return special
  const fields = ADJ_FIELDS[layer.kind] ?? []
  return (
    <Wrap api={api} title="Settings" action={<button aria-label="Reset" title="Reset" onClick={() => api.up({ values: { ...ADJUSTMENT_DEFAULTS[layer.kind] } }, 'Reset adjustment')} className={`text-void-400 hover:text-white rounded ${focusRing}`}><RotateCcw size={14} /></button>}>
      <div className="space-y-3">
        {fields.map(f => (
          <Slider key={f.key} label={f.label} value={layer.values[f.key] ?? 0} min={f.min} max={f.max}
            onChange={v => api.up({ values: { ...layer.values, [f.key]: v } })} onCommit={() => api.commit(api.name)} />
        ))}
        {!api.embedded && <p className="text-[12px] text-void-500 leading-relaxed">{layer.clipId ? 'Only its clipped target changes.' : layer.reach === 'group' && layer.groupId ? 'Only this group changes.' : 'Everything below changes.'} Your original pixels are never changed.</p>}
      </div>
    </Wrap>
  )
}

// ─── Channel-aware curves ──────────────────────────────────────────

function CurvesProps({ api }: { api: SettingsApi }) {
  const layer = api.value
  const [ch, setCh] = useState<'rgb' | 'r' | 'g' | 'b'>('rgb')
  const pts = ch === 'rgb' ? (layer.points ?? [[0, 0], [255, 255]]) : (layer.channelPoints?.[ch] ?? [[0, 0], [255, 255]])
  const setPts = (points: [number, number][]) => ch === 'rgb' ? api.up({ points }) : api.up({ channelPoints: { ...(layer.channelPoints ?? {}), [ch]: points } })
  return (
    <Wrap api={api} title="Curve" action={<button aria-label="Reset" title="Reset" onClick={() => api.up({ points: [[0, 0], [255, 255]], channelPoints: {} }, 'Reset curve')} className={`text-void-400 hover:text-white rounded ${focusRing}`}><RotateCcw size={14} /></button>}>
      <ChannelTabs value={ch} onChange={setCh} />
      <CurvesEditor points={pts} onChange={setPts} onCommit={() => api.commit('Curves')} />
      {ch === 'rgb' && <div className="flex flex-wrap gap-1.5 mt-3">
        {CURVE_PRESETS.map(p => <button key={p.label} onClick={() => api.up({ points: p.points }, 'Curves')} className={`h-7 px-2.5 rounded-md text-[12px] bg-surface-sunken border border-white/[0.06] text-void-300 hover:text-white ${focusRing}`}>{p.label}</button>)}
      </div>}
      <p className="mt-2.5 text-[12px] text-void-500 leading-relaxed">Click the line to add a point, drag to bend it, double-click a point to remove it. Red, Green and Blue fix colour casts.</p>
    </Wrap>
  )
}

function ChannelTabs({ value, onChange }: { value: 'rgb' | 'r' | 'g' | 'b'; onChange: (v: 'rgb' | 'r' | 'g' | 'b') => void }) {
  const col = { rgb: '#fff', r: '#ff5a5a', g: '#4dd67a', b: '#5a8bff' }
  return (
    <div className="flex gap-1 mb-2.5" role="tablist">
      {(['rgb', 'r', 'g', 'b'] as const).map(c => <button key={c} role="tab" aria-selected={value === c} onClick={() => onChange(c)} className={`h-7 flex-1 rounded-md text-[12px] ${value === c ? 'bg-void-700 text-white' : 'bg-surface-sunken text-void-400 hover:text-white'}`} style={value === c ? { boxShadow: `inset 0 -2px 0 ${col[c]}` } : undefined}>{c === 'rgb' ? 'RGB' : c.toUpperCase()}</button>)}
    </div>
  )
}

function pick(label: string, cb: (rgb: [number, number, number]) => void) {
  useEditor.setState({ pickRequest: { label, cb: (_h, rgb) => cb(rgb) } })
  useEditor.getState().notify(`Click the image to ${label.toLowerCase()}.`)
}

function SpecialAdjustment({ api }: { api: SettingsApi }) {
  const layer = api.value
  const v = layer.values
  const setV = (patch: Record<string, number>) => api.up({ values: { ...v, ...patch } })
  const commit = () => api.commit(api.name)
  const reset = <button aria-label="Reset" title="Reset" onClick={() => api.up({ values: { ...ADJUSTMENT_DEFAULTS[layer.kind] }, channelLevels: undefined, bands: undefined }, 'Reset adjustment')} className={`text-void-400 hover:text-white rounded ${focusRing}`}><RotateCcw size={14} /></button>
  const [range, setRange] = useState<'s' | 'm' | 'h'>('m')
  const [out, setOut] = useState<'r' | 'g' | 'b'>('r')
  const [ch, setCh] = useState<'rgb' | 'r' | 'g' | 'b'>('rgb')
  const [band, setBand] = useState<'master' | HueBand>('master')

  if (layer.kind === 'levels') {
    const cur = ch === 'rgb' ? [v.black, v.white, v.gamma] : (layer.channelLevels?.[ch] ?? [0, 255, 100])
    const setL = (i: number, val: number) => {
      if (ch === 'rgb') setV({ [['black', 'white', 'gamma'][i]]: val })
      else { const n = [...cur] as [number, number, number]; n[i] = val; api.up({ channelLevels: { ...(layer.channelLevels ?? {}), [ch]: n } }) }
    }
    const setAll = (fn: (c: number, i: number) => [number, number, number]) => {
      const cl = { ...(layer.channelLevels ?? {}) } as any
      ;(['r', 'g', 'b'] as const).forEach((c, i) => { cl[c] = fn(i, i) })
      api.up({ channelLevels: cl }, 'Levels picker')
    }
    const lv = (c: 'r' | 'g' | 'b') => layer.channelLevels?.[c] ?? [0, 255, 100]
    return (
      <Wrap api={api} title="Levels" action={reset}>
        <ChannelTabs value={ch} onChange={setCh} />
        <div className="space-y-3">
          <Slider label="Darkest point" value={cur[0]} min={0} max={254} onChange={x => setL(0, x)} onCommit={commit} />
          <Slider label="Midtones" value={cur[2]} min={10} max={300} onChange={x => setL(2, x)} onCommit={commit} />
          <Slider label="Brightest point" value={cur[1]} min={1} max={255} onChange={x => setL(1, x)} onCommit={commit} />
          <div className="grid grid-cols-3 gap-1.5">
            <Button onClick={() => pick('Set the black point', rgb => setAll((_c, i) => { const o = lv((['r', 'g', 'b'] as const)[i]); return [Math.min(rgb[i], o[1] - 1), o[1], o[2]] }))} className="!h-8 !px-1 !text-[11.5px]"><span className="w-3 h-3 rounded-full bg-black border border-white/40" />Black</Button>
            <Button onClick={() => pick('Set the grey point', rgb => { const t = (rgb[0] + rgb[1] + rgb[2]) / 3; setAll((_c, i) => { const o = lv((['r', 'g', 'b'] as const)[i]); const xc = Math.min(0.99, Math.max(0.01, (rgb[i] - o[0]) / (o[1] - o[0]))), xt = Math.min(0.99, Math.max(0.01, (t - o[0]) / (o[1] - o[0]))); return [o[0], o[1], Math.max(10, Math.min(300, Math.round((100 * Math.log(xc)) / Math.log(xt))))] }) })} className="!h-8 !px-1 !text-[11.5px]"><span className="w-3 h-3 rounded-full bg-[#808080] border border-white/40" />Grey</Button>
            <Button onClick={() => pick('Set the white point', rgb => setAll((_c, i) => { const o = lv((['r', 'g', 'b'] as const)[i]); return [o[0], Math.max(rgb[i], o[0] + 1), o[2]] }))} className="!h-8 !px-1 !text-[11.5px]"><span className="w-3 h-3 rounded-full bg-white" />White</Button>
          </div>
          <p className="text-[12px] text-void-500 leading-relaxed">Pickers: click something that should be pure black, neutral grey or pure white. The grey picker removes colour casts.</p>
        </div>
      </Wrap>
    )
  }

  if (layer.kind === 'hueSaturation') {
    const cur = band === 'master' ? { hue: v.hue, saturation: v.saturation, lightness: v.lightness } : (layer.bands?.[band] ?? { hue: 0, saturation: 0, lightness: 0 })
    const setH = (patch: Partial<typeof cur>) => band === 'master' ? setV(patch as any) : api.up({ bands: { ...(layer.bands ?? {}), [band]: { ...cur, ...patch } } })
    return (
      <Wrap api={api} title="Hue and saturation" action={reset}>
        <div className="flex flex-wrap gap-1 mb-3">
          <button onClick={() => setBand('master')} className={`h-7 px-2.5 rounded-md text-[12px] ${band === 'master' ? 'bg-void-700 text-white' : 'bg-surface-sunken text-void-400'}`}>All colours</button>
          {HUE_BANDS.map(b => <button key={b.id} onClick={() => setBand(b.id)} aria-pressed={band === b.id} title={b.label} className={`h-7 px-2 rounded-md text-[12px] inline-flex items-center gap-1 ${band === b.id ? 'bg-void-700 text-white' : 'bg-surface-sunken text-void-400'}`}><span className="w-2.5 h-2.5 rounded-full" style={{ background: b.swatch }} />{b.label}</button>)}
        </div>
        <div className="space-y-3">
          <Slider label="Hue" value={cur.hue} min={-180} max={180} onChange={x => setH({ hue: x })} onCommit={commit} />
          <Slider label="Saturation" value={cur.saturation} min={-100} max={100} onChange={x => setH({ saturation: x })} onCommit={commit} />
          <Slider label="Lightness" value={cur.lightness} min={-100} max={100} onChange={x => setH({ lightness: x })} onCommit={commit} />
          <Button onClick={() => pick('Pick the colour to change', rgb => { const mx = Math.max(...rgb), mn = Math.min(...rgb); if (mx - mn < 8) { useEditor.getState().notify('That colour is grey. Pick something with colour in it.'); return } const [r, g, b] = rgb; const d = mx - mn; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; const best = HUE_BANDS.reduce((a, x) => { const da = Math.min(Math.abs(h - a.center), 360 - Math.abs(h - a.center)), dx = Math.min(Math.abs(h - x.center), 360 - Math.abs(h - x.center)); return dx < da ? x : a }); setBand(best.id) })} className="w-full">Pick a colour on the image</Button>
          <p className="text-[12px] text-void-500 leading-relaxed">Pick a colour range to change just those hues, like making only the sky bluer.</p>
        </div>
      </Wrap>
    )
  }

  if (layer.kind === 'colorBalance') {
    const p = range === 's' ? 's' : range === 'm' ? 'm' : 'h'
    return (
      <Wrap api={api} title="Colour balance" action={reset}>
        <div className="flex gap-1 mb-3">{(['s', 'm', 'h'] as const).map(r => <button key={r} onClick={() => setRange(r)} className={`h-7 flex-1 rounded-md text-[12px] ${range === r ? 'bg-void-700 text-white' : 'bg-surface-sunken text-void-400'}`}>{{ s: 'Shadows', m: 'Midtones', h: 'Highlights' }[r]}</button>)}</div>
        <div className="space-y-3">
          <Slider label="Cyan to red" value={v[p + 'CR']} min={-100} max={100} onChange={x => setV({ [p + 'CR']: x })} onCommit={commit} />
          <Slider label="Magenta to green" value={v[p + 'MG']} min={-100} max={100} onChange={x => setV({ [p + 'MG']: x })} onCommit={commit} />
          <Slider label="Yellow to blue" value={v[p + 'YB']} min={-100} max={100} onChange={x => setV({ [p + 'YB']: x })} onCommit={commit} />
          <label className="flex items-center gap-2 text-[12.5px] text-void-300"><input type="checkbox" checked={!!v.preserve} onChange={e => { setV({ preserve: e.target.checked ? 1 : 0 }); commit() }} />Keep brightness</label>
        </div>
      </Wrap>
    )
  }

  if (layer.kind === 'channelMixer') {
    const o = out
    return (
      <Wrap api={api} title="Channel mixer" action={reset}>
        <div className="flex gap-1 mb-3">{(['r', 'g', 'b'] as const).map(c => <button key={c} onClick={() => setOut(c)} disabled={!!v.mono && c !== 'r'} className={`h-7 flex-1 rounded-md text-[12px] disabled:opacity-30 ${out === c ? 'bg-void-700 text-white' : 'bg-surface-sunken text-void-400'}`}>{v.mono ? 'Grey' : { r: 'Red out', g: 'Green out', b: 'Blue out' }[c]}</button>)}</div>
        <div className="space-y-3">
          {(['r', 'g', 'b'] as const).map(c => <Slider key={c} label={{ r: 'Red', g: 'Green', b: 'Blue' }[c]} value={v[o + c]} min={-200} max={200} unit="%" onChange={x => setV({ [o + c]: x })} onCommit={commit} />)}
          <label className="flex items-center gap-2 text-[12.5px] text-void-300"><input type="checkbox" checked={!!v.mono} onChange={e => { setV({ mono: e.target.checked ? 1 : 0, ...(e.target.checked ? { rr: 40, rg: 40, rb: 20 } : {}) }); setOut('r'); commit() }} />Black and white mix</label>
        </div>
      </Wrap>
    )
  }

  if (layer.kind === 'photoFilter') {
    const color = layer.colors?.[0] ?? '#ec8a00'
    return (
      <Wrap api={api} title="Photo filter" action={reset}>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><span className="text-[12px] text-void-400">Filter colour</span><ColorButton label="Filter colour" value={color} onChange={c => api.up({ colors: [c] })} onCommit={commit} /></div>
          <div className="flex flex-wrap gap-1.5">{[['Warm', '#ec8a00'], ['Cool', '#006dff'], ['Sepia', '#ac7a33'], ['Green', '#19c919'], ['Deep red', '#ff0000']].map(([n, c]) => <button key={n} onClick={() => api.up({ colors: [c] }, 'Photo filter')} className="h-7 px-2 rounded-md text-[12px] bg-surface-sunken text-void-300 inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{n}</button>)}</div>
          <Slider label="Density" value={v.density} min={1} max={100} unit="%" onChange={x => setV({ density: x })} onCommit={commit} />
          <label className="flex items-center gap-2 text-[12.5px] text-void-300"><input type="checkbox" checked={!!v.preserve} onChange={e => { setV({ preserve: e.target.checked ? 1 : 0 }); commit() }} />Keep brightness</label>
        </div>
      </Wrap>
    )
  }

  // gradient map
  const cols = layer.colors?.length ? layer.colors : ['#000000', '#ffffff']
  const setCols = (c: string[], label?: string) => api.up({ colors: c }, label)
  const PRESETS: [string, string[]][] = [['Black to white', ['#000000', '#ffffff']], ['Duotone violet', ['#1b0f3b', '#8b7cff', '#f3efff']], ['Sunset', ['#1a0633', '#c2185b', '#ffb74d']], ['Teal and orange', ['#06222b', '#1d8a8a', '#f6a04d']], ['Newsprint', ['#1c1c1c', '#e9e4d8']]]
  return (
    <Wrap api={api} title="Gradient map" action={reset}>
      <div className="space-y-3">
        <div className="h-5 rounded-md" style={{ background: `linear-gradient(to right, ${(v.reverse ? [...cols].reverse() : cols).join(',')})` }} />
        <div className="flex items-center gap-1.5 flex-wrap">
          {cols.map((c, i) => <ColorButton key={i} label={`Stop ${i + 1}`} value={c} onChange={x => setCols(cols.map((y, j) => (j === i ? x : y)))} onCommit={commit} />)}
          {cols.length < 5 && <button onClick={() => setCols([...cols.slice(0, -1), '#808080', cols[cols.length - 1]], 'Add stop')} className="h-7 px-2 rounded-md text-[12px] bg-surface-sunken text-void-300">Add stop</button>}
          {cols.length > 2 && <button onClick={() => setCols([...cols.slice(0, -2), cols[cols.length - 1]], 'Remove stop')} className="h-7 px-2 rounded-md text-[12px] bg-surface-sunken text-void-300">Remove</button>}
        </div>
        <div className="flex flex-wrap gap-1.5">{PRESETS.map(([n, c]) => <button key={n} onClick={() => setCols(c, 'Gradient map')} className="h-7 px-2 rounded-md text-[12px] bg-surface-sunken text-void-300 inline-flex items-center gap-1.5"><span className="w-6 h-2.5 rounded" style={{ background: `linear-gradient(to right, ${c.join(',')})` }} />{n}</button>)}</div>
        <label className="flex items-center gap-2 text-[12.5px] text-void-300"><input type="checkbox" checked={!!v.reverse} onChange={e => { setV({ reverse: e.target.checked ? 1 : 0 }); commit() }} />Reverse</label>
      </div>
    </Wrap>
  )
}
export { hexToRgb }

function PathTextProps({ layer }: { layer: TextLayer }) {
  const s = useEditor.getState()
  const tp = layer.onPath!
  const up = (patch: Partial<NonNullable<TextLayer['onPath']>>, label?: string) => s.updateLayer(layer.id, { onPath: { ...tp, ...patch } }, label)
  const len = Math.round(Math.max(1, (tp.w + tp.h) * 2))
  return (
    <Section title="Type on a path">
      <div className="space-y-3">
        <Slider label="Start along the path" value={Math.round(tp.start)} min={0} max={len} unit="px" onChange={v => up({ start: v })} onCommit={() => s.commit('Move text along path')} />
        <div className="grid grid-cols-3 gap-1">
          {(['left', 'center', 'right'] as const).map(a => <button key={a} onClick={() => s.updateLayer(layer.id, { align: a }, 'Align text on path')} className={`h-7 rounded-md text-[11.5px] ${layer.align === a ? 'bg-void-700 text-white' : 'bg-void-800/80 text-void-300 hover:bg-void-700'}`}>{a === 'left' ? 'From start' : a === 'center' ? 'Centred' : 'To end'}</button>)}
        </div>
        <Slider label="Lift off the path" value={layer.baselineShift ?? 0} min={-200} max={200} unit="px" onChange={v => s.updateLayer(layer.id, { baselineShift: v })} onCommit={() => s.commit('Baseline shift')} />
        <div className="grid grid-cols-2 gap-1">
          <button onClick={() => up({ flip: !tp.flip }, 'Flip text on path')} className="h-7 rounded-md bg-void-800/80 hover:bg-void-700 text-[11.5px] text-void-200">Flip side</button>
          <button onClick={() => { useEditor.setState({ tool: 'pathselect', activePathId: null, vmaskEditId: null }) }} className="h-7 rounded-md bg-void-800/80 hover:bg-void-700 text-[11.5px] text-void-200">Edit the path</button>
        </div>
        <button onClick={() => ops.releaseTextFromPath()} className="text-[11.5px] text-void-400 hover:text-white">Release from path</button>
      </div>
    </Section>
  )
}

function VectorMaskProps({ layer }: { layer: Layer }) {
  const s = useEditor.getState()
  const editing = useEditor(st => st.vmaskEditId === layer.id)
  const vm = layer.vmask!
  return (
    <Section title="Vector mask">
      <div className="space-y-3">
        <p className="text-[11.5px] text-void-500 leading-snug">A path that shows the layer inside it. It stays sharp at any size and moves with the layer.</p>
        <div className="grid grid-cols-2 gap-1">
          <button onClick={() => ops.editVectorMask(editing ? null : layer.id)} className={`h-7 rounded-md text-[11.5px] ${editing ? 'bg-accent text-white' : 'bg-void-800/80 text-void-200 hover:bg-void-700'}`}>{editing ? 'Done editing' : 'Edit points'}</button>
          <button onClick={() => ops.updateVectorMask({ enabled: !vm.enabled }, vm.enabled ? 'Disable vector mask' : 'Enable vector mask')} className="h-7 rounded-md bg-void-800/80 hover:bg-void-700 text-[11.5px] text-void-200">{vm.enabled ? 'Disable' : 'Enable'}</button>
          <button onClick={() => ops.updateVectorMask({ invert: !vm.invert }, 'Invert vector mask')} className="h-7 rounded-md bg-void-800/80 hover:bg-void-700 text-[11.5px] text-void-200">{vm.invert ? 'Show inside' : 'Invert'}</button>
          <button onClick={() => ops.rasterizeVectorMask()} className="h-7 rounded-md bg-void-800/80 hover:bg-void-700 text-[11.5px] text-void-200">Rasterize</button>
        </div>
        <Slider label="Feather" value={vm.feather ?? 0} min={0} max={100} unit="px" onChange={v => s.updateLayer(layer.id, { vmask: { ...vm, feather: v } })} onCommit={() => s.commit('Vector mask feather')} />
        <button onClick={() => ops.deleteVectorMask()} className="text-[11.5px] text-void-400 hover:text-white">Delete vector mask</button>
      </div>
    </Section>
  )
}
