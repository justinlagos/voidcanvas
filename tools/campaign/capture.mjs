// Product screenshots and effect renders for the campaign statics, from the local production build.
import { chromium } from 'playwright'
import fs from 'node:fs'
const BASE = process.env.BASE || 'http://localhost:3123'
const P = '/home/claude/statics/photos', S = '/home/claude/statics/shots'
const browser = await chromium.launch()

async function editorWith(ctx, photo) {
  const page = await ctx.newPage()
  await page.goto(`${BASE}/one-image`)
  await page.setInputFiles('input[type=file]', `${P}/${photo}.jpg`)
  await page.waitForSelector('[data-challenge-life]', { timeout: 20000 })
  await page.evaluate(() => window.__vcChallenge.setState({ active: null }))
  await page.waitForTimeout(600)
  return page
}
const fit = async page => { await page.keyboard.press('Control+0'); await page.waitForTimeout(400) }

// Desktop editor, one photo.
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
  const page = await editorWith(ctx, 'street')
  await fit(page)
  await page.screenshot({ path: `${S}/editor-street.png` })
  // Six boards from one design.
  await page.evaluate(() => {
    const s = window.__voidEditor.getState()
    s.addFrame({ name: 'Post', width: 1080, height: 1080 })
    for (const f of [{ name: 'Story', width: 1080, height: 1920 }, { name: 'LinkedIn', width: 1200, height: 627 }, { name: 'A4', width: 2480, height: 3508 }, { name: 'Poster', width: 3508, height: 4961 }, { name: 'Web', width: 1920, height: 1080 }]) window.__voidEditor.getState().addFrame(f)
    window.__voidEditor.getState().organiseFrames()
  })
  await page.waitForTimeout(800); await fit(page)
  await page.screenshot({ path: `${S}/editor-boards.png` })
  await page.close()
  // Portrait for the "software shouldn't get in the way" static.
  const p2 = await editorWith(ctx, 'portrait'); await fit(p2)
  await p2.screenshot({ path: `${S}/editor-portrait.png` })
  await p2.close()
  await ctx.close()
}

// Phone editor.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const page = await editorWith(ctx, 'portrait')
  await page.screenshot({ path: `${S}/phone-editor.png` })
  await page.close(); await ctx.close()
}

// Effects: page screenshots and full-size renders.
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const settle = async () => { await page.waitForTimeout(400); await page.waitForFunction(() => !document.body.innerText.includes('Processing'), null, { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(300) }
  const btn = name => page.locator(`[data-effects-sidebar] button:has-text("${name}")`).first()
  const render = async name => {
    const data = await page.evaluate(() => document.querySelector('canvas[data-result-canvas]').toDataURL('image/png').split(',')[1])
    fs.writeFileSync(`${S}/fx-${name}.png`, Buffer.from(data, 'base64'))
  }
  for (const [photo, effects] of [['street', ['Halftone', 'Glitch', 'Dither', 'Pixelate']], ['portrait', ['Halftone', 'Pop Art', 'Threshold']], ['landscape', ['Halftone', 'Glitch']]]) {
    await page.goto(`${BASE}/effects`)
    await page.setInputFiles('input[type=file]', `${P}/${photo}.jpg`)
    await page.waitForSelector('canvas[data-result-canvas]'); await settle()
    for (const e of effects) {
      await btn(e).click(); await settle()
      await render(`${photo}-${e.toLowerCase().replace(/\s+/g, '')}`)
      if (photo === 'street' && e === 'Halftone') await page.screenshot({ path: `${S}/effects-halftone.png` })
      if (photo === 'street' && e === 'Glitch') {
        await page.screenshot({ path: `${S}/effects-glitch.png` })
        // Push every slider to the end.
        const sliders = await page.$$('[data-effects-sidebar] input[type=range]')
        for (const s of sliders) { const b = await s.boundingBox(); if (b) await page.mouse.click(b.x + b.width - 2, b.y + b.height / 2) }
        await settle(); await render('street-pushed')
      }
    }
  }
  await page.close(); await ctx.close()
}
await browser.close()
console.log(fs.readdirSync(S).join('\n'))
