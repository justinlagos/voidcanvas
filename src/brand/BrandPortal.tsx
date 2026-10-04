'use client'
import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Modal } from '@/editor/components/ui'
import { fmtOklch, rgb255, RAMP_STEPS, bestInk } from '@/studio/brand/color'
import { toCss, toJson, toTailwind } from '@/studio/brand/export'
import { SECTIONS, type Publication, type Section } from './model'
const label = (s: string) =>
  ({
    colors: 'Colour System',
    typography: 'Typography',
    'logo-usage': 'Logo usage',
    'clear-space': 'Clear space',
    'graphic-system': 'Graphic system',
    'tone-of-voice': 'Tone of voice',
  })[s] ?? s.replace(/^./, (c) => c.toUpperCase())
export function BrandPortal({
  publication: p,
  section = 'overview',
}: {
  publication: Publication
  section?: Section
}) {
  const s = p.snapshot,
    b = s.system
  const [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [asset, setAsset] = useState<string | null>(null)
  useEffect(() => {
    import('@/editor/io').then((m) => {
      for (const f of [b.fonts.heading, b.fonts.body])
        if (f.source === 'google')
          m.ensureFont(f.family, 400)
            .then(() => m.ensureFont(f.family, 700))
            .catch(() => {})
    })
  }, [b.fonts.heading.family, b.fonts.body.family])
  const base = `/b/${p.slug}`
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setNotice('Copied.')
    } catch {
      setNotice('Copy unavailable. Select the value to copy it.')
    }
  }
  const share = async (id?: Section) => {
    const url = `${location.origin}${base}${id && id !== 'overview' ? '/' + id : ''}`
    try {
      if (navigator.share)
        await navigator.share({
          title: `${s.name} · ${id ? label(id) : 'Brand Guidelines'}`,
          url,
        })
      else await copy(url)
    } catch (e) {
      if ((e as Error).name !== 'AbortError')
        setNotice('Could not share. Copy the link instead.')
    }
  }
  const download = async (
    kind: 'pdf' | 'assets' | 'tokens' | 'css' | 'tailwind',
  ) => {
    setBusy(true)
    try {
      const { downloadBlob, blobToCanvas, canvasToBlob, zipFiles } =
        await import('@/editor/io')
      if (kind === 'pdf') {
        const { assemble } = await import('@/studio/brand-pdf')
        const pages = []
        for (const a of s.pages) {
          const c = await blobToCanvas(await (await fetch(a.data)).blob(), 1600)
          const jpeg = new Uint8Array(
            await (await canvasToBlob(c, 'image/jpeg', 0.92)).arrayBuffer(),
          )
          pages.push({
            jpeg,
            pxW: c.width,
            pxH: c.height,
            mediaW: 840,
            mediaH: (840 * c.height) / c.width,
            imgX: 0,
            imgY: 0,
            imgW: 840,
            imgH: (840 * c.height) / c.width,
          })
        }
        downloadBlob(await assemble(pages, false), `${p.slug}-guidelines.pdf`)
      } else if (kind === 'assets') {
        const files = await Promise.all(
          [...s.logos, ...s.imagery].map(async (a, i) => ({
            name: `${i + 1}-${a.name.replace(/[^a-z0-9]+/gi, '-')}.png`,
            blob: await (await fetch(a.data)).blob(),
          })),
        )
        downloadBlob(await zipFiles(files), `${p.slug}-assets.zip`)
      } else {
        const value =
          kind === 'tokens'
            ? toJson(b)
            : kind === 'css'
              ? toCss(b)
              : toTailwind(b)
        downloadBlob(
          new Blob([value], { type: 'text/plain' }),
          `${p.slug}.${kind === 'tokens' ? 'tokens.json' : kind === 'css' ? 'css' : 'tailwind.js'}`,
        )
      }
    } catch {
      setNotice('Could not prepare this download. Try again.')
    } finally {
      setBusy(false)
    }
  }
  const create = async () => {
    setBusy(true)
    try {
      const { importSnapshot, createWithBrand } = await import('./client')
      location.assign(await createWithBrand(await importSnapshot(s)))
    } catch {
      setNotice('Could not open Editor. Try again.')
      setBusy(false)
    }
  }
  const button =
    'rounded-lg border border-black/15 px-3 py-2 text-sm hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40'
  const panel = (id: Section, children: ReactNode) =>
    section === 'overview' || section === id ? (
      <section
        id={id}
        key={id}
        className="py-10 sm:py-14 border-t border-black/15 scroll-mt-24"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {label(id)}
          </h2>
          <button className={button} onClick={() => share(id)}>
            Share section
          </button>
        </div>
        {children}
      </section>
    ) : null
  const colour = (hex: string, name: string, variable: string) => {
    const rgb = rgb255(hex)
    return (
      <article
        key={name}
        className="border border-black/15 rounded-2xl overflow-hidden"
      >
        <button
          className="flex w-full h-36 items-end p-5 text-lg font-medium text-left"
          style={{ background: hex, color: bestInk(hex, '#ffffff', '#171916') }}
          onClick={() => copy(hex)}
          aria-label={`Copy ${name} HEX`}
        >
          {name}
        </button>
        <div className="p-4 space-y-2 text-sm">
          <p className="font-mono">{hex.toUpperCase()}</p>
          <div className="flex flex-wrap gap-2">
            {[
              ['HEX', hex.toUpperCase()],
              ['RGB', `rgb(${rgb.join(', ')})`],
              ['OKLCH', fmtOklch(hex)],
              ['CSS', `--color-${variable}: ${hex};`],
            ].map(([l, v]) => (
              <button key={l} className={button} onClick={() => copy(v)}>
                Copy {l}
              </button>
            ))}
          </div>
        </div>
      </article>
    )
  }
  return (
    <div
      className="min-h-screen bg-[#faf9f6] text-[#171916]"
      style={{ colorScheme: 'light' }}
    >
      <header className="border-b border-black/15 px-5 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-4 items-center justify-between">
          <Link href={base} className="text-lg font-semibold">
            {s.name}
          </Link>
          <div className="flex flex-wrap gap-2">
            <button
              className={button}
              onClick={() => copy(`${location.origin}${base}`)}
            >
              Copy brand link
            </button>
            <button className={button} onClick={() => share()}>
              Share
            </button>
            <button
              className={button}
              disabled={busy || !s.pages.length}
              onClick={() => download('pdf')}
            >
              Download PDF
            </button>
            <button
              className={`${button} bg-[#171916] !text-white`}
              disabled={busy}
              onClick={create}
            >
              Create with this brand
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[200px_1fr] gap-10">
        <nav
          aria-label="Guideline sections"
          className="lg:sticky lg:top-6 lg:self-start py-6 flex overflow-x-auto lg:flex-col gap-2 text-sm"
        >
          {SECTIONS.map((id) => (
            <Link
              key={id}
              href={id === 'overview' ? base : `${base}/${id}`}
              aria-current={section === id ? 'page' : undefined}
              className={`whitespace-nowrap px-3 py-2 rounded-lg ${section === id ? 'bg-[#171916] text-white' : 'hover:bg-black/5'}`}
            >
              {label(id)}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 pb-16">
          <div className="pt-4 lg:pt-12 pb-10">
            <p className="text-xs uppercase tracking-widest text-black/50 mb-4">
              Brand Guidelines · v{p.version}
            </p>
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight">
              {section === 'overview' ? s.name : label(section)}
            </h1>
            <p className="mt-4 text-sm text-black/60">
              Updated{' '}
              {new Date(p.updatedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </p>
            {section !== 'overview' && (
              <Link href={base} className="inline-block underline text-sm mt-4">
                View the full guideline
              </Link>
            )}
          </div>
          {panel(
            'colors',
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {s.colors.map((c, i) =>
                  colour(
                    c.hex,
                    `${c.role.charAt(0).toUpperCase() + c.role.slice(1)}${s.colors.filter((x) => x.role === c.role).length > 1 ? ' ' + (i + 1) : ''}`,
                    c.role === 'primary' ? b.roles[0].id : c.role,
                  ),
                )}
              </div>
              <h3 className="text-xl font-semibold mt-10 mb-4">
                Ramps & semantic colours
              </h3>
              {[
                ...b.roles,
                ...b.semantic,
                { id: 'neutral', name: 'Neutrals', ramp: b.neutral },
              ].map((r) => (
                <div key={r.id} className="mb-5">
                  <p className="text-sm mb-2">{r.name}</p>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                    {RAMP_STEPS.map((n) => (
                      <button
                        key={n}
                        className="h-14 rounded-md text-xs"
                        style={{
                          background: r.ramp[n],
                          color: bestInk(r.ramp[n], '#ffffff', '#171916'),
                        }}
                        onClick={() => copy(r.ramp[n])}
                        aria-label={`Copy ${r.name} ${n} ${r.ramp[n]}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>,
          )}
          {panel(
            'typography',
            <>
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {[b.fonts.heading, b.fonts.body].map((f, i) => (
                  <article
                    key={i}
                    className="p-5 border border-black/15 rounded-2xl"
                  >
                    <p className="text-xs uppercase text-black/50">
                      {i ? 'Body' : 'Headlines'}
                    </p>
                    <p
                      className="text-3xl mt-3 break-words"
                      style={{ fontFamily: JSON.stringify(f.family) }}
                    >
                      {f.family}
                    </p>
                    <button
                      className={`${button} mt-4`}
                      onClick={() =>
                        copy(
                          `font-family: ${JSON.stringify(f.family)}, sans-serif;`,
                        )
                      }
                    >
                      Copy CSS
                    </button>
                    {f.source === 'google' && (
                      <a
                        className="block underline text-sm mt-3"
                        href={`https://fonts.google.com/?query=${encodeURIComponent(f.family)}`}
                        target="_blank"
                        rel="noopener"
                      >
                        Open font source
                      </a>
                    )}
                    {f.source === 'local' && (
                      <p className="text-xs mt-3 text-black/50">
                        Font file is not published. Ask the brand owner for
                        licensed access.
                      </p>
                    )}
                  </article>
                ))}
              </div>
              {b.scale.map((t) => (
                <div
                  key={t.label}
                  className="py-4 border-t border-black/10 flex flex-wrap gap-3 items-center justify-between"
                >
                  <div>
                    <p className="text-xl">{t.label}</p>
                    <p className="text-sm text-black/50">
                      {t.family === 'heading' ? s.display : s.body} / {t.weight}{' '}
                      / {t.px}px / {t.lineHeight}
                    </p>
                  </div>
                  <button
                    className={button}
                    onClick={() =>
                      copy(
                        `font-family: ${JSON.stringify(t.family === 'heading' ? s.display : s.body)}; font-weight: ${t.weight}; font-size: ${t.px}px; line-height: ${t.lineHeight}; letter-spacing: ${t.tracking}em;`,
                      )
                    }
                  >
                    Copy CSS
                  </button>
                </div>
              ))}
            </>,
          )}
          {panel(
            'logo',
            <>
              {!s.logos.length && <p>No logo assets have been published.</p>}
              <div className="grid sm:grid-cols-2 gap-5">
                {s.logos.map((l, i) => (
                  <article key={i}>
                    <div
                      className={`h-48 rounded-xl flex items-center justify-center p-8 border border-black/10 ${l.variant === 'reversed' ? 'bg-[#202420]' : 'bg-white'}`}
                    >
                      <img
                        src={l.data}
                        alt={l.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <p className="font-medium mt-3">{l.name}</p>
                    <div className="flex gap-2 mt-3">
                      <a
                        className={button}
                        href={l.data}
                        download={`${p.slug}-logo-${i + 1}.png`}
                      >
                        Download PNG
                      </a>
                      <button
                        className={button}
                        onClick={() => setAsset(l.data)}
                      >
                        Open asset
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>,
          )}
          {panel(
            'logo-usage',
            <>
              <p className="mb-4">
                Use the supplied variants. Preserve the original proportions and
                keep the mark legible against its background.
              </p>
              <ul className="space-y-3 list-disc pl-5">
                <li>Use the reversed version on dark backgrounds.</li>
                <li>Keep clear space on all sides.</li>
                <li>Do not stretch, recolour or add effects to the logo.</li>
              </ul>
            </>,
          )}
          {panel(
            'clear-space',
            <>
              <p className="text-lg mb-4">
                Leave {s.clearSpace} × the logo height clear on each side.
              </p>
              <p>
                Minimum screen width: {s.logoMin}px. Minimum print width:{' '}
                {b.logo.minPrint} mm.
              </p>
              <button
                className={`${button} mt-5`}
                onClick={() =>
                  copy(
                    `Leave ${s.clearSpace} × logo height clear on all sides. Minimum width: ${s.logoMin}px on screen; ${b.logo.minPrint}mm in print.`,
                  )
                }
              >
                Copy rule
              </button>
            </>,
          )}
          {panel(
            'photography',
            <>
              {!s.imagery.length ? (
                <p>No photography has been published.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {s.imagery.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => setAsset(a.data)}
                      className="text-left"
                    >
                      <img
                        src={a.data}
                        alt={a.name}
                        className="w-full rounded-xl"
                      />
                      <p className="text-sm mt-2">{a.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </>,
          )}
          {panel(
            'graphic-system',
            <>
              <p className="mb-4">
                {b.grid.cols}-column grid · {b.grid.gutter}px gutter ·{' '}
                {b.grid.margin}px margin · {b.radius}px corner radius
              </p>
              <div className="space-y-5">
                {b.principles.map((pr) => (
                  <div key={pr.title}>
                    <h3 className="font-semibold">{pr.title}</h3>
                    <p className="mt-1">{pr.body}</p>
                    <button
                      className={`${button} mt-2`}
                      onClick={() => copy(`${pr.title}\n${pr.body}`)}
                    >
                      Copy rule
                    </button>
                  </div>
                ))}
              </div>
            </>,
          )}
          {panel(
            'tone-of-voice',
            <>
              <p className="text-xl mb-6">
                {s.voice.join(', ') || 'No voice rules published.'}
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  ['Do', s.dos],
                  ['Avoid', s.donts],
                ].map(([title, rules]) => (
                  <div key={String(title)}>
                    <h3 className="font-semibold mb-3">{String(title)}</h3>
                    {(rules as string[]).map((r, i) => (
                      <div key={i} className="border-t border-black/10 py-3">
                        <p>{r}</p>
                        <button
                          className={`${button} mt-2`}
                          onClick={() => copy(r)}
                        >
                          Copy rule
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>,
          )}
          {panel(
            'applications',
            <>
              {!s.pages.length ? (
                <p>
                  No guideline pages have been published. Add them from the
                  guideline builder.
                </p>
              ) : (
                <div className="space-y-5">
                  {s.pages.map((a, i) => (
                    <button
                      key={i}
                      className="block w-full"
                      onClick={() => setAsset(a.data)}
                    >
                      <img
                        src={a.data}
                        alt={a.name}
                        className="w-full rounded-xl border border-black/10"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>,
          )}
          {panel(
            'downloads',
            <>
              <p className="mb-5 text-black/60">
                Ready to use in your next design or development handoff.
              </p>
              <div className="flex flex-wrap gap-3">
                {(['pdf', 'assets', 'tokens', 'css', 'tailwind'] as const).map(
                  (kind) => (
                    <button
                      key={kind}
                      className={button}
                      disabled={
                        busy ||
                        (kind === 'pdf' && !s.pages.length) ||
                        (kind === 'assets' &&
                          !s.logos.length &&
                          !s.imagery.length)
                      }
                      onClick={() => download(kind)}
                    >
                      Download{' '}
                      {kind === 'tokens'
                        ? 'tokens JSON'
                        : kind === 'assets'
                          ? 'assets ZIP'
                          : kind.toUpperCase()}
                    </button>
                  ),
                )}
              </div>
            </>,
          )}
          <footer className="border-t border-black/15 pt-8 text-sm text-black/50">
            <Link href="/brand" className="underline">
              Made with VoidCanvas
            </Link>
            <span className="block mt-2">
              Build your brand. Create your next design.
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#171916] text-white px-5 py-3 rounded-xl flex gap-4 text-sm max-w-[90vw]"
        >
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            ×
          </button>
        </div>
      )}
      {asset && (
        <Modal
          title="Brand asset preview"
          onClose={() => setAsset(null)}
          preview
        >
          <img
            src={asset}
            alt="Brand asset preview"
            className="w-full max-h-[75vh] object-contain"
          />
        </Modal>
      )}
    </div>
  )
}
