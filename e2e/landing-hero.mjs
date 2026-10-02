// Landing hero (HeroMotion): one "Start designing" at a time, the scroll hand-off to Highlights and back, the panel
// tabs, the reduced-motion rest frame, and the phone layout.
import { chromium, devices } from 'playwright'
import { OUT } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch(); const errors = []
const page = async (opts = {}) => { const c = await b.newContext(opts); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message)); return { c, p } }
const visibleCtas = p => p.evaluate(() => [...document.querySelectorAll('a[href="/editor"]')].filter(a => a.textContent.trim().startsWith('Start designing')).filter(a => {
  const r = a.getBoundingClientRect(); let e = a, op = 1
  while (e) { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false; op *= +cs.opacity; e = e.parentElement }
  return op > 0.5 && r.bottom > 0 && r.top < innerHeight && r.width > 0
}).length)
const trackEnd = p => p.evaluate(() => { const t = document.querySelector('[data-hm="track"]'); return t.getBoundingClientRect().top + scrollY + t.offsetHeight - innerHeight })
const go = async (p, y) => { await p.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(900) }

// ---- desktop ----
let { c, p } = await page({ viewport: { width: 1440, height: 900 } })
await p.goto(`${BASE}/`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200)
ok('hero: headline', /From the brief\s*to the finished file\./.test(await p.textContent('h1')))
ok('hero: one Start designing on the first screen', (await visibleCtas(p)) === 1, String(await visibleCtas(p)))
const cta = await p.locator('.hm-cta').boundingBox()
ok('hero: button is in the first screen', cta && cta.y + cta.height < 900, JSON.stringify(cta))
ok('hero: the tab is drawn', await p.$eval('[data-hm=stagewrap]', e => +getComputedStyle(e).opacity > 0.9))
ok('hero: photo loaded', await p.$eval('[data-hm=img-photo]', e => e.complete && e.naturalWidth > 0))
await p.waitForTimeout(1200)
ok('hero: effect renders loaded', await p.$$eval('[data-hm^=fx-]', es => es.length === 4 && es.every(e => e.complete && e.naturalWidth > 0)))
ok('hero: no horizontal overflow', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
const end = await trackEnd(p)
await go(p, end)
ok('scrolled: button docked in the nav', await p.$eval('[data-hero-dock]', e => +getComputedStyle(e).opacity > 0.9))
ok('scrolled: still one Start designing', (await visibleCtas(p)) === 1, String(await visibleCtas(p)))
ok('scrolled: Highlights tabs showing', await p.getByRole('tab', { name: 'Brand' }).isVisible())
const pin = await p.$eval('[data-hm=pin]', e => Math.round(e.getBoundingClientRect().top))
ok('scrolled: scene stays pinned', pin === 0, String(pin))
await p.screenshot({ path: OUT('hero_desk_highlights.png') })
await p.getByRole('tab', { name: 'Brand' }).click(); await p.waitForTimeout(800)
ok('tabs: Brand shows its demo in the panel', (await p.locator('.hm-art').count()) === 1 && (await p.$eval('[data-hm=stagewrap]', e => getComputedStyle(e).visibility)) === 'hidden')
await p.getByRole('tab', { name: 'Voidcanvas' }).click(); await p.waitForTimeout(800)
ok('tabs: Voidcanvas brings the loop back', (await p.locator('.hm-art').count()) === 0 && (await p.$eval('[data-hm=stagewrap]', e => getComputedStyle(e).visibility)) === 'visible')
await go(p, 0)
ok('back up: hero button returns, nav button hides', (await p.$eval('[data-hero-dock]', e => +getComputedStyle(e).opacity)) < 0.1 && (await p.$eval('[data-hm=cta]', e => getComputedStyle(e).visibility)) === 'visible')
await p.click('a[href="#highlights"]'); await p.waitForTimeout(2200)
ok('See how it works reaches the tabs', await p.getByRole('tab', { name: 'Studio' }).isVisible(), String(await p.evaluate(() => scrollY)))
await c.close();

// ---- reduced motion rests on the finished files ----
({ c, p } = await page({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }))
await p.goto(`${BASE}/`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200)
ok('reduced motion: shows the finished files', await p.$eval('[data-hm=check]', e => getComputedStyle(e).visibility === 'visible'))
ok('reduced motion: headline not blurred', await p.$eval('[data-hm-x="1"]', e => getComputedStyle(e).filter === 'none'))
await c.close();

// ---- phone ----
({ c, p } = await page({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }))
await p.goto(`${BASE}/`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200)
const m = await p.locator('.hm-cta').boundingBox()
ok('phone: button full width and in the first screen', m && m.width >= 340 && m.x >= 0 && m.x + m.width <= 390 && m.y + m.height < 844, JSON.stringify(m))
ok('phone: one Start designing', (await visibleCtas(p)) === 1)
ok('phone: no horizontal overflow', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
await p.screenshot({ path: OUT('hero_phone_top.png') })
await go(p, await trackEnd(p))
ok('phone scrolled: button docked in the nav', await p.$eval('[data-hero-dock]', e => +getComputedStyle(e).opacity > 0.9))
ok('phone scrolled: tabs showing', await p.getByRole('tab', { name: 'Effects' }).isVisible())
await p.screenshot({ path: OUT('hero_phone_highlights.png') })
await c.close()

await b.close(); console.log(out.join('\n')); if (errors.length) { console.log('ERRORS', errors.slice(0, 3)); process.exitCode = 1 } else console.log('no page errors')
