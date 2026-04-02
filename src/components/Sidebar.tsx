'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sliders, Layers } from 'lucide-react'
import { EffectSelector } from './EffectSelector'
import { ParamControls } from './ParamControls'
import { useStore } from '@/store/useStore'

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string
  icon: React.ElementType
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-void-800/60 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-void-900/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-void-400" />
          <span className="text-xs font-semibold text-void-300 uppercase tracking-wider">
            {title}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown size={14} className="text-void-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Sidebar() {
  const { activeEffect } = useStore()

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-80 border-l border-void-800/60 bg-void-950 overflow-y-auto flex flex-col"
    >
      <CollapsibleSection title="Effects" icon={Layers} defaultOpen={true}>
        <EffectSelector />
      </CollapsibleSection>

      <CollapsibleSection title="Parameters" icon={Sliders} defaultOpen={true}>
        <ParamControls />
      </CollapsibleSection>

      <div className="mt-auto p-4 border-t border-void-800/40">
        <div className="flex items-center justify-between text-[11px] text-void-600">
          <span>Active: {activeEffect === 'none' ? 'None' : activeEffect}</span>
          <span>Tip: Changes apply live</span>
        </div>
      </div>
    </motion.aside>
  )
}
