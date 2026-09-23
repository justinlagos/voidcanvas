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
  /** Artboard this layer lives on, when the document uses frames. */
  frameId?: string | null
  /** When set, this layer is clipped to the layer directly below it (the clip base): it shows only where the base is opaque. */
  clipId?: string | null
  /** Bumped on every visual change. Drives caches and thumbnails. */
  rev: number
  /** Photoshop-style partial locks. `locked` stays the "lock all" switch. */
  lockAlpha?: boolean
  lockPixels?: boolean
  lockPosition?: boolean
  /** Fill opacity: fades the layer's own pixels but not its layer styles. 0..1, default 1. */
  fillOpacity?: number
  /** Non-destructive layer styles (drop shadow, stroke, glow...). */
  styles?: LayerStyles | null
  /** Linked layers move together. */
  linkId?: string | null
  /** Colour label shown in the Layers panel. */
  label?: string | null
}

// ─── Layer styles ──────────────────────────────────────────────────

export type StyleKind = 'dropShadow' | 'innerShadow' | 'outerGlow' | 'innerGlow' | 'stroke' | 'colorOverlay' | 'gradientOverlay' | 'bevel'

export interface StyleBase { on: boolean; opacity: number; blend: BlendMode }
export interface ShadowStyle extends StyleBase { color: string; angle: number; distance: number; size: number; spread: number }
export interface GlowStyle extends StyleBase { color: string; size: number; spread: number }
export interface StrokeStyle extends StyleBase { color: string; size: number; position: 'outside' | 'inside' | 'center' }
export interface ColorOverlayStyle extends StyleBase { color: string }
export interface GradientOverlayStyle extends StyleBase { from: string; to: string; angle: number; scale: number }
export interface BevelStyle extends StyleBase { size: number; depth: number; angle: number; highlight: string; shadow: string; soften: number }

export interface LayerStyles {
  /** Drawing order, bottom to top. Reorderable, unlike Photoshop. */
  order: StyleKind[]
  dropShadow?: ShadowStyle
  innerShadow?: ShadowStyle
  outerGlow?: GlowStyle
  innerGlow?: GlowStyle
  stroke?: StrokeStyle
  colorOverlay?: ColorOverlayStyle
  gradientOverlay?: GradientOverlayStyle
  bevel?: BevelStyle
}

// ─── Vector paths ──────────────────────────────────────────────────

/** A bezier node. in/out are absolute handle positions; equal to x,y means no handle. */
export interface PathNode { x: number; y: number; inX: number; inY: number; outX: number; outY: number; smooth?: boolean }
export interface SubPath { closed: boolean; nodes: PathNode[] }
export interface VectorPath { id: string; name: string; subpaths: SubPath[] }

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
  align: 'left' | 'center' | 'right' | 'justify'
  lineHeight: number
  letterSpacing: number
  /** Paragraph (area) text: wrap lines at this width in layer pixels. null = point text. */
  boxWidth?: number | null
  underline?: boolean
  strike?: boolean
  caps?: 'none' | 'all' | 'small'
  kerning?: boolean
  wordSpacing?: number
  /** Font stretch for variable/width families, as a percentage (50..200). */
  stretch?: number
  indent?: number
  spaceAfter?: number
  baselineShift?: number
  outline?: { color: string; width: number } | null
  shadow?: { color: string; blur: number; x: number; y: number } | null
}

export interface ShapeLayer extends LayerBase {
  type: 'shape'
  shape: 'rect' | 'ellipse' | 'line' | 'polygon' | 'path'
  w: number
  h: number
  /** polygon: number of points; star: inner radius ratio 0..1 (1 = plain polygon). */
  sides?: number
  star?: number
  /** path: nodes in layer-local pixels (0..w, 0..h). */
  subpaths?: SubPath[]
  fill: string | null
  stroke: string | null
  strokeWidth: number
  radius: number
}

export type AdjustmentKind =
  | 'brightnessContrast' | 'hueSaturation' | 'levels' | 'temperature'
  | 'blackWhite' | 'invert' | 'blur' | 'curves' | 'voidEffect'
  | 'vibrance' | 'exposure' | 'colorBalance' | 'channelMixer' | 'photoFilter' | 'gradientMap'
  | 'posterize' | 'threshold' | 'lut'

export interface AdjustmentLayer extends LayerBase {
  type: 'adjustment'
  kind: AdjustmentKind
  /** Numeric settings for the built-in adjustments. */
  values: Record<string, number>
  /** Only for kind === 'curves': control points, 0..255 on both axes, sorted by x. */
  points?: [number, number][]
  /** Curves per channel, applied after the RGB curve. */
  channelPoints?: { r?: [number, number][]; g?: [number, number][]; b?: [number, number][] }
  /** Levels per channel: [black, white, gamma*100]. */
  channelLevels?: { r?: [number, number, number]; g?: [number, number, number]; b?: [number, number, number] }
  /** Hue/saturation per colour band (targeted HSL). */
  bands?: Partial<Record<HueBand, { hue: number; saturation: number; lightness: number }>>
  /** Gradient map / photo filter colours. */
  colors?: string[]
  /** Parsed .cube LUT. */
  lut?: { size: number; data: number[]; name: string } | null
  /** Only for kind === 'voidEffect'. */
  effect?: EffectType
  effectParams?: EffectParams
}

export type HueBand = 'reds' | 'yellows' | 'greens' | 'cyans' | 'blues' | 'magentas'

export interface Group {
  id: string; name: string; visible: boolean; opacity: number; collapsed: boolean
  /** Parent group for nested groups. */
  parentId?: string | null
  /** 'pass' lets adjustments inside reach below the group (Photoshop's Pass Through). */
  blend?: BlendMode | 'pass'
  locked?: boolean
}

export type Layer = RasterLayer | TextLayer | ShapeLayer | AdjustmentLayer

export interface Frame {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  background: string | null
  /** When set, this board was cascaded from a master board and can be re-synced from it. */
  linkedFrom?: string | null
}

export interface Doc {
  id: string
  name: string
  width: number
  height: number
  background: string | null // null = transparent
  /** Optional artboards ("boards"). When present, layers each belong to a frame via layer.frameId. */
  frames?: Frame[]
  /** Ruler guides in document pixels. */
  guides?: { v: number[]; h: number[] }
  /** Saved vector paths (Paths panel). */
  paths?: VectorPath[]
  /** Saved selections (alpha channels in the Channels panel). */
  channels?: { id: string; name: string; mask: HTMLCanvasElement }[]
  /** Print resolution metadata. */
  dpi?: number
}

export type ToolId =
  | 'move' | 'brush' | 'eraser' | 'clone' | 'heal' | 'marquee' | 'ellipse'
  | 'lasso' | 'wand' | 'fill' | 'gradient' | 'text' | 'shape' | 'eyedropper'
  | 'crop' | 'hand' | 'zoom'
  | 'polylasso' | 'objectselect' | 'pen' | 'pathselect' | 'remove' | 'dodge' | 'burn' | 'sponge'

export interface ToolOptions {
  size: number
  hardness: number // 0..1
  opacity: number // 0..1
  tolerance: number // 0..255 for wand / fill
  contiguous: boolean
  shape: 'rect' | 'ellipse' | 'line' | 'polygon'
  cropAspect: number | null
  feather: number
  /** Brush flow (0..1) and stroke smoothing (0..1). */
  flow?: number
  smoothing?: number
  sides?: number
  star?: number
  /** Selection combine mode shown in the options bar. */
  selMode?: 'new' | 'add' | 'sub' | 'intersect'
  /** Dodge/burn range and exposure. */
  toneRange?: 'shadows' | 'midtones' | 'highlights'
  exposure?: number
  /** Sample all layers (wand, fill, heal). */
  sampleAll?: boolean
  pressureSize?: boolean
  pressureOpacity?: boolean
  /** Move tool: pick the layer under the pointer (or its group) on click. */
  autoSelect?: boolean
  autoSelectGroup?: boolean
  showTransform?: boolean
  showDistances?: boolean
  spongeMode?: 'saturate' | 'desaturate'
}

export interface View { zoom: number; panX: number; panY: number }

export interface Rect { x: number; y: number; w: number; h: number }
