// UX phase C: Studio Desk. One obvious action, next step always visible, the catalogue tucked away.
import { chromium, devices } from 'playwright'
import { FIX, OUT } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch(); const errors = []
for (const [tag, opts] of [['desk', { viewport: { width: 1440, height: 900 } }], ['phone', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }]]) {
  const c = await b.newContext(opts); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message))
  await p.goto(`${BASE}/studio`); await p.waitForTimeout(900)
  const primaries = await p.$$eval('button', els => els.filter(e => /Start a job/.test(e.textContent)).length)
  ok(`C ${tag} home: Start a job is the action (twice: header and empty state)`, primaries === 2, String(primaries))
  ok(`C ${tag} home: no filter row with no jobs`, !(await p.$('input[aria-label="Find a job"]')))
  ok(`C ${tag} home: brands and guideline builder are secondary`, !!(await p.$('button:has-text("Client brands")')) && !!(await p.$('button:has-text("Brand guideline builder")')))
  await p.click('header ~ * button:has-text("Start a job"), button:has-text("Start a job")'); await p.waitForTimeout(800)
  ok(`C ${tag} job: cursor is in the brief`, (await p.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'Brief')
  ok(`C ${tag} job: no brand dropdown without brands`, !(await p.$('text=Which brand is this for?')))
  ok(`C ${tag} job: full size catalogue hidden`, !(await p.$('button:has-text("+ Billboard 48-sheet")')))
  ok(`C ${tag} job: steps numbered`, (await p.$$('nav[aria-label="Job steps"] button')).length === 6)
  await p.keyboard.type('Poster for Lagos Nights at The Wings Tower. Friday 12 July, 9pm. Tickets N10,000. Need an IG post, a story and an A3 poster. Must include the Lagos Nights logo.'); await p.waitForTimeout(600)
  ok(`C ${tag} job: named from the brief`, (await p.inputValue('input[aria-label="Job name"]')) === 'Lagos Nights', await p.inputValue('input[aria-label="Job name"]'))
  ok(`C ${tag} job: brief step ticked`, !!(await p.$('nav[aria-label="Job steps"] button[aria-selected="true"] svg')))
  ok(`C ${tag} job: next step shown`, !!(await p.$('button:has-text("Add references")')))
  ok(`C ${tag} job: brief suggests its formats`, !!(await p.$('button:has-text("A3 poster")')) && !!(await p.$('button:has-text("Story / Reel / Status")')))
  await p.click('button:has-text("All sizes and custom")'); await p.waitForTimeout(200)
  ok(`C ${tag} job: catalogue opens on request`, !!(await p.$('button:has-text("+ Billboard 48-sheet")')))
  await p.click('button:has-text("Add references")'); await p.waitForTimeout(400)
  ok(`C ${tag} job: next step navigates`, (await p.$eval('nav[aria-label="Job steps"] button[aria-selected="true"]', el => el.textContent)).includes('References'))
  await p.click('button[aria-label="All jobs"]'); await p.waitForTimeout(600)
  const row = await p.textContent('body')
  ok(`C ${tag} home: job row shows the next action`, /Lagos Nights/.test(row) && /Add references/.test(row))
  if (tag === 'phone') { ok('C phone: no horizontal overflow', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) }
  await p.screenshot({ path: OUT(`ux_c_${tag}.png`) })
  await c.close()
}
await b.close(); console.log(out.join('\n')); if (errors.length) { console.log('ERRORS', errors.slice(0, 3)); process.exitCode = 1 } else console.log('no page errors')
