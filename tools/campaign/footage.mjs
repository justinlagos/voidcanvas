// Footage for the six campaign videos: Playwright drives the local campaign build and records each flow.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
const BASE = process.env.BASE || 'http://localhost:3123'
const P = '/home/claude/statics/photos', OUT = '/home/claude/video/footage'
const only = process.argv[2]
const browser = await chromium.launch()

const CURSOR = `
(() => { const run = () => { const c = document.createElement('div'); c.id = '__cur'; c.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;width:26px;height:34px;left:-100px;top:-100px;transition:none';
c.innerHTML = '<svg width="26" height="34" viewBox="0 0 24 32"><path d="M3 2l17 12-7 1 4 9-3 1.4-4-9-5 5.6z" fill="#fff" stroke="#000" stroke-width="1.6"/></svg>';
document.body.appendChild(c); window.addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px' }, true);
window.addEventListener('mousedown', e => { const r = document.createElement('div'); r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;width:44px;height:44px;border-radius:50%;border:3px solid #8b7cff;left:'+(e.clientX-22)+'px;top:'+(e.clientY-22)+'px;opacity:.9;transition:transform .35s ease-out,opacity .35s ease-out'; document.body.appendChild(r); requestAnimationFrame(() => { r.style.transform = 'scale(1.8)'; r.style.opacity = '0' }); setTimeout(() => r.remove(), 400) }, true) }; if (document.body) run(); else document.addEventListener('DOMContentLoaded', run) })()`

async function flow(name, viewport, fn, scale = 1) {
  if (only && only !== name) return
  const dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, recordVideo: { dir, size: { width: viewport.width * scale, height: viewport.height * scale } }, isMobile: scale > 1, hasTouch: scale > 1 })
  const page = await ctx.newPage()
  await ctx.addInitScript(CURSOR)
  const log = []; page.on('pageerror', e => log.push({ t: -1, label: 'PAGEERR ' + e.message.slice(0, 200) }))
  const t0 = Date.now(); const mark = label => log.push({ t: (Date.now() - t0) / 1000, label })
  // Human-ish helpers.
  let cur = { x: viewport.width / 2, y: viewport.height / 2 }
  const moveTo = async (x, y, ms = 500) => { const steps = Math.max(8, Math.round(ms / 16)); await page.mouse.move(x, y, { steps }); cur = { x, y } }
  const click = async (sel, ms = 550) => { const el = page.locator(sel).first(); await el.waitFor({ timeout: 15000 }); await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(150); const b = await el.boundingBox(); await moveTo(b.x + b.width / 2, b.y + b.height / 2, ms); await page.waitForTimeout(120); await page.mouse.down(); await page.waitForTimeout(70); await page.mouse.up(); mark('click ' + sel) }
  const wait = ms => page.waitForTimeout(ms)
  const hideBar = () => page.evaluate(() => window.__vcChallenge?.setState({ active: null }))
  try { await fn({ page, click, moveTo, wait, mark, hideBar }) } catch (e) { console.error(name, e.message); mark('ERROR ' + e.message) }
  await wait(600)
  await page.close(); await ctx.close()
  const v = fs.readdirSync(dir).find(f => f.endsWith('.webm'))
  fs.renameSync(path.join(dir, v), path.join(OUT, name + '.webm')); fs.rmSync(dir, { recursive: true, force: true })
  fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(log, null, 1))
  console.log(name, 'done', log.at(-1)?.t.toFixed(1) + 's')
}

const D = { width: 1080, height: 1350 }
const canvasCenter = async page => { const b = await page.locator('[role=application]').boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } }

// Common editing beats inside the Editor.
async function addFilter(h, name) {
  await h.click('header button:has-text("Add")'); await h.wait(600)
  await h.click(`[role=dialog] button:has(span:text-is("${name}"))`); await h.wait(1100); h.mark('filter ' + name)
}
async function addHeadline(h, text) {
  const { page } = h
  await h.click('header button:has-text("Add")'); await h.wait(600)
  await h.click('[role=dialog] button:has(span:text-is("Text"))'); await h.wait(400)
  await page.evaluate(() => { const s = window.__voidEditor.getState(); const l = [...s.layers].reverse().find(x => x.type === 'text'); if (l) s.updateLayer(l.id, { fontSize: 150, fontWeight: 700, color: '#ffffff', x: 80, y: 980 }) }); await h.wait(300)
  // Type it in, one letter at a time, so the words appear on the board.
  for (let i = 1; i <= text.length; i++) { await page.evaluate(t => { const s = window.__voidEditor.getState(); const l = [...s.layers].reverse().find(x => x.type === 'text'); if (l) s.updateLayer(l.id, { text: t }) }, text.slice(0, i)); await page.waitForTimeout(70) }
  await page.evaluate(() => { const s = window.__voidEditor.getState(); const l = [...s.layers].reverse().find(x => x.type === 'text'); if (l) s.updateLayer(l.id, { text: l.text }, 'Type') })
  await h.wait(500); h.mark('typed ' + text)
}

// 01 Sixty seconds: the clock runs, the work happens, export at 00:03.
await flow('sixty', D, async h => {
  const { page } = h
  await page.goto(`${BASE}/60?brief=no-signal`); await h.wait(1500)
  await h.click('[data-campaign-cta]'); await page.waitForSelector('[data-challenge-clock]', { timeout: 20000 }); await h.wait(1200); h.mark('editor')
  await addFilter(h, 'Halftone')
  await addHeadline(h, 'NO SIGNAL')
  await addFilter(h, 'Glitch')
  // Jump the clock so it reads 00:04 on camera.
  await page.evaluate(() => window.__vcChallenge.setState({ startedAt: Date.now() - 56000 })); h.mark('clock 00:04')
  await h.wait(1500); await h.click('[data-challenge-done]', 700); await page.waitForSelector('[data-made-download]:not([disabled])'); h.mark('made'); await h.wait(1200)
  await h.click('[data-made-download]'); await h.wait(1200)
})

// 02 No ceremony: open it, no signup, straight into making.
await flow('ceremony', D, async h => {
  const { page } = h
  await page.goto(`${BASE}/`); await h.wait(1600); h.mark('home')
  await h.click('[data-home-cta]', 800); await page.waitForURL(/\/make/); await page.goto(`${BASE}/make?brief=expensive`); await h.wait(1300); h.mark('make')
  await h.click('[data-campaign-cta]'); await h.wait(1500); h.mark('brief')
  await h.click('[data-campaign-cta]'); await page.waitForSelector('[data-challenge-bar]', { timeout: 20000 }); await h.wait(1000); h.mark('editor')
  await addFilter(h, 'Pop Art')
  await addHeadline(h, 'SECOND SUN')
  await h.click('[data-challenge-done]'); await page.waitForSelector('[data-made-download]:not([disabled])'); h.mark('made'); await h.wait(1500)
})

// 03 One image, five lives: Effects then the Editor.
await flow('lives', D, async h => {
  const { page } = h
  await page.goto(`${BASE}/effects`); await h.wait(800)
  await page.setInputFiles('input[type=file]', `${P}/street.jpg`); await page.waitForSelector('canvas[data-result-canvas]'); await h.wait(1400); h.mark('photo')
  for (const e of ['Halftone', 'Dither', 'Glitch']) { await h.click(`[data-effects-sidebar] button:has-text("${e}")`); await h.wait(1800); h.mark(e) }
  await h.click('button:has-text("Editor")'); await page.waitForURL(/\/editor/); await h.wait(1500); h.mark('editor')
  await addHeadline(h, 'SECOND SUN'); h.mark('poster')
  await h.wait(800)
})

// 04 Client from hell: the brief, the messages, the boards.
await flow('client', D, async h => {
  const { page } = h
  await page.goto(`${BASE}/brief`); await h.wait(1500); h.mark('brief page')
  await h.click('[data-campaign-cta]'); await page.waitForSelector('[data-challenge-bar]', { timeout: 20000 }); await h.wait(900); h.mark('editor')
  await addFilter(h, 'Posterize')
  await addHeadline(h, 'LAUNCH')
  await page.waitForSelector('[data-challenge-line]', { timeout: 25000 }); h.mark('line'); await h.wait(2500)
  await page.evaluate(() => { const s = window.__voidEditor.getState(); s.addFrame({ name: 'Story', width: 1080, height: 1920 }); window.__voidEditor.getState().addFrame({ name: 'A4', width: 2480, height: 3508 }); window.__voidEditor.getState().addFrame({ name: 'Post', width: 1080, height: 1080 }); window.__voidEditor.getState().organiseFrames() })
  await page.keyboard.press('Control+0'); h.mark('boards'); await h.wait(2000)
  await h.click('header button:has-text("Export")'); h.mark('export'); await h.wait(2200)
})

// 05 The other 80%: boards, export, formats.
await flow('eighty', D, async h => {
  const { page } = h
  await page.goto(`${BASE}/one-image`); await page.setInputFiles('input[type=file]', `${P}/portrait.jpg`); await page.waitForSelector('[data-challenge-life]', { timeout: 20000 }); await h.hideBar(); await h.wait(1000); h.mark('editor')
  await addHeadline(h, 'TOKYO 2040')
  await page.evaluate(() => { for (const f of [{ name: 'Story', width: 1080, height: 1920 }, { name: 'LinkedIn', width: 1200, height: 627 }, { name: 'A4', width: 2480, height: 3508 }, { name: 'Web', width: 1920, height: 1080 }]) window.__voidEditor.getState().addFrame(f); window.__voidEditor.getState().organiseFrames() })
  await page.keyboard.press('Control+0'); h.mark('boards'); await h.wait(2000)
  await h.click('header button:has-text("Export")'); h.mark('export'); await h.wait(2500)
  await page.keyboard.press('Escape'); await h.wait(600)
})

// 06 Make something: try, undo, change direction, export.
await flow('make', D, async h => {
  const { page } = h
  await page.goto(`${BASE}/make?brief=second-sun`); await h.wait(1200); h.mark("make")
  await h.click('[data-campaign-cta]'); await h.wait(1400); h.mark('brief')
  await h.click('[data-campaign-cta]'); await page.waitForSelector('[data-challenge-bar]', { timeout: 20000 }); await h.wait(1000); h.mark('editor')
  await addFilter(h, 'Pixelate'); await h.wait(600)
  await page.keyboard.press('Control+z'); h.mark('undo'); await h.wait(1200); await page.keyboard.press('Escape'); await h.moveTo(400, 400, 300); await h.wait(400)
  await addFilter(h, 'Halftone')
  await addHeadline(h, 'NO SIGNAL')
  await addFilter(h, 'Solarize'); await h.wait(500)
  await h.wait(600)
  await h.click('[data-challenge-done]'); await page.waitForSelector('[data-made-download]:not([disabled])'); h.mark('made'); await h.wait(1200)
  await h.click('[data-made-share]'); await h.wait(1500)
})

// 06b Someone else opens it on a phone.
await flow('phone', { width: 540, height: 675 }, async h => {
  const { page } = h
  await page.goto(`${BASE}/make`); await h.wait(1200)
  await h.click('[data-campaign-cta]'); await h.wait(1200)
  await h.click('[data-campaign-cta]'); await page.waitForSelector('[data-challenge-bar]', { timeout: 20000 }); await h.wait(1200); h.mark('editor')
  await addFilter(h, 'Halftone'); await h.wait(800)
}, 1)

await browser.close()
