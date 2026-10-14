// Exact-commit real Editor proof: resync keeps variant identity, edits, and history.
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:3000'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
try {
  await page.goto(BASE + '/editor')
  await page.waitForFunction(() => Boolean(window.__voidEditor), null, { timeout: 45000 })
  await page.evaluate(() => {
    const st = window.__voidEditor.getState()
    const layer = (id, frameId, srcId, text, color, x, base) => ({
      id, frameId, srcId, name: 'Headline', type: 'text', text, color, x, y: 20,
      fontFamily: 'Inter', fontSize: 32, fontWeight: 600, italic: false, align: 'left',
      lineHeight: 1.2, letterSpacing: 0, scaleX: 1, scaleY: 1, rotation: 0,
      visible: true, locked: false, opacity: 1, blend: 'source-over', mask: null, maskEnabled: false, rev: 1,
      ...(base ? { cascadeBase: base } : {}),
    })
    st.loadFramed({
      id: 'cascade-ci', name: 'Cascade regression', width: 1400, height: 700, background: null,
      frames: [
        { id: 'M', name: 'Master', x: 0, y: 0, width: 600, height: 600, background: '#fff' },
        { id: 'V', name: 'Square variant', x: 700, y: 0, width: 500, height: 500, background: '#fff', linkedFrom: 'M' },
      ],
    }, [
      layer('source', 'M', null, 'Master original', '#111111', 40),
      layer('stable-variant', 'V', 'source', 'Master original', '#fa1000', 775, { text: 'Master original', color: '#111111' }),
      layer('local-only', 'V', null, 'Independent', '#55aa11', 800),
    ], [], [])
  })
  await page.evaluate(() => window.__voidEditor.getState().updateLayer('source', { text: 'Master updated', color: '#19a6fc' }, 'Update master'))
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'boards' })))
  await page.getByRole('button', { name: 'Re-sync variants' }).click()
  const result = await page.evaluate(() => {
    const st = window.__voidEditor.getState()
    const v = st.layers.find(l => l.id === 'stable-variant')
    return {
      variant: v && { id: v.id, text: v.text, color: v.color, x: v.x, srcId: v.srcId },
      local: st.layers.some(l => l.id === 'local-only'),
      count: st.layers.filter(l => l.frameId === 'V').length,
      history: st.history.at(-1)?.label,
    }
  })
  if (JSON.stringify(result.variant) !== JSON.stringify({
    id: 'stable-variant', text: 'Master updated', color: '#fa1000', x: 775, srcId: 'source',
  })) throw new Error('variant identity/inheritance/override regression: ' + JSON.stringify(result))
  if (!result.local || result.count !== 2 || result.history !== 'Update linked variants')
    throw new Error('variant-only artwork or history regression: ' + JSON.stringify(result))
  await page.evaluate(() => window.__voidEditor.getState().undo())
  const undo = await page.evaluate(() => window.__voidEditor.getState().layers.find(l => l.id === 'stable-variant')?.text)
  if (undo !== 'Master original') throw new Error('one-step cascade undo failed: ' + undo)
  await page.evaluate(() => window.__voidEditor.getState().redo())
  const redo = await page.evaluate(() => window.__voidEditor.getState().layers.find(l => l.id === 'stable-variant')?.text)
  if (redo !== 'Master updated') throw new Error('one-step cascade redo failed: ' + redo)
  // Real .void serialization must retain stable instance ids and the
  // inheritance baseline; otherwise the next sync after reopen loses safety.
  await page.waitForFunction(() => !!window.__vcAssets?.saveVoid, null, { timeout: 15000 })
  const file = await page.evaluate(() => window.__vcAssets.saveVoid())
  if (!file?.b64 || file.len < 1000) throw new Error('editable file save failed')
  await page.evaluate(() => window.__voidEditor.getState().closeDoc())
  await page.evaluate(b64 => window.__vcAssets.openVoid(b64), file.b64)
  const reopened = await page.evaluate(() => {
    const s = window.__voidEditor.getState()
    const v = s.layers.find(l => l.id === 'stable-variant')
    return {
      text: v?.text, color: v?.color, x: v?.x,
      baseText: v?.cascadeBase?.text, id: v?.id, local: !!s.layers.find(l => l.id === 'local-only'),
    }
  })
  if (JSON.stringify(reopened) !== JSON.stringify({
    text: 'Master updated', color: '#fa1000', x: 775,
    baseText: 'Master updated', id: 'stable-variant', local: true,
  })) throw new Error('.void identity/override/baseline round-trip failed: ' + JSON.stringify(reopened))
  console.log('PASS .void round-trip: identity, custom placement, local colour override, inheritance baseline')
  if (errors.length) throw new Error('Uncaught browser errors: ' + errors.join('; '))
  console.log('PASS cascade identity, local override, inherited copy, variant-only artwork, undo and redo', JSON.stringify(result))
} finally { await browser.close() }
