'use client'

import * as ops from '../ops'
import { ROLE_LABEL } from '../adapt'
const ROLE_OPTIONS = Object.entries(ROLE_LABEL).map(([id, label]) => ({ id, label }))
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, AlignLeft, AlignRight, AlignStartHorizontal, AlignStartVertical, Eclipse, FolderPlus, FlipHorizontal2, FlipVertical2, ImageOff, Italic, RotateCcw } from 'lucide-react'
import { effectParams } from '@/components/ParamControls'
import { defaultParams, type EffectParams } from '@/store/useStore'
import { ADJUSTMENT_DEFAULTS, HUE_BANDS, layerBounds, layerSize } from '../engine'
import { ColorButton, hexToRgb } from './ColorPicker'
import type { HueBand } from '../types'
const layerSizeOf = (l: TextLayer) => layerSize(l).w
import { FONTS, ensureFont } from '../io'
import { useEditor } from '../store'
import { BLEND_MODES, type AdjustmentLayer, type Layer, type ShapeLayer, type TextLayer } from '../types'
import { CURVE_PRESETS, CurvesEditor } from './CurvesEditor'
import { defaultStyle, emptyStyles } from '../styles'
import type { ShadowStyle } from '../types'
import { Button, ColorField, IconButton, Section, Select, Slider, focusRing } from './ui'

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

function NumField({ label, value, onCommit, step = 1 }: { label: string; value: number; onCommit: (v: number) => void; step?: number }) {
  const scrub = useRef<{ x: number; v: number } | null>(null)
  const [live, setLive] = useState<number | null>(null)
  const shown = live ?? Math.round(value)
  return (
    <label className="flex items-center gap-1.5 bg-surface-sunken border border-white/[0.06] rounded-lg px-2 h-8 focus-within:border-accent/60">
      {/* drag the label sideways to scrub the value */}
      <span
        onPointerDown={e => { (e.target as HTMLElement).setPointerCapture(e.pointerId); scrub.current = { x: e.clientX, v: value }; setLive(Math.round(value)) }}
        onPointerMove={e => { if (!scrub.current) return; const nv = scrub.current.v + (e.clientX - scrub.current.x) * step * (e.shiftKey ? 10 : 1); setLive(Math.round(nv)) }}
        onPointerUp={() => { if (scrub.current && live != null) onCommit(live); scrub.current = null; setLive(null) }}
        className="text-[11px] text-void-500 w-3 cursor-ew-resize select-none touch-none">{label}</span>
      <input type="number" value={shown} key={scrub.current ? 'scrub' : Math.round(value)}
        onChange={e => setLive(Number(e.target.value))}
        onBlur={e => { const v = Number(e.target.value); if (Number.isFinite(v)) onCommit(v); setLive(null) }}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        className="min-w-0 flex-1 bg-transparent text-[12px] tabular-nums text-void-100 outline-none" />
    </label>
  )
}

export function PropertiesPanel({ onOpenFilters }: { onOpenFilters: () => void }) {
  const layer = useEditor(s => s.layers.find(l => l.id === s.activeId) ?? null)
  const doc = useEditor(s => s.doc)
  const editingMask = useEditor(s => s.editingMask)
  const swatches = useEditor(s => s.swatches)
  const count = useEditor(s => s.selectedIds.length)
  const group = useEditor(s => { const l = s.layers.find(x => x.id === s.activeId); return l?.groupId ? s.groups.find(g => g.id === l.groupId) ?? null : null })
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
              <button key={c} aria-label={`Use ${c}`} title={c} onClick={() => s.setFg(c)} className={`w-7 h-7 rounded-md border border-white/10 ${focusRing}`} style={{ background: c }} />
            ))}
          </div>
          <p className="mt-2.5 text-[12px] text-void-500">Select a layer to edit it, or use Add to bring something in.</p>
        </Section>
      </div>
    )
  }

  const arrange = (
    <Section title={count > 1 ? `${count} layers selected` : 'Position'} collapsible={count === 1} defaultOpen={count > 1}>
      <div className="flex items-center justify-between">
        {([['left', AlignStartVertical, 'Align left'], ['hcenter', AlignCenterVertical, 'Centre horizontally'], ['right', AlignEndVertical, 'Align right'], ['top', AlignStartHorizontal, 'Align top'], ['vcenter', AlignCenterHorizontal, 'Centre vertically'], ['bottom', AlignEndHorizontal, 'Align bottom']] as const).map(([how, Icon, label]) => (
          <IconButton key={how} label={count > 1 ? label : `${label} on the page`} onClick={() => s.align(how)}><Icon size={16} /></IconButton>
        ))}
      </div>
      {count === 1 && layer && layer.type !== 'adjustment' && (() => {
        const b = layerBounds(layer, doc!)
        return (
          <div className="grid grid-cols-2 gap-1.5 mt-2.5">
            <NumField label="X" value={b.x} onCommit={v => { s.setLayerBox(layer.id, { x: v }); s.commit('Move') }} />
            <NumField label="Y" value={b.y} onCommit={v => { s.setLayerBox(layer.id, { y: v }); s.commit('Move') }} />
            <NumField label="W" value={b.w} onCommit={v => { s.setLayerBox(layer.id, { w: v }); s.commit('Resize') }} />
            <NumField label="H" value={b.h} onCommit={v => { s.setLayerBox(layer.id, { h: v }); s.commit('Resize') }} />
          </div>
        )
      })()}
      {count > 2 && (
        <div className="flex items-center gap-1.5 mt-2.5">
          <span className="text-[12px] text-void-500 mr-1">Distribute</span>
          <IconButton label="Distribute horizontally" onClick={() => s.distribute('h')}><AlignHorizontalDistributeCenter size={16} /></IconButton>
          <IconButton label="Distribute vertically" onClick={() => s.distribute('v')}><AlignVerticalDistributeCenter size={16} /></IconButton>
        </div>
      )}
      {count > 1 && <Button onClick={() => s.groupSelected()} className="w-full mt-2.5"><FolderPlus size={15} />Group these layers</Button>}
      {count > 1 && <p className="mt-2 text-[12px] text-void-500">Drag any of them to move them together.</p>}
    </Section>
  )

  if (count > 1) return <div>{arrange}</div>
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
      {(layer.type === 'raster' || layer.type === 'shape') && <ShadowProps layer={layer} />}
      {layer.type === 'text' && layer.onPath && <PathTextProps layer={layer} />}
      {layer.vmask && <VectorMaskProps layer={layer} />}

      {/* Layer-level settings open only when something is off its default, so a fresh layer shows just what matters. */}
      <Section title="Layer" collapsible defaultOpen={layer.opacity < 1 || layer.blend !== 'source-over' || !!layer.role}>
        <div className="space-y-3">
          <Slider label="Opacity" value={Math.round(layer.opacity * 100)} min={0} max={100} unit="%" onChange={v => up({ opacity: v / 100 })} onCommit={commit('Opacity')} />
          <Select label="Blend" value={layer.blend} options={BLEND_MODES} onChange={v => s.updateLayer(layer.id, { blend: v }, 'Blend mode')} />
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

/** Drop shadow for images and shapes, straight in the panel. It is the same drop shadow the Layer style dialog edits. */
function ShadowProps({ layer }: { layer: Layer }) {
  const s = useEditor.getState()
  const sh = layer.styles?.dropShadow?.on ? layer.styles.dropShadow : null
  const put = (next: ShadowStyle | null) => s.updateLayer(layer.id, { styles: { ...(layer.styles ?? emptyStyles()), dropShadow: next ?? (layer.styles?.dropShadow ? { ...layer.styles.dropShadow, on: false } : undefined) } })
  const set = (patch: Partial<ShadowStyle>) => sh && put({ ...sh, ...patch })
  const done = () => s.commit('Shadow')
  return (
    <Section title="Shadow" collapsible defaultOpen={!!sh}>
      <div className="space-y-3">
        <ColorField label="Colour" allowNone value={sh?.color ?? null} onChange={v => put(v ? { ...(layer.styles?.dropShadow ?? defaultStyle('dropShadow') as ShadowStyle), on: true, color: v } : null)} onCommit={done} />
        {sh && <>
          <Slider label="Opacity" value={Math.round(sh.opacity * 100)} min={0} max={100} unit="%" onChange={v => set({ opacity: v / 100 })} onCommit={done} />
          <Slider label="Blur" value={sh.size} min={0} max={250} unit="px" onChange={v => set({ size: v })} onCommit={done} />
          <Slider label="Distance" value={sh.distance} min={0} max={300} unit="px" onChange={v => set({ distance: v })} onCommit={done} />
          <Slider label="Angle" value={sh.angle} min={-180} max={180} unit="°" onChange={v => set({ angle: v })} onCommit={done} />
          <Slider label="Spread" value={sh.spread} min={0} max={100} unit="%" onChange={v => set({ spread: v })} onCommit={done} />
        </>}
      </div>
    </Section>
  )
}

function TextProps({ layer }: { layer: TextLayer }) {
  const s = useEditor.getState()
  // Typing happens on the canvas. This field mirrors the text for people who prefer a form, and never takes focus on its own.
  const ta = useRef<HTMLTextAreaElement>(null)
  const up = (patch: Partial<TextLayer>) => s.updateLayer(layer.id, patch)
  // Spacing, paragraph box, outline and shadow are one click away unless already in use.
  const [moreType, setMoreType] = useState(!!layer.boxWidth || !!layer.outline || !!layer.shadow || layer.letterSpacing !== 0 || Math.abs(layer.lineHeight - 1.15) > 0.01)
  const setFont = async (fontFamily: string, fontWeight = layer.fontWeight, italic = layer.italic) => {
    await ensureFont(fontFamily, fontWeight, italic)
    s.updateLayer(layer.id, { fontFamily, fontWeight, italic }, 'Font')
  }
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

function AdjustmentProps({ layer }: { layer: AdjustmentLayer }) {
  const s = useEditor.getState()
  if (layer.kind === 'voidEffect' && layer.effect) {
    const cfg = effectParams[layer.effect] ?? []
    const p = layer.effectParams ?? defaultParams
    const set = (k: keyof EffectParams, v: number | string) => s.updateLayer(layer.id, { effectParams: { ...p, [k]: v } } as Partial<AdjustmentLayer>)
    return (
      <Section title="Filter settings" action={<button aria-label="Reset" title="Reset" onClick={() => s.updateLayer(layer.id, { effectParams: { ...defaultParams } } as Partial<AdjustmentLayer>, 'Reset filter')} className={`text-void-400 hover:text-white rounded ${focusRing}`}><RotateCcw size={14} /></button>}>
        <div className="space-y-3">
          {cfg.filter(c => c.key !== 'opacity').map(c => c.type === 'color'
            ? <ColorField key={c.key} label={c.label} value={p[c.key] as string} onChange={v => v && set(c.key, v)} onCommit={() => s.commit('Filter colour')} />
            : <Slider key={c.key} label={c.label} value={p[c.key] as number} min={c.min ?? 0} max={c.max ?? 100} unit={c.unit} onChange={v => set(c.key, v)} onCommit={() => s.commit('Filter setting')} />)}
          {cfg.length <= 1 && <p className="text-[12px] text-void-500">This filter has no settings. Use Opacity above to soften it.</p>}
          <p className="text-[12px] text-void-500 leading-relaxed">Filters affect every layer beneath them and stay editable. Add a mask to limit where they apply.</p>
        </div>
      </Section>
    )
  }
  if (layer.kind === 'curves') return <CurvesProps layer={layer} />
  if (false as boolean) {
    const pts = layer.points ?? [[0, 0], [255, 255]]
    const setPts = (points: [number, number][]) => s.updateLayer(layer.id, { points } as Partial<AdjustmentLayer>)
    return (
      <Section title="Curve" action={<button aria-label="Reset" title="Reset" onClick={() => s.updateLayer(layer.id, { points: [[0, 0], [255, 255]] } as Partial<AdjustmentLayer>, 'Reset curve')} className={`text-void-400 hover:text-white rounded ${focusRing}`}><RotateCcw size={14} /></button>}>
        <CurvesEditor points={pts} onChange={setPts} onCommit={() => s.commit('Curves')} />
        <div className="flex flex-wrap gap-1.5 mt-3">
          {CURVE_PRESETS.map(p => <button key={p.label} onClick={() => s.updateLayer(layer.id, { points: p.points } as Partial<AdjustmentLayer>, 'Curves')} className={`h-7 px-2.5 rounded-md text-[12px] bg-surface-sunken border border-white/[0.06] text-void-300 hover:text-white ${focusRing}`}>{p.label}</button>)}
        </div>
        <p className="mt-2.5 text-[12px] text-void-500 leading-relaxed">Click the line to add a point, drag to bend it, double-click a point to remove it.</p>
      </Section>
    )
  }
  const special = <SpecialAdjustment layer={layer} />
  if (['colorBalance', 'channelMixer', 'photoFilter', 'gradientMap', 'levels', 'hueSaturation'].includes(layer.kind)) return special
  const fields = ADJ_FIELDS[layer.kind] ?? []
  return (
    <Section title="Settings" action={<button aria-label="Reset" title="Reset" onClick={() => s.updateLayer(layer.id, { values: { ...ADJUSTMENT_DEFAULTS[layer.kind] } } as Partial<AdjustmentLayer>, 'Reset adjustment')} className={`text-void-400 hover:text-white rounded ${focusRing}`}><RotateCcw size={14} /></button>}>
      <div className="space-y-3">
        {fields.map(f => (
          <Slider key={f.key} label={f.label} value={layer.values[f.key] ?? 0} min={f.min} max={f.max}
            onChange={v => s.updateLayer(layer.id, { values: { ...layer.values, [f.key]: v } } as Partial<AdjustmentLayer>)} onCommit={() => s.commit(layer.name)} />
        ))}
        <p className="text-[12px] text-void-500 leading-relaxed">Affects every layer beneath it. Your original pixels are never changed.</p>
      </div>
    </Section>
  )
}

// ─── Channel-aware curves ──────────────────────────────────────────

function CurvesProps({ layer }: { layer: AdjustmentLayer }) {
  const s = useEditor.getState()
  const [ch, setCh] = useState<'rgb' | 'r' | 'g' | 'b'>('rgb')
  const pts = ch === 'rgb' ? (layer.points ?? [[0, 0], [255, 255]]) : (layer.channelPoints?.[ch] ?? [[0, 0], [255, 255]])
  const setPts = (points: [number, number][]) => ch === 'rgb' ? s.updateLayer(layer.id, { points } as Partial<AdjustmentLayer>) : s.updateLayer(layer.id, { channelPoints: { ...(layer.channelPoints ?? {}), [ch]: points } } as Partial<AdjustmentLayer>)
  return (
    <Section title="Curve" action={<button aria-label="Reset" title="Reset" onClick={() => s.updateLayer(layer.id, { points: [[0, 0], [255, 255]], channelPoints: {} } as Partial<AdjustmentLayer>, 'Reset curve')} className={`text-void-400 hover:text-white rounded ${focusRing}`}><RotateCcw size={14} /></button>}>
      <ChannelTabs value={ch} onChange={setCh} />
      <CurvesEditor points={pts} onChange={setPts} onCommit={() => s.commit('Curves')} />
      {ch === 'rgb' && <div className="flex flex-wrap gap-1.5 mt-3">
        {CURVE_PRESETS.map(p => <button key={p.label} onClick={() => s.updateLayer(layer.id, { points: p.points } as Partial<AdjustmentLayer>, 'Curves')} className={`h-7 px-2.5 rounded-md text-[12px] bg-surface-sunken border border-white/[0.06] text-void-300 hover:text-white ${focusRing}`}>{p.label}</button>)}
      </div>}
      <p className="mt-2.5 text-[12px] text-void-500 leading-relaxed">Click the line to add a point, drag to bend it, double-click a point to remove it. Red, Green and Blue fix colour casts.</p>
    </Section>
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

function SpecialAdjustment({ layer }: { layer: AdjustmentLayer }) {
  const s = useEditor.getState()
  const v = layer.values
  const setV = (patch: Record<string, number>) => s.updateLayer(layer.id, { values: { ...v, ...patch } } as Partial<AdjustmentLayer>)
  const commit = () => s.commit(layer.name)
  const reset = <button aria-label="Reset" title="Reset" onClick={() => s.updateLayer(layer.id, { values: { ...ADJUSTMENT_DEFAULTS[layer.kind] }, channelLevels: undefined, bands: undefined } as Partial<AdjustmentLayer>, 'Reset adjustment')} className={`text-void-400 hover:text-white rounded ${focusRing}`}><RotateCcw size={14} /></button>
  const [range, setRange] = useState<'s' | 'm' | 'h'>('m')
  const [out, setOut] = useState<'r' | 'g' | 'b'>('r')
  const [ch, setCh] = useState<'rgb' | 'r' | 'g' | 'b'>('rgb')
  const [band, setBand] = useState<'master' | HueBand>('master')

  if (layer.kind === 'levels') {
    const cur = ch === 'rgb' ? [v.black, v.white, v.gamma] : (layer.channelLevels?.[ch] ?? [0, 255, 100])
    const setL = (i: number, val: number) => {
      if (ch === 'rgb') setV({ [['black', 'white', 'gamma'][i]]: val })
      else { const n = [...cur] as [number, number, number]; n[i] = val; s.updateLayer(layer.id, { channelLevels: { ...(layer.channelLevels ?? {}), [ch]: n } } as Partial<AdjustmentLayer>) }
    }
    const setAll = (fn: (c: number, i: number) => [number, number, number]) => {
      const cl = { ...(layer.channelLevels ?? {}) } as any
      ;(['r', 'g', 'b'] as const).forEach((c, i) => { cl[c] = fn(i, i) })
      s.updateLayer(layer.id, { channelLevels: cl } as Partial<AdjustmentLayer>, 'Levels picker')
    }
    const lv = (c: 'r' | 'g' | 'b') => layer.channelLevels?.[c] ?? [0, 255, 100]
    return (
      <Section title="Levels" action={reset}>
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
      </Section>
    )
  }

  if (layer.kind === 'hueSaturation') {
    const cur = band === 'master' ? { hue: v.hue, saturation: v.saturation, lightness: v.lightness } : (layer.bands?.[band] ?? { hue: 0, saturation: 0, lightness: 0 })
    const setH = (patch: Partial<typeof cur>) => band === 'master' ? setV(patch as any) : s.updateLayer(layer.id, { bands: { ...(layer.bands ?? {}), [band]: { ...cur, ...patch } } } as Partial<AdjustmentLayer>)
    return (
      <Section title="Hue and saturation" action={reset}>
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
      </Section>
    )
  }

  if (layer.kind === 'colorBalance') {
    const p = range === 's' ? 's' : range === 'm' ? 'm' : 'h'
    return (
      <Section title="Colour balance" action={reset}>
        <div className="flex gap-1 mb-3">{(['s', 'm', 'h'] as const).map(r => <button key={r} onClick={() => setRange(r)} className={`h-7 flex-1 rounded-md text-[12px] ${range === r ? 'bg-void-700 text-white' : 'bg-surface-sunken text-void-400'}`}>{{ s: 'Shadows', m: 'Midtones', h: 'Highlights' }[r]}</button>)}</div>
        <div className="space-y-3">
          <Slider label="Cyan to red" value={v[p + 'CR']} min={-100} max={100} onChange={x => setV({ [p + 'CR']: x })} onCommit={commit} />
          <Slider label="Magenta to green" value={v[p + 'MG']} min={-100} max={100} onChange={x => setV({ [p + 'MG']: x })} onCommit={commit} />
          <Slider label="Yellow to blue" value={v[p + 'YB']} min={-100} max={100} onChange={x => setV({ [p + 'YB']: x })} onCommit={commit} />
          <label className="flex items-center gap-2 text-[12.5px] text-void-300"><input type="checkbox" checked={!!v.preserve} onChange={e => { setV({ preserve: e.target.checked ? 1 : 0 }); commit() }} />Keep brightness</label>
        </div>
      </Section>
    )
  }

  if (layer.kind === 'channelMixer') {
    const o = out
    return (
      <Section title="Channel mixer" action={reset}>
        <div className="flex gap-1 mb-3">{(['r', 'g', 'b'] as const).map(c => <button key={c} onClick={() => setOut(c)} disabled={!!v.mono && c !== 'r'} className={`h-7 flex-1 rounded-md text-[12px] disabled:opacity-30 ${out === c ? 'bg-void-700 text-white' : 'bg-surface-sunken text-void-400'}`}>{v.mono ? 'Grey' : { r: 'Red out', g: 'Green out', b: 'Blue out' }[c]}</button>)}</div>
        <div className="space-y-3">
          {(['r', 'g', 'b'] as const).map(c => <Slider key={c} label={{ r: 'Red', g: 'Green', b: 'Blue' }[c]} value={v[o + c]} min={-200} max={200} unit="%" onChange={x => setV({ [o + c]: x })} onCommit={commit} />)}
          <label className="flex items-center gap-2 text-[12.5px] text-void-300"><input type="checkbox" checked={!!v.mono} onChange={e => { setV({ mono: e.target.checked ? 1 : 0, ...(e.target.checked ? { rr: 40, rg: 40, rb: 20 } : {}) }); setOut('r'); commit() }} />Black and white mix</label>
        </div>
      </Section>
    )
  }

  if (layer.kind === 'photoFilter') {
    const color = layer.colors?.[0] ?? '#ec8a00'
    return (
      <Section title="Photo filter" action={reset}>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><span className="text-[12px] text-void-400">Filter colour</span><ColorButton label="Filter colour" value={color} onChange={c => s.updateLayer(layer.id, { colors: [c] } as Partial<AdjustmentLayer>)} onCommit={commit} /></div>
          <div className="flex flex-wrap gap-1.5">{[['Warm', '#ec8a00'], ['Cool', '#006dff'], ['Sepia', '#ac7a33'], ['Green', '#19c919'], ['Deep red', '#ff0000']].map(([n, c]) => <button key={n} onClick={() => s.updateLayer(layer.id, { colors: [c] } as Partial<AdjustmentLayer>, 'Photo filter')} className="h-7 px-2 rounded-md text-[12px] bg-surface-sunken text-void-300 inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{n}</button>)}</div>
          <Slider label="Density" value={v.density} min={1} max={100} unit="%" onChange={x => setV({ density: x })} onCommit={commit} />
          <label className="flex items-center gap-2 text-[12.5px] text-void-300"><input type="checkbox" checked={!!v.preserve} onChange={e => { setV({ preserve: e.target.checked ? 1 : 0 }); commit() }} />Keep brightness</label>
        </div>
      </Section>
    )
  }

  // gradient map
  const cols = layer.colors?.length ? layer.colors : ['#000000', '#ffffff']
  const setCols = (c: string[], label?: string) => s.updateLayer(layer.id, { colors: c } as Partial<AdjustmentLayer>, label)
  const PRESETS: [string, string[]][] = [['Black to white', ['#000000', '#ffffff']], ['Duotone violet', ['#1b0f3b', '#8b7cff', '#f3efff']], ['Sunset', ['#1a0633', '#c2185b', '#ffb74d']], ['Teal and orange', ['#06222b', '#1d8a8a', '#f6a04d']], ['Newsprint', ['#1c1c1c', '#e9e4d8']]]
  return (
    <Section title="Gradient map" action={reset}>
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
    </Section>
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
