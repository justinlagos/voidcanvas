'use client'

import { useMemo, useState } from 'react'
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowLeft, Blend, Copy, Crop, Eclipse, Eye, FlipHorizontal, FlipVertical, FolderOpen, FolderPlus, ImageOff, Layers as LayersIcon, Lock, MoreHorizontal, Move, Paintbrush, PenLine, RefreshCw, Scaling, Settings2, Square, SquareStack, Trash2, Type, Ungroup, Unlock, type LucideIcon } from 'lucide-react'
import { nextRev, selectionUnits, useEditor } from '../store'
import type { Layer, ShapeLayer, TextLayer } from '../types'
import { buildActions, replaceImagePick } from '../actions'
import { FONTS, ensureFont } from '../io'
import * as ops from '../ops'
import { removeBackground } from './PropertiesPanel'
import { Slider } from './ui'
import { ColourChip, Label, Row, Sheet, chip, primary } from './phone-ui'

// On a phone, selecting something turns the bottom bar into that thing's own tools: text gets font, size,
// colour and alignment; a photo gets crop, replace, cut out and mask; a shape gets fill, stroke and corners;
// a group gets ungroup; everything gets effects, opacity, arrange, duplicate and delete. Each tool opens a short
// sheet with just that control, so the canvas stays clear for moving things. Back returns to the main bar.

export type CtxTool = 'font' | 'size' | 'colour' | 'align' | 'spacing' | 'opacity' | 'arrange' | 'effects' | 'fill' | 'stroke' | 'corners' | 'mask' | 'more'
interface Item { id: string; label: string; icon: LucideIcon; tool?: CtxTool; run?: () => void; strong?: boolean }

const TOOL_TITLE: Record<CtxTool, string> = { font: 'Font', size: 'Size', colour: 'Colour', align: 'Align', spacing: 'Spacing', opacity: 'Opacity', arrange: 'Arrange', effects: 'Effects', fill: 'Fill', stroke: 'Stroke', corners: 'Corners', mask: 'Mask', more: 'More' }
export const toolTitle = (t: CtxTool) => TOOL_TITLE[t]

/** What is selected, as the bar sees it: one layer, a whole group, or several things. */
function useSelectionKind() {
  const sel = useEditor(s => s.selectedIds)
  const layers = useEditor(s => s.layers)
  const groups = useEditor(s => s.groups)
  const isolated = useEditor(s => s.isolatedGroupId)
  const activeId = useEditor(s => s.activeId)
  return useMemo(() => {
    const units = selectionUnits(layers, groups, sel, isolated)
    const layer = layers.find(l => l.id === activeId) ?? null
    if (units.length === 1 && units[0].group) return { kind: 'group' as const, layer, groupId: units[0].group, count: sel.length }
    if (sel.length > 1) return { kind: 'several' as const, layer, groupId: null, count: sel.length }
    return { kind: 'layer' as const, layer, groupId: null, count: 1 }
  }, [sel, layers, groups, isolated, activeId])
}

export function PhoneContextBar({ open, onTool, onSettings, onSeveral }: { open: CtxTool | null; onTool: (t: CtxTool | null) => void; onSettings: () => void; onSeveral: () => void }) {
  const k = useSelectionKind()
  const actions = useMemo(() => buildActions(), [])
  const run = (id: string) => { const a = actions[id]; if (a && (!a.enabled || a.enabled())) a.run() }
  const s = useEditor.getState()
  const l = k.layer
  const dup: Item = { id: 'duplicate', label: 'Duplicate', icon: Copy, run: () => run('layer.duplicate') }
  const del: Item = { id: 'delete', label: 'Delete', icon: Trash2, run: () => s.removeSelected() }
  const settings: Item = { id: 'settings', label: 'Settings', icon: Settings2, run: onSettings }
  const common: Item[] = [{ id: 'effects', label: 'Effects', icon: Eclipse, tool: 'effects' }, { id: 'opacity', label: 'Opacity', icon: Blend, tool: 'opacity' }, { id: 'arrange', label: 'Arrange', icon: LayersIcon, tool: 'arrange' }]
  let items: Item[] = []
  if (k.kind === 'several') items = [{ id: 'group', label: 'Group', icon: FolderPlus, run: () => s.groupSelected(), strong: true }, { id: 'arrange', label: 'Line up', icon: LayersIcon, tool: 'arrange' }, { id: 'opacity', label: 'Opacity', icon: Blend, tool: 'opacity' }, { id: 'effects', label: 'Effects', icon: Eclipse, tool: 'effects' }, dup, del, { id: 'more', label: 'Add more', icon: SquareStack, run: onSeveral }, settings]
  else if (k.kind === 'group') items = [{ id: 'open', label: 'Open group', icon: FolderOpen, run: () => s.setIsolated(k.groupId!), strong: true }, ...common, { id: 'ungroup', label: 'Ungroup', icon: Ungroup, run: () => s.ungroup(k.groupId!) }, dup, { id: 'more', label: 'More', icon: MoreHorizontal, tool: 'more' }, del, settings]
  else if (l?.type === 'text') items = [{ id: 'edit', label: 'Edit', icon: PenLine, run: () => useEditor.setState({ editingTextId: l.id }), strong: true }, { id: 'font', label: 'Font', icon: Type, tool: 'font' }, { id: 'size', label: 'Size', icon: Scaling, tool: 'size' }, { id: 'colour', label: 'Colour', icon: Paintbrush, tool: 'colour' }, { id: 'align', label: 'Align', icon: AlignCenter, tool: 'align' }, { id: 'spacing', label: 'Spacing', icon: AlignJustify, tool: 'spacing' }, ...common, dup, { id: 'more', label: 'More', icon: MoreHorizontal, tool: 'more' }, del, settings]
  else if (l?.type === 'raster') items = [{ id: 'crop', label: 'Crop', icon: Crop, run: () => s.setTool('crop'), strong: true }, { id: 'replace', label: 'Replace', icon: RefreshCw, run: replaceImagePick }, { id: 'cutout', label: 'Cut out', icon: ImageOff, run: () => removeBackground(l.id) }, ...common, { id: 'mask', label: 'Mask', icon: Square, tool: 'mask' }, dup, { id: 'more', label: 'More', icon: MoreHorizontal, tool: 'more' }, del, settings]
  else if (l?.type === 'shape') items = [{ id: 'fill', label: 'Fill', icon: Paintbrush, tool: 'fill', strong: true }, { id: 'stroke', label: 'Stroke', icon: Square, tool: 'stroke' }, ...(l.shape === 'rect' ? [{ id: 'corners', label: 'Corners', icon: Square, tool: 'corners' as CtxTool }] : []), ...common, dup, { id: 'more', label: 'More', icon: MoreHorizontal, tool: 'more' }, del, settings]
  else if (l) items = [{ ...settings, strong: true }, { id: 'opacity', label: 'Opacity', icon: Blend, tool: 'opacity' }, { id: 'arrange', label: 'Arrange', icon: LayersIcon, tool: 'arrange' }, dup, del]

  return (
    <nav aria-label="Selection tools" data-context-bar={k.kind === 'layer' ? l?.type ?? 'layer' : k.kind} className="shrink-0 flex items-stretch border-t border-white/[0.06] bg-surface-raised" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <button aria-label="Back" onClick={() => { onTool(null); s.setActive(null) }} className="w-14 shrink-0 h-14 flex flex-col items-center justify-center gap-0.5 text-[11px] text-void-300 border-r border-white/[0.06] active:bg-void-800">
        <ArrowLeft size={18} />Back
      </button>
      <div className="flex-1 min-w-0 flex overflow-x-auto no-scrollbar">
        {items.map(it => {
          const on = !!it.tool && open === it.tool
          return (
            <button key={it.id} data-ctx={it.id} aria-pressed={it.tool ? on : undefined} onClick={() => { if (it.tool) onTool(on ? null : it.tool); else { onTool(null); it.run?.() } }}
              className={`min-w-[64px] px-1.5 h-14 shrink-0 flex flex-col items-center justify-center gap-0.5 text-[11px] ${on ? 'text-white' : it.strong ? 'text-void-100' : 'text-void-400'} ${it.id === 'delete' ? '!text-rose-300' : ''}`}>
              <span className={`w-9 h-7 rounded-lg flex items-center justify-center ${on ? 'bg-accent text-white' : it.strong ? 'bg-void-800' : ''}`}><it.icon size={18} /></span>{it.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/** The short sheet for one tool of the bar. */
export function ContextToolSheet({ tool, onClose, effects }: { tool: CtxTool; onClose: () => void; effects: React.ReactNode }) {
  const k = useSelectionKind()
  const l = useEditor(s => s.layers.find(x => x.id === s.activeId) ?? null)
  const swatches = useEditor(s => s.swatches)
  const s = useEditor.getState()
  const actions = useMemo(() => buildActions(), [])
  const run = (id: string) => { const a = actions[id]; if (a && (!a.enabled || a.enabled())) a.run() }
  const [q, setQ] = useState('')
  // A font is used straight away and redrawn when it has arrived, so a slow connection never feels like a dead tap.
  const applyFont = (id: string, patch: Partial<TextLayer>, label: string) => ops.setFontNow(id, patch, label)
  const sel = () => useEditor.getState().selectedIds
  const t = l?.type === 'text' ? (l as TextLayer) : null
  const sh = l?.type === 'shape' ? (l as ShapeLayer) : null
  const on = (b: boolean) => (b ? '!bg-white !text-void-950' : '')
  const Swatches = ({ value, set, none }: { value: string | null; set: (c: string | null) => void; none?: boolean }) => (
    <div className="flex flex-wrap gap-2 py-1">
      {none && <button aria-label="None" onClick={() => set(null)} className={`w-10 h-10 rounded-full border-2 ${value === null ? 'border-white' : 'border-white/20'} bg-[linear-gradient(45deg,transparent_45%,#f43f5e_45%,#f43f5e_55%,transparent_55%)]`} />}
      {swatches.slice(0, 14).map(c => <button key={c} aria-label={c} onClick={() => set(c)} className={`w-10 h-10 rounded-full border-2 ${value?.toLowerCase() === c.toLowerCase() ? 'border-white' : 'border-white/20'}`} style={{ background: c }} />)}
      <ColourChip label="Any colour" value={value ?? '#000000'} onChange={c => set(c)} />
    </div>
  )

  let body: React.ReactNode = null
  if (tool === 'effects') body = effects
  else if (tool === 'font' && t) {
    const all = Array.from(new Set([t.fontFamily, ...s.layers.filter(x => x.type === 'text').map(x => (x as TextLayer).fontFamily), ...FONTS]))
    const shown = q ? all.filter(f => f.toLowerCase().includes(q.toLowerCase())) : all
    body = (
      <>
        <input aria-label="Find a font" value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${all.length} fonts, or any Google font`} className="w-full h-10 px-3 rounded-xl bg-void-900 border border-white/[0.07] text-[14px] text-void-100 outline-none" />
        <div className="mt-2 flex flex-col">
          {shown.map(f => <button key={f} onClick={() => applyFont(t.id, { fontFamily: f }, 'Font')} className={`h-11 px-2 rounded-lg text-left text-[17px] truncate ${f === t.fontFamily ? 'bg-accent/20 text-white' : 'text-void-100 active:bg-void-800'}`} style={{ fontFamily: `"${f}", system-ui` }}>{f}</button>)}
          {q && !shown.includes(q.trim()) && <button onClick={() => applyFont(t.id, { fontFamily: q.trim() }, 'Font')} className="h-11 px-2 text-left text-[14px] text-accent-light">Use “{q.trim()}” from Google Fonts</button>}
        </div>
        <Label>Weight</Label>
        <Row>{([['Light', 300], ['Regular', 400], ['Medium', 500], ['Bold', 700], ['Black', 900]] as [string, number][]).map(([n, w]) => <button key={n} className={`${chip} ${on(t.fontWeight === w)}`} onClick={() => applyFont(t.id, { fontWeight: w }, 'Weight')}>{n}</button>)}
          <button className={`${chip} italic ${on(t.italic)}`} onClick={() => applyFont(t.id, { italic: !t.italic }, 'Italic')}>Italic</button>
        </Row>
      </>
    )
  } else if (tool === 'size' && t) {
    const max = Math.max(400, Math.round(t.fontSize * 1.5))
    body = (
      <>
        <Slider label="Size" value={Math.round(t.fontSize)} min={6} max={max} unit="px" onChange={v => s.updateLayer(t.id, { fontSize: v })} onCommit={() => s.commit('Size')} />
        <Row>
          <button className={chip} onClick={() => s.updateLayer(t.id, { fontSize: Math.max(6, Math.round(t.fontSize / 1.15)) }, 'Size')}>Smaller</button>
          <button className={chip} onClick={() => s.updateLayer(t.id, { fontSize: Math.round(t.fontSize * 1.15) }, 'Size')}>Bigger</button>
          <button className={`${chip} ${on(t.caps === 'all')}`} onClick={() => s.updateLayer(t.id, { caps: t.caps === 'all' ? 'none' : 'all' }, 'All caps')}>ALL CAPS</button>
        </Row>
      </>
    )
  } else if (tool === 'colour' && t) body = <Swatches value={t.color} set={c => c && s.updateLayer(t.id, { color: c }, 'Text colour')} />
  else if (tool === 'align' && t) {
    const opts: [TextLayer['align'], LucideIcon, string][] = [['left', AlignLeft, 'Left'], ['center', AlignCenter, 'Centre'], ['right', AlignRight, 'Right'], ...(t.boxWidth ? [['justify', AlignJustify, 'Justify'] as [TextLayer['align'], LucideIcon, string]] : [])]
    body = (
      <>
        <Row>{opts.map(([a, I, n]) => <button key={a} data-align={a} aria-pressed={t.align === a} className={`${chip} ${on(t.align === a)}`} onClick={() => s.updateLayer(t.id, { align: a }, 'Align')}><I size={16} />{n}</button>)}</Row>
        <p className="text-[12.5px] text-void-400 mt-2">{t.boxWidth ? 'Lines line up inside the text box.' : t.align === 'center' ? 'The text grows from its middle as you type.' : t.align === 'right' ? 'The text grows to the left from its right edge as you type.' : 'The text grows to the right from its left edge as you type.'}</p>
      </>
    )
  } else if (tool === 'spacing' && t) body = (
    <>
      <Slider label="Line height" value={Math.round(t.lineHeight * 100) / 100} min={0.7} max={2.5} step={0.05} onChange={v => s.updateLayer(t.id, { lineHeight: v })} onCommit={() => s.commit('Line height')} />
      <div className="mt-2"><Slider label="Letter spacing" value={t.letterSpacing} min={-20} max={100} unit="px" onChange={v => s.updateLayer(t.id, { letterSpacing: v })} onCommit={() => s.commit('Letter spacing')} /></div>
    </>
  )
  else if (tool === 'opacity') {
    const g = k.groupId ? s.groups.find(x => x.id === k.groupId) : null
    const val = Math.round((g ? g.opacity : l?.opacity ?? 1) * 100)
    body = <Slider label={g ? 'Opacity of the group' : k.count > 1 ? 'Opacity of all' : 'Opacity'} value={val} min={0} max={100} unit="%" onChange={v => { if (g) s.updateGroup(g.id, { opacity: v / 100 }); else s.updateLayers(sel().map(id => ({ id, patch: { opacity: v / 100 } }))) }} onCommit={() => s.commit('Opacity')} />
  } else if (tool === 'arrange') body = (
    <>
      <Label>Order</Label>
      <Row>
        <button className={chip} onClick={() => run('layer.up')}>Forward</button>
        <button className={chip} onClick={() => run('layer.down')}>Backward</button>
        <button className={chip} onClick={() => run('layer.front')}>To front</button>
        <button className={chip} onClick={() => run('layer.back')}>To back</button>
      </Row>
      <Label>{k.count > 1 && k.kind === 'several' ? 'Line them up' : 'Line up on the board'}</Label>
      <Row>{([['left', 'Left'], ['hcenter', 'Centre'], ['right', 'Right'], ['top', 'Top'], ['vcenter', 'Middle'], ['bottom', 'Bottom']] as const).map(([how, n]) => <button key={how} className={chip} onClick={() => s.align(how)}>{n}</button>)}</Row>
      {l && k.kind === 'layer' && l.type !== 'adjustment' && (
        <Row>
          <button className={chip} onClick={() => s.flip(l.id, 'h')}><FlipHorizontal size={15} />Flip</button>
          <button className={chip} onClick={() => s.flip(l.id, 'v')}><FlipVertical size={15} />Flip up</button>
          <button className={chip} onClick={() => { onClose(); ops.beginTransform('free') }}><Move size={15} />Transform</button>
        </Row>
      )}
    </>
  )
  else if (tool === 'fill' && sh) body = <Swatches none value={sh.fill} set={c => s.updateLayer(sh.id, { fill: c } as Partial<ShapeLayer>, 'Fill')} />
  else if (tool === 'stroke' && sh) body = (
    <>
      <Swatches none value={sh.stroke} set={c => s.updateLayer(sh.id, { stroke: c, strokeWidth: c && !sh.strokeWidth ? 4 : sh.strokeWidth } as Partial<ShapeLayer>, 'Stroke')} />
      {sh.stroke && <div className="mt-2"><Slider label="Width" value={sh.strokeWidth} min={0} max={Math.max(60, sh.strokeWidth)} unit="px" onChange={v => s.updateLayer(sh.id, { strokeWidth: v } as Partial<ShapeLayer>)} onCommit={() => s.commit('Stroke width')} /></div>}
    </>
  )
  else if (tool === 'corners' && sh) body = <Slider label="Corner radius" value={sh.radius} min={0} max={Math.round(Math.min(sh.w, sh.h) / 2)} unit="px" onChange={v => s.updateLayer(sh.id, { radius: v } as Partial<ShapeLayer>)} onCommit={() => s.commit('Corners')} />
  else if (tool === 'mask' && l) body = (
    <>
      <Row>
        {!l.mask && <button className={primary} onClick={() => s.addMask(l.id, !!s.selection)}><Square size={15} />{s.selection ? 'Mask to the selection' : 'Add a mask'}</button>}
        {l.mask && <button className={chip} onClick={() => s.invertMask(l.id)}>Invert</button>}
        {l.mask && <button className={chip} onClick={() => s.updateLayer(l.id, { maskEnabled: !l.maskEnabled }, l.maskEnabled ? 'Mask off' : 'Mask on')}>{l.maskEnabled ? 'Turn off' : 'Turn on'}</button>}
        {l.mask && <button className={chip} onClick={() => s.removeMask(l.id)}>Remove</button>}
      </Row>
      <p className="text-[12.5px] text-void-400 mt-2">A mask hides parts of the layer without erasing them. Paint on it with the Brush from More tools in Settings.</p>
    </>
  )
  else if (tool === 'more' && l) {
    const locked = l.locked
    body = (
      <div className="flex flex-col">
        {[
          { label: locked ? 'Unlock' : 'Lock in place', icon: locked ? Unlock : Lock, run: () => run('layer.lock') },
          { label: 'Hide', icon: Eye, run: () => run('layer.hide') },
          { label: 'Copy style', icon: Copy, run: () => run('style.copyAppearance') },
          { label: 'Paste style', icon: Paintbrush, run: () => run('style.pasteAppearance') },
          ...(k.kind === 'layer' && l.type !== 'adjustment' ? [{ label: 'Transform', icon: Move, run: () => { onClose(); ops.beginTransform('free') } }] : []),
        ].map(it => <button key={it.label} onClick={() => { it.run(); onClose() }} className="w-full h-12 px-1 flex items-center gap-3 text-left text-[14px] text-void-100 active:bg-void-800 rounded-lg"><it.icon size={17} className="text-void-400" />{it.label}</button>)}
      </div>
    )
  }
  if (!body) return null
  return <Sheet title={TOOL_TITLE[tool]} onClose={onClose}><div data-ctx-sheet={tool}>{body}</div></Sheet>
}
