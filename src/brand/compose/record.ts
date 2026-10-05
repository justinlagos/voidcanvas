import { recordPage, type RecordedPage } from '@/studio/brand/record'
import type { Brand } from '@/studio/brand/tokens'
import { paintCanvas, type CanvasPaintHooks } from './paint-canvas'
import type { Page } from './types'

/**
 * Record the same IR painter used by preview/PDF into editable Editor items.
 * Unsupported devices remain a small raster graphic through the existing recorder fallback.
 */
export function recordComposedPage(
  page: Page,
  brand: Brand,
  hooks?: CanvasPaintHooks,
): RecordedPage {
  return recordPage(page.size.w, page.size.h, (ctx) => {
    paintCanvas(page, ctx, { brand, hooks })
  })
}
