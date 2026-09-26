// UX phase E: the Hub leads with what you were working on.
import { chromium, devices } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch(); const errors = []
const c = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message))
// make a design and a job first
await p.goto(`${BASE}/editor`); await p.waitForTimeout(600); await (await p.$('input[type=file]')).setInputFiles(FIX.land); await p.waitForTimeout(3000)
await p.goto(`${BASE}/studio`); await p.waitForTimeout(600); await p.click('button:has-text("Start a job")'); await p.waitForTimeout(500); await p.keyboard.type('Flyer for Harvest Sunday at Grace Chapel.'); await p.waitForTimeout(800)
await p.goto(`${BASE}/`); await p.waitForTimeout(1000)
ok('E hub: recents strip present', !!(await p.$('text=Pick up where you left off')))
const cards = await p.$$eval('a[href^="/editor?project="], a[href^="/studio?job="]', els => els.map(e => e.getAttribute('href')))
ok('E hub: shows the design and the job', cards.some(h => h.startsWith('/editor?project=')) && cards.some(h => h.startsWith('/studio?job=')), cards.join(' '))
ok('E hub: job card shows its next action', /Add references/.test(await p.textContent('body')))
const y = await p.$eval('text=Pick up where you left off', el => el.getBoundingClientRect().top)
// Since the landing page redesign (Sept 2026) the hero comes first; recents follow within the second screen.
ok('E hub phone: recents within the first two screens', y < 844 * 2, String(Math.round(y)))
ok('E hub phone: all three tools linked', (await p.$$('a[href="/studio"], a[href="/editor"], a[href="/effects"]')).length >= 3)
ok('E hub phone: no horizontal overflow', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
await p.click('a[href^="/studio?job="]'); await p.waitForTimeout(1200)
ok('E hub: job card opens the job', !!(await p.$('nav[aria-label="Job steps"]')))
await p.screenshot({ path: OUT('ux_e_phone.png') })
await b.close(); console.log(out.join('\n')); if (errors.length) { console.log('ERRORS', errors.slice(0, 3)); process.exitCode = 1 } else console.log('no page errors')
