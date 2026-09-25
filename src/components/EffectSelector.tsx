'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore, EffectCategory } from '@/store/useStore'
import { Search } from 'lucide-react'

export { effects, EFFECT_COUNT, type EffectDef } from './effect-list'
import { effects } from './effect-list'

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
