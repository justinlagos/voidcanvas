'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Cpu, Download, Link2, RotateCcw, Trash2, Unlink } from 'lucide-react'
import * as ops from '../ops'
import * as ai from '../ai-tools'
import { FONTS, ensureFont, registerLocalFont } from '../io'
import { useEditor } from '../store'
import type { TextLayer } from '../types'
import { useUi } from '../ui-store'
import { deleteVersion, listVersions, restoreVersion, saveVersion, type VersionSummary } from '../versions'
import { ColorButton } from './ColorPicker'
import { Button, Modal, Select, Slider, focusRing } from './ui'

const FIELD = `w-full h-9 px-2.5 rounded-lg bg-surface-sunken border border-white/[0.06] text-[13px] tabular-nums ${focusRing}`
const Label = ({ children }: { children: React.ReactNode }) => <span className="block text-[12px] text-void-400 mb-1">{children}</span>
const Foot = ({ children }: { children: React.ReactNode }) => <div className="flex justify-end gap-2 px-5 py-4 border-t border-void-800/70">{children}</div>

// ─── Image size ────────────────────────────────────────────────────

export function ImageSizeDialog({ onClose }: { onClose: () => void }) {
  const doc = useEditor(s => s.doc)!
  const [w, setW] = useState(doc.width), [h, setH] = useState(doc.height)
  const [linked, setLinked] = useState(true)
  const [unit, setUnit] = useState<'px' | '%'>('px')
  const [dpi, setDpi] = useState(doc.dpi ?? 72)
  const ratio = doc.width / doc.height
  const setWidth = (v: number) => { setW(v); if (linked) setH(Math.round(v / ratio)) }
  const setHeight = (v: number) => { setH(v); if (linked) setW(Math.round(v * ratio)) }
  const shown = (v: number, base: number) => (unit === 'px' ? v : Math.round((v / base) * 1000) / 10)
  const read = (v: number, base: number) => (unit === 'px' ? v : Math.round((v / 100) * base))
  const mb = Math.round((w * h * 4) / 1048576)
  return (
    <Modal title="Image size" onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-[12.5px] text-void-400">Scales every layer. Text and shapes stay sharp; photos are resampled.</p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <label><Label>Width</Label><input type="number" className={FIELD} value={shown(w, doc.width)} onChange={e => setWidth(read(Number(e.target.value), doc.width))} /></label>
          <button aria-label={linked ? 'Unlink width and height' : 'Link width and height'} onClick={() => setLinked(!linked)} className={`h-9 w-9 mb-0 inline-flex items-center justify-center rounded-lg ${linked ? 'text-accent-light' : 'text-void-500'} hover:bg-void-800`}>{linked ? <Link2 size={16} /> : <Unlink size={16} />}</button>
          <label><Label>Height</Label><input type="number" className={FIELD} value={shown(h, doc.height)} onChange={e => setHeight(read(Number(e.target.value), doc.height))} /></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select label="Units" value={unit} options={[{ id: 'px', label: 'Pixels' }, { id: '%', label: 'Percent' }]} onChange={setUnit} />
          <label className="flex items-center justify-between gap-3"><span className="text-[12px] text-void-400">Resolution</span><input type="number" value={dpi} onChange={e => setDpi(Number(e.target.value))} className={`${FIELD} !w-24`} /></label>
        </div>
        <p className="text-[12px] text-void-500">{w} × {h} px · about {mb} MB per layer · prints at {(w / dpi * 2.54).toFixed(1)} × {(h / dpi * 2.54).toFixed(1)} cm at {dpi} dpi</p>
        {Math.max(w, h) > 8000 && <p className="text-[12px] text-amber-300/90 flex gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" />Very large images may be slow in the browser. Save a version first.</p>}
      </div>
      <Foot>
        <Button onClick={onClose}>Cancel</Button>
        <Button primary onClick={async () => { if (Math.max(w, h) > 4000) await saveVersion('Before image size', true); ops.imageSize(w, h); useEditor.getState().setDoc({ dpi }); onClose() }}>Resize</Button>
      </Foot>
    </Modal>
  )
}

// ─── Canvas size ───────────────────────────────────────────────────

export function CanvasSizeDialog({ onClose, aiFill }: { onClose: () => void; aiFill?: boolean }) {
  const doc = useEditor(s => s.doc)!
  const [w, setW] = useState(aiFill ? Math.round(doc.width * 1.25) : doc.width), [h, setH] = useState(aiFill ? Math.round(doc.height * 1.25) : doc.height)
  const [anchor, setAnchor] = useState(4)
  const [relative, setRelative] = useState(false)
  const [fill, setFill] = useState(!!aiFill)
  return (
    <Modal title={aiFill ? 'Expand with AI fill' : 'Canvas size'} onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-[12.5px] text-void-400">{aiFill ? 'Make the canvas bigger, then fill the new edges to match the picture. Runs on your device.' : 'Add or remove space around the design. Layers are not scaled.'}</p>
        <div className="grid grid-cols-2 gap-2">
          <label><Label>{relative ? 'Add to width' : 'Width'}</Label><input type="number" className={FIELD} value={relative ? w - doc.width : w} onChange={e => setW((relative ? doc.width : 0) + Number(e.target.value))} /></label>
          <label><Label>{relative ? 'Add to height' : 'Height'}</Label><input type="number" className={FIELD} value={relative ? h - doc.height : h} onChange={e => setH((relative ? doc.height : 0) + Number(e.target.value))} /></label>
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-void-300"><input type="checkbox" checked={relative} onChange={e => setRelative(e.target.checked)} />Relative</label>
        <div className="flex items-center gap-4">
          <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Anchor">
            {Array.from({ length: 9 }, (_, i) => <button key={i} role="radio" aria-checked={anchor === i} aria-label={`Anchor ${i + 1}`} onClick={() => setAnchor(i)} className={`w-7 h-7 rounded ${anchor === i ? 'bg-accent' : 'bg-void-800 hover:bg-void-700'}`} />)}
          </div>
          <p className="text-[12px] text-void-500">The anchor is where the current design sits in the new canvas.</p>
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-void-300"><input type="checkbox" checked={fill} onChange={e => setFill(e.target.checked)} />Fill the new area with AI (on device, free, {ai.MODELS.find(m => m.id === 'lama')?.sizeMB} MB download once)</label>
      </div>
      <Foot>
        <Button onClick={onClose}>Cancel</Button>
        <Button primary onClick={async () => { ops.canvasSize(w, h, anchor); onClose(); if (fill && (w > doc.width || h > doc.height)) await ai.aiFillTransparent() }}>Apply</Button>
      </Foot>
    </Modal>
  )
}

// ─── Guides ────────────────────────────────────────────────────────

export function GuideLayoutDialog({ onClose }: { onClose: () => void }) {
  const [cols, setCols] = useState(12), [rows, setRows] = useState(1), [margin, setMargin] = useState(40), [gutter, setGutter] = useState(20)
  return (
    <Modal title="New guide layout" onClose={onClose}>
      <div className="p-5 grid grid-cols-2 gap-3">
        <label><Label>Columns</Label><input type="number" min={1} className={FIELD} value={cols} onChange={e => setCols(Math.max(1, Number(e.target.value)))} /></label>
        <label><Label>Rows</Label><input type="number" min={1} className={FIELD} value={rows} onChange={e => setRows(Math.max(1, Number(e.target.value)))} /></label>
        <label><Label>Margin (px)</Label><input type="number" min={0} className={FIELD} value={margin} onChange={e => setMargin(Math.max(0, Number(e.target.value)))} /></label>
        <label><Label>Gutter (px)</Label><input type="number" min={0} className={FIELD} value={gutter} onChange={e => setGutter(Math.max(0, Number(e.target.value)))} /></label>
        <div className="col-span-2 flex flex-wrap gap-1.5">
          {[['12 column web', 12, 1, 40, 20], ['Thirds', 3, 3, 0, 0], ['2 columns print', 2, 1, 60, 24], ['Safe margins', 1, 1, 60, 0]].map(([n, c, r, m, g]) => <button key={n as string} onClick={() => { setCols(c as number); setRows(r as number); setMargin(m as number); setGutter(g as number) }} className={`h-7 px-2.5 rounded-md text-[12px] bg-surface-sunken border border-white/[0.06] text-void-300 hover:text-white ${focusRing}`}>{n}</button>)}
        </div>
      </div>
      <Foot><Button onClick={onClose}>Cancel</Button><Button primary onClick={() => { ops.guideLayout(cols, rows, margin, gutter); useUi.getState().setPref('showGuides', true); onClose() }}>Make guides</Button></Foot>
    </Modal>
  )
}

export function NewGuideDialog({ onClose }: { onClose: () => void }) {
  const [axis, setAxis] = useState<'v' | 'h'>('v'), [pos, setPos] = useState(100)
  return (
    <Modal title="New guide" onClose={onClose}>
      <div className="p-5 space-y-3">
        <Select label="Direction" value={axis} options={[{ id: 'v', label: 'Vertical' }, { id: 'h', label: 'Horizontal' }]} onChange={setAxis} />
        <label><Label>Position (px)</Label><input type="number" className={FIELD} value={pos} onChange={e => setPos(Number(e.target.value))} /></label>
      </div>
      <Foot><Button onClick={onClose}>Cancel</Button><Button primary onClick={() => { ops.newGuide(axis, pos); onClose() }}>Add</Button></Foot>
    </Modal>
  )
}

// ─── Fill and stroke ───────────────────────────────────────────────

export function FillDialog({ onClose }: { onClose: () => void }) {
  const fg = useEditor(s => s.fg), bg = useEditor(s => s.bg)
  const [what, setWhat] = useState<'fg' | 'bg' | 'custom' | 'white' | 'black'>('fg')
  const [custom, setCustom] = useState('#8b7cff')
  const [opacity, setOpacity] = useState(100)
  const color = what === 'fg' ? fg : what === 'bg' ? bg : what === 'white' ? '#ffffff' : what === 'black' ? '#000000' : custom
  return (
    <Modal title="Fill" onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-[12.5px] text-void-400">{useEditor.getState().selection ? 'Fills the selection on the active layer.' : 'Fills the whole active layer.'}</p>
        <div className="flex items-center gap-3">
          <Select label="Use" value={what} options={[{ id: 'fg', label: 'Main colour' }, { id: 'bg', label: 'Second colour' }, { id: 'custom', label: 'Custom colour' }, { id: 'white', label: 'White' }, { id: 'black', label: 'Black' }]} onChange={setWhat} />
          {what === 'custom' ? <ColorButton label="Custom colour" value={custom} onChange={setCustom} /> : <span className="w-7 h-7 rounded-md border border-white/15" style={{ background: color }} />}
        </div>
        <Slider label="Opacity" value={opacity} min={1} max={100} unit="%" onChange={setOpacity} />
      </div>
      <Foot><Button onClick={onClose}>Cancel</Button><Button primary onClick={() => { ops.fillSelectionOrLayer(color, opacity / 100); onClose() }}>Fill</Button></Foot>
    </Modal>
  )
}

export function StrokeDialog({ onClose }: { onClose: () => void }) {
  const fg = useEditor(s => s.fg)
  const [color, setColor] = useState(fg), [width, setWidth] = useState(4), [pos, setPos] = useState<'inside' | 'center' | 'outside'>('center')
  return (
    <Modal title="Stroke selection" onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between"><span className="text-[12px] text-void-400">Colour</span><ColorButton label="Stroke colour" value={color} onChange={setColor} /></div>
        <Slider label="Width" value={width} min={1} max={100} unit="px" onChange={setWidth} />
        <Select label="Position" value={pos} options={[{ id: 'inside', label: 'Inside' }, { id: 'center', label: 'Centre' }, { id: 'outside', label: 'Outside' }]} onChange={setPos} />
      </div>
      <Foot><Button onClick={onClose}>Cancel</Button><Button primary onClick={() => { ops.strokeSelection(color, width, pos); onClose() }}>Stroke</Button></Foot>
    </Modal>
  )
}

export function ModifySelectionDialog({ onClose, kind }: { onClose: () => void; kind: 'expand' | 'contract' | 'feather' | 'smooth' | 'border' }) {
  const [px, setPx] = useState(kind === 'feather' ? 10 : 5)
  const titles = { expand: 'Expand selection', contract: 'Contract selection', feather: 'Feather selection', smooth: 'Smooth selection', border: 'Border selection' }
  return (
    <Modal title={titles[kind]} onClose={onClose}>
      <div className="p-5"><Slider label={kind === 'feather' ? 'Feather radius' : kind === 'smooth' ? 'Sample radius' : kind === 'border' ? 'Width' : 'By'} value={px} min={1} max={200} unit="px" onChange={setPx} /></div>
      <Foot><Button onClick={onClose}>Cancel</Button><Button primary onClick={() => { ops.modifySelection(kind, px); onClose() }}>OK</Button></Foot>
    </Modal>
  )
}

export function ColorRangeDialog({ onClose }: { onClose: () => void }) {
  const [color, setColor] = useState(useEditor.getState().fg), [fuzz, setFuzz] = useState(40)
  return (
    <Modal title="Colour range" onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-[12.5px] text-void-400">Selects every part of the image close to a colour.</p>
        <div className="flex items-center gap-2">
          <ColorButton label="Colour to select" value={color} onChange={setColor} />
          <Button onClick={() => { useEditor.setState({ pickRequest: { label: 'Colour range', cb: hex => setColor(hex) } }); useEditor.getState().notify('Click the canvas to pick the colour.') }} className="!h-8">Pick from canvas</Button>
        </div>
        <Slider label="Fuzziness" value={fuzz} min={0} max={200} onChange={setFuzz} />
      </div>
      <Foot><Button onClick={onClose}>Cancel</Button><Button primary onClick={() => { ops.selectColorRange(color, fuzz); onClose() }}>Select</Button></Foot>
    </Modal>
  )
}

// ─── Preferences ───────────────────────────────────────────────────

export function PreferencesDialog({ onClose, tab: initial }: { onClose: () => void; tab?: string }) {
  const ui = useUi()
  const [tab, setTab] = useState(initial ?? 'interface')
  const tabs = [['interface', 'Interface'], ['history', 'History and saving'], ['guides', 'Guides and snapping'], ['ai', 'AI and privacy']]
  return (
    <Modal title="Preferences" onClose={onClose} wide>
      <div className="flex min-h-[380px]">
        <nav className="w-44 shrink-0 p-2 border-r border-void-800/70">
          {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`w-full text-left px-3 h-9 rounded-lg text-[13px] ${tab === id ? 'bg-void-800 text-white' : 'text-void-400 hover:text-white'}`}>{label}</button>)}
        </nav>
        <div className="flex-1 p-5 space-y-4">
          {tab === 'interface' && <>
            <Slider label="Interface size" value={Math.round(ui.uiScale * 100)} min={80} max={160} step={5} unit="%" onChange={v => ui.setPref('uiScale', v / 100)} />
            <p className="text-[12px] text-void-500 -mt-2">Makes menus, panels and tools bigger or smaller. The canvas is not affected. Good for sharp laptop screens and big monitors.</p>
            <Select label="Density" value={ui.density} options={[{ id: 'comfortable', label: 'Comfortable' }, { id: 'compact', label: 'Compact' }]} onChange={v => ui.setPref('density', v)} />
            <label className="flex items-center gap-2 text-[13px] text-void-200"><input type="checkbox" checked={ui.touchMode} onChange={e => ui.setPref('touchMode', e.target.checked)} />Touch mode: bigger controls, and when you use a pen, fingers pan and zoom instead of painting</label>
            <label className="flex items-center gap-2 text-[13px] text-void-200"><input type="checkbox" checked={ui.showContextBar} onChange={e => ui.setPref('showContextBar', e.target.checked)} />Show the floating action bar above the selected layer</label>
            <label className="flex items-center gap-2 text-[13px] text-void-200"><input type="checkbox" checked={ui.showStatusBar} onChange={e => ui.setPref('showStatusBar', e.target.checked)} />Show the status bar</label>
          </>}
          {tab === 'history' && <>
            <Slider label="Undo steps kept" value={ui.historyLimit} min={20} max={500} step={10} onChange={v => ui.setPref('historyLimit', v)} />
            <Slider label="Memory for undo" value={ui.historyMemoryMB} min={200} max={4000} step={100} unit=" MB" onChange={v => ui.setPref('historyMemoryMB', v)} />
            <p className="text-[12px] text-void-500 -mt-2">When undo uses more memory than this, the oldest steps are dropped first, so the browser never runs out.</p>
            <Slider label="Automatic version every" value={ui.versionEveryMin} min={0} max={60} unit=" min" onChange={v => ui.setPref('versionEveryMin', v)} />
            <p className="text-[12px] text-void-500 -mt-2">Your design autosaves to this device every couple of seconds. Versions are extra restore points you can go back to in File, Version history. 0 turns automatic versions off.</p>
          </>}
          {tab === 'guides' && <>
            <label className="flex items-center gap-2 text-[13px] text-void-200"><input type="checkbox" checked={ui.showRulers} onChange={e => ui.setPref('showRulers', e.target.checked)} />Show rulers (Ctrl+R). Drag from a ruler to make a guide.</label>
            <label className="flex items-center gap-2 text-[13px] text-void-200"><input type="checkbox" checked={ui.showGuides} onChange={e => ui.setPref('showGuides', e.target.checked)} />Show guides</label>
            <label className="flex items-center gap-2 text-[13px] text-void-200"><input type="checkbox" checked={ui.lockGuides} onChange={e => ui.setPref('lockGuides', e.target.checked)} />Lock guides</label>
            <label className="flex items-center gap-2 text-[13px] text-void-200"><input type="checkbox" checked={ui.snap} onChange={e => ui.setPref('snap', e.target.checked)} />Snap to the page, layers and guides (hold Alt to move freely)</label>
            <label className="flex items-center gap-2 text-[13px] text-void-200"><input type="checkbox" checked={ui.pixelGrid} onChange={e => ui.setPref('pixelGrid', e.target.checked)} />Pixel grid when zoomed in past 800%</label>
          </>}
          {tab === 'ai' && <AiInfoBody />}
        </div>
      </div>
    </Modal>
  )
}

function AiInfoBody() {
  const [cleared, setCleared] = useState(false)
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-void-200 leading-relaxed">Every AI feature in Voidcanvas runs in your browser. Your images are never uploaded, there are no credits, and nothing is charged. Each model downloads once, is cached, and then works offline.</p>
      <ul className="space-y-2">
        {ai.MODELS.map(m => (
          <li key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface-sunken border border-white/[0.05]">
            <Cpu size={16} className="text-accent-light mt-0.5 shrink-0" />
            <div className="flex-1 text-[12.5px]"><p className="text-void-100 font-medium">{m.name} <span className="text-void-500 font-normal">· {m.sizeMB} MB · {m.licence}{m.needsGpu ? ' · works best with WebGPU' : ''}</span></p><p className="text-void-400">{m.use}</p></div>
            <span className="text-[11.5px] text-emerald-400 shrink-0">Free</span>
          </li>
        ))}
      </ul>
      <Button onClick={async () => { await ai.clearModelCache(); setCleared(true) }}><Trash2 size={14} />{cleared ? 'Downloaded models removed' : 'Remove downloaded models'}</Button>
    </div>
  )
}
export function AiInfoDialog({ onClose }: { onClose: () => void }) { return <Modal title="AI on this device" onClose={onClose}><div className="p-5"><AiInfoBody /></div></Modal> }

// ─── Version history ───────────────────────────────────────────────

export function VersionsDialog({ onClose }: { onClose: () => void }) {
  const doc = useEditor(s => s.doc)!
  const [list, setList] = useState<VersionSummary[] | null>(null)
  const load = () => listVersions(doc.id).then(setList).catch(() => setList([]))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const when = (t: number) => { const d = new Date(t); return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  return (
    <Modal title="Version history" onClose={onClose} wide>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12.5px] text-void-400">Restore points for this design, kept on this device. Restoring saves the current state first, so you can always come back.</p>
          <Button onClick={async () => { await saveVersion("Saved by you"); load() }} className="shrink-0 whitespace-nowrap"><Download size={14} />Save a version now</Button>
        </div>
        {!list ? <p className="text-[13px] text-void-500">Loading…</p> : !list.length ? <p className="text-[13px] text-void-500 py-6">No versions yet. One is made automatically every few minutes while you work, and you can save one any time with Ctrl+Alt+S.</p> : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto">
            {list.map(v => (
              <li key={v.id} className="rounded-xl border border-white/[0.06] bg-surface-sunken overflow-hidden">
                <img src={v.thumb} alt="" className="w-full h-28 object-contain bg-black/40" />
                <div className="p-2.5">
                  <p className="text-[12.5px] text-void-100">{v.label}</p>
                  <p className="text-[11.5px] text-void-500">{when(v.at)} · {v.width}×{v.height}</p>
                  <div className="flex gap-1 mt-2">
                    <Button onClick={async () => { await restoreVersion(v.id); onClose() }} className="!h-7 !px-2 !text-[12px] flex-1"><RotateCcw size={12} />Restore</Button>
                    <Button onClick={async () => { await restoreVersion(v.id, true); onClose() }} className="!h-7 !px-2 !text-[12px]">As copy</Button>
                    <button aria-label="Delete version" onClick={async () => { await deleteVersion(v.id); load() }} className="w-7 h-7 inline-flex items-center justify-center text-void-500 hover:text-white"><Trash2 size={13} /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

// ─── Missing fonts ─────────────────────────────────────────────────

/** Is a font family really available (loaded web font, local file, or installed on this computer)? */
export function fontAvailable(family: string): boolean {
  try { for (const f of Array.from(document.fonts)) if (f.family.replace(/["']/g, '') === family && f.status === 'loaded') return true } catch { /* ignore */ }
  const c = document.createElement('canvas').getContext('2d')!
  const test = 'mmmmmmmmmmlli1WQ@#'
  for (const base of ['monospace', 'serif', 'sans-serif']) {
    c.font = `72px ${base}`; const a = c.measureText(test).width
    c.font = `72px "${family}", ${base}`; const b = c.measureText(test).width
    if (a !== b) return true
  }
  return false
}

export function MissingFontsDialog({ onClose, fonts }: { onClose: () => void; fonts: string[] }) {
  const [choice, setChoice] = useState<Record<string, string>>(() => Object.fromEntries(fonts.map(f => [f, 'Inter'])))
  const layers = useEditor(s => s.layers)
  const s = useEditor.getState()
  const count = (f: string) => layers.filter(l => l.type === 'text' && l.fontFamily === f).length
  const replace = async () => {
    for (const f of fonts) {
      const to = choice[f]; if (!to || to === f) continue
      await ensureFont(to)
      s.updateLayers(layers.filter(l => l.type === 'text' && (l as TextLayer).fontFamily === f).map(l => ({ id: l.id, patch: { fontFamily: to } })))
    }
    s.commit('Replace missing fonts'); onClose()
  }
  const loadFile = (fam: string) => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.ttf,.otf,.woff,.woff2'
    i.onchange = async () => { const file = i.files?.[0]; if (!file) return; try { await registerLocalFont(fam, file); setChoice(c => ({ ...c, [fam]: fam })); s.setDoc({}); useEditor.setState(st => ({ docRev: st.docRev + 1, layers: st.layers.map(l => l.type === 'text' ? { ...l, rev: l.rev + 1 } : l) })) } catch { s.notify('That font file could not be read.') } }
    i.click()
  }
  return (
    <Modal title="Some fonts are missing" onClose={onClose}>
      <div className="p-5 space-y-3">
        <p className="text-[12.5px] text-void-400 leading-relaxed">These fonts are not on this device or on Google Fonts, so the text would show in a stand-in font and spacing may shift. Pick a replacement, or add the font file. Added fonts are saved inside this design.</p>
        {fonts.map(f => (
          <div key={f} className="p-3 rounded-lg bg-surface-sunken border border-white/[0.05] space-y-2">
            <p className="text-[13px] text-void-100">{f} <span className="text-void-500">· {count(f)} text layer{count(f) === 1 ? '' : 's'}</span></p>
            <div className="flex items-center gap-2">
              <select value={choice[f]} onChange={e => setChoice(c => ({ ...c, [f]: e.target.value }))} className={`${FIELD} !h-8 flex-1`}>
                <option value={f}>Keep {f} (use a stand-in for now)</option>
                {FONTS.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
              <Button onClick={() => loadFile(f)} className="!h-8 shrink-0">Add font file</Button>
            </div>
          </div>
        ))}
      </div>
      <Foot><Button onClick={onClose}>Keep as is</Button><Button primary onClick={replace}>Replace</Button></Foot>
    </Modal>
  )
}

// ─── Import report ─────────────────────────────────────────────────

export function ImportReportDialog({ onClose, report }: { onClose: () => void; report: { name: string; kept: string[]; changed: string[]; missing: string[] } }) {
  return (
    <Modal title={`Opened ${report.name}`} onClose={onClose}>
      <div className="p-5 space-y-4 text-[12.5px]">
        {report.kept.length > 0 && <section><p className="text-emerald-400 font-medium mb-1">Kept</p><ul className="list-disc pl-5 text-void-300 space-y-0.5">{report.kept.map(k => <li key={k}>{k}</li>)}</ul></section>}
        {report.changed.length > 0 && <section><p className="text-amber-300 font-medium mb-1">Changed so it would open</p><ul className="list-disc pl-5 text-void-300 space-y-0.5">{report.changed.map(k => <li key={k}>{k}</li>)}</ul></section>}
        {report.missing.length > 0 && <section><p className="text-rose-300 font-medium mb-1">Not supported yet</p><ul className="list-disc pl-5 text-void-300 space-y-0.5">{report.missing.map(k => <li key={k}>{k}</li>)}</ul></section>}
        <p className="text-void-500">Nothing was uploaded. Your original file is unchanged.</p>
      </div>
      <Foot><Button primary onClick={onClose}>Got it</Button></Foot>
    </Modal>
  )
}
