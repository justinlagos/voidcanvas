// Starting points for effects. A designer knows the look before the numbers: "print halftone",
// "a little grain". Named presets cover the effects people reach for most; every other effect
// gets Subtle, Balanced and Strong from its own parameter ranges.

import type { EffectParams, EffectType } from '@/store/useStore'
import { effectParams, type ParamConfig } from './ParamControls'

export interface EffectPreset { label: string; values: Partial<EffectParams> }

const NAMED: Partial<Record<EffectType, EffectPreset[]>> = {
  halftone: [
    { label: 'Print', values: { scale: 18, intensity: 75 } },
    { label: 'Editorial', values: { scale: 36, intensity: 55 } },
    { label: 'Poster', values: { scale: 70, intensity: 90 } },
    { label: 'Subtle', values: { scale: 14, intensity: 35, opacity: 60 } },
  ],
  dither: [
    { label: 'Newsprint', values: { threshold: 50 } },
    { label: 'Light', values: { threshold: 30, opacity: 70 } },
    { label: 'Heavy', values: { threshold: 70 } },
  ],
  grain: [
    { label: 'Film', values: { intensity: 22 } },
    { label: 'Subtle', values: { intensity: 10 } },
    { label: 'Heavy', values: { intensity: 55 } },
  ],
  noise: [
    { label: 'Subtle', values: { intensity: 12 } },
    { label: 'Texture', values: { intensity: 30 } },
    { label: 'Heavy', values: { intensity: 60 } },
  ],
  vignette: [
    { label: 'Soft', values: { intensity: 30, radius: 70 } },
    { label: 'Classic', values: { intensity: 55, radius: 55 } },
    { label: 'Heavy', values: { intensity: 85, radius: 40 } },
  ],
  duotone: [
    { label: 'Ink and paper', values: { color1: '#111318', color2: '#f3efe6' } },
    { label: 'Night', values: { color1: '#0b1a3a', color2: '#ffd166' } },
    { label: 'Heat', values: { color1: '#3a0a2a', color2: '#ff7a00' } },
  ],
  glitch: [
    { label: 'Subtle', values: { intensity: 18, amount: 20 } },
    { label: 'Broadcast', values: { intensity: 45, amount: 50 } },
    { label: 'Heavy', values: { intensity: 85, amount: 80 } },
  ],
  pixelate: [
    { label: 'Fine', values: { scale: 12 } },
    { label: 'Retro', values: { scale: 35 } },
    { label: 'Blocks', values: { scale: 70 } },
  ],
  blur: [
    { label: 'Soft focus', values: { radius: 15 } },
    { label: 'Background', values: { radius: 45 } },
    { label: 'Heavy', values: { radius: 85 } },
  ],
  sharpen: [
    { label: 'Subtle', values: { intensity: 25 } },
    { label: 'Print', values: { intensity: 50 } },
    { label: 'Crisp', values: { intensity: 80 } },
  ],
}

const SKIP: ParamConfig['key'][] = ['opacity', 'seed', 'color1', 'color2', 'color3', 'angle', 'posX', 'posY', 'segments', 'mixR', 'mixG', 'mixB']

/** Presets for an effect: named where they exist, otherwise three points along its own ranges. */
export function presetsFor(effect: EffectType): EffectPreset[] {
  const named = NAMED[effect]
  if (named) return named
  const cfg = effectParams[effect].filter(p => p.type !== 'color' && !SKIP.includes(p.key))
  if (!cfg.length) return []
  const at = (t: number) => Object.fromEntries(cfg.map(p => [p.key, Math.round((p.min ?? 0) + ((p.max ?? 100) - (p.min ?? 0)) * t)])) as Partial<EffectParams>
  return [{ label: 'Subtle', values: at(0.25) }, { label: 'Balanced', values: at(0.5) }, { label: 'Strong', values: at(0.8) }]
}

/** Which preset the current values match, if any. */
export function matchPreset(effect: EffectType, params: EffectParams): string | null {
  for (const p of presetsFor(effect)) if (Object.entries(p.values).every(([k, v]) => (params as any)[k] === v)) return p.label
  return null
}
