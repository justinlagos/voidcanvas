// Brand Guidelines V2 fixture corpus. Definitions are pure data; raster files are materialised only when browser tests need them.
import fs from 'node:fs'
import path from 'node:path'

const dir = path.resolve('e2e/.out/brand-fixtures')
fs.mkdirSync(dir, { recursive: true })

export const BRAND_FIXTURE_CASES = [
  { id: 'black-wordmark', name: 'Northbank', tagline: 'Built to last', kind: 'raster', w: 1200, h: 300, paint: `x.clearRect(0,0,w,h);x.fillStyle='#111111';x.font='900 210px Arial';x.fillText('NORTHBANK',24,225)`, mime: 'image/png', expected: { colour: 'achromatic-dark', kind: 'wordmark' } },
  { id: 'black-symbol-jpg', name: 'Orbit', tagline: 'Move clearly', kind: 'raster', w: 600, h: 600, paint: `x.fillStyle='#ffffff';x.fillRect(0,0,w,h);x.fillStyle='#101010';x.beginPath();x.arc(300,300,210,0,Math.PI*2);x.fill();x.fillStyle='#ffffff';x.beginPath();x.arc(360,250,105,0,Math.PI*2);x.fill()`, mime: 'image/jpeg', expected: { colour: 'achromatic-dark', kind: 'mark', knockout: true } },
  { id: 'white-transparent', name: 'Halo', tagline: 'Light in motion', kind: 'raster', w: 700, h: 420, paint: `x.clearRect(0,0,w,h);x.strokeStyle='#ffffff';x.lineWidth=54;x.beginPath();x.arc(350,210,145,0,Math.PI*2);x.stroke()`, mime: 'image/png', expected: { colour: 'achromatic-light' } },
  { id: 'red-symbol', name: 'Kite', tagline: 'Make it visible', kind: 'raster', w: 600, h: 600, paint: `x.clearRect(0,0,w,h);x.fillStyle='#e31f26';x.beginPath();x.moveTo(300,35);x.lineTo(565,300);x.lineTo(300,565);x.lineTo(35,300);x.closePath();x.fill()`, mime: 'image/png', expected: { colour: 'single-chromatic', primary: '#e31f26', regression: 'B23' } },
  { id: 'multicolour-lockup', name: 'Kobo', tagline: 'Many parts, one signal', kind: 'raster', w: 1100, h: 360, paint: `x.clearRect(0,0,w,h);x.fillStyle='#0b3d91';x.beginPath();x.arc(180,180,145,0,Math.PI*2);x.fill();x.fillStyle='#ff7a00';x.beginPath();x.arc(180,180,70,0,Math.PI*2);x.fill();x.fillStyle='#111827';x.font='800 190px Arial';x.fillText('KOBO',390,245)`, mime: 'image/png', expected: { colour: 'multicolour', refuseFlatWhenEdgesMatter: true } },
  { id: 'gradient-mark', name: 'Flux', tagline: 'Always changing', kind: 'raster', w: 700, h: 700, paint: `x.clearRect(0,0,w,h);const g=x.createLinearGradient(80,80,620,620);g.addColorStop(0,'#7c3aed');g.addColorStop(.5,'#ec4899');g.addColorStop(1,'#f59e0b');x.fillStyle=g;x.beginPath();x.moveTo(350,45);x.bezierCurveTo(650,90,650,610,350,655);x.bezierCurveTo(55,610,55,90,350,45);x.fill()`, mime: 'image/png', expected: { colour: 'gradient' } },
  { id: 'thin-line', name: 'Thread', tagline: 'Precision matters', kind: 'raster', w: 800, h: 500, paint: `x.clearRect(0,0,w,h);x.strokeStyle='#18212f';x.lineWidth=5;x.beginPath();x.moveTo(80,420);x.lineTo(400,60);x.lineTo(720,420);x.moveTo(190,300);x.lineTo(610,300);x.stroke()`, mime: 'image/png', expected: { thin: true } },
  { id: 'wide-wordmark', name: 'Longform Works', tagline: 'Across every surface', kind: 'raster', w: 1800, h: 260, paint: `x.clearRect(0,0,w,h);x.fillStyle='#1d4ed8';x.font='800 190px Arial';x.fillText('LONGFORM WORKS',20,205)`, mime: 'image/png', expected: { shape: 'wide' } },
  { id: 'tall-stacked', name: 'Peak', tagline: 'Built upward', kind: 'raster', w: 420, h: 1000, paint: `x.clearRect(0,0,w,h);x.fillStyle='#166534';for(let i=0;i<4;i++){x.fillRect(80+i*28,760-i*180,260-i*56,120)}x.fillStyle='#14532d';x.font='800 95px Arial';x.fillText('PEAK',55,940)`, mime: 'image/png', expected: { shape: 'tall' } },
  { id: 'svg-logo', name: 'Vector', tagline: 'Made from structure', kind: 'svg', source: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400"><path fill="#2563eb" d="M80 60h250l120 140-120 140H80l120-140z"/><circle cx="570" cy="200" r="115" fill="#f97316"/></svg>`, expected: { svg: true, colour: 'multicolour' } },
  { id: 'accented-capital', name: 'Òké', tagline: 'Made with care', kind: 'raster', w: 700, h: 420, paint: `x.clearRect(0,0,w,h);x.fillStyle='#7c2d12';x.beginPath();x.arc(210,210,155,0,Math.PI*2);x.fill();x.fillStyle='#fb923c';x.fillRect(390,80,210,260)`, mime: 'image/png', expected: { regression: 'B22', glyphs: 'Òké' } },
  { id: 'language-coverage', name: 'Ọ̀nà', tagline: 'Ẹ̀wà, ìtẹ́lọ́rùn, ɓuri ɗaya', kind: 'raster', w: 800, h: 500, paint: `x.clearRect(0,0,w,h);x.fillStyle='#0f766e';x.beginPath();x.moveTo(90,250);x.bezierCurveTo(190,70,340,70,410,250);x.bezierCurveTo(480,430,630,430,710,250);x.bezierCurveTo(630,130,500,130,410,250);x.bezierCurveTo(320,370,190,370,90,250);x.fill()`, mime: 'image/png', expected: { glyphs: 'Yoruba + Hausa' } },
]

export const BRAND_NAMES = ['Aster', 'Beacon', 'Cedar', 'Drift', 'Ember', 'Field', 'Grove', 'Harbour', 'Index', 'Juniper']

export async function materializeBrandFixtures() {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const out = []
  try {
    for (const f of BRAND_FIXTURE_CASES) {
      if (f.kind === 'svg') {
        const file = path.join(dir, `${f.id}.svg`)
        if (!fs.existsSync(file)) fs.writeFileSync(file, f.source)
        out.push({ ...f, file })
        continue
      }
      const ext = f.mime === 'image/jpeg' ? 'jpg' : 'png'
      const file = path.join(dir, `${f.id}.${ext}`)
      if (!fs.existsSync(file)) {
        const data = await page.evaluate(([w, h, paint, mime]) => {
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          const x = c.getContext('2d')
          new Function('x', 'w', 'h', paint)(x, w, h)
          return c.toDataURL(mime, 0.94).split(',')[1]
        }, [f.w, f.h, f.paint, f.mime])
        fs.writeFileSync(file, Buffer.from(data, 'base64'))
      }
      out.push({ ...f, file })
    }
  } finally {
    await browser.close()
  }
  return out
}
