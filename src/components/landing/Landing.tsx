'use client'

// The product page. Structure follows a classic single-product marketing page: a sticky local nav with one call to
// action, a hero, a tabbed highlights gallery, a three-card offer, one deep-dive per module with a horizontal feature
// gallery, questions, footnotes. Every fact here comes from the codebase (README, effect-list, presets, tools/defs).
// Conversion is "open a tool and start", so every primary button goes straight into the product and reports which
// section it was pressed in.

import Link from 'next/link'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, ChevronDown, Moon, Sun, ChevronLeft, ChevronRight, Lock, Play } from 'lucide-react'
import { Logo } from '@/components/AppNav'
import { MotionPlayLabsLogo } from './MotionPlayLabsLogo'
import { PrivacyPanel, PrivateBadge } from '@/editor/components/PrivacyPanel'
import { initPrivateFromSession, listProjects, idb, type ProjectSummary } from '@/editor/io'
import { nextAction, type Job } from '@/studio/jobs'
import { EFFECT_COUNT } from '@/components/effect-list'
import { SIZE_PRESETS } from '@/editor/presets'
import { sendFeedback, track } from '@/lib/analytics'
import { Ami, Analogue, EditorFrame, EditorLive, EffectsFrame, Fx, Kofi, KofiGuide, Move, Oya, Photo, Sessions, StudioFrame, workFonts } from './work'
import { Scene } from './motion'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const APP = 'https://voidcanvas.netlify.app'

const FOOTER_LINKS: [string, [string, string][]][] = [
  ['Make', [['Studio', '/studio'], ['Editor', '/editor'], ['Effects', '/effects']]],
  ['Quick tools', [['Halftone', '/tools/halftone'], ['Dither', '/tools/dither'], ['Glitch', '/tools/glitch']]],
  ['About', [['Privacy', '#privacy'], ['Art Director Studio', 'https://artdirectorstudio.com']]],
]

const FOOTNOTES: [string, string][] = [
  ['Background removal', 'Runs on your device. The model (MODNet via transformers.js, both Apache-2.0) downloads once from a CDN on first use. Your image is never sent.'],
  ['Usage counts', 'Anonymous: event names and small settings (file type, device, browser, time zone, screen size) with a random id for this browser. Never images, file names, text or layer content. Off in a private session, with Do Not Track or Global Privacy Control, or when switched off.'],
  ['Saved designs', 'Kept in this browser on this device. Clearing site data deletes them, so export what you need to keep or save it as a template.'],
]

/* ---------- small pieces ---------- */

/** Primary pill. Every one of these is a conversion, so it reports where on the page it lives. */
function Cta({ href = '/editor', where, children, big, ghost, className = '' }: { href?: string; where: string; children: ReactNode; big?: boolean; ghost?: boolean; className?: string }) {
  return (
    <Link href={href} onClick={() => track('landing.cta', { where, href })}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors ${focus} ${big ? 'h-12 px-6 text-[16px]' : 'h-9 px-4 text-[14px]'} ${ghost ? 'text-lp-accent hover:text-lp-fg' : 'bg-lp-btn text-lp-btn-fg hover:bg-lp-btn-hover'} ${className}`}>
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
  return <p className="text-[13px] sm:text-[15px] font-semibold text-lp-accent tracking-wide">{children}</p>
}

/** Big centred headline in the marketing scale. */
function H2({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-[34px] sm:text-[48px] lg:text-[64px] leading-[1.02] font-semibold tracking-[-0.03em] text-lp-fg ${className}`}>{children}</h2>
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
          <Reveal as="li" key={it.title} delay={Math.min(i, 3) * 60} className="snap-start shrink-0 w-[82vw] sm:w-[400px] rounded-[28px] bg-lp-card border border-lp-line overflow-hidden flex flex-col">
            <div className="p-6 sm:p-7 pb-0">
              <h3 className="text-[20px] sm:text-[22px] font-semibold tracking-tight leading-tight">{it.title}</h3>
              <p className="mt-2 text-[14.5px] text-lp-dim leading-relaxed">{it.body}</p>
            </div>
            <div className="mt-auto pt-6 px-4 sm:px-5"><div className="rounded-t-2xl overflow-hidden aspect-[8/5] bg-lp-panel border border-b-0 border-lp-line flex items-center justify-center relative">{it.art}</div></div>
            {it.note && <p className="px-6 py-3 text-[12px] text-lp-faint border-t border-lp-line">{it.note}</p>}
          </Reveal>
        ))}
        <li aria-hidden className="shrink-0 w-1" />
      </ul>
      <div className="hidden lg:flex justify-end gap-2 px-[max(2rem,calc((100vw-1120px)/2))] mt-4">
        <button onClick={() => go(-1)} disabled={at.start} aria-label="Previous" className={`w-10 h-10 rounded-full bg-lp-panel text-lp-fg flex items-center justify-center disabled:opacity-30 hover:bg-lp-line ${focus}`}><ChevronLeft size={18} /></button>
        <button onClick={() => go(1)} disabled={at.end} aria-label="Next" className={`w-10 h-10 rounded-full bg-lp-panel text-lp-fg flex items-center justify-center disabled:opacity-30 hover:bg-lp-line ${focus}`}><ChevronRight size={18} /></button>
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
          <span className="inline-flex w-14 h-14 rounded-2xl bg-lp-btn text-lp-btn-fg items-center justify-center text-[26px] font-bold tracking-tight shadow-[0_8px_30px_rgba(139,124,255,0.25)]">{mark}</span>
          <h2 className="mt-5 text-[15px] font-semibold text-lp-accent">{name}</h2>
          <p className="mt-2 text-[36px] sm:text-[48px] lg:text-[56px] leading-[1.02] font-semibold tracking-[-0.03em] text-lp-fg">{headline}</p>
        </div>
        <div className="lg:col-span-7 lg:pb-2">
          <p className="text-[17px] sm:text-[19px] text-lp-muted leading-relaxed max-w-[620px]">{children}</p>
          <Cta href={href} where={`${id}.head`} ghost className="mt-4 -ml-1 px-1">{cta} <ArrowRight size={16} /></Cta>
        </div>
      </Reveal>
    </div>
  )
}

/** The highlights panel. Its scene plays only while at least a third of it is on screen, and restarts on each tab. */
function Panel({ art, caption, wide }: { art: ReactNode; caption: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const [play, setPlay] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => setPlay(e.isIntersecting), { threshold: 0.35 })
    io.observe(el); return () => io.disconnect()
  }, [])
  return (
    <figure ref={ref} role="tabpanel" className={`mt-6 rounded-[28px] overflow-hidden bg-lp-card border border-lp-line animate-[fadein_.45s_ease] ${play ? 'lp-play' : ''}`}>
      <div className={`${wide ? 'aspect-[16/10]' : 'aspect-[4/5]'} sm:aspect-[16/10]`}>{art}</div>
      <figcaption className="px-6 sm:px-10 py-5 sm:py-7 text-center text-[16px] sm:text-[20px] font-semibold tracking-tight text-lp-fg max-w-[820px] mx-auto">{caption}</figcaption>
    </figure>
  )
}

/** Feedback, in the footer. One field, an optional email, a send button; sends through the same channel as the app. */
function FeedbackForm() {
  const [msg, setMsg] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!msg.trim() || state === 'sending') return
    setState('sending')
    const ok = await sendFeedback({ mood: null, message: msg, email, trigger: 'footer' })
    setState(ok ? 'done' : 'failed')
    if (ok) { setMsg(''); setEmail('') }
  }
  const field = `w-full rounded-lg bg-[var(--lp-field)] border border-lp-line px-3 text-[13px] text-lp-text placeholder:text-lp-faint focus:border-lp-faint focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent transition-colors`
  return (
    <form onSubmit={submit} aria-label="Feedback" className="text-[13px]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lp-faint">Feedback</h3>
      <p className="mt-2.5 text-lp-dim">What would you improve? Every message is read.</p>
      {state === 'done' ? (
        <div role="status" className="mt-3 rounded-lg border border-lp-line bg-lp-panel px-3 py-2.5 text-lp-text flex items-center justify-between gap-3">
          <span>Thanks. Every message is read.</span>
          <button type="button" onClick={() => setState('idle')} className={`text-lp-dim hover:text-lp-fg rounded ${focus}`}>Send another</button>
        </div>
      ) : (
        <>
          <textarea value={msg} onChange={e => { setMsg(e.target.value); if (state === 'failed') setState('idle') }} maxLength={2000} rows={2} required aria-label="Your feedback" placeholder="What should we fix or add?" className={`${field} mt-3 py-2 resize-none`} />
          <div className="mt-2 flex gap-2">
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" maxLength={200} aria-label="Email, only if you want a reply" placeholder="Email, if you want a reply" className={`${field} h-9 min-w-0 flex-1`} />
            <button type="submit" disabled={state === 'sending' || !msg.trim()} aria-busy={state === 'sending'} className={`h-9 px-3.5 shrink-0 rounded-lg bg-lp-btn text-lp-btn-fg text-[13px] font-medium disabled:opacity-40 hover:bg-lp-btn-hover ${focus}`}>{state === 'sending' ? 'Sending…' : 'Send feedback'}</button>
          </div>
          <p className={`mt-2 text-[11.5px] ${state === 'failed' ? 'text-rose-400' : 'text-lp-faint'}`} role={state === 'failed' ? 'alert' : undefined}>{state === 'failed' ? 'Could not send. Check your connection and try again.' : 'Your designs are never sent.'}</p>
        </>
      )}
    </form>
  )
}

/* ---------- work in context ---------- */

/** The hero: finished pieces, fanned like prints on a table. */
function Showcase() {
  return (
    <Reveal delay={240} className="relative mt-12 sm:mt-20 h-[250px] sm:h-[520px] lg:h-[600px]" aria-hidden>
      <div className="absolute inset-x-0 -bottom-px h-[28%] bg-[linear-gradient(180deg,transparent,var(--lp-bg))] z-20 pointer-events-none" />
      {[
        { el: <Oya />, w: 'w-[38%] sm:w-[30%]', pos: 'left-[2%] top-[14%]', r: '-rotate-6', z: 'z-[1]' },
        { el: <Sessions />, w: 'w-[34%] sm:w-[26%]', pos: 'left-[22%] top-[4%]', r: '-rotate-2', z: 'z-[2]' },
        { el: <Kofi />, w: 'w-[42%] sm:w-[32%]', pos: 'left-[34%] top-0', r: 'rotate-0', z: 'z-[4]' },
        { el: <Move />, w: 'w-[38%] sm:w-[28%]', pos: 'right-[16%] top-[8%]', r: 'rotate-3', z: 'z-[3]' },
        { el: <Ami />, w: 'w-[34%] sm:w-[26%]', pos: 'right-0 top-[16%]', r: 'rotate-6', z: 'z-[1]' },
      ].map((c, i) => (
        <div key={i} className={`absolute ${c.w} ${c.pos} ${c.r} ${c.z} rounded-lg sm:rounded-2xl overflow-hidden [box-shadow:var(--lp-shadow)] ring-1 ring-[var(--lp-ring)] transition-transform duration-500 hover:-translate-y-2`}>{c.el}</div>
      ))}
    </Reveal>
  )
}

/** The three modules as a flow, with the work that moves between them: references become a palette in Studio,
 *  the palette becomes a post in the Editor, the post's photo becomes print dots in Effects. */
function Suite() {
  const sc = new Scene('lpAll', 12)
  const END = 11.4
  const k = (key: string, at: [number, number], o?: Parameters<Scene['show']>[2]) => sc.show(key, at, o)
  const glow = (key: string, at: [number, number]) => k(key, at, { from: 'opacity:0', to: 'opacity:1', d: 0.4, final: at[1] >= END ? 'shown' : 'hidden' })
  const chip = (i: number) => k(`chip${i}`, [0.9 + i * 0.2, END], { from: 'opacity:0;transform:scaleY(0)', to: 'opacity:1;transform:none', d: 0.3 })
  const kofi = {
    grad: k('kg', [3.4, END], { from: 'opacity:0', to: 'opacity:1', d: 0.5 }),
    eyebrow: k('ke', [3.9, END]),
    head: k('kh', [4.3, END], { from: 'opacity:0;transform:translateY(1.5cqw)', to: 'opacity:1;transform:none', d: 0.5 }),
    sub: k('ks', [5.0, END]),
    badge: k('kb', [5.5, END], { from: 'opacity:0;transform:scale(0.5)', to: 'opacity:1;transform:none', ease: 'cubic-bezier(.2,1.4,.4,1)', d: 0.55 }),
  }
  const wipe = sc.tween('wipe', [7.6, 9.2], 'clip-path:inset(0 0 0 100%)', 'clip-path:inset(0 0 0 0%)', { ease: 'cubic-bezier(.65,0,.35,1)', until: END })
  const arrow = (key: string, t: number) => k(key, [t, END], { from: 'opacity:0.25;transform:translateX(-0.5cqw)', to: 'opacity:1;transform:none', d: 0.4 })
  const cols = [
    { n: 'Studio', s: 'Brief, references, palette', ring: glow('g1', [0.2, 3.2]), el: (
      <div className="relative"><Photo src="latte.jpg" ratio={4 / 5} />
        <div className="absolute inset-x-[6%] bottom-[6%] flex gap-[3%]">{['#2b1608', '#6f3a17', '#c9752b', '#ebbf98', '#fbf1e6'].map((c, i) => <span key={c} className={`flex-1 rounded-[3px] ring-1 ring-black/20 ${chip(i)}`} style={{ height: 'clamp(8px, 2.2vw, 22px)', background: c, transformOrigin: 'bottom' }} />)}</div>
      </div>) },
    { n: 'Editor', s: 'Layers, masks, type, filters', ring: glow('g2', [3.2, 7.4]), el: <Kofi c={kofi} /> },
    { n: 'Effects', s: 'One photo, one click', ring: glow('g3', [7.4, END]), el: (
      <div className="relative"><Photo src="beard.jpg" ratio={4 / 5} /><div className={`absolute inset-0 ${wipe}`}><Fx kind="halftone" ratio={4 / 5} /></div></div>) },
  ]
  return (
    <div className="lpAll-root w-full h-full flex items-center justify-center gap-[2%] sm:gap-[3%] px-[5%]">
      <style>{sc.style()}</style>
      {cols.map((m, i) => (
        <Fragment key={m.n}>
          <div className="w-[26%]">
            <div className="relative rounded-xl overflow-hidden [box-shadow:var(--lp-shadow-sm)]">
              {m.el}
              <span className={`absolute inset-0 rounded-xl pointer-events-none ring-2 ring-inset ring-accent ${m.ring}`} />
              <span className="absolute inset-0 rounded-xl pointer-events-none ring-1 ring-[var(--lp-ring)]" />
            </div>
            <p className="mt-3 text-[12px] sm:text-[15px] font-semibold text-lp-fg text-center">{m.n}</p>
            <p className="hidden sm:block text-[12.5px] text-lp-faint text-center">{m.s}</p>
          </div>
          {i < 2 && <ArrowRight className={`shrink-0 text-lp-accent -mt-10 ${arrow(`a${i}`, i === 0 ? 3.0 : 7.2)}`} size={22} />}
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
  const Cell = ({ cls }: { cls: string }) => <div className={`relative overflow-hidden rounded-lg ring-1 ring-[var(--lp-ring)] bg-[#1b0f08] ${cls}`}><div className="absolute inset-0 flex items-center justify-center"><Kofi className="w-full shrink-0" /></div></div>
  return (
    <div className="w-full h-full p-[5%] grid grid-cols-4 grid-rows-2 gap-[3%]">
      <div className="row-span-2 rounded-lg overflow-hidden ring-1 ring-[var(--lp-ring)] flex items-center bg-[#1b0f08]"><Kofi className="w-full" /></div>
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
        <div key={f} className="flex items-center gap-3 rounded-lg bg-lp-panel border border-lp-line px-3 py-2.5">
          <div className="w-8 h-10 rounded overflow-hidden shrink-0"><Kofi className="h-full" /></div>
          <span className="flex-1 truncate text-[11.5px] font-mono text-lp-text">{f}</span>
          <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded border ${st === 'Approved' ? 'border-emerald-500/40 text-emerald-500' : st === 'Changes' ? 'border-amber-500/40 text-amber-500' : 'border-lp-line text-lp-dim'}`}>{st}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------- content ---------- */

/** Desktop and phone versions of a demonstration. Only the one for this screen is mounted, so one scene runs. */
function Both({ d, m }: { d: ReactNode; m: ReactNode }) {
  const [narrow, setNarrow] = useState<boolean | null>(null)
  useEffect(() => { const mq = matchMedia('(max-width: 639px)'); const on = () => setNarrow(mq.matches); on(); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on) }, [])
  if (narrow === null) return <div className="hidden sm:block">{d}</div>
  return <>{narrow ? m : d}</>
}

// Each panel is a scripted loop of real use, not a still. They only run while on screen.
const TABS = [
  { id: 'all', label: 'Voidcanvas', wide: true, art: <Suite />, caption: 'Three tools that work alone and pass work to each other. References become a palette, the palette becomes a post, the post becomes print.' },
  { id: 'studio', label: 'Studio', art: <Both d={<StudioFrame live />} m={<StudioFrame live mobile />} />, caption: 'Studio turns a brief and a few references into a palette, a direction and formats the client can sign off.' },
  { id: 'editor', label: 'Editor', art: <Both d={<EditorLive />} m={<EditorLive mobile />} />, caption: `The Editor gives you layers, masks, type, retouching and ${EFFECT_COUNT} live filters, with the shortcuts you already know.` },
  { id: 'effects', label: 'Effects', art: <Both d={<EffectsFrame live />} m={<EffectsFrame live mobile />} />, caption: 'Effects makes one photo into print dots, dither, glitch or ASCII in one click. Then send it to the Editor.' },
  { id: 'brand', label: 'Brand', art: <Both d={<KofiGuide live />} m={<KofiGuide live mobile />} />, caption: 'A full brand guideline in a few clicks: colour ramps, contrast checks, type scale, logo rules. Exported as PDF, HTML, CSS and tokens.' },
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
  // Landing-only theme. The choice is read before hydration by the script in page.tsx and kept in localStorage.
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    setTheme(document.documentElement.getAttribute('data-lp-theme') === 'light' ? 'light' : 'dark')
    return () => { document.documentElement.removeAttribute('data-lp-theme') }
  }, [])
  const flipTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'light') document.documentElement.setAttribute('data-lp-theme', 'light'); else document.documentElement.removeAttribute('data-lp-theme')
    try { localStorage.setItem('vc-landing-theme', next) } catch { /* private mode */ }
    track('landing.theme', { theme: next })
  }
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
    <main className={`lp vc-tap min-h-[100dvh] bg-lp-bg text-lp-text overflow-x-clip ${workFonts}`}>
      {/* Local nav: product name on the left, one call to action on the right. Sticks, and the CTA fills in once the hero is gone. */}
      <div className="sticky top-0 z-40 h-12 border-b border-lp-line bg-[var(--lp-nav)] backdrop-blur-xl">
        <div className="max-w-[1120px] mx-auto h-full px-5 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Logo /><PrivateBadge /></div>
          <nav aria-label="Sections" className="hidden md:flex items-center gap-6 text-[13px] text-lp-dim">
            {[['#editor', 'Editor'], ['#studio', 'Studio'], ['#effects', 'Effects'], ['#free', 'Free'], ['#questions', 'Questions']].map(([h, l]) => <a key={h} href={h} className={`hover:text-lp-fg rounded ${focus}`}>{l}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setPrivacy(true)} className={`hidden sm:flex items-center gap-1.5 h-8 px-2 rounded-md text-[13px] text-lp-dim hover:text-lp-fg ${focus}`}><Lock size={13} />Your privacy</button>
            <button onClick={flipTheme} aria-label={theme === 'dark' ? 'Switch to the light version' : 'Switch to the dark version'} title={theme === 'dark' ? 'Light version' : 'Dark version'} className={`w-8 h-8 rounded-full flex items-center justify-center text-lp-dim hover:text-lp-fg hover:bg-lp-panel ${focus}`}>{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
            <Cta where="nav">Start designing</Cta>
          </div>
        </div>
      </div>

      {/* Hero */}
      <Seen id="hero" className="relative">
        <div aria-hidden className="absolute inset-0 -z-0 overflow-hidden">
          <div className="absolute left-1/2 top-[-10%] -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-[radial-gradient(closest-side,var(--lp-glow),transparent)]" />
        </div>
        <div className="relative max-w-[1120px] mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-10 text-center">
          <Reveal>
            <p className="text-[17px] sm:text-[21px] font-semibold text-lp-text">Voidcanvas</p>
            <h1 className="mt-3 text-[44px] sm:text-[72px] lg:text-[96px] leading-[0.98] font-semibold tracking-[-0.04em] text-lp-fg">From the brief<br className="hidden sm:block" /> to the finished file.</h1>
            <p className="mt-4 text-[22px] sm:text-[32px] font-semibold tracking-[-0.02em] text-lp-muted">In one tab.</p>
          </Reveal>

          <Reveal delay={120} className="mt-8 max-w-[640px] mx-auto">
            <p className="text-[17px] sm:text-[20px] leading-relaxed text-lp-muted">
              <strong className="text-lp-fg font-semibold">A layered editor, a studio for the job around it, and one-click effects.</strong> Runs in your browser, and your files never leave it.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Cta where="hero" big>Start designing <ArrowRight size={18} /></Cta>
              <a href="#highlights" onClick={() => track('landing.cta', { where: 'hero.secondary', href: '#highlights' })} className={`inline-flex items-center gap-2 h-12 px-4 rounded-full text-[16px] text-lp-accent hover:text-lp-fg ${focus}`}>See how it works <ChevronDown size={16} /></a>
            </div>
            <button onClick={() => setPrivacy(true)} className={`mt-5 inline-flex items-center gap-2 px-3 h-9 rounded-full bg-lp-panel border border-lp-line text-[13px] text-lp-muted hover:text-lp-fg hover:border-lp-faint ${focus}`}><Lock size={14} className="text-lp-accent" />Free. No account. No cloud. Private by default.</button>
          </Reveal>

          <Showcase />

          {latest.length > 0 && (
            <div className="mt-12 text-left">
              <h2 className="text-[13px] font-semibold text-lp-text mb-3">Pick up where you left off</h2>
              <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0">
                {latest.map(it => (
                  <Link key={it.kind + it.id} href={it.kind === 'design' ? `/editor?project=${it.id}` : `/studio?job=${it.id}`} onClick={() => track('landing.cta', { where: 'recent', kind: it.kind })} className={`shrink-0 w-[150px] rounded-xl overflow-hidden bg-lp-panel border border-lp-line hover:border-lp-faint ${focus}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <span className="block aspect-[4/3] bg-void-950 flex items-center justify-center">{it.thumb ? <img src={it.thumb} alt="" className="w-full h-full object-contain" /> : <span className="text-lp-faint text-[12px]">Job</span>}</span>
                    <span className="block px-2.5 py-2"><span className="block text-[12.5px] font-medium truncate">{it.name}</span><span className={`block text-[11.5px] truncate ${it.kind === 'job' ? 'text-lp-accent' : 'text-lp-faint'}`}>{it.kind === 'job' ? `${it.sub} →` : it.sub}</span></span>
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
            <a href={`${APP}/editor`} onClick={() => track('landing.cta', { where: 'highlights.film', href: 'demo' })} className={`inline-flex items-center gap-2 text-[15px] text-lp-accent hover:text-lp-fg ${focus}`}><span className="w-9 h-9 rounded-full bg-lp-panel flex items-center justify-center"><Play size={14} className="ml-0.5" /></span>Watch the 60-second demo</a>
          </Reveal>
          <Reveal delay={80} className="mt-8 sm:mt-10">
            <div className="flex justify-center">
              <div role="tablist" aria-label="Highlights" className="inline-flex max-w-full overflow-x-auto no-scrollbar p-1 rounded-full bg-lp-panel border border-lp-line">
                {TABS.map((t, i) => (
                  <button key={t.id} role="tab" aria-selected={i === tab} onClick={() => { setTab(i); track('landing.tab', { id: t.id }) }}
                    className={`shrink-0 h-8 px-4 rounded-full text-[13px] font-medium transition-all ${focus} ${i === tab ? 'bg-lp-btn text-lp-btn-fg shadow' : 'text-lp-dim hover:text-lp-fg'}`}>{t.label}</button>
                ))}
              </div>
            </div>
            <Panel key={active.id} art={active.art} caption={active.caption} wide={'wide' in active && active.wide} />
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
              <Reveal key={c.t} delay={i * 80} className="rounded-[28px] bg-lp-card border border-lp-line p-7 sm:p-8 flex flex-col text-center items-center">
                <span className="w-12 h-12 rounded-full bg-lp-panel border border-lp-line flex items-center justify-center text-lp-accent">{i === 0 ? <ArrowRight size={18} /> : i === 1 ? <Lock size={18} /> : <span className="text-[15px] font-bold">V</span>}</span>
                <h3 className="mt-5 text-[13px] font-semibold text-lp-dim">{c.k}</h3>
                <p className="mt-1 text-[26px] font-semibold tracking-tight text-lp-fg">{c.t}</p>
                <p className="mt-3 text-[14.5px] text-lp-dim leading-relaxed">{c.b}</p>
                {c.href.startsWith('#')
                  ? <div className="mt-auto pt-6"><button onClick={() => { setPrivacy(true); track('landing.cta', { where: c.where, href: 'privacy' }) }} className={`inline-flex items-center gap-1.5 h-9 text-[14px] font-medium text-lp-accent hover:text-lp-fg ${focus}`}>{c.cta} <ArrowRight size={14} /></button></div>
                  : <div className="mt-auto pt-6"><Cta href={c.href} where={c.where}>{c.cta}</Cta></div>}
              </Reveal>
            ))}
          </div>
        </div>
      </Seen>

      {/* Editor */}
      <Seen id="editor" className="pt-28 sm:pt-40">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 mb-10 sm:mb-14"><Reveal className="rounded-[28px] overflow-hidden border border-lp-line aspect-[16/10] bg-void-950"><EditorFrame piece={<Kofi />} layers={[{ name: 'SLOW MORNING', kind: 'text' }, { name: 'Opens 04.10', kind: 'shape' }, { name: 'Tagline', kind: 'text' }, { name: 'Fade to roast', kind: 'shape' }, { name: 'Warmth', kind: 'adjust' }, { name: 'latte.jpg', kind: 'image' }]} /></Reveal></div>
        <ModuleHead id="editor" name="Editor" mark="V" href="/editor" cta="Open the Editor" headline={<>Photoshop’s power.<br />None of the friction.</>}>
          <strong className="text-lp-fg">Design and retouch with layers, masks and type</strong> in a layout designers already know: menu bar, tool rail, options bar, dock. Nothing to install, nothing to sign in to, and it opens in the time it takes to read this sentence.
        </ModuleHead>
        <div className="mt-10 sm:mt-14"><Gallery id="editor" items={EDITOR} /></div>
      </Seen>

      {/* Studio */}
      <Seen id="studio" className="pt-28 sm:pt-40">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 mb-10 sm:mb-14"><Reveal className="rounded-[28px] overflow-hidden border border-lp-line aspect-[16/10] bg-void-950"><StudioFrame /></Reveal></div>
        <ModuleHead id="studio" name="Studio" mark="S" href="/studio" cta="Open Studio" headline={<>From the brief<br />to the sign-off.</>}>
          Studio is for the job around the design. <strong className="text-lp-fg">Brief, references, directions, formats, review and delivery</strong>, in one place, with the client’s answer recorded next to the work. Then one click opens it all in the Editor.
        </ModuleHead>
        <div className="mt-10 sm:mt-14"><Gallery id="studio" items={STUDIO} /></div>
      </Seen>

      {/* Effects */}
      <Seen id="effects" className="pt-28 sm:pt-40">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 mb-10 sm:mb-14"><Reveal className="rounded-[28px] overflow-hidden border border-lp-line aspect-[16/10] bg-void-950"><EffectsFrame /></Reveal></div>
        <ModuleHead id="effects" name="Effects" mark="E" href="/effects" cta={`See all ${EFFECT_COUNT} effects`} headline={<>One photo.<br />One click.</>}>
          <strong className="text-lp-fg">{EFFECT_COUNT} effects across artistic, stylise, colour, distortion and texture.</strong> Halftone, dither, glitch, ASCII, pixel sort, CRT, duotone and more. Export straight away, or send the result to the Editor and keep going.
        </ModuleHead>
        <div className="mt-10 sm:mt-14"><Gallery id="effects" items={EFFECTS} /></div>
      </Seen>

      {/* Privacy band */}
      <Seen id="privacy" className="pt-28 sm:pt-40">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8">
          <Reveal className="rounded-[32px] bg-lp-card border border-lp-line px-6 sm:px-12 py-12 sm:py-16 text-center">
            <Eyebrow>Your privacy</Eyebrow>
            <H2 className="mt-3">Your files don’t leave your browser.</H2>
            <p className="mt-5 text-[17px] text-lp-muted max-w-[640px] mx-auto leading-relaxed">Everything runs on your device. Designs are saved in the browser’s own database, and a private session keeps them in memory only. There is no server holding your work, because there is no server.</p>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-[640px] mx-auto">
              {[['0', 'uploads'], ['0', 'accounts'], ['0', 'servers with your files']].map(([n, l]) => <div key={l}><p className="text-[40px] sm:text-[56px] font-semibold tracking-[-0.04em] text-lp-fg leading-none">{n}</p><p className="mt-2 text-[13px] sm:text-[14px] text-lp-dim">{l}</p></div>)}
            </div>
            <button onClick={() => { setPrivacy(true); track('landing.cta', { where: 'privacy', href: 'privacy' }) }} className={`mt-10 inline-flex items-center gap-1.5 text-[15px] font-medium text-lp-accent hover:text-lp-fg ${focus}`}>Exactly what is and isn’t sent <ArrowRight size={15} /></button>
          </Reveal>
        </div>
      </Seen>

      {/* Final call */}
      <Seen id="start" className="pt-28 sm:pt-40">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 text-center">
          <Reveal>
            <H2>Open a tab. Start designing.</H2>
            <p className="mt-4 text-[17px] text-lp-dim">No sign-up form between you and the canvas.</p>
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
          <ul className="mt-10 border-t border-lp-line">
            {QA.map(([q, a], i) => (
              <li key={q} className="border-b border-lp-line">
                <button aria-expanded={open === i} aria-controls={`qa-${i}`} onClick={() => { setOpen(open === i ? null : i); track('landing.faq', { q: i }) }} className={`w-full flex items-start justify-between gap-6 py-5 text-left ${focus}`}>
                  <span className="text-[17px] sm:text-[19px] font-semibold tracking-tight text-lp-fg">{q}</span>
                  <ChevronDown size={20} className={`shrink-0 mt-1 text-lp-dim transition-transform ${open === i ? 'rotate-180' : ''}`} />
                </button>
                <div id={`qa-${i}`} className={`grid transition-[grid-template-rows] duration-300 ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden"><p className="pb-6 text-[15.5px] text-lp-dim leading-relaxed max-w-[680px]">{a}</p></div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Seen>

      {/* Footer: a quiet closing layer. Links, a feedback form, who makes it, the fine print. */}
      <footer className="mt-20 sm:mt-28 border-t border-lp-line text-lp-dim">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8">
          <div className="grid gap-x-8 gap-y-7 py-9 md:grid-cols-12">
            <div className="md:col-span-3">
              <div className="flex items-center gap-2.5 text-lp-fg"><Logo compact /><span className="text-[14px] font-semibold tracking-tight">Voidcanvas</span></div>
              <p className="mt-3 text-[13px] leading-relaxed max-w-[260px]">A free design suite in your browser. Brand work in Studio, layouts in the Editor, image treatments in Effects.</p>
              <Cta where="footer" className="mt-4 !h-8 !px-3.5 !text-[13px]">Start designing <ArrowRight size={13} /></Cta>
            </div>
            <nav aria-label="Footer" className="md:col-span-5 grid grid-cols-3 gap-4 text-[13px]">
              {FOOTER_LINKS.map(([head, links]) => (
                <div key={head}>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lp-faint">{head}</h3>
                  <ul className="mt-2.5 space-y-1.5">
                    {links.map(([label, href]) => (
                      <li key={label}>
                        {href === '#privacy' ? <button onClick={() => { setPrivacy(true); track('landing.footer', { to: 'privacy' }) }} className={`hover:text-lp-fg rounded ${focus}`}>{label}</button>
                          : href.startsWith('http') ? <a href={href} target="_blank" rel="noopener" onClick={() => track('landing.footer', { to: href })} className={`inline-flex items-center gap-0.5 hover:text-lp-fg rounded ${focus}`}>{label}<ArrowUpRight size={11} aria-hidden /></a>
                          : <Link href={href} onClick={() => track('landing.footer', { to: href })} className={`hover:text-lp-fg rounded ${focus}`}>{label}</Link>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            <div className="md:col-span-4"><FeedbackForm /></div>
          </div>

          {/* Maker: one line. Notes: three short columns. */}
          <div className="border-t border-lp-line py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 text-[12px] leading-relaxed">
            <MotionPlayLabsLogo className="w-10 h-10 shrink-0 text-lp-fg" />
            <p className="text-lp-text sm:flex-1"><span className="text-lp-fg font-semibold">MotionPlay Labs</span>, a design and software studio between Lagos and Kent, makes Voidcanvas as the follow-up to <a href="https://artdirectorstudio.com" target="_blank" rel="noopener" className={`underline underline-offset-2 decoration-[var(--lp-line)] hover:text-lp-fg rounded ${focus}`}>Art Director Studio</a>.</p>
            <p className="text-[11px] text-lp-faint sm:text-right sm:max-w-[300px]">MotionPlay Labs Ltd. England and Wales no. 17304660. Nigeria CAC RC 9621200.</p>
          </div>
          <ol className="border-t border-lp-line py-5 grid sm:grid-cols-3 gap-x-6 gap-y-2.5 text-[11px] leading-relaxed text-lp-faint">
            {FOOTNOTES.map(([head, body], i) => <li key={head}><span className="text-lp-dim font-medium">{i + 1}. {head}. </span>{body}</li>)}
          </ol>

          <div className="border-t border-lp-line py-3.5 pb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11.5px] text-lp-faint">
            <p>© {new Date().getFullYear()} MotionPlay Labs Ltd.</p>
            <p>Free. No account. Your files stay on your device.</p>
          </div>
        </div>
      </footer>

      {privacy && <PrivacyPanel onClose={() => setPrivacy(false)} />}
    </main>
  )
}
