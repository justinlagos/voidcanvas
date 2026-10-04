'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useJobs } from '@/studio/jobs'
import { useEditor } from '@/editor/store'
import { getBrand, saveBrand } from '@/editor/io'
import { applyBrand } from '@/editor/components/Dialogs'
export function EditorBrandSwitcher() {
  const { brands, load } = useJobs(),
    id = useEditor((s) => s.doc?.brandId)
  const [error, setError] = useState('')
  useEffect(() => {
    load().catch(() => {})
  }, [load])
  const change = async (next: string) => {
    try {
      const b = brands.find((x) => x.id === next)
      if (b) {
        const kit = await getBrand()
        const updated = {
          ...kit,
          colors: b.colors.map((c) => c.hex),
          fonts: [b.display, b.body],
          logos: b.logos.map((l) => ({ id: l.id, name: l.name, blob: l.blob })),
        }
        await saveBrand(updated)
        applyBrand(updated)
      }
      useEditor.getState().setDoc({ brandId: next || null })
      setError('')
    } catch {
      setError('Could not switch brands. Try again.')
    }
  }
  return (
    <div className="space-y-2 mb-4">
      <label className="block text-xs text-void-400">
        Brand for this design
        <select
          aria-label="Brand for this design"
          className="block w-full mt-2 bg-void-900 border border-void-700 rounded-lg p-2 text-void-100"
          value={id ?? ''}
          onChange={(e) => change(e.target.value)}
        >
          <option value="">No brand attached</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <Link
        className="inline-block text-xs underline text-void-300"
        href="/brand"
      >
        Create or manage brands
      </Link>
      {error && (
        <p role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  )
}
