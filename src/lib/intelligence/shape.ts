import { artworkBounds, profilePixels, shrink, type AssetProfile } from './asset'

export type ShapeCharacter = 'orthogonal' | 'diagonal' | 'curved' | 'mixed'
export type SymmetryAxis = 'vertical' | 'horizontal' | 'both' | 'none'

export interface ShapeProfile {
  dominantAngles: number[]
  character: ShapeCharacter
  orthogonalShare: number
  diagonalShare: number
  curvedShare: number
  roundness: number
  weight: number
  aspect: number
  negativeSpace: number
  symmetry: { vertical: number; horizontal: number; axis: SymmetryAxis }
  distinctiveCounterspace: boolean
}

export interface GraphicLanguage {
  supergraphic: boolean
  pattern: 'mark-grid' | 'angle-field' | 'none'
  cornerRadius: number
  ruleWeight: number
  angle: number
  frameAspect: number
  negativeSpace: number
  source: {
    angle: string
    radius: string
    ruleWeight: string
    frameAspect: string
  }
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))
const angleDelta = (a: number, b: number) => {
  const d = Math.abs(a - b) % 180
  return Math.min(d, 180 - d)
}

function alphaMask(src: Uint8ClampedArray, srcW: number, srcH: number) {
  const shrunk = shrink(src, srcW, srcH, 220)
  const data = shrunk.data === src ? new Uint8ClampedArray(src) : shrunk.data
  const bounds = artworkBounds(data, shrunk.w, shrunk.h)
  const mask = new Uint8Array(shrunk.w * shrunk.h)
  for (let i = 0; i < shrunk.w * shrunk.h; i++) mask[i] = data[i * 4 + 3] > 128 ? 1 : 0
  return { mask, w: shrunk.w, h: shrunk.h, bounds }
}

function edgeAngles(mask: Uint8Array, w: number, h: number) {
  const bins = new Float64Array(12)
  let edges = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      if (!mask[i]) continue
      const tl = mask[i - w - 1], top = mask[i - w], tr = mask[i - w + 1]
      const left = mask[i - 1], right = mask[i + 1]
      const bl = mask[i + w - 1], bottom = mask[i + w], br = mask[i + w + 1]
      const gx = (tr + 2 * right + br) - (tl + 2 * left + bl)
      const gy = (bl + 2 * bottom + br) - (tl + 2 * top + tr)
      if (gx === 0 && gy === 0) continue
      let tangent = (Math.atan2(gy, gx) * 180) / Math.PI + 90
      tangent = ((tangent % 180) + 180) % 180
      bins[Math.min(11, Math.floor(tangent / 15))]++
      edges++
    }
  }
  return { bins, edges }
}

function symmetryScore(mask: Uint8Array, w: number, h: number, bounds: { x: number; y: number; w: number; h: number }, vertical: boolean) {
  let agree = 0, total = 0
  for (let y = bounds.y; y < bounds.y + bounds.h; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.w; x++) {
      const mirrorX = bounds.x + bounds.w - 1 - (x - bounds.x)
      const mirrorY = bounds.y + bounds.h - 1 - (y - bounds.y)
      const j = vertical ? y * w + mirrorX : mirrorY * w + x
      const i = y * w + x
      if (j < 0 || j >= w * h) continue
      total++
      if (mask[i] === mask[j]) agree++
    }
  }
  return total ? agree / total : 0
}

export function measureShape(src: Uint8ClampedArray, srcW: number, srcH: number, supplied?: AssetProfile): ShapeProfile {
  const asset = supplied ?? profilePixels(src, srcW, srcH)
  const { mask, w, h, bounds } = alphaMask(src, srcW, srcH)
  const { bins, edges } = edgeAngles(mask, w, h)
  const total = Math.max(1, edges)

  const scored = Array.from(bins, (value, index) => ({ angle: index * 15 + 7.5, value: value / total }))
    .sort((a, b) => b.value - a.value)
  const dominantAngles = scored.slice(0, 3).filter((x) => x.value >= 0.05).map((x) => Math.round(x.angle))

  let orthogonalShare = 0, diagonalShare = 0
  for (const b of scored) {
    const nearestOrthogonal = Math.min(angleDelta(b.angle, 0), angleDelta(b.angle, 90))
    const nearestDiagonal = Math.min(angleDelta(b.angle, 45), angleDelta(b.angle, 135))
    if (nearestOrthogonal <= 15) orthogonalShare += b.value
    if (nearestDiagonal <= 15) diagonalShare += b.value
  }
  orthogonalShare = clamp(orthogonalShare)
  diagonalShare = clamp(diagonalShare)

  // Curved marks distribute their edge orientations across many bins instead of concentrating
  // them around one or two straight directions. Sobel gradients keep diagonal circle segments visible.
  const concentration = scored.slice(0, 2).reduce((n, b) => n + b.value, 0)
  const occupiedBins = scored.filter((b) => b.value >= 0.025).length
  const orientationSpread = clamp((occupiedBins - 3) / 8)
  const curvedShare = clamp((1 - concentration) * 0.55 + orientationSpread * 0.65)
  const roundness = clamp(curvedShare * 0.7 + (1 - Math.min(1, asset.minStroke * 8)) * 0.08)

  const vertical = symmetryScore(mask, w, h, bounds, true)
  const horizontal = symmetryScore(mask, w, h, bounds, false)
  const v = vertical >= 0.93, hz = horizontal >= 0.93
  const axis: SymmetryAxis = v && hz ? 'both' : v ? 'vertical' : hz ? 'horizontal' : 'none'

  const character: ShapeCharacter =
    curvedShare >= 0.42 && curvedShare > orthogonalShare
      ? 'curved'
      : diagonalShare >= 0.36 && diagonalShare > orthogonalShare * 0.8
        ? 'diagonal'
        : orthogonalShare >= 0.48
          ? 'orthogonal'
          : 'mixed'

  return {
    dominantAngles,
    character,
    orthogonalShare,
    diagonalShare,
    curvedShare,
    roundness,
    weight: clamp(asset.minStroke * 10),
    aspect: asset.aspect,
    negativeSpace: clamp(1 - asset.coverage),
    symmetry: { vertical, horizontal, axis },
    distinctiveCounterspace: asset.coverage < 0.72 && asset.coverage > 0.15 && asset.components <= 4,
  }
}

export function deriveGraphicLanguage(shape: ShapeProfile, asset: AssetProfile): GraphicLanguage {
  const angle = shape.dominantAngles[0] ?? 0
  const distinctive = shape.distinctiveCounterspace || asset.components <= 3 || Math.abs(Math.log(Math.max(0.01, shape.aspect))) > 0.5
  const pattern = shape.character === 'diagonal' ? 'angle-field' : distinctive ? 'mark-grid' : 'none'
  return {
    supergraphic: distinctive && asset.coverage >= 0.12,
    pattern,
    cornerRadius: Math.round(clamp(shape.roundness) * 28),
    ruleWeight: Math.max(1, Math.round(1 + shape.weight * 5)),
    angle,
    frameAspect: Math.max(0.55, Math.min(2.2, shape.aspect)),
    negativeSpace: shape.negativeSpace,
    source: {
      angle: `Angle ${angle}°, Detected from the mark`,
      radius: `Roundness ${Math.round(shape.roundness * 100)}%, Detected from the mark`,
      ruleWeight: `Stroke weight ${Math.round(shape.weight * 100)}%, Detected from the mark`,
      frameAspect: `Proportion ${shape.aspect.toFixed(2)}:1, Detected from the mark`,
    },
  }
}
