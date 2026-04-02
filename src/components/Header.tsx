'use client'

import { motion } from 'framer-motion'
import { Toolbar } from './Toolbar'
import { useStore } from '@/store/useStore'

export function Header() {
  const { originalImage, isProcessing } = useStore()

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-void-800/60 bg-void-950/95 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2.5"
        >
          <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
            <span className="text-void-950 font-bold text-sm tracking-tight">V</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">
            Void<span className="text-void-500">canvas</span>
          </h1>
        </motion.div>

        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-void-500 text-xs"
          >
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            Processing
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {originalImage && <Toolbar />}
      </div>
    </header>
  )
}
