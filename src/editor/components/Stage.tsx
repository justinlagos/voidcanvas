'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  brushTip, cloneCanvas, ctx2d, floodMask, fontString, healRegion, hitLayer, layerBounds, layerCorners, layerSize,
  makeCanvas, maskEdges, renderDoc, type LiveStroke,
} from '../engine'
import { importFiles } from '../io'
import { tipOnce, useEditor } from '../store'
import type { Frame, Layer, Rect, ToolId } from '../types'
import { FloatingBar } from './FloatingBar'
import { frameAt, frameForLayer } from '../frames'

const ACCENT = '#8b7cff'
const PAINT_TOOLS: ToolId[] = ['brush', 'eraser', 'clone', 'heal']
const HANDLES: [number, number][] = [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]]

type Pt = { x: number; y: number }
type Drag =
  | { kind: 'pan'; sx: number; sy: number; px: number; py: number }
  | { kind: 'move'; start: Pt; items: { id: string; ox: number; oy: number }[]; box: Rect; snapX: number[]; snapY: number[]; moved: boolean }
  | { kind: 'resize'; id: string; h: number; l0: Layer; w: number; hgt: number; anchor: Pt }
  | { kind: 'rotate'; id: string; center: Pt; a0: number; r0: number }
  | { kind: 'stroke'; last: Pt; carry: number; snapshot?: HTMLCanvasElement; offset?: Pt; tool: ToolId }
  | { kind: 'box'; tool: ToolId; start: Pt; cur: Pt; pts: Pt[]; add: boolean; sub: boolean }

export const stageApi: { fit: () => void; fitSelection: () => void; fitFrame: () => void; zoomBy: (f: number) => void; zoomTo: (z: number) => void } = {
  fit: () => {}, fitSelection: () => {}, fitFrame: () => {}, zoomBy: () => {}, zoomTo: () => {},
}

export function Stage() {
  const wrap = useRef<HTMLDivElement>(null)
  const viewC = useRef<HTMLCanvasElement>(null)
  const overC = useRef<HTMLCanvasElement>(null)
  const comp = useRef<HTMLCanvasElement | null>(null)
  const live = useRef<LiveStroke | null>(null)
  const drag = useRef<Drag | null>(null)
  const pointers = useRef(new Map<number, Pt>())
  const pinch = useRef<{ d: number; zoom: number; mid: Pt; panX: number; panY: number } | null>(null)
  const cursor = useRef<Pt | null>(null)
  const guides = useRef<{ v: number[]; h: number[] }>({ v: [], h: [] })
  const ants = useRef<{ key: string; canvas: HTMLCanvasElement | null }>({ key: '', canvas: null })
  const antsPhase = useRef(0)
  const space = useRef(false)
  const raf = useRef(0)
  const needComposite = useRef(true)
  const size = useRef({ w: 0, h: 0, dpr: 1 })

  const docRev = useEditor(s => s.docRev)
  const selRev = useEditor(s => s.selRev)
  const view = useEditor(s => s.view)
  const tool = useEditor(s => s.tool)
  const activeId = useEditor(s => s.activeId)
  const crop = useEditor(s => s.crop)
  const docId = useEditor(s => s.doc?.id)
  const optSize = useEditor(s => s.options.size)
  const compare = useEditor(s => s.compare)
  const [busyDrag, setBusyDrag] = useState(false)

  const toDoc = (sx: number, sy: number): Pt => {
    const v = useEditor.getState().view
    return { x: (sx - v.panX) / v.zoom, y: (sy - v.panY) / v.zoom }
  }
  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = wrap.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  // ── Drawing ──────────────────────────────────────────────────────

  const draw = useCallback(() => {
    raf.current = 0
    const s = useEditor.getState()
    const vc = viewC.current, oc = overC.current
    if (!vc || !oc) return
    const { w, h, dpr } = size.current
    const vctx = ctx2d(vc), octx = ctx2d(oc)
    vctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    vctx.clearRect(0, 0, w, h)
    octx.setTransform(dpr, 0, 0, dpr, 0, 0)
    octx.clearRect(0, 0, w, h)
    const doc = s.doc
    if (!doc) return
    const { zoom, panX, panY } = s.view

    if (needComposite.current || live.current) {
      if (!comp.current) comp.current = makeCanvas(1, 1)
      const vs = Math.min(1, 2000 / Math.max(doc.width, doc.height))
      const shown = s.layers.filter(l => l.id !== s.editingTextId && !(s.compare && l.type === 'adjustment'))
      renderDoc(comp.current, doc, shown, { groups: s.groups, scale: vs, live: live.current })
      needComposite.current = false
    }

    const dw = doc.width * zoom, dh = doc.height * zoom
    vctx.save()
    vctx.shadowColor = 'rgba(0,0,0,0.55)'; vctx.shadowBlur = 40; vctx.shadowOffsetY = 12
    vctx.fillStyle = '#fff'; vctx.fillRect(panX, panY, dw, dh)
    vctx.restore()
    // Transparency checkerboard
    vctx.save()
    vctx.beginPath(); vctx.rect(panX, panY, dw, dh); vctx.clip()
    const cs = 10
    vctx.fillStyle = '#e4e4e8'
    const x0 = Math.max(panX, 0), y0 = Math.max(panY, 0), x1 = Math.min(panX + dw, w), y1 = Math.min(panY + dh, h)
    for (let y = Math.floor((y0 - panY) / cs); y * cs + panY < y1; y++)
      for (let x = Math.floor((x0 - panX) / cs); x * cs + panX < x1; x++)
        if ((x + y) % 2) vctx.fillRect(panX + x * cs, panY + y * cs, cs, cs)
    vctx.imageSmoothingEnabled = zoom < 3
    vctx.imageSmoothingQuality = 'high'
    if (comp.current) vctx.drawImage(comp.current, panX, panY, dw, dh)
    vctx.restore()

    // ── Overlay ──
    const toScreen = (p: Pt): Pt => ({ x: p.x * zoom + panX, y: p.y * zoom + panY })

    // Artboard outlines and labels
    if (doc.frames && doc.frames.length) {
      for (const f of doc.frames) {
        const a = toScreen({ x: f.x, y: f.y })
        const fw = f.width * zoom, fh = f.height * zoom
        const on = f.id === s.activeFrameId
        octx.fillStyle = on ? '#fff' : 'rgba(255,255,255,0.55)'
        octx.font = `${on ? '600 ' : ''}${Math.max(11, Math.min(15, 13))}px Inter, sans-serif`
        octx.fillText(f.name, a.x, a.y - 8)
        octx.strokeStyle = on ? ACCENT : 'rgba(255,255,255,0.18)'
        octx.lineWidth = on ? 2 : 1
        octx.strokeRect(a.x, a.y, fw, fh)
      }
    }

    if (s.selection) {
      const key = `${s.selRev}|${zoom}|${panX}|${panY}|${w}x${h}`
      if (ants.current.key !== key) {
        const m = makeCanvas(w, h), mx = ctx2d(m, true)
        mx.imageSmoothingEnabled = zoom < 1
        mx.setTransform(zoom, 0, 0, zoom, panX, panY)
        mx.drawImage(s.selection, 0, 0)
        ants.current = { key, canvas: maskEdges(m) }
      }
      const a = makeCanvas(w, h), ax = ctx2d(a)
      const pat = makeCanvas(8, 8), px = ctx2d(pat)
      px.fillStyle = '#fff'; px.fillRect(0, 0, 8, 8); px.fillStyle = '#000'
      for (let i = 0; i < 8; i++) px.fillRect((i + antsPhase.current) % 8, i, 4, 1)
      ax.fillStyle = ax.createPattern(pat, 'repeat')!; ax.fillRect(0, 0, w, h)
      ax.globalCompositeOperation = 'destination-in'; ax.drawImage(ants.current.canvas!, 0, 0)
      octx.drawImage(a, 0, 0)
    }

    const active = s.active()
    if (s.tool === 'move' && !s.editingTextId) {
      octx.strokeStyle = ACCENT; octx.lineWidth = s.selectedIds.length > 1 ? 1 : 1.5
      for (const l of s.layers) {
        if (!s.selectedIds.includes(l.id) || l.type === 'adjustment' || !l.visible) continue
        const pts = layerCorners(l, doc).map(toScreen)
        octx.beginPath(); pts.forEach((p, i) => (i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y))); octx.closePath(); octx.stroke()
      }
    }
    if (s.tool === 'move' && !s.editingTextId && s.selectedIds.length === 1 && active && active.type !== 'adjustment' && active.visible) {
      octx.strokeStyle = ACCENT; octx.lineWidth = 1.5
      {
      if (!active.locked) {
        const hp = handlePoints(active).map(toScreen)
        const rot = hp[8]
        octx.beginPath(); octx.moveTo(hp[1].x, hp[1].y); octx.lineTo(rot.x, rot.y); octx.stroke()
        hp.forEach((p, i) => {
          octx.beginPath()
          if (i === 8) octx.arc(p.x, p.y, 6, 0, Math.PI * 2); else octx.rect(p.x - 5, p.y - 5, 10, 10)
          octx.fillStyle = '#fff'; octx.fill(); octx.stroke()
        })
      }
      }
    }

    octx.strokeStyle = '#ff4fa3'; octx.lineWidth = 1
    for (const gx of guides.current.v) { const x = gx * zoom + panX; octx.beginPath(); octx.moveTo(x, 0); octx.lineTo(x, h); octx.stroke() }
    for (const gy of guides.current.h) { const y = gy * zoom + panY; octx.beginPath(); octx.moveTo(0, y); octx.lineTo(w, y); octx.stroke() }

    const d = drag.current
    if (d?.kind === 'box') {
      const a = toScreen(d.start), b = toScreen(d.cur)
      octx.setLineDash([5, 4]); octx.strokeStyle = '#fff'; octx.lineWidth = 1.25
      octx.beginPath()
      if (d.tool === 'lasso') d.pts.map(toScreen).forEach((p, i) => (i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y)))
      else if (d.tool === 'gradient' || (d.tool === 'shape' && s.options.shape === 'line')) { octx.moveTo(a.x, a.y); octx.lineTo(b.x, b.y) }
      else if (d.tool === 'ellipse' || (d.tool === 'shape' && s.options.shape === 'ellipse')) octx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2)
      else octx.rect(a.x, a.y, b.x - a.x, b.y - a.y)
      octx.stroke(); octx.strokeStyle = '#000'; octx.lineDashOffset = 5; octx.stroke()
      octx.setLineDash([]); octx.lineDashOffset = 0
    }

    if (s.crop) {
      const a = toScreen({ x: s.crop.x, y: s.crop.y })
      const cw = s.crop.w * zoom, ch = s.crop.h * zoom
      octx.fillStyle = 'rgba(8,8,12,0.62)'
      octx.beginPath(); octx.rect(0, 0, w, h); octx.rect(a.x, a.y, cw, ch); octx.fill('evenodd')
      octx.strokeStyle = '#fff'; octx.lineWidth = 1.5; octx.strokeRect(a.x, a.y, cw, ch)
      octx.lineWidth = 0.5; octx.strokeStyle = 'rgba(255,255,255,0.5)'
      for (let i = 1; i < 3; i++) {
        octx.beginPath(); octx.moveTo(a.x + (cw * i) / 3, a.y); octx.lineTo(a.x + (cw * i) / 3, a.y + ch)
        octx.moveTo(a.x, a.y + (ch * i) / 3); octx.lineTo(a.x + cw, a.y + (ch * i) / 3); octx.stroke()
      }
    }

    if (s.tool === 'clone' && s.cloneSource) {
      const p = toScreen(s.cloneSource)
      octx.strokeStyle = '#fff'; octx.lineWidth = 1.5
      octx.beginPath(); octx.moveTo(p.x - 8, p.y); octx.lineTo(p.x + 8, p.y); octx.moveTo(p.x, p.y - 8); octx.lineTo(p.x, p.y + 8); octx.stroke()
    }
    if (cursor.current && PAINT_TOOLS.includes(s.tool) && !space.current) {
      const r = Math.max(2, (s.options.size * zoom) / 2)
      octx.lineWidth = 1
      octx.strokeStyle = 'rgba(0,0,0,0.7)'; octx.beginPath(); octx.arc(cursor.current.x, cursor.current.y, r + 1, 0, Math.PI * 2); octx.stroke()
      octx.strokeStyle = '#fff'; octx.beginPath(); octx.arc(cursor.current.x, cursor.current.y, r, 0, Math.PI * 2); octx.stroke()
    }
  }, [])

  const invalidate = useCallback((composite = false) => {
    if (composite) needComposite.current = true
    if (!raf.current) raf.current = requestAnimationFrame(draw)
  }, [draw])

  /** 8 resize handles plus the rotate handle (index 8), in document space. */
  function handlePoints(l: Layer): Pt[] {
    const s = useEditor.getState()
    const { w, h } = layerSize(l, s.doc!)
    const m = new DOMMatrix()
      .translate(l.x + (w * l.scaleX) / 2, l.y + (h * l.scaleY) / 2).rotate((l.rotation * 180) / Math.PI)
    const hw = (w * l.scaleX) / 2, hh = (h * l.scaleY) / 2
    const pts = HANDLES.map(([fx, fy]) => m.transformPoint({ x: (fx - 0.5) * 2 * hw, y: (fy - 0.5) * 2 * hh }))
    pts.push(m.transformPoint({ x: 0, y: -hh - 28 / s.view.zoom }))
    return pts.map(p => ({ x: p.x, y: p.y }))
  }

  // ── Sizing, fit, zoom ────────────────────────────────────────────

  const fit = useCallback(() => {
    const { doc, setView } = useEditor.getState()
    if (!doc || !size.current.w) return
    const { w, h } = size.current
    const pad = w < 640 ? 24 : 90
    let bx = 0, by = 0, bw = doc.width, bh = doc.height
    if (doc.frames && doc.frames.length) {
      bx = Math.min(...doc.frames.map(f => f.x)); by = Math.min(...doc.frames.map(f => f.y))
      bw = Math.max(...doc.frames.map(f => f.x + f.width)) - bx; bh = Math.max(...doc.frames.map(f => f.y + f.height)) - by
    }
    const zoom = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 1)
    setView({ zoom, panX: (w - bw * zoom) / 2 - bx * zoom, panY: (h - bh * zoom) / 2 - by * zoom })
  }, [])

  // Fit an arbitrary document-space box into view with padding.
  const fitBox = useCallback((bx: number, by: number, bw: number, bh: number) => {
    const { setView } = useEditor.getState()
    if (!size.current.w || bw <= 0 || bh <= 0) return
    const { w, h } = size.current
    const pad = w < 640 ? 24 : 80
    const zoom = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 4)
    setView({ zoom, panX: (w - bw * zoom) / 2 - bx * zoom, panY: (h - bh * zoom) / 2 - by * zoom })
  }, [])

  const fitSelection = useCallback(() => {
    const { doc, layers, selectedIds } = useEditor.getState()
    if (!doc) return
    const sel = layers.filter(l => selectedIds.includes(l.id) && l.type !== 'adjustment')
    if (!sel.length) { fit(); return }
    const boxes = sel.map(l => layerBounds(l, doc))
    const bx = Math.min(...boxes.map(b => b.x)), by = Math.min(...boxes.map(b => b.y))
    const bw = Math.max(...boxes.map(b => b.x + b.w)) - bx, bh = Math.max(...boxes.map(b => b.y + b.h)) - by
    fitBox(bx - 40, by - 40, bw + 80, bh + 80)
  }, [fit, fitBox])

  const fitFrame = useCallback(() => {
    const { doc, activeFrameId } = useEditor.getState()
    const f = doc?.frames?.find(x => x.id === activeFrameId) ?? doc?.frames?.[0]
    if (!f) { fit(); return }
    fitBox(f.x, f.y, f.width, f.height)
  }, [fit, fitBox])

  const zoomAt = useCallback((factor: number, at?: Pt, absolute?: number) => {
    const { view: v, setView } = useEditor.getState()
    const p = at ?? { x: size.current.w / 2, y: size.current.h / 2 }
    const zoom = Math.min(32, Math.max(0.02, absolute ?? v.zoom * factor))
    const k = zoom / v.zoom
    setView({ zoom, panX: p.x - (p.x - v.panX) * k, panY: p.y - (p.y - v.panY) * k })
  }, [])

  useEffect(() => {
    stageApi.fit = fit
    stageApi.fitSelection = fitSelection
    stageApi.fitFrame = fitFrame
    stageApi.zoomBy = f => zoomAt(f)
    stageApi.zoomTo = z => zoomAt(1, undefined, z)
  }, [fit, fitSelection, fitFrame, zoomAt])

  useEffect(() => {
    const el = wrap.current!
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const first = !size.current.w
      size.current = { w: r.width, h: r.height, dpr }
      for (const c of [viewC.current!, overC.current!]) { c.width = r.width * dpr; c.height = r.height * dpr }
      if (first) fit()
      invalidate()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit, invalidate])

  useEffect(() => { fit() }, [docId, fit])
  useEffect(() => { invalidate(true) }, [docRev, compare, invalidate])
  useEffect(() => { invalidate() }, [selRev, view, tool, activeId, crop, optSize, invalidate])

  useEffect(() => {
    const t = setInterval(() => { if (useEditor.getState().selection) { antsPhase.current = (antsPhase.current + 1) % 8; invalidate() } }, 140)
    return () => clearInterval(t)
  }, [invalidate])

  // Wheel has to be registered as non-passive to stop the page zooming.
  useEffect(() => {
    const el = wrap.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const p = local(e)
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), p)
      else { const v = useEditor.getState().view; useEditor.getState().setView({ panX: v.panX - e.deltaX, panY: v.panY - e.deltaY }) }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    const kd = (e: KeyboardEvent) => { if (e.code === 'Space' && !isTyping(e)) { space.current = true; el.style.cursor = 'grab'; e.preventDefault() } }
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') { space.current = false; el.style.cursor = '' } }
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)
    return () => { el.removeEventListener('wheel', onWheel); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [zoomAt])

  // ── Painting ─────────────────────────────────────────────────────

  function stamp(d: Extract<Drag, { kind: 'stroke' }>, p: Pt, pressure: number) {
    const s = useEditor.getState()
    const L = live.current!; const bctx = ctx2d(L.buffer)
    const sz = Math.max(1, s.options.size * pressure)
    const color = d.tool === 'heal' ? '#ff3b6b' : d.tool === 'brush' && !s.editingMask ? s.fg : '#ffffff'
    const tip = brushTip(sz, s.options.hardness, color)
    if (d.tool === 'clone' && d.snapshot && d.offset) {
      const t = makeCanvas(tip.width, tip.height), tx = ctx2d(t)
      tx.drawImage(tip, 0, 0)
      tx.globalCompositeOperation = 'source-in'
      tx.drawImage(d.snapshot, -(p.x + d.offset.x - tip.width / 2), -(p.y + d.offset.y - tip.height / 2))
      bctx.drawImage(t, p.x - tip.width / 2, p.y - tip.height / 2)
    } else bctx.drawImage(tip, p.x - tip.width / 2, p.y - tip.height / 2)
  }

  function strokeTo(d: Extract<Drag, { kind: 'stroke' }>, p: Pt, pressure: number) {
    const s = useEditor.getState()
    const spacing = Math.max(1, s.options.size * 0.12)
    const dx = p.x - d.last.x, dy = p.y - d.last.y
    const dist = Math.hypot(dx, dy)
    let t = spacing - d.carry
    while (t <= dist) { stamp(d, { x: d.last.x + (dx * t) / dist, y: d.last.y + (dy * t) / dist }, pressure); t += spacing }
    d.carry = dist - (t - spacing)
    d.last = p
    if (s.selection) { const b = ctx2d(live.current!.buffer); b.globalCompositeOperation = 'destination-in'; b.drawImage(s.selection, 0, 0); b.globalCompositeOperation = 'source-over' }
    invalidate()
  }

  function commitStroke(d: Extract<Drag, { kind: 'stroke' }>) {
    const s = useEditor.getState()
    const L = live.current; live.current = null
    if (!L) return
    const layer = s.layers.find(l => l.id === L.layerId); if (!layer) return
    if (L.mode.startsWith('mask')) {
      if (!layer.mask) return
      const m = cloneCanvas(layer.mask), x = ctx2d(m)
      x.globalAlpha = L.opacity
      x.globalCompositeOperation = L.mode === 'mask-hide' ? 'destination-out' : 'source-over'
      x.drawImage(L.buffer, 0, 0)
      s.updateLayer(layer.id, { mask: m }, 'Paint mask')
    } else if (layer.type === 'raster') {
      if (d.tool === 'heal') {
        const out = healRegion(layer.canvas, L.buffer)
        if (out) s.updateLayer(layer.id, { canvas: out }, 'Heal')
        else { s.notify('That area is too large or too close to the edge to heal. Try a smaller spot.'); invalidate(true) }
        return
      }
      const c = cloneCanvas(layer.canvas), x = ctx2d(c)
      x.globalAlpha = L.opacity
      if (L.mode === 'erase') x.globalCompositeOperation = 'destination-out'
      x.drawImage(L.buffer, 0, 0)
      s.updateLayer(layer.id, { canvas: c }, d.tool === 'eraser' ? 'Erase' : d.tool === 'clone' ? 'Clone' : 'Brush')
    }
  }

  // ── Selection helpers ────────────────────────────────────────────

  function applySelection(shape: HTMLCanvasElement, add: boolean, sub: boolean, label: string) {
    const s = useEditor.getState()
    if ((add || sub) && s.selection) {
      const c = cloneCanvas(s.selection), x = ctx2d(c)
      if (sub) x.globalCompositeOperation = 'destination-out'
      x.drawImage(shape, 0, 0)
      s.setSelection(c, label)
    } else s.setSelection(shape, label)
  }

  // ── Pointer events ───────────────────────────────────────────────

  const inEditor = (e: React.PointerEvent) => !!(e.target as HTMLElement).closest('textarea,[data-floating]')

  function onDown(e: React.PointerEvent) {
    if (inEditor(e)) return
    const s = useEditor.getState()
    if (!s.doc) return
    const sp = local(e)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setBusyDrag(true)
    pointers.current.set(e.pointerId, sp)

    if (pointers.current.size === 2) {
      live.current = null; drag.current = null
      const [a, b] = Array.from(pointers.current.values())
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: s.view.zoom, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, panX: s.view.panX, panY: s.view.panY }
      invalidate(true); return
    }

    const p = toDoc(sp.x, sp.y)
    const t = s.tool
    if (space.current || e.button === 1 || t === 'hand') {
      drag.current = { kind: 'pan', sx: sp.x, sy: sp.y, px: s.view.panX, py: s.view.panY }; return
    }
    if (e.button !== 0) return

    if (t === 'zoom') { zoomAt(e.altKey ? 0.6 : 1.6, sp); return }

    if (t === 'eyedropper') {
      const c = comp.current; if (!c) return
      const k = c.width / s.doc.width
      const px = ctx2d(c, true).getImageData(Math.floor(p.x * k), Math.floor(p.y * k), 1, 1).data
      if (px[3] > 0) { const hex = '#' + [px[0], px[1], px[2]].map(v => v.toString(16).padStart(2, '0')).join(''); s.setFg(hex); s.addSwatch(hex) }
      return
    }

    if (t === 'move') {
      const act = s.active()
      if (s.selectedIds.length === 1 && act && act.type !== 'adjustment' && !act.locked && act.visible) {
        const hp = handlePoints(act)
        const tol = 11 / s.view.zoom
        const hi = hp.findIndex(h => Math.hypot(h.x - p.x, h.y - p.y) <= tol)
        if (hi === 8) {
          const cs = layerCorners(act, s.doc)
          const center = { x: (cs[0].x + cs[2].x) / 2, y: (cs[0].y + cs[2].y) / 2 }
          drag.current = { kind: 'rotate', id: act.id, center, a0: Math.atan2(p.y - center.y, p.x - center.x), r0: act.rotation }; return
        }
        if (hi >= 0) {
          const { w, h } = layerSize(act, s.doc)
          const opp = hp[(hi + 4) % 8]
          drag.current = { kind: 'resize', id: act.id, h: hi, l0: act, w, hgt: h, anchor: opp }; return
        }
      }
      const hit = hitLayer(s.layers, p.x, p.y, s.doc, s.groups)
      if (hit && e.detail === 2 && hit.type === 'text') { s.setActive(hit.id); useEditor.setState({ editingTextId: hit.id }); return }
      if (hit && e.shiftKey) { s.toggleSelect(hit.id); invalidate(); return }
      if (hit) {
        if (!s.selectedIds.includes(hit.id)) s.setActive(hit.id)
        const st = useEditor.getState()
        const moving = st.layers.filter(l => st.selectedIds.includes(l.id) && !l.locked && l.type !== 'adjustment')
        const boxes = moving.map(l => layerBounds(l, s.doc!))
        const x0 = Math.min(...boxes.map(b => b.x)), y0 = Math.min(...boxes.map(b => b.y))
        const box = { x: x0, y: y0, w: Math.max(...boxes.map(b => b.x + b.w)) - x0, h: Math.max(...boxes.map(b => b.y + b.h)) - y0 }
        // Things to snap to: the page, and the edges and centres of every other visible layer.
        const snapX = [0, s.doc.width / 2, s.doc.width], snapY = [0, s.doc.height / 2, s.doc.height]
        for (const o of st.layers.slice(-40)) {
          if (st.selectedIds.includes(o.id) || !o.visible || o.type === 'adjustment') continue
          const b = layerBounds(o, s.doc)
          snapX.push(b.x, b.x + b.w / 2, b.x + b.w); snapY.push(b.y, b.y + b.h / 2, b.y + b.h)
        }
        drag.current = { kind: 'move', start: p, items: moving.map(l => ({ id: l.id, ox: l.x, oy: l.y })), box, snapX, snapY, moved: false }
      } else { if (s.doc?.frames?.length) { const f = frameAt(s.doc, p.x, p.y); if (f) s.setActiveFrame(f.id) } if (!e.shiftKey) s.setActive(null) }
      invalidate(); return
    }

    if (PAINT_TOOLS.includes(t)) {
      if (t === 'clone' && e.altKey) { useEditor.setState({ cloneSource: p }); invalidate(); return }
      if (t === 'clone' && !s.cloneSource) { s.notify('Hold Alt (Option) and click to choose where to copy from.'); return }
      const cur = s.active()
      if (t === 'brush' && !s.editingMask && cur?.type === 'raster' && cur.source === 'photo') {
        s.addBlank()
        tipOnce('paint-layer', 'Your brush strokes go on a new layer, so the photo underneath stays untouched.')
      }
      const target = useEditor.getState().ensurePaintable(); if (!target) return
      const st = useEditor.getState()
      const onMask = st.editingMask && !!target.mask
      if (target.type === 'adjustment' && !onMask) return
      if (onMask && (t === 'clone' || t === 'heal')) { s.notify('Switch from the mask to the layer to use this tool.'); return }
      const mode: LiveStroke['mode'] = onMask ? (t === 'eraser' ? 'mask-hide' : 'mask-reveal') : t === 'eraser' ? 'erase' : 'paint'
      live.current = { layerId: target.id, buffer: makeCanvas(st.doc!.width, st.doc!.height), opacity: t === 'heal' ? 0.55 : st.options.opacity, mode }
      const d: Drag = { kind: 'stroke', last: p, carry: 0, tool: t }
      if (t === 'clone' && target.type === 'raster') { d.snapshot = target.canvas; d.offset = { x: st.cloneSource!.x - p.x, y: st.cloneSource!.y - p.y } }
      drag.current = d
      stamp(d, p, e.pointerType === 'pen' ? Math.max(0.15, e.pressure) : 1)
      invalidate(); return
    }

    if (t === 'wand' || t === 'fill') {
      if (p.x < 0 || p.y < 0 || p.x >= s.doc.width || p.y >= s.doc.height) return
      if (t === 'fill' && s.selection) { s.fillSelection(s.fg); return }
      if (t === 'wand') {
        const full = makeCanvas(s.doc.width, s.doc.height)
        renderDoc(full, s.doc, s.layers, { groups: s.groups, noCache: true })
        applySelection(floodMask(full, p.x, p.y, s.options.tolerance, s.options.contiguous), e.shiftKey, e.altKey, 'Magic wand')
      } else {
        const target = s.ensurePaintable(); if (!target || target.type !== 'raster') return
        const m = floodMask(target.canvas, p.x, p.y, s.options.tolerance, s.options.contiguous)
        const x = ctx2d(m); x.globalCompositeOperation = 'source-in'; x.fillStyle = s.fg; x.fillRect(0, 0, m.width, m.height)
        const c = cloneCanvas(target.canvas); ctx2d(c).drawImage(m, 0, 0)
        s.updateLayer(target.id, { canvas: c }, 'Fill')
      }
      return
    }

    if (t === 'text') { s.addText(p.x, p.y); return }

    if (['marquee', 'ellipse', 'lasso', 'shape', 'gradient', 'crop'].includes(t)) {
      if (t === 'crop') useEditor.setState({ crop: null })
      drag.current = { kind: 'box', tool: t, start: p, cur: p, pts: [p], add: e.shiftKey, sub: e.altKey }
    }
  }

  function onMove(e: React.PointerEvent) {
    if (inEditor(e) && !drag.current) return
    const s = useEditor.getState()
    const sp = local(e)
    cursor.current = e.pointerType === 'mouse' || e.pointerType === 'pen' ? sp : null
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, sp)

    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values())
      const pc = pinch.current
      const dist = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const zoom = Math.min(32, Math.max(0.02, pc.zoom * (dist / pc.d))), k = zoom / pc.zoom
      s.setView({ zoom, panX: mid.x - (pc.mid.x - pc.panX) * k, panY: mid.y - (pc.mid.y - pc.panY) * k })
      return
    }

    const d = drag.current
    if (!d || !s.doc) { if (PAINT_TOOLS.includes(s.tool)) invalidate(); return }
    const p = toDoc(sp.x, sp.y)

    if (d.kind === 'pan') { s.setView({ panX: d.px + sp.x - d.sx, panY: d.py + sp.y - d.sy }); return }

    if (d.kind === 'move') {
      let dx = p.x - d.start.x, dy = p.y - d.start.y
      if (!d.moved && Math.hypot(dx, dy) * s.view.zoom < 3) return
      d.moved = true
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0 }
      const tol = 6 / s.view.zoom
      guides.current = { v: [], h: [] }
      if (!e.altKey) {
        const snap = (pos: number, size: number, targets: number[]) => {
          let best: { d: number; g: number } | null = null
          for (const g of targets) for (const off of [0, size / 2, size]) {
            const dd = g - (pos + off)
            if (Math.abs(dd) < tol && (!best || Math.abs(dd) < Math.abs(best.d))) best = { d: dd, g }
          }
          return best
        }
        const sx = dy === 0 && e.shiftKey ? snap(d.box.x + dx, d.box.w, d.snapX) : dx === 0 && e.shiftKey ? null : snap(d.box.x + dx, d.box.w, d.snapX)
        const sy = dx === 0 && e.shiftKey ? snap(d.box.y + dy, d.box.h, d.snapY) : dy === 0 && e.shiftKey ? null : snap(d.box.y + dy, d.box.h, d.snapY)
        if (sx) { dx += sx.d; guides.current.v.push(sx.g) }
        if (sy) { dy += sy.d; guides.current.h.push(sy.g) }
      }
      for (const it of d.items) s.updateLayer(it.id, { x: it.ox + dx, y: it.oy + dy })
      return
    }

    if (d.kind === 'rotate') {
      let r = d.r0 + Math.atan2(p.y - d.center.y, p.x - d.center.x) - d.a0
      if (e.shiftKey) r = Math.round(r / (Math.PI / 12)) * (Math.PI / 12)
      const l = s.layers.find(x => x.id === d.id); if (!l) return
      s.updateLayer(d.id, { rotation: Math.abs(r) < 0.02 ? 0 : r }); return
    }

    if (d.kind === 'resize') {
      const [fx, fy] = HANDLES[d.h]
      const l0 = d.l0, cos = Math.cos(-l0.rotation), sin = Math.sin(-l0.rotation)
      const vx = p.x - d.anchor.x, vy = p.y - d.anchor.y
      const ux = vx * cos - vy * sin, uy = vx * sin + vy * cos
      const dirX = fx === 0 ? -1 : fx === 1 ? 1 : 0, dirY = fy === 0 ? -1 : fy === 1 ? 1 : 0
      const w0 = d.w * l0.scaleX, h0 = d.hgt * l0.scaleY
      let nw = dirX ? Math.max(4, ux * dirX) : w0, nh = dirY ? Math.max(4, uy * dirY) : h0
      const corner = dirX !== 0 && dirY !== 0
      const proportional = corner ? !e.shiftKey || l0.type === 'text' : l0.type === 'text'
      if (proportional) {
        const k = corner ? Math.max(nw / w0, nh / h0) : dirX ? nw / w0 : nh / h0
        nw = w0 * k; nh = h0 * k
      }
      const cxl = (dirX * nw) / 2, cyl = (dirY * nh) / 2
      const c2 = Math.cos(l0.rotation), s2 = Math.sin(l0.rotation)
      const cx = d.anchor.x + cxl * c2 - cyl * s2, cy = d.anchor.y + cxl * s2 + cyl * c2
      s.updateLayer(d.id, { scaleX: nw / d.w, scaleY: nh / d.hgt, x: cx - nw / 2, y: cy - nh / 2 }); return
    }

    if (d.kind === 'stroke') {
      const events = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? []
      const pr = e.pointerType === 'pen' ? Math.max(0.15, e.pressure) : 1
      if (events.length > 1) for (const ce of events) { const q = local(ce); strokeTo(d, toDoc(q.x, q.y), pr) }
      else strokeTo(d, p, pr)
      return
    }

    if (d.kind === 'box') {
      let cur = p
      const aspect = d.tool === 'crop' ? s.options.cropAspect : null
      if ((e.shiftKey && d.tool !== 'lasso' && d.tool !== 'gradient' && !d.add) || aspect) {
        const a = aspect ?? 1
        const dx = p.x - d.start.x, dy = p.y - d.start.y
        const wv = Math.max(Math.abs(dx), Math.abs(dy) * a)
        cur = { x: d.start.x + Math.sign(dx || 1) * wv, y: d.start.y + (Math.sign(dy || 1) * wv) / a }
      }
      d.cur = cur
      if (d.tool === 'lasso') d.pts.push(p)
      if (d.tool === 'crop') useEditor.setState({ crop: normRect(d.start, cur, s.doc) })
      invalidate()
    }
  }

  function normRect(a: Pt, b: Pt, doc?: { width: number; height: number }): Rect {
    let x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y), x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y)
    if (doc) { x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(doc.width, x1); y1 = Math.min(doc.height, y1) }
    return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) }
  }

  function onUp(e: React.PointerEvent) {
    setBusyDrag(false)
    pointers.current.delete(e.pointerId)
    if (pinch.current) { if (pointers.current.size < 2) pinch.current = null; return }
    const s = useEditor.getState()
    const d = drag.current; drag.current = null
    guides.current = { v: [], h: [] }
    if (!d || !s.doc) { invalidate(); return }

    if (d.kind === 'move' && d.moved) {
      if (s.doc?.frames?.length) {
        for (const it of d.items) { const l = s.layers.find(x => x.id === it.id); if (!l) continue; const f = frameForLayer(s.doc, l); if ((f?.id ?? null) !== (l.frameId ?? null)) s.reassignLayerFrame(l.id, f?.id ?? null) }
        const act = s.active(); if (act) { const f = frameForLayer(s.doc, act); if (f) s.setActiveFrame(f.id) }
      }
      s.commit('Move')
    }
    if (d.kind === 'rotate') s.commit('Rotate')
    if (d.kind === 'resize') {
      // Bake scale into real dimensions so strokes and type stay crisp and predictable.
      const l = s.layers.find(x => x.id === d.id)
      if (l?.type === 'shape') s.updateLayer(l.id, { w: l.w * l.scaleX, h: l.h * l.scaleY, scaleX: 1, scaleY: 1 })
      if (l?.type === 'text') {
        const before = layerSize(l), cx = l.x + (before.w * l.scaleX) / 2, cy = l.y + (before.h * l.scaleY) / 2
        const next = { ...l, fontSize: Math.max(4, Math.round(l.fontSize * l.scaleX)), scaleX: 1, scaleY: 1 }
        const after = layerSize(next)
        s.updateLayer(l.id, { fontSize: next.fontSize, scaleX: 1, scaleY: 1, x: cx - after.w / 2, y: cy - after.h / 2 })
      }
      s.commit('Resize')
    }
    if (d.kind === 'stroke') commitStroke(d)

    if (d.kind === 'box') {
      const r = normRect(d.start, d.cur)
      const tiny = Math.hypot(d.cur.x - d.start.x, d.cur.y - d.start.y) * s.view.zoom < 4
      if (d.tool === 'crop') { if (tiny) useEditor.setState({ crop: null }) }
      else if (d.tool === 'shape') {
        const kind = s.options.shape
        if (tiny) s.addShape(kind, d.start.x - 150, d.start.y - (kind === 'line' ? 3 : 150), 300, kind === 'line' ? 6 : 300)
        else if (kind === 'line') {
          const len = Math.hypot(d.cur.x - d.start.x, d.cur.y - d.start.y)
          const id = s.addShape('line', (d.start.x + d.cur.x) / 2 - len / 2, (d.start.y + d.cur.y) / 2 - 3, len, 6)
          useEditor.getState().updateLayer(id, { rotation: Math.atan2(d.cur.y - d.start.y, d.cur.x - d.start.x) })
        } else s.addShape(kind, r.x, r.y, Math.max(4, r.w), Math.max(4, r.h))
        s.setTool('move')
      } else if (d.tool === 'gradient') {
        if (!tiny) {
          const target = s.ensurePaintable()
          if (target?.type === 'raster') {
            const g = makeCanvas(s.doc.width, s.doc.height), gx = ctx2d(g)
            const grad = gx.createLinearGradient(d.start.x, d.start.y, d.cur.x, d.cur.y)
            grad.addColorStop(0, s.fg); grad.addColorStop(1, s.bg)
            gx.fillStyle = grad; gx.globalAlpha = s.options.opacity; gx.fillRect(0, 0, g.width, g.height)
            if (s.selection) { gx.globalAlpha = 1; gx.globalCompositeOperation = 'destination-in'; gx.drawImage(s.selection, 0, 0) }
            const c = cloneCanvas(target.canvas); ctx2d(c).drawImage(g, 0, 0)
            s.updateLayer(target.id, { canvas: c }, 'Gradient')
          }
        }
      } else {
        if (tiny && !d.add && !d.sub) { if (s.selection) s.setSelection(null, 'Deselect') }
        else {
          const m = makeCanvas(s.doc.width, s.doc.height), mx = ctx2d(m)
          mx.fillStyle = '#fff'; mx.beginPath()
          if (d.tool === 'lasso') d.pts.forEach((q, i) => (i ? mx.lineTo(q.x, q.y) : mx.moveTo(q.x, q.y)))
          else if (d.tool === 'ellipse') mx.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2)
          else mx.rect(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h))
          mx.fill()
          applySelection(m, d.add, d.sub, 'Select')
        }
      }
    }
    invalidate(true)
  }

  const cursorFor = (t: ToolId) =>
    PAINT_TOOLS.includes(t) ? 'none' : t === 'hand' ? 'grab' : t === 'zoom' ? 'zoom-in' : t === 'text' ? 'text' : t === 'move' ? 'default' : 'crosshair'

  return (
    <div
      ref={wrap}
      className="relative flex-1 min-w-0 min-h-0 overflow-hidden bg-[#131318] touch-none select-none"
      style={{ cursor: cursorFor(tool) }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={() => { cursor.current = null; invalidate() }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); importFiles(Array.from(e.dataTransfer.files)) }}
      onContextMenu={e => e.preventDefault()}
      role="application"
      aria-label="Design canvas"
    >
      <canvas ref={viewC} className="absolute inset-0 w-full h-full" />
      <canvas ref={overC} className="absolute inset-0 w-full h-full pointer-events-none" />
      <TextEditor />
      {!busyDrag && <FloatingBar />}
      {compare && <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white text-void-950 text-[12px] font-medium pointer-events-none">Before: adjustments and filters hidden</div>}
    </div>
  )
}

export function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
}

/** Type straight onto the canvas. Sits exactly over the text layer, which is hidden while this is open. */
function TextEditor() {
  const id = useEditor(s => s.editingTextId)
  const layer = useEditor(s => s.layers.find(l => l.id === s.editingTextId))
  const view = useEditor(s => s.view)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!id) { setReady(false); return }
    // Focus after the click that opened the editor has finished, or the browser takes focus back.
    const t = setTimeout(() => { setReady(true); ref.current?.focus(); ref.current?.select() }, 60)
    return () => clearTimeout(t)
  }, [id])
  if (!layer || layer.type !== 'text') return null
  const { w, h } = layerSize(layer)
  const k = view.zoom
  const close = () => { if (!ready) return; useEditor.setState({ editingTextId: null }); useEditor.getState().commit('Edit text') }
  return (
    <textarea
      ref={ref} value={layer.text} spellCheck={false} aria-label="Edit text"
      onChange={e => useEditor.getState().updateLayer(layer.id, { text: e.target.value })}
      onBlur={close}
      onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) (e.target as HTMLTextAreaElement).blur() }}
      style={{
        position: 'absolute', left: view.panX + layer.x * k, top: view.panY + layer.y * k,
        width: w * layer.scaleX * k + 4, height: h * layer.scaleY * k + 4,
        transform: `rotate(${layer.rotation}rad)`, transformOrigin: `${(w * layer.scaleX * k) / 2}px ${(h * layer.scaleY * k) / 2}px`,
        font: fontString({ ...layer, fontSize: layer.fontSize * layer.scaleX * k }), lineHeight: layer.lineHeight, letterSpacing: layer.letterSpacing * k,
        color: layer.color, textAlign: layer.align, padding: 2 * k, margin: 0, border: 0, background: 'transparent', resize: 'none',
        overflow: 'hidden', whiteSpace: 'pre', outline: '1.5px solid #8b7cff', outlineOffset: 2, caretColor: '#8b7cff', cursor: 'text',
      }}
    />
  )
}
