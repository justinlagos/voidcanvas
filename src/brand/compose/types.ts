export type Units = number

export interface Rect {
  x: Units
  y: Units
  w: Units
  h: Units
}

export type RampStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900

export type Paint =
  | {
      role:
        | 'brand'
        | 'secondary'
        | 'accent'
        | 'surface-light'
        | 'surface-dark'
        | 'ink'
        | 'paper'
        | 'neutral'
      step?: RampStep
      alpha?: number
    }
  | { hex: string; alpha?: number }

export interface TextRole {
  family: 'heading' | 'body' | 'mono'
  size: number
  weight: number
  lineHeight: number
  tracking?: number
  italic?: boolean
}

export type LogoVersion = 'primary' | 'reversed' | 'mono-dark' | 'mono-brand' | 'grayscale' | 'auto'

export type Node =
  | {
      t: 'frame'
      id: string
      rect: Rect
      fill?: Paint
      stroke?: Paint
      strokeWidth?: number
      radius?: number
      clip?: boolean
      children: Node[]
    }
  | {
      t: 'text'
      id: string
      rect: Rect
      style: TextRole
      text: string
      bind?: string
      align: 'left' | 'center' | 'right'
      valign?: 'top' | 'middle' | 'bottom'
      case?: 'as-is' | 'upper' | 'sentence'
      color: Paint
      fit: 'wrap' | 'shrink'
      maxLines?: number
      source: 'detected' | 'suggested' | 'recommended' | 'designer'
    }
  | {
      t: 'logo'
      id: string
      rect: Rect
      version: LogoVersion
      on: Paint
      clearSpace: boolean
      demo?: 'misuse' | 'minsize' | 'clearspace'
    }
  | {
      t: 'swatch'
      id: string
      rect: Rect
      role: string
      paint: Paint
      specs: ('hex' | 'rgb' | 'cmyk' | 'oklch' | 'token')[]
    }
  | {
      t: 'image'
      id: string
      rect: Rect
      src: { photo: number } | { mockup: string } | 'placeholder'
      crop: 'cover' | 'subject' | 'contain'
    }
  | {
      t: 'device'
      id: string
      rect: Rect
      kind: string
      params: Record<string, number | string | boolean>
    }
  | {
      t: 'specimen'
      id: string
      rect: Rect
      family: 'heading' | 'body' | 'mono'
      mode: 'glyphs' | 'waterfall' | 'paragraph' | 'name'
    }
  | {
      t: 'table'
      id: string
      rect: Rect
      rows: string[][]
      style: 'spec' | 'quiet'
    }

export interface PageGenome {
  compositionId: string
  grid: string
  axis: 'left' | 'center' | 'right' | 'asymmetric' | 'diagonal'
  marginRatio: number
  typeTreatment: string
  colourBlocking: string
  devices: string[]
  density: number
  parameters: Record<string, number | string | boolean>
}

export interface Page {
  kind: string
  width: number
  height: number
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

export interface PaintResolver {
  colour(paint: Paint): string
  font(role: TextRole['family']): string
  drawLogo?: (
    node: Extract<Node, { t: 'logo' }>,
    ctx: CanvasRenderingContext2D,
  ) => void
  drawImage?: (
    node: Extract<Node, { t: 'image' }>,
    ctx: CanvasRenderingContext2D,
  ) => void
  drawDevice?: (
    node: Extract<Node, { t: 'device' }>,
    ctx: CanvasRenderingContext2D,
  ) => void
  drawSpecimen?: (
    node: Extract<Node, { t: 'specimen' }>,
    ctx: CanvasRenderingContext2D,
  ) => void
}

export interface LintFinding {
  id: string
  level: 'good' | 'check' | 'attention'
  nodeId?: string
  message: string
}
