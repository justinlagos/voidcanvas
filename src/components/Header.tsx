'use client'

import { motion } from 'framer-motion'
import { Toolbar } from './Toolbar'
import { AppNav, Logo } from './AppNav'
import { HelpMenu } from './HelpMenu'
import { useStore } from '@/store/useStore'

export function Header() {
  const { originalImage, isProcessing } = useStore()

  return (
    <header className="flex items-center justify-between gap-3 px-3 sm:px-5 py-2 min-h-12 border-b border-void-800/60 bg-void-950/95 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <Logo />
        <AppNav />

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
        <HelpMenu />
      </div>
    </header>
  )
}
