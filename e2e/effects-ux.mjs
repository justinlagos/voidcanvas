import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
const base = process.env.BASE || 'http://localhost:3123'
const inside = (rect, width, height) => rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width + 1 && rect.y + rect.height <= height + 1
try {
  await page.goto(`${base}/effects`)
  const photo = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 600; c.height = 400
    const x = c.getContext('2d'); x.fillStyle = '#e8ac64'; x.fillRect(0, 0, 600, 400)
    x.fillStyle = '#356b98'; x.fillRect(80, 80, 200, 200)
    return c.toDataURL().split(',')[1]
  })
  await page.locator('input[type=file]').first().setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(photo, 'base64') })
  await page.waitForFunction(() => document.querySelector('[data-result-canvas]')?.width === 600)
  await page.evaluate(() => {
    const c = document.querySelector('[data-result-canvas]')
    window.__ux = { resized: 0, blank: 0, frames: 0, running: true }
    for (const key of ['width', 'height']) {
      const d = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, key)
      Object.defineProperty(c, key, { get: () => d.get.call(c), set: v => { window.__ux.resized++; d.set.call(c, v) } })
    }
    const sample = () => {
      if (!window.__ux.running) return
      const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
      let alpha = 0; for (let i = 3; i < data.length; i += 400) alpha += data[i]
      window.__ux.frames++; if (!alpha) window.__ux.blank++
      requestAnimationFrame(sample)
    }; requestAnimationFrame(sample)
  })
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  const zoom = await page.locator('button[title="Actual size"]').evaluate(el => el.parentElement.innerText)
  await page.locator('[data-effect-pick="duotone"]').click()
  const panel = page.locator('[data-effects-inspector]')
  await panel.waitFor()
  const range = (await panel.getByRole('slider').all())[0]
  const r = await range.boundingBox()
  await page.mouse.move(r.x + r.width * 0.4, r.y + r.height / 2)
  await page.mouse.down(); await page.mouse.move(r.x + r.width * 0.8, r.y + r.height / 2, { steps: 25 }); await page.mouse.up()
  await range.focus(); for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft')
  await page.locator('[data-effect-pick="halftone"]').click()
  await page.locator('[data-effect-pick="duotone"]').click()
  await page.waitForTimeout(900)
  const audit = await page.evaluate(() => { window.__ux.running = false; return window.__ux })
  assert.equal(audit.resized, 0, 'Changing effects or sliders must never resize/clear the preview canvas')
  assert.equal(audit.blank, 0, 'Every observed preview frame must retain the image')
  assert(audit.frames > 10)
  assert.equal(await page.locator('button[title="Actual size"]').evaluate(el => el.parentElement.innerText), zoom, 'Effect changes preserve zoom')
  const move = page.getByRole('button', { name: 'Move effect controls', exact: true })
  const before = await panel.boundingBox(), handle = await move.boundingBox()
  await page.mouse.move(handle.x + 8, handle.y + 8); await page.mouse.down()
  await page.mouse.move(handle.x - 250, handle.y + 110, { steps: 8 }); await page.mouse.up()
  const after = await panel.boundingBox()
  assert(after.x < before.x - 100 && after.y > before.y + 50, 'Controls drag independently of artwork')
  await move.focus(); await page.keyboard.press('ArrowLeft')
  assert((await panel.boundingBox()).x < after.x, 'Keyboard moves controls')
  await page.setViewportSize({ width: 1100, height: 700 }); await page.waitForTimeout(100)
  assert(inside(await panel.boundingBox(), 1100, 700), 'Resizing keeps the entire inspector reachable')
  await page.getByRole('button', { name: 'Collapse effect controls' }).click()
  await page.locator('[data-effect-pick="halftone"]').click()
  await panel.getByRole('slider').first().waitFor({ state: 'visible' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('tab', { name: 'Browse effects' }).click()
  await page.locator('[data-effect-pick="duotone"]').click()
  assert.equal(await page.getByRole('tab', { name: 'Adjust effect' }).getAttribute('aria-selected'), 'true')
  await page.locator('#fx-adjust').getByRole('slider').first().waitFor({ state: 'visible' })
  assert.equal(await panel.isVisible(), false, 'Phone controls do not cover the image')
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Phone has no horizontal overflow')
  fs.mkdirSync('e2e/.out', { recursive: true })
  await page.screenshot({ path: 'e2e/.out/effects-ux-phone.png' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: 'e2e/.out/effects-ux-desktop.png' })
  console.log(`PASS effect selection/slider continuity (${audit.frames} observed frames), zoom, floating controls, resize, mobile`)

  await page.goto(`${base}/editor`)
  await page.waitForFunction(() => !!window.__voidEditor)
  await page.evaluate(() => {
    const s = window.__voidEditor.getState(); s.newDoc({ name: 'Movable blending', width: 600, height: 400, background: '#ffffff' })
    window.__voidEditor.getState().addShape('rect', 80, 80, 200, 200, { fill: '#356b98', name: 'Blue square' })
    window.dispatchEvent(new CustomEvent('vc:open', { detail: { name: 'layerStyle' } }))
  })
  const dialog = page.getByRole('dialog', { name: 'Layer style', exact: true })
  await dialog.waitFor()
  const d0 = await dialog.boundingBox(), grip = await page.getByRole('button', { name: 'Move Layer style window' }).boundingBox()
  await page.mouse.move(grip.x + 8, grip.y + 8); await page.mouse.down()
  await page.mouse.move(grip.x - 400, grip.y - 80, { steps: 8 }); await page.mouse.up()
  assert((await dialog.boundingBox()).x < d0.x - 250, 'Blending window can move clear of the artwork')
  const opacity = dialog.getByRole('slider', { name: 'Opacity', exact: true })
  await opacity.focus(); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft')
  assert(await opacity.evaluate(el => document.activeElement === el), 'Live adjustments never steal focus from the active control')
  await page.setViewportSize({ width: 900, height: 650 }); await page.waitForTimeout(100)
  assert(inside(await dialog.boundingBox(), 900, 650), 'Blending remains reachable after resize')
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' })
  assert.equal(await page.evaluate(() => window.__voidEditor.getState().active().opacity), 1, 'Escape restores original blend settings')
  assert.deepEqual(errors, [])
  console.log('PASS movable blending, focus stability, resize, cancel; no browser errors')
} finally { await browser.close() }
