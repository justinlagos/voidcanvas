import type { EffectType, EffectParams } from '@/store/useStore'

export type BlendMode =
  | 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference'
  | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity'

export const BLEND_MODES: { id: BlendMode; label: string }[] = [
  { id: 'source-over', label: 'Normal' },
  { id: 'multiply', label: 'Multiply' },
  { id: 'darken', label: 'Darken' },
  { id: 'color-burn', label: 'Color burn' },
  { id: 'screen', label: 'Screen' },
  { id: 'lighten', label: 'Lighten' },
  { id: 'color-dodge', label: 'Color dodge' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'soft-light', label: 'Soft light' },
  { id: 'hard-light', label: 'Hard light' },
  { id: 'difference', label: 'Difference' },
  { id: 'exclusion', label: 'Exclusion' },
  { id: 'hue', label: 'Hue' },
  { id: 'saturation', label: 'Saturation' },
  { id: 'color', label: 'Color' },
  { id: 'luminosity', label: 'Luminosity' },
]

interface LayerBase {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number // 0..1
  blend: BlendMode
  // Transform. x,y is the top-left of the unrotated box in document space.
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number // radians, around the box centre
  /** Alpha mask in layer-local pixels (document pixels for adjustment layers). Opaque = visible. */
  mask: HTMLCanvasElement | null
  maskEnabled: boolean
  /** Group this layer belongs to. Members of a group are always next to each other in the stack. */
  groupId?: string | null
  /** Bumped on every visual change. Drives caches and thumbnails. */
  rev: number
}

export interface RasterLayer extends LayerBase {
  type: 'raster'
  canvas: HTMLCanvasElement
  /** Set on imported photos so brushes paint on a fresh layer above instead of on the photo. */
  source?: 'photo'
}

export interface TextLayer extends LayerBase {
  type: 'text'
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  italic: boolean
  color: string
  align: 'left' | 'center' | 'right'
  lineHeight: number
  letterSpacing: number
  outline?: { color: string; width: number } | null
  shadow?: { color: string; blur: number; x: number; y: number } | null
}

export interface ShapeLayer extends LayerBase {
  type: 'shape'
  shape: 'rect' | 'ellipse' | 'line'
  w: number
  h: number
  fill: string | null
  stroke: string | null
  strokeWidth: number
  radius: number
}

export type AdjustmentKind =
  | 'brightnessContrast' | 'hueSaturation' | 'levels' | 'temperature'
  | 'blackWhite' | 'invert' | 'blur' | 'curves' | 'voidEffect'

export interface AdjustmentLayer extends LayerBase {
  type: 'adjustment'
  kind: AdjustmentKind
  /** Numeric settings for the built-in adjustments. */
  values: Record<string, number>
  /** Only for kind === 'curves': control points, 0..255 on both axes, sorted by x. */
  points?: [number, number][]
  /** Only for kind === 'voidEffect'. */
  effect?: EffectType
  effectParams?: EffectParams
}

export interface Group { id: string; name: string; visible: boolean; opacity: number; collapsed: boolean }

export type Layer = RasterLayer | TextLayer | ShapeLayer | AdjustmentLayer

export interface Doc {
  id: string
  name: string
  width: number
  height: number
  background: string | null // null = transparent
}

export type ToolId =
  | 'move' | 'brush' | 'eraser' | 'clone' | 'heal' | 'marquee' | 'ellipse'
  | 'lasso' | 'wand' | 'fill' | 'gradient' | 'text' | 'shape' | 'eyedropper'
  | 'crop' | 'hand' | 'zoom'

export interface ToolOptions {
  size: number
  hardness: number // 0..1
  opacity: number // 0..1
  tolerance: number // 0..255 for wand / fill
  contiguous: boolean
  shape: 'rect' | 'ellipse' | 'line'
  cropAspect: number | null
  feather: number
}

export interface View { zoom: number; panX: number; panY: number }

export interface Rect { x: number; y: number; w: number; h: number }
