'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  brushTip, cloneCanvas, ctx2d, floodMask, fontString, healRegion, hitLayer, layerBounds, layerCorners, layerMatrix, layerSize,
  makeCanvas, maskEdges, polygonPoints, renderDoc, toneStroke, tracePath, type LiveStroke,
} from '../engine'
import { importFiles } from '../io'
import { groupChain, tipOnce, useEditor } from '../store'
import type { Layer, PathNode, Rect, SubPath, ToolId, VectorPath } from '../types'
import { useUi } from '../ui-store'
import { FloatingBar } from './FloatingBar'
import { frameAt, frameForLayer } from '../frames'
import * as ops from '../ops'

const ACCENT = '#8b7cff'
const GUIDE = '#29d3ff'
const PATH = '#29d3ff'
const RULER = 20
const PAINT_TOOLS: ToolId[] = ['brush', 'eraser', 'clone', 'heal', 'remove', 'dodge', 'burn', 'sponge']
const HANDLES: [number, number][] = [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]]

type Pt = { x: number; y: number }
type Drag =
  | { kind: 'pan'; sx: number; sy: number; px: number; py: number }
  | { kind: 'move'; start: Pt; items: { id: string; ox: number; oy: number }[]; box: Rect; snapX: number[]; snapY: number[]; siblings: Rect[]; moved: boolean }
  | { kind: 'select'; start: Pt; cur: Pt; add: boolean; base: string[] }
  | { kind: 'gresize'; anchor: Pt; box: Rect; items: { id: string; l: Layer }[] }
  | { kind: 'resize'; id: string; h: number; l0: Layer; w: number; hgt: number; anchor: Pt }
  | { kind: 'rotate'; id: string; center: Pt; a0: number; r0: number }
  | { kind: 'stroke'; last: Pt; smooth: Pt; carry: number; snapshot?: HTMLCanvasElement; offset?: Pt; tool: ToolId; quick?: boolean }
  | { kind: 'box'; tool: ToolId; start: Pt; cur: Pt; pts: Pt[]; mode: 'new' | 'add' | 'sub' | 'intersect' }
  | { kind: 'guide'; axis: 'v' | 'h'; index: number; pos: number }
  | { kind: 'tcorner'; index: number; start: Pt; quad0: Pt[]; grid0: Pt[] | null; warp: boolean }
  | { kind: 'tmove'; start: Pt; quad0: Pt[]; grid0: Pt[] | null }
  | { kind: 'pen'; pathId: string; sub: number; idx: number; start: Pt; alt: boolean }
  | { kind: 'pnode'; pathId: string; sub: number; idx: number; part: 'node' | 'in' | 'out'; alt: boolean }

export const stageApi: {
  fit: () => void; fitSelection: () => void; fitFrame: () => void; zoomBy: (f: number) => void; zoomTo: (z: number) => void
  /** Enter and Escape for multi-click tools (pen, polygonal lasso). Return true when handled. */
  enter: () => boolean; escape: () => boolean; deleteNode: () => boolean
} = { fit: () => {}, fitSelection: () => {}, fitFrame: () => {}, zoomBy: () => {}, zoomTo: () => {}, enter: () => false, escape: () => false, deleteNode: () => false }

// ─── Path helpers ──────────────────────────────────────────────────

function withPath(pathId: string, fn: (p: VectorPath) => VectorPath) {
  const s = useEditor.getState(); if (!s.doc) return
  const paths = (s.doc.paths ?? []).map(p => (p.id === pathId ? fn(p) : p))
  s.setDoc({ paths })
}
function setNode(sp: SubPath[], sub: number, idx: number, n: PathNode): SubPath[] {
  return sp.map((x, i) => (i === sub ? { ...x, nodes: x.nodes.map((m, j) => (j === idx ? n : m)) } : x))
}
function pathOf(p: VectorPath) { const p2 = new Path2D(); tracePath(p2 as any, p.subpaths); return p2 }

export function Stage() {
  const wrap = useRef<HTMLDivElement>(null)
  const viewC = useRef<HTMLCanvasElement>(null)
  const overC = useRef<HTMLCanvasElement>(null)
  const comp = useRef<HTMLCanvasElement | null>(null)
  const chanView = useRef<{ key: string; canvas: HTMLCanvasElement | null }>({ key: '', canvas: null })
  const live = useRef<LiveStroke | null>(null)
  const drag = useRef<Drag | null>(null)
  const pointers = useRef(new Map<number, Pt>())
  const pinch = useRef<{ d: number; zoom: number; mid: Pt; panX: number; panY: number; t: number; moved: boolean; count: number } | null>(null)
  const cursor = useRef<Pt | null>(null)
  const snapLines = useRef<{ v: number[]; h: number[] }>({ v: [], h: [] })
  const dist = useRef<{ x: number; y: number; w: number; h: number; px: number; axis: 'h' | 'v' }[]>([])
  const ants = useRef<{ key: string; canvas: HTMLCanvasElement | null }>({ key: '', canvas: null })
  const antsPhase = useRef(0)
  const space = useRef(false)
  const raf = useRef(0)
  const needComposite = useRef(true)
  const size = useRef({ w: 0, h: 0, dpr: 1 })
  const poly = useRef<Pt[] | null>(null)
  const penSub = useRef<{ pathId: string; sub: number } | null>(null)
  const selNode = useRef<{ pathId: string; sub: number; idx: number } | null>(null)
  const tfSrc = useRef<{ id: string; rev: number; canvas: HTMLCanvasElement } | null>(null)
  const penSeen = useRef(false)
  const lastPointer = useRef(0)

  const docRev = useEditor(s => s.docRev)
  const editingTextId = useEditor(s => s.editingTextId)
  const selRev = useEditor(s => s.selRev)
  const view = useEditor(s => s.view)
  const tool = useEditor(s => s.tool)
  const activeId = useEditor(s => s.activeId)
  const crop = useEditor(s => s.crop)
  const docId = useEditor(s => s.doc?.id)
  const optSize = useEditor(s => s.options.size)
  const compare = useEditor(s => s.compare)
  const transform = useEditor(s => s.transform)
  const quickMask = useEditor(s => s.quickMask)
  const viewChannel = useEditor(s => s.viewChannel)
  const activePathId = useEditor(s => s.activePathId)
  const showRulers = useUi(s => s.showRulers)
  const showGuides = useUi(s => s.showGuides)
  const pixelGrid = useUi(s => s.pixelGrid)
  const showContextBar = useUi(s => s.showContextBar)
  const [busyDrag, setBusyDrag] = useState(false)

  const toDoc = (sx: number, sy: number): Pt => {
    const v = useEditor.getState().view
    return { x: (sx - v.panX) / v.zoom, y: (sy - v.panY) / v.zoom }
  }
  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = wrap.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const rulerSize = () => (useUi.getState().showRulers && size.current.w >= 600 ? RULER : 0)

  // ── Drawing ──────────────────────────────────────────────────────

  const draw = useCallback(() => {
    raf.current = 0
    const s = useEditor.getState()
    const ui = useUi.getState()
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
    const tf = s.transform

    if (needComposite.current || live.current) {
      if (!comp.current) comp.current = makeCanvas(1, 1)
      const vs = Math.min(1, 2000 / Math.max(doc.width, doc.height))
      const shown = s.layers.filter(l => l.id !== s.editingTextId && !(s.compare && l.type === 'adjustment') && !(tf && l.id === tf.layerId))
      renderDoc(comp.current, doc, shown, { groups: s.groups, scale: vs, live: live.current && live.current.mode !== 'overlay' ? live.current : null, noShadow: !!doc.frames?.length })
      needComposite.current = false
    }
    let shownComp = comp.current
    if (s.viewChannel !== 'rgb' && comp.current) shownComp = channelImage(comp.current)

    const dw = doc.width * zoom, dh = doc.height * zoom
    const cs = 10
    const checker = (rx: number, ry: number, rw: number, rh: number) => {
      vctx.save(); vctx.beginPath(); vctx.rect(rx, ry, rw, rh); vctx.clip()
      vctx.fillStyle = '#ffffff'; vctx.fillRect(rx, ry, rw, rh)
      vctx.fillStyle = '#e4e4e8'
      const x0 = Math.max(rx, 0), y0 = Math.max(ry, 0), x1 = Math.min(rx + rw, w), y1 = Math.min(ry + rh, h)
      for (let y = Math.floor((y0 - ry) / cs); y * cs + ry < y1; y++)
        for (let x = Math.floor((x0 - rx) / cs); x * cs + rx < x1; x++)
          if ((x + y) % 2) vctx.fillRect(rx + x * cs, ry + y * cs, cs, cs)
      vctx.restore()
    }
    if (doc.frames && doc.frames.length) {
      for (const f of doc.frames) {
        const fx = panX + f.x * zoom, fy = panY + f.y * zoom, fw = f.width * zoom, fh = f.height * zoom
        if (fx > w || fy > h || fx + fw < 0 || fy + fh < 0) continue
        vctx.save()
        vctx.shadowColor = 'rgba(0,0,0,0.55)'; vctx.shadowBlur = 32; vctx.shadowOffsetY = 10
        vctx.fillStyle = f.background ?? '#ffffff'; vctx.fillRect(fx, fy, fw, fh)
        vctx.restore()
        if (!f.background) checker(fx, fy, fw, fh)
      }
      vctx.save()
      vctx.imageSmoothingEnabled = zoom < 3
      vctx.imageSmoothingQuality = 'high'
      if (shownComp) vctx.drawImage(shownComp, panX, panY, dw, dh)
      vctx.restore()
    } else {
      vctx.save()
      vctx.shadowColor = 'rgba(0,0,0,0.55)'; vctx.shadowBlur = 40; vctx.shadowOffsetY = 12
      vctx.fillStyle = '#fff'; vctx.fillRect(panX, panY, dw, dh)
      vctx.restore()
      checker(panX, panY, dw, dh)
      vctx.save()
      vctx.beginPath(); vctx.rect(panX, panY, dw, dh); vctx.clip()
      vctx.imageSmoothingEnabled = zoom < 3
      vctx.imageSmoothingQuality = 'high'
      if (shownComp) vctx.drawImage(shownComp, panX, panY, dw, dh)
      vctx.restore()
    }

    const toScreen = (p: Pt): Pt => ({ x: p.x * zoom + panX, y: p.y * zoom + panY })

    // Live preview of a free transform or warp.
    if (tf) {
      const l = s.layers.find(x => x.id === tf.layerId)
      if (l) {
        if (!tfSrc.current || tfSrc.current.id !== l.id || tfSrc.current.rev !== l.rev) tfSrc.current = { id: l.id, rev: l.rev, canvas: ops.layerSource(l, doc) }
        vctx.save(); vctx.globalAlpha = l.opacity
        ops.warpInto(vctx, tfSrc.current.canvas, tf, tf.mode === 'warp' ? 12 : 8, toScreen)
        vctx.restore()
      }
    }

    // Pixel grid at high zoom, for pixel-exact work.
    if (ui.pixelGrid && zoom >= 8) {
      octx.save(); octx.strokeStyle = 'rgba(128,128,140,0.35)'; octx.lineWidth = 1; octx.beginPath()
      const x0 = Math.max(0, Math.floor(-panX / zoom)), x1 = Math.min(doc.width, Math.ceil((w - panX) / zoom))
      const y0 = Math.max(0, Math.floor(-panY / zoom)), y1 = Math.min(doc.height, Math.ceil((h - panY) / zoom))
      for (let x = x0; x <= x1; x++) { const sx = Math.round(x * zoom + panX) + 0.5; octx.moveTo(sx, Math.max(0, panY)); octx.lineTo(sx, Math.min(h, panY + dh)) }
      for (let y = y0; y <= y1; y++) { const sy = Math.round(y * zoom + panY) + 0.5; octx.moveTo(Math.max(0, panX), sy); octx.lineTo(Math.min(w, panX + dw), sy) }
      octx.stroke(); octx.restore()
    }

    if (doc.frames && doc.frames.length) {
      for (const f of doc.frames) {
        const a = toScreen({ x: f.x, y: f.y })
        const fw = f.width * zoom, fh = f.height * zoom
        const on = f.id === s.activeFrameId
        octx.strokeStyle = on ? ACCENT : 'rgba(255,255,255,0.08)'
        octx.lineWidth = on ? 1.5 : 1
        octx.strokeRect(a.x - 0.5, a.y - 0.5, fw + 1, fh + 1)
        const label = f.name, dim = `${f.width}×${f.height}`
        octx.font = `600 12px Inter, sans-serif`
        const nameW = octx.measureText(label).width
        octx.font = `500 11px Inter, sans-serif`
        const dimW = octx.measureText(dim).width
        const padX = 8, gap = 8, badgeH = 20, badgeW = padX * 2 + nameW + gap + dimW
        const by = a.y - badgeH - 7
        octx.fillStyle = on ? ACCENT : 'rgba(30,30,36,0.92)'
        octx.beginPath(); octx.roundRect(a.x, by, badgeW, badgeH, 6); octx.fill()
        octx.textBaseline = 'middle'
        octx.font = `600 12px Inter, sans-serif`
        octx.fillStyle = on ? '#fff' : 'rgba(255,255,255,0.9)'
        octx.fillText(label, a.x + padX, by + badgeH / 2 + 0.5)
        octx.font = `500 11px Inter, sans-serif`
        octx.fillStyle = on ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)'
        octx.fillText(dim, a.x + padX + nameW + gap, by + badgeH / 2 + 0.5)
        octx.textBaseline = 'alphabetic'
      }
    }

    // Quick mask: everything outside the selection is tinted red.
    if (s.quickMask && s.selection) {
      const q = makeCanvas(w, h), qx = ctx2d(q)
      qx.fillStyle = 'rgba(255,40,80,0.5)'; qx.fillRect(panX, panY, dw, dh)
      qx.setTransform(zoom, 0, 0, zoom, panX, panY)
      qx.globalCompositeOperation = 'destination-out'; qx.drawImage(s.selection, 0, 0)
      const L = live.current
      if (L && L.layerId === '__qm__') {
        const d = drag.current
        if (d?.kind === 'stroke' && d.tool === 'eraser') { qx.globalCompositeOperation = 'source-over'; const t = makeCanvas(L.buffer.width, L.buffer.height), tx = ctx2d(t); tx.drawImage(L.buffer, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = 'rgba(255,40,80,0.5)'; tx.fillRect(0, 0, t.width, t.height); qx.globalAlpha = L.opacity; qx.drawImage(t, 0, 0) }
        else { qx.globalAlpha = L.opacity; qx.drawImage(L.buffer, 0, 0) }
      }
      octx.drawImage(q, 0, 0, w, h)
    } else if (s.selection) {
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

    // Overlay strokes (remove, dodge, burn, sponge) show where you painted.
    if (live.current && live.current.mode === 'overlay' && live.current.layerId !== '__qm__') {
      const t = makeCanvas(w, h), tx = ctx2d(t)
      tx.setTransform(zoom, 0, 0, zoom, panX, panY); tx.drawImage(live.current.buffer, 0, 0)
      tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'source-in'
      const d = drag.current
      tx.fillStyle = d?.kind === 'stroke' && d.tool === 'burn' ? 'rgba(0,0,0,0.45)' : d?.kind === 'stroke' && d.tool === 'dodge' ? 'rgba(255,255,255,0.45)' : 'rgba(255,60,120,0.45)'
      tx.fillRect(0, 0, w, h)
      octx.drawImage(t, 0, 0)
    }

    const active = s.active()
    const showTf = s.options.showTransform !== false
    if (s.tool === 'move' && !s.editingTextId && !tf) {
      octx.strokeStyle = ACCENT; octx.lineWidth = s.selectedIds.length > 1 ? 1 : 1.5
      for (const l of s.layers) {
        if (!s.selectedIds.includes(l.id) || l.type === 'adjustment' || !l.visible) continue
        const pts = layerCorners(l, doc).map(toScreen)
        octx.beginPath(); pts.forEach((p, i) => (i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y))); octx.closePath(); octx.stroke()
      }
      const gb = selectionBox()
      if (gb && showTf) {
        const c = boxHandles(gb).map(toScreen)
        octx.strokeStyle = ACCENT; octx.lineWidth = 1.5
        octx.beginPath(); c.forEach((p, i) => (i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y))); octx.closePath(); octx.stroke()
        octx.fillStyle = '#fff'; octx.strokeStyle = ACCENT; octx.lineWidth = 1.5
        for (const p of c) { octx.beginPath(); octx.rect(p.x - 4, p.y - 4, 8, 8); octx.fill(); octx.stroke() }
      }
    }
    if (s.tool === 'move' && showTf && !tf && !s.editingTextId && s.selectedIds.length === 1 && active && active.type !== 'adjustment' && active.visible && !active.locked && !active.lockPosition) {
      octx.strokeStyle = ACCENT; octx.lineWidth = 1.5
      const hp = handlePoints(active).map(toScreen)
      const rot = hp[8]
      octx.beginPath(); octx.moveTo(hp[1].x, hp[1].y); octx.lineTo(rot.x, rot.y); octx.stroke()
      hp.forEach((p, i) => {
        octx.beginPath()
        if (i === 8) octx.arc(p.x, p.y, 6, 0, Math.PI * 2); else octx.rect(p.x - 5, p.y - 5, 10, 10)
        octx.fillStyle = active.type === 'text' && active.boxWidth && (i === 3 || i === 7) ? ACCENT : '#fff'; octx.fill(); octx.stroke()
      })
    }

    // Transform session handles.
    if (tf) {
      const q = tf.quad.map(toScreen)
      octx.strokeStyle = ACCENT; octx.lineWidth = 1.25
      if (tf.grid) {
        // Mesh preview lines of the warp.
        octx.beginPath()
        for (let k = 0; k <= 6; k++) {
          for (let j = 0; j <= 20; j++) { const p = toScreen(ops.warpPoint(tf, k / 6, j / 20)); j ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y) }
          for (let j = 0; j <= 20; j++) { const p = toScreen(ops.warpPoint(tf, j / 20, k / 6)); j ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y) }
        }
        octx.stroke()
        octx.strokeStyle = 'rgba(139,124,255,0.5)'; octx.beginPath()
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const p = toScreen(tf.grid[r * 4 + c]); if (c) { const pp = toScreen(tf.grid[r * 4 + c - 1]); octx.moveTo(pp.x, pp.y); octx.lineTo(p.x, p.y) } if (r) { const pp = toScreen(tf.grid[(r - 1) * 4 + c]); octx.moveTo(pp.x, pp.y); octx.lineTo(p.x, p.y) } }
        octx.stroke()
        for (const g of tf.grid) { const p = toScreen(g); octx.beginPath(); octx.arc(p.x, p.y, 5, 0, Math.PI * 2); octx.fillStyle = '#fff'; octx.fill(); octx.strokeStyle = ACCENT; octx.stroke() }
      } else {
        octx.beginPath(); q.forEach((p, i) => (i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y))); octx.closePath(); octx.stroke()
        for (const p of q) { octx.beginPath(); octx.rect(p.x - 5, p.y - 5, 10, 10); octx.fillStyle = '#fff'; octx.fill(); octx.stroke() }
      }
    }

    // Vector paths: the active one with its anchor points and handles.
    const ap = s.doc?.paths?.find(p => p.id === s.activePathId)
    if (ap && (s.tool === 'pen' || s.tool === 'pathselect' || s.activePathId)) {
      octx.save(); octx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * panX, dpr * panY)
      octx.strokeStyle = PATH; octx.lineWidth = 1.5 / zoom
      octx.beginPath(); tracePath(octx, ap.subpaths); octx.stroke(); octx.restore()
      if (s.tool === 'pen' || s.tool === 'pathselect') {
        ap.subpaths.forEach((sp, si) => sp.nodes.forEach((n, ni) => {
          const p = toScreen(n)
          const isSel = selNode.current?.pathId === ap.id && selNode.current.sub === si && selNode.current.idx === ni
          const isLast = penSub.current?.pathId === ap.id && penSub.current.sub === si && ni === sp.nodes.length - 1
          if (isSel || isLast || s.tool === 'pathselect') {
            for (const [hx, hy] of [[n.inX, n.inY], [n.outX, n.outY]] as const) {
              if (hx === n.x && hy === n.y) continue
              const hp = toScreen({ x: hx, y: hy })
              octx.strokeStyle = PATH; octx.lineWidth = 1; octx.beginPath(); octx.moveTo(p.x, p.y); octx.lineTo(hp.x, hp.y); octx.stroke()
              octx.beginPath(); octx.arc(hp.x, hp.y, 3.5, 0, Math.PI * 2); octx.fillStyle = PATH; octx.fill()
            }
          }
          octx.beginPath(); octx.rect(p.x - 4, p.y - 4, 8, 8); octx.fillStyle = isSel ? PATH : '#fff'; octx.fill(); octx.strokeStyle = PATH; octx.lineWidth = 1.25; octx.stroke()
        }))
        // Rubber band from the last point to the pointer while drawing.
        const cur = penSub.current && cursor.current && s.tool === 'pen' ? ap.subpaths[penSub.current.sub] : null
        if (cur && cur.nodes.length && !drag.current) {
          const last = cur.nodes[cur.nodes.length - 1], a = toScreen(last), c = cursor.current!
          const o = toScreen({ x: last.outX, y: last.outY })
          octx.setLineDash([4, 4]); octx.strokeStyle = PATH; octx.beginPath(); octx.moveTo(a.x, a.y); octx.bezierCurveTo(o.x, o.y, c.x, c.y, c.x, c.y); octx.stroke(); octx.setLineDash([])
        }
      }
    }

    // Ruler guides.
    if (ui.showGuides && doc.guides) {
      octx.strokeStyle = GUIDE; octx.lineWidth = 1
      for (const gx of doc.guides.v) { const x = Math.round(gx * zoom + panX) + 0.5; octx.beginPath(); octx.moveTo(x, 0); octx.lineTo(x, h); octx.stroke() }
      for (const gy of doc.guides.h) { const y = Math.round(gy * zoom + panY) + 0.5; octx.beginPath(); octx.moveTo(0, y); octx.lineTo(w, y); octx.stroke() }
    }
    const d = drag.current
    if (d?.kind === 'guide') {
      octx.strokeStyle = GUIDE; octx.setLineDash([6, 3]); octx.beginPath()
      if (d.axis === 'v') { const x = d.pos * zoom + panX; octx.moveTo(x, 0); octx.lineTo(x, h) } else { const y = d.pos * zoom + panY; octx.moveTo(0, y); octx.lineTo(w, y) }
      octx.stroke(); octx.setLineDash([])
      const label = `${Math.round(d.pos)} px`; octx.font = '600 11px Inter, sans-serif'
      const at = d.axis === 'v' ? { x: d.pos * zoom + panX + 6, y: RULER + 16 } : { x: RULER + 6, y: d.pos * zoom + panY - 6 }
      octx.fillStyle = GUIDE; octx.fillText(label, at.x, at.y)
    }

    octx.strokeStyle = '#ff4fa3'; octx.lineWidth = 1
    for (const gx of snapLines.current.v) { const x = gx * zoom + panX; octx.beginPath(); octx.moveTo(x, 0); octx.lineTo(x, h); octx.stroke() }
    for (const gy of snapLines.current.h) { const y = gy * zoom + panY; octx.beginPath(); octx.moveTo(0, y); octx.lineTo(w, y); octx.stroke() }
    if (dist.current.length && s.options.showDistances !== false) {
      const MAG = '#ff3db4'
      octx.save()
      octx.strokeStyle = MAG; octx.fillStyle = MAG; octx.lineWidth = 1
      for (const m of dist.current) {
        const sx0 = m.x * zoom + panX, sy0 = m.y * zoom + panY
        octx.font = '600 11px Inter, sans-serif'
        const t = `${m.px}`, tw = octx.measureText(t).width
        if (m.axis === 'h') {
          const sx1 = (m.x + m.w) * zoom + panX
          octx.beginPath(); octx.moveTo(sx0, sy0); octx.lineTo(sx1, sy0); octx.moveTo(sx0, sy0 - 4); octx.lineTo(sx0, sy0 + 4); octx.moveTo(sx1, sy0 - 4); octx.lineTo(sx1, sy0 + 4); octx.stroke()
          const mx = (sx0 + sx1) / 2
          octx.fillStyle = MAG; octx.beginPath(); octx.roundRect(mx - tw / 2 - 5, sy0 - 20, tw + 10, 15, 4); octx.fill()
          octx.fillStyle = '#fff'; octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.fillText(t, mx, sy0 - 12)
        } else {
          const sy1 = (m.y + m.h) * zoom + panY
          octx.beginPath(); octx.moveTo(sx0, sy0); octx.lineTo(sx0, sy1); octx.moveTo(sx0 - 4, sy0); octx.lineTo(sx0 + 4, sy0); octx.moveTo(sx0 - 4, sy1); octx.lineTo(sx0 + 4, sy1); octx.stroke()
          const my = (sy0 + sy1) / 2
          octx.fillStyle = MAG; octx.beginPath(); octx.roundRect(sx0 + 6, my - 7.5, tw + 10, 15, 4); octx.fill()
          octx.fillStyle = '#fff'; octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.fillText(t, sx0 + 6 + tw / 2 + 5, my)
        }
        octx.textAlign = 'left'; octx.textBaseline = 'alphabetic'; octx.fillStyle = MAG
      }
      octx.restore()
    }

    if (d?.kind === 'select') {
      const a = toScreen(d.start), b = toScreen(d.cur)
      const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), rw = Math.abs(b.x - a.x), rh = Math.abs(b.y - a.y)
      octx.fillStyle = 'rgba(139,124,255,0.12)'; octx.fillRect(x, y, rw, rh)
      octx.strokeStyle = ACCENT; octx.lineWidth = 1; octx.strokeRect(x + 0.5, y + 0.5, rw, rh)
    }
    if (d?.kind === 'box') {
      const a = toScreen(d.start), b = toScreen(d.cur)
      octx.setLineDash([5, 4]); octx.strokeStyle = '#fff'; octx.lineWidth = 1.25
      octx.beginPath()
      if (d.tool === 'lasso') d.pts.map(toScreen).forEach((p, i) => (i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y)))
      else if (d.tool === 'gradient' || (d.tool === 'shape' && s.options.shape === 'line')) { octx.moveTo(a.x, a.y); octx.lineTo(b.x, b.y) }
      else if (d.tool === 'ellipse' || (d.tool === 'shape' && s.options.shape === 'ellipse')) octx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2)
      else if (d.tool === 'shape' && s.options.shape === 'polygon') {
        const r = { x: Math.min(d.start.x, d.cur.x), y: Math.min(d.start.y, d.cur.y), w: Math.abs(d.cur.x - d.start.x), h: Math.abs(d.cur.y - d.start.y) }
        polygonPoints({ w: r.w, h: r.h, sides: s.options.sides, star: s.options.star }).map(p => toScreen({ x: p.x + r.x, y: p.y + r.y })).forEach((p, i) => (i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y))); octx.closePath()
      }
      else octx.rect(a.x, a.y, b.x - a.x, b.y - a.y)
      octx.stroke(); octx.strokeStyle = '#000'; octx.lineDashOffset = 5; octx.stroke()
      octx.setLineDash([]); octx.lineDashOffset = 0
    }
    // Polygonal lasso in progress.
    if (poly.current?.length) {
      const pts = poly.current.map(toScreen)
      octx.setLineDash([5, 4]); octx.strokeStyle = '#fff'; octx.lineWidth = 1.25
      octx.beginPath(); pts.forEach((p, i) => (i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y)))
      if (cursor.current) octx.lineTo(cursor.current.x, cursor.current.y)
      octx.stroke(); octx.strokeStyle = '#000'; octx.lineDashOffset = 5; octx.stroke(); octx.setLineDash([]); octx.lineDashOffset = 0
      octx.beginPath(); octx.arc(pts[0].x, pts[0].y, 5, 0, Math.PI * 2); octx.fillStyle = '#fff'; octx.fill()
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

    // Rulers, drawn last so they sit over everything.
    if (ui.showRulers && w >= 600) drawRulers(octx, w, h, zoom, panX, panY, cursor.current)
  }, [])

  /** Show one colour channel, a saved alpha channel or a layer mask as greyscale. */
  function channelImage(src: HTMLCanvasElement): HTMLCanvasElement {
    const s = useEditor.getState(); const doc = s.doc!
    const key = `${s.viewChannel}|${s.docRev}|${src.width}x${src.height}`
    if (chanView.current.key === key && chanView.current.canvas) return chanView.current.canvas
    const out = makeCanvas(src.width, src.height), x = ctx2d(out, true)
    const k = src.width / doc.width
    if (['r', 'g', 'b'].includes(s.viewChannel)) {
      x.drawImage(src, 0, 0)
      const img = x.getImageData(0, 0, out.width, out.height), d = img.data, c = { r: 0, g: 1, b: 2 }[s.viewChannel as 'r']
      for (let i = 0; i < d.length; i += 4) { const v = d[i + c]; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255 }
      x.putImageData(img, 0, 0)
    } else {
      let mask: HTMLCanvasElement | null = null
      let m: DOMMatrix | null = null
      if (s.viewChannel.startsWith('mask:')) { const l = s.layers.find(q => q.id === s.viewChannel.slice(5)); if (l?.mask) { mask = l.mask; if (l.type !== 'adjustment') m = layerMatrix(l, doc) } }
      else mask = doc.channels?.find(c => c.id === s.viewChannel)?.mask ?? null
      x.fillStyle = '#000'; x.fillRect(0, 0, out.width, out.height)
      if (mask) {
        const wm = makeCanvas(out.width, out.height), wx = ctx2d(wm)
        wx.setTransform(m ? new DOMMatrix().scale(k, k).multiply(m) : new DOMMatrix().scale(k, k))
        wx.fillStyle = '#fff'; wx.drawImage(mask, 0, 0)
        wx.setTransform(1, 0, 0, 1, 0, 0); wx.globalCompositeOperation = 'source-in'; wx.fillRect(0, 0, out.width, out.height)
        x.drawImage(wm, 0, 0)
      }
    }
    chanView.current = { key, canvas: out }
    return out
  }

  const invalidate = useCallback((composite = false) => {
    if (composite) needComposite.current = true
    if (!raf.current) raf.current = requestAnimationFrame(draw)
  }, [draw])

  function selectionBox(): Rect | null {
    const st = useEditor.getState()
    const sel = st.layers.filter(l => st.selectedIds.includes(l.id) && l.type !== 'adjustment' && l.visible)
    if (sel.length < 2) return null
    const bs = sel.map(l => layerBounds(l, st.doc!))
    const x = Math.min(...bs.map(b => b.x)), y = Math.min(...bs.map(b => b.y))
    return { x, y, w: Math.max(...bs.map(b => b.x + b.w)) - x, h: Math.max(...bs.map(b => b.y + b.h)) - y }
  }
  function boxHandles(r: Rect): Pt[] { return [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }] }

  function handlePoints(l: Layer): Pt[] {
    const s = useEditor.getState()
    const { w, h } = layerSize(l, s.doc!)
    const m = new DOMMatrix().translate(l.x + (w * l.scaleX) / 2, l.y + (h * l.scaleY) / 2).rotate((l.rotation * 180) / Math.PI)
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
    const R = rulerSize()
    const zoom = Math.min((w - R - pad * 2) / bw, (h - R - pad * 2) / bh, 1)
    setView({ zoom, panX: R + (w - R - bw * zoom) / 2 - bx * zoom, panY: R + (h - R - bh * zoom) / 2 - by * zoom })
  }, [])

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
    const zoom = Math.min(64, Math.max(0.02, absolute ?? v.zoom * factor))
    const k = zoom / v.zoom
    setView({ zoom, panX: p.x - (p.x - v.panX) * k, panY: p.y - (p.y - v.panY) * k })
  }, [])

  // ── Multi-click tools: finishing and cancelling ──────────────────

  const finishPoly = useCallback(() => {
    const s = useEditor.getState(); const pts = poly.current; poly.current = null
    if (!pts || pts.length < 3 || !s.doc) { invalidate(); return }
    const m = makeCanvas(s.doc.width, s.doc.height), mx = ctx2d(m)
    mx.fillStyle = '#fff'; mx.beginPath(); pts.forEach((q, i) => (i ? mx.lineTo(q.x, q.y) : mx.moveTo(q.x, q.y))); mx.closePath(); mx.fill()
    ops.combineSelection(feathered(m), polyMode.current, 'Polygonal lasso')
    invalidate()
  }, [invalidate])
  const polyMode = useRef<'new' | 'add' | 'sub' | 'intersect'>('new')

  useEffect(() => {
    stageApi.fit = fit
    stageApi.fitSelection = fitSelection
    stageApi.fitFrame = fitFrame
    stageApi.zoomBy = f => zoomAt(f)
    stageApi.zoomTo = z => zoomAt(1, undefined, z)
    stageApi.enter = () => {
      if (poly.current) { finishPoly(); return true }
      if (penSub.current) { penSub.current = null; useEditor.getState().commit('Finish path'); invalidate(); return true }
      return false
    }
    stageApi.escape = () => {
      if (poly.current) { poly.current = null; invalidate(); return true }
      if (penSub.current) { penSub.current = null; invalidate(); return true }
      if (selNode.current) { selNode.current = null; invalidate(); return true }
      return false
    }
    stageApi.deleteNode = () => {
      const sn = selNode.current; if (!sn) return false
      withPath(sn.pathId, p => ({ ...p, subpaths: p.subpaths.map((x, i) => (i === sn.sub ? { ...x, nodes: x.nodes.filter((_, j) => j !== sn.idx) } : x)).filter(x => x.nodes.length) }))
      selNode.current = null
      useEditor.getState().commit('Delete anchor point'); invalidate(); return true
    }
  }, [fit, fitSelection, fitFrame, zoomAt, finishPoly, invalidate])

  useEffect(() => {
    const el = wrap.current!
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const prev = size.current.w
      size.current = { w: r.width, h: r.height, dpr }
      for (const c of [viewC.current!, overC.current!]) { c.width = r.width * dpr; c.height = r.height * dpr }
      // Refit on first show, and when the space changes a lot (phone rotation, window snapped to half).
      if (!prev || Math.abs(r.width - prev) / prev > 0.25) fit()
      invalidate()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit, invalidate])

  useEffect(() => { fit() }, [docId, fit])
  useEffect(() => { invalidate(true) }, [docRev, compare, editingTextId, transform?.layerId, viewChannel, invalidate])
  useEffect(() => { invalidate() }, [selRev, view, tool, activeId, crop, optSize, transform, quickMask, activePathId, showRulers, showGuides, pixelGrid, invalidate])
  useEffect(() => { if (tool !== 'pen') penSub.current = null; if (tool !== 'polylasso') poly.current = null }, [tool])

  useEffect(() => {
    const t = setInterval(() => { const st = useEditor.getState(); if (st.selection && !st.quickMask) { antsPhase.current = (antsPhase.current + 1) % 8; invalidate() } }, 140)
    return () => clearInterval(t)
  }, [invalidate])

  useEffect(() => {
    const el = wrap.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const p = local(e)
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), p)
      else { const v = useEditor.getState().view; const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX, dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY; useEditor.getState().setView({ panX: v.panX - dx, panY: v.panY - dy }) }
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
    const o = s.options
    const sz = Math.max(1, o.size * (o.pressureSize !== false ? pressure : 1))
    const overlay = L.mode === 'overlay'
    const color = d.tool === 'heal' ? '#ff3b6b' : d.tool === 'brush' && !s.editingMask && !overlay ? s.fg : '#ffffff'
    const hard = ['heal', 'remove'].includes(d.tool) ? 0.85 : o.hardness
    const tip = brushTip(sz, hard, color)
    bctx.globalAlpha = ['brush', 'eraser', 'clone'].includes(d.tool) ? (o.flow ?? 1) * (o.pressureOpacity ? pressure : 1) : 1
    if (d.tool === 'clone' && d.snapshot && d.offset) {
      const t = makeCanvas(tip.width, tip.height), tx = ctx2d(t)
      tx.drawImage(tip, 0, 0)
      tx.globalCompositeOperation = 'source-in'
      tx.drawImage(d.snapshot, -(p.x + d.offset.x - tip.width / 2), -(p.y + d.offset.y - tip.height / 2))
      bctx.drawImage(t, p.x - tip.width / 2, p.y - tip.height / 2)
    } else bctx.drawImage(tip, p.x - tip.width / 2, p.y - tip.height / 2)
    bctx.globalAlpha = 1
  }

  function strokeTo(d: Extract<Drag, { kind: 'stroke' }>, target: Pt, pressure: number) {
    const s = useEditor.getState()
    // Smoothing trails the pointer a little so shaky hands draw steady lines.
    const k = ['brush', 'eraser'].includes(d.tool) ? 1 - (s.options.smoothing ?? 0) * 0.85 : 1
    d.smooth = { x: d.smooth.x + (target.x - d.smooth.x) * k, y: d.smooth.y + (target.y - d.smooth.y) * k }
    const p = d.smooth
    const spacing = Math.max(1, s.options.size * 0.12)
    const dx = p.x - d.last.x, dy = p.y - d.last.y
    const dd = Math.hypot(dx, dy)
    let t = spacing - d.carry
    while (t <= dd) { stamp(d, { x: d.last.x + (dx * t) / dd, y: d.last.y + (dy * t) / dd }, pressure); t += spacing }
    d.carry = dd - (t - spacing)
    d.last = p
    if (s.selection && !d.quick) { const b = ctx2d(live.current!.buffer); b.globalCompositeOperation = 'destination-in'; b.drawImage(s.selection, 0, 0); b.globalCompositeOperation = 'source-over' }
    invalidate()
  }

  async function commitStroke(d: Extract<Drag, { kind: 'stroke' }>) {
    const s = useEditor.getState()
    const L = live.current; live.current = null
    if (!L) return
    if (d.quick) {
      const sel = s.selection ? cloneCanvas(s.selection) : makeCanvas(s.doc!.width, s.doc!.height), x = ctx2d(sel)
      x.globalAlpha = L.opacity; x.globalCompositeOperation = d.tool === 'eraser' ? 'destination-out' : 'source-over'
      x.drawImage(L.buffer, 0, 0)
      s.setSelection(sel); invalidate(); return
    }
    const layer = s.layers.find(l => l.id === L.layerId); if (!layer) return
    if (L.mode.startsWith('mask')) {
      if (!layer.mask) return
      const m = cloneCanvas(layer.mask), x = ctx2d(m)
      x.globalAlpha = L.opacity
      x.globalCompositeOperation = L.mode === 'mask-hide' ? 'destination-out' : 'source-over'
      x.drawImage(L.buffer, 0, 0)
      s.updateLayer(layer.id, { mask: m }, 'Paint mask')
    } else if (layer.type === 'raster') {
      if (d.tool === 'remove') { invalidate(); await import('../ai-tools').then(m => m.removeObject(L.buffer)); invalidate(true); return }
      if (d.tool === 'dodge' || d.tool === 'burn' || d.tool === 'sponge') {
        const o = s.options
        s.updateLayer(layer.id, { canvas: toneStroke(layer.canvas, L.buffer, d.tool, o.toneRange ?? 'midtones', o.exposure ?? 0.5, o.spongeMode) }, d.tool === 'dodge' ? 'Dodge' : d.tool === 'burn' ? 'Burn' : 'Sponge')
        return
      }
      if (d.tool === 'heal') {
        const out = healRegion(layer.canvas, L.buffer)
        if (out) s.updateLayer(layer.id, { canvas: out }, 'Heal')
        else { s.notify('That area is too large or too close to the edge to heal. Try a smaller spot, or use Remove object.'); invalidate(true) }
        return
      }
      const c = cloneCanvas(layer.canvas), x = ctx2d(c)
      x.globalAlpha = L.opacity
      if (L.mode === 'erase') x.globalCompositeOperation = 'destination-out'
      else if (layer.lockAlpha) x.globalCompositeOperation = 'source-atop'
      x.drawImage(L.buffer, 0, 0)
      s.updateLayer(layer.id, { canvas: c }, d.tool === 'eraser' ? 'Erase' : d.tool === 'clone' ? 'Clone' : 'Brush')
    }
  }

  // ── Selection helpers ────────────────────────────────────────────

  function feathered(m: HTMLCanvasElement) {
    const f = useEditor.getState().options.feather
    if (!f) return m
    const out = makeCanvas(m.width, m.height), x = ctx2d(out), off = m.width + f * 4 + 10
    x.shadowColor = '#fff'; x.shadowBlur = f * 2; x.shadowOffsetX = off; x.drawImage(m, -off, 0)
    return out
  }
  const selModeFor = (e: { shiftKey: boolean; altKey: boolean }) => (e.shiftKey && e.altKey ? 'intersect' : e.shiftKey ? 'add' : e.altKey ? 'sub' : (useEditor.getState().options.selMode ?? 'new'))

  function sample(p: Pt): [number, number, number, number] | null {
    const s = useEditor.getState(); const c = comp.current; if (!c || !s.doc) return null
    if (p.x < 0 || p.y < 0 || p.x >= s.doc.width || p.y >= s.doc.height) return null
    const k = c.width / s.doc.width
    const px = ctx2d(c, true).getImageData(Math.floor(p.x * k), Math.floor(p.y * k), 1, 1).data
    return [px[0], px[1], px[2], px[3]]
  }
  const hex = (px: number[]) => '#' + [px[0], px[1], px[2]].map(v => v.toString(16).padStart(2, '0')).join('')

  // ── Pointer events ───────────────────────────────────────────────

  const inEditor = (e: React.PointerEvent) => !!(e.target as HTMLElement).closest('textarea,[data-floating]')

  function onDown(e: React.PointerEvent) {
    if (inEditor(e)) return
    const s = useEditor.getState()
    const ui = useUi.getState()
    if (!s.doc) return
    const sp = local(e)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setBusyDrag(true)
    pointers.current.set(e.pointerId, sp)
    if (e.pointerType === 'pen') penSeen.current = true

    if (pointers.current.size >= 2) {
      live.current = null; drag.current = null
      const [a, b] = Array.from(pointers.current.values())
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: s.view.zoom, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, panX: s.view.panX, panY: s.view.panY, t: pinch.current?.t ?? Date.now(), moved: false, count: pointers.current.size }
      invalidate(true); return
    }

    const p = toDoc(sp.x, sp.y)
    const t = s.tool
    const R = rulerSize()

    // Drag out a new guide from a ruler.
    if (R && (sp.x < R || sp.y < R) && e.button === 0) {
      if (sp.x < R && sp.y < R) return
      drag.current = { kind: 'guide', axis: sp.y < R ? 'h' : 'v', index: -1, pos: sp.y < R ? p.y : p.x }
      invalidate(); return
    }

    if (s.pickRequest) {
      const px = sample(p)
      if (px) s.pickRequest.cb(hex(px), [px[0], px[1], px[2]])
      useEditor.setState({ pickRequest: null }); return
    }

    // Fingers pan when a pen is in use, so resting a hand never paints (touch mode).
    const fingerPan = ui.touchMode && penSeen.current && e.pointerType === 'touch'
    if (space.current || e.button === 1 || t === 'hand' || fingerPan) {
      drag.current = { kind: 'pan', sx: sp.x, sy: sp.y, px: s.view.panX, py: s.view.panY }; return
    }
    if (e.button !== 0) return

    // Transform session takes every click until it is applied or cancelled.
    if (s.transform) {
      const tf = s.transform
      const tol = 11 / s.view.zoom
      const pts = tf.grid ?? tf.quad
      const hi = pts.findIndex(q => Math.hypot(q.x - p.x, q.y - p.y) <= tol)
      if (hi >= 0) { drag.current = { kind: 'tcorner', index: hi, start: p, quad0: tf.quad.map(q => ({ ...q })), grid0: tf.grid?.map(q => ({ ...q })) ?? null, warp: !!tf.grid }; return }
      const path = new Path2D(); tf.quad.forEach((q, i) => (i ? path.lineTo(q.x, q.y) : path.moveTo(q.x, q.y))); path.closePath()
      if (ctx2d(overC.current!).isPointInPath(path, p.x, p.y)) drag.current = { kind: 'tmove', start: p, quad0: tf.quad.map(q => ({ ...q })), grid0: tf.grid?.map(q => ({ ...q })) ?? null }
      return
    }

    // Move an existing guide.
    if (t === 'move' && ui.showGuides && !ui.lockGuides && s.doc.guides) {
      const tol = 4 / s.view.zoom
      const vi = s.doc.guides.v.findIndex(g => Math.abs(g - p.x) < tol), hi = s.doc.guides.h.findIndex(g => Math.abs(g - p.y) < tol)
      if (vi >= 0 || hi >= 0) {
        const hitSomething = hitLayer(s.layers, p.x, p.y, s.doc, s.groups)
        if (!hitSomething || e.ctrlKey) { drag.current = vi >= 0 ? { kind: 'guide', axis: 'v', index: vi, pos: p.x } : { kind: 'guide', axis: 'h', index: hi, pos: p.y }; return }
      }
    }

    if (t === 'zoom') { zoomAt(e.altKey ? 0.6 : 1.6, sp); return }

    if (t === 'eyedropper') {
      const px = sample(p)
      if (px && px[3] > 0) { const c = hex(px); if (e.altKey) s.setBg(c); else { s.setFg(c); s.addSwatch(c) } }
      return
    }

    if (t === 'pen') { penDown(p, e); return }
    if (t === 'pathselect') { pathSelectDown(p, e); return }

    if (t === 'polylasso') {
      if (!poly.current) { poly.current = [p]; polyMode.current = selModeFor(e) as any; invalidate(); return }
      const first = poly.current[0]
      if ((poly.current.length >= 3 && Math.hypot(first.x - p.x, first.y - p.y) * s.view.zoom < 9) || e.detail === 2) { finishPoly(); return }
      poly.current.push(p); invalidate(); return
    }

    if (t === 'move') {
      const act = s.active()
      const auto = s.options.autoSelect !== false
      if (s.selectedIds.length > 1 && s.options.showTransform !== false) {
        const gb = selectionBox()
        if (gb) {
          const corners = boxHandles(gb)
          const tol = 9 / s.view.zoom
          for (let i = 0; i < 4; i++) {
            if (Math.abs(p.x - corners[i].x) < tol && Math.abs(p.y - corners[i].y) < tol) {
              const anchor = corners[(i + 2) % 4]
              const items = s.layers.filter(l => s.selectedIds.includes(l.id) && l.type !== 'adjustment' && !l.locked && !l.lockPosition).map(l => ({ id: l.id, l }))
              drag.current = { kind: 'gresize', anchor, box: gb, items }
              return
            }
          }
        }
      }
      if (s.options.showTransform !== false && s.selectedIds.length === 1 && act && act.type !== 'adjustment' && !act.locked && !act.lockPosition && act.visible) {
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
      let hit = auto || e.ctrlKey || e.metaKey ? hitLayer(s.layers, p.x, p.y, s.doc, s.groups) : null
      // Auto-select off: drag moves whatever is selected, wherever you press.
      if (!auto && !hit && s.selectedIds.length) hit = s.active()
      if (hit && e.detail === 2 && hit.type === 'text') { s.setActive(hit.id); useEditor.setState({ editingTextId: hit.id }); return }
      if (hit && e.shiftKey) { s.toggleSelect(hit.id); invalidate(); return }
      if (hit) {
        if (!s.selectedIds.includes(hit.id)) {
          const top = s.options.autoSelectGroup ? groupChain(hit.groupId, s.groups).pop() : undefined
          if (top) s.selectGroup(top); else s.setActive(hit.id)
        }
        const st = useEditor.getState()
        // Linked layers come along.
        const links = new Set(st.layers.filter(l => st.selectedIds.includes(l.id) && l.linkId).map(l => l.linkId))
        const moving = st.layers.filter(l => (st.selectedIds.includes(l.id) || (l.linkId && links.has(l.linkId))) && !l.locked && !l.lockPosition && l.type !== 'adjustment')
        if (!moving.length) { if (hit.lockPosition || hit.locked) s.notify('This layer is locked in place.'); invalidate(); return }
        const boxes = moving.map(l => layerBounds(l, s.doc!))
        const x0 = Math.min(...boxes.map(b => b.x)), y0 = Math.min(...boxes.map(b => b.y))
        const box = { x: x0, y: y0, w: Math.max(...boxes.map(b => b.x + b.w)) - x0, h: Math.max(...boxes.map(b => b.y + b.h)) - y0 }
        const snapX: number[] = [], snapY: number[] = []
        if (ui.snap) {
          snapX.push(0, s.doc.width / 2, s.doc.width); snapY.push(0, s.doc.height / 2, s.doc.height)
          if (ui.snapToGuides && ui.showGuides && s.doc.guides) { snapX.push(...s.doc.guides.v); snapY.push(...s.doc.guides.h) }
          for (const o of st.layers.slice(-40)) {
            if (moving.some(m => m.id === o.id) || !o.visible || o.type === 'adjustment') continue
            const b = layerBounds(o, s.doc)
            snapX.push(b.x, b.x + b.w / 2, b.x + b.w); snapY.push(b.y, b.y + b.h / 2, b.y + b.h)
          }
        }
        const siblings: Rect[] = []
        for (const o of st.layers) { if (moving.some(m => m.id === o.id) || !o.visible || o.type === 'adjustment') continue; siblings.push(layerBounds(o, s.doc)) }
        drag.current = { kind: 'move', start: p, items: moving.map(l => ({ id: l.id, ox: l.x, oy: l.y })), box, snapX, snapY, siblings, moved: false }
      } else {
        if (s.doc?.frames?.length) { const f = frameAt(s.doc, p.x, p.y); if (f) s.setActiveFrame(f.id) }
        drag.current = { kind: 'select', start: p, cur: p, add: e.shiftKey, base: e.shiftKey ? [...s.selectedIds] : [] }
        if (!e.shiftKey) s.setActive(null)
      }
      invalidate(); return
    }

    if (PAINT_TOOLS.includes(t)) {
      const pressure = e.pointerType === 'pen' ? Math.max(0.15, e.pressure) : 1
      // Quick mask: Brush and Eraser paint the selection itself.
      if (s.quickMask && (t === 'brush' || t === 'eraser')) {
        live.current = { layerId: '__qm__', buffer: makeCanvas(s.doc.width, s.doc.height), opacity: s.options.opacity, mode: 'overlay' }
        const d: Drag = { kind: 'stroke', last: p, smooth: p, carry: 0, tool: t, quick: true }
        drag.current = d; stamp(d, p, pressure); invalidate(); return
      }
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
      if (onMask && !['brush', 'eraser'].includes(t)) { s.notify('Switch from the mask to the layer to use this tool.'); return }
      const overlay = ['remove', 'dodge', 'burn', 'sponge'].includes(t)
      const mode: LiveStroke['mode'] = onMask ? (t === 'eraser' ? 'mask-hide' : 'mask-reveal') : overlay ? 'overlay' : t === 'eraser' ? 'erase' : 'paint'
      live.current = { layerId: target.id, buffer: makeCanvas(st.doc!.width, st.doc!.height), opacity: t === 'heal' ? 0.55 : overlay ? 1 : st.options.opacity, mode }
      const d: Drag = { kind: 'stroke', last: p, smooth: p, carry: 0, tool: t }
      if (t === 'clone' && target.type === 'raster') { d.snapshot = target.canvas; d.offset = { x: st.cloneSource!.x - p.x, y: st.cloneSource!.y - p.y } }
      drag.current = d
      stamp(d, p, pressure)
      invalidate(); return
    }

    if (t === 'wand' || t === 'fill') {
      if (p.x < 0 || p.y < 0 || p.x >= s.doc.width || p.y >= s.doc.height) return
      if (t === 'fill' && s.selection) { ops.fillSelectionOrLayer(s.fg, s.options.opacity); return }
      if (t === 'wand') {
        let src: HTMLCanvasElement
        const act = s.active()
        if (s.options.sampleAll !== false || !act || act.type === 'adjustment') { src = makeCanvas(s.doc.width, s.doc.height); renderDoc(src, s.doc, s.layers, { groups: s.groups, noCache: true }) }
        else { src = makeCanvas(s.doc.width, s.doc.height); renderDoc(src, s.doc, [{ ...act, visible: true } as Layer], { noCache: true, transparent: true, frameRects: [] }) }
        ops.combineSelection(floodMask(src, p.x, p.y, s.options.tolerance, s.options.contiguous), selModeFor(e) as any, 'Magic wand')
      } else {
        const target = s.ensurePaintable(); if (!target || target.type !== 'raster') return
        const m = floodMask(target.canvas, p.x, p.y, s.options.tolerance, s.options.contiguous)
        const x = ctx2d(m); x.globalCompositeOperation = 'source-in'; x.fillStyle = s.fg; x.fillRect(0, 0, m.width, m.height)
        const c = cloneCanvas(target.canvas), cx = ctx2d(c); cx.globalAlpha = s.options.opacity; cx.drawImage(m, 0, 0)
        s.updateLayer(target.id, { canvas: c }, 'Fill')
      }
      return
    }

    if (['marquee', 'ellipse', 'lasso', 'shape', 'gradient', 'crop', 'text', 'objectselect'].includes(t)) {
      if (t === 'crop') useEditor.setState({ crop: null })
      drag.current = { kind: 'box', tool: t, start: p, cur: p, pts: [p], mode: selModeFor(e) as any }
    }
  }

  // ── Pen and direct selection ─────────────────────────────────────

  function penDown(p: Pt, e: React.PointerEvent) {
    const s = useEditor.getState(); const doc = s.doc!
    let path = doc.paths?.find(x => x.id === s.activePathId)
    if (!path) {
      path = { id: ops.newPathId(), name: `Path ${(doc.paths?.length ?? 0) + 1}`, subpaths: [] }
      s.setDoc({ paths: [...(doc.paths ?? []), path] }); useEditor.setState({ activePathId: path.id })
    }
    const cur = penSub.current && penSub.current.pathId === path.id ? penSub.current : null
    const tol = 9 / s.view.zoom
    if (cur) {
      const sp = path.subpaths[cur.sub]
      if (sp && sp.nodes.length >= 2 && Math.hypot(sp.nodes[0].x - p.x, sp.nodes[0].y - p.y) < tol) {
        withPath(path.id, pp => ({ ...pp, subpaths: pp.subpaths.map((x, i) => (i === cur.sub ? { ...x, closed: true } : x)) }))
        penSub.current = null; s.commit('Close path'); invalidate(); return
      }
      const idx = sp.nodes.length
      withPath(path.id, pp => ({ ...pp, subpaths: pp.subpaths.map((x, i) => (i === cur.sub ? { ...x, nodes: [...x.nodes, ops.emptyNode(p.x, p.y)] } : x)) }))
      drag.current = { kind: 'pen', pathId: path.id, sub: cur.sub, idx, start: p, alt: e.altKey }
    } else {
      const sub = path.subpaths.length
      withPath(path.id, pp => ({ ...pp, subpaths: [...pp.subpaths, { closed: false, nodes: [ops.emptyNode(p.x, p.y)] }] }))
      penSub.current = { pathId: path.id, sub }
      drag.current = { kind: 'pen', pathId: path.id, sub, idx: 0, start: p, alt: e.altKey }
    }
    invalidate()
  }

  function pathSelectDown(p: Pt, e: React.PointerEvent) {
    const s = useEditor.getState(); const doc = s.doc!
    const tol = 8 / s.view.zoom
    const paths = [doc.paths?.find(x => x.id === s.activePathId), ...(doc.paths ?? []).filter(x => x.id !== s.activePathId)].filter(Boolean) as VectorPath[]
    for (const path of paths) {
      for (let si = 0; si < path.subpaths.length; si++) {
        const nodes = path.subpaths[si].nodes
        for (let ni = 0; ni < nodes.length; ni++) {
          const n = nodes[ni]
          const part = Math.hypot(n.x - p.x, n.y - p.y) < tol ? 'node' : (n.inX !== n.x || n.inY !== n.y) && Math.hypot(n.inX - p.x, n.inY - p.y) < tol ? 'in' : (n.outX !== n.x || n.outY !== n.y) && Math.hypot(n.outX - p.x, n.outY - p.y) < tol ? 'out' : null
          if (!part) continue
          useEditor.setState({ activePathId: path.id })
          selNode.current = { pathId: path.id, sub: si, idx: ni }
          if (part === 'node' && e.altKey) {
            // Alt-click switches a point between corner and smooth.
            const hasHandles = n.inX !== n.x || n.inY !== n.y || n.outX !== n.x || n.outY !== n.y
            const prev = nodes[(ni - 1 + nodes.length) % nodes.length], next = nodes[(ni + 1) % nodes.length]
            const dx = (next.x - prev.x) / 4, dy = (next.y - prev.y) / 4
            const nn: PathNode = hasHandles ? { ...n, inX: n.x, inY: n.y, outX: n.x, outY: n.y, smooth: false } : { ...n, inX: n.x - dx, inY: n.y - dy, outX: n.x + dx, outY: n.y + dy, smooth: true }
            withPath(path.id, pp => ({ ...pp, subpaths: setNode(pp.subpaths, si, ni, nn) }))
            s.commit('Convert point'); invalidate(); return
          }
          drag.current = { kind: 'pnode', pathId: path.id, sub: si, idx: ni, part, alt: e.altKey }
          invalidate(); return
        }
      }
      // Clicking on the outline selects that path.
      const x = ctx2d(overC.current!); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.lineWidth = tol * 2
      const onIt = x.isPointInStroke(pathOf(path), p.x, p.y) || x.isPointInPath(pathOf(path), p.x, p.y)
      x.restore()
      if (onIt) { useEditor.setState({ activePathId: path.id }); selNode.current = null; invalidate(); return }
    }
    selNode.current = null; invalidate()
  }

  function onMove(e: React.PointerEvent) {
    if (inEditor(e) && !drag.current) return
    const s = useEditor.getState()
    const sp = local(e)
    cursor.current = e.pointerType === 'mouse' || e.pointerType === 'pen' ? sp : null
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, sp)
    const now = performance.now()
    if (now - lastPointer.current > 40 && s.doc) {
      lastPointer.current = now
      const p = toDoc(sp.x, sp.y)
      useEditor.setState({ pointer: { x: p.x, y: p.y, rgb: sample(p) } })
    }

    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values())
      const pc = pinch.current
      const dist2 = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      if (Math.abs(dist2 - pc.d) > 10 || Math.hypot(mid.x - pc.mid.x, mid.y - pc.mid.y) > 10) pc.moved = true
      const zoom = Math.min(64, Math.max(0.02, pc.zoom * (dist2 / pc.d))), k = zoom / pc.zoom
      s.setView({ zoom, panX: mid.x - (pc.mid.x - pc.panX) * k, panY: mid.y - (pc.mid.y - pc.panY) * k })
      return
    }

    const d = drag.current
    if (!d || !s.doc) { if (PAINT_TOOLS.includes(s.tool) || poly.current || penSub.current || useUi.getState().showRulers) invalidate(); return }
    const p = toDoc(sp.x, sp.y)

    if (d.kind === 'pan') { s.setView({ panX: d.px + sp.x - d.sx, panY: d.py + sp.y - d.sy }); return }
    if (d.kind === 'guide') { d.pos = Math.round(d.axis === 'v' ? p.x : p.y); invalidate(); return }

    if (d.kind === 'tcorner' || d.kind === 'tmove') {
      const tf = s.transform; if (!tf) return
      const dx = p.x - d.start.x, dy = p.y - d.start.y
      if (d.kind === 'tmove') {
        useEditor.setState({ transform: { ...tf, quad: d.quad0.map(q => ({ x: q.x + dx, y: q.y + dy })), grid: d.grid0?.map(q => ({ x: q.x + dx, y: q.y + dy })) ?? null } })
      } else if (d.warp) {
        const grid = d.grid0!.map((q, i) => (i === d.index ? { x: q.x + dx, y: q.y + dy } : q))
        useEditor.setState({ transform: { ...tf, grid } })
      } else {
        const q = d.quad0.map(x => ({ ...x })), i = d.index
        const horiz = Math.abs(dx) > Math.abs(dy)
        if (tf.mode === 'skew') {
          // Move the edge this corner sits on, along that edge.
          if (horiz) { const edge = i < 2 ? [0, 1] : [2, 3]; for (const j of edge) q[j].x += dx }
          else { const edge = i === 0 || i === 3 ? [0, 3] : [1, 2]; for (const j of edge) q[j].y += dy }
        } else if (tf.mode === 'perspective') {
          q[i] = { x: q[i].x + (horiz ? dx : 0), y: q[i].y + (horiz ? 0 : dy) }
          const mirror = horiz ? ({ 0: 1, 1: 0, 2: 3, 3: 2 } as Record<number, number>)[i] : ({ 0: 3, 3: 0, 1: 2, 2: 1 } as Record<number, number>)[i]
          q[mirror] = { x: q[mirror].x - (horiz ? dx : 0), y: q[mirror].y - (horiz ? 0 : dy) }
        } else if (tf.mode === 'free' && !e.ctrlKey && !e.metaKey) {
          // Free transform scales from the opposite corner; hold Ctrl to distort a single corner.
          const opp = d.quad0[(i + 2) % 4], c0 = d.quad0[i]
          const kx = (p.x - opp.x) / (c0.x - opp.x || 1), ky = (p.y - opp.y) / (c0.y - opp.y || 1)
          const k = e.shiftKey ? Math.max(kx, ky) : null
          for (let j = 0; j < 4; j++) q[j] = { x: opp.x + (d.quad0[j].x - opp.x) * (k ?? kx), y: opp.y + (d.quad0[j].y - opp.y) * (k ?? ky) }
        } else q[i] = { x: d.quad0[i].x + dx, y: d.quad0[i].y + dy }
        useEditor.setState({ transform: { ...tf, quad: q } })
      }
      invalidate(); return
    }

    if (d.kind === 'pen') {
      // Dragging while placing a point pulls out symmetric handles. Alt breaks the symmetry.
      withPath(d.pathId, pp => {
        const n = pp.subpaths[d.sub]?.nodes[d.idx]; if (!n) return pp
        const nn: PathNode = { ...n, outX: p.x, outY: p.y, inX: d.alt ? n.inX : 2 * n.x - p.x, inY: d.alt ? n.inY : 2 * n.y - p.y, smooth: !d.alt }
        return { ...pp, subpaths: setNode(pp.subpaths, d.sub, d.idx, nn) }
      })
      invalidate(); return
    }
    if (d.kind === 'pnode') {
      withPath(d.pathId, pp => {
        const n = pp.subpaths[d.sub]?.nodes[d.idx]; if (!n) return pp
        let nn: PathNode
        if (d.part === 'node') { const dx = p.x - n.x, dy = p.y - n.y; nn = { ...n, x: p.x, y: p.y, inX: n.inX + dx, inY: n.inY + dy, outX: n.outX + dx, outY: n.outY + dy } }
        else if (d.part === 'out') nn = { ...n, outX: p.x, outY: p.y, ...(n.smooth && !d.alt ? { inX: 2 * n.x - p.x, inY: 2 * n.y - p.y } : {}) }
        else nn = { ...n, inX: p.x, inY: p.y, ...(n.smooth && !d.alt ? { outX: 2 * n.x - p.x, outY: 2 * n.y - p.y } : {}) }
        if (d.alt && d.part !== 'node') nn.smooth = false
        return { ...pp, subpaths: setNode(pp.subpaths, d.sub, d.idx, nn) }
      })
      invalidate(); return
    }

    if (d.kind === 'gresize') {
      const bw = d.box.w, bh = d.box.h
      const sx = Math.abs(p.x - d.anchor.x) / bw, sy = Math.abs(p.y - d.anchor.y) / bh
      const k = Math.max(0.05, Math.min(sx, sy))
      s.updateLayers(d.items.map(it => {
        const b = layerBounds(it.l, s.doc!)
        const nx = d.anchor.x + (b.x - d.anchor.x) * k
        const ny = d.anchor.y + (b.y - d.anchor.y) * k
        const patch: any = { x: it.l.x + (nx - b.x), y: it.l.y + (ny - b.y) }
        if (it.l.type === 'text') { patch.fontSize = Math.max(1, it.l.fontSize * k); if (it.l.boxWidth) patch.boxWidth = it.l.boxWidth * k }
        else if (it.l.type === 'shape') { patch.w = it.l.w * k; patch.h = it.l.h * k; patch.strokeWidth = it.l.strokeWidth * k; patch.radius = it.l.radius * k }
        else { patch.scaleX = it.l.scaleX * k; patch.scaleY = it.l.scaleY * k }
        return { id: it.id, patch }
      }))
      invalidate(); return
    }
    if (d.kind === 'select') {
      d.cur = p
      const rx = Math.min(d.start.x, p.x), ry = Math.min(d.start.y, p.y)
      const rw = Math.abs(p.x - d.start.x), rh = Math.abs(p.y - d.start.y)
      const hits: string[] = []
      for (const l of s.layers) {
        if (!l.visible || l.type === 'adjustment') continue
        const b = layerBounds(l, s.doc!)
        if (b.x < rx + rw && b.x + b.w > rx && b.y < ry + rh && b.y + b.h > ry) hits.push(l.id)
      }
      const next = Array.from(new Set([...(d.add ? d.base : []), ...hits]))
      useEditor.setState({ selectedIds: next, activeId: next[next.length - 1] ?? null })
      invalidate(); return
    }

    if (d.kind === 'move') {
      let dx = p.x - d.start.x, dy = p.y - d.start.y
      if (!d.moved && Math.hypot(dx, dy) * s.view.zoom < 3) return
      d.moved = true
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0 }
      const tol = 6 / s.view.zoom
      snapLines.current = { v: [], h: [] }
      if (!e.altKey && d.snapX.length) {
        const snap = (pos: number, sz: number, targets: number[]) => {
          let best: { d: number; g: number } | null = null
          for (const g of targets) for (const off of [0, sz / 2, sz]) {
            const dd = g - (pos + off)
            if (Math.abs(dd) < tol && (!best || Math.abs(dd) < Math.abs(best.d))) best = { d: dd, g }
          }
          return best
        }
        const sx = dy === 0 && e.shiftKey ? snap(d.box.x + dx, d.box.w, d.snapX) : dx === 0 && e.shiftKey ? null : snap(d.box.x + dx, d.box.w, d.snapX)
        const sy = dx === 0 && e.shiftKey ? snap(d.box.y + dy, d.box.h, d.snapY) : dy === 0 && e.shiftKey ? null : snap(d.box.y + dy, d.box.h, d.snapY)
        if (sx) { dx += sx.d; snapLines.current.v.push(sx.g) }
        if (sy) { dy += sy.d; snapLines.current.h.push(sy.g) }
      }
      dist.current = []
      const mb = { x: d.box.x + dx, y: d.box.y + dy, w: d.box.w, h: d.box.h }
      const overlapY = (a: Rect, b: Rect) => Math.max(a.y, b.y) < Math.min(a.y + a.h, b.y + b.h)
      const overlapX = (a: Rect, b: Rect) => Math.max(a.x, b.x) < Math.min(a.x + a.w, b.x + b.w)
      type Near = { gap: number; b: Rect } | null
      let nearL: Near = null, nearR: Near = null, nearT: Near = null, nearB: Near = null
      for (const b of d.siblings) {
        if (overlapY(mb, b)) {
          if (b.x + b.w <= mb.x + 0.5) { const gap = mb.x - (b.x + b.w); if (!nearL || gap < nearL.gap) nearL = { gap, b } }
          if (b.x >= mb.x + mb.w - 0.5) { const gap = b.x - (mb.x + mb.w); if (!nearR || gap < nearR.gap) nearR = { gap, b } }
        }
        if (overlapX(mb, b)) {
          if (b.y + b.h <= mb.y + 0.5) { const gap = mb.y - (b.y + b.h); if (!nearT || gap < nearT.gap) nearT = { gap, b } }
          if (b.y >= mb.y + mb.h - 0.5) { const gap = b.y - (mb.y + mb.h); if (!nearB || gap < nearB.gap) nearB = { gap, b } }
        }
      }
      const cy = mb.y + mb.h / 2, cx = mb.x + mb.w / 2
      if (nearL) dist.current.push({ x: nearL.b.x + nearL.b.w, y: cy, w: nearL.gap, h: 0, px: Math.round(nearL.gap), axis: 'h' })
      if (nearR) dist.current.push({ x: mb.x + mb.w, y: cy, w: nearR.gap, h: 0, px: Math.round(nearR.gap), axis: 'h' })
      if (nearT) dist.current.push({ x: cx, y: nearT.b.y + nearT.b.h, w: 0, h: nearT.gap, px: Math.round(nearT.gap), axis: 'v' })
      if (nearB) dist.current.push({ x: cx, y: mb.y + mb.h, w: 0, h: nearB.gap, px: Math.round(nearB.gap), axis: 'v' })
      s.updateLayers(d.items.map(it => ({ id: it.id, patch: { x: it.ox + dx, y: it.oy + dy } })))
      return
    }

    if (d.kind === 'rotate') {
      let r = d.r0 + Math.atan2(p.y - d.center.y, p.x - d.center.x) - d.a0
      if (e.shiftKey) r = Math.round(r / (Math.PI / 12)) * (Math.PI / 12)
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
      const boxText = l0.type === 'text' && !!l0.boxWidth && dirX !== 0 && dirY === 0
      const proportional = boxText ? false : corner ? !e.shiftKey || l0.type === 'text' : l0.type === 'text'
      if (proportional) {
        const k = corner ? Math.max(nw / w0, nh / h0) : dirX ? nw / w0 : nh / h0
        nw = w0 * k; nh = h0 * k
      }
      if (boxText && l0.type === 'text') {
        // Side handles on a text box change its width; the text reflows instead of stretching.
        const bw = Math.max(20, nw / l0.scaleX)
        const cxl = (dirX * nw) / 2
        const c2 = Math.cos(l0.rotation), s2 = Math.sin(l0.rotation)
        const cx = d.anchor.x + cxl * c2, cy = d.anchor.y + cxl * s2
        const nh2 = layerSize({ ...l0, boxWidth: bw }).h * l0.scaleY
        s.updateLayer(d.id, { boxWidth: bw, x: cx - nw / 2, y: cy - nh2 / 2 } as any); return
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
      if ((e.shiftKey && !['lasso', 'gradient', 'objectselect'].includes(d.tool) && d.mode !== 'add') || aspect) {
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
    if (pinch.current) {
      if (pointers.current.size === 0) {
        // A quick tap with two fingers undoes, three fingers redoes.
        const pc = pinch.current; pinch.current = null
        if (!pc.moved && Date.now() - pc.t < 300) { if (pc.count === 2) useEditor.getState().undo(); else if (pc.count >= 3) useEditor.getState().redo() }
      }
      return
    }
    const s = useEditor.getState()
    const d = drag.current; drag.current = null
    snapLines.current = { v: [], h: [] }; dist.current = []
    if (!d || !s.doc) { invalidate(); return }

    if (d.kind === 'guide') {
      const sp = local(e), R = rulerSize()
      const g = s.doc.guides ?? { v: [], h: [] }
      const list = [...g[d.axis]]
      const off = d.axis === 'v' ? sp.x < R : sp.y < R
      if (d.index >= 0) { if (off) list.splice(d.index, 1); else list[d.index] = d.pos }
      else if (!off) list.push(d.pos)
      s.setDoc({ guides: { ...g, [d.axis]: list } }, true)
      invalidate(); return
    }
    if (d.kind === 'tcorner' || d.kind === 'tmove') { invalidate(); return }
    if (d.kind === 'pen') { s.commit('Add anchor point'); invalidate(); return }
    if (d.kind === 'pnode') { s.commit('Edit path'); invalidate(); return }
    if (d.kind === 'gresize') { s.commit('Resize selection'); invalidate(); return }
    if (d.kind === 'move' && d.moved) {
      if (s.doc?.frames?.length) {
        for (const it of d.items) { const l = s.layers.find(x => x.id === it.id); if (!l) continue; const f = frameForLayer(s.doc, l); if ((f?.id ?? null) !== (l.frameId ?? null)) s.reassignLayerFrame(l.id, f?.id ?? null) }
        const act = s.active(); if (act) { const f = frameForLayer(s.doc, act); if (f) s.setActiveFrame(f.id) }
      }
      s.commit('Move')
    }
    if (d.kind === 'rotate') s.commit('Rotate')
    if (d.kind === 'resize') {
      const l = s.layers.find(x => x.id === d.id)
      if (l?.type === 'shape') s.updateLayer(l.id, { w: l.w * l.scaleX, h: l.h * l.scaleY, scaleX: 1, scaleY: 1, ...(l.subpaths ? { subpaths: l.subpaths.map(sp => ({ ...sp, nodes: sp.nodes.map(n => ({ ...n, x: n.x * l.scaleX, y: n.y * l.scaleY, inX: n.inX * l.scaleX, inY: n.inY * l.scaleY, outX: n.outX * l.scaleX, outY: n.outY * l.scaleY })) })) } : {}) })
      if (l?.type === 'text' && (l.scaleX !== 1 || l.scaleY !== 1)) {
        const before = layerSize(l), cx = l.x + (before.w * l.scaleX) / 2, cy = l.y + (before.h * l.scaleY) / 2
        const next = { ...l, fontSize: Math.max(4, Math.round(l.fontSize * l.scaleX)), boxWidth: l.boxWidth ? l.boxWidth * l.scaleX : l.boxWidth, scaleX: 1, scaleY: 1 }
        const after = layerSize(next)
        s.updateLayer(l.id, { fontSize: next.fontSize, boxWidth: next.boxWidth, scaleX: 1, scaleY: 1, x: cx - after.w / 2, y: cy - after.h / 2 })
      }
      s.commit('Resize')
    }
    if (d.kind === 'stroke') commitStroke(d)

    if (d.kind === 'box') {
      const r = normRect(d.start, d.cur)
      const tiny = Math.hypot(d.cur.x - d.start.x, d.cur.y - d.start.y) * s.view.zoom < 4
      if (d.tool === 'crop') { if (tiny) useEditor.setState({ crop: null }) }
      else if (d.tool === 'text') {
        if (tiny || r.w < 24) s.addText(d.start.x, d.start.y)
        else s.addText(r.x, r.y, r.w)
        useEditor.setState({ focusText: Date.now() })
      } else if (d.tool === 'objectselect') {
        if (!tiny) import('../ai-tools').then(m => m.objectSelect(r, d.mode))
      } else if (d.tool === 'shape') {
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
            const c = cloneCanvas(target.canvas), cx = ctx2d(c)
            if (target.lockAlpha) cx.globalCompositeOperation = 'source-atop'
            cx.drawImage(g, 0, 0)
            s.updateLayer(target.id, { canvas: c }, 'Gradient')
          }
        }
      } else {
        if (tiny && d.mode === 'new') { if (s.selection) s.setSelection(null, 'Deselect') }
        else if (!tiny) {
          const m = makeCanvas(s.doc.width, s.doc.height), mx = ctx2d(m)
          mx.fillStyle = '#fff'; mx.beginPath()
          if (d.tool === 'lasso') d.pts.forEach((q, i) => (i ? mx.lineTo(q.x, q.y) : mx.moveTo(q.x, q.y)))
          else if (d.tool === 'ellipse') mx.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2)
          else mx.rect(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h))
          mx.fill()
          ops.combineSelection(feathered(m), d.mode, d.tool === 'lasso' ? 'Lasso' : 'Select')
        }
      }
    }
    invalidate(true)
  }

  const cursorFor = (t: ToolId) =>
    PAINT_TOOLS.includes(t) ? 'none' : t === 'hand' ? 'grab' : t === 'zoom' ? 'zoom-in' : t === 'text' ? 'text' : t === 'move' ? 'default' : t === 'pathselect' ? 'default' : 'crosshair'

  return (
    <div
      ref={wrap}
      className="relative flex-1 min-w-0 min-h-0 overflow-hidden bg-surface-base touch-none select-none"
      style={{ cursor: cursorFor(tool) }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={() => { cursor.current = null; useEditor.setState({ pointer: null }); invalidate() }}
      onDragOver={e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault() }}
      onDrop={e => { if (!e.dataTransfer.files.length) return; e.preventDefault(); importFiles(Array.from(e.dataTransfer.files)) }}
      onContextMenu={e => e.preventDefault()}
      role="application"
      aria-label="Design canvas"
    >
      <canvas ref={viewC} className="absolute inset-0 w-full h-full" />
      <canvas ref={overC} className="absolute inset-0 w-full h-full pointer-events-none" />
      <TextEditor />
      {!busyDrag && showContextBar && !transform && <FloatingBar />}
      {compare && <div className="absolute top-8 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white text-void-950 text-[12px] font-medium pointer-events-none">Before: adjustments and filters hidden</div>}
      {viewChannel !== 'rgb' && <button onClick={() => useEditor.setState({ viewChannel: 'rgb', docRev: useEditor.getState().docRev + 1 })} className="absolute top-8 right-4 px-3 py-1.5 rounded-full bg-white text-void-950 text-[12px] font-medium">Viewing {viewChannel.startsWith('mask:') ? 'layer mask' : viewChannel.length === 1 ? { r: 'red', g: 'green', b: 'blue' }[viewChannel as 'r'] + ' channel' : 'saved channel'}. Show all</button>}
    </div>
  )
}

/** Rulers along the top and left edge, with ticks that adapt to the zoom level and a marker at the pointer. */
function drawRulers(o: CanvasRenderingContext2D, w: number, h: number, zoom: number, panX: number, panY: number, cur: Pt | null) {
  const R = RULER
  o.save()
  o.fillStyle = '#16161b'; o.fillRect(0, 0, w, R); o.fillRect(0, 0, R, h)
  o.strokeStyle = 'rgba(255,255,255,0.12)'; o.beginPath(); o.moveTo(0, R + 0.5); o.lineTo(w, R + 0.5); o.moveTo(R + 0.5, 0); o.lineTo(R + 0.5, h); o.stroke()
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000]
  const step = steps.find(s => s * zoom >= 60) ?? 10000
  const minor = step / (step % 5 === 0 ? 5 : step % 2 === 0 ? 2 : 1)
  o.fillStyle = '#8a8a98'; o.strokeStyle = '#55555f'; o.font = '10px Inter, sans-serif'; o.textBaseline = 'top'
  o.beginPath()
  const x0 = Math.floor((R - panX) / zoom / minor) * minor, x1 = (w - panX) / zoom
  for (let v = x0; v <= x1; v += minor) {
    const x = Math.round(v * zoom + panX) + 0.5; if (x < R) continue
    const major = Math.abs(v / step - Math.round(v / step)) < 1e-6
    o.moveTo(x, major ? 4 : 13); o.lineTo(x, R)
    if (major) o.fillText(String(Math.round(v)), x + 3, 2)
  }
  const y0 = Math.floor((R - panY) / zoom / minor) * minor, y1 = (h - panY) / zoom
  for (let v = y0; v <= y1; v += minor) {
    const y = Math.round(v * zoom + panY) + 0.5; if (y < R) continue
    const major = Math.abs(v / step - Math.round(v / step)) < 1e-6
    o.moveTo(major ? 4 : 13, y); o.lineTo(R, y)
    if (major) { o.save(); o.translate(2, y + 3); o.rotate(Math.PI / 2); o.fillText(String(Math.round(v)), 0, -8); o.restore() }
  }
  o.stroke()
  if (cur) {
    o.strokeStyle = '#8b7cff'; o.beginPath()
    if (cur.x > R) { o.moveTo(Math.round(cur.x) + 0.5, 0); o.lineTo(Math.round(cur.x) + 0.5, R) }
    if (cur.y > R) { o.moveTo(0, Math.round(cur.y) + 0.5); o.lineTo(R, Math.round(cur.y) + 0.5) }
    o.stroke()
  }
  o.fillStyle = '#1d1d23'; o.fillRect(0, 0, R, R)
  o.restore()
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
        overflow: 'hidden', whiteSpace: layer.boxWidth ? 'pre-wrap' : 'pre', textTransform: layer.caps === 'all' ? 'uppercase' : undefined,
        textIndent: (layer.indent ?? 0) * k, outline: '1.5px solid #8b7cff', outlineOffset: 2, caretColor: '#8b7cff', cursor: 'text',
      }}
    />
  )
}
