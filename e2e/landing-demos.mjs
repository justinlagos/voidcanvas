// Landing page: every highlights tab at three moments of its loop, the footer and the top, in both themes, desktop and phone. Output in /tmp/claude-0/shots or OUT.
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:3123'
const b = await chromium.launch()
const out = '/tmp/claude-0/shots/'
async function run(theme, w, h, tag) {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  const p = await c.newPage()
  await p.addInitScript(t => { try { localStorage.setItem('vc-landing-theme', t) } catch {} }, theme)
  const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.goto('${BASE}/', { waitUntil: 'networkidle' })
  // tabs: capture each panel at a few moments
  const tabs = ['Voidcanvas', 'Studio', 'Editor', 'Effects', 'Brand']
  await p.locator('#highlights').scrollIntoViewIfNeeded(); await p.waitForTimeout(500)
  for (const t of tabs) {
    await p.getByRole('tab', { name: t }).click()
    const fig = p.locator('figure[role=tabpanel]')
    await fig.scrollIntoViewIfNeeded()
    for (const ms of [1500, 5000, 9500]) { await p.waitForTimeout(ms - (ms === 1500 ? 0 : ms === 5000 ? 1500 : 5000)); await fig.screenshot({ path: `${out}${tag}-${t}-${ms}.png` }) }
  }
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(1200)
  await p.locator('footer').screenshot({ path: `${out}${tag}-footer.png` })
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(800)
  await p.screenshot({ path: `${out}${tag}-top.png` })
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  console.log(tag, 'errors', errs, 'hoverflow', overflow)
  await c.close()
}
await run('dark', 1440, 900, 'dark')
await run('light', 1440, 900, 'light')
await run('dark', 390, 844, 'mdark')
await run('light', 390, 844, 'mlight')
await b.close()
