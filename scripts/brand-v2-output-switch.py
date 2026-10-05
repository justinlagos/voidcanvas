from pathlib import Path

p = Path('src/studio/BrandGuideline.tsx')
s = p.read_text()

s = s.replace(
    "import { PAGE_DEFS, SIZES, eachPage, lastPhotoPlan, recordPages, renderPage, type Orientation, type PageSpec } from './brand-pages'",
    "import { PAGE_DEFS, SIZES, lastPhotoPlan, recordPages, type Orientation, type PageSpec } from './brand-pages'",
    1,
)
s = s.replace(
    "import { renderRuntimePage } from './brand-v2-render'",
    "import { eachRuntimePage, renderRuntimePage } from './brand-v2-render'",
    1,
)

anchor = "  const brand = useMemo(() => buildBrand(tokens), [tokens])\n"
addition = "  const outputRuntime = useMemo(() => composeRuntimePages({ brand, logo, pages, salt: tokens.salt, layoutSalt: tokens.layoutSalt ?? 0 }), [brand, logo, pages, tokens.salt, tokens.layoutSalt])\n"
if addition not in s:
    if anchor not in s:
        raise SystemExit('brand memo anchor not found')
    s = s.replace(anchor, anchor + addition, 1)

old_pdf = "  const exportPdf = () => run('Building screen PDF', async () => { const { exportBrandPdf } = await import('./brand-pdf'); await exportBrandPdf(brand, logo, pages, o, `${base}-guidelines-${o}.pdf`, decisions, photos) })\n  const exportPrint = () => run('Building print PDF', async () => { const { exportPrintPdf } = await import('./brand-pdf'); await exportPrintPdf(brand, logo, pages, o, `${base}-guidelines-print-${o}.pdf`, decisions, photos) })"
new_pdf = "  const exportPdf = () => run('Building screen PDF', async () => { const { exportBrandPdf } = await import('./brand-pdf'); await exportBrandPdf(brand, logo, pages, o, `${base}-guidelines-${o}.pdf`, decisions, photos, outputRuntime.irByIndex) })\n  const exportPrint = () => run('Building print PDF', async () => { const { exportPrintPdf } = await import('./brand-pdf'); await exportPrintPdf(brand, logo, pages, o, `${base}-guidelines-print-${o}.pdf`, decisions, photos, outputRuntime.irByIndex) })"
if old_pdf not in s:
    raise SystemExit('PDF export block not found')
s = s.replace(old_pdf, new_pdf, 1)

old_html = "    await eachPage(pages, brand, logo, o, 1, async c => { slides.push(c.toDataURL('image/jpeg', 0.85)) }, decisions, photos)"
new_html = "    await eachRuntimePage({ pages, irByIndex: outputRuntime.irByIndex, brand, logo, orientation: o, scale: 1, decisions, photos, titleFor: spec => PAGE_DEFS[spec.kind].title, fn: async c => { slides.push(c.toDataURL('image/jpeg', 0.85)) } })"
if old_html not in s:
    raise SystemExit('HTML handoff render call not found')
s = s.replace(old_html, new_html, 1)

old_save = "    await eachPage(pages, brand, logo, o, 0.7, async c => { savedPages.push({ name: `Guideline page ${savedPages.length + 1}`, data: c.toDataURL('image/jpeg', 0.8) }) }, decisions, photos)"
new_save = "    await eachRuntimePage({ pages, irByIndex: outputRuntime.irByIndex, brand, logo, orientation: o, scale: 0.7, decisions, photos, titleFor: spec => PAGE_DEFS[spec.kind].title, fn: async c => { savedPages.push({ name: `Guideline page ${savedPages.length + 1}`, data: c.toDataURL('image/jpeg', 0.8) }) } })"
if old_save not in s:
    raise SystemExit('saved guideline render call not found')
s = s.replace(old_save, new_save, 1)

p.write_text(s)
