// Client comments in the Editor. The Comments panel reads the Studio job this design belongs to and puts
// the pins of one review version here; the canvas draws them. A pin tied to a layer is drawn on that layer
// (where it sits on the layer's box), so it follows the layer when the designer moves it.

import { create } from 'zustand'
import { layerBounds } from './engine'
import type { Doc, Layer } from './types'

export interface CanvasPin {
  id: string
  n: number
  done: boolean
  layerId?: string
  rel?: { x: number; y: number }
  /** The board the pin's image showed (null: the whole page), and where on that image (0 to 1). */
  frameId: string | null
  x: number
  y: number
}

export const useComments = create<{ pins: CanvasPin[]; shown: boolean; focus: string | null }>(() => ({ pins: [], shown: false, focus: null }))

/** Where a pin is on the design now, in design pixels. */
export function pinPoint(p: CanvasPin, doc: Doc, layers: Layer[]): { x: number; y: number } {
  const l = p.layerId && p.rel ? layers.find(x => x.id === p.layerId) : null
  if (l) { const b = layerBounds(l, doc); return { x: b.x + p.rel!.x * b.w, y: b.y + p.rel!.y * b.h } }
  const f = p.frameId ? doc.frames?.find(x => x.id === p.frameId) : null
  const fx = f?.x ?? 0, fy = f?.y ?? 0, fw = f?.width ?? doc.width, fh = f?.height ?? doc.height
  return { x: fx + p.x * fw, y: fy + p.y * fh }
}
