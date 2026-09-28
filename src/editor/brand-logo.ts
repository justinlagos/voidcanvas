// Brand logos in the Editor: placing one from a client brand, swapping a placed logo for another
// version, and reading the brand a design belongs to.

import { blobToCanvas, idb } from './io'
import { useEditor } from './store'
import { layerBounds } from './engine'
import type { ClientBrand, BrandLogo } from '@/studio/jobs'
import type { RasterLayer } from './types'

export async function brandFor(brandId: string | null | undefined): Promise<ClientBrand | null> {
  if (!brandId) return null
  try { return (await idb.get<ClientBrand>('brands', brandId)) ?? null } catch { return null }
}

/** Layer name from a brand asset name: "Logo / Horizontal / Primary" reads as "Logo · Primary" in the stack. */
export const layerNameFor = (l: BrandLogo) => { const parts = l.name.split('/').map(s => s.trim()).filter(Boolean); return parts.length >= 2 ? `${parts[0]} · ${parts[parts.length - 1]}` : l.name }

/**
 * Put a brand logo on the board: small, with its clear space, tagged so checks know its artwork. Over a photo it
 * goes where it reads (the calm corner away from the subject, as the guideline's photography page shows);
 * otherwise in the emptiest corner.
 */
export async function placeBrandLogo(logo: BrandLogo, brand: ClientBrand) {
  const c = await blobToCanvas(logo.blob, 2000)
  const photo = await photoCorners(logo)
  useEditor.getState().addImage(c, c.width, c.height, layerNameFor(logo), { placement: 'corner', role: 'logo', brandLogoId: logo.id, clearSpace: brand.logoRules?.clearSpace.value ?? brand.clearSpace, cornerOrder: photo?.order })
}

type Four = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
/** The corners of the photo under the active board, best first for this logo, or null when there is no photo. */
export async function photoCorners(logo: BrandLogo): Promise<{ order: Four[]; why: string } | null> {
  const s = useEditor.getState(); const doc = s.doc
  if (!doc || !logo.profile) return null
  const frame = doc.frames?.find(f => f.id === s.activeFrameId) ?? doc.frames?.[0] ?? null
  const box = frame ? { x: frame.x, y: frame.y, w: frame.width, h: frame.height } : { x: 0, y: 0, w: doc.width, h: doc.height }
  const onBoard = s.layers.filter(l => !frame || l.frameId === frame.id)
  const covers = (l: typeof onBoard[number]) => { const b = layerBounds(l, doc); const ix = Math.max(0, Math.min(b.x + b.w, box.x + box.w) - Math.max(b.x, box.x)), iy = Math.max(0, Math.min(b.y + b.h, box.y + box.h) - Math.max(b.y, box.y)); return (ix * iy) / (box.w * box.h) }
  const photo = onBoard.find(l => l.visible && l.type === 'raster' && l.role !== 'logo' && l.source === 'photo' && covers(l) >= 0.5)
  if (!photo) return null
  const [{ renderDoc, makeCanvas }, { readPhoto, placeOnPhoto }] = await Promise.all([import('./engine'), import('@/lib/intelligence/photo')])
  const k = Math.min(1, 240 / Math.max(box.w, box.h))
  const c = makeCanvas(Math.max(1, Math.round(box.w * k)), Math.max(1, Math.round(box.h * k)))
  renderDoc(c, doc, onBoard.filter(l => l.role !== 'logo'), { groups: s.groups, scale: k, region: box, noCache: true, fxDraft: true, frameRects: frame ? [frame] : [] })
  const read = readPhoto(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data, c.width, c.height)
  const four: Four[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
  const plan = placeOnPhoto(read, [{ id: logo.variant ?? 'primary', valid: true, profile: logo.profile }], { corners: four })
  return plan.length ? { order: plan.map(p => p.corner as Four), why: plan[0].why } : null
}

/** Replace a placed logo's pixels with another version of it, keeping its size and place on the board. */
export async function swapLogoVersion(layerId: string, to: BrandLogo) {
  const s = useEditor.getState()
  const l = s.layers.find(x => x.id === layerId)
  if (!l || l.type !== 'raster' || !s.doc) return
  const c = await blobToCanvas(to.blob, 2000)
  const before = layerBounds(l, s.doc)
  const k = before.w / c.width
  const cur = useEditor.getState().layers.find(x => x.id === layerId) as RasterLayer | undefined
  if (!cur) return
  s.updateLayer(layerId, { canvas: c, scaleX: k, scaleY: (before.h / c.height) || k, brandLogoId: to.id, name: layerNameFor(to) } as Partial<RasterLayer>, `Use ${to.name.split('/').pop()?.trim() ?? 'logo'}`)
}
