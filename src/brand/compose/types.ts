import type { RampStep } from '@/studio/brand/color'

export type Units = number

export interface Rect {
  x: Units
  y: Units
  w: Units
  h: Units
}

export type PaintRole =
  | 'brand'
  | 'secondary'
  | 'accent'
  | 'surface-light'
  | 'surface-dark'
  | 'ink'
  | 'paper'
  | 'neutral'

export type Paint =
  | { role: PaintRole; step?: RampStep }
  | { hex: string }

export type TextRole =
  | 'display'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'caption'
  | 'label'
  | 'mono'

export interface TextStyle {
  role: TextRole
  size: number
  weight?: number
  lineHeight?: number
  tracking?: number
  italic?: boolean
}

export interface PageGenome {
  compositionId: string
  grid: string
  axis: 'left' | 'center' | 'right' | 'asymmetric' | 'diagonal'
  margin: number
  typeTreatment: string
  colourBlocking: string
  devices: string[]
  density: number
  parameters?: Record<string, number | string | boolean>
}

interface BaseNode {
  id: string
  rect: Rect
  opacity?: number
}

export interface FrameNode extends BaseNode {
  t: 'frame'
  fill?: Paint
  stroke?: Paint
  strokeWidth?: number
  radius?: number
  clip?: boolean
  children: Node[]
}

export interface TextNode extends BaseNode {
  t: 'text'
  text: string
  bind?: string
  style: TextStyle
  align: 'left' | 'center' | 'right'
  valign?: 'top' | 'middle' | 'bottom'
  baseline?: 'top' | 'middle' | 'alphabetic'
  case?: 'as-is' | 'upper' | 'sentence'
  color: Paint
  fit: 'wrap' | 'shrink' | 'clip'
  maxLines?: number
  source: 'detected' | 'suggested' | 'recommended' | 'designer' | 'system'
}

export type VariantId = string

export interface LogoNode extends BaseNode {
  t: 'logo'
  version: VariantId | 'auto'
  on: Paint
  clearSpace: boolean
  demo?: 'misuse' | 'minsize' | 'clearspace'
  contain?: boolean
}

export interface SwatchNode extends BaseNode {
  t: 'swatch'
  role: string
  color: Paint
  specs: ('hex' | 'rgb' | 'cmyk' | 'oklch' | 'token')[]
  label?: string
}

export interface ImageNode extends BaseNode {
  t: 'image'
  src: { photo: number } | { id: string } | { mockup: string } | 'placeholder'
  crop: 'cover' | 'subject' | 'contain'
  radius?: number
}

export interface DeviceNode extends BaseNode {
  t: 'device'
  kind: string
  params: Record<string, number | string | boolean | null>
}

export interface SpecimenNode extends BaseNode {
  t: 'specimen'
  family: 'heading' | 'body' | 'mono'
  mode: 'glyphs' | 'waterfall' | 'paragraph' | 'name'
  text?: string
  color?: Paint
}

export interface TableNode extends BaseNode {
  t: 'table'
  rows: string[][]
  style: 'spec' | 'quiet'
  color?: Paint
}

export type Node =
  | FrameNode
  | TextNode
  | LogoNode
  | SwatchNode
  | ImageNode
  | DeviceNode
  | SpecimenNode
  | TableNode

export interface Page {
  kind: string
  size: { w: number; h: number }
  background: Paint
  nodes: Node[]
  genome: PageGenome
  notes?: string
}

export interface DocGenome {
  family: string
  parameters: Record<string, number | string | boolean>
  pages: PageGenome[]
}

export interface CompositionContext<Content = unknown, Brand = unknown> {
  content: Content
  brand: Brand
  direction: string
  random: () => number
}

export type Composition<Content = unknown, Brand = unknown> = (
  context: CompositionContext<Content, Brand>,
) => Page | null

export const rectContains = (outer: Rect, inner: Rect, tolerance = 0) =>
  inner.x >= outer.x - tolerance &&
  inner.y >= outer.y - tolerance &&
  inner.x + inner.w <= outer.x + outer.w + tolerance &&
  inner.y + inner.h <= outer.y + outer.h + tolerance

export const validRect = (rect: Rect) =>
  [rect.x, rect.y, rect.w, rect.h].every(Number.isFinite) &&
  rect.w >= 0 &&
  rect.h >= 0
