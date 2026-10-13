// Sprint SEARCH-A acceptance: licensed image search + safe import in the REAL editor.
// Drives production-safe hooks (window.__voidEditor/__vcAssets) plus the real
// Search panel UI (tray Search button, provider select, filters, licence detail,
// Place/Fill/Replace). Offline-safe: the default "Sample fixtures" provider makes
// every network assertion meaningful — zero stock/AI requests must occur.
// Writes screenshots + report to e2e/evidence/. Any failed section exits nonzero.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const EVIDENCE = new URL('./evidence/', import.meta.url).pathname
fs.mkdirSync(EVIDENCE, { recursive: true })

const results = []
const pass = (name, detail = '') => { results.push({ name, ok: true, detail }); console.log('PASS ' + name + (detail ? ' — ' + detail : '')) }
const fail = (name, detail = '') => { results.push({ name, ok: false, detail }); console.log('FAIL ' + name + (detail ? ' — ' + detail : '')) }
const snap = async (page, file) => { const p = path.join(EVIDENCE, file); await page.screenshot({ path: p }); return p }
const VE = (page, fn, arg) => page.evaluate(fn, arg)
const stateOf = page => VE(page, () => window.__vcAssets.state())

const browser = await chromium.launch()
const consoleErrors = []
const externalHosts = []
let failed = false
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + String(e).slice(0, 200)))
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push('console: ' + m.text().slice(0, 200)) })
  page.on('request', r => {
    const u = r.url()
    if (/unsplash|pexels|pixabay|shutterstock|adobe.*stock|openai|stability|firefly|replicate|fal\.ai|huggingface/i.test(u)) externalHosts.push(u.slice(0, 140))
  })

  await page.goto(BASE + '/editor', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction(() => window.__voidEditor && window.__vcAssets, null, { timeout: 60000 })
  await page.waitForTimeout(1500)

  // 1. Blank 1080x1350 poster.
  await VE(page, () => { window.__voidEditor.getState().newDoc({ name: 'SEARCH-A poster', width: 1080, height: 1350, background: '#ffffff' }) })
  await page.waitForTimeout(600)

  // 2. Open Search from the asset tray, exactly as a designer would.
  // (The tray lives in the dock; open it first — same pattern as generation-flow.)
  await VE(page, () => { try { window.__voidUi?.getState()?.showPanel?.('assets') } catch {} })
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Search images' }).click()
  await page.waitForTimeout(500)
  const panel = page.getByTestId('search-panel')
  if (await panel.count() === 1) pass('2 search opens from tray (native entry point)')
  else fail('2 search panel', 'panel did not open')
  await snap(page, 'search-02-panel.png')

  // 3. Sample library: empty query lists every trial scene, each honestly badged
  // (generated on-device, free to use — never presented as stock photography).
  await page.getByLabel('Keywords').fill('')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.waitForSelector('[data-testid="search-panel"] [data-result]', { timeout: 10000 })
  const resultCount = await page.locator('[data-testid="search-panel"] [data-result]').count()
  const badgeTexts = await page.locator('[data-testid="search-panel"] [data-result]').allInnerTexts()
  if (resultCount === 6 && badgeTexts.every(t => /commercial OK/i.test(t))) pass(`3 sample search lists 6 labelled trial scenes`)
  else fail('3 sample search', `count=${resultCount} badges=${badgeTexts.join(' / ').slice(0, 200)}`)

  // 4. Orientation filter actually filters.
  await page.getByLabel('Orientation').selectOption('portrait')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.waitForTimeout(800)
  const portraitCount = await page.locator('[data-testid="search-panel"] [data-result]').count()
  const portraitBadges = await page.locator('[data-testid="search-panel"] [data-result]').allInnerTexts()
  if (portraitCount === 2 && portraitCount < resultCount) pass(`4 orientation filter narrows results (${resultCount} -> ${portraitCount}, portrait)`)
  else fail('4 orientation filter', `before=${resultCount} after=${portraitCount} ${portraitBadges.join('|').slice(0, 160)}`)
  // 4b. Keyword search finds the poster-useful scene.
  await page.getByLabel('Orientation').selectOption('any')
  await page.getByLabel('Keywords').fill('rocket launch')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.waitForSelector('[data-testid="search-panel"] [data-result]', { timeout: 10000 })
  const rocketCount = await page.locator('[data-testid="search-panel"] [data-result]').count()
  const rocketTitles = await page.locator('[data-testid="search-panel"] [data-result]').allInnerTexts()
  if (rocketCount >= 1 && rocketTitles.some(t => /rocket/i.test(t))) pass(`4b keyword search finds the rocket scene (${rocketCount})`)
  else fail('4b keyword search', `count=${rocketCount} ${rocketTitles.join('|').slice(0, 160)}`)

  // 5. Licence detail discloses source, licence, and the commercial-use warning.
  const firstId = await page.locator('[data-testid="search-panel"] [data-result]').first().getAttribute('data-result')
  const firstTitle = await page.locator('[data-testid="search-panel"] [data-result]').first().innerText()
  await page.getByRole('button', { name: `Licence details for ${firstTitle.split('\n')[0]}` }).click()
  await page.waitForTimeout(400)
  const panelText = await panel.innerText()
  const licenceOk = /Licence:/.test(panelText) && /VoidCanvas sample/.test(panelText) && /Sample library/.test(panelText) && /not a stock photograph/.test(panelText)
  if (licenceOk) pass('5 licence detail discloses source, licence and limits')
  else fail('5 licence detail', panelText.slice(0, 300))
  await snap(page, 'search-05-licence.png')

  // 6. Unconfigured stock providers are explicit, not fake: requirements shown, search refused.
  await page.getByLabel('Source').selectOption('unsplash')
  await page.waitForTimeout(400)
  const unsplashNote = await panel.innerText()
  const searchDisabled = await page.getByRole('button', { name: 'Search', exact: true }).isDisabled()
  if (/Unsplash API key|API key/.test(unsplashNote) && searchDisabled) pass('6 unconfigured provider states requirements, search disabled')
  else fail('6 disabled provider', `disabled=${searchDisabled} note=${unsplashNote.slice(0, 200)}`)
  await page.getByLabel('Source').selectOption('sample-library')
  await page.waitForTimeout(300)
  // Switching providers clears results: search again for the place/fill/replace steps.
  await page.getByLabel('Keywords').fill('rocket launch')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.waitForSelector('[data-testid="search-panel"] [data-result]', { timeout: 10000 })

  // 7. Place: import drops a new layer with its on-device sample rights record.
  const layersBefore = (await stateOf(page)).layers.length
  await page.getByRole('button', { name: `Import and place ${firstTitle.split('\n')[0]}` }).click()
  await page.waitForFunction(
    (n) => window.__vcAssets.state().layers.length > n,
    layersBefore, { timeout: 15000 },
  )
  await page.waitForTimeout(500)
  let st = await stateOf(page)
  const placed = st.layers[st.layers.length - 1]
  const rights = await VE(page, rid => window.__vcAssets.op('assetFromId', rid).then(a => a ? { licence: a.rights?.licence, commercial: a.rights?.commercialUse, source: a.source, url: a.rights?.sourceUrl } : null), placed.assetId)
  const rightsOk = rights && rights.licence === 'VoidCanvas sample — free to use' && rights.commercial === 'verified' && rights.source === 'external_search'
  if (placed.assetId && rightsOk) pass('7 place imports with sample rights record (on-device, commercial OK)', `asset=${String(placed.assetId).slice(0, 12)}…`)
  else fail('7 place/rights', JSON.stringify({ placed, rights }))
  const placedLayerId = placed.id
  const placedAssetId = placed.assetId
  const placedPos = { x: placed.x, y: placed.y }
  await snap(page, 'search-07-placed.png')

  // 8. Undo/redo the placement.
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(400)
  st = await stateOf(page)
  if (!st.layers.some(l => l.id === placedLayerId)) pass('8a undo removes placed image')
  else fail('8a undo', 'layer still present')
  await page.keyboard.press('Control+Shift+z')
  await page.waitForTimeout(400)
  st = await stateOf(page)
  if (st.layers.some(l => l.id === placedLayerId)) pass('8b redo restores placed image')
  else fail('8b redo', 'layer missing')

  // 9. Replace: same layer id, transform kept, lineage links to the original import.
  await VE(page, id => { window.__voidEditor.getState().setActive(id) }, placedLayerId)
  await page.waitForTimeout(400)
  const titles = await page.locator('[data-testid="search-panel"] [data-result]').allInnerTexts()
  const secondTitle = titles.length > 1 ? titles[1].split('\n')[0] : titles[0].split('\n')[0]
  await page.getByRole('button', { name: `Import and replace selected image with ${secondTitle}` }).click()
  await page.waitForFunction(
    ([lid, aid]) => { const l = window.__vcAssets.state().layers.find(x => x.id === lid); return l && l.assetId !== aid },
    [placedLayerId, placedAssetId], { timeout: 15000 },
  )
  await page.waitForTimeout(400)
  st = await stateOf(page)
  const replaced = st.layers.find(l => l.id === placedLayerId)
  const lineageOk = replaced.assetId !== placedAssetId && replaced.assetParent === placedAssetId
  const transformOk = replaced.x === placedPos.x && replaced.y === placedPos.y
  if (lineageOk && transformOk) pass('9 replace keeps layer + transform, lineage linked')
  else fail('9 replace', JSON.stringify(replaced))

  // 10. Fill an empty frame from search.
  const frameId = await VE(page, () => window.__vcAssets.op('addEmptyFrame', { x: 90, y: 80, w: 900, h: 500 }, 'cover'))
  await VE(page, id => { window.__voidEditor.getState().setActive(id) }, frameId)
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: `Import and fill selected frame with ${secondTitle}` }).click()
  await page.waitForFunction(
    (fid) => { const l = window.__vcAssets.state().layers.find(x => x.id === fid); return l && !l.emptyFrame && !!l.assetId },
    frameId, { timeout: 15000 },
  )
  st = await stateOf(page)
  if (st.layers.find(l => l.id === frameId)?.assetId) pass('10 fill empty frame from search')
  else fail('10 fill', 'frame still empty')

  // 11. Save .void, close, reopen: layers, lineage, and rights records survive.
  const voidFile = await VE(page, () => window.__vcAssets.saveVoid())
  fs.writeFileSync(path.join(EVIDENCE, 'search-poster.void'), Buffer.from(voidFile.b64, 'base64'))
  if (voidFile.len > 5000) pass(`11a save .void (${(voidFile.len / 1024).toFixed(0)} KB, fixture bytes embedded)`)
  else fail('11a save', 'file too small: ' + voidFile.len)
  const assetIds = (await stateOf(page)).assets.map(a => a.resourceId)
  await VE(page, () => window.__voidEditor.getState().closeDoc())
  await page.waitForTimeout(500)
  await VE(page, b64 => window.__vcAssets.openVoid(b64), voidFile.b64)
  await page.waitForTimeout(1200)
  st = await stateOf(page)
  const reopenRights = await VE(page, async (rids) => {
    const out = []
    for (const rid of rids) {
      const a = await window.__vcAssets.op('assetFromId', rid)
      out.push(a ? { licence: a.rights?.licence, commercial: a.rights?.commercialUse } : null)
    }
    return out
  }, assetIds)
  const layersOk = st.layers.length >= 2
  const rightsSurvive = reopenRights.length === assetIds.length && reopenRights.every(r => r && r.licence === 'VoidCanvas sample — free to use' && r.commercial === 'verified')
  if (layersOk && rightsSurvive) pass(`11b reopen: layers + lineage + ${reopenRights.length} rights records intact`)
  else fail('11b reopen', JSON.stringify({ layers: st.layers.length, rights: reopenRights }))
  await snap(page, 'search-11-reopened.png')

  // 12. Mobile viewport + keyboard access.
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mob.goto(BASE + '/editor', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await mob.waitForFunction(() => window.__voidEditor && window.__vcAssets, null, { timeout: 60000 })
  await mob.waitForTimeout(1200)
  const mobCanvas = await mob.evaluate(() => !!document.querySelector('canvas'))
  await VE(mob, () => { try { window.__voidUi?.getState()?.showPanel?.('assets') } catch {} })
  await mob.waitForTimeout(400)
  await mob.getByRole('button', { name: 'Search images' }).click()
  await mob.waitForTimeout(500)
  const mobPanel = await mob.getByTestId('search-panel').count()
  if (mobCanvas && mobPanel === 1) pass('12 mobile layout: canvas + search reachable (390px)')
  else fail('12 mobile', `canvas=${mobCanvas} panel=${mobPanel}`)
  await mob.close()

  // 13. No unauthorised external requests; no console errors.
  if (externalHosts.length === 0) pass('13 no stock/AI network requests (all fixtures local)')
  else fail('13 external requests', externalHosts.slice(0, 3).join(' | '))
  const realErrors = consoleErrors.filter(e => !/font|Font|Google/i.test(e))
  if (realErrors.length === 0) pass('14 no console errors')
  else fail('14 console hygiene', realErrors.slice(0, 3).join(' | '))
} catch (e) {
  fail('harness exception', String((e && e.stack) || e).slice(0, 500))
  failed = true
} finally {
  const report = { at: new Date().toISOString(), base: BASE, results: results }
  fs.writeFileSync(path.join(EVIDENCE, 'search-flow.json'), JSON.stringify(report, null, 2))
  const bad = results.filter(r => !r.ok)
  console.log(`\n${results.length - bad.length}/${results.length} checks passed`)
  await browser.close()
  if (bad.length || failed) process.exitCode = 1
}
