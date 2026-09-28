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

/** Put a brand logo on the board: small, in the emptiest corner, with its clear space, tagged so checks know its artwork. */
export async function placeBrandLogo(logo: BrandLogo, brand: ClientBrand) {
  const c = await blobToCanvas(logo.blob, 2000)
  useEditor.getState().addImage(c, c.width, c.height, layerNameFor(logo), { placement: 'corner', role: 'logo', brandLogoId: logo.id, clearSpace: brand.logoRules?.clearSpace.value ?? brand.clearSpace })
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
