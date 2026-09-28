import { describe, expect, it } from 'vitest'
import { profilePixels, knockOutFlatBackground, describeProfile } from '../intelligence/asset'
import { markContrast, flatContrast, scrimFor, contrastRatio } from '../intelligence/contrast'
import { planVariants, variantProfile, knockoutPixels, grayscalePixels } from '../intelligence/logo'
import { backgroundSet, placeAll } from '../intelligence/backgrounds'
import { readPhoto, placeOnPhoto } from '../intelligence/photo'
import { suggestImageName, suggestLogoName, isMeaningless } from '../intelligence/naming'
import { classifyFontName, suggestReplacements } from '../intelligence/fonts'
import { brandHealth, healthSummary, suggestRules } from '../intelligence/brand'
import { exportPreflight, deliveryPreflight, effectivePpi } from '../intelligence/preflight'

// ── tiny raster helpers: draw logos as pixel buffers, no DOM ──
type Img = { data: Uint8ClampedArray; w: number; h: number }
const img = (w: number, h: number, bg: [number, number, number, number] = [0, 0, 0, 0]): Img => { const d = new Uint8ClampedArray(w * h * 4); for (let o = 0; o < d.length; o += 4) { d[o] = bg[0]; d[o + 1] = bg[1]; d[o + 2] = bg[2]; d[o + 3] = bg[3] } return { data: d, w, h } }
const px = (i: Img, x: number, y: number, r: number, g: number, b: number, a = 255) => { const o = (y * i.w + x) * 4; i.data[o] = r; i.data[o + 1] = g; i.data[o + 2] = b; i.data[o + 3] = a }
const rect = (i: Img, x0: number, y0: number, w: number, h: number, c: [number, number, number]) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && y >= 0 && x < i.w && y < i.h) px(i, x, y, ...c) }
const disc = (i: Img, cx: number, cy: number, r: number, c: [number, number, number]) => { for (let y = 0; y < i.h; y++) for (let x = 0; x < i.w; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px(i, x, y, ...c) }
const BLUE: [number, number, number] = [11, 61, 145], ORANGE: [number, number, number] = [255, 122, 0], INK: [number, number, number] = [17, 24, 39], WHITE: [number, number, number] = [255, 255, 255]

/** Blue disc with an orange centre plus a dark "wordmark" of five bars: a lockup whose meaning lives in colour boundaries. */
function lockup(): Img {
  const i = img(300, 100)
  disc(i, 50, 50, 40, BLUE); disc(i, 50, 50, 20, ORANGE)
  for (let k = 0; k < 5; k++) rect(i, 110 + k * 36, 30, 24, 44, INK)
  return i
}
/** One-colour mark: a solid disc. */
const monoMark = (c: [number, number, number] = BLUE) => { const i = img(120, 120); disc(i, 60, 60, 50, c); return i }
/** The lockup flattened on white like a JPG export, with soft edges. */
function jpgOnWhite(): Img {
  const i = img(300, 100, [255, 255, 255, 255])
  disc(i, 50, 50, 40, BLUE)
  for (let k = 0; k < 5; k++) rect(i, 110 + k * 36, 30, 24, 44, INK)
  // Anti-aliased rim around the disc, half way to white.
  for (let y = 0; y < i.h; y++) for (let x = 0; x < i.w; x++) { const d = Math.hypot(x - 50, y - 50); if (d > 40 && d <= 41.5) px(i, x, y, 133, 158, 200) }
  return i
}

describe('asset profile', () => {
  it('reads a multicolour lockup: three colours, internal edges, not mono', () => {
    const l = lockup(); const p = profilePixels(l.data, l.w, l.h)
    expect(p.colors.length).toBeGreaterThanOrEqual(3)
    expect(p.mono).toBe(false)
    expect(p.chromatic).toBe(true)
    expect(p.internalEdges).toBeGreaterThan(0.12)
    expect(p.transparent).toBe(true)
    expect(p.kind).toBe('lockup')
    expect(p.flatBackground).toBeNull()
    // The boundary that carries the meaning is the disc's edge between blue and orange, not the text.
    expect(p.boundary?.slice().sort()).toEqual(['#0b3d91', '#ff7a00'])
    expect(describeProfile(p)).toMatch(/lockup/)
  })
  it('reads a solid disc as a mono symbol', () => {
    const m = monoMark(); const p = profilePixels(m.data, m.w, m.h)
    expect(p.mono).toBe(true); expect(p.kind).toBe('mark'); expect(p.internalEdges).toBe(0)
    expect(p.colors[0].hex).toBe('#0b3d91')
  })
  it('knocks out a flat white background and ignores the soft rim when measuring colours', () => {
    const j = jpgOnWhite(); const p = profilePixels(j.data, j.w, j.h)
    expect(p.flatBackground).toBe('#ffffff')
    expect(p.transparent).toBe(true)
    // The rim colour (#859ec8) is anti-aliasing, so it must not appear as a main colour.
    expect(p.colors.filter(c => c.share >= 0.05).map(c => c.hex)).not.toContain('#859ec8')
    expect(p.colors.some(c => c.hex === '#111827' && c.share > 0.3)).toBe(true)
  })
  it('does not knock out a picture whose corners are not a flat field', () => {
    const i = img(60, 60, [255, 255, 255, 255]); rect(i, 0, 0, 30, 60, [0, 0, 0])
    const d = new Uint8ClampedArray(i.data)
    expect(knockOutFlatBackground(d, 60, 60)).toBeNull()
  })
  it('estimates thin strokes as small relative to height', () => {
    const thin = img(200, 100); for (let k = 0; k < 6; k++) rect(thin, 10 + k * 30, 10, 2, 80, INK)
    const thick = img(200, 100); for (let k = 0; k < 3; k++) rect(thick, 10 + k * 60, 10, 40, 80, INK)
    const a = profilePixels(thin.data, thin.w, thin.h), b = profilePixels(thick.data, thick.w, thick.h)
    expect(a.minStroke).toBeLessThan(b.minStroke)
    expect(a.minStroke).toBeLessThan(0.06)
  })
})

describe('mark contrast', () => {
  const p = profilePixels(lockup().data, 300, 100)
  it('is the worst of the main colours: ink on a near-black background fails even though blue and orange hold', () => {
    const r = markContrast(p, '#111318')
    expect(r.ratio).toBeLessThan(1.5); expect(r.level).toBe('attention'); expect(r.worst.hex).toBe('#111827')
    expect(r.why).toMatch(/drops to/)
  })
  it('passes on white with the text target for a lockup', () => {
    const r = markContrast(p, '#ffffff'); expect(r.level).toBe('good'); expect(r.need).toBe(4.5)
  })
  it('uses the 3:1 non-text target for a symbol', () => {
    const m = profilePixels(monoMark([120, 120, 120]).data, 120, 120)
    expect(markContrast(m, '#ffffff').need).toBe(3)
  })
  it('flat contrast and scrims', () => {
    expect(flatContrast('#ffffff', '#000000').ratio).toBeCloseTo(21, 0)
    const s = scrimFor(1, 0.5, 4.5)
    expect(s?.color).toBe('#000000'); expect(s!.opacity).toBeGreaterThan(0)
    expect(scrimFor(0.5, 0.5, 21)).toBeNull()
    expect(contrastRatio('#0b3d91', '#ffffff')).toBeGreaterThan(9)
  })
})

describe('variants', () => {
  it('refuses a flat knockout for a mark whose meaning is in colour boundaries, offers greyscale', () => {
    const p = profilePixels(lockup().data, 300, 100)
    const plans = planVariants(p, '#111111', '#0b3d91')
    const rev = plans.find(v => v.id === 'reversed')!, mono = plans.find(v => v.id === 'mono-dark')!, grey = plans.find(v => v.id === 'grayscale')
    expect(rev.valid).toBe(false); expect(rev.reason).toMatch(/lose the detail between dark blue and orange/)
    expect(mono.valid).toBe(false)
    expect(grey?.valid).toBe(true)
  })
  it('allows knockouts for a one-colour mark and knows a white file is already reversed', () => {
    const p = profilePixels(monoMark().data, 120, 120)
    expect(planVariants(p).every(v => v.valid)).toBe(true)
    const w = profilePixels(monoMark(WHITE).data, 120, 120)
    const plans = planVariants(w)
    expect(plans.find(v => v.id === 'primary')!.reason).toMatch(/reversed version/)
    expect(plans.find(v => v.id === 'reversed')!.derived).toBe(false)
  })
  it('a knockout variant profile is one colour and keeps alpha in pixels', () => {
    const p = profilePixels(monoMark().data, 120, 120)
    const vp = variantProfile(p, { id: 'reversed', valid: true, reason: '', fill: '#ffffff', derived: true })
    expect(vp.colors).toHaveLength(1); expect(vp.colors[0].hex).toBe('#ffffff'); expect(vp.tone).toBe('light')
    const m = monoMark(); const k = knockoutPixels(m.data, '#ffffff'); const g = grayscalePixels(m.data)
    expect(k[(60 * 120 + 60) * 4]).toBe(255); expect(k[(0) * 4 + 3]).toBe(0)
    expect(g[(60 * 120 + 60) * 4]).toBe(g[(60 * 120 + 60) * 4 + 2])
  })
})

describe('backgrounds', () => {
  const p = profilePixels(lockup().data, 300, 100)
  const plans = planVariants(p, '#111111')
  const variants = plans.map(pl => ({ id: pl.id, valid: pl.valid, profile: variantProfile(p, pl) }))
  it('full colour on white, greyscale refused elsewhere, scrim suggested when nothing clears', () => {
    const bgs = backgroundSet({ primary: '#0b3d91', dark: '#111318', light: '#f6f7fb' })
    const out = placeAll(bgs, variants)
    const white = out.find(o => o.bg.id === 'white')!, dark = out.find(o => o.bg.id === 'dark')!
    expect(white.use).toBe('primary'); expect(white.level).toBe('good')
    expect(dark.level).toBe('attention'); expect(dark.why).toMatch(/No version clears|scrim/)
    expect(dark.fix?.color).toBe('#ffffff')
  })
  it('picks the reversed version for a mono mark on its own colour', () => {
    const m = profilePixels(monoMark().data, 120, 120)
    const mv = planVariants(m, '#111111').map(pl => ({ id: pl.id, valid: pl.valid, profile: variantProfile(m, pl) }))
    const out = placeAll(backgroundSet({ primary: '#0b3d91' }), mv)
    const brand = out.find(o => o.bg.id === 'brand')!
    expect(brand.use).toBe('reversed'); expect(brand.level).toBe('good'); expect(brand.primary.ratio).toBeCloseTo(1, 1)
  })
  it('drops duplicate backgrounds', () => {
    expect(backgroundSet({ primary: '#ffffff', light: '#FFFFFF' }).filter(b => b.hex.toLowerCase() === '#ffffff')).toHaveLength(1)
  })
})

describe('photo placement', () => {
  it('avoids the subject and picks the calm corner with the reversed logo on a dark photo', () => {
    const ph = img(300, 200, [30, 30, 36, 255])
    // Busy subject in the centre-right: noise.
    for (let y = 40; y < 160; y++) for (let x = 150; x < 260; x++) px(ph, x, y, (x * 7 + y * 13) % 255, (x * 3) % 255, (y * 5) % 255)
    const read = readPhoto(ph.data, ph.w, ph.h)
    expect(read.subject).not.toBeNull()
    const m = profilePixels(monoMark().data, 120, 120)
    const variants = planVariants(m, '#111111').map(pl => ({ id: pl.id, valid: pl.valid, profile: variantProfile(m, pl) }))
    const best = placeOnPhoto(read, variants)[0]
    expect(best.corner).toMatch(/top-left|bottom-left/)
    expect(best.use).toBe('reversed'); expect(best.level).toBe('good')
  })
})

describe('naming', () => {
  it('replaces camera names and keeps real ones', () => {
    expect(isMeaningless('IMG_3948.png')).toBe(true); expect(isMeaningless('Screenshot 2026-09-26.png')).toBe(true); expect(isMeaningless('lagos-rooftop.jpg')).toBe(false)
    expect(suggestImageName('IMG_3948.png', 1000, 1500)).toBe('Image · Portrait')
    expect(suggestImageName('DSC00123.JPG', 3000, 2000)).toBe('Image · Landscape')
    expect(suggestImageName('lagos-rooftop_night.jpg', 3000, 2000)).toBe('lagos rooftop night')
  })
  it('names logos from hints and profile', () => {
    const p = profilePixels(lockup().data, 300, 100)
    expect(suggestLogoName('kobo_logo_white.png', p)).toBe('Logo / Horizontal / Reversed')
    expect(suggestLogoName('IMG_0001.png', p)).toBe('Logo / Horizontal / Primary')
    expect(suggestLogoName('icon.svg', null, 'mono-dark')).toBe('Logo / Symbol / Mono dark')
    const w = profilePixels(monoMark(WHITE).data, 120, 120)
    expect(suggestLogoName('logo.png', w)).toBe('Logo / Symbol / Reversed')
  })
})

describe('fonts', () => {
  it('classifies by table and by name words', () => {
    expect(classifyFontName('Gotham Bold')).toMatchObject({ cls: 'geometric', weight: 700 })
    expect(classifyFontName('HelveticaNeueLTStd-BdCn')).toMatchObject({ cls: 'condensed', width: 'condensed' })
    expect(classifyFontName('Minion Pro')).toMatchObject({ cls: 'serif' })
    expect(classifyFontName('SomeBrandScript')).toMatchObject({ cls: 'script' })
    expect(classifyFontName('Roboto Condensed')).toMatchObject({ cls: 'condensed' })
  })
  it('suggests a like-for-like replacement, not Inter for everything', () => {
    const avail = ['Inter', 'Poppins', 'Montserrat', 'Space Grotesk', 'DM Sans', 'Archivo Black', 'Bebas Neue', 'Oswald', 'Anton', 'Playfair Display', 'DM Serif Display', 'Lora', 'Fraunces', 'Caveat', 'Permanent Marker', 'JetBrains Mono']
    expect(suggestReplacements('Gotham', avail).closest).toMatch(/Poppins|Montserrat|DM Sans/)
    expect(suggestReplacements('Garamond Premier Pro', avail).closest).toMatch(/Lora|Fraunces/)
    expect(suggestReplacements('Bodoni MT', avail).closest).toMatch(/Playfair|DM Serif/)
    expect(suggestReplacements('Impact', avail).closest).toMatch(/Oswald|Bebas|Anton/)
    expect(suggestReplacements('Courier New', avail).closest).toBe('JetBrains Mono')
    expect(suggestReplacements('Helvetica Neue', avail).safer).toBe('Inter')
  })
})

describe('brand rules and health', () => {
  const p = profilePixels(lockup().data, 300, 100)
  it('suggests clear space from the shape and a minimum width from the thinnest stroke, labelled suggested', () => {
    const r = suggestRules(p)
    expect(r.clearSpace.source).toBe('suggested'); expect([0.25, 0.5, 1]).toContain(r.clearSpace.value)
    expect(r.minWidth.value).toBeGreaterThanOrEqual(24); expect(r.minPrint.value).toBeGreaterThanOrEqual(8)
    expect(suggestRules(null).minWidth.value).toBe(40)
  })
  it('reads health quietly: a reversed version that cannot be derived is worth checking, not an error', () => {
    const groups = brandHealth({ colors: [{ hex: '#0b3d91', role: 'primary' }], display: 'Anton', body: 'Inter', logos: [{ name: 'Logo / Primary', variant: 'primary', profile: p }], logoRules: null })
    const logo = groups.find(g => g.title === 'Logo')!
    expect(logo.items.find(i => i.label === 'Reversed')).toMatchObject({ level: 'check' })
    expect(logo.items.find(i => i.label === 'Reversed')!.note).toMatch(/Ask the client/)
    const s = healthSummary(groups)
    expect(s.level).toBe('attention') // no logo rules, no background/text colours
    expect(s.text).toMatch(/attention/)
  })
})

describe('preflight', () => {
  const a3 = { id: 'a3', name: 'A3 poster', width: 3508, height: 4961, mm: { w: 297, h: 420 } }
  const post = { id: 'ig', name: 'Instagram post', width: 1080, height: 1350 }
  it('says what a soft image will do, in inches and ppi, and offers a replacement', () => {
    const photo = { id: 'p', name: 'hero', type: 'raster' as const, visible: true, frameId: 'a3', bounds: { x: 0, y: 0, w: 3508, h: 2338 }, pixels: { w: 640, h: 427 } }
    expect(Math.round(effectivePpi(photo, a3)!)).toBe(55)
    const f = exportPreflight({ boards: [a3], layers: [photo], boardIds: ['a3'], format: 'pdf', scale: 1 })
    expect(f[0].level).toBe('attention'); expect(f[0].text).toMatch(/640 px wide and prints at 11.7 in/); expect(f[0].action).toBe('Replace image')
  })
  it('flags text past the edge, empty text and hidden layers; sizes past the canvas limit', () => {
    const f = exportPreflight({ boards: [post], layers: [
      { id: 't', name: 'Headline', type: 'text', visible: true, frameId: 'ig', bounds: { x: 900, y: 100, w: 400, h: 80 }, text: 'Kobo' },
      { id: 'e', name: 'Text', type: 'text', visible: true, frameId: 'ig', bounds: { x: 0, y: 0, w: 10, h: 10 }, text: '  ' },
      { id: 'h', name: 'Old photo', type: 'raster', visible: false, frameId: 'ig', bounds: { x: 0, y: 0, w: 10, h: 10 }, pixels: { w: 10, h: 10 } },
    ], boardIds: ['ig'], format: 'png', scale: 20 })
    expect(f.map(x => x.text).join('\n')).toMatch(/runs past the edge/)
    expect(f.map(x => x.text).join('\n')).toMatch(/empty text layer/)
    expect(f.map(x => x.text).join('\n')).toMatch(/hidden layer/)
    expect(f.map(x => x.text).join('\n')).toMatch(/past what browsers can draw/)
  })
  it('delivery: ready when built, approved and clean; otherwise counts what needs attention', () => {
    const ok = deliveryPreflight({ deliverables: [{ id: 'a', label: 'A3 poster', group: 'Print', built: true, kinds: ['pdf', 'jpg'] }], versions: [{ n: 2, label: 'v2', status: 'approved', openPins: 0, openTodos: 0, hasOpenLink: true }], fileNames: ['x_v2.pdf', 'x_v2.jpg'], hasBrand: true })
    expect(ok.summary).toBe('Ready to deliver'); expect(ok.level).toBe('good')
    const bad = deliveryPreflight({ deliverables: [{ id: 'a', label: 'A3 poster', group: 'Print', built: true, kinds: ['jpg'] }, { id: 'b', label: 'Story', group: 'Social', built: false, kinds: [] }], versions: [{ n: 1, label: 'v1', status: 'changes', openPins: 2, openTodos: 1, hasOpenLink: true }], fileNames: ['a.jpg', 'a.jpg'], hasBrand: false })
    expect(bad.level).toBe('attention'); expect(bad.summary).toMatch(/things need attention/)
    expect(bad.findings.map(f => f.text).join('\n')).toMatch(/Story/); expect(bad.findings.map(f => f.text).join('\n')).toMatch(/no print PDF/); expect(bad.findings.map(f => f.text).join('\n')).toMatch(/2 comments/); expect(bad.findings.map(f => f.text).join('\n')).toMatch(/Duplicate/)
  })
  it('delivery: warns when the design changed after approval, and not when the approved version is delivered', () => {
    const base = { deliverables: [{ id: 'a', label: 'Post', group: 'Social', built: true, kinds: ['png'] }], versions: [{ n: 3, label: 'v3', status: 'approved' as const, openPins: 0, openTodos: 0, hasOpenLink: false }], fileNames: ['x_v3.png'], hasBrand: true }
    const now = deliveryPreflight({ ...base, approval: { label: 'v3', changed: true, delivering: 'current', next: 'v4' } })
    expect(now.level).toBe('attention')
    expect(now.findings[0].text).toBe('The design changed after v3 was approved. Deliver v3, or send v4 for approval.')
    expect(deliveryPreflight({ ...base, approval: { label: 'v3', changed: true, delivering: 'approved', next: 'v4' } }).level).toBe('good')
    expect(deliveryPreflight({ ...base, approval: { label: 'v3', changed: false, delivering: 'current', next: 'v4' } }).level).toBe('good')
    // A newer draft after the approved one: delivering the approved version is still fine.
    const later = { ...base, versions: [...base.versions, { n: 4, label: 'v4', status: 'draft' as const, openPins: 0, openTodos: 0, hasOpenLink: false }] }
    expect(deliveryPreflight({ ...later, approval: { label: 'v3', changed: true, delivering: 'approved', next: 'v5' } }).level).toBe('good')
  })
})
