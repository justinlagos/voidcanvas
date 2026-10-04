// Isolated production reader checks with the real Netlify Blobs SDK and local sandbox server.
import { BlobsServer } from '@netlify/blobs/server'
import { getStore } from '@netlify/blobs'
import { build } from 'esbuild'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
const BASE = 'http://localhost:3139'
await mkdir('e2e/.out/brand-blobs', { recursive: true })
const blobs = new BlobsServer({
  directory: 'e2e/.out/brand-blobs',
  token: 'local-test-token',
})
const { port } = await blobs.start()
const context = {
  siteID: 'brand-e2e',
  apiURL: `http://localhost:${port}`,
  token: 'local-test-token',
}
const compiled = await build({
  stdin: {
    contents:
      "export {buildBrand,initialTokens,resolve} from './src/studio/brand/tokens'",
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
})
const { buildBrand, initialTokens, resolve } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`
)
const system = buildBrand(
  resolve({ ...initialTokens(), name: 'Acme', brandColor: '#94c11f' }),
)
const image =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='
const record = {
  slug: 'acme',
  owner: 'owner-1',
  sourceId: 'brand-1',
  version: 1,
  updatedAt: '2026-10-04T18:00:00Z',
  visibility: 'link',
  live: true,
  snapshot: {
    name: 'Acme',
    colors: [{ hex: '#94c11f', role: 'primary' }],
    display: 'Inter',
    body: 'Inter',
    logoMin: 40,
    clearSpace: 0.5,
    voice: ['Clear'],
    dos: ['Be useful'],
    donts: ['Use jargon'],
    logos: [{ name: 'Primary', data: image, w: 1, h: 1, variant: 'primary' }],
    imagery: [],
    pages: [{ name: 'Guideline', data: image }],
    system,
  },
}
const db = getStore({
  name: 'brand-portals',
  consistency: 'strong',
  ...context,
})
await db.setJSON('brand/acme', record)
const server = spawn('npx', ['next', 'start', '-p', '3139'], {
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NETLIFY_BLOBS_CONTEXT: Buffer.from(JSON.stringify(context)).toString(
      'base64',
    ),
  },
})
let browser
let failures = 0
const errors = []
const check = (name, pass) => {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`)
  if (!pass) failures++
}
try {
  let ready = false
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(BASE + '/brand')).ok) {
        ready = true
        break
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  if (!ready) throw Error('Server did not start')
  browser = await chromium.launch()
  const ctx = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
    viewport: { width: 1440, height: 900 },
  })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  await p.goto(BASE + '/brand')
  check(
    'Brand is a top-level workspace',
    await p.getByRole('heading', { name: 'Your brands.' }).isVisible(),
  )
  await p
    .getByRole('button', { name: 'Build a guideline', exact: true })
    .click()
  await p.getByPlaceholder('e.g. Northbound').fill('Test Brand')
  check(
    'Existing guideline builder remains available',
    (await p.locator('body').innerText()).includes('Identity'),
  )
  await p.getByRole('tab', { name: 'Export', exact: true }).click()
  await p.getByRole('button', { name: 'Save to Brand workspace' }).click()
  await p
    .getByText('Saved. Test Brand is in Brand.', { exact: false })
    .waitFor({ timeout: 60000 })
  await p.getByRole('button', { name: 'Save to Brand workspace' }).click()
  await p
    .getByText('Saved. Test Brand is in Brand.', { exact: false })
    .waitFor({ timeout: 60000 })
  await p.goto(BASE + '/brand')
  await p.getByRole('heading', { name: 'Test Brand', exact: true }).first().waitFor()
  check(
    'Repeated builder saves update one brand',
    (await p
      .getByRole('heading', { name: 'Test Brand', exact: true })
      .count()) === 1,
  )
  await p.getByRole('button', { name: 'Open builder', exact: true }).click()
  await p.waitForFunction(() => document.querySelector('input[placeholder="e.g. Northbound"]')?.value === 'Test Brand')
  check(
    'Saved guideline restores its editable source',
    (await p.getByPlaceholder('e.g. Northbound').inputValue()) === 'Test Brand',
  )
  await p.goto(BASE + '/b/acme/colors')
  check(
    'Direct section route makes Colour System dominant',
    await p
      .getByRole('heading', { name: 'Colour System', level: 1 })
      .isVisible(),
  )
  check(
    'Other sections are not dumped below shared section',
    (await p.getByRole('heading', { name: 'Typography', level: 2 }).count()) ===
      0,
  )
  await p.getByRole('button', { name: 'Copy HEX', exact: true }).click()
  check(
    'HEX copy gives the usable value',
    (await p.evaluate(() => navigator.clipboard.readText())) === '#94C11F',
  )
  check(
    'Link-only pages are noindex',
    (await p.locator('meta[name="robots"]').getAttribute('content')).includes(
      'noindex',
    ),
  )
  await p
    .getByRole('button', { name: 'Create with this brand', exact: true })
    .click()
  await p.waitForURL('**/editor**')
  await p.waitForFunction(() => window.__voidEditor?.getState().doc?.brandId)
  check(
    'Brand handoff creates a real linked Editor design',
    await p.evaluate(
      () =>
        window.__voidEditor.getState().doc.name === 'Acme design' &&
        !!window.__voidEditor.getState().doc.brandId,
    ),
  )
  await p.goto(BASE + '/b/acme/downloads')
  const downloaded = p.waitForEvent('download')
  await p.getByRole('button', { name: 'Download tokens JSON' }).click()
  check(
    'Token download is available',
    (await downloaded).suggestedFilename() === 'acme.tokens.json',
  )
  await p.setViewportSize({ width: 390, height: 844 })
  await p.goto(BASE + '/b/acme')
  check(
    'Primary portal actions have visible dark backgrounds',
    await p
      .getByRole('button', { name: 'Create with this brand', exact: true })
      .evaluate(
        (el) => getComputedStyle(el).backgroundColor === 'rgb(23, 25, 22)',
      ),
  )
  check(
    'Mobile portal fits the screen',
    await p.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  )
  await p.screenshot({ path: 'e2e/.out/brand-mobile.png' })
  const json = await (await fetch(BASE + '/api/brand/acme')).json()
  check(
    'Public API hides ownership fields',
    !('owner' in json) && !('sourceId' in json),
  )
  check(
    'Unauthenticated publishing is blocked',
    (await fetch(BASE + '/api/brand/acme', { method: 'DELETE' })).status ===
      401,
  )
  record.visibility = 'public'
  await db.setJSON('brand/acme', record)
  await p.goto(BASE + '/b/acme/colors')
  check(
    'Public pages can be indexed',
    !(await p.locator('meta[name="robots"]').getAttribute('content')).includes(
      'noindex',
    ),
  )
  record.live = false
  await db.setJSON('brand/acme', record)
  check(
    'Unpublish hides the public route',
    (await fetch(BASE + '/b/acme')).status === 404,
  )
  check('No runtime errors', errors.length === 0)
  if (errors.length) console.log(errors)
} finally {
  await browser?.close()
  try {
    process.kill(-server.pid, 'SIGTERM')
  } catch {}
  await blobs.stop()
}
process.exitCode = failures ? 1 : 0
