'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppNav, Logo } from '@/components/AppNav'
import { HelpMenu } from '@/components/HelpMenu'
import { useJobs } from '@/studio/jobs'
import { BrandsView } from '@/studio/brands/BrandsView'
import { BrandGuideline } from '@/studio/BrandGuideline'
import { Btn } from '@/studio/ui'
import { createWithBrand } from './client'
export function BrandWorkspace() {
  const { brands, load } = useJobs()
  const [view, setView] = useState<'home' | 'edit' | 'guideline'>('home'),
    [id, setId] = useState<string | undefined>(),
    [error, setError] = useState('')
  useEffect(() => {
    load()
    const q = new URLSearchParams(location.search)
    if (q.get('view') === 'guideline') {
      setView('guideline')
      setId(q.get('id') ?? undefined)
    } else if (q.get('id')) {
      setId(q.get('id')!)
      setView('edit')
    }
  }, [load])
  useEffect(() => {
    let stop = () => {}
    import('@/lib/team-sync').then((m) => {
      stop = m.syncWhenReady()
    })
    return () => stop()
  }, [])
  const open = (mode: typeof view, brandId?: string) => {
    setId(brandId)
    setView(mode)
    history.replaceState(
      null,
      '',
      mode === 'home'
        ? '/brand'
        : mode === 'guideline'
          ? `/brand?view=guideline${brandId ? '&id=' + brandId : ''}`
          : `/brand?id=${brandId ?? ''}`,
    )
  }
  return (
    <main
      className={`bg-void-950 text-void-100 ${view === 'guideline' ? 'h-[100dvh] flex flex-col overflow-hidden' : 'min-h-[100dvh]'}`}
    >
      <header className="h-12 shrink-0 flex items-center gap-3 px-3 border-b border-void-800">
        <Logo />
        <AppNav />
        <HelpMenu className="ml-auto" />
      </header>
      {view === 'guideline' ? (
        <BrandGuideline
          backLabel="Brands"
          initialBrand={brands.find((b) => b.id === id)}
          onBack={() => open('home')}
        />
      ) : view === 'edit' ? (
        <BrandsView
          initial={id}
          onBack={() => open('home')}
          onGuidelines={() => open('guideline')}
        />
      ) : (
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-xs text-void-400 uppercase tracking-widest mb-3">
                Brand Guidelines
              </p>
              <h1 className="text-4xl font-semibold tracking-tight">
                Your brands.
              </h1>
              <p className="mt-3 text-void-400 max-w-xl">
                Build the system once. Give your team useful colours, type,
                assets and rules. Create every design from the same foundation.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Btn onClick={() => open('edit')}>New brand kit</Btn>
              <Btn primary onClick={() => open('guideline')}>
                Build a guideline
              </Btn>
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-rose-300">
              {error}
            </p>
          )}
          {!brands.length ? (
            <div className="mt-10 border border-void-800 rounded-2xl p-8">
              <h2 className="text-xl mb-2">Your first brand starts here.</h2>
              <p className="text-void-400 mb-5">
                Start from a logo, develop the colour and typography system,
                then publish a brand website when it is ready.
              </p>
              <Btn primary onClick={() => open('guideline')}>
                Build your first guideline
              </Btn>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
              {brands.map((b) => (
                <article
                  key={b.id}
                  className="rounded-2xl border border-void-800 overflow-hidden"
                >
                  <div className="flex h-28">
                    {b.colors.slice(0, 5).map((c, i) => (
                      <span
                        key={i}
                        className="flex-1"
                        style={{ background: c.hex }}
                      />
                    ))}
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-void-400 mb-2">
                      {b.publication?.live
                        ? `Published v${b.publication.version}`
                        : 'Local draft'}
                    </p>
                    <h2 className="text-xl font-medium">{b.name}</h2>
                    <p className="text-sm text-void-400 mt-1">
                      {b.display} · {b.colors.length} colours · {b.logos.length}{' '}
                      logo assets
                    </p>
                    <div className="flex flex-wrap gap-2 mt-5">
                      <Btn onClick={() => open('edit', b.id)}>
                        Edit & publish
                      </Btn>
                      {b.guideline?.source && (
                        <Btn onClick={() => open('guideline', b.id)}>
                          Open builder
                        </Btn>
                      )}
                      {b.publication?.live && (
                        <Link
                          className="inline-flex items-center px-3 text-sm underline"
                          href={process.env.NEXT_PUBLIC_DESKTOP ? `https://voidcanvas.app/b/${b.publication.slug}` : `/b/${b.publication.slug}`}
                        >
                          Open guideline
                        </Link>
                      )}
                      <Btn
                        onClick={async () => {
                          try {
                            location.assign(await createWithBrand(b))
                          } catch {
                            setError(
                              'Could not open this brand in Editor. Try again.',
                            )
                          }
                        }}
                      >
                        Create design
                      </Btn>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="text-xs text-void-500 mt-8">
            Drafts are saved on this device. Publishing is optional and uploads
            only the guideline you choose.
          </p>
        </div>
      )}
    </main>
  )
}
