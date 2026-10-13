// B04: editable mixed-media reference document builder (no canvas needed for
// shape/text/adjustment; raster entries carry asset refs, pixels stay in blobs).
// Used by unit tests (consecutive select/edit + undo shape) and browser e2e
// (real mask painting + export). IDs are stable across serialize/reopen.
import type { Doc, Group, Layer } from '../types'

export interface MixedDoc {
  doc: Doc
  layers: Layer[]
  groups: Group[]
}

export function buildMixedDoc(): MixedDoc {
  const doc: Doc = {
    id: 'unified-mixed-doc', name: 'Unified mixed-media reference', width: 1080, height: 1350,
    background: '#ffffff',
    frames: [{ id: 'board-main', name: 'Poster', x: 0, y: 0, width: 1080, height: 1350, background: '#ffffff' }],
  }
  const layers = [
    {
      id: 'vec-badge', name: 'Vector badge', type: 'shape', shape: 'ellipse', visible: true, locked: false,
      opacity: 1, blend: 'source-over', x: 80, y: 90, scaleX: 1, scaleY: 1, rotation: 0,
      mask: null, maskEnabled: true, rev: 1, frameId: 'board-main', role: 'logo',
      w: 320, h: 320, fill: '#111111', stroke: '#ffffff', strokeWidth: 6, radius: 0,
    },
    {
      id: 'img-photo', name: 'Photo', type: 'raster', visible: true, locked: false,
      opacity: 1, blend: 'source-over', x: 80, y: 460, scaleX: 1, scaleY: 1, rotation: 0,
      mask: null, maskEnabled: true, rev: 1, frameId: 'board-main', role: 'image', hasMask: true,
      canvas: null,
    },
    {
      id: 'txt-headline', name: 'Headline', type: 'text', text: 'Launch night', visible: true, locked: false,
      opacity: 1, blend: 'source-over', x: 80, y: 1080, scaleX: 1, scaleY: 1, rotation: 0,
      mask: null, maskEnabled: true, rev: 1, frameId: 'board-main', role: 'headline', briefKey: null,
      fontFamily: 'Space Grotesk', fontSize: 96, fontWeight: 700, italic: false, color: '#111111',
      align: 'left', lineHeight: 1, letterSpacing: 0,
    },
  ] as unknown as Layer[]
  return { doc, layers, groups: [] }
}

export function consecutiveEditOrder(): string[] {
  return ['vec-badge', 'img-photo', 'txt-headline']
}
