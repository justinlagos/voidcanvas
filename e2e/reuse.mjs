import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
p.on('pageerror', e => errors.push(e.message))
const E = (fn, arg) => p.evaluate(fn, arg)

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
  await p.getByLabel('Reusable library').getByRole('textbox').fill('Editorial Gold')
  await p.getByRole('button', { name: 'Save as Look', exact: true }).click()
  await p.getByLabel('Reusable library').getByRole('textbox').fill('Campaign Headline')
  await p.getByRole('button', { name: 'Save text style', exact: true }).click()
  await p.getByLabel('Close reuse library').click()

  const target = await E(() => {
    const s = window.__voidEditor.getState()
    s.addText(120, 360)
    const id = window.__voidEditor.getState().activeId
    s.updateLayer(id, {
      text: 'KEEP THESE WORDS', fontFamily: 'Georgia', fontSize: 28, fontWeight: 400,
      color: '#ffffff', align: 'left', letterSpacing: 0, opacity: 1, blend: 'source-over',
    }, 'Target style')
    return id
  })
  assert(target)

  await p.getByRole('button', { name: 'Reuse', exact: true }).click()
  const lookName = p.getByText('Editorial Gold', { exact: true })
  const lookRow = lookName.locator('..').locator('..')
  await lookRow.getByRole('button', { name: 'Apply', exact: true }).click()

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

  await E(() => window.__voidEditor.getState().undo())
  state = await E(() => {
    const l = window.__voidEditor.getState().active()
    return { text: l.text, font: l.fontFamily, effects: l.effects?.length ?? 0 }
  })
  assert.equal(state.text, 'KEEP THESE WORDS')
  assert.equal(state.font, 'Georgia')
  assert.equal(state.effects, 0)

  const textRow = p.getByText('Campaign Headline', { exact: true }).locator('..').locator('..')
  await textRow.getByRole('button', { name: 'Apply', exact: true }).click()
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

  await p.getByLabel('Close reuse library').click()
  await p.setViewportSize({ width: 390, height: 844 })
  await p.getByRole('button', { name: 'Reuse', exact: true }).click()
  await p.getByLabel('Reusable library').waitFor()
  assert(await p.getByText('Editorial Gold', { exact: true }).isVisible())
  assert(await p.getByText('Campaign Headline', { exact: true }).isVisible())
  const sheet = await p.getByLabel('Reusable library').boundingBox()
  assert(sheet && sheet.width >= 380, 'Phone reuse library should become a full-width bottom sheet')

  assert.deepEqual(errors, [])
  console.log('reuse: passed')
} finally {
  await b.close()
}
