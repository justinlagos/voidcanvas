import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
p.on('pageerror', e => errors.push(e.message))
const E = (fn, arg) => p.evaluate(fn, arg)
const library = () => p.getByLabel('Reusable library')
const nameInput = () => library().getByRole('textbox').first()
const closeLibrary = async () => { await p.getByLabel('Close reuse library').click(); await library().waitFor({ state: 'detached', timeout: 5000 }) }
const rowFor = name => p.getByText(name, { exact: true }).locator('..').locator('..')

try {
  await p.goto(`${process.env.BASE || 'http://localhost:3123'}/editor`)
  await p.waitForFunction(() => !!window.__voidEditor && !!window.__vcFx)

  const source = await E(() => {
    const s = window.__voidEditor.getState()
    s.newDoc({ name: 'Reuse QA', width: 800, height: 800, background: '#121212' })
    s.addText(120, 140)
    const id = window.__voidEditor.getState().activeId
    s.updateLayer(id, {
      text: 'SOURCE HEADLINE', fontFamily: 'Arial', fontSize: 72, fontWeight: 700,
      color: '#f2d36b', align: 'center', letterSpacing: -2, opacity: 0.82, blend: 'screen',
    }, 'Source style')
    const fx = window.__vcFx.newEffect('blur')
    fx.values = { radius: 7 }
    s.addEffect([{ type: 'layer', id }], fx, 'Source blur')
    return id
  })
  assert(source)

  await p.getByRole('button', { name: 'Reuse', exact: true }).click()
  await nameInput().fill('Editorial Gold')
  await p.getByRole('button', { name: 'Look', exact: true }).click()
  await nameInput().fill('Campaign Headline')
  await p.getByRole('button', { name: 'Text style', exact: true }).click()
  await nameInput().fill('Campaign Gold')
  await p.getByRole('button', { name: 'Colour', exact: true }).click()
  await nameInput().fill('Arial Family')
  await p.getByRole('button', { name: 'Font', exact: true }).click()
  await nameInput().fill('Launch Template')
  await p.getByRole('button', { name: 'Template', exact: true }).click()
  await closeLibrary()

  // The target font is a Google font so it loads on every machine; a system font such as Georgia is missing
  // on Linux and opens the Editor's missing-fonts dialog part-way through the test.
  const target = await E(() => {
    const s = window.__voidEditor.getState()
    s.addText(120, 360)
    const id = window.__voidEditor.getState().activeId
    s.updateLayer(id, {
      text: 'KEEP THESE WORDS', fontFamily: 'Poppins', fontSize: 28, fontWeight: 400,
      color: '#ffffff', align: 'left', letterSpacing: 0, opacity: 1, blend: 'source-over',
    }, 'Target style')
    return id
  })
  assert(target)

  await p.getByRole('button', { name: 'Reuse', exact: true }).click()
  await rowFor('Editorial Gold').getByRole('button', { name: 'Apply', exact: true }).click()

  let state = await E(() => {
    const l = window.__voidEditor.getState().active()
    return { text: l.text, font: l.fontFamily, size: l.fontSize, color: l.color, effects: l.effects?.length ?? 0, opacity: l.opacity, blend: l.blend }
  })
  assert.equal(state.text, 'KEEP THESE WORDS', 'A Look must not replace text content')
  assert.equal(state.font, 'Arial')
  assert.equal(state.size, 72)
  assert.equal(state.color, '#f2d36b')
  assert.equal(state.effects, 1)
  assert.equal(state.opacity, 0.82)
  assert.equal(state.blend, 'screen')
  // Apply records the use after the undo step, then the library re-reads usage: wait for that, not a fixed delay.
  await rowFor('Editorial Gold').getByText(/used in 1 design/).waitFor({ timeout: 5000 }).catch(() => {})
  assert(await rowFor('Editorial Gold').getByText(/used in 1 design/).isVisible(), 'Applying a reusable item should record a design dependency')

  await E(() => window.__voidEditor.getState().undo())
  state = await E(() => {
    const l = window.__voidEditor.getState().active()
    return { text: l.text, font: l.fontFamily, effects: l.effects?.length ?? 0 }
  })
  assert.equal(state.text, 'KEEP THESE WORDS')
  assert.equal(state.font, 'Poppins')
  assert.equal(state.effects, 0)

  await rowFor('Campaign Headline').getByRole('button', { name: 'Apply', exact: true }).click()
  state = await E(() => {
    const l = window.__voidEditor.getState().active()
    return { text: l.text, font: l.fontFamily, size: l.fontSize, color: l.color, effects: l.effects?.length ?? 0, opacity: l.opacity }
  })
  assert.equal(state.text, 'KEEP THESE WORDS', 'A text style must not replace copy')
  assert.equal(state.font, 'Arial')
  assert.equal(state.size, 72)
  assert.equal(state.color, '#f2d36b')
  assert.equal(state.effects, 0, 'A text style must not copy the Look effect stack')
  assert.equal(state.opacity, 1, 'A text style must not replace layer opacity')

  await rowFor('Campaign Gold').getByRole('button', { name: 'Apply', exact: true }).click()
  assert.equal(await E(() => window.__voidEditor.getState().active().color), '#f2d36b')
  await rowFor('Arial Family').getByRole('button', { name: 'Apply', exact: true }).click()
  assert.equal(await E(() => window.__voidEditor.getState().active().fontFamily), 'Arial')

  await p.getByLabel('Search reuse library').fill('Launch Template')
  await p.getByText('Editorial Gold', { exact: true }).waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  assert(await p.getByText('Launch Template', { exact: true }).isVisible())
  assert.equal(await p.getByText('Editorial Gold', { exact: true }).count(), 0)
  await p.getByLabel('Search reuse library').fill('')
  await p.getByLabel('Filter reuse library').selectOption('color')
  await p.getByText('Campaign Headline', { exact: true }).waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  assert(await p.getByText('Campaign Gold', { exact: true }).isVisible())
  assert.equal(await p.getByText('Campaign Headline', { exact: true }).count(), 0)
  await p.getByLabel('Filter reuse library').selectOption('all')
  await p.getByText('Editorial Gold', { exact: true }).waitFor({ timeout: 5000 })

  // The warning comes after usage is read, so wait for the dialog itself.
  const confirm = p.waitForEvent('dialog', { timeout: 5000 })
  await rowFor('Editorial Gold').getByLabel('Delete Editorial Gold').click()
  const dialog = await confirm
  const warned = /used in 1 design/.test(dialog.message())
  await dialog.dismiss()
  assert(warned, 'Deleting a referenced reusable item should explain its dependency')
  assert(await p.getByText('Editorial Gold', { exact: true }).isVisible())

  await closeLibrary()
  await E(() => {
    const s = window.__voidEditor.getState(), c = document.createElement('canvas')
    c.width = 80; c.height = 50
    const x = c.getContext('2d'); x.fillStyle = '#26d07c'; x.fillRect(0, 0, 80, 50)
    s.addImage(c, 80, 50, 'Logo source', { role: 'logo' })
  })
  await p.getByRole('button', { name: 'Reuse', exact: true }).click()
  await nameInput().fill('QA Logo')
  await p.getByRole('button', { name: 'Logo', exact: true }).click()
  await closeLibrary()
  await E(() => window.__voidEditor.getState().setActive(null))
  await p.getByRole('button', { name: 'Reuse', exact: true }).click()
  const before = await E(() => window.__voidEditor.getState().layers.length)
  await rowFor('QA Logo').getByRole('button', { name: 'Apply', exact: true }).click()
  // Placing an image asset decodes it first, so the new layer arrives a moment after the click.
  await p.waitForFunction(n => window.__voidEditor.getState().layers.length > n, before, { timeout: 5000 }).catch(() => {})
  const after = await E(() => window.__voidEditor.getState().layers.length)
  assert.equal(after, before + 1, 'Applying a raster library asset with no raster target should place a new layer')

  await closeLibrary()
  await p.setViewportSize({ width: 390, height: 844 })
  // On a phone the Reuse library opens from the More sheet.
  await p.getByRole('button', { name: 'More', exact: true }).click()
  await p.getByRole('button', { name: 'Reuse library', exact: true }).click()
  await library().waitFor()
  assert(await p.getByText('Editorial Gold', { exact: true }).isVisible())
  assert(await p.getByText('QA Logo', { exact: true }).isVisible())
  const sheet = await library().boundingBox()
  assert(sheet && sheet.width >= 380, 'Phone reuse library should become a full-width bottom sheet')

  assert.deepEqual(errors, [])
  console.log('reuse: passed')
} finally {
  await b.close()
}
