// Real-browser multi-format Cascade acceptance: grouped artwork, essential
// content, warnings, identity and downloaded exports. No network assets.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:3000'
const OUT = path.resolve('e2e/evidence/cascade-corpus')
fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const errors = []
page.on('pageerror', e => errors.push(e.message))
try {
  await page.goto(BASE + '/editor')
  await page.waitForFunction(() => Boolean(window.__voidEditor), null, { timeout: 45000 })
  await page.evaluate(() => {
    const S = window.__voidEditor.getState()
    const base = (v) => ({
      frameId: 'M', visible: true, locked: false, opacity: 1,
      blend: 'source-over', mask: null, maskEnabled: false,
      scaleX: 1, scaleY: 1, rotation: 0, rev: 1, ...v,
    })
    const t = (id, text, role, x, y, size, groupId, color = '#172234') =>
      base({ id, type: 'text', name: text.slice(0, 30), text, role, x, y,
        fontSize: size, fontFamily: 'Inter', fontWeight: 700, italic: false,
        color, align: 'left', lineHeight: 1.12, letterSpacing: 0, groupId })
    const shape = (id, x, y, w, h, fill, groupId) =>
      base({ id, type: 'shape', name: id, shape: 'rect', x, y, w, h,
        stroke: null, strokeWidth: 0, fill, radius: 0, groupId })
    const photo = document.createElement('canvas')
    photo.width = 440; photo.height = 500
    const g = photo.getContext('2d')
    const gradient = g.createLinearGradient(0, 0, 440, 500)
    gradient.addColorStop(0, '#1786be'); gradient.addColorStop(1, '#152e62')
    g.fillStyle = gradient; g.fillRect(0, 0, 440, 500)
    g.fillStyle = '#ffdc87'; g.fillRect(120, 90, 160, 310)
    g.fillStyle = '#b9e8ee'; g.beginPath(); g.arc(220, 120, 85, 0, Math.PI * 2); g.fill()
    const layers = [
      shape('background', 0, 0, 2400, 1200, '#f2eade', null),
      shape('brand-panel', 80, 100, 650, 940, '#e7d3bd', 'gBrand'),
      t('logo', 'NORTH COAST', 'logo', 130, 180, 88, 'gBrand'),
      t('tagline', 'An extraordinary place', 'subhead', 130, 360, 47, 'gBrand'),
      base({ id: 'photo', type: 'raster', name: 'Coastal photo', role: 'image',
        canvas: photo, x: 875, y: 135, scaleX: 1.45, scaleY: 1.85 }),
      shape('offer-panel', 1640, 90, 675, 970, '#ffffff', 'gOffer'),
      t('headline', 'DISCOVER MORE', 'headline', 1695, 260, 80, 'gOffer'),
      t('body', 'Discover our summer collection', 'body', 1700, 495, 45, 'gOffer'),
      t('cta', 'EXPLORE TODAY', 'cta', 1695, 800, 62, 'gOffer'),
    ]
    const groups = [
      { id: 'gBrand', name: 'Brand lockup', visible: true, opacity: 1, collapsed: false },
      { id: 'gOffer', name: 'Offer panel', visible: true, opacity: 1, collapsed: false },
    ]
    S.loadFramed({
      id: 'corpus', name: 'North Coast campaign', width: 2400, height: 1200,
      background: null, frames: [{
        id: 'M', name: 'Hero master', x: 0, y: 0,
        width: 2400, height: 1200, background: '#f2eade',
      }],
    }, layers, undefined, groups)
  })

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'boards' })))
  await page.locator('button[role="tab"]').filter({ hasText: 'Cascade' }).click()
  await page.getByRole('button', { name: /Instagram post/ }).click()
  await page.getByRole('button', { name: /A4 flyer/ }).click()
  const chosen = 6 // 4 default + Instagram portrait + A4 print
  await page.waitForFunction(n => document.querySelectorAll('figure img[alt$="preview"]').length >= n, chosen, { timeout: 45000 })
  await page.screenshot({ path: path.join(OUT, '01-six-format-previews.png') })
  const captions = await page.locator('figure figcaption').allTextContents()
  if (captions.some(c => /Required .+ is missing/.test(c)))
    throw new Error('Preview silently lost essential artwork: ' + captions.join(' | '))
  await page.getByRole('button', { name: /Create 6 boards/ }).click()
  const actual = await page.evaluate(() => {
    const s = window.__voidEditor.getState()
    const children = s.doc.frames.filter(f => f.linkedFrom === 'M')
    const essential = ['logo', 'headline', 'cta']
    const failures = []
    for (const f of children) {
      const entries = s.layers.filter(l => l.frameId === f.id)
      const from = new Set(entries.map(l => l.srcId))
      for (const id of essential) if (!from.has(id)) failures.push(f.name + ': missing ' + id)
      const ids = new Set()
      for (const l of entries) {
        if (ids.has(l.id)) failures.push(f.name + ': duplicate id')
        ids.add(l.id)
        if (l.type === 'text' && (!Number.isFinite(l.fontSize) || l.fontSize <= 0))
          failures.push(f.name + ': invalid type size')
      }
    }
    const boardsOfGroup = new Map()
    for (const l of s.layers) if (l.groupId) {
      const set = boardsOfGroup.get(l.groupId) ?? new Set()
      set.add(l.frameId); boardsOfGroup.set(l.groupId, set)
    }
    if ([...boardsOfGroup.values()].some(set => set.size > 1))
      failures.push('groups span multiple boards')
    const xs = s.doc.frames
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
      const a = xs[i], b = xs[j]
      if (a.x < b.x + b.width && a.x + a.width > b.x &&
          a.y < b.y + b.height && a.y + a.height > b.y)
        failures.push('boards overlap: ' + a.name + ' / ' + b.name)
    }
    return { variants: children.map(f => ({ name: f.name, w: f.width, h: f.height })),
      failures, history: s.history.at(-1)?.label }
  })
  if (actual.variants.length !== chosen || actual.failures.length)
    throw new Error('Multi-size Cascade invariant failed: ' + JSON.stringify(actual))
  if (!actual.history?.startsWith('Cascade to')) throw new Error('Cascade did not commit one undo step')
  await page.screenshot({ path: path.join(OUT, '02-cascaded-artboards.png') })

  // Drive actual browser export, then inspect the downloaded ZIP structure.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'export' })))
  await page.getByRole('button', { name: /All / }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 90000 }),
    page.getByRole('button', { name: /^Download 7 PNGs/ }).click(),
  ])
  const zipPath = path.join(OUT, 'seven-artboards.zip')
  await download.saveAs(zipPath)
  const bytes = fs.readFileSync(zipPath)
  if (bytes.length < 1000 || bytes.readUInt32LE(0) !== 0x04034b50)
    throw new Error('Per-artboard exported ZIP is not valid')
  // Inspect ZIP central-directory filenames instead of searching arbitrary
  // compressed bytes for ".png" (binary searching produced false counts).
  const names = []
  for (let at = 0; at + 46 <= bytes.length; at++) {
    if (bytes.readUInt32LE(at) !== 0x02014b50) continue
    const nameLen = bytes.readUInt16LE(at + 28)
    const extraLen = bytes.readUInt16LE(at + 30)
    const commentLen = bytes.readUInt16LE(at + 32)
    const size = 46 + nameLen + extraLen + commentLen
    if (at + size > bytes.length) throw new Error('Corrupt ZIP central directory')
    names.push(bytes.subarray(at + 46, at + 46 + nameLen).toString('utf8'))
    at += size - 1
  }
  const pngNames = names.filter(name => /\.png$/i.test(name))
  console.log('ZIP export entries:', JSON.stringify(names))
  if (pngNames.length !== 7) throw new Error('Expected 7 independently exported board PNGs, got ' + pngNames.length + ': ' + JSON.stringify(names))
  if (errors.length) throw new Error('Uncaught browser errors: ' + errors.join('; '))
  console.log('PASS six linked formats + original board, essential logo/headline/CTA, group integrity, no overlap, editable layer ids, download', JSON.stringify(actual))
} finally {
  await browser.close()
}
