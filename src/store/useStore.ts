import { create } from 'zustand'
import { track } from '@/lib/analytics'

export type EffectType =
  | 'none'
  // Artistic
  | 'halftone'
  | 'dither'
  | 'ascii'
  | 'mosaic'
  | 'oilPaint'
  | 'crosshatch'
  | 'stipple'
  | 'watercolor'
  | 'sketch'
  | 'popart'
  | 'pointillism'
  | 'woodcut'
  // Stylize
  | 'pixelate'
  | 'posterize'
  | 'edge'
  | 'emboss'
  | 'threshold'
  | 'solarize'
  | 'kaleidoscope'
  | 'mirror'
  | 'tiltShift'
  | 'crystallize'
  | 'lowpoly'
  // Color
  | 'duotone'
  | 'sepia'
  | 'invert'
  | 'channelMixer'
  | 'thermal'
  | 'nightVision'
  | 'infrared'
  | 'cyberpunk'
  | 'vintage'
  | 'gradientMap'
  | 'hueShift'
  | 'colorBalance'
  // Distortion
  | 'glitch'
  | 'rgbShift'
  | 'chromatic'
  | 'wave'
  | 'displacement'
  | 'crt'
  | 'swirl'
  | 'fisheye'
  | 'motionBlur'
  | 'radialBlur'
  | 'pixelSort'
  | 'sliceShift'
  // Enhance / Texture
  | 'blur'
  | 'sharpen'
  | 'vignette'
  | 'noise'
  | 'grain'
  | 'scanlines'
  | 'bloom'
  | 'freeze'
  | 'dotMatrix'
  | 'lensFlare'
  | 'filmBurn'

export type EffectCategory = 'all' | 'artistic' | 'distortion' | 'color' | 'stylize' | 'enhance'

export interface EffectParams {
  intensity: number
  scale: number
  color1: string
  color2: string
  color3: string
  threshold: number
  amount: number
  seed: number
  frequency: number
  amplitude: number
  angle: number
  opacity: number
  mixR: number
  mixG: number
  mixB: number
  radius: number
  density: number
  segments: number
  posX: number
  posY: number
}

interface Store {
  // Image state
  originalImage: string | null
  setOriginalImage: (image: string | null) => void

  // Effect state
  activeEffect: EffectType
  setActiveEffect: (effect: EffectType) => void

  // Parameters
  params: EffectParams
  setParam: <K extends keyof EffectParams>(key: K, value: EffectParams[K]) => void
  resetParams: () => void

  // History
  history: { effect: EffectType; params: EffectParams }[]
  pushHistory: () => void
  undo: () => void

  // UI state
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void
  showComparison: boolean
  setShowComparison: (show: boolean) => void
  comparisonPosition: number
  setComparisonPosition: (pos: number) => void
  zoom: number
  setZoom: (zoom: number) => void
  effectCategory: EffectCategory
  setEffectCategory: (cat: EffectCategory) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  sidebarCollapsed: Record<string, boolean>
  toggleSidebarSection: (section: string) => void
}

/** Per-effect starting values that show a change straight away. Only applied when the effect is picked. */
export const EFFECT_STARTERS: Partial<Record<EffectType, Partial<EffectParams>>> = {
  hueShift: { angle: 120 },
  channelMixer: { mixR: 130, mixG: 95, mixB: 70 },
}

export const defaultParams: EffectParams = {
  intensity: 50,
  scale: 50,
  color1: '#000000',
  color2: '#ffffff',
  color3: '#ff4444',
  threshold: 50,
  amount: 50,
  seed: Math.random() * 1000,
  frequency: 50,
  amplitude: 50,
  angle: 0,
  opacity: 100,
  mixR: 100,
  mixG: 100,
  mixB: 100,
  radius: 50,
  density: 50,
  segments: 6,
  posX: 50,
  posY: 50,
}

export const useStore = create<Store>((set, get) => ({
  originalImage: null,
  setOriginalImage: (image) => { if (image) track('effect.load', { tool: 'effects' }); set({ originalImage: image }) },

  activeEffect: 'none',
  setActiveEffect: (effect) => {
    get().pushHistory()
    if (effect !== 'none') track('effect.apply', { id: effect, tool: 'effects' })
    // Some effects do nothing at the shared defaults (hue 0, channels at 100%), so they start at a visible setting.
    const starter = EFFECT_STARTERS[effect]
    set(starter ? (s) => ({ activeEffect: effect, params: { ...s.params, ...starter } }) : { activeEffect: effect })
  },

  params: { ...defaultParams },
  setParam: (key, value) => set((state) => ({
    params: { ...state.params, [key]: value }
  })),
  resetParams: () => set({ params: { ...defaultParams, seed: Math.random() * 1000 } }),

  history: [],
  pushHistory: () => set((state) => ({
    history: [...state.history.slice(-29), { effect: state.activeEffect, params: { ...state.params } }]
  })),
  undo: () => {
    const { history } = get()
    if (history.length > 0) {
      const prev = history[history.length - 1]
      set({
        activeEffect: prev.effect,
        params: prev.params,
        history: history.slice(0, -1)
      })
    }
  },

  isProcessing: false,
  setIsProcessing: (processing) => set({ isProcessing: processing }),

  showComparison: false,
  setShowComparison: (show) => set({ showComparison: show }),
  comparisonPosition: 50,
  setComparisonPosition: (pos) => set({ comparisonPosition: pos }),

  zoom: 100,
  setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(400, zoom)) }),

  effectCategory: 'all',
  setEffectCategory: (cat) => set({ effectCategory: cat }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  sidebarCollapsed: {},
  toggleSidebarSection: (section) => set((state) => ({
    sidebarCollapsed: {
      ...state.sidebarCollapsed,
      [section]: !state.sidebarCollapsed[section]
    }
  })),
}))
