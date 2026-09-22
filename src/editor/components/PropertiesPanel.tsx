'use client'

import { useEffect, useRef } from 'react'
import { AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, AlignLeft, AlignRight, AlignStartHorizontal, AlignStartVertical, Eclipse, FolderPlus, FlipHorizontal2, FlipVertical2, ImageOff, Italic, RotateCcw } from 'lucide-react'
import { effectParams } from '@/components/ParamControls'
import { defaultParams, type EffectParams } from '@/store/useStore'
import { subjectMask } from '../ai'
import { ADJUSTMENT_DEFAULTS, layerBounds } from '../engine'
import { FONTS, ensureFont } from '../io'
import { useEditor } from '../store'
import { BLEND_MODES, type AdjustmentLayer, type Layer, type ShapeLayer, type TextLayer } from '../types'
import { CURVE_PRESETS, CurvesEditor } from './CurvesEditor'
import { Button, ColorField, IconButton, Section, Select, Slider, focusRing } from './ui'

const ADJ_FIELDS: Record<string, { key: string; label: string; min: number; max: number }[]> = {
  brightnessContrast: [{ key: 'brightness', label: 'Brightness', min: -100, max: 100 }, { key: 'contrast', label: 'Contrast', min: -100, max: 100 }],
  hueSaturation: [{ key: 'hue', label: 'Hue', min: -180, max: 180 }, { key: 'saturation', label: 'Saturation', min: -100, max: 100 }, { key: 'lightness', label: 'Lightness', min: -100, max: 100 }],
  levels: [{ key: 'black', label: 'Darkest point', min: 0, max: 254 }, { key: 'white', label: 'Brightest point', min: 1, max: 255 }, { key: 'gamma', label: 'Midtones', min: 10, max: 300 }],
  temperature: [{ key: 'temperature', label: 'Warmth', min: -100, max: 100 }, { key: 'tint', label: 'Tint', min: -100, max: 100 }],
  blackWhite: [{ key: 'amount', label: 'Amount', min: 0, max: 100 }],
  blur: [{ key: 'radius', label: 'Amount', min: 1, max: 80 }],
  invert: [],
}

export async function removeBackground(layerId: string, mode: 'person' | 'any' = 'person') {
  const s = useEditor.getState()
  const l = s.layers.find(x => x.id === layerId)
  if (!l || l.type !== 'raster') return
  try {
    const mask = await subjectMask(l.canvas, m => useEditor.getState().setBusy(m), mode)
    useEditor.getState().updateLayer(l.id, { mask, maskEnabled: true }, 'Remove background')
    useEditor.getState().notify('Background hidden with a mask. Paint on the mask to fine-tune the edges.')
  } catch (e) {
    console.error(e)
    useEditor.getState().notify('Could not load the background remover. Check your connection and try again.')
  } finally { useEditor.getState().setBusy(null) }
}

function NumField({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1.5 bg-void-900 border border-void-800 rounded-lg px-2 h-8">
      <span className="text-[11px] text-void-500 w-3">{label}</span>
      <input type="number" defaultValue={Math.round(value)} key={Math.round(value)}
        onBlur={e => { const v = Number(e.target.value); if (Number.isFinite(v)) onCommit(v) }}
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
    <Section title={count > 1 ? `${count} layers selected` : 'Position'}>
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

  return (
    <div>
      <Section title={layer.type === 'adjustment' ? layer.name : layer.type === 'text' ? 'Text' : layer.type === 'shape' ? 'Shape' : 'Image layer'}>
        <div className="space-y-3">
          <Slider label="Opacity" value={Math.round(layer.opacity * 100)} min={0} max={100} unit="%" onChange={v => up({ opacity: v / 100 })} onCommit={commit('Opacity')} />
          <Select label="Blend" value={layer.blend} options={BLEND_MODES} onChange={v => s.updateLayer(layer.id, { blend: v }, 'Blend mode')} />
        </div>
      </Section>

      {layer.type !== 'adjustment' && arrange}

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

function TextProps({ layer }: { layer: TextLayer }) {
  const s = useEditor.getState()
  const focus = useEditor(st => st.focusText)
  const ta = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    // Wait for the click that created the layer to finish, or the browser moves focus back to the page.
    if (!focus || Date.now() - focus > 1500) return
    const t = setTimeout(() => { ta.current?.focus(); ta.current?.select() }, 80)
    return () => clearTimeout(t)
  }, [focus, layer.id])
  const up = (patch: Partial<TextLayer>) => s.updateLayer(layer.id, patch)
  const setFont = async (fontFamily: string, fontWeight = layer.fontWeight, italic = layer.italic) => {
    await ensureFont(fontFamily, fontWeight, italic)
    s.updateLayer(layer.id, { fontFamily, fontWeight, italic }, 'Font')
  }
  const tog = (on: boolean) => `h-8 w-9 inline-flex items-center justify-center rounded-md ${focusRing} ${on ? 'bg-void-700 text-white' : 'bg-void-900 text-void-400 hover:text-white'}`
  return (
    <Section title="Type">
      <div className="space-y-3">
        <textarea ref={ta} aria-label="Text content" value={layer.text} rows={3} onChange={e => up({ text: e.target.value })} onBlur={() => s.commit('Edit text')}
          className={`w-full px-2.5 py-2 rounded-lg bg-void-900 border border-void-800 text-[13px] leading-snug resize-y ${focusRing}`} />
        <Select label="Font" value={layer.fontFamily} options={FONTS.map(f => ({ id: f, label: f }))} onChange={f => setFont(f)} />
        <div className="flex items-center gap-1.5">
          <button aria-label="Bold" aria-pressed={layer.fontWeight >= 700} className={tog(layer.fontWeight >= 700) + ' font-bold text-[13px]'} onClick={() => setFont(layer.fontFamily, layer.fontWeight >= 700 ? 400 : 700)}>B</button>
          <button aria-label="Italic" aria-pressed={layer.italic} className={tog(layer.italic)} onClick={() => setFont(layer.fontFamily, layer.fontWeight, !layer.italic)}><Italic size={15} /></button>
          <span className="w-2" />
          {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
            <button key={a} aria-label={`Align ${a}`} aria-pressed={layer.align === a} className={tog(layer.align === a)} onClick={() => s.updateLayer(layer.id, { align: a }, 'Align')}><Icon size={15} /></button>
          ))}
        </div>
        <Slider label="Size" value={layer.fontSize} min={8} max={600} unit="px" onChange={v => up({ fontSize: v })} onCommit={() => s.commit('Text size')} />
        <Slider label="Line spacing" value={layer.lineHeight} min={0.7} max={2.5} step={0.05} onChange={v => up({ lineHeight: v })} onCommit={() => s.commit('Line spacing')} />
        <Slider label="Letter spacing" value={layer.letterSpacing} min={-10} max={60} step={0.5} unit="px" onChange={v => up({ letterSpacing: v })} onCommit={() => s.commit('Letter spacing')} />
        <ColorField label="Colour" value={layer.color} onChange={v => v && up({ color: v })} onCommit={() => s.commit('Text colour')} />
        <ColorField label="Outline" allowNone value={layer.outline?.color ?? null} onChange={v => up({ outline: v ? { color: v, width: layer.outline?.width ?? Math.max(2, Math.round(layer.fontSize / 24)) } : null })} onCommit={() => s.commit('Text outline')} />
        {layer.outline && <Slider label="Outline width" value={layer.outline.width} min={1} max={Math.max(12, Math.round(layer.fontSize / 4))} unit="px" onChange={v => up({ outline: { ...layer.outline!, width: v } })} onCommit={() => s.commit('Text outline')} />}
        <ColorField label="Shadow" allowNone value={layer.shadow?.color ?? null} onChange={v => up({ shadow: v ? { color: v, blur: layer.shadow?.blur ?? Math.round(layer.fontSize / 8), x: layer.shadow?.x ?? 0, y: layer.shadow?.y ?? Math.round(layer.fontSize / 16) } : null })} onCommit={() => s.commit('Text shadow')} />
        {layer.shadow && <>
          <Slider label="Shadow blur" value={layer.shadow.blur} min={0} max={120} unit="px" onChange={v => up({ shadow: { ...layer.shadow!, blur: v } })} onCommit={() => s.commit('Text shadow')} />
          <Slider label="Shadow across" value={layer.shadow.x} min={-100} max={100} unit="px" onChange={v => up({ shadow: { ...layer.shadow!, x: v } })} onCommit={() => s.commit('Text shadow')} />
          <Slider label="Shadow down" value={layer.shadow.y} min={-100} max={100} unit="px" onChange={v => up({ shadow: { ...layer.shadow!, y: v } })} onCommit={() => s.commit('Text shadow')} />
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
  if (layer.kind === 'curves') {
    const pts = layer.points ?? [[0, 0], [255, 255]]
    const setPts = (points: [number, number][]) => s.updateLayer(layer.id, { points } as Partial<AdjustmentLayer>)
    return (
      <Section title="Curve" action={<button aria-label="Reset" title="Reset" onClick={() => s.updateLayer(layer.id, { points: [[0, 0], [255, 255]] } as Partial<AdjustmentLayer>, 'Reset curve')} className={`text-void-400 hover:text-white rounded ${focusRing}`}><RotateCcw size={14} /></button>}>
        <CurvesEditor points={pts} onChange={setPts} onCommit={() => s.commit('Curves')} />
        <div className="flex flex-wrap gap-1.5 mt-3">
          {CURVE_PRESETS.map(p => <button key={p.label} onClick={() => s.updateLayer(layer.id, { points: p.points } as Partial<AdjustmentLayer>, 'Curves')} className={`h-7 px-2.5 rounded-md text-[12px] bg-void-900 border border-void-800 text-void-300 hover:text-white ${focusRing}`}>{p.label}</button>)}
        </div>
        <p className="mt-2.5 text-[12px] text-void-500 leading-relaxed">Click the line to add a point, drag to bend it, double-click a point to remove it.</p>
      </Section>
    )
  }
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
