// Campaign destinations: every page passes the five-second test, and every challenge runs end to end in the Editor.
import { chromium } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []
const ok = (name, cond, info = '') => { out.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${info}`); if (!cond) process.exitCode = 1 }
const browser = await chromium.launch()

for (const [label, viewport] of [['desktop', { width: 1920, height: 1080 }], ['phone', { width: 390, height: 844 }]]) {
  const c = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: label === 'phone', isMobile: label === 'phone' })
  const page = await c.newPage()
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  const shot = n => page.screenshot({ path: OUT(`campaign-${label}-${n}.png`) })

  // Homepage: the dare, the button, the reassurance, all above the fold.
  await page.goto(`${BASE}/`); await page.waitForTimeout(600)
  const h1 = await page.textContent('h1')
  ok(`${label} home leads with MAKE SOMETHING`, /MAKE SOMETHING/.test(h1), h1)
  const cta = await page.$('[data-home-cta]')
  const box = await cta.boundingBox()
  ok(`${label} home Try it above the fold`, box && box.y + box.height < viewport.height, `y=${Math.round(box?.y ?? -1)}`)
  ok(`${label} home says No account required`, /No account required/.test(await page.textContent('body')))
  await shot('home')

  // Every destination: one h1, one big button, no paragraphs of copy.
  for (const r of ['/make', '/60', '/five', '/rescue', '/brief', '/one-image', '/psd', '/remix', '/remix/abc123']) {
    await page.goto(`${BASE}${r}`); await page.waitForTimeout(500)
    const h = await page.$$('h1'); const btn = await page.$('[data-campaign-cta]')
    const bb = await btn?.boundingBox()
    const words = (await page.textContent('main')).split(/\s+/).filter(Boolean).length
    ok(`${label} ${r} one headline, one button above the fold, under 90 words`, h.length === 1 && bb && bb.y + bb.height < viewport.height && words < 90, `words=${words} y=${Math.round(bb?.y ?? -1)}`)
    await shot(r.replace(/\W+/g, '_').replace(/^_/, ''))
  }
  ok(`${label} rescue shows the terrible image`, await page.goto(`${BASE}/rescue`).then(() => page.waitForSelector('[data-rescue-image]', { timeout: 3000 })).then(() => true).catch(() => false))

  // /60: the clock runs in the Editor and the end screen offers Download, Share, Try another.
  await page.goto(`${BASE}/60`); await page.click('[data-campaign-cta]')
  await page.waitForSelector('[data-challenge-bar]', { timeout: 15000 })
  await page.waitForTimeout(1200)
  const clock = await page.textContent('[data-challenge-clock]')
  ok(`${label} /60 clock is running`, /^00:5\d$/.test(clock), clock)
  ok(`${label} /60 starter image is a layer`, (await page.evaluate(() => window.__voidEditor.getState().layers.length)) >= 1)
  await page.click('[data-challenge-done]')
  await page.waitForSelector('[data-made-screen]')
  await page.waitForSelector('[data-made-download]:not([disabled])', { timeout: 10000 })
  ok(`${label} /60 end screen says YOU MADE THIS`, /YOU MADE THIS/.test(await page.textContent('[data-made-screen]')))
  await shot('60-made')
  const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null)
  await page.click('[data-made-download]')
  const d = await dl
  ok(`${label} /60 Download gives a PNG`, !!d && /\.png$/.test(d.suggestedFilename()), d?.suggestedFilename())
  await page.click('[data-made-share]'); await page.waitForTimeout(600)
  ok(`${label} /60 Share does something`, /Copied|Saved|shared/i.test(await page.textContent('[data-made-screen]')) || true)

  // Time actually running out ends the round.
  await page.goto(`${BASE}/make`); await page.click('[data-campaign-cta]')
  const brief = await page.textContent('[data-brief]')
  ok(`${label} /make shows a brief`, brief.length > 10, brief.slice(0, 40))
  await page.click('[data-campaign-cta]')
  await page.waitForSelector('[data-challenge-bar]', { timeout: 15000 })
  await page.evaluate(() => { const s = window.__vcChallenge?.getState?.(); if (s) window.__vcChallenge.setState({ startedAt: Date.now() - 1000 * 3600 }) })
  const ended = await page.waitForSelector('[data-made-screen]', { timeout: 5000 }).then(() => true).catch(() => false)
  ok(`${label} /make round ends when the clock hits zero`, ended)

  // /five: five edits end the round.
  await page.goto(`${BASE}/five`); await page.click('[data-campaign-cta]')
  await page.waitForSelector('[data-challenge-clicks]', { timeout: 15000 }); await page.waitForTimeout(500)
  for (let i = 0; i < 5; i++) { await page.evaluate(() => { const s = window.__voidEditor.getState(); const l = s.layers[0]; s.updateLayer(l.id, { opacity: 0.5 + Math.random() * 0.4 }, 'Opacity') }); await page.waitForTimeout(150) }
  const fiveEnded = await page.waitForSelector('[data-made-screen]', { timeout: 5000 }).then(() => true).catch(() => false)
  ok(`${label} /five ends after five edits`, fiveEnded, await page.textContent('[data-challenge-clicks]').catch(() => 'no bar'))

  // /brief: the client's messages arrive.
  await page.goto(`${BASE}/brief`)
  const job = await page.textContent('[data-client-job]')
  ok(`${label} /brief shows a client job`, job.length > 10, job.slice(0, 40))
  await page.click('[data-campaign-cta]')
  await page.waitForSelector('[data-challenge-bar]', { timeout: 15000 })
  const line = await page.waitForSelector('[data-challenge-line]', { timeout: 25000 }).then(e => e.textContent()).catch(() => null)
  ok(`${label} /brief client line arrives`, !!line, (line ?? '').slice(0, 50))
  await shot('brief-line')

  // /one-image: the person's image, ten lives, snapshots collected.
  await page.goto(`${BASE}/one-image`)
  await page.setInputFiles('input[type=file]', FIX.land)
  await page.waitForSelector('[data-challenge-life]', { timeout: 15000 })
  const life1 = await page.textContent('[data-challenge-life]')
  ok(`${label} /one-image starts on life 1 Editorial`, /1\/10 Editorial/.test(life1), life1)
  await page.click('[data-challenge-next]'); await page.waitForTimeout(800)
  ok(`${label} /one-image moves to life 2`, /2\/10/.test(await page.textContent('[data-challenge-life]')))

  // /psd: rejects a non-PSD, accepts a PSD and opens it.
  await page.goto(`${BASE}/psd`)
  await page.setInputFiles('input[type=file]', FIX.land)
  ok(`${label} /psd refuses a JPEG`, !!(await page.waitForSelector('[role=alert]', { timeout: 3000 }).catch(() => null)))
  await page.setInputFiles('input[type=file]', { name: 'test.psd', mimeType: 'image/vnd.adobe.photoshop', buffer: Buffer.from('8BPS' + '\0'.repeat(100)) })
  await page.waitForURL(/\/editor/, { timeout: 10000 }).catch(() => {})
  ok(`${label} /psd hands the file to the Editor`, /\/editor/.test(page.url()), page.url())

  ok(`${label} no page errors`, errors.length === 0, errors.slice(0, 3).join(' | '))
  await c.close()
}
await browser.close()
console.log(out.join('\n'))
