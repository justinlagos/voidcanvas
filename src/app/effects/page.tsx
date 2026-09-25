'use client'

import { Header } from '@/components/Header'
import { MobileActionBar } from '@/components/Toolbar'
import { Canvas } from '@/components/Canvas'
import { Sidebar } from '@/components/Sidebar'
import { Upload } from '@/components/Upload'
import { useStore } from '@/store/useStore'

export default function EffectsPage() {
  const { originalImage } = useStore()

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
