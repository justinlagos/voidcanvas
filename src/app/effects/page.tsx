'use client'

import { Header } from '@/components/Header'
import { Canvas } from '@/components/Canvas'
import { Sidebar } from '@/components/Sidebar'
import { Upload } from '@/components/Upload'
import { useStore } from '@/store/useStore'

export default function EffectsPage() {
  const { originalImage } = useStore()

  return (
    <main className="h-screen flex flex-col bg-void-950">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {originalImage ? (
          <>
            <Canvas />
            <Sidebar />
          </>
        ) : (
          <Upload />
        )}
      </div>
    </main>
  )
}
