'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore, EffectType, EffectCategory } from '@/store/useStore'
import { Search } from 'lucide-react'

type EffectDef = { id: EffectType; name: string; icon: string; category: EffectCategory; description: string }

const effects: EffectDef[] = [
  { id: 'none', name: 'Original', icon: '○', category: 'all', description: 'No effect applied' },

  // ── Artistic ──
  { id: 'halftone', name: 'Halftone', icon: '●', category: 'artistic', description: 'Classic print dots' },
  { id: 'dither', name: 'Dither', icon: '▦', category: 'artistic', description: 'Floyd-Steinberg dithering' },
  { id: 'ascii', name: 'ASCII', icon: 'A', category: 'artistic', description: 'Text character rendering' },
  { id: 'mosaic', name: 'Mosaic', icon: '▩', category: 'artistic', description: 'Tile-based mosaic' },
  { id: 'oilPaint', name: 'Oil Paint', icon: '⬮', category: 'artistic', description: 'Oil painting effect' },
  { id: 'crosshatch', name: 'Crosshatch', icon: '╳', category: 'artistic', description: 'Ink crosshatch lines' },
  { id: 'stipple', name: 'Stipple', icon: '⁘', category: 'artistic', description: 'Dot-based shading' },
  { id: 'watercolor', name: 'Watercolor', icon: '◈', category: 'artistic', description: 'Soft watercolor paint' },
  { id: 'sketch', name: 'Pencil Sketch', icon: '✎', category: 'artistic', description: 'Pencil drawing look' },
  { id: 'popart', name: 'Pop Art', icon: '★', category: 'artistic', description: 'Bold Warhol-style colors' },
  { id: 'pointillism', name: 'Pointillism', icon: '⊙', category: 'artistic', description: 'Colored dot painting' },
  { id: 'woodcut', name: 'Woodcut', icon: '☰', category: 'artistic', description: 'Wood block print' },

  // ── Stylize ──
  { id: 'pixelate', name: 'Pixelate', icon: '▪', category: 'stylize', description: 'Retro pixel look' },
  { id: 'posterize', name: 'Posterize', icon: '◧', category: 'stylize', description: 'Reduced color levels' },
  { id: 'edge', name: 'Edge Detect', icon: '▢', category: 'stylize', description: 'Sobel edge detection' },
  { id: 'emboss', name: 'Emboss', icon: '◈', category: 'stylize', description: 'Raised surface look' },
  { id: 'threshold', name: 'Threshold', icon: '◩', category: 'stylize', description: 'Black & white cutoff' },
  { id: 'solarize', name: 'Solarize', icon: '☀', category: 'stylize', description: 'Partial tone inversion' },
  { id: 'kaleidoscope', name: 'Kaleidoscope', icon: '✦', category: 'stylize', description: 'Mirrored symmetry' },
  { id: 'mirror', name: 'Mirror', icon: '⬌', category: 'stylize', description: 'Axis reflection' },
  { id: 'tiltShift', name: 'Tilt Shift', icon: '⬍', category: 'stylize', description: 'Miniature blur effect' },
  { id: 'crystallize', name: 'Crystallize', icon: '◇', category: 'stylize', description: 'Voronoi crystal cells' },
  { id: 'lowpoly', name: 'Low Poly', icon: '△', category: 'stylize', description: 'Triangulated polygons' },

  // ── Color ──
  { id: 'duotone', name: 'Duotone', icon: '◑', category: 'color', description: 'Two-tone color map' },
  { id: 'sepia', name: 'Sepia', icon: '◐', category: 'color', description: 'Warm vintage tone' },
  { id: 'invert', name: 'Invert', icon: '◒', category: 'color', description: 'Negate all colors' },
  { id: 'channelMixer', name: 'Channel Mix', icon: '◎', category: 'color', description: 'RGB channel control' },
  { id: 'thermal', name: 'Thermal', icon: '◙', category: 'color', description: 'Heat map palette' },
  { id: 'nightVision', name: 'Night Vision', icon: '◉', category: 'color', description: 'Green phosphor NV' },
  { id: 'infrared', name: 'Infrared', icon: '◎', category: 'color', description: 'IR photography look' },
  { id: 'cyberpunk', name: 'Cyberpunk', icon: '⬡', category: 'color', description: 'Neon cyan & magenta' },
  { id: 'vintage', name: 'Vintage', icon: '◌', category: 'color', description: 'Faded retro film' },
  { id: 'gradientMap', name: 'Gradient Map', icon: '▤', category: 'color', description: 'Tri-color gradient' },
  { id: 'hueShift', name: 'Hue Shift', icon: '◑', category: 'color', description: 'Rotate color wheel' },
  { id: 'colorBalance', name: 'Color Balance', icon: '⬟', category: 'color', description: 'Shadow/highlight tint' },

  // ── Distortion ──
  { id: 'glitch', name: 'Glitch', icon: '⌇', category: 'distortion', description: 'Digital corruption' },
  { id: 'rgbShift', name: 'RGB Shift', icon: '◎', category: 'distortion', description: 'Channel offset' },
  { id: 'chromatic', name: 'Chromatic', icon: '◉', category: 'distortion', description: 'Lens aberration' },
  { id: 'wave', name: 'Wave', icon: '∿', category: 'distortion', description: 'Sine wave distortion' },
  { id: 'displacement', name: 'Displace', icon: '⟡', category: 'distortion', description: 'Organic displacement' },
  { id: 'crt', name: 'CRT', icon: '▣', category: 'distortion', description: 'Retro CRT monitor' },
  { id: 'swirl', name: 'Swirl', icon: '◎', category: 'distortion', description: 'Spiral twist effect' },
  { id: 'fisheye', name: 'Fisheye', icon: '◉', category: 'distortion', description: 'Barrel lens distortion' },
  { id: 'motionBlur', name: 'Motion Blur', icon: '▬', category: 'distortion', description: 'Directional blur' },
  { id: 'radialBlur', name: 'Radial Blur', icon: '◎', category: 'distortion', description: 'Zoom blur effect' },
  { id: 'pixelSort', name: 'Pixel Sort', icon: '▥', category: 'distortion', description: 'Glitch art sorting' },
  { id: 'sliceShift', name: 'Slice Shift', icon: '⊞', category: 'distortion', description: 'Random band offset' },

  // ── Enhance / Texture ──
  { id: 'blur', name: 'Blur', icon: '◌', category: 'enhance', description: 'Gaussian blur' },
  { id: 'sharpen', name: 'Sharpen', icon: '◆', category: 'enhance', description: 'Increase sharpness' },
  { id: 'vignette', name: 'Vignette', icon: '◉', category: 'enhance', description: 'Darkened edges' },
  { id: 'noise', name: 'Noise', icon: '░', category: 'enhance', description: 'Random noise' },
  { id: 'grain', name: 'Film Grain', icon: '▤', category: 'enhance', description: 'Analog film texture' },
  { id: 'scanlines', name: 'Scanlines', icon: '≡', category: 'enhance', description: 'Horizontal scan lines' },
  { id: 'bloom', name: 'Bloom', icon: '✧', category: 'enhance', description: 'Bright area glow' },
  { id: 'freeze', name: 'Freeze', icon: '❄', category: 'enhance', description: 'Icy blue tint' },
  { id: 'dotMatrix', name: 'Dot Matrix', icon: '⊡', category: 'enhance', description: 'LED dot grid' },
  { id: 'lensFlare', name: 'Lens Flare', icon: '✦', category: 'enhance', description: 'Light flare overlay' },
  { id: 'filmBurn', name: 'Film Burn', icon: '◐', category: 'enhance', description: 'Light leak & burn' },
]

const categories: { id: EffectCategory; label: string; count?: number }[] = [
  { id: 'all', label: 'All' },
  { id: 'artistic', label: 'Artistic' },
  { id: 'stylize', label: 'Stylize' },
  { id: 'color', label: 'Color' },
  { id: 'distortion', label: 'Distort' },
  { id: 'enhance', label: 'Enhance' },
]

export function EffectSelector() {
  const {
    activeEffect, setActiveEffect, originalImage,
    effectCategory, setEffectCategory,
    searchQuery, setSearchQuery,
  } = useStore()

  const filteredEffects = useMemo(() => {
    let filtered = effects
    if (effectCategory !== 'all') {
      filtered = filtered.filter(e => e.category === effectCategory || e.id === 'none')
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [effectCategory, searchQuery])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: effects.length - 1 }
    effects.forEach(e => { if (e.id !== 'none') counts[e.category] = (counts[e.category] || 0) + 1 })
    return counts
  }, [])

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-void-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search effects..."
          className="w-full pl-9 pr-3 py-2 bg-void-900 border border-void-800 rounded-lg
            text-sm text-void-200 placeholder:text-void-600
            focus:outline-none focus:border-void-600 transition-colors"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setEffectCategory(cat.id)}
            className={`
              flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150
              ${effectCategory === cat.id
                ? 'bg-white text-void-900'
                : 'bg-void-900 text-void-400 hover:bg-void-800 hover:text-void-300'
              }
            `}
          >
            {cat.label}
            <span className={`text-[9px] ${effectCategory === cat.id ? 'text-void-500' : 'text-void-600'}`}>
              {categoryCounts[cat.id] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Effects grid */}
      <div className="grid grid-cols-2 gap-1.5 max-h-[420px] overflow-y-auto pr-1">
        {filteredEffects.map((effect) => (
          <motion.button
            key={effect.id}
            onClick={() => setActiveEffect(effect.id)}
            disabled={!originalImage}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={`
              relative flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg text-left
              transition-all duration-150 group overflow-hidden
              ${activeEffect === effect.id
                ? 'bg-white text-void-900 shadow-lg shadow-white/5'
                : 'bg-void-900/80 hover:bg-void-800 text-void-200 border border-void-800/50 hover:border-void-700'
              }
              ${!originalImage ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center gap-2 w-full">
              <span className="text-base w-5 text-center shrink-0">{effect.icon}</span>
              <span className="text-sm font-medium truncate">{effect.name}</span>
            </div>
            <span className={`text-[10px] pl-7 leading-tight ${
              activeEffect === effect.id ? 'text-void-500' : 'text-void-600'
            }`}>
              {effect.description}
            </span>
          </motion.button>
        ))}
      </div>

      {filteredEffects.length === 0 && (
        <div className="text-center py-6 text-void-500 text-sm">
          No effects match your search
        </div>
      )}
    </div>
  )
}
