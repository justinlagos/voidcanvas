export type GridKind = 'column' | 'modular' | 'manuscript' | 'hierarchical' | 'baseline'
export type Axis = 'left' | 'center' | 'asymmetric' | 'diagonal'
export type EyeMotion = 'z' | 'f' | 'center-out'

export interface DirectionFamily {
  id:
    | 'swiss-grid'
    | 'editorial'
    | 'poster'
    | 'quiet-luxury'
    | 'spec-sheet'
    | 'geometric'
    | 'soft'
    | 'archive'
    | 'raw'
    | 'kinetic'
    | 'warm-craft'
    | 'monochrome-studio'
  name: string
  character: string
  grids: readonly GridKind[]
  axes: readonly Axis[]
  margin: readonly [number, number]
  displayScale: readonly [number, number]
  colourFlood: readonly [number, number]
  density: readonly [number, number]
  radius: readonly [number, number]
  ruleUse: readonly [number, number]
  eyeMotion: readonly EyeMotion[]
  monochromeBias?: boolean
}

export const DIRECTION_FAMILIES: readonly DirectionFamily[] = [
  { id: 'swiss-grid', name: 'Swiss grid', character: 'Strict modular grid, flush left, large numerals and restrained colour.', grids: ['modular', 'column', 'baseline'], axes: ['left'], margin: [0.055, 0.09], displayScale: [1.15, 1.7], colourFlood: [0.05, 0.25], density: [0.55, 0.82], radius: [0, 3], ruleUse: [0.55, 0.9], eyeMotion: ['f', 'z'] },
  { id: 'editorial', name: 'Editorial', character: 'Magazine pacing, large display type, wide margins and image-led rhythm.', grids: ['column', 'manuscript', 'hierarchical'], axes: ['left', 'asymmetric'], margin: [0.07, 0.13], displayScale: [1.35, 2.1], colourFlood: [0.1, 0.4], density: [0.32, 0.68], radius: [0, 8], ruleUse: [0.2, 0.65], eyeMotion: ['f', 'z'] },
  { id: 'poster', name: 'Poster', character: 'Oversized type, cropped marks, strong colour fields and deliberate scale tension.', grids: ['hierarchical', 'column'], axes: ['left', 'asymmetric', 'diagonal'], margin: [0.035, 0.085], displayScale: [1.8, 3.4], colourFlood: [0.55, 0.95], density: [0.42, 0.78], radius: [0, 6], ruleUse: [0, 0.3], eyeMotion: ['z', 'center-out'] },
  { id: 'quiet-luxury', name: 'Quiet luxury', character: 'Wide space, small type, centred moments, hairlines and muted colour.', grids: ['manuscript', 'column'], axes: ['center', 'left'], margin: [0.1, 0.17], displayScale: [0.9, 1.45], colourFlood: [0, 0.18], density: [0.15, 0.42], radius: [0, 4], ruleUse: [0.35, 0.75], eyeMotion: ['center-out', 'f'] },
  { id: 'spec-sheet', name: 'Spec sheet', character: 'Measured, technical and explicit, with tables, dimensions and mono labels.', grids: ['modular', 'baseline', 'column'], axes: ['left'], margin: [0.045, 0.085], displayScale: [0.95, 1.5], colourFlood: [0.02, 0.22], density: [0.65, 0.92], radius: [0, 3], ruleUse: [0.72, 1], eyeMotion: ['f'] },
  { id: 'geometric', name: 'Geometric', character: 'Structure derived from the mark, including angles, modules and repeated proportions.', grids: ['modular', 'hierarchical'], axes: ['asymmetric', 'diagonal', 'left'], margin: [0.045, 0.1], displayScale: [1.2, 2], colourFlood: [0.25, 0.65], density: [0.42, 0.78], radius: [0, 16], ruleUse: [0.28, 0.7], eyeMotion: ['z', 'center-out'] },
  { id: 'soft', name: 'Soft', character: 'Rounded containers, gentle tints, friendly scale and low visual aggression.', grids: ['column', 'modular'], axes: ['left', 'center'], margin: [0.065, 0.12], displayScale: [1.05, 1.65], colourFlood: [0.18, 0.5], density: [0.28, 0.62], radius: [12, 32], ruleUse: [0.05, 0.3], eyeMotion: ['f', 'center-out'] },
  { id: 'archive', name: 'Archive', character: 'Catalogue pacing, specimen plates, paper tones, captions and visible indexing.', grids: ['manuscript', 'column', 'baseline'], axes: ['left', 'center'], margin: [0.07, 0.14], displayScale: [0.95, 1.55], colourFlood: [0.05, 0.28], density: [0.45, 0.75], radius: [0, 4], ruleUse: [0.45, 0.85], eyeMotion: ['f'] },
  { id: 'raw', name: 'Raw', character: 'Visible grid, hard borders, compact spacing and direct functional hierarchy.', grids: ['modular', 'baseline'], axes: ['left', 'asymmetric'], margin: [0.025, 0.065], displayScale: [1.1, 1.85], colourFlood: [0.18, 0.55], density: [0.72, 0.96], radius: [0, 0], ruleUse: [0.75, 1], eyeMotion: ['f', 'z'] },
  { id: 'kinetic', name: 'Kinetic', character: 'Diagonal splits, stacked type, movement and strong colour blocking.', grids: ['hierarchical', 'modular'], axes: ['diagonal', 'asymmetric'], margin: [0.035, 0.08], displayScale: [1.45, 2.6], colourFlood: [0.5, 0.92], density: [0.5, 0.84], radius: [0, 8], ruleUse: [0.15, 0.5], eyeMotion: ['z'] },
  { id: 'warm-craft', name: 'Warm craft', character: 'Humanist type, paper warmth, irregular balance and tactile restraint.', grids: ['manuscript', 'hierarchical'], axes: ['left', 'asymmetric'], margin: [0.075, 0.14], displayScale: [1.05, 1.75], colourFlood: [0.12, 0.42], density: [0.28, 0.62], radius: [3, 14], ruleUse: [0.12, 0.48], eyeMotion: ['f', 'z'] },
  { id: 'monochrome-studio', name: 'Monochrome studio', character: 'Black and white with one controlled signal colour and disciplined contrast.', grids: ['column', 'modular', 'manuscript'], axes: ['left', 'center', 'asymmetric'], margin: [0.06, 0.12], displayScale: [1.2, 2.1], colourFlood: [0.05, 0.28], density: [0.34, 0.7], radius: [0, 8], ruleUse: [0.3, 0.8], eyeMotion: ['f', 'center-out'], monochromeBias: true },
] as const

export function familyById(id: DirectionFamily['id']) {
  return DIRECTION_FAMILIES.find((family) => family.id === id)!
}

export function familyCompatibility(input: {
  family: DirectionFamily
  achromatic: boolean
  logoCharacter?: 'orthogonal' | 'diagonal' | 'curved' | 'mixed'
  aspect?: number
  personality?: string
}) {
  const { family, achromatic, logoCharacter = 'mixed', aspect = 1, personality = '' } = input
  let score = 0.5
  if (achromatic && family.monochromeBias) score += 0.32
  if (logoCharacter === 'diagonal' && ['geometric', 'kinetic', 'poster'].includes(family.id)) score += 0.2
  if (logoCharacter === 'orthogonal' && ['swiss-grid', 'spec-sheet', 'raw'].includes(family.id)) score += 0.18
  if (logoCharacter === 'curved' && ['soft', 'warm-craft', 'editorial'].includes(family.id)) score += 0.16
  if ((aspect > 2.5 || aspect < 0.5) && ['editorial', 'poster', 'geometric'].includes(family.id)) score += 0.1
  if (/technical|minimal/i.test(personality) && ['swiss-grid', 'spec-sheet', 'raw', 'monochrome-studio'].includes(family.id)) score += 0.08
  if (/warm|playful/i.test(personality) && ['soft', 'warm-craft', 'editorial'].includes(family.id)) score += 0.08
  return Math.max(0, Math.min(1, score))
}
