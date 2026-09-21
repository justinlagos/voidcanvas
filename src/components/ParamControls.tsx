'use client'

import { useStore, EffectType } from '@/store/useStore'
import { RotateCcw } from 'lucide-react'

export type ParamConfig = {
  key: 'intensity' | 'scale' | 'threshold' | 'amount' | 'frequency' | 'amplitude'
    | 'color1' | 'color2' | 'color3' | 'seed' | 'angle' | 'opacity'
    | 'mixR' | 'mixG' | 'mixB' | 'radius' | 'density' | 'segments' | 'posX' | 'posY'
  label: string
  min?: number
  max?: number
  type?: 'range' | 'color'
  unit?: string
}

// Common opacity param reused everywhere
const opacityParam: ParamConfig = { key: 'opacity', label: 'Opacity', min: 0, max: 100, unit: '%' }

export const effectParams: Record<EffectType, ParamConfig[]> = {
  none: [],

  // ── Artistic ──
  halftone: [
    { key: 'scale', label: 'Dot Size', min: 10, max: 100 },
    { key: 'intensity', label: 'Contrast', min: 20, max: 100 },
    opacityParam,
  ],
  dither: [
    { key: 'threshold', label: 'Threshold', min: 0, max: 100 },
    opacityParam,
  ],
  ascii: [
    { key: 'scale', label: 'Cell Size', min: 10, max: 80 },
    opacityParam,
  ],
  mosaic: [
    { key: 'scale', label: 'Tile Size', min: 5, max: 100 },
    opacityParam,
  ],
  oilPaint: [
    { key: 'radius', label: 'Brush Size', min: 10, max: 100 },
    { key: 'intensity', label: 'Detail', min: 10, max: 100 },
    opacityParam,
  ],
  crosshatch: [
    { key: 'scale', label: 'Line Spacing', min: 10, max: 100 },
    opacityParam,
  ],
  stipple: [
    { key: 'density', label: 'Dot Density', min: 10, max: 100 },
    { key: 'scale', label: 'Cell Size', min: 10, max: 100 },
    { key: 'seed', label: 'Randomize', min: 0, max: 1000 },
    opacityParam,
  ],
  watercolor: [
    { key: 'radius', label: 'Softness', min: 10, max: 100 },
    { key: 'intensity', label: 'Detail Levels', min: 10, max: 100 },
    opacityParam,
  ],
  sketch: [
    { key: 'intensity', label: 'Line Strength', min: 10, max: 100 },
    opacityParam,
  ],
  popart: [
    { key: 'intensity', label: 'Color Levels', min: 10, max: 100 },
    { key: 'amount', label: 'Color Blend', min: 0, max: 100, unit: '%' },
    opacityParam,
  ],
  pointillism: [
    { key: 'scale', label: 'Dot Size', min: 10, max: 100 },
    { key: 'seed', label: 'Randomize', min: 0, max: 1000 },
    opacityParam,
  ],
  woodcut: [
    { key: 'threshold', label: 'Threshold', min: 0, max: 100 },
    { key: 'scale', label: 'Line Spacing', min: 10, max: 100 },
    opacityParam,
  ],

  // ── Stylize ──
  pixelate: [
    { key: 'scale', label: 'Pixel Size', min: 5, max: 100 },
    opacityParam,
  ],
  posterize: [
    { key: 'intensity', label: 'Levels', min: 10, max: 100 },
    opacityParam,
  ],
  edge: [
    { key: 'threshold', label: 'Threshold', min: 0, max: 200 },
    opacityParam,
  ],
  emboss: [
    { key: 'intensity', label: 'Depth', min: 10, max: 100 },
    { key: 'angle', label: 'Light Angle', min: 0, max: 360, unit: '°' },
    opacityParam,
  ],
  threshold: [
    { key: 'threshold', label: 'Threshold', min: 0, max: 100 },
    opacityParam,
  ],
  solarize: [
    { key: 'threshold', label: 'Threshold', min: 0, max: 100 },
    opacityParam,
  ],
  kaleidoscope: [
    { key: 'segments', label: 'Segments', min: 2, max: 24 },
    opacityParam,
  ],
  mirror: [
    { key: 'angle', label: 'Mode', min: 0, max: 360, unit: '°' },
    opacityParam,
  ],
  tiltShift: [
    { key: 'intensity', label: 'Blur Strength', min: 10, max: 100 },
    { key: 'scale', label: 'Focus Band', min: 10, max: 100 },
    { key: 'posY', label: 'Center Y', min: 0, max: 100, unit: '%' },
    opacityParam,
  ],
  crystallize: [
    { key: 'scale', label: 'Crystal Size', min: 10, max: 100 },
    { key: 'seed', label: 'Randomize', min: 0, max: 1000 },
    opacityParam,
  ],
  lowpoly: [
    { key: 'scale', label: 'Triangle Size', min: 10, max: 100 },
    opacityParam,
  ],

  // ── Color ──
  duotone: [
    { key: 'color1', label: 'Shadow Color', type: 'color' },
    { key: 'color2', label: 'Highlight Color', type: 'color' },
    opacityParam,
  ],
  sepia: [
    { key: 'intensity', label: 'Intensity', min: 0, max: 100 },
    opacityParam,
  ],
  invert: [
    opacityParam,
  ],
  channelMixer: [
    { key: 'mixR', label: 'Red', min: 0, max: 200 },
    { key: 'mixG', label: 'Green', min: 0, max: 200 },
    { key: 'mixB', label: 'Blue', min: 0, max: 200 },
    opacityParam,
  ],
  thermal: [
    opacityParam,
  ],
  nightVision: [
    { key: 'seed', label: 'Noise Pattern', min: 0, max: 1000 },
    opacityParam,
  ],
  infrared: [
    opacityParam,
  ],
  cyberpunk: [
    { key: 'intensity', label: 'Intensity', min: 10, max: 100 },
    opacityParam,
  ],
  vintage: [
    { key: 'intensity', label: 'Intensity', min: 10, max: 100 },
    opacityParam,
  ],
  gradientMap: [
    { key: 'color1', label: 'Shadows', type: 'color' },
    { key: 'color2', label: 'Midtones', type: 'color' },
    { key: 'color3', label: 'Highlights', type: 'color' },
    opacityParam,
  ],
  hueShift: [
    { key: 'angle', label: 'Hue Rotation', min: 0, max: 360, unit: '°' },
    opacityParam,
  ],
  colorBalance: [
    { key: 'color1', label: 'Shadow Tint', type: 'color' },
    { key: 'color2', label: 'Highlight Tint', type: 'color' },
    { key: 'intensity', label: 'Intensity', min: 0, max: 100 },
    opacityParam,
  ],

  // ── Distortion ──
  glitch: [
    { key: 'intensity', label: 'Offset', min: 10, max: 100 },
    { key: 'scale', label: 'Slice Height', min: 5, max: 100 },
    { key: 'seed', label: 'Randomize', min: 0, max: 1000 },
    opacityParam,
  ],
  rgbShift: [
    { key: 'intensity', label: 'Shift Amount', min: 5, max: 100 },
    { key: 'angle', label: 'Direction', min: 0, max: 360, unit: '°' },
    opacityParam,
  ],
  chromatic: [
    { key: 'intensity', label: 'Spread', min: 5, max: 100 },
    { key: 'angle', label: 'Angle', min: 0, max: 360, unit: '°' },
    opacityParam,
  ],
  wave: [
    { key: 'frequency', label: 'Frequency', min: 10, max: 100 },
    { key: 'amplitude', label: 'Amplitude', min: 10, max: 100 },
    { key: 'angle', label: 'Direction', min: 0, max: 360, unit: '°' },
    opacityParam,
  ],
  displacement: [
    { key: 'intensity', label: 'Strength', min: 5, max: 100 },
    { key: 'frequency', label: 'Frequency', min: 10, max: 100 },
    { key: 'seed', label: 'Pattern', min: 0, max: 1000 },
    opacityParam,
  ],
  crt: [
    { key: 'intensity', label: 'Barrel Distortion', min: 0, max: 100 },
    { key: 'scale', label: 'Scanline Gap', min: 10, max: 100 },
    opacityParam,
  ],
  swirl: [
    { key: 'intensity', label: 'Twist Amount', min: 0, max: 100 },
    opacityParam,
  ],
  fisheye: [
    { key: 'intensity', label: 'Distortion', min: 10, max: 100 },
    opacityParam,
  ],
  motionBlur: [
    { key: 'intensity', label: 'Length', min: 5, max: 100 },
    { key: 'angle', label: 'Direction', min: 0, max: 360, unit: '°' },
    opacityParam,
  ],
  radialBlur: [
    { key: 'intensity', label: 'Strength', min: 10, max: 100 },
    { key: 'posX', label: 'Center X', min: 0, max: 100, unit: '%' },
    { key: 'posY', label: 'Center Y', min: 0, max: 100, unit: '%' },
    opacityParam,
  ],
  pixelSort: [
    { key: 'threshold', label: 'Brightness Threshold', min: 0, max: 100 },
    { key: 'seed', label: 'Randomize', min: 0, max: 1000 },
    opacityParam,
  ],
  sliceShift: [
    { key: 'intensity', label: 'Shift Amount', min: 10, max: 100 },
    { key: 'density', label: 'Slice Count', min: 5, max: 100 },
    { key: 'angle', label: 'Direction', min: 0, max: 360, unit: '°' },
    { key: 'seed', label: 'Randomize', min: 0, max: 1000 },
    opacityParam,
  ],

  // ── Enhance / Texture ──
  blur: [
    { key: 'intensity', label: 'Radius', min: 10, max: 100 },
    opacityParam,
  ],
  sharpen: [
    { key: 'intensity', label: 'Amount', min: 10, max: 100 },
    opacityParam,
  ],
  vignette: [
    { key: 'intensity', label: 'Strength', min: 10, max: 100 },
    { key: 'scale', label: 'Radius', min: 10, max: 100 },
    opacityParam,
  ],
  noise: [
    { key: 'amount', label: 'Amount', min: 0, max: 100 },
    { key: 'seed', label: 'Randomize', min: 0, max: 1000 },
    opacityParam,
  ],
  grain: [
    { key: 'amount', label: 'Amount', min: 0, max: 100 },
    { key: 'scale', label: 'Grain Size', min: 10, max: 100 },
    { key: 'seed', label: 'Randomize', min: 0, max: 1000 },
    opacityParam,
  ],
  scanlines: [
    { key: 'scale', label: 'Line Spacing', min: 10, max: 100 },
    { key: 'intensity', label: 'Darkness', min: 10, max: 100 },
    { key: 'density', label: 'Thickness', min: 10, max: 100 },
    opacityParam,
  ],
  bloom: [
    { key: 'threshold', label: 'Brightness Cutoff', min: 0, max: 100 },
    { key: 'radius', label: 'Glow Size', min: 10, max: 100 },
    { key: 'intensity', label: 'Glow Strength', min: 10, max: 100 },
    opacityParam,
  ],
  freeze: [
    { key: 'intensity', label: 'Intensity', min: 10, max: 100 },
    opacityParam,
  ],
  dotMatrix: [
    { key: 'scale', label: 'Dot Size', min: 10, max: 100 },
    opacityParam,
  ],
  lensFlare: [
    { key: 'intensity', label: 'Brightness', min: 10, max: 100 },
    { key: 'radius', label: 'Flare Size', min: 10, max: 100 },
    { key: 'posX', label: 'Position X', min: 0, max: 100, unit: '%' },
    { key: 'posY', label: 'Position Y', min: 0, max: 100, unit: '%' },
    { key: 'color1', label: 'Flare Color', type: 'color' },
    opacityParam,
  ],
  filmBurn: [
    { key: 'intensity', label: 'Burn Intensity', min: 10, max: 100 },
    { key: 'seed', label: 'Pattern', min: 0, max: 1000 },
    opacityParam,
  ],
}

export function ParamControls() {
  const { activeEffect, params, setParam, resetParams, originalImage } = useStore()
  const config = effectParams[activeEffect]

  if (!originalImage || config.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-void-400 uppercase tracking-wider px-1">
          Parameters
        </h3>
        <div className="bg-void-900/60 border border-void-800/50 rounded-lg p-4 text-center text-void-500 text-sm">
          {!originalImage
            ? 'Upload an image first'
            : 'No parameters for this effect'
          }
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-medium text-void-400 uppercase tracking-wider">
          Parameters
          <span className="text-void-600 ml-1.5 normal-case font-normal">
            ({config.length})
          </span>
        </h3>
        <button
          onClick={resetParams}
          className="flex items-center gap-1 text-xs text-void-500 hover:text-white transition-colors"
        >
          <RotateCcw size={10} />
          Reset
        </button>
      </div>
      <div className="space-y-4 bg-void-900/60 border border-void-800/50 rounded-lg p-4">
        {config.map((param) => (
          <div key={param.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-void-300">{param.label}</label>
              {param.type !== 'color' && (
                <span className="text-xs text-void-500 font-mono tabular-nums">
                  {Math.round(params[param.key] as number)}{param.unit || ''}
                </span>
              )}
            </div>
            {param.type === 'color' ? (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={params[param.key] as string}
                  onChange={(e) => setParam(param.key, e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-void-800 border border-void-700 shrink-0"
                />
                <span className="text-xs font-mono text-void-500 uppercase">
                  {params[param.key] as string}
                </span>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="range"
                  min={param.min ?? 0}
                  max={param.max ?? 100}
                  value={params[param.key] as number}
                  onChange={(e) => setParam(param.key, parseFloat(e.target.value))}
                  className="w-full"
                />
                <div
                  className="absolute top-[9px] left-0 h-[4px] bg-white/20 rounded-full pointer-events-none"
                  style={{
                    width: `${((params[param.key] as number) - (param.min ?? 0)) / ((param.max ?? 100) - (param.min ?? 0)) * 100}%`
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
