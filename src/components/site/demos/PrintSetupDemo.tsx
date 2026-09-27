'use client'

// Print setup, demonstrated: pick a size, then flip resolution, bleed and colour and watch what the printer would hand back.
// The close-up shows a 30 mm square at print scale, which is where 72 dpi falls apart and 300 dpi holds.
import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '@/lib/analytics'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const SIZES = [
  { id: 'a5', name: 'A5 flyer', w: 148, h: 210 },
  { id: 'a4', name: 'A4', w: 210, h: 297 },
  { id: 'a3', name: 'A3 poster', w: 297, h: 420 },
  { id: 'a2', name: 'A2 poster', w: 420, h: 594 },
  { id: 'us', name: '18 × 24 in', w: 457.2, h: 609.6 },
]
const DPIS = [72, 150, 300]
const mmToPx = (mm: number, dpi: number) => Math.round(mm / 25.4 * dpi)
const bleedPx = (mm: number, dpi: number) => Math.ceil(mm / 25.4 * dpi) // rounded up, so the bleed is never short

/** Rough preview of what a bright RGB colour looks like after a generic CMYK conversion: less saturated, a little darker. Simulated, not a profile. */
function pressify(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2 / 255
  const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255))
  if (sat < 0.35) return [r, g, b]
  const k = 1 - Math.min(0.42, (sat - 0.35) * 0.65) // pull saturation down hardest on the brightest colours
  const grey = (max + min) / 2
  const mix = (c: number) => Math.round((grey + (c - grey) * k) * (l > 0.5 ? 0.94 : 0.97))
  return [mix(r), mix(g), mix(b)]
}

/** Draws the sample poster into ctx at the given pixel width (the height follows the paper ratio). Everything is drawn in mm so dpi changes only the pixel density. */
function drawPoster(ctx: CanvasRenderingContext2D, pxPerMm: number, size: { w: number; h: number }, bleedMm: number) {
  const W = size.w + bleedMm * 2, H = size.h + bleedMm * 2
  ctx.save()
  ctx.scale(pxPerMm, pxPerMm)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#1f7bff'); g.addColorStop(1, '#0a2a8a')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  // A big neon shape that runs off the edge: the classic case for bleed.
  ctx.fillStyle = '#27ff8f'; ctx.beginPath(); ctx.arc(W * 0.78, H * 0.28, W * 0.34, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ff4fd8'; ctx.fillRect(-1, H * 0.62, W * 0.55, H * 0.16)
  ctx.fillStyle = '#ff7a00'; ctx.fillRect(W * 0.55, H * 0.7, W + 1, H * 0.05)
  // Type
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic'
  ctx.font = `700 ${W * 0.2}px Inter, system-ui, sans-serif`; ctx.fillText('LATE', bleedMm + size.w * 0.06, bleedMm + size.h * 0.5)
  ctx.fillText('SHIFT', bleedMm + size.w * 0.06, bleedMm + size.h * 0.5 + W * 0.18)
  ctx.font = `500 ${W * 0.034}px Inter, system-ui, sans-serif`; ctx.fillStyle = '#ffffff'
  ctx.fillText('Fri 14 Nov · Doors 21:00 · Tickets at the door', bleedMm + size.w * 0.06, bleedMm + size.h * 0.9)
  ctx.font = `400 ${W * 0.022}px Inter, system-ui, sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText('Small print sits inside the safe area, 5 mm from the trim.', bleedMm + size.w * 0.06, bleedMm + size.h * 0.945)
  ctx.restore()
}

export default function PrintSetupDemo({ caption }: { caption?: string }) {
  const [sizeId, setSizeId] = useState('a3')
  const [dpi, setDpi] = useState(300)
  const [bleed, setBleed] = useState(true)
  const [cmyk, setCmyk] = useState(false)
  const sheet = useRef<HTMLCanvasElement>(null)
  const loupe = useRef<HTMLCanvasElement>(null)
  const touched = useRef(false)
  const size = useMemo(() => SIZES.find(s => s.id === sizeId)!, [sizeId])
  const bleedMm = bleed ? 3 : 0
  const drift = 2 // mm the guillotine drifts in the demonstration (real drift is about 1 mm; doubled so it shows at this size)

  useEffect(() => {
    const sc = sheet.current, lc = loupe.current
    if (!sc || !lc) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    // Source artwork at the chosen dpi, in real pixels.
    const pxPerMm = dpi / 25.4
    const art = document.createElement('canvas')
    art.width = Math.max(1, Math.round((size.w + bleedMm * 2) * pxPerMm)); art.height = Math.max(1, Math.round((size.h + bleedMm * 2) * pxPerMm))
    const actx = art.getContext('2d')!
    drawPoster(actx, pxPerMm, size, bleedMm)
    if (cmyk) {
      const id = actx.getImageData(0, 0, art.width, art.height), d = id.data
      for (let i = 0; i < d.length; i += 4) { const [r, g, b] = pressify(d[i], d[i + 1], d[i + 2]); d[i] = r; d[i + 1] = g; d[i + 2] = b }
      actx.putImageData(id, 0, 0)
    }

    // Sheet view: the trimmed poster as the printer returns it, with the cut drifted by 1 mm.
    const cssW = sc.clientWidth || 320, viewPxPerMm = cssW / (size.w + 12)
    const cssH = Math.round((size.h + 12) * viewPxPerMm)
    sc.width = Math.round(cssW * dpr); sc.height = Math.round(cssH * dpr); sc.style.height = cssH + 'px'
    const s = sc.getContext('2d')!
    s.setTransform(dpr * viewPxPerMm, 0, 0, dpr * viewPxPerMm, 0, 0)
    s.clearRect(0, 0, size.w + 12, size.h + 12)
    // Paper (the trimmed sheet), drifted cut: the cut rectangle sits 1 mm right and down of where the artwork expects it.
    const ox = 6, oy = 6
    s.save()
    s.shadowColor = 'rgba(0,0,0,0.35)'; s.shadowBlur = 2; s.shadowOffsetY = 1
    s.fillStyle = '#fff'; s.fillRect(ox, oy, size.w, size.h)
    s.restore()
    s.save(); s.beginPath(); s.rect(ox, oy, size.w, size.h); s.clip()
    s.imageSmoothingEnabled = true
    // Artwork placed so that its trim box would sit at (ox, oy) if the cut were perfect; the drift moves the paper, so the art appears shifted up-left.
    s.drawImage(art, ox - bleedMm - drift, oy - bleedMm - drift, size.w + bleedMm * 2, size.h + bleedMm * 2)
    s.restore()
    // Where the white sliver appears without bleed
    if (!bleed) { // point at the sliver of paper the drift exposed
      s.strokeStyle = 'rgba(255, 90, 90, 0.95)'; s.lineWidth = 0.6
      s.strokeRect(ox + size.w - drift - 0.3, oy + 0.3, drift + 0.6, size.h - 0.6)
      s.strokeRect(ox + 0.3, oy + size.h - drift - 0.3, size.w - 0.6, drift + 0.6)
    }
    if (bleed) { // crop marks, drawn on the sheet edge as a printer's proof would show them
      s.strokeStyle = 'rgba(0,0,0,0.6)'; s.lineWidth = 0.25
      const m = 4
      for (const [x, y, dx, dy] of [[ox, oy, -1, -1], [ox + size.w, oy, 1, -1], [ox, oy + size.h, -1, 1], [ox + size.w, oy + size.h, 1, 1]] as const) {
        s.beginPath(); s.moveTo(x + dx * 1, y); s.lineTo(x + dx * m, y); s.moveTo(x, y + dy * 1); s.lineTo(x, y + dy * m); s.stroke()
      }
    }

    // Loupe: 30 × 30 mm from the bottom-left of the trim, drawn at 4 device px per print dot at 300 dpi equivalent, so 72 dpi visibly blurs.
    const lcss = lc.clientWidth || 200
    lc.width = Math.round(lcss * dpr); lc.height = Math.round(lcss * dpr); lc.style.height = lcss + 'px'
    const l = lc.getContext('2d')!
    l.setTransform(1, 0, 0, 1, 0, 0); l.clearRect(0, 0, lc.width, lc.height)
    const winMm = 30, sx = (bleedMm + size.w * 0.05) * pxPerMm, sy = (bleedMm + size.h * 0.93 - winMm * 0.6) * pxPerMm
    l.imageSmoothingEnabled = true
    l.drawImage(art, sx, sy, winMm * pxPerMm, winMm * pxPerMm, 0, 0, lc.width, lc.height)
  }, [size, dpi, bleed, cmyk, bleedMm])

  const mark = () => { if (!touched.current) { touched.current = true; track('learn.demo', { kind: 'print-setup' }) } }
  const trimPx = { w: mmToPx(size.w, dpi), h: mmToPx(size.h, dpi) }
  const bpx = bleedPx(bleedMm, dpi)
  const withBleed = { w: trimPx.w + bpx * 2, h: trimPx.h + bpx * 2 }

  return (
    <figure className="not-prose rounded-[24px] border border-lp-line bg-lp-card overflow-hidden">
      <div className="grid md:grid-cols-[minmax(0,1fr)_300px]">
        <div className="p-5 grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 items-start bg-lp-panel/40">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lp-faint mb-2">Back from the printer</p>
            <canvas ref={sheet} className="block w-full" role="img" aria-label="The trimmed poster, with the cut drifted by one millimetre" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lp-faint mb-2">30 mm close-up</p>
            <canvas ref={loupe} className="block w-full rounded-lg border border-lp-line" role="img" aria-label="A 30 millimetre square of the poster at print scale" />
            <p className="mt-1.5 text-[12px] text-lp-dim leading-snug">At print scale. Move to 72 dpi to see the softness the printer would see.</p>
          </div>
        </div>
        <div className="p-5 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-lp-line text-[13.5px]">
          <label className="block">
            <span className="block text-lp-fg">Paper size</span>
            <select value={sizeId} onChange={e => { setSizeId(e.target.value); mark() }} className={`mt-1.5 w-full h-9 px-2 rounded-lg bg-[var(--lp-field)] border border-lp-line text-lp-text ${focus}`}>
              {SIZES.map(s => <option key={s.id} value={s.id}>{s.name} ({s.w} × {s.h} mm)</option>)}
            </select>
          </label>
          <fieldset>
            <legend className="text-lp-fg">Resolution</legend>
            <div className="mt-1.5 inline-flex p-0.5 rounded-full bg-lp-panel border border-lp-line">
              {DPIS.map(d => <button key={d} type="button" onClick={() => { setDpi(d); mark() }} aria-pressed={dpi === d} className={`h-7 px-3 rounded-full text-[13px] ${dpi === d ? 'bg-lp-btn text-lp-btn-fg' : 'text-lp-dim hover:text-lp-fg'} ${focus}`}>{d} dpi</button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-lp-fg">Bleed</legend>
            <div className="mt-1.5 inline-flex p-0.5 rounded-full bg-lp-panel border border-lp-line">
              {[false, true].map(b => <button key={String(b)} type="button" onClick={() => { setBleed(b); mark() }} aria-pressed={bleed === b} className={`h-7 px-3 rounded-full text-[13px] ${bleed === b ? 'bg-lp-btn text-lp-btn-fg' : 'text-lp-dim hover:text-lp-fg'} ${focus}`}>{b ? '3 mm' : 'None'}</button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-lp-fg">Colour</legend>
            <div className="mt-1.5 inline-flex p-0.5 rounded-full bg-lp-panel border border-lp-line">
              {[false, true].map(c => <button key={String(c)} type="button" onClick={() => { setCmyk(c); mark() }} aria-pressed={cmyk === c} className={`h-7 px-3 rounded-full text-[13px] ${cmyk === c ? 'bg-lp-btn text-lp-btn-fg' : 'text-lp-dim hover:text-lp-fg'} ${focus}`}>{c ? 'CMYK preview' : 'RGB on screen'}</button>)}
            </div>
          </fieldset>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px] border-t border-lp-line pt-3">
            <dt className="text-lp-dim">Trim size</dt><dd className="tabular-nums text-lp-fg">{trimPx.w} × {trimPx.h} px</dd>
            <dt className="text-lp-dim">With bleed</dt><dd className="tabular-nums text-lp-fg">{bleed ? `${withBleed.w} × ${withBleed.h} px` : 'no bleed'}</dd>
            <dt className="text-lp-dim">3 mm is</dt><dd className="tabular-nums text-lp-fg">{bleedPx(3, dpi)} px at {dpi} dpi</dd>
            <dt className="text-lp-dim">Safe area</dt><dd className="tabular-nums text-lp-fg">{mmToPx(5, dpi)} px in from the trim</dd>
          </dl>
          <p className="text-[12px] text-lp-faint leading-snug">
            {dpi === 72 && 'At 72 dpi the file has a quarter of the pixels the press needs. Everything prints soft.'}
            {dpi === 150 && '150 dpi is fine for a poster read from a metre or more. Text and fine lines still look slightly soft up close.'}
            {dpi === 300 && '300 dpi at final size is what most printers ask for. Anything read in the hand should be prepared at this.'}
            {!bleed && ' Without bleed, a small drift in the cut leaves white paper along two edges (outlined in red; the drift is doubled here so it shows).'}
            {cmyk && ' The CMYK preview is a simulation of a generic conversion: bright blue, green and pink lose the most.'}
          </p>
        </div>
      </div>
      {caption && <figcaption className="px-5 py-3 border-t border-lp-line text-[13.5px] text-lp-dim">{caption}</figcaption>}
    </figure>
  )
}
