// U0 UX audit: measured desktop and phone checks across Editor, Effects, Studio and Brand.
// Writes e2e/.out/ux-audit/{report.json,report.md} and screenshots per surface and view.
// Gates (exit 1) on hard defects only: uncaught page errors, horizontal page overflow on a phone, sliders that
// ignore the keyboard, a tool control that never changes, and the interaction checks below.
// Interaction checks drive the real UI with pointer, keyboard and touch input and then read the result back.
// Everything else (load time, heap, obstruction, clipping, truncation, small targets) is measured and reported.
import fs from 'node:fs'
import path from 'node:path'
import { chromium, devices } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'

const BASE = process.env.BASE || 'http://localhost:3123'
const auditDir = path.join(path.dirname(OUT('ux-audit')), 'ux-audit')
fs.mkdirSync(auditDir, { recursive: true })

const SURFACES = [
  { name: 'editor', path: '/editor', upload: true },
  { name: 'effects', path: '/effects', upload: true },
  { name: 'studio', path: '/studio' },
  { name: 'brand', path: '/brand' },
]
const VIEWS = [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['phone', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }],
]

// Runs inside the page. Returns layout facts only; nothing is changed.
function layoutFacts(isPhone) {
  const vis = el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 }
  const name = el => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 60)
  // sr-only text is clipped on purpose (it is read by screen readers only), so it is not a layout defect.
  const leaves = [...document.querySelectorAll('body *')].filter(el => vis(el) && !el.children.length && el.textContent.trim() && !el.classList.contains('sr-only'))
  const clipped = [], truncated = []
  for (const el of leaves) {
    const cs = getComputedStyle(el)
    const overflows = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
    if (!overflows) continue
    // Ellipsis is intentional truncation (the full text is still in the DOM); it is reported apart from clipping.
    if (cs.textOverflow === 'ellipsis') { truncated.push(name(el)); continue }
    const hidden = cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.overflowY === 'hidden' || cs.overflowY === 'clip'
    if (hidden) clipped.push(name(el))
  }
  const smallTargets = isPhone
    ? [...document.querySelectorAll('button, a[href], input, select, [role="button"]')].filter(el => vis(el) && (el.getBoundingClientRect().width < 24 || el.getBoundingClientRect().height < 24)).map(name)
    : []
  // Canvas obstruction: sample the visible part of the stage and see what the top-most element is at each point.
  let obstruction = null
  const stage = document.querySelector('[data-stage]')
  if (stage) {
    const r = stage.getBoundingClientRect()
    const x0 = Math.max(0, r.left), x1 = Math.min(innerWidth, r.right)
    const y0 = Math.max(0, r.top), y1 = Math.min(innerHeight, r.bottom)
    let total = 0, covered = 0; const blockers = new Map()
    if (x1 > x0 && y1 > y0) for (let i = 1; i < 24; i++) for (let j = 1; j < 16; j++) {
      const x = x0 + ((x1 - x0) * i) / 24, y = y0 + ((y1 - y0) * j) / 16
      const top = document.elementFromPoint(x, y)
      if (!top) continue
      total++
      const panel = top.closest('[data-floating],[data-mobile-sheet],[data-context-bar],[data-text-edit-bar],header,nav')
      if (panel || !stage.contains(top)) { covered++; const k = panel ? name(panel) : name(top); blockers.set(k, (blockers.get(k) || 0) + 1) }
    }
    obstruction = { percentCovered: total ? Math.round((100 * covered) / total) : null, blockers: [...blockers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n]) => n) }
  }
  return {
    pageOverflowX: document.documentElement.scrollWidth - innerWidth,
    clipped: clipped.slice(0, 8),
    clippedCount: clipped.length,
    truncatedCount: truncated.length,
    smallTargets: smallTargets.slice(0, 10),
    smallTargetCount: smallTargets.length,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    obstruction,
  }
}

// Times how long a press takes to flip aria-expanded or aria-pressed. Menu triggers are skipped: pressing one
// opens a menu that the audit would then leave on screen. Runs inside the page.
function toolTiming() {
  const name = el => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 60)
  // Only a control that is currently off can visibly change when pressed; the active tool or filter would not.
  const off = b => b.getAttribute('aria-pressed') === 'false' || b.getAttribute('aria-expanded') === 'false'
  const btn = [...document.querySelectorAll('button[aria-expanded]:not([aria-haspopup]), button[aria-pressed]')].find(b => {
    const r = b.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && !b.disabled && off(b)
  })
  if (!btn) return Promise.resolve(null)
  const attr = btn.hasAttribute('aria-expanded') ? 'aria-expanded' : 'aria-pressed'
  const before = btn.getAttribute(attr)
  const t0 = performance.now()
  // Remember which sibling was pressed (the active tool or mode), so it can be pressed back afterwards.
  const prior = [...(btn.parentElement?.querySelectorAll('button[aria-pressed="true"]') || [])].filter(b => b !== btn)
  return new Promise(resolve => {
    // Press once to time the change, then put the surface back as it was.
    const done = ms => {
      mo.disconnect()
      if (attr === 'aria-pressed' && prior.length) prior[0].click()
      else btn.click()
      resolve({ control: name(btn), attr, ms })
    }
    const mo = new MutationObserver(() => { if (btn.getAttribute(attr) !== before) done(+(performance.now() - t0).toFixed(1)) })
    mo.observe(btn, { attributes: true })
    btn.click()
    setTimeout(() => done(null), 2000)
  })
}

// Real interaction checks on the desktop Editor. Each returns { name, pass, detail }.
async function desktopInteractions(p) {
  const out = []
  const check = (n, pass, detail = '') => out.push({ name: n, pass: !!pass, detail: String(detail) })
  // Rows do not say what kind of layer they hold, so press rows until one shows image actions (the photo layer).
  const rows = p.locator('[role="listbox"][aria-label="Layers"] [role="option"]')
  const floating = p.locator('[data-floating]')
  // The floating bar appears only with the Move tool. Set it explicitly (V) rather than inherit whatever earlier checks left.
  await p.evaluate(() => document.activeElement?.blur()); await p.keyboard.press('v'); await p.waitForTimeout(150)
  let row = rows.first(), isRaster = false
  for (let i = 0, count = await rows.count(); i < Math.min(count, 8) && !isRaster; i++) {
    row = rows.nth(i); await row.click(); await p.waitForTimeout(150)
    isRaster = (await floating.locator('button[aria-label="Replace image"]').count()) === 1
  }
  check('layer row selects on click', (await row.getAttribute('aria-selected')) === 'true')

  // Context: a raster layer shows image actions and no text actions.
  check('a layer shows image actions when selected', isRaster)
  check('raster selection hides text actions', (await floating.locator('button:has-text("Edit text")').count()) === 0)

  // Dialog dismissal and selection persistence: Ctrl+K opens the action search; Escape closes it; selection stays.
  const search = p.locator('[role="dialog"][aria-label="Search actions"]')
  await p.keyboard.press('Control+k'); await p.waitForTimeout(200)
  check('Ctrl+K opens action search', await search.isVisible())
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  check('Escape closes action search', !(await search.isVisible()))
  check('selection survives dismissing a dialog', (await row.getAttribute('aria-selected')) === 'true')

  // Each step below is wrapped so a control that cannot be found is reported by name, not as a generic failure.
  const guard = async (name, fn) => { try { await fn() } catch (e) { check(name, false, e.message.split('\n')[0].slice(0, 160)) } }

  // Modal dismissal: Filters opens the effects gallery and Escape closes it.
  const dialogs = p.locator('[role="dialog"]:visible')
  await guard('Filters button can be pressed', async () => {
    await floating.locator('button:has-text("Filters")').first().click({ timeout: 4000 }); await p.waitForTimeout(400)
    const openBefore = await dialogs.count()
    check('Filters opens the effects gallery', openBefore > 0, `${openBefore} open`)
    if (openBefore > 0) {
      await p.keyboard.press('Escape'); await p.waitForTimeout(250)
      check('Escape closes the effects gallery', (await dialogs.count()) < openBefore, `${openBefore} -> ${await dialogs.count()}`)
    }
  })
  // Sliders sit in the Properties sections. Open the collapsed sections a user would open until one has a slider.
  for (const b of await p.locator('[data-section] button[aria-expanded="false"]:visible').all()) {
    if ((await p.locator('input[type="range"]:visible').count()) > 0) break
    await b.click().catch(() => {}); await p.waitForTimeout(120)
  }
  // Slider: a real pointer drag on the range moves the value, and the number field beside it follows.
  const ranges = p.locator('input[type="range"]:visible')
  const n = await ranges.count()
  check('properties expose sliders', n > 0, `${n} visible`)
  if (n > 0) await guard('slider drag and number sync', async () => {
    // Read every fact from ONE element handle. Locators re-query the DOM on each call, so reading min/max and the
    // value through separate locators can mix two sliders if the panel re-renders (the "0..100 but 171" report).
    const handle = await ranges.first().elementHandle()
    if (!handle) throw new Error('slider disappeared before it could be read')
    const state = () => handle.evaluate(el => ({ label: el.getAttribute('aria-label'), min: Number(el.min), max: Number(el.max), step: Number(el.step) || 1, value: Number(el.value), named: el.getAttribute('aria-label'), rect: el.getBoundingClientRect().toJSON() }))
    const s0 = await state()
    const label = s0.label || 'unlabelled slider', { min, max, step } = s0
    // Labelled sliders pair with an aria-labelled field; unlabelled ones pair with the number input in their own row.
    const numEl = s0.named
      ? p.locator(`input[aria-label="${s0.named} value"]`).first()
      : (await handle.evaluateHandle(el => el.parentElement?.querySelector('input[type="number"]') ?? el.parentElement?.parentElement?.querySelector('input[type="number"]') ?? null)).asElement()
    const hasNum = s0.named ? (await numEl.count()) > 0 : !!numEl
    await handle.evaluate(el => el.scrollIntoView({ block: 'center' })); await p.waitForTimeout(100)
    const box = (await state()).rect, y = box.y + box.height / 2
    const before = (await state()).value
    check(`slider "${label}" value sits inside its range`, before >= min && before <= max, `value ${before}, range ${min}..${max}`)
    await p.mouse.move(box.x + box.width * 0.2, y); await p.mouse.down()
    await p.mouse.move(box.x + box.width * 0.8, y, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(150)
    const after = (await state()).value
    check(`pointer drag moves "${label}"`, after !== before, `${before} -> ${after} (range ${min}..${max})`)
    if (hasNum) check(`"${label}" number field follows the drag`, Math.abs(Number(await numEl.inputValue()) - after) < 1e-6, `field ${await numEl.inputValue()}, slider ${after}`)
    // Typing a value in the number field moves the slider.
    const target = min + (max - min) * 0.6
    if (hasNum) {
      await numEl.fill(String(target)); await numEl.evaluate(el => el.blur()); await p.waitForTimeout(150)
      const typed = (await state()).value
      check(`typing in "${label} value" moves the slider`, Math.abs(typed - target) <= step, `typed ${target}, slider ${typed}`)
    }
    await handle.dispose()
  })
  return out
}

// Real touch checks on the phone Editor: sheet opens, selects a layer, closes via Done, mode bar changes state.
async function phoneInteractions(p) {
  const out = []
  const check = (n, pass, detail = '') => out.push({ name: n, pass: !!pass, detail: String(detail) })
  await p.tap('button[aria-label^="Layers"]'); await p.waitForTimeout(300)
  const sheet = p.locator('[data-mobile-sheet]')
  check('phone Layers opens a sheet', (await sheet.count()) === 1)
  const opt = p.locator('[data-mobile-sheet] [role="option"]').first()
  const hasOpt = (await opt.count()) > 0
  check('phone Layers sheet lists layers', hasOpt)
  if (hasOpt) {
    // The sheet may close on the tap itself, which detaches the row, so read selection from the page as a whole.
    await opt.tap({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(250)
    const selected = (await p.locator('[role="option"][aria-selected="true"]').count()) + (await p.locator('[data-context-bar]').count())
    check('tapping a layer selects it', selected > 0, (await sheet.count()) > 0 ? 'sheet stayed open' : 'sheet closed on tap')
  }
  const openBeforeDone = (await sheet.count()) > 0
  if (openBeforeDone) await p.tap('[data-mobile-sheet] button[aria-label="Close"]', { timeout: 4000 })
  await p.waitForTimeout(300)
  check('sheet is gone after closing', (await sheet.count()) === 0)
  check('selection persists after the sheet closes', (await p.locator('[data-context-bar]').count()) > 0)
  // Mode bar: Back from a picked layer, then a mode press changes aria-pressed.
  if (await p.$('[data-context-bar] button[aria-label="Back"]')) { await p.tap('[data-context-bar] button[aria-label="Back"]'); await p.waitForTimeout(250) }
  const text = p.locator('nav[aria-label="Modes"] button:has-text("Text")')
  await text.tap(); await p.waitForTimeout(250)
  check('mode press changes its pressed state', (await text.getAttribute('aria-pressed')) === 'true')
  return out
}

const browser = await chromium.launch()
const failures = []
const rows = []
const interactions = []

for (const s of SURFACES) for (const [view, opts] of VIEWS) {
  const where = `${s.name}/${view}`
  const ctx = await browser.newContext(opts)
  const p = await ctx.newPage()
  p.setDefaultTimeout(6000)
  const errors = []
  p.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 160)}`) })

  const t0 = Date.now()
  await p.goto(BASE + s.path, { waitUntil: 'load' })
  await p.waitForTimeout(800)
  const loadMs = Date.now() - t0
  const navTiming = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n ? Math.round(n.domContentLoadedEventEnd) : null })

  if (s.upload) {
    const input = await p.$('input[type=file]')
    if (input) { await input.setInputFiles(FIX.land); await p.waitForTimeout(2500) }
  }
  const facts = await p.evaluate(layoutFacts, view === 'phone')
  await p.screenshot({ path: path.join(auditDir, `${s.name}-${view}.png`) })

  // Sliders: each visible native range must move from the keyboard.
  const sliderHandles = []
  for (const h of await p.$$('input[type=range]')) if (await h.isVisible()) sliderHandles.push(h)
  const sliders = { total: sliderHandles.length, unresponsive: [] }
  for (const h of sliderHandles.slice(0, 8)) {
    const label = (await h.getAttribute('aria-label')) || (await h.getAttribute('name')) || 'slider'
    await h.focus()
    const before = await h.inputValue()
    await p.keyboard.press('ArrowRight')
    const after = await h.inputValue()
    if (before === after) sliders.unresponsive.push(label)
    else await p.keyboard.press('ArrowLeft')
  }

  // Tool timing: one toggle, then the control is pressed back so the surface is left as it was.
  const timing = await p.evaluate(toolTiming)
  await p.waitForTimeout(150)
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)

  // Real interactions, on the surfaces where they apply.
  let inter = []
  const script = s.name === 'editor' && s.upload && view === 'desktop' ? desktopInteractions : s.name === 'editor' && s.upload && view === 'phone' ? phoneInteractions : null
  if (script) {
    // A step that cannot find its control is a failed check, not a crash that hides the rest of the report.
    try { inter = await script(p) } catch (e) { inter = [{ name: 'interaction script ran to the end', pass: false, detail: e.message.split('\n')[0].slice(0, 160) }] }
  }
  if (inter.length) {
    await p.screenshot({ path: path.join(auditDir, `${s.name}-${view}-after-interaction.png`) })
    interactions.push({ where, checks: inter })
    for (const c of inter) if (!c.pass) failures.push(`${where}: ${c.name}${c.detail ? ` (${c.detail})` : ''}`)
  }

  const row = { surface: s.name, view, loadMs, domContentLoadedMs: navTiming, ...facts, sliders, tool: timing ? { control: timing.control, attr: timing.attr, ms: timing.ms } : null, errors: errors.slice(0, 5), errorCount: errors.length }
  rows.push(row)

  const pageErrors = errors.filter(e => e.startsWith('pageerror'))
  if (pageErrors.length) failures.push(`${where}: ${pageErrors.length} uncaught page error(s): ${pageErrors[0]}`)
  if (view === 'phone' && facts.pageOverflowX > 1) failures.push(`${where}: page is ${facts.pageOverflowX}px wider than the phone viewport`)
  if (sliders.unresponsive.length) failures.push(`${where}: slider(s) ignore the keyboard: ${sliders.unresponsive.join(', ')}`)
  if (timing && timing.ms === null) failures.push(`${where}: "${timing.control}" never changed its ${timing.attr} after a click`)
  await ctx.close()
}

await browser.close()

fs.writeFileSync(path.join(auditDir, 'report.json'), JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), failures, rows, interactions }, null, 2))
const md = [
  '# U0 UX audit', '', `Base: ${BASE}`, '',
  '| Surface | View | Load ms | DOMContentLoaded ms | Page overflow px | Clipped text | Truncated (ellipsis) | Small targets | Sliders (unresponsive / total) | Canvas covered | Tool flip ms | Heap MB | Page errors |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(r => `| ${r.surface} | ${r.view} | ${r.loadMs} | ${r.domContentLoadedMs ?? '-'} | ${r.pageOverflowX} | ${r.clippedCount} | ${r.truncatedCount} | ${r.smallTargetCount} | ${r.sliders.unresponsive.length} / ${r.sliders.total} | ${r.obstruction ? r.obstruction.percentCovered + '%' : '-'} | ${r.tool ? (r.tool.ms ?? 'no change') : '-'} | ${r.heapMB ?? '-'} | ${r.errors.filter(e => e.startsWith('pageerror')).length} uncaught, ${r.errorCount} total |`),
  '', '## Interaction checks', ...interactions.flatMap(i => [`### ${i.where}`, ...i.checks.map(c => `- ${c.pass ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` (${c.detail})` : ''}`)]),
  '', '## Failures', ...(failures.length ? failures.map(f => `- ${f}`) : ['None.']), '',
  '## Details', ...rows.flatMap(r => [`### ${r.surface} / ${r.view}`, '```json', JSON.stringify({ clipped: r.clipped, truncatedCount: r.truncatedCount, smallTargets: r.smallTargets, obstruction: r.obstruction, errors: r.errors }, null, 2), '```']),
]
fs.writeFileSync(path.join(auditDir, 'report.md'), md.join('\n') + '\n')
console.log(md.join('\n'))
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nno gating failures')
if (failures.length) process.exitCode = 1
