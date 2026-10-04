'use client'
import { useEffect, useState } from 'react'
import { useJobs, type ClientBrand } from '@/studio/jobs'
import { brandSlug, validSlug, type Visibility } from './model'
import { fingerprint, publish } from './client'
import { AccountPanel } from '@/components/account/AccountPanel'
import { useAccount, initAccount, freshToken } from '@/lib/account'
import { Modal } from '@/editor/components/ui'
import { Btn, INPUT } from '@/studio/ui'
export function PublishControl({ brand }: { brand: ClientBrand }) {
  const [open, setOpen] = useState(false),
    [slug, setSlug] = useState(
      brand.publication?.slug ?? brandSlug(brand.name),
    ),
    [visibility, setVisibility] = useState<Visibility>(
      brand.publication?.visibility ?? 'link',
    )
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [changed, setChanged] = useState(false)
  useEffect(() => {
    if (!open && !brand.publication) setSlug(brandSlug(brand.name))
  }, [brand.name, brand.publication, open])
  const status = useAccount((s) => s.status)
  useEffect(() => {
    initAccount().catch(() => {})
  }, [])
  useEffect(() => {
    let live = true
    fingerprint(brand).then((f) => {
      if (live) setChanged(f !== brand.publication?.fingerprint)
    })
    return () => {
      live = false
    }
  }, [brand])
  const run = async (remove = false) => {
    setBusy(true)
    setError('')
    try {
      // Flush the latest form state so publishing never races the debounced local save.
      let p = brand.publication
      if (remove && p) {
        const r = await fetch(`/api/brand/${p.slug}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${await freshToken()}` },
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        p = { ...p, live: false }
      } else p = await publish(brand, slug, visibility)
      await useJobs.getState().saveBrand({ ...brand, publication: p })
    } catch (e) {
      setError((e as Error).message || 'Could not publish.')
    } finally {
      setBusy(false)
    }
  }
  const p = brand.publication
  return (
    <>
      <Btn onClick={() => { if(process.env.NEXT_PUBLIC_DESKTOP) { window.open('https://voidcanvas.app/brand','_blank','noopener'); return } setOpen(true) }}>
        {process.env.NEXT_PUBLIC_DESKTOP ? 'Publish on web' : p?.live
          ? changed
            ? 'Unpublished changes'
            : `Published v${p.version}`
          : 'Publish guideline'}
      </Btn>
      {open && (
        <Modal
          title="Publish brand guideline"
          onClose={() => {
            if (!busy) setOpen(false)
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-void-300">
              Publishing uploads a readable copy of this guideline and its
              images. Your local draft stays separate; future edits only go live
              when you publish an update.
            </p>
            {status !== 'ready' ? (
              <>
                <p className="text-sm">
                  Sign in to own and manage your brand address.
                </p>
                <AccountPanel />
              </>
            ) : (
              <>
                <label className="block text-sm">
                  Brand address
                  <span className="flex items-center mt-2 gap-1 text-void-400">
                    voidcanvas.app/b/
                    <input
                      aria-label="Brand address"
                      value={slug}
                      disabled={!!p || busy}
                      onChange={(e) => setSlug(e.target.value.toLowerCase())}
                      className={`${INPUT} flex-1 min-w-0`}
                    />
                  </span>
                </label>
                <label className="block text-sm">
                  Visibility
                  <select
                    aria-label="Guideline visibility"
                    value={visibility}
                    disabled={busy}
                    onChange={(e) =>
                      setVisibility(e.target.value as Visibility)
                    }
                    className={`${INPUT} block w-full mt-2`}
                  >
                    <option value="link">Anyone with link · not indexed</option>
                    <option value="public">
                      Public · search engines may index
                    </option>
                  </select>
                </label>
                <p className="text-xs text-void-400">
                  Anyone with the address can read a link-only page. Keep the
                  draft local or use team sharing for confidential brands.
                </p>
                {p?.live && (
                  <div className="rounded-lg border border-void-700 p-3 text-sm">
                    <a
                      className="underline"
                      href={`/b/${p.slug}`}
                      target="_blank"
                      rel="noopener"
                    >
                      Open published v{p.version}
                    </a>
                    <p className="text-void-400 mt-1">
                      {changed
                        ? 'You have unpublished changes.'
                        : 'Published copy is up to date.'}
                    </p>
                    <button
                      className="underline mt-2"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            `${location.origin}/b/${p.slug}`,
                          )
                          setError('Link copied.')
                        } catch {
                          setError(
                            'Could not copy. Open the guideline and copy its address.',
                          )
                        }
                      }}
                    >
                      Copy brand link
                    </button>
                  </div>
                )}
                <div className="flex gap-3 flex-wrap">
                  {p && (
                    <Btn
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true)
                        try {
                          const r = await fetch(
                            `/api/brand/${p.slug}?manage=1`,
                            {
                              headers: {
                                Authorization: `Bearer ${await freshToken()}`,
                              },
                            },
                          )
                          const d = await r.json()
                          if (!r.ok) throw new Error(d.error)
                          await useJobs
                            .getState()
                            .saveBrand({
                              ...brand,
                              publication: { ...p, ...d, fingerprint: '' },
                            })
                          setError(
                            'Publishing status refreshed. Your local draft is unchanged.',
                          )
                        } catch (e) {
                          setError((e as Error).message)
                        } finally {
                          setBusy(false)
                        }
                      }}
                    >
                      Refresh publishing status
                    </Btn>
                  )}
                  <Btn
                    primary
                    disabled={busy || !validSlug(slug)}
                    onClick={() => run()}
                  >
                    {busy
                      ? 'Saving…'
                      : p?.live
                        ? 'Publish update'
                        : 'Publish guideline'}
                  </Btn>
                  {p?.live && (
                    <Btn disabled={busy} onClick={() => run(true)}>
                      Unpublish
                    </Btn>
                  )}
                </div>
              </>
            )}
            {error && (
              <p role="status" className="text-sm text-void-300">
                {error}
              </p>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
