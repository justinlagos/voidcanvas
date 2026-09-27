'use client'

import { Header } from '@/components/Header'
import { MobileActionBar } from '@/components/Toolbar'
import { Canvas } from '@/components/Canvas'
import { Sidebar } from '@/components/Sidebar'
import { Upload } from '@/components/Upload'
import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { effects } from '@/components/effect-list'

export default function EffectsPage() {
  const { originalImage } = useStore()

  // A Learn guide can open Effects on a particular effect: /effects?effect=duotone. The photo is still yours to drop in.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('effect')
    if (!id) return
    window.history.replaceState(null, '', '/effects')
    if (effects.some(e => e.id === id && id !== 'none')) useStore.getState().setActiveEffect(id as typeof effects[number]['id'])
  }, [])

  return (
    <main className="h-[100dvh] flex flex-col bg-void-950">
      <Header />

      {/* Phone and portrait tablet: canvas above, controls below. lg and up: side by side. */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {originalImage ? (
          <>
            <Canvas />
            <Sidebar />
          </>
        ) : (
          <Upload />
        )}
      </div>
      <MobileActionBar />
    </main>
  )
}
