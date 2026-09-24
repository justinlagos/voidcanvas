// Test images drawn on the fly (no binaries in the repo) and an output folder for screenshots and downloads.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const dir = path.resolve('e2e/.out')
fs.mkdirSync(dir, { recursive: true })
export const OUT = name => path.join(dir, name)

async function draw(file, w, h, paint) {
  if (fs.existsSync(file)) return file
  const b = await chromium.launch(); const p = await b.newPage()
  const data = await p.evaluate(([w, h, paint, mime]) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d')
    new Function('x', 'w', 'h', paint)(x, w, h)
    return c.toDataURL(mime, 0.9).split(',')[1]
  }, [w, h, paint, file.endsWith('.png') ? 'image/png' : 'image/jpeg'])
  fs.writeFileSync(file, Buffer.from(data, 'base64')); await b.close(); return file
}
export const FIX = {
  land: await draw(OUT('land.jpg'), 2000, 1335, `x.fillStyle='#1e8c5a';x.fillRect(0,0,w,h);x.fillStyle='#faf03c';for(let i=0;i<w;i+=200){x.beginPath();x.ellipse(i+75,375,75,75,0,0,7);x.fill()}`),
  portrait: await draw(OUT('portrait.jpg'), 2000, 3000, `x.fillStyle='#285aa0';x.fillRect(0,0,w,h);x.fillStyle='#e67828';for(let i=0;i<h;i+=150)x.fillRect(0,i,w,75)`),
  logo: await draw(OUT('logo.png'), 600, 300, `x.fillStyle='#e65028';x.beginPath();x.ellipse(150,150,130,130,0,0,7);x.fill();x.fillRect(320,60,260,180)`),
}
