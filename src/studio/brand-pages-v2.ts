import { lint } from '@/brand/compose/lint'
import { paintCanvas } from '@/brand/compose/paint-canvas'
import {
  composePhase1Page,
  type ComposeEnv,
} from '@/brand/compose/phase1-pages'
import { recordComposedPage } from '@/brand/compose/record'
import { markAspect, studioCanvasHooks } from '@/brand/compose/studio-canvas'
import { loadFont } from './brand/fonts'
import {
  NO_DECISIONS,
  type LogoDecisions,
  type LogoInfo,
} from './brand/logo'
import type { Brand } from './brand/tokens'
import * as legacy from './brand-pages'

export {
  DEFAULT_PAGES,
  PAGE_DEFS,
  SIZES,
  lastPhotoPlan,
} from './brand-pages'
export type {
  GuidePhoto,
  Orientation,
  PageKind,
  PageSpec,
} from './brand-pages'

const migratedKinds = new Set<legacy.PageKind>(['cover', 'colour', 'clearspace'])

export const usesBrandIr = (spec: legacy.PageSpec) =>
  spec.variant === 0 && migratedKinds.has(spec.kind)

async function fontsReady(brand: Brand) {
  await Promise.all([
    loadFont(brand.fonts.heading, [400, 600, 700]),
    loadFont(brand.fonts.body, [400, 500, 600, 700]),
    loadFont(brand.fonts.mono, [400, 500, 600]),
  ])
}

function composed(
  spec: legacy.PageSpec,
  pageNo: number,
  pageCount: number,
  brand: Brand,
  logo: LogoInfo | null,
  orientation: legacy.Orientation,
) {
  const env: ComposeEnv = {
    brand,
    orientation,
    pageNo,
    pageCount,
    logoAspect: markAspect(logo),
  }
  return composePhase1Page(
    spec.kind as 'cover' | 'colour' | 'clearspace',
    env,
  )
}

function checkedPage(
  spec: legacy.PageSpec,
  pageNo: number,
  pageCount: number,
  brand: Brand,
  logo: LogoInfo | null,
  orientation: legacy.Orientation,
) {
  const page = composed(spec, pageNo, pageCount, brand, logo, orientation)
  const findings = lint(page, brand)
  const geometryFailure = findings.find(
    (finding) =>
      finding.level === 'attention' &&
      (finding.code === 'invalid-rect' || finding.code === 'outside-page'),
  )
  if (geometryFailure) throw new Error(`Brand page lint: ${geometryFailure.message}`)
  return { page, findings }
}

export async function renderPage(
  spec: legacy.PageSpec,
  pageNo: number,
  pageCount: number,
  brand: Brand,
  logo: LogoInfo | null,
  orientation: legacy.Orientation,
  scale = 1,
  decisions: LogoDecisions = NO_DECISIONS,
  photos: legacy.GuidePhoto[] = [],
): Promise<HTMLCanvasElement> {
  if (!usesBrandIr(spec))
    return legacy.renderPage(
      spec,
      pageNo,
      pageCount,
      brand,
      logo,
      orientation,
      scale,
      decisions,
      photos,
    )

  await fontsReady(brand)
  const { page, findings } = checkedPage(
    spec,
    pageNo,
    pageCount,
    brand,
    logo,
    orientation,
  )
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(page.size.w * scale)
  canvas.height = Math.round(page.size.h * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  paintCanvas(page, ctx, {
    brand,
    hooks: studioCanvasHooks({ brand, logo, decisions }),
  })
  Object.defineProperty(canvas, '__vcBrandLint', {
    value: findings,
    configurable: true,
  })
  return canvas
}

export async function eachPage(
  pages: legacy.PageSpec[],
  brand: Brand,
  logo: LogoInfo | null,
  orientation: legacy.Orientation,
  scale: number,
  fn: (
    canvas: HTMLCanvasElement,
    title: string,
    index: number,
    count: number,
  ) => Promise<void>,
  decisions: LogoDecisions = NO_DECISIONS,
  photos: legacy.GuidePhoto[] = [],
) {
  const visible = pages.filter((page) => page.on)
  for (let i = 0; i < visible.length; i++) {
    const canvas = await renderPage(
      visible[i],
      i + 1,
      visible.length,
      brand,
      logo,
      orientation,
      scale,
      decisions,
      photos,
    )
    try {
      await fn(
        canvas,
        legacy.PAGE_DEFS[visible[i].kind].title,
        i,
        visible.length,
      )
    } finally {
      canvas.width = 0
      canvas.height = 0
    }
  }
}

export async function recordPages(
  pages: legacy.PageSpec[],
  brand: Brand,
  logo: LogoInfo | null,
  orientation: legacy.Orientation,
  onPage?: (index: number, count: number) => void,
  decisions: LogoDecisions = NO_DECISIONS,
  photos: legacy.GuidePhoto[] = [],
) {
  // Preserve the legacy recording for all non-migrated pages, then replace only the
  // three default Phase 1 pages. This keeps alternate layouts and every other page untouched.
  const output = await legacy.recordPages(
    pages,
    brand,
    logo,
    orientation,
    onPage,
    decisions,
    photos,
  )
  const visible = pages.filter((page) => page.on)
  await fontsReady(brand)
  for (let i = 0; i < visible.length; i++) {
    const spec = visible[i]
    if (!usesBrandIr(spec)) continue
    onPage?.(i, visible.length)
    const { page } = checkedPage(
      spec,
      i + 1,
      visible.length,
      brand,
      logo,
      orientation,
    )
    const recorded = recordComposedPage(
      page,
      brand,
      studioCanvasHooks({ brand, logo, decisions }),
    )
    output[i] = {
      ...recorded,
      title: legacy.PAGE_DEFS[spec.kind].title,
    }
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  return output
}
