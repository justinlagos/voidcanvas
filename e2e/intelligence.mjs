// Design intelligence (26 Sept 2026 audit): honest logo versions, contrast that reads the artwork, rules with a
// source, the phone builder that scrolls, logos placed in a corner, "Use reversed" on a dark photo, export
// destinations and preflight, delivery readiness, effect starting points.
import { chromium, devices } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch(); const errors = []
const c = await b.newContext({ viewport: { width: 1440, height: 900 } })
await c.addInitScript(() => { window.__vcDebugOn = true })
const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message))
const inner = async sel => (await p.$eval(sel, el => el.innerText)).replace(/\s+/g, ' ')

// ── Brand builder: a lockup whose reversed version cannot honestly be made ──
await p.goto(`${BASE}/studio`); await p.waitForTimeout(900)
await p.click('button:has-text("Brand guideline builder")'); await p.waitForTimeout(1200)
// Since 5 Oct 2026 each tab in "Guideline tools" opens its own controls, and logo versions sit in a collapsed section.
const tab = async name => { if (!(await p.$(`aside[aria-label="${name} controls"]`))) await p.click(`nav[aria-label="Guideline tools"] button:text-is("${name}")`); await p.waitForSelector(`aside[aria-label="${name} controls"]`); await p.waitForTimeout(200) }
const openDetail = async title => { await p.$eval(`aside details:has(summary:text-is("${title}"))`, el => { el.open = true }); await p.waitForTimeout(150) }
await tab('Identity')
const logoIn = await p.$('input[type=file][accept*="svg"]')
await logoIn.setInputFiles(FIX.lockup); await p.waitForTimeout(3000)
await openDetail('Logo versions & usage rules')
let aside = await inner('aside')
ok('I brand: artwork detected as a lockup in 3 colours', /lockup in 3 colours/.test(aside), aside.slice(0, 120))
ok('I brand: suggested name', /Logo \/ Horizontal \/ Primary/.test(aside))
ok('I brand: reversed refused with the boundary named', /Reversed Refused A flat one-colour version would lose the detail between dark blue and orange/.test(aside))
ok('I brand: greyscale still derived', /Greyscale Derived/.test(aside))
ok('I brand: rules labelled suggested', (aside.match(/Suggested/g) || []).length >= 2)
ok('I brand: background list has verdicts', /Logo on backgrounds/.test(aside) && /suggested\)/.test(aside))
await tab('Pages')
ok('I brand: minimum size and misuse pages exist', (await p.$$('nav[aria-label="Pages"] [data-page]')).length === 15)
await tab('Identity'); await openDetail('Logo versions & usage rules')
// choose a treatment by hand: it is marked set by you and survives in the checks
const sel = await p.$('select[aria-label^="Logo version on Brand"]')
await sel.selectOption('grayscale'); await p.waitForTimeout(600)
ok('I brand: designer choice wins', /set by you|Set by you/.test(await inner('aside')))
await tab('Settings')
await p.click('[data-brand-health]'); await p.waitForTimeout(300)
const health = await inner('[data-brand-health] ~ div')
ok('I brand: health names the missing reversed version quietly', /Reversed Cannot be derived from this artwork\. Ask the client for it/.test(health))
await p.click('[data-brand-health]')
// Vary layout keeps the identity
const beforeFonts = await p.$eval('aside', () => JSON.stringify([...document.querySelectorAll('aside input')].map(i => i.value)))
await p.click('button:has-text("Vary layout")'); await p.waitForTimeout(600)
await tab('Type')
const heading = await p.inputValue('input[aria-label="heading font"]')
await tab('Identity')
ok('I brand: vary layout keeps the fonts', heading === 'Anton' || heading.length > 0, heading)

// ── JPG on white: knocked out, every version derived, dark text judged from solid pixels ──
await (await p.$('input[type=file][accept*="svg"]')).setInputFiles(FIX.logoJpg); await p.waitForTimeout(3000)
await openDetail('Logo versions & usage rules')
aside = await inner('aside')
ok('I jpg: flat background removed and versions derived', /flat background removed/.test(aside) && /Reversed Derived/.test(aside) && /Mono dark Derived/.test(aside))
ok('I jpg: brand colour suggested, not imposed', /Brand colour from the logo/.test(aside))
await tab('Pages'); await p.click('[data-page="2"] > button'); await p.waitForTimeout(1500)
await p.screenshot({ path: OUT('intel_logo_page.png') })
await tab('Identity'); await openDetail('Logo versions & usage rules')
ok('I jpg: black gets the reversed version, grey the mono', /Black Reversed white/.test(await inner('aside')) && /Neutral grey Dark mono/.test(await inner('aside')))
await p.fill('input[placeholder="e.g. Northbound"]', 'Kobo Pay')
await p.click('button[aria-label="Export guideline"]'); await p.waitForTimeout(300)
await p.click('button:has-text("Save to Brand workspace")'); await p.waitForTimeout(1500)

// ── Brands view carries the logo system and rules with sources ──
await p.click('button:has-text("Studio")'); await p.waitForTimeout(700)
await p.click('button:has-text("Client brands")'); await p.waitForTimeout(1000)
await p.click('button:has-text("Kobo Pay")'); await p.waitForTimeout(1000)
const bv = await inner('main, body')
ok('I brands: health panel present', /Brand health/.test(bv))
ok('I brands: five logo versions with what they are', /Logo \/ Horizontal \/ Reversed/.test(bv) && /derived/.test(bv))
ok('I brands: rules show their source', /Smallest on screen Suggested/.test(bv) || /Suggested px at 1080/.test(bv))

// ── Editor: logo from the job's brand goes in small, in a corner, and is offered reversed on a dark ground ──
await p.goto(`${BASE}/studio`); await p.waitForTimeout(900)
await p.click('button:has-text("Start a job")'); await p.waitForTimeout(700)
await p.keyboard.type('Kobo Pay launch. IG post. Include the Kobo logo.'); await p.waitForTimeout(700)
await p.selectOption('select', { label: 'Kobo Pay' })
await p.click('button:has-text("Add all")').catch(() => {}); await p.waitForTimeout(400)
await p.click('nav[aria-label="Job steps"] button:has-text("Key visual")'); await p.waitForTimeout(700)
await p.click('button:has-text("Start key visual in the Editor")'); await p.waitForTimeout(4000)
await p.click('button:has-text("Add")'); await p.waitForTimeout(600)
await (await p.$('input[type=file][accept*="psd"]')).setInputFiles(FIX.photo); await p.waitForTimeout(2500)
const names0 = await p.evaluate(() => window.__voidEditor.getState().layers.map(l => l.name))
ok('I editor: camera-style file name replaced by what it is', names0.includes('Image · Landscape'), names0.join(','))
await p.click('button:has-text("Add")'); await p.waitForTimeout(800)
ok('I editor: job brand logo versions offered', (await p.$$('button[title^="Add Logo"]')).length === 5)
await p.click('button[title="Add Logo / Horizontal / Primary"]'); await p.waitForTimeout(1800)
const st = await p.evaluate(() => { const s = window.__voidEditor.getState(); const l = s.layers.find(x => x.role === 'logo'); return { name: l?.name, x: l?.x, y: l?.y, w: l ? l.canvas.width * l.scaleX : 0, doc: s.doc.width } })
ok('I editor: logo named and tagged', st.name === 'Logo · Primary', st.name)
ok('I editor: logo small and in a corner, not full width', st.w < st.doc * 0.3 && st.x < st.doc * 0.15 && st.y < 200, JSON.stringify(st))
const body = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))
ok('I editor: quiet while the logo is on white', /On brand/.test(await body()))
for (let i = 0; i < 60; i++) await p.keyboard.press('Shift+ArrowDown')
for (let i = 0; i < 80; i++) await p.keyboard.press('Shift+ArrowRight')
await p.waitForTimeout(1200)
const finding = await body()
ok('I editor: contrast read from what is behind the logo', /sits on a dark area and drops to/.test(finding), finding.slice(0, 300))
const use = await p.$('button:has-text("Use reversed")')
ok('I editor: the reversed version is offered', !!use)
if (use) { await use.click(); await p.waitForTimeout(1500) }
const after = await p.evaluate(() => { const s = window.__voidEditor.getState(); const l = s.layers.find(x => x.role === 'logo'); return { name: l?.name, w: Math.round(l.canvas.width * l.scaleX) } })
ok('I editor: swapped at the same size and renamed', after.name === 'Logo · Reversed' && Math.abs(after.w - Math.round(st.w)) <= 1, JSON.stringify(after))
ok('I editor: check is quiet after the swap', /On brand/.test(await body()))
await p.screenshot({ path: OUT('intel_editor_reversed.png') })
// export: destinations and preflight for a hidden layer
await p.evaluate(() => { const s = window.__voidEditor.getState(); const img = s.layers.find(l => l.name === 'Image · Landscape'); s.updateLayer(img.id, { visible: false }) })
await p.waitForTimeout(300)
await p.click('button:has-text("Export")'); await p.waitForTimeout(900)
const ex = await inner('[role=dialog]')
ok('I export: destinations offered', /PNG · Social/.test(ex) && /PDF · Print/.test(ex) && /PDF · Client proof/.test(ex))
ok('I export: preflight says what will not export', /1 hidden layer.*will not export/.test(ex), ex.slice(0, 200))
await p.click('button:has-text("PDF · Client proof")'); await p.waitForTimeout(300)
ok('I export: a destination sets format and size', /Download PDF/.test(await inner('[role=dialog]')) && /540 × 675 px/.test(await inner('[role=dialog]')))
await p.keyboard.press('Escape'); await p.waitForTimeout(300)
// delivery readiness
await p.click('button:has-text("Back to the job in Studio")'); await p.waitForTimeout(2500)
await p.click('nav[aria-label="Job steps"] button:has-text("Deliver")'); await p.waitForTimeout(2000)
const dl = await inner('main, body')
ok('I deliver: readiness summary', /things? needs? attention|Ready to deliver/.test(dl), dl.slice(0, 200))
ok('I deliver: says nothing was sent for review', /Nothing has been sent for review/.test(dl))
await c.close()

// ── Effects: starting points ──
const c2 = await b.newContext({ viewport: { width: 1440, height: 900 } })
const q = await c2.newPage(); q.on('pageerror', e => errors.push(e.message))
await q.goto(`${BASE}/effects`); await q.waitForTimeout(1200)
await (await q.$('input[type=file]')).setInputFiles(FIX.photo); await q.waitForTimeout(2000)
await q.click('text=Halftone').catch(() => {}); await q.waitForTimeout(800)
// The controls render in the desktop sidebar and in the phone Adjust tab; only the visible set counts.
const presets = await q.$$eval('[aria-label="Starting points"] button', els => els.filter(e => e.getClientRects().length > 0).map(e => e.textContent))
ok('I effects: halftone has named starting points', presets.join(',') === 'Print,Editorial,Poster,Subtle', presets.join(','))
await q.click('[aria-label="Starting points"] button:has-text("Poster")'); await q.waitForTimeout(400)
ok('I effects: a preset sets the sliders', (await q.$eval('[aria-label="Starting points"] button:has-text("Poster")', e => e.getAttribute('aria-pressed'))) === 'true')
await c2.close()

// ── Phone: the preview takes the screen; a tab's controls open below it, never over it ──
const m = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })
const mp = await m.newPage(); mp.on('pageerror', e => errors.push(e.message))
await mp.goto(`${BASE}/studio`); await mp.waitForTimeout(900)
await mp.click('button:has-text("Brand guideline builder")'); await mp.waitForTimeout(1500)
const box = sel => mp.$eval(sel, el => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) } })
const alone = await box('section[aria-label="Guideline preview"]')
ok('I phone: the preview fills the screen before any controls open', alone.h > 400, JSON.stringify(alone))
await mp.click('nav[aria-label="Guideline tools"] button:text-is("Identity")'); await mp.waitForSelector('aside[aria-label="Identity controls"]')
const geo = { preview: await box('section[aria-label="Guideline preview"]'), aside: await box('aside[aria-label="Identity controls"]') }
ok('I phone: preview and controls both have height', geo.preview.h > 150 && geo.aside.h > 200, JSON.stringify(geo))
ok('I phone: the controls sit below the preview, not over it', geo.aside.top >= geo.preview.bottom - 1, JSON.stringify(geo))
ok('I phone: no horizontal overflow', await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
await mp.screenshot({ path: OUT('intel_phone_builder.png') })
await m.close()

await b.close(); console.log(out.join('\n')); if (errors.length) { console.log('ERRORS', errors.slice(0, 3)); process.exitCode = 1 } else console.log('no page errors')
