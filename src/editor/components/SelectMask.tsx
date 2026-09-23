'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Brush, Eraser, Sparkles, X } from 'lucide-react'
import { ctx2d, makeCanvas } from '../engine'
import { composite } from '../ops'
import * as ai from '../ai-tools'
import { base, useEditor } from '../store'
import type { RasterLayer } from '../types'
import { Button, Select, Slider, focusRing } from './ui'

// Select and Mask: a focused workspace for difficult edges like hair and fur. It refines the edge with a
// local colour model: near the edge, each pixel is compared with the nearby definite foreground and
// background colours to work out how much of it belongs to the subject.

type View = 'overlay' | 'black' | 'white' | 'bw' | 'layers'
type Tool = 'refine' | 'add' | 'sub'
interface Settings { radius: number; smooth: number; feather: number; contrast: number; shift: number; decon: boolean; deconAmount: number }

function blurF(a: Float32Array, w: number, h: number, r: number) {
  r = Math.round(r); if (r < 1) return a
  const tmp = new Float32Array(a.length), n = r * 2 + 1
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      let acc = 0; const row = y * w
      for (let k = -r; k <= r; k++) acc += a[row + Math.min(w - 1, Math.max(0, k))]
      for (let x = 0; x < w; x++) { tmp[row + x] = acc / n; acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)] }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0
      for (let k = -r; k <= r; k++) acc += tmp[Math.min(h - 1, Math.max(0, k)) * w + x]
      for (let y = 0; y < h; y++) { a[y * w + x] = acc / n; acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x] }
    }
  }
  return a
}

/** The whole refine pipeline at one resolution. Returns alpha (0..1) and, if asked, decontaminated colours. */
function refine(img: ImageData, sel: Float32Array, add: Float32Array, sub: Float32Array, band: Float32Array, st: Settings, scale: number, wantColors: boolean) {
  const { width: w, height: h, data } = img
  const N = w * h
  const A = new Float32Array(N)
  for (let i = 0; i < N; i++) A[i] = Math.min(1 - sub[i], Math.max(sel[i], add[i]))
  // Edge band: an automatic ring of `radius` around the edge, plus anything painted with the refine brush.
  const R = Math.max(0, st.radius * scale)
  const edge = new Float32Array(N)
  if (R > 0.5) {
    const b = blurF(Float32Array.from(A), w, h, R / 2)
    for (let i = 0; i < N; i++) edge[i] = b[i] > 0.02 && b[i] < 0.98 ? 1 : 0
  }
  for (let i = 0; i < N; i++) if (band[i] > 0.1) edge[i] = 1
  let out = A
  const F = new Float32Array(N * 3), B = new Float32Array(N * 3)
  const anyEdge = edge.some(v => v > 0)
  if (anyEdge) {
    // Local mean colours of sure-foreground and sure-background pixels around every point.
    const win = Math.max(3, Math.round((R || 12 * scale) * 1.2))
    const fgW = new Float32Array(N), bgW = new Float32Array(N)
    for (let i = 0; i < N; i++) { const inBand = edge[i] > 0; fgW[i] = !inBand && A[i] > 0.9 ? 1 : 0; bgW[i] = !inBand && A[i] < 0.1 ? 1 : 0 }
    const fw = blurF(Float32Array.from(fgW), w, h, win), bw = blurF(Float32Array.from(bgW), w, h, win)
    for (let c = 0; c < 3; c++) {
      const cf = new Float32Array(N), cb = new Float32Array(N)
      for (let i = 0; i < N; i++) { const v = data[i * 4 + c] / 255; cf[i] = v * fgW[i]; cb[i] = v * bgW[i] }
      blurF(cf, w, h, win); blurF(cb, w, h, win)
      for (let i = 0; i < N; i++) { F[i * 3 + c] = fw[i] > 1e-4 ? cf[i] / fw[i] : -1; B[i * 3 + c] = bw[i] > 1e-4 ? cb[i] / bw[i] : -1 }
    }
    out = Float32Array.from(A)
    for (let i = 0; i < N; i++) {
      if (!edge[i]) continue
      if (F[i * 3] < 0 || B[i * 3] < 0) continue
      let num = 0, den = 0
      for (let c = 0; c < 3; c++) { const fb = F[i * 3 + c] - B[i * 3 + c]; num += (data[i * 4 + c] / 255 - B[i * 3 + c]) * fb; den += fb * fb }
      if (den < 0.004) continue
      out[i] = Math.min(1, Math.max(0, num / den))
    }
  }
  if (st.smooth > 0) { blurF(out, w, h, st.smooth * scale); for (let i = 0; i < N; i++) out[i] = 1 / (1 + Math.exp(-(out[i] - 0.5) * 14)) }
  if (st.feather > 0) blurF(out, w, h, st.feather * scale)
  if (st.contrast > 0) { const k = 1 + (st.contrast / 100) * 6; for (let i = 0; i < N; i++) out[i] = Math.min(1, Math.max(0, (out[i] - 0.5) * k + 0.5)) }
  if (st.shift) { const k = st.shift / 100; for (let i = 0; i < N; i++) out[i] = k > 0 ? Math.min(1, out[i] * (1 + k * 2)) : Math.max(0, (out[i] + k) / (1 + k)) }
  let colors: Uint8ClampedArray | null = null
  if (wantColors) {
    colors = new Uint8ClampedArray(data)
    if (st.decon && anyEdge) {
      const amt = st.deconAmount / 100
      for (let i = 0; i < N; i++) {
        const a = out[i]; if (a <= 0.02 || a >= 0.98 || B[i * 3] < 0) continue
        for (let c = 0; c < 3; c++) { const I = data[i * 4 + c] / 255, fg = (I - (1 - a) * B[i * 3 + c]) / a; colors[i * 4 + c] = (I + (Math.min(1, Math.max(0, fg)) - I) * amt) * 255 }
      }
    }
  }
  return { alpha: out, colors }
}

const readAlpha = (c: HTMLCanvasElement | null, w: number, h: number) => {
  const a = new Float32Array(w * h); if (!c) return a
  const t = makeCanvas(w, h), x = ctx2d(t, true); x.drawImage(c, 0, 0, w, h)
  const d = x.getImageData(0, 0, w, h).data
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255
  return a
}
const alphaCanvas = (a: Float32Array, w: number, h: number) => {
  const c = makeCanvas(w, h), x = ctx2d(c), img = x.createImageData(w, h)
  for (let i = 0; i < a.length; i++) { img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = a[i] * 255 }
  x.putImageData(img, 0, 0); return c
}

export function SelectMask({ onClose }: { onClose: () => void }) {
  const doc = useEditor(s => s.doc)!
  const view = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<View>('overlay')
  const [tool, setTool] = useState<Tool>('refine')
  const [size, setSize] = useState(40)
  const [st, setSt] = useState<Settings>({ radius: 6, smooth: 0, feather: 0, contrast: 0, shift: 0, decon: false, deconAmount: 70 })
  const [out, setOut] = useState<'selection' | 'mask' | 'layerMask' | 'layer'>(useEditor.getState().active()?.type === 'raster' ? 'mask' : 'selection')
  const [working, setWorking] = useState(false)
  const [rev, setRev] = useState(0)
  const W = doc.width, H = doc.height
  const k = Math.min(1, 1100 / Math.max(W, H))
  const pw = Math.max(1, Math.round(W * k)), ph = Math.max(1, Math.round(H * k))
  // Full-resolution sources, and brush layers painted at full resolution.
  const full = useMemo(() => composite() ?? makeCanvas(W, H), []) // eslint-disable-line react-hooks/exhaustive-deps
  const strokes = useMemo(() => ({ add: makeCanvas(W, H), sub: makeCanvas(W, H), band: makeCanvas(W, H) }), [W, H])
  const selCanvas = useRef<HTMLCanvasElement | null>(useEditor.getState().selection)
  const previewImg = useMemo(() => { const c = makeCanvas(pw, ph); ctx2d(c).drawImage(full, 0, 0, pw, ph); return ctx2d(c, true).getImageData(0, 0, pw, ph) }, [full, pw, ph])

  const render = useCallback(() => {
    const c = view.current; if (!c) return
    const r = refine(previewImg, readAlpha(selCanvas.current, pw, ph), readAlpha(strokes.add, pw, ph), readAlpha(strokes.sub, pw, ph), readAlpha(strokes.band, pw, ph), st, k, false)
    const x = ctx2d(c); c.width = pw; c.height = ph
    const img = x.createImageData(pw, ph), d = img.data, s0 = previewImg.data
    for (let i = 0; i < r.alpha.length; i++) {
      const a = r.alpha[i], o = i * 4
      if (mode === 'bw') { d[o] = d[o + 1] = d[o + 2] = a * 255; d[o + 3] = 255; continue }
      if (mode === 'overlay') { const t = (1 - a) * 0.55; d[o] = s0[o] * (1 - t) + 255 * t; d[o + 1] = s0[o + 1] * (1 - t) + 30 * t; d[o + 2] = s0[o + 2] * (1 - t) + 70 * t; d[o + 3] = 255; continue }
      const bgc = mode === 'white' ? 255 : 0
      if (mode === 'layers') { d[o] = s0[o]; d[o + 1] = s0[o + 1]; d[o + 2] = s0[o + 2]; d[o + 3] = a * 255; continue }
      d[o] = s0[o] * a + bgc * (1 - a); d[o + 1] = s0[o + 1] * a + bgc * (1 - a); d[o + 2] = s0[o + 2] * a + bgc * (1 - a); d[o + 3] = 255
    }
    x.putImageData(img, 0, 0)
  }, [previewImg, pw, ph, st, mode, strokes, k])

  useEffect(() => { const t = setTimeout(render, 40); return () => clearTimeout(t) }, [render, rev])
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }; window.addEventListener('keydown', key, true); return () => window.removeEventListener('keydown', key, true) }, [onClose])

  const last = useRef<{ x: number; y: number } | null>(null)
  const paint = (e: React.PointerEvent) => {
    const c = view.current!; const r = c.getBoundingClientRect()
    const p = { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
    const target = tool === 'add' ? strokes.add : tool === 'sub' ? strokes.sub : strokes.band
    const x = ctx2d(target); x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineCap = 'round'; x.lineWidth = size
    x.beginPath(); if (last.current) { x.moveTo(last.current.x, last.current.y); x.lineTo(p.x, p.y); x.stroke() } else { x.arc(p.x, p.y, size / 2, 0, Math.PI * 2); x.fill() }
    // Painting one way cancels the other, so add and subtract never fight.
    const other = tool === 'add' ? strokes.sub : tool === 'sub' ? strokes.add : null
    if (other) { const o = ctx2d(other); o.globalCompositeOperation = 'destination-out'; o.lineCap = 'round'; o.lineWidth = size; o.beginPath(); if (last.current) { o.moveTo(last.current.x, last.current.y); o.lineTo(p.x, p.y); o.stroke() } else { o.arc(p.x, p.y, size / 2, 0, Math.PI * 2); o.fill() } o.globalCompositeOperation = 'source-over' }
    last.current = p
    setRev(v => v + 1)
  }

  const apply = async () => {
    setWorking(true)
    await new Promise(r => setTimeout(r, 30))
    const s = useEditor.getState()
    // Final pass at full resolution (capped for very large images, then scaled up).
    const fk = Math.min(1, 3000 / Math.max(W, H))
    const fw = Math.round(W * fk), fh = Math.round(H * fk)
    const src = makeCanvas(fw, fh); ctx2d(src).drawImage(full, 0, 0, fw, fh)
    const img = ctx2d(src, true).getImageData(0, 0, fw, fh)
    const r = refine(img, readAlpha(selCanvas.current, fw, fh), readAlpha(strokes.add, fw, fh), readAlpha(strokes.sub, fw, fh), readAlpha(strokes.band, fw, fh), st, fk, out === 'layer' || out === 'layerMask')
    let alpha = alphaCanvas(r.alpha, fw, fh)
    if (fk < 1) { const big = makeCanvas(W, H), bx = ctx2d(big); bx.imageSmoothingQuality = 'high'; bx.drawImage(alpha, 0, 0, W, H); alpha = big }
    if (out === 'selection') s.setSelection(alpha, 'Select and mask')
    else if (out === 'mask') { const l = s.active(); if (l) { useEditor.setState({ selection: alpha }); s.addMask(l.id, true) } else s.setSelection(alpha, 'Select and mask') }
    else {
      const colors = makeCanvas(fw, fh), cx = ctx2d(colors); const ci = cx.createImageData(fw, fh); ci.data.set(r.colors!); cx.putImageData(ci, 0, 0)
      const layerCanvas = makeCanvas(W, H), lx = ctx2d(layerCanvas); lx.imageSmoothingQuality = 'high'; lx.drawImage(colors, 0, 0, W, H)
      if (out === 'layer') { lx.globalCompositeOperation = 'destination-in'; lx.drawImage(alpha, 0, 0) }
      const l: RasterLayer = { ...base('Refined cut-out'), type: 'raster', canvas: layerCanvas, mask: out === 'layerMask' ? alpha : null }
      s.addLayer(l, 'Select and mask')
    }
    setWorking(false); onClose()
  }

  const set = <K extends keyof Settings>(key: K, v: Settings[K]) => setSt(x => ({ ...x, [key]: v }))
  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-[#0b0b0e]" role="dialog" aria-label="Select and mask">
      <header className="h-11 shrink-0 flex items-center gap-3 px-4 border-b border-white/[0.06] bg-surface-raised">
        <span className="text-[13px] font-semibold">Select and mask</span>
        <span className="text-[12px] text-void-500 hidden md:inline">Paint over hair or fur with the refine brush. The edge is worked out from the colours around it.</span>
        <button aria-label="Close" onClick={onClose} className="ml-auto text-void-400 hover:text-white"><X size={18} /></button>
      </header>
      <div className="flex-1 min-h-0 flex">
        <aside className="w-14 shrink-0 flex flex-col items-center gap-1 py-3 border-r border-white/[0.06] bg-surface-overlay">
          {([['refine', Sparkles, 'Refine edge brush'], ['add', Brush, 'Add to selection'], ['sub', Eraser, 'Remove from selection']] as const).map(([id, I, label]) => (
            <button key={id} aria-label={label} title={label} aria-pressed={tool === id} onClick={() => setTool(id)} className={`w-10 h-10 inline-flex items-center justify-center rounded-lg ${focusRing} ${tool === id ? 'bg-accent text-white' : 'text-void-300 hover:bg-void-800'}`}><I size={18} /></button>
          ))}
        </aside>
        <div ref={box} className="flex-1 min-w-0 flex items-center justify-center p-6 overflow-hidden" style={{ background: mode === 'layers' ? 'repeating-conic-gradient(#2a2a30 0% 25%, #1f1f24 0% 50%) 50% / 20px 20px' : undefined }}>
          <canvas ref={view} className="max-w-full max-h-full shadow-2xl touch-none" style={{ cursor: 'crosshair', aspectRatio: `${pw}/${ph}` }}
            onPointerDown={e => { (e.target as HTMLElement).setPointerCapture(e.pointerId); last.current = null; paint(e) }}
            onPointerMove={e => { if (e.buttons) paint(e) }} onPointerUp={() => { last.current = null }} />
        </div>
        <aside className="w-72 shrink-0 overflow-y-auto p-4 space-y-4 border-l border-white/[0.06] bg-surface-overlay">
          <Select label="View" value={mode} options={[{ id: 'overlay', label: 'Overlay' }, { id: 'black', label: 'On black' }, { id: 'white', label: 'On white' }, { id: 'bw', label: 'Black and white' }, { id: 'layers', label: 'On transparency' }]} onChange={setMode} />
          <Slider label="Brush size" value={size} min={2} max={400} unit="px" onChange={setSize} />
          <Button onClick={async () => { await ai.selectSubject(); selCanvas.current = useEditor.getState().selection; setRev(v => v + 1) }} className="w-full"><Sparkles size={14} />Select subject</Button>
          <div className="pt-2 border-t border-white/[0.06] space-y-3">
            <p className="text-[10.5px] uppercase tracking-wide text-void-500">Edge</p>
            <Slider label="Radius" value={st.radius} min={0} max={100} unit="px" onChange={v => set('radius', v)} />
            <Slider label="Smooth" value={st.smooth} min={0} max={30} unit="px" onChange={v => set('smooth', v)} />
            <Slider label="Feather" value={st.feather} min={0} max={100} unit="px" onChange={v => set('feather', v)} />
            <Slider label="Contrast" value={st.contrast} min={0} max={100} unit="%" onChange={v => set('contrast', v)} />
            <Slider label="Shift edge" value={st.shift} min={-100} max={100} unit="%" onChange={v => set('shift', v)} />
          </div>
          <div className="pt-2 border-t border-white/[0.06] space-y-3">
            <p className="text-[10.5px] uppercase tracking-wide text-void-500">Output</p>
            <label className="flex items-center gap-2 text-[12.5px] text-void-300"><input type="checkbox" checked={st.decon} onChange={e => set('decon', e.target.checked)} />Clean up colour fringes</label>
            {st.decon && <Slider label="Amount" value={st.deconAmount} min={0} max={100} unit="%" onChange={v => set('deconAmount', v)} />}
            <Select label="Send to" value={out} options={[{ id: 'selection', label: 'Selection' }, { id: 'mask', label: 'Layer mask' }, { id: 'layerMask', label: 'New layer with mask' }, { id: 'layer', label: 'New layer' }]} onChange={setOut} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={onClose} className="flex-1">Cancel</Button>
            <Button primary onClick={apply} disabled={working} className="flex-1">{working ? 'Working…' : 'OK'}</Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
