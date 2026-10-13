// U0 UX audit: measured desktop and phone checks across Editor, Effects, Studio and Brand.
// Writes e2e/.out/ux-audit/{report.json,report.md} and one screenshot per surface and view.
// Gates (exit 1) only on hard defects: uncaught page errors, horizontal page overflow on a phone,
// sliders that ignore the keyboard, and a tool control whose state never changes.
// Everything else (load time, heap, obstruction, clipping, small targets) is measured and reported.
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
  const all = [...document.querySelectorAll('body *')].filter(vis)
  const clipped = all.filter(el => {
    if (el.children.length || !el.textContent.trim()) return false
    const cs = getComputedStyle(el)
    const hidden = cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.overflowY === 'hidden' || cs.overflowY === 'clip'
    // Single-line labels that end in an ellipsis are truncated on purpose; only unintended clipping counts.
    if (cs.textOverflow === 'ellipsis') return false
    return hidden && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
  }).map(name)
  const smallTargets = isPhone
    ? all.filter(el => (el.matches('button, a[href], input, select, [role="button"]')) && (el.getBoundingClientRect().width < 24 || el.getBoundingClientRect().height < 24)).map(name)
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
    smallTargets: smallTargets.slice(0, 10),
    smallTargetCount: smallTargets.length,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    obstruction,
  }
}

// Times how long a press takes to flip aria-expanded or aria-pressed. Runs inside the page.
function toolTiming() {
  const name = el => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 60)
  const btn = [...document.querySelectorAll('button[aria-expanded], button[aria-pressed]')].find(b => {
    const r = b.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && !b.disabled
  })
  if (!btn) return Promise.resolve(null)
  const attr = btn.hasAttribute('aria-expanded') ? 'aria-expanded' : 'aria-pressed'
  const before = btn.getAttribute(attr)
  const t0 = performance.now()
  return new Promise(resolve => {
    const done = ms => { mo.disconnect(); resolve({ control: name(btn), attr, ms }) }
    const mo = new MutationObserver(() => { if (btn.getAttribute(attr) !== before) done(+(performance.now() - t0).toFixed(1)) })
    mo.observe(btn, { attributes: true })
    btn.click()
    setTimeout(() => done(null), 2000)
  })
}

const browser = await chromium.launch()
const failures = []
const rows = []

for (const s of SURFACES) for (const [view, opts] of VIEWS) {
  const where = `${s.name}/${view}`
  const ctx = await browser.newContext(opts)
  const p = await ctx.newPage()
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

  const timing = await p.evaluate(toolTiming)
  await p.screenshot({ path: path.join(auditDir, `${s.name}-${view}.png`) })

  const row = { surface: s.name, view, loadMs, domContentLoadedMs: navTiming, ...facts, sliders, tool: timing, errors: errors.slice(0, 5), errorCount: errors.length }
  rows.push(row)

  const pageErrors = errors.filter(e => e.startsWith('pageerror'))
  if (pageErrors.length) failures.push(`${where}: ${pageErrors.length} uncaught page error(s): ${pageErrors[0]}`)
  if (view === 'phone' && facts.pageOverflowX > 1) failures.push(`${where}: page is ${facts.pageOverflowX}px wider than the phone viewport`)
  if (sliders.unresponsive.length) failures.push(`${where}: slider(s) ignore the keyboard: ${sliders.unresponsive.join(', ')}`)
  if (timing && timing.ms === null) failures.push(`${where}: "${timing.control}" never changed its ${timing.attr} after a click`)
  await ctx.close()
}

await browser.close()

fs.writeFileSync(path.join(auditDir, 'report.json'), JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), failures, rows }, null, 2))
const md = [
  '# U0 UX audit', '', `Base: ${BASE}`, '',
  '| Surface | View | Load ms | DOMContentLoaded ms | Page overflow px | Clipped text | Small targets | Sliders (unresponsive / total) | Canvas covered | Tool flip ms | Heap MB | Page errors |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(r => `| ${r.surface} | ${r.view} | ${r.loadMs} | ${r.domContentLoadedMs ?? '-'} | ${r.pageOverflowX} | ${r.clippedCount} | ${r.smallTargetCount} | ${r.sliders.unresponsive.length} / ${r.sliders.total} | ${r.obstruction ? r.obstruction.percentCovered + '%' : '-'} | ${r.tool ? (r.tool.ms ?? 'no change') : '-'} | ${r.heapMB ?? '-'} | ${r.errors.filter(e => e.startsWith('pageerror')).length} uncaught, ${r.errorCount} total |`),
  '', '## Failures', ...(failures.length ? failures.map(f => `- ${f}`) : ['None.']), '',
  '## Details', ...rows.flatMap(r => [`### ${r.surface} / ${r.view}`, '```json', JSON.stringify({ clipped: r.clipped, smallTargets: r.smallTargets, obstruction: r.obstruction, errors: r.errors }, null, 2), '```']),
]
fs.writeFileSync(path.join(auditDir, 'report.md'), md.join('\n') + '\n')
console.log(md.join('\n'))
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nno gating failures')
if (failures.length) process.exitCode = 1
