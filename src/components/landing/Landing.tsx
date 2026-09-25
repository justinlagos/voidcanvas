'use client'

// The product page. Structure follows a classic single-product marketing page: a sticky local nav with one call to
// action, a hero, a tabbed highlights gallery, a three-card offer, one deep-dive per module with a horizontal feature
// gallery, questions, footnotes. Every fact here comes from the codebase (README, effect-list, presets, tools/defs).
// Conversion is "open a tool and start", so every primary button goes straight into the product and reports which
// section it was pressed in.

import Link from 'next/link'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Lock, Play } from 'lucide-react'
import { Logo } from '@/components/AppNav'
import { PrivacyPanel, PrivateBadge } from '@/editor/components/PrivacyPanel'
import { initPrivateFromSession, listProjects, idb, type ProjectSummary } from '@/editor/io'
import { nextAction, type Job } from '@/studio/jobs'
import { EFFECT_COUNT } from '@/components/effect-list'
import { SIZE_PRESETS } from '@/editor/presets'
import { track } from '@/lib/analytics'
import { Ami, Analogue, EditorFrame, EffectsFrame, Fx, Kofi, KofiGuide, Move, Oya, Photo, Sessions, StudioFrame, workFonts } from './work'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const APP = 'https://voidcanvas.netlify.app'

/* ---------- small pieces ---------- */

/** Primary pill. Every one of these is a conversion, so it reports where on the page it lives. */
function Cta({ href = '/editor', where, children, big, ghost, className = '' }: { href?: string; where: string; children: ReactNode; big?: boolean; ghost?: boolean; className?: string }) {
  return (
    <Link href={href} onClick={() => track('landing.cta', { where, href })}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors ${focus} ${big ? 'h-12 px-6 text-[16px]' : 'h-9 px-4 text-[14px]'} ${ghost ? 'text-accent-light hover:text-white' : 'bg-white text-void-950 hover:bg-void-100'} ${className}`}>
      {children}
    </Link>
  )
}

/** Fades and lifts a block in the first time it scrolls into view. Off when the person prefers reduced motion. */
function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'section' | 'li' | 'figure' }) {
  const ref = useRef<HTMLElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setOn(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 })
    io.observe(el); return () => io.disconnect()
  }, [])
  const T = Tag as any
  return <T ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`transition-all duration-700 ease-out will-change-transform ${on ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}>{children}</T>
}

/** Reports the first time a section is seen, so the funnel (view → scroll depth → click) can be read in the admin. */
function Seen({ id, children, className = '' }: { id: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { track('landing.section', { id }); io.disconnect() } }, { threshold: 0.3 })
    io.observe(el); return () => io.disconnect()
  }, [id])
  return <section ref={ref} id={id} className={className}>{children}</section>
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[13px] sm:text-[15px] font-semibold text-accent-light tracking-wide">{children}</p>
}

/** Big centred headline in the marketing scale. */
function H2({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-[34px] sm:text-[48px] lg:text-[64px] leading-[1.02] font-semibold tracking-[-0.03em] text-white ${className}`}>{children}</h2>
}

/** A horizontal gallery of feature cards: snap scroll, arrows on desktop, swipe on touch. */
function Gallery({ id, items }: { id: string; items: { title: string; body: ReactNode; art: ReactNode; note?: string }[] }) {
  const ref = useRef<HTMLUListElement>(null)
  const [at, setAt] = useState<{ start: boolean; end: boolean }>({ start: true, end: false })
  const update = () => { const el = ref.current; if (!el) return; setAt({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 }) }
  useEffect(() => { update(); const el = ref.current; el?.addEventListener('scroll', update, { passive: true }); addEventListener('resize', update); return () => { el?.removeEventListener('scroll', update); removeEventListener('resize', update) } }, [])
  const go = (dir: 1 | -1) => { const el = ref.current; if (!el) return; const card = el.querySelector('li'); const w = (card?.clientWidth ?? 360) + 20; el.scrollBy({ left: dir * w, behavior: 'smooth' }); track('landing.gallery', { id, dir }) }
  return (
    <div className="relative">
      <ul ref={ref} className="flex gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-px-5 px-5 sm:scroll-px-8 sm:px-8 lg:scroll-px-[max(2rem,calc((100vw-1120px)/2))] lg:px-[max(2rem,calc((100vw-1120px)/2))] pb-2">
        {items.map((it, i) => (
          <Reveal as="li" key={it.title} delay={Math.min(i, 3) * 60} className="snap-start shrink-0 w-[82vw] sm:w-[400px] rounded-[28px] bg-[#131318] border border-void-800/80 overflow-hidden flex flex-col">
            <div className="p-6 sm:p-7 pb-0">
              <h3 className="text-[20px] sm:text-[22px] font-semibold tracking-tight leading-tight">{it.title}</h3>
              <p className="mt-2 text-[14.5px] text-void-400 leading-relaxed">{it.body}</p>
            </div>
            <div className="mt-auto pt-6 px-4 sm:px-5"><div className="rounded-t-2xl overflow-hidden aspect-[8/5] bg-void-950 border border-b-0 border-void-800/60 flex items-center justify-center relative">{it.art}</div></div>
            {it.note && <p className="px-6 py-3 text-[12px] text-void-500 border-t border-void-800/60">{it.note}</p>}
          </Reveal>
        ))}
        <li aria-hidden className="shrink-0 w-1" />
      </ul>
      <div className="hidden lg:flex justify-end gap-2 px-[max(2rem,calc((100vw-1120px)/2))] mt-4">
        <button onClick={() => go(-1)} disabled={at.start} aria-label="Previous" className={`w-10 h-10 rounded-full bg-void-800 text-white flex items-center justify-center disabled:opacity-30 hover:bg-void-700 ${focus}`}><ChevronLeft size={18} /></button>
        <button onClick={() => go(1)} disabled={at.end} aria-label="Next" className={`w-10 h-10 rounded-full bg-void-800 text-white flex items-center justify-center disabled:opacity-30 hover:bg-void-700 ${focus}`}><ChevronRight size={18} /></button>
      </div>
    </div>
  )
}

/** The head of a module deep-dive: icon, name, two-line headline, paragraph with one bold phrase, one link. */
function ModuleHead({ id, name, mark, headline, children, href, cta }: { id: string; name: string; mark: string; headline: ReactNode; children: ReactNode; href: string; cta: string }) {
  return (
    <div className="max-w-[1120px] mx-auto px-5 sm:px-8">
      <Reveal className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-end">
        <div className="lg:col-span-5">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-white text-void-950 items-center justify-center text-[26px] font-bold tracking-tight shadow-[0_8px_30px_rgba(139,124,255,0.25)]">{mark}</span>
          <h2 className="mt-5 text-[15px] font-semibold text-accent-light">{name}</h2>
          <p className="mt-2 text-[36px] sm:text-[48px] lg:text-[56px] leading-[1.02] font-semibold tracking-[-0.03em] text-white">{headline}</p>
        </div>
        <div className="lg:col-span-7 lg:pb-2">
          <p className="text-[17px] sm:text-[19px] text-void-300 leading-relaxed max-w-[620px]">{children}</p>
          <Cta href={href} where={`${id}.head`} ghost className="mt-4 -ml-1 px-1">{cta} <ArrowRight size={16} /></Cta>
        </div>
      </Reveal>
    </div>
  )
}

/* ---------- work in context ---------- */

/** The hero: finished pieces, fanned like prints on a table. */
function Showcase() {
  return (
    <Reveal delay={240} className="relative mt-12 sm:mt-20 h-[250px] sm:h-[520px] lg:h-[600px]" aria-hidden>
      <div className="absolute inset-x-0 -bottom-px h-[28%] bg-[linear-gradient(180deg,transparent,#0d0d10)] z-20 pointer-events-none" />
      {[
        { el: <Oya />, w: 'w-[38%] sm:w-[30%]', pos: 'left-[2%] top-[14%]', r: '-rotate-6', z: 'z-[1]' },
        { el: <Sessions />, w: 'w-[34%] sm:w-[26%]', pos: 'left-[22%] top-[4%]', r: '-rotate-2', z: 'z-[2]' },
        { el: <Kofi />, w: 'w-[42%] sm:w-[32%]', pos: 'left-[34%] top-0', r: 'rotate-0', z: 'z-[4]' },
        { el: <Move />, w: 'w-[38%] sm:w-[28%]', pos: 'right-[16%] top-[8%]', r: 'rotate-3', z: 'z-[3]' },
        { el: <Ami />, w: 'w-[34%] sm:w-[26%]', pos: 'right-0 top-[16%]', r: 'rotate-6', z: 'z-[1]' },
      ].map((c, i) => (
        <div key={i} className={`absolute ${c.w} ${c.pos} ${c.r} ${c.z} rounded-lg sm:rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)] ring-1 ring-white/10 transition-transform duration-500 hover:-translate-y-2`}>{c.el}</div>
      ))}
    </Reveal>
  )
}

/** The three modules as a flow, with the work that moves between them. */
function Suite() {
  const cols = [
    { n: 'Studio', s: 'Brief, references, palette', el: <Photo src="latte.jpg" ratio={4 / 5} /> },
    { n: 'Editor', s: 'Layers, masks, type, filters', el: <Kofi /> },
    { n: 'Effects', s: 'One photo, one click', el: <Fx kind="halftone" ratio={4 / 5} /> },
  ]
  return (
    <div className="w-full h-full flex items-center justify-center gap-[2%] sm:gap-[3%] px-[5%]">
      {cols.map((m, i) => (
        <Fragment key={m.n}>
          <div className="w-[26%]">
            <div className="ring-1 ring-white/10 rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">{m.el}</div>
            <p className="mt-3 text-[12px] sm:text-[15px] font-semibold text-white text-center">{m.n}</p>
            <p className="hidden sm:block text-[12.5px] text-void-500 text-center">{m.s}</p>
          </div>
          {i < 2 && <ArrowRight className="shrink-0 text-accent-light -mt-10" size={22} />}
        </Fragment>
      ))}
    </div>
  )
}

/** Crops a tall piece to fill a wide card slot. */
function Crop({ children, at = 'top' }: { children: ReactNode; at?: 'top' | 'center' }) {
  return <div className="absolute inset-0 overflow-hidden"><div className={`absolute inset-x-0 ${at === 'top' ? 'top-0' : 'top-1/2 -translate-y-1/2'}`}>{children}</div></div>
}

/** One design, resized to every format. */
function Formats() {
  const Cell = ({ cls }: { cls: string }) => <div className={`relative overflow-hidden rounded-lg ring-1 ring-white/10 bg-[#1b0f08] ${cls}`}><div className="absolute inset-0 flex items-center justify-center"><Kofi className="w-full shrink-0" /></div></div>
  return (
    <div className="w-full h-full p-[5%] grid grid-cols-4 grid-rows-2 gap-[3%]">
      <div className="row-span-2 rounded-lg overflow-hidden ring-1 ring-white/10 flex items-center bg-[#1b0f08]"><Kofi className="w-full" /></div>
      <Cell cls="col-span-2" /><Cell cls="" /><Cell cls="" /><Cell cls="col-span-2" />
    </div>
  )
}

/** A reference board with the palette that came out of it. */
function Refs() {
  return (
    <div className="w-full h-full p-[5%] flex gap-[4%]">
      <div className="grid grid-cols-2 gap-[4%] w-[62%]">
        <Photo src="latte.jpg" ratio={1} className="rounded-lg" />
        <Photo src="beans.jpg" ratio={1} className="rounded-lg" />
        <Photo src="beanie.jpg" ratio={1} className="rounded-lg" position="50% 20%" />
        <Photo src="polaroid.jpg" ratio={1} className="rounded-lg" />
      </div>
      <div className="flex-1 flex flex-col gap-[3%]">
        {[['#2b1608', 'Roast 900'], ['#6f3a17', 'Roast 700'], ['#c9752b', 'Roast 500'], ['#ebbf98', 'Cream 300'], ['#fbf1e6', 'Cream 100']].map(([c, n]) => (
          <div key={c} className="flex-1 rounded-lg flex items-end p-2 text-[10px] font-mono" style={{ background: c, color: c === '#fbf1e6' || c === '#ebbf98' ? '#2b1608' : '#fbf1e6' }}>{n}</div>
        ))}
      </div>
    </div>
  )
}

/** The delivery list for a job. */
function Deliver() {
  const rows: [string, string][] = [['kofi_launch_ig-post_v2.png', 'Approved'], ['kofi_launch_story_v2.png', 'Approved'], ['kofi_launch_a5-flyer_v1.pdf', 'Changes'], ['kofi_launch_window-poster_v1.pdf', 'Sent']]
  return (
    <div className="w-full h-full p-[6%] flex flex-col justify-center gap-2">
      {rows.map(([f, st]) => (
        <div key={f} className="flex items-center gap-3 rounded-lg bg-[#1a1a1e] border border-void-800/70 px-3 py-2.5">
          <div className="w-8 h-10 rounded overflow-hidden shrink-0"><Kofi className="h-full" /></div>
          <span className="flex-1 truncate text-[11.5px] font-mono text-void-200">{f}</span>
          <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded ${st === 'Approved' ? 'bg-[#1d3a2a] text-[#5ee39a]' : st === 'Changes' ? 'bg-[#3a2a1d] text-[#ffb020]' : 'bg-void-800 text-void-400'}`}>{st}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------- content ---------- */

const TABS = [
  { id: 'all', label: 'Voidcanvas', art: <Suite />, caption: 'Three tools that work alone and pass work to each other. Brief, design, effects, export. One tab.' },
  { id: 'studio', label: 'Studio', art: <StudioFrame />, caption: 'Studio turns a brief and a few references into a direction, a palette and formats the client can sign off.' },
  { id: 'editor', label: 'Editor', art: <EditorFrame piece={<Sessions />} layers={[{ name: 'NIGHT SESSIONS', kind: 'text' }, { name: 'Line-up', kind: 'text' }, { name: 'Date and venue', kind: 'text' }, { name: 'Curves', kind: 'adjust' }, { name: 'Film grain', kind: 'filter' }, { name: 'Gradient fade', kind: 'shape' }, { name: 'smoke.jpg', kind: 'image' }]} />, caption: `The Editor gives you layers, masks, type, retouching and ${EFFECT_COUNT} live filters, with the shortcuts you already know.` },
  { id: 'effects', label: 'Effects', art: <EffectsFrame />, caption: 'Effects makes one photo into print dots, dither, glitch or ASCII in one click. Then send it to the Editor.' },
  { id: 'brand', label: 'Brand', art: <KofiGuide />, caption: 'A full brand guideline in a few clicks: colour ramps, type scale, logo rules. Exported as PDF, HTML, CSS and tokens.' },
]

const EDITOR = [
  { title: 'Type directly on the canvas.', body: 'Double-click and write. Any Google font, or a font file from your own machine that never leaves the browser.', art: <Crop><Move /></Crop> },
  { title: 'Layers, masks and 16 blend modes.', body: 'Remove background creates a mask, so nothing is destroyed and every change can be undone.', art: <Crop><Ami /></Crop> },
  { title: `${EFFECT_COUNT} live filters, on your own image.`, body: 'The filter gallery previews every effect on your picture before you pick one. Filters are layers: stack, mask, fade.', art: <Fx kind="glitch" className="w-full" /> },
  { title: 'Every format in one go.', body: `${SIZE_PRESETS.length} presets, from Instagram post to A4 flyer. Backgrounds cover, everything else keeps its place. Download all as a ZIP.`, art: <Formats /> },
  { title: 'Open your Photoshop files.', body: 'PSD import keeps layers, groups, opacity and blend modes. PDF import turns each page into a layer.', art: <EditorFrame piece={<Oya />} layers={[{ name: 'Coverlines', kind: 'text' }, { name: 'OYA masthead', kind: 'text' }, { name: 'Fade', kind: 'shape' }, { name: 'Adaeze.psd', kind: 'image' }]} className="w-full" /> },
  { title: 'Export for screen and print.', body: 'PNG, JPG and WebP up to 3x. PDF at 300 dpi with bleed and crop marks for the printer.', art: <Analogue className="w-full" /> },
]

const STUDIO = [
  { title: 'Start from the brief.', body: 'Paste it. Studio proposes a colour direction, a palette and a type feel, then opens a design already seeded with them.', art: <StudioFrame className="w-full" /> },
  { title: 'A palette pulled from the references.', body: 'Drop in the client’s photos and mood images. The palette comes out of them, so the work starts in the right world.', art: <Refs /> },
  { title: 'Directions the client can choose between.', body: 'Two or three directions, sent for review, with the approved one recorded next to the work.', art: <Crop at="center"><Kofi /></Crop> },
  { title: 'Review, version, deliver.', body: 'Draft, sent, changes, approved. Files come out named and versioned: kofi_launch_ig-post_v2.png.', art: <Deliver /> },
  { title: 'Brand guidelines in a few clicks.', body: 'OKLCH ramps, WCAG 2.2 pairings, type scale, logo clear space. Lock what you like, generate the rest again.', art: <KofiGuide className="w-full" /> },
]

const EFFECTS = [
  { title: 'Halftone.', body: 'Newspaper dots, screen-print dots. Set the size and contrast, download a PNG.', art: <Fx kind="halftone" className="w-full" /> },
  { title: 'Dither.', body: 'The grain of early computers. One slider, endless retro.', art: <Fx kind="dither" className="w-full" /> },
  { title: 'Glitch.', body: 'Sliced, shifted, broken-signal. Press Randomize until it looks right.', art: <Fx kind="glitch" className="w-full" /> },
  { title: 'ASCII.', body: 'Your photo rendered as characters. Export as an image or keep the text.', art: <Fx kind="ascii" className="w-full" /> },
]

const QA = [
  ['Is Voidcanvas really free?', 'Yes. Every tool, every filter, every export format, at full size, with no watermark. There is nothing to unlock and no account to make.'],
  ['Do I need an account?', 'No. Open the Editor and start. Your designs are saved in your browser on this device, so they are there when you come back.'],
  ['Where are my files stored?', 'On your device, in the browser’s own database (IndexedDB). Nothing is uploaded. A private session keeps everything in memory instead, for shared computers, and “Delete all my data” wipes the local database.'],
  ['What does the app send over the internet?', 'Web fonts, a one-time download of the background-removal model, and anonymous usage counts (event names, never images, file names or text). Usage counts are off in a private session, when Do Not Track is on, or when you turn them off.²'],
  ['Can I open my Photoshop files?', 'Yes. PSD import keeps layers, groups, opacity and blend modes. PDF import turns each page into a layer. Shortcuts follow Photoshop, so V, B, E, T, M and the rest do what you expect.'],
  ['Does it work on my phone?', 'Yes. The Editor has a touch layout with pinch zoom and pen pressure, and the whole app can be installed to your home screen and used offline.'],
  ['What happens if I clear my browser data?', 'Your designs go with it, because they only exist on your device. Export anything you want to keep, or save it as a template first.'],
  ['Can I use it for client work?', 'Yes. Studio is built for it: brief, references, directions, sign-off and delivery in one place, with files named and versioned for the client.'],
]

/* ---------- page ---------- */

export function Landing() {
  const [privacy, setPrivacy] = useState(false)
  const [tab, setTab] = useState(0)
  const [open, setOpen] = useState<number | null>(0)
  const [recent, setRecent] = useState<ProjectSummary[]>([])
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    initPrivateFromSession()
    listProjects().then(setRecent).catch(() => {})
    idb.all<Job>('jobs').then(j => setJobs(j.filter(x => x.status !== 'delivered').sort((a, b) => b.updatedAt - a.updatedAt))).catch(() => {})
  }, [])

  // Returning people see their work first. That row is the highest-converting thing on the page for them.
  const latest = [
    ...recent.filter(p => !p.template).map(p => ({ kind: 'design' as const, id: p.id, name: p.name, at: p.updatedAt, thumb: p.thumb, sub: `${p.width} × ${p.height}` })),
    ...jobs.map(j => ({ kind: 'job' as const, id: j.id, name: j.name, at: j.updatedAt, thumb: '', sub: nextAction(j).label })),
  ].sort((a, b) => b.at - a.at).slice(0, 8)

  const active = TABS[tab]

  return (
    <main className={`vc-tap min-h-[100dvh] bg-void-950 text-void-100 overflow-x-clip ${workFonts}`}>
      {/* Local nav: product name on the left, one call to action on the right. Sticks, and the CTA fills in once the hero is gone. */}
      <div className="sticky top-0 z-40 h-12 border-b border-void-800/60 bg-void-950/75 backdrop-blur-xl">
        <div className="max-w-[1120px] mx-auto h-full px-5 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Logo /><PrivateBadge /></div>
          <nav aria-label="Sections" className="hidden md:flex items-center gap-6 text-[13px] text-void-400">
            {[['#editor', 'Editor'], ['#studio', 'Studio'], ['#effects', 'Effects'], ['#free', 'Free'], ['#questions', 'Questions']].map(([h, l]) => <a key={h} href={h} className={`hover:text-white rounded ${focus}`}>{l}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setPrivacy(true)} className={`hidden sm:flex items-center gap-1.5 h-8 px-2 rounded-md text-[13px] text-void-400 hover:text-white ${focus}`}><Lock size={13} />Your privacy</button>
            <Cta where="nav">Start designing</Cta>
          </div>
        </div>
      </div>

      {/* Hero */}
      <Seen id="hero" className="relative">
        <div aria-hidden className="absolute inset-0 -z-0 overflow-hidden">
          <div className="absolute left-1/2 top-[-10%] -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-[radial-gradient(closest-side,rgba(139,124,255,0.22),transparent)]" />
        </div>
        <div className="relative max-w-[1120px] mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-10 text-center">
          <Reveal>
            <p className="text-[17px] sm:text-[21px] font-semibold text-void-200">Voidcanvas</p>
            <h1 className="mt-3 text-[44px] sm:text-[72px] lg:text-[96px] leading-[0.98] font-semibold tracking-[-0.04em] text-white">From the brief<br className="hidden sm:block" /> to the finished file.</h1>
            <p className="mt-4 text-[22px] sm:text-[32px] font-semibold tracking-[-0.02em] text-void-300">In one tab.</p>
          </Reveal>

          <Reveal delay={120} className="mt-8 max-w-[640px] mx-auto">
            <p className="text-[17px] sm:text-[20px] leading-relaxed text-void-300">
              <strong className="text-white font-semibold">A layered editor, a studio for the job around it, and one-click effects.</strong> Runs in your browser, and your files never leave it.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Cta where="hero" big>Start designing <ArrowRight size={18} /></Cta>
              <a href="#highlights" onClick={() => track('landing.cta', { where: 'hero.secondary', href: '#highlights' })} className={`inline-flex items-center gap-2 h-12 px-4 rounded-full text-[16px] text-accent-light hover:text-white ${focus}`}>See how it works <ChevronDown size={16} /></a>
            </div>
            <button onClick={() => setPrivacy(true)} className={`mt-5 inline-flex items-center gap-2 px-3 h-9 rounded-full bg-void-900 border border-void-800 text-[13px] text-void-300 hover:text-white hover:border-void-600 ${focus}`}><Lock size={14} className="text-accent-light" />Free. No account. No cloud. Private by default.</button>
          </Reveal>

          <Showcase />

          {latest.length > 0 && (
            <div className="mt-12 text-left">
              <h2 className="text-[13px] font-semibold text-void-200 mb-3">Pick up where you left off</h2>
              <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0">
                {latest.map(it => (
                  <Link key={it.kind + it.id} href={it.kind === 'design' ? `/editor?project=${it.id}` : `/studio?job=${it.id}`} onClick={() => track('landing.cta', { where: 'recent', kind: it.kind })} className={`shrink-0 w-[150px] rounded-xl overflow-hidden bg-void-900 border border-void-800 hover:border-void-600 ${focus}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <span className="block aspect-[4/3] bg-void-950 flex items-center justify-center">{it.thumb ? <img src={it.thumb} alt="" className="w-full h-full object-contain" /> : <span className="text-void-600 text-[12px]">Job</span>}</span>
                    <span className="block px-2.5 py-2"><span className="block text-[12.5px] font-medium truncate">{it.name}</span><span className={`block text-[11.5px] truncate ${it.kind === 'job' ? 'text-accent-light' : 'text-void-500'}`}>{it.kind === 'job' ? `${it.sub} →` : it.sub}</span></span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </Seen>

      {/* Highlights: one headline, a film slot, a tabbed gallery. */}
      <Seen id="highlights" className="pt-20 sm:pt-28">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8">
          <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <H2 className="max-w-[720px]">Meet the tools.<br />Three of them, and they talk.</H2>
            <a href={`${APP}/editor`} onClick={() => track('landing.cta', { where: 'highlights.film', href: 'demo' })} className={`inline-flex items-center gap-2 text-[15px] text-accent-light hover:text-white ${focus}`}><span className="w-9 h-9 rounded-full bg-void-800 flex items-center justify-center"><Play size={14} className="ml-0.5" /></span>Watch the 60-second demo</a>
          </Reveal>
          <Reveal delay={80} className="mt-8 sm:mt-10">
            <div className="flex justify-center">
              <div role="tablist" aria-label="Highlights" className="inline-flex max-w-full overflow-x-auto no-scrollbar p-1 rounded-full bg-[#1a1a1e] border border-void-800/80">
                {TABS.map((t, i) => (
                  <button key={t.id} role="tab" aria-selected={i === tab} onClick={() => { setTab(i); track('landing.tab', { id: t.id }) }}
                    className={`shrink-0 h-8 px-4 rounded-full text-[13px] font-medium transition-all ${focus} ${i === tab ? 'bg-white text-void-950 shadow' : 'text-void-400 hover:text-white'}`}>{t.label}</button>
                ))}
              </div>
            </div>
            <figure key={active.id} role="tabpanel" className="mt-6 rounded-[28px] overflow-hidden bg-[#131318] border border-void-800/80 animate-[fadein_.45s_ease]">
              <div className="aspect-[16/10] bg-void-950">{active.art}</div>
              <figcaption className="px-6 sm:px-10 py-6 sm:py-8 text-center text-[17px] sm:text-[21px] font-semibold tracking-tight text-void-100 max-w-[820px] mx-auto">{active.caption}</figcaption>
            </figure>
          </Reveal>
        </div>
      </Seen>

      {/* The offer. Three cards, one message: it costs nothing and nothing leaves the device. */}
      <Seen id="free" className="pt-24 sm:pt-32">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8">
          <Reveal className="text-center"><H2>One complete suite.<br />Nothing to pay. Nothing to upload.</H2></Reveal>
          <div className="mt-10 sm:mt-14 grid md:grid-cols-3 gap-4 sm:gap-5">
            {[
              { k: 'Everyone', t: 'Free', b: `Every tool, every export, full size, no watermark. ${EFFECT_COUNT} effects, ${SIZE_PRESETS.length} formats, PSD and PDF import. No account to make.`, cta: 'Start designing', href: '/editor', where: 'free.everyone' },
              { k: 'Shared computers', t: 'Private session', b: 'Keeps everything in memory. Close the tab and nothing is left behind. Usage counts are off too.', cta: 'Read how privacy works', href: '#privacy', where: 'free.private' },
              { k: 'On the go', t: 'Install as an app', b: 'Add it to your home screen or dock. Works offline once installed, on the phone as well as the desk.', cta: 'Open the Editor', href: '/editor', where: 'free.install' },
            ].map((c, i) => (
              <Reveal key={c.t} delay={i * 80} className="rounded-[28px] bg-[#131318] border border-void-800/80 p-7 sm:p-8 flex flex-col text-center items-center">
                <span className="w-12 h-12 rounded-full bg-void-900 border border-void-800 flex items-center justify-center text-accent-light">{i === 0 ? <ArrowRight size={18} /> : i === 1 ? <Lock size={18} /> : <span className="text-[15px] font-bold">V</span>}</span>
                <h3 className="mt-5 text-[13px] font-semibold text-void-400">{c.k}</h3>
                <p className="mt-1 text-[26px] font-semibold tracking-tight text-white">{c.t}</p>
                <p className="mt-3 text-[14.5px] text-void-400 leading-relaxed">{c.b}</p>
                {c.href.startsWith('#')
                  ? <div className="mt-auto pt-6"><button onClick={() => { setPrivacy(true); track('landing.cta', { where: c.where, href: 'privacy' }) }} className={`inline-flex items-center gap-1.5 h-9 text-[14px] font-medium text-accent-light hover:text-white ${focus}`}>{c.cta} <ArrowRight size={14} /></button></div>
                  : <div className="mt-auto pt-6"><Cta href={c.href} where={c.where}>{c.cta}</Cta></div>}
              </Reveal>
            ))}
          </div>
        </div>
      </Seen>

      {/* Editor */}
      <Seen id="editor" className="pt-28 sm:pt-40">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 mb-10 sm:mb-14"><Reveal className="rounded-[28px] overflow-hidden border border-void-800/80 aspect-[16/10] bg-void-950"><EditorFrame piece={<Kofi />} layers={[{ name: 'SLOW MORNING', kind: 'text' }, { name: 'Opens 04.10', kind: 'shape' }, { name: 'Tagline', kind: 'text' }, { name: 'Fade to roast', kind: 'shape' }, { name: 'Warmth', kind: 'adjust' }, { name: 'latte.jpg', kind: 'image' }]} /></Reveal></div>
        <ModuleHead id="editor" name="Editor" mark="V" href="/editor" cta="Open the Editor" headline={<>Photoshop’s power.<br />None of the friction.</>}>
          <strong className="text-white">Design and retouch with layers, masks and type</strong> in a layout designers already know: menu bar, tool rail, options bar, dock. Nothing to install, nothing to sign in to, and it opens in the time it takes to read this sentence.
        </ModuleHead>
        <div className="mt-10 sm:mt-14"><Gallery id="editor" items={EDITOR} /></div>
      </Seen>

      {/* Studio */}
      <Seen id="studio" className="pt-28 sm:pt-40">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 mb-10 sm:mb-14"><Reveal className="rounded-[28px] overflow-hidden border border-void-800/80 aspect-[16/10] bg-void-950"><StudioFrame /></Reveal></div>
        <ModuleHead id="studio" name="Studio" mark="S" href="/studio" cta="Open Studio" headline={<>From the brief<br />to the sign-off.</>}>
          Studio is for the job around the design. <strong className="text-white">Brief, references, directions, formats, review and delivery</strong>, in one place, with the client’s answer recorded next to the work. Then one click opens it all in the Editor.
        </ModuleHead>
        <div className="mt-10 sm:mt-14"><Gallery id="studio" items={STUDIO} /></div>
      </Seen>

      {/* Effects */}
      <Seen id="effects" className="pt-28 sm:pt-40">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 mb-10 sm:mb-14"><Reveal className="rounded-[28px] overflow-hidden border border-void-800/80 aspect-[16/10] bg-void-950"><EffectsFrame /></Reveal></div>
        <ModuleHead id="effects" name="Effects" mark="E" href="/effects" cta={`See all ${EFFECT_COUNT} effects`} headline={<>One photo.<br />One click.</>}>
          <strong className="text-white">{EFFECT_COUNT} effects across artistic, stylise, colour, distortion and texture.</strong> Halftone, dither, glitch, ASCII, pixel sort, CRT, duotone and more. Export straight away, or send the result to the Editor and keep going.
        </ModuleHead>
        <div className="mt-10 sm:mt-14"><Gallery id="effects" items={EFFECTS} /></div>
      </Seen>

      {/* Privacy band */}
      <Seen id="privacy" className="pt-28 sm:pt-40">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8">
          <Reveal className="rounded-[32px] bg-[#131318] border border-void-800/80 px-6 sm:px-12 py-12 sm:py-16 text-center">
            <Eyebrow>Your privacy</Eyebrow>
            <H2 className="mt-3">Your files don’t leave your browser.</H2>
            <p className="mt-5 text-[17px] text-void-300 max-w-[640px] mx-auto leading-relaxed">Everything runs on your device. Designs are saved in the browser’s own database, and a private session keeps them in memory only. There is no server holding your work, because there is no server.</p>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-[640px] mx-auto">
              {[['0', 'uploads'], ['0', 'accounts'], ['0', 'servers with your files']].map(([n, l]) => <div key={l}><p className="text-[40px] sm:text-[56px] font-semibold tracking-[-0.04em] text-white leading-none">{n}</p><p className="mt-2 text-[13px] sm:text-[14px] text-void-400">{l}</p></div>)}
            </div>
            <button onClick={() => { setPrivacy(true); track('landing.cta', { where: 'privacy', href: 'privacy' }) }} className={`mt-10 inline-flex items-center gap-1.5 text-[15px] font-medium text-accent-light hover:text-white ${focus}`}>Exactly what is and isn’t sent <ArrowRight size={15} /></button>
          </Reveal>
        </div>
      </Seen>

      {/* Final call */}
      <Seen id="start" className="pt-28 sm:pt-40">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 text-center">
          <Reveal>
            <H2>Open a tab. Start designing.</H2>
            <p className="mt-4 text-[17px] text-void-400">No sign-up form between you and the canvas.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Cta where="final" big>Start designing <ArrowRight size={18} /></Cta>
              <Cta href="/studio" where="final.studio" ghost big>Start from a brief</Cta>
            </div>
          </Reveal>
        </div>
      </Seen>

      {/* Questions */}
      <Seen id="questions" className="pt-28 sm:pt-40">
        <div className="max-w-[820px] mx-auto px-5 sm:px-8">
          <Reveal><H2>Questions?<br />Answers.</H2></Reveal>
          <ul className="mt-10 border-t border-void-800">
            {QA.map(([q, a], i) => (
              <li key={q} className="border-b border-void-800">
                <button aria-expanded={open === i} aria-controls={`qa-${i}`} onClick={() => { setOpen(open === i ? null : i); track('landing.faq', { q: i }) }} className={`w-full flex items-start justify-between gap-6 py-5 text-left ${focus}`}>
                  <span className="text-[17px] sm:text-[19px] font-semibold tracking-tight text-white">{q}</span>
                  <ChevronDown size={20} className={`shrink-0 mt-1 text-void-400 transition-transform ${open === i ? 'rotate-180' : ''}`} />
                </button>
                <div id={`qa-${i}`} className={`grid transition-[grid-template-rows] duration-300 ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden"><p className="pb-6 text-[15.5px] text-void-400 leading-relaxed max-w-[680px]">{a}</p></div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Seen>

      {/* Footnotes and footer */}
      <footer className="mt-24 sm:mt-32 border-t border-void-800/80">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 py-10 text-[12px] text-void-500 leading-relaxed">
          <ol className="list-decimal pl-4 space-y-1.5 max-w-[820px]">
            <li>Background removal runs in the browser. The model (MODNet via transformers.js, both Apache-2.0) is downloaded once from a CDN on first use. No image is sent anywhere.</li>
            <li>Usage counts are anonymous: event names, small settings such as file type, page area, device type, browser, time zone and screen size, with a random id for this browser. Never images, file names, text or layer content. Off in a private session, when Do Not Track or Global Privacy Control is on, or when you switch them off.</li>
            <li>Saved designs live only in this browser on this device. Clearing site data removes them. Export or save as a template anything you need to keep.</li>
          </ol>
          <div className="mt-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6 text-[13px] text-void-400">
            <div className="max-w-[420px]">
              <div className="flex items-center gap-3 text-void-200"><Logo compact /><span className="font-medium">Voidcanvas</span></div>
              <p className="mt-3 leading-relaxed">Made by <span className="text-void-200">MotionPlay Labs</span>, a design and software studio working between Lagos and Kent.</p>
              <p className="mt-2 text-[12px] text-void-500 leading-relaxed">MotionPlay Labs Ltd is registered in England and Wales, company no. 17304660, and in Nigeria with the Corporate Affairs Commission, RC 9621200.</p>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 sm:max-w-[300px]">
              <Link href="/studio" className={`hover:text-white ${focus}`}>Studio</Link>
              <Link href="/editor" className={`hover:text-white ${focus}`}>Editor</Link>
              <Link href="/effects" className={`hover:text-white ${focus}`}>Effects</Link>
              <Link href="/tools/halftone" className={`hover:text-white ${focus}`}>Halftone</Link>
              <Link href="/tools/dither" className={`hover:text-white ${focus}`}>Dither</Link>
              <Link href="/tools/glitch" className={`hover:text-white ${focus}`}>Glitch</Link>
              <button onClick={() => setPrivacy(true)} className={`hover:text-white ${focus}`}>Privacy</button>
            </nav>
            <p className="sm:text-right sm:max-w-[200px]">© {new Date().getFullYear()} MotionPlay Labs Ltd.<br className="hidden sm:block" />The sequel to Art Director Studio.</p>
          </div>
        </div>
      </footer>

      {privacy && <PrivacyPanel onClose={() => setPrivacy(false)} />}
    </main>
  )
}
