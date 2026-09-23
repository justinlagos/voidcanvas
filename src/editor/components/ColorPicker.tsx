'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pipette, X } from 'lucide-react'
import { useEditor } from '../store'
import { focusRing } from './ui'

// A proper colour picker: saturation/value square, hue strip, HEX, RGB and HSL fields, the screen
// eyedropper where the browser has one, and the design's own swatches.

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim()); if (!m) return [0, 0, 0]
  const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [((h * 60) + 360) % 360, mx ? d / mx : 0, mx]
}
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l * 100]
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s * 100, l * 100]
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

const RECENT_KEY = 'vc-recent-colours'
function recent(): string[] { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] } }
function pushRecent(c: string) { try { localStorage.setItem(RECENT_KEY, JSON.stringify([c, ...recent().filter(x => x !== c)].slice(0, 12))) } catch { /* ignore */ } }

export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [hsv, setHsv] = useState(() => rgbToHsv(...hexToRgb(value)))
  const last = useRef(value)
  useEffect(() => { if (value.toLowerCase() !== last.current.toLowerCase()) { setHsv(rgbToHsv(...hexToRgb(value))); last.current = value } }, [value])
  const emit = (h: number, s: number, v: number) => { setHsv([h, s, v]); const hex = rgbToHex(...hsvToRgb(h, s, v)); last.current = hex; onChange(hex) }
  const setHex = (hex: string) => { if (!/^#?[0-9a-f]{6}$/i.test(hex)) return; const x = hex.startsWith('#') ? hex : '#' + hex; setHsv(rgbToHsv(...hexToRgb(x))); last.current = x; onChange(x) }
  const sv = useRef<HTMLDivElement>(null), hue = useRef<HTMLDivElement>(null)
  const dragSV = (e: React.PointerEvent) => {
    const r = sv.current!.getBoundingClientRect()
    const s = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), v = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height))
    emit(hsv[0], s, v)
  }
  const dragHue = (e: React.PointerEvent) => {
    const r = hue.current!.getBoundingClientRect()
    emit(Math.min(359.9, Math.max(0, ((e.clientX - r.left) / r.width) * 360)), hsv[1], hsv[2])
  }
  const [r, g, b] = hsvToRgb(...hsv).map(Math.round) as [number, number, number]
  const hsl = rgbToHsl(r, g, b).map(Math.round)
  const hex = rgbToHex(r, g, b)
  const swatches = useEditor(s => s.swatches)
  const eyedrop = async () => {
    const ED = (window as any).EyeDropper
    if (!ED) { useEditor.getState().notify('This browser has no screen eyedropper. Use the Eyedropper tool (I) on the canvas.'); return }
    try { const res = await new ED().open(); setHex(res.sRGBHex) } catch { /* cancelled */ }
  }
  const num = (label: string, v: number, max: number, set: (n: number) => void) => (
    <label className="flex flex-col items-center gap-0.5">
      <input aria-label={label} value={v} inputMode="numeric" onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n)) set(Math.max(0, Math.min(max, n))) }}
        className={`w-full h-7 px-1 rounded-md bg-surface-sunken border border-white/[0.06] text-[12px] text-center tabular-nums ${focusRing}`} />
      <span className="text-[10px] text-void-500">{label}</span>
    </label>
  )
  return (
    <div className="w-[236px] select-none">
      <div ref={sv} className="relative h-36 rounded-lg cursor-crosshair touch-none" style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv[0]} 100% 50%))` }}
        onPointerDown={e => { (e.target as HTMLElement).setPointerCapture(e.pointerId); dragSV(e) }} onPointerMove={e => { if (e.buttons) dragSV(e) }} onPointerUp={() => pushRecent(hex)}>
        <span className="absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)] pointer-events-none" style={{ left: `${hsv[1] * 100}%`, top: `${(1 - hsv[2]) * 100}%` }} />
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        <div ref={hue} className="relative flex-1 h-3 rounded-full cursor-pointer touch-none" style={{ background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}
          onPointerDown={e => { (e.target as HTMLElement).setPointerCapture(e.pointerId); dragHue(e) }} onPointerMove={e => { if (e.buttons) dragHue(e) }} onPointerUp={() => pushRecent(hex)}>
          <span className="absolute top-1/2 w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full border-2 border-white shadow pointer-events-none" style={{ left: `${(hsv[0] / 360) * 100}%`, background: `hsl(${hsv[0]} 100% 50%)` }} />
        </div>
        <button aria-label="Pick a colour from anywhere on screen" title="Pick from screen" onClick={eyedrop} className={`w-7 h-7 rounded-md inline-flex items-center justify-center text-void-300 hover:text-white hover:bg-void-800 ${focusRing}`}><Pipette size={14} /></button>
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        <span className="w-8 h-8 rounded-md border border-white/15 shrink-0" style={{ background: hex }} />
        <input aria-label="Hex" defaultValue={hex} key={hex} spellCheck={false} onKeyDown={e => { if (e.key === 'Enter') setHex((e.target as HTMLInputElement).value) }} onBlur={e => setHex(e.target.value)}
          className={`flex-1 h-8 px-2 rounded-md bg-surface-sunken border border-white/[0.06] text-[12.5px] font-mono uppercase ${focusRing}`} />
      </div>
      <div className="grid grid-cols-6 gap-1 mt-2">
        {num('R', r, 255, v => setHex(rgbToHex(v, g, b)))}{num('G', g, 255, v => setHex(rgbToHex(r, v, b)))}{num('B', b, 255, v => setHex(rgbToHex(r, g, v)))}
        {num('H', hsl[0], 360, v => setHex(rgbToHex(...hslToRgb(v, hsl[1], hsl[2]))))}{num('S', hsl[1], 100, v => setHex(rgbToHex(...hslToRgb(hsl[0], v, hsl[2]))))}{num('L', hsl[2], 100, v => setHex(rgbToHex(...hslToRgb(hsl[0], hsl[1], v))))}
      </div>
      <div className="mt-2.5">
        <p className="text-[10.5px] uppercase tracking-wide text-void-500 mb-1">This design</p>
        <div className="flex flex-wrap gap-1">{swatches.slice(0, 14).map(c => <button key={c} aria-label={`Use ${c}`} title={c} onClick={() => setHex(c)} className={`w-[22px] h-[22px] rounded-[5px] border border-white/10 ${focusRing}`} style={{ background: c }} />)}</div>
        {recent().length > 0 && <>
          <p className="text-[10.5px] uppercase tracking-wide text-void-500 mt-2 mb-1">Recent</p>
          <div className="flex flex-wrap gap-1">{recent().map(c => <button key={c} aria-label={`Use ${c}`} title={c} onClick={() => setHex(c)} className={`w-[22px] h-[22px] rounded-[5px] border border-white/10 ${focusRing}`} style={{ background: c }} />)}</div>
        </>}
      </div>
    </div>
  )
}

/** Place a floating card next to an anchor rect, kept inside the window. Rendered in a portal so no panel clips it. */
export function Floating({ anchor, side = 'right', children, onClose, label }: { anchor: DOMRect; side?: 'right' | 'left' | 'bottom'; children: React.ReactNode; onClose: () => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return
    const w = el.offsetWidth, h = el.offsetHeight, vw = window.innerWidth, vh = window.innerHeight
    let left = side === 'right' ? anchor.right + 10 : side === 'left' ? anchor.left - w - 10 : anchor.left
    let top = side === 'bottom' ? anchor.bottom + 8 : anchor.top
    if (left + w > vw - 8) left = Math.max(8, anchor.left - w - 10)
    if (left < 8) left = 8
    if (top + h > vh - 8) top = Math.max(8, vh - h - 8)
    setPos({ left, top })
  }, [anchor, side])
  useEffect(() => {
    const down = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    const t = setTimeout(() => window.addEventListener('pointerdown', down), 0)
    window.addEventListener('keydown', key, true)
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', down); window.removeEventListener('keydown', key, true) }
  }, [onClose])
  if (typeof document === 'undefined') return null
  return createPortal(
    <div ref={ref} role="dialog" aria-label={label} className="fixed z-[80] rounded-xl bg-[#1d1d23] border border-white/[0.08] shadow-2xl" style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }} onPointerDown={e => e.stopPropagation()}>
      {children}
    </div>, document.body)
}

/** The picker in a small floating card. */
export function ColorPopover({ value, onChange, onClose, title, anchor, side = 'right' }: { value: string; onChange: (hex: string) => void; onClose: () => void; title: string; anchor: DOMRect; side?: 'right' | 'left' | 'bottom' }) {
  return (
    <Floating anchor={anchor} side={side} onClose={onClose} label={title}>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2"><span className="text-[12px] font-semibold text-void-200">{title}</span><button aria-label="Close" onClick={onClose} className="text-void-400 hover:text-white"><X size={14} /></button></div>
        <ColorPicker value={value} onChange={onChange} />
      </div>
    </Floating>
  )
}

/** A swatch button that opens the picker. Drop-in for a native colour input. */
export function ColorButton({ value, onChange, onCommit, label, size = 28 }: { value: string; onChange: (hex: string) => void; onCommit?: () => void; label: string; size?: number }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  return (
    <span className="relative inline-flex">
      <button type="button" aria-label={label} title={label} onClick={e => setRect(r => r ? null : (e.currentTarget as HTMLElement).getBoundingClientRect())} className={`rounded-md border border-white/15 ${focusRing}`} style={{ width: size, height: size, background: value }} />
      {rect && <ColorPopover value={value} title={label} onChange={onChange} onClose={() => { setRect(null); onCommit?.() }} anchor={rect} side="left" />}
    </span>
  )
}
