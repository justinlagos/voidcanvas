// Starter images for the challenges: drawn on a canvas here, so there is nothing to license and nothing to download.
// They are meant to be bad on purpose: a flash-lit product on a kitchen table, a receipt, a colour-cast street.
import type { StarterId } from './briefs'

export const STARTER_NAMES: Record<StarterId, string> = {
  portrait: 'Portrait (harsh flash)',
  receipt: 'Receipt',
  street: 'Street (colour cast)',
  product: 'Product (kitchen table)',
  flat: 'Flat grey',
  landscape: 'Landscape (banded sky)',
}

const W = 1080, H = 1350

/** Small deterministic noise so the same starter looks the same every time. */
function rng(seed: number) { let x = seed || 1; return () => { x = (x * 48271) % 2147483647; return x / 2147483647 } }

function grain(ctx: CanvasRenderingContext2D, amount: number, seed: number) {
  const r = rng(seed)
  const img = ctx.getImageData(0, 0, W, H); const d = img.data
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amount; d[i] += n; d[i + 1] += n; d[i + 2] += n }
  ctx.putImageData(img, 0, 0)
}

function bandedSky(ctx: CanvasRenderingContext2D, from: [number, number, number], to: [number, number, number], steps: number, h: number) {
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    ctx.fillStyle = `rgb(${Math.round(from[0] + (to[0] - from[0]) * t)},${Math.round(from[1] + (to[1] - from[1]) * t)},${Math.round(from[2] + (to[2] - from[2]) * t)})`
    ctx.fillRect(0, Math.floor((h * i) / steps), W, Math.ceil(h / steps) + 1)
  }
}

const draw: Record<StarterId, (ctx: CanvasRenderingContext2D) => void> = {
  portrait(ctx) {
    // A shoulders-up silhouette lit by an on-camera flash, red-brown wall, hard shadow to the left.
    ctx.fillStyle = '#7a3b2e'; ctx.fillRect(0, 0, W, H)
    const g = ctx.createRadialGradient(560, 520, 60, 560, 520, 900); g.addColorStop(0, 'rgba(255,225,200,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0.35)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(30,10,8,0.55)'; ctx.beginPath(); ctx.ellipse(470, 600, 250, 330, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#e8b89a'; ctx.beginPath(); ctx.ellipse(560, 560, 210, 290, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#2b1a14'; ctx.beginPath(); ctx.ellipse(560, 380, 240, 170, 0, Math.PI, 0); ctx.fill()
    ctx.fillStyle = '#d9d2c8'; ctx.beginPath(); ctx.moveTo(140, H); ctx.quadraticCurveTo(540, 760, 980, H); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(500, 540, 9, 0, 7); ctx.arc(620, 540, 9, 0, 7); ctx.fill()
    ctx.fillStyle = 'rgba(255,60,40,0.85)'; ctx.beginPath(); ctx.arc(500, 540, 5, 0, 7); ctx.arc(620, 540, 5, 0, 7); ctx.fill()
    grain(ctx, 46, 7)
  },
  receipt(ctx) {
    ctx.fillStyle = '#b9b3a6'; ctx.fillRect(0, 0, W, H)
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.06)
    ctx.fillStyle = '#f4f1e8'; ctx.fillRect(-300, -600, 600, 1200)
    ctx.fillStyle = '#2a2a2a'; ctx.textAlign = 'center'
    ctx.font = '700 34px "JetBrains Mono", ui-monospace, monospace'; ctx.fillText('CORNER SHOP', 0, -520)
    ctx.font = '26px "JetBrains Mono", ui-monospace, monospace'; ctx.fillText('14 HIGH ST', 0, -480); ctx.fillText('THANK YOU FOR SHOPPING', 0, -444)
    const lines: [string, string][] = [['MILK 2L', '1.45'], ['BREAD', '1.10'], ['EGGS X12', '2.80'], ['BANANAS', '0.92'], ['COFFEE', '4.50'], ['PAPER TOWEL', '2.00'], ['TOMATOES', '1.35'], ['CHEESE', '3.20'], ['BISCUITS', '1.25'], ['BATTERIES AA', '5.99']]
    ctx.textAlign = 'left'; let y = -370
    for (const [a, b] of lines) { ctx.fillText(a, -250, y); ctx.textAlign = 'right'; ctx.fillText(b, 250, y); ctx.textAlign = 'left'; y += 44 }
    ctx.fillText('----------------------------', -250, y); y += 44
    ctx.font = '700 30px "JetBrains Mono", ui-monospace, monospace'; ctx.fillText('TOTAL', -250, y); ctx.textAlign = 'right'; ctx.fillText('24.56', 250, y)
    ctx.textAlign = 'left'; ctx.font = '24px "JetBrains Mono", ui-monospace, monospace'; y += 60
    ctx.fillText('CARD ************1234', -250, y); y += 36; ctx.fillText('AUTH 09F2A1', -250, y); y += 60
    for (let i = 0; i < 40; i++) { ctx.fillStyle = i % 3 ? '#2a2a2a' : '#f4f1e8'; ctx.fillRect(-250 + i * 12.5, y, 8, 70) }
    ctx.restore()
    grain(ctx, 20, 3)
  },
  street(ctx) {
    // Night street, sodium orange cast, blown highlight from a shop sign.
    ctx.fillStyle = '#1d1208'; ctx.fillRect(0, 0, W, H)
    bandedSky(ctx, [40, 22, 8], [110, 60, 15], 9, 640)
    ctx.fillStyle = '#0e0905'
    for (let i = 0; i < 6; i++) { const x = i * 200 - 60; ctx.fillRect(x, 260 + (i % 2) * 80, 170, 900) }
    ctx.fillStyle = '#e9a13a'
    for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) if ((i * 7 + j) % 3) ctx.fillRect(i * 200 - 40 + 20, 300 + (i % 2) * 80 + j * 110, 40, 60)
    const g = ctx.createRadialGradient(760, 560, 10, 760, 560, 420); g.addColorStop(0, 'rgba(255,240,210,1)'); g.addColorStop(0.3, 'rgba(255,170,60,0.9)'); g.addColorStop(1, 'rgba(255,120,20,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#2a1a0c'; ctx.fillRect(0, 1060, W, 290)
    ctx.fillStyle = 'rgba(255,190,90,0.35)'; ctx.fillRect(0, 1060, W, 6)
    ctx.fillStyle = 'rgba(255,140,30,0.18)'; ctx.fillRect(0, 0, W, H)
    grain(ctx, 60, 11)
  },
  product(ctx) {
    // A bottle on a kitchen table, flash, phone-camera yellow cast, tilted horizon.
    ctx.fillStyle = '#c8b58f'; ctx.fillRect(0, 0, W, H)
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(0.05); ctx.translate(-W / 2, -H / 2)
    ctx.fillStyle = '#a58f66'; ctx.fillRect(-100, 780, W + 200, 700)
    ctx.fillStyle = '#e0d2ae'; ctx.fillRect(-100, 0, W + 200, 800)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(600, 1060, 230, 40, 0, 0, 7); ctx.fill()
    ctx.fillStyle = '#3f6a3a'; ctx.fillRect(430, 420, 220, 640); ctx.fillRect(490, 300, 100, 140)
    ctx.fillStyle = '#f0ede4'; ctx.fillRect(430, 620, 220, 240)
    ctx.fillStyle = '#3f6a3a'; ctx.font = '700 44px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('OLIVE', 540, 720); ctx.font = '400 22px Inter, sans-serif'; ctx.fillText('EXTRA VIRGIN', 540, 760)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(455, 440, 18, 560)
    ctx.restore()
    const g = ctx.createRadialGradient(540, 600, 100, 540, 600, 1100); g.addColorStop(0, 'rgba(255,255,230,0.35)'); g.addColorStop(1, 'rgba(60,40,0,0.45)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(255,200,0,0.9)'; ctx.font = '500 30px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('14/03/2019 21:47', 1030, 1300)
    grain(ctx, 30, 5)
  },
  flat(ctx) {
    ctx.fillStyle = '#8a8a8f'; ctx.fillRect(0, 0, W, H)
    grain(ctx, 14, 9)
  },
  landscape(ctx) {
    bandedSky(ctx, [255, 140, 60], [60, 70, 140], 7, 860)
    ctx.fillStyle = '#fff2c8'; ctx.beginPath(); ctx.arc(540, 700, 120, 0, 7); ctx.fill()
    ctx.fillStyle = '#1c2431'; ctx.beginPath(); ctx.moveTo(0, 900); ctx.lineTo(180, 700); ctx.lineTo(330, 820); ctx.lineTo(520, 640); ctx.lineTo(700, 790); ctx.lineTo(860, 690); ctx.lineTo(W, 860); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill()
    ctx.fillStyle = '#0f141c'; ctx.fillRect(0, 950, W, H)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 40; i++) ctx.fillRect(0, 950 + i * 10, W, 4)
    grain(ctx, 34, 13)
  },
}

export function drawStarter(id: StarterId): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')!
  draw[id](ctx)
  return c
}

function drawnBlob(id: StarterId): Promise<Blob> {
  return new Promise((res, rej) => drawStarter(id).toBlob(b => (b ? res(b) : rej(new Error('Could not draw starter'))), 'image/jpeg', 0.82))
}

/** The shipped photo for a starter (made for the campaign, ours to use); the drawn version is the fallback when it cannot load. */
export async function starterBlob(id: StarterId): Promise<Blob> {
  if (id === 'flat') return drawnBlob(id)
  try {
    const r = await fetch(`/starters/${id}.jpg`)
    if (r.ok) { const b = await r.blob(); if (b.size > 1000) return b }
  } catch { /* offline or missing: draw it */ }
  return drawnBlob(id)
}
