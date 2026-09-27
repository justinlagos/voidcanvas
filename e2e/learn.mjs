// Learn: problem-first hub, search that understands problems, goal routes, article answer layer, demos, schema and sitemap.
import { chromium, devices } from 'playwright'
import { OUT } from './fixtures.mjs'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch(); const errors = []
const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('pageerror', e => errors.push(e.message))

// Hub
await p.goto(`${BASE}/learn`, { waitUntil: 'networkidle' })
ok('learn hub: search is the first control', !!(await p.$('#learn-q')))
ok('learn hub: goals are real links', (await p.$$('a[href^="/learn/do/"]')).length >= 10)
ok('learn hub: problem cards present', (await p.$$eval('ol a[href^="/learn/"]', els => els.length)) >= 8)
const ld = await p.$$eval('script[type="application/ld+json"]', els => els.map(e => JSON.parse(e.textContent)))
ok('learn hub: JSON-LD parses with CollectionPage and ItemList', ld.length === 1 && ld[0]['@graph'].some(x => x['@type'] === 'CollectionPage') && ld[0]['@graph'].some(x => x['@type'] === 'ItemList'))
ok('learn hub: og:image set', (await p.getAttribute('meta[property="og:image"]', 'content') || '').includes('/og/learn-hub'))

// Search: a problem phrase, a Photoshop habit, a persona question
const search = async (q) => { await p.fill('#learn-q', ''); await p.fill('#learn-q', q); await p.waitForTimeout(250); return p.$$eval('#learn-hits a', els => els.map(e => e.getAttribute('href'))) }
let hits = await search('blurry image')
ok('learn search: "blurry image" finds the resolution guide first', hits[0] === '/learn/image-resolution-explained', hits.slice(0, 3).join(' '))
hits = await search('photoshop masks')
ok('learn search: "photoshop masks" finds masks', hits.includes('/learn/masks'), hits.slice(0, 3).join(' '))
hits = await search('how do I edit a psd without photoshop')
ok('learn search: PSD question routes to the route and the guide', hits[0] === '/learn/do/work-with-psd' && hits[1] === '/learn/edit-a-psd-without-photoshop', hits.slice(0, 3).join(' '))
hits = await search('I want to learn graphic design')
ok('learn search: learner gets the learn route first', hits[0] === '/learn/do/learn-design', hits.slice(0, 3).join(' '))
hits = await search('how do I manage a client design project')
ok('learn search: freelancer finds Studio', hits.includes('/learn/do/client-project') && hits.includes('/learn/studio-overview'), hits.slice(0, 4).join(' '))
hits = await search('how do I create a consistent brand')
ok('learn search: brand owner finds the brand route', hits.includes('/learn/do/build-a-brand'), hits.slice(0, 4).join(' '))
hits = await search('zzqx plorf')
ok('learn search: noise gives the empty state with feedback', hits.length === 0 && /Nothing matches/.test(await p.textContent('#learn-hits')))
await p.keyboard.press('Escape'); await p.fill('#learn-q', 'halftone'); await p.waitForTimeout(250); await p.keyboard.press('Enter'); await p.waitForTimeout(800)
ok('learn search: Enter opens the top hit', /\/learn\/(make-a-halftone-portrait|do\/design-effects)/.test(p.url()), p.url())

// Goal picker: click a chip, see the ordered route, without leaving the page
await p.goto(`${BASE}/learn`, { waitUntil: 'networkidle' })
await p.click('a[href="/learn/do/make-a-poster"]'); await p.waitForTimeout(400)
ok('learn goals: picking a goal stays on the hub', p.url().endsWith('/learn'))
ok('learn goals: route lists guides in order with reasons', (await p.$$('ol a[href*="?goal=make-a-poster"]')).length >= 5)
ok('learn goals: the short answer is shown', /300 dpi/.test(await p.textContent('[aria-live="polite"]')))

// Goal page
await p.goto(`${BASE}/learn/do/prepare-for-print`, { waitUntil: 'networkidle' })
ok('goal page: renders with the short answer and the route', /The short answer/.test(await p.textContent('body')) && (await p.$$('a[href*="?goal=prepare-for-print"]')).length >= 5)
const gld = await p.$$eval('script[type="application/ld+json"]', els => els.map(e => JSON.parse(e.textContent)))
ok('goal page: ItemList and FAQPage schema', gld[0]['@graph'].some(x => x['@type'] === 'ItemList') && gld[0]['@graph'].some(x => x['@type'] === 'FAQPage'))
await p.click('a[href*="?goal=prepare-for-print"]'); await p.waitForTimeout(800)
ok('goal page: opening a step shows the route progress on the article', /step 1 of/.test(await p.textContent('body')))

// Article: answer layer, demo, contextual links, schema, metadata
await p.goto(`${BASE}/learn/prepare-a-poster-for-print`, { waitUntil: 'networkidle' })
ok('article: quick answer first', !!(await p.$('#quick-answer')))
const title = await p.title()
ok('article: title under 70 chars and query shaped', title.length <= 70 && /prepare a poster for print/i.test(title), title)
const desc = await p.getAttribute('meta[name="description"]', 'content')
ok('article: meta description under 160', desc.length <= 160, String(desc.length))
ok('article: canonical and og:image', (await p.getAttribute('link[rel="canonical"]', 'href')) === 'https://voidcanvas.netlify.app/learn/prepare-a-poster-for-print' && (await p.getAttribute('meta[property="og:image"]', 'content') || '').includes('/og/learn/prepare-a-poster-for-print'))
const ald = await p.$$eval('script[type="application/ld+json"]', els => els.map(e => JSON.parse(e.textContent)))
const graph = ald[0]['@graph']
ok('article: TechArticle, BreadcrumbList and FAQPage schema', graph.some(x => x['@type'] === 'TechArticle' && x.datePublished && x.image) && graph.some(x => x['@type'] === 'BreadcrumbList' && x.itemListElement[1].item.includes('/learn/topic/')) && graph.some(x => x['@type'] === 'FAQPage'))
await p.waitForSelector('canvas', { timeout: 15000 })
const canvases = await p.$$('canvas')
ok('article: print setup demo draws its canvases', canvases.length >= 2)
const drawn = await p.$$eval('canvas', cs => cs.slice(0, 2).map(c => { const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i]) n++; return n }))
ok('article: demo canvases are not blank', drawn.every(n => n > 0), drawn.join(','))
await p.getByRole('button', { name: '72 dpi' }).click(); await p.waitForTimeout(200)
ok('article: demo responds to controls', /842 × 1191 px/.test(await p.textContent('figure')))
ok('article: contextual links section', /Before you start|Next|If/.test(await p.$eval('nav[aria-label="Where to go from here"]', el => el.textContent)))
ok('article: how Voidcanvas handles this', /How Voidcanvas handles this/.test(await p.textContent('article')))
ok('article: a route in the breadcrumb', (await p.$$('nav[aria-label="Breadcrumb"] a[href^="/learn/do/"]')).length >= 1)

// Halftone demo runs the real effect
await p.goto(`${BASE}/learn/make-a-halftone-portrait`, { waitUntil: 'networkidle' })
await p.waitForSelector('canvas'); await p.waitForTimeout(1500)
const dots = await p.$eval('canvas', c => { const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height).data; let dark = 0, light = 0; for (let i = 0; i < d.length; i += 4 * 53) { if (d[i] < 60) dark++; else if (d[i] > 200) light++ } return { dark, light } })
ok('halftone demo: output has black dots and white paper', dots.dark > 50 && dots.light > 50, JSON.stringify(dots))
ok('halftone demo: opens the tool', !!(await p.$('a[href="/tools/halftone"]')))

// Existing article gets the new layer
await p.goto(`${BASE}/learn/masks`, { waitUntil: 'networkidle' })
ok('existing article: try banner and contextual links', /Try it in Voidcanvas/.test(await p.textContent('article')) && !!(await p.$('nav[aria-label="Where to go from here"]')))
ok('existing article: title tag shortened', (await p.title()).length <= 62, await p.title())

// Topic page
await p.goto(`${BASE}/learn/topic/editor`, { waitUntil: 'networkidle' })
ok('topic page: lists every editor guide', (await p.$$('a[href^="/learn/"]:not([href^="/learn/do/"]):not([href^="/learn/topic/"])')).length >= 26)

// Editor preset link from Learn
await p.goto(`${BASE}/editor?preset=a5`); await p.waitForTimeout(2500)
ok('editor: ?preset=a5 opens an A5 document', /1748|A5 flyer/.test(await p.textContent('body')) && !(await p.$('text=Open a photo')))

// Sitemap and robots
const sm = await (await fetch(`${BASE}/sitemap.xml`)).text()
ok('sitemap: has goal, topic and guide urls', /\/learn\/do\/make-a-poster/.test(sm) && /\/learn\/topic\/editor/.test(sm) && /\/learn\/prepare-a-poster-for-print/.test(sm))
const og = await fetch(`${BASE}/og/learn/masks`)
ok('og image: served as png', og.status === 200 && (og.headers.get('content-type') || '').includes('image/png'))

// Phone
const c = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }); const m = await c.newPage(); m.on('pageerror', e => errors.push(e.message))
await m.goto(`${BASE}/learn`, { waitUntil: 'networkidle' })
ok('learn phone: no horizontal overflow', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
await m.goto(`${BASE}/learn/prepare-a-poster-for-print`, { waitUntil: 'networkidle' }); await m.waitForTimeout(1200)
ok('article phone: no horizontal overflow with demos', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
await m.screenshot({ path: OUT('learn_article_phone.png') })
await b.close(); console.log(out.join('\n')); if (errors.length) { console.log('ERRORS', errors.slice(0, 3)); process.exitCode = 1 } else console.log('no page errors')
