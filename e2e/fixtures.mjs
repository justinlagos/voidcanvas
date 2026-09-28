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
  // A lockup whose meaning sits in a colour boundary (orange dot inside a blue disc) beside a dark wordmark: a flat knockout would melt it.
  lockup: await draw(OUT('lockup.png'), 900, 300, `x.fillStyle='#0b3d91';x.beginPath();x.arc(150,150,120,0,7);x.fill();x.fillStyle='#ff7a00';x.beginPath();x.arc(150,150,60,0,7);x.fill();x.fillStyle='#111827';x.font='bold 150px sans-serif';x.fillText('Kobo',300,205)`),
  // The same brand exported as a JPG on white: two colours that only meet the background, so every version can be derived.
  logoJpg: await draw(OUT('logo-jpg.jpg'), 900, 300, `x.fillStyle='#fff';x.fillRect(0,0,w,h);x.fillStyle='#0b3d91';x.beginPath();x.arc(150,150,120,0,7);x.fill();x.fillStyle='#111827';x.font='bold 150px sans-serif';x.fillText('Kobo',300,205)`),
  // A photo with a light side, a dark side and a "subject" on the right.
  photo: await draw(OUT('photo.jpg'), 1600, 1000, `const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'#d9c8a8');g.addColorStop(1,'#1a1a22');x.fillStyle=g;x.fillRect(0,0,w,h);x.fillStyle='#f0d0b0';x.beginPath();x.arc(1150,380,220,0,7);x.fill();x.fillStyle='#402a1a';x.fillRect(1000,560,300,440)`),
}
