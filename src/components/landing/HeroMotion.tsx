'use client'
/* eslint-disable @next/next/no-img-element */

// The landing hero. The headline, and next to it one browser tab where a 15 s loop acts it out: the words of a real
// Studio brief turn into the Kofi post, the layers come apart, real effect renders wipe across the photo, the board
// becomes every format in the brief, and it ends on the exported files. Scrolling lifts the copy away, sends
// "Start designing" up into the nav, and hands the tab over to the Highlights panel below; scrolling up plays it back.
// Motion lives in hero-engine.ts; this file is the markup. Styles: the "Landing hero" block in globals.css.

import Link from 'next/link'
import { Fragment, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { ArrowRight, ChevronDown, Lock, Play } from 'lucide-react'
import { track } from '@/lib/analytics'
import { mountHero } from './hero-engine'

export interface HeroTab { id: string; label: string; art: ReactNode; caption: ReactNode }

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const PHOTO = '/landing/hero-photo.webp'
const FX = ['/landing/hero-halftone.webp', '/landing/hero-popart.webp', '/landing/hero-glitch.webp', '/landing/hero-grain.webp']
const GRAIN = FX[3]
const PALETTE = ['#2b1608', '#6f3a17', '#c9752b', '#ebbf98', '#fbf1e6']

function LockIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
}

/** The finished post as a small flat board (the formats row and the file cards). */
function MiniPost({ i }: { i: number }) {
  return (
    <div className="hm-board hm-mini" data-hm={`mini-${i}`}>
      <img className="hm-img" data-src={GRAIN} alt="" draggable={false} />
      <div className="hm-l hm-fade" />
      <div className="hm-hd"><span className="hm-hdl">SLOW</span><span className="hm-hdl">MORNING</span></div>
      <div className="hm-tag">Roasted in Yaba. Poured from 6am.</div>
      <span className="hm-eye1">KOFI · EST. LAGOS</span><span className="hm-eye2">№ 01</span>
      <span className="hm-badge">OPENS<br />04.10</span>
    </div>
  )
}

function Keyword({ k, children, solid }: { k: string; children: ReactNode; solid?: boolean }) {
  return (
    <span className="hm-kw" data-hm={`kw-${k}`}>
      <span className="hm-hl" data-hm={`hl-${k}`} />
      {solid && <span className="hm-hls" data-hm={`hls-${k}`} />}
      <span className="hm-kt" data-hm={`kt-${k}`}>{children}</span>
    </span>
  )
}

function Fly({ k, children }: { k: string; children: ReactNode }) {
  return <div className="hm-fly" data-hm={`fly-${k}`}><span className="hm-flyhl" /><span className="hm-flyt" data-hm={`flyt-${k}`}>{children}</span></div>
}

/** The browser tab and everything that happens in it. Drawn at 800 x 1000 and scaled by the engine. */
function Stage() {
  const layerRows: [string, string?][] = [['Badge', '#c9752b'], ['KOFI · EST. LAGOS'], ['Tagline'], ['SLOW MORNING'], ['Fade to roast', 'linear-gradient(#6f3a17,#1b0f08)'], ['Film Grain', '#3a3450'], ['Warmth', '#3a3450'], ['latte.jpg', '#6f3a17']]
  return (
    <div className="hm-stagewrap" data-hm="stagewrap" aria-hidden>
      <div className="hm-frame" data-hm="frame">
        <div className="hm-chrome">
          <span className="hm-dots"><i /><i /><i /></span>
          <span className="hm-url"><LockIcon />voidcanvas.app/<span className="hm-path"><span data-hm="path-0">studio</span><span data-hm="path-1">editor</span><span data-hm="path-2">effects</span></span></span>
        </div>
        <div className="hm-appbar">
          <span className="hm-job"><span className="hm-vt">V</span><span className="hm-jobname">Kofi · Launch</span></span>
          <span className="hm-switch"><span className="hm-sind" data-hm="sind" /><span className="hm-seg" data-hm="seg-0">Studio</span><span className="hm-seg" data-hm="seg-1">Editor</span><span className="hm-seg" data-hm="seg-2">Effects</span></span>
          <span className="hm-exp" data-hm="exp">Export</span>
        </div>
        <div className="hm-content" data-hm="content">
          <div className="hm-cam" data-hm="cam">
            <div className="hm-slam4bg" data-hm="slam4bg" />
            <div className="hm-brief">
              <div className="hm-blbl" data-hm="brief-lbl">BRIEF</div>
              <p className="hm-p" data-hm="brief-p">
                Launch a specialty <Keyword k="coffee">coffee bar</Keyword> in <Keyword k="yaba">Yaba</Keyword>. <Keyword k="warm">Warm</Keyword>, premium, <Keyword k="quiet">quietly confident</Keyword>. <Keyword k="insta" solid>Instagram first</Keyword>, A5 flyers, one window poster. Avoid the usual green.
              </p>
            </div>
            <div className="hm-card" data-hm="card-0"><span className="hm-fn">kofi_launch_story_v2.png</span><span className="hm-fm">1080 × 1920 · PNG</span></div>
            <div className="hm-card" data-hm="card-1"><span className="hm-fn">kofi_launch_a5-flyer_v1.pdf</span><span className="hm-fm">148 × 210 mm · PDF</span></div>
            <div className="hm-card" data-hm="card-2"><span className="hm-fn">kofi_launch_window-poster_v1.pdf</span><span className="hm-fm">18 × 24 in · PDF</span></div>
            <div className="hm-board" data-hm="board">
              <div className="hm-l" data-hm="L-photo">
                <img className="hm-img" data-hm="img-photo" src={PHOTO} alt="" draggable={false} />
                {FX.map((src, i) => <img key={src} className="hm-img hm-fx" data-hm={`fx-${i}`} data-src={src} alt="" draggable={false} />)}
                <span className="hm-wline" data-hm="wline" />
                <span className="hm-lchip" data-hm="chip-0" style={{ left: 14, top: 14 }}><i />latte.jpg</span>
              </div>
              <div className="hm-l hm-fade" data-hm="L-fade"><span className="hm-lchip" data-hm="chip-1" style={{ left: 14, top: 190 }}><i />Fade to roast</span></div>
              <div className="hm-l" data-hm="L-head">
                <div className="hm-hd"><span className="hm-hdl">{'SLOW'.split('').map((c, i) => <span key={i}>{c}</span>)}</span><span className="hm-hdl">{'MORNING'.split('').map((c, i) => <span key={i}>{c}</span>)}</span></div>
                <span className="hm-lchip" data-hm="chip-2" style={{ left: 22, top: 222 }}><i />SLOW MORNING</span>
              </div>
              <div className="hm-l" data-hm="L-tag">
                <div className="hm-tag"><span data-hm="tag-a">Roasted in </span><span data-hm="tag-y">Yaba</span><span data-hm="tag-b">. Poured from 6am.</span></div>
                <span className="hm-lchip" data-hm="chip-3" style={{ left: 26, bottom: 86 }}><i />Tagline</span>
              </div>
              <div className="hm-l" data-hm="L-eye">
                <span className="hm-eye1" data-hm="eye-a">KOFI · EST. LAGOS</span><span className="hm-eye2" data-hm="eye-b">№ 01</span>
                <span className="hm-lchip" data-hm="chip-4" style={{ right: 14, top: 52 }}><i />KOFI · EST. LAGOS</span>
              </div>
              <div className="hm-l" data-hm="L-badge">
                <span className="hm-badge" data-hm="badge">OPENS<br />04.10</span>
                <span className="hm-lchip" data-hm="chip-5" style={{ right: 20, bottom: 138 }}><i />Badge</span>
              </div>
              <span className="hm-flash" data-hm="flash" />
            </div>
            <MiniPost i={1} />
            <MiniPost i={2} />
            <div className="hm-card" data-hm="card-3"><span className="hm-fn" data-hm="fname">kofi_launch_ig-post_v2.png</span><span className="hm-fm" data-hm="fmeta">1080 × 1350 · PNG</span></div>
            <MiniPost i={0} />
            {PALETTE.map((c, i) => <span key={c} className="hm-sw" data-hm={`sw-${i}`} style={{ left: 256 + i * 60, background: c }} />)}
            <div className="hm-blabel" data-hm="blabel">
              <span className="hm-blbg" data-hm="blbg" />
              {[['Instagram post', '1080 × 1350'], ['Story or Reel cover', '1080 × 1920'], ['A5 flyer', '1748 × 2480'], ['Poster 18 × 24 in', '5400 × 7200']].map(([n, s], i) => (
                <span key={n} className="hm-blv" data-hm={`bl-${i}`}>{n} <em>{s}</em></span>
              ))}
            </div>
            <div className="hm-fxl" data-hm="fxl">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>
              <span className="hm-fxvs">{['Halftone', 'Pop Art', 'Glitch', 'Film Grain'].map((n, i) => <span key={n} data-hm={`fxv-${i}`}>{n}</span>)}</span>
              <span className="hm-fxns"><span data-hm="fxn-0">58 effects</span><span data-hm="fxn-1">Open in Editor</span></span>
            </div>
            {[['Instagram post', 111], ['Story', 306], ['A5 flyer', 488], ['Poster', 695]].map(([n, x], i) => <span key={n} className="hm-fanl" data-hm={`fanl-${i}`} style={{ left: x as number }}>{n}</span>)}
            <Fly k="coffee">coffee bar</Fly>
            <Fly k="yaba">Yaba</Fly>
            <Fly k="warm">Warm</Fly>
            <Fly k="quiet">quietly confident</Fly>
            <Fly k="insta">Instagram first</Fly>
            <span className="hm-check" data-hm="check"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
            <div className="hm-note" data-hm="note">4 files · saved on this device</div>
          </div>
          <div className="hm-slam" data-hm="slam-0" style={{ background: '#fbf1e6', color: '#2b1608' }}><span data-hm="slamt-0" style={{ fontSize: 150 }}>Coffee bar.</span></div>
          <div className="hm-slam" data-hm="slam-1" style={{ background: '#c9752b', color: '#fbf1e6' }}><span data-hm="slamt-1" style={{ fontSize: 260 }}>Warm.</span></div>
          <div className="hm-slam" data-hm="slam-2" style={{ background: '#2b1608', color: '#fbf1e6' }}><span data-hm="slamt-2" style={{ fontSize: 138 }}>Quietly<br />confident.</span></div>
          <div className="hm-seam" data-hm="seam" />
        </div>
        <div className="hm-side hm-side-l" data-hm="side-l">
          <div className="hm-sg" data-hm="sg-0">
            <div className="hm-sh">Kofi · Launch</div>
            {['Brief', 'References', 'Directions', 'Formats', 'Review', 'Deliver'].map((n, i) => <span key={n} className={`hm-sr ${i === 0 ? 'on' : ''}`} style={{ top: 46 + i * 50 }}><i />{n}</span>)}
          </div>
          <div className="hm-sg" data-hm="sg-1" style={{ opacity: 0 }}>
            <div className="hm-sh">Layers</div>
            {layerRows.map(([n, bg], i) => <span key={n} className="hm-sr" data-hm={`row-${i}`}><i style={bg ? { background: bg, borderRadius: i === 0 ? '50%' : undefined } : undefined} />{n}</span>)}
          </div>
          <div className="hm-sg" data-hm="sg-2" style={{ opacity: 0 }}>
            <div className="hm-sh">Effects <span className="hm-pdim">58</span></div>
            <span className="hm-fxact" data-hm="fxact" />
            {['Halftone', 'Pop Art', 'Glitch', 'Film Grain', 'Dither', 'Duotone', 'Pixel Sort', 'Crosshatch'].map((n, i) => <span key={n} className="hm-sr" style={{ top: 46 + i * 50 }}><i />{n}</span>)}
          </div>
        </div>
        <div className="hm-side hm-side-r" data-hm="side-r">
          <div className="hm-sg">
            <div className="hm-sh">Board</div>
            <div className="hm-pgrid">{['Instagram post', 'Story or Reel cover', 'A5 flyer', 'Poster 18 × 24 in'].map((n, i) => <span key={n} data-hm={`pb-${i}`} style={{ opacity: i ? 0 : 1 }}>{n}</span>)}</div>
            <div className="hm-pgap" />
            <div className="hm-sh">Palette</div>
            <div className="hm-psw">{PALETTE.map((c, i) => <i key={c} data-hm={`psw-${i}`} style={{ background: c }} />)}</div>
            <div className="hm-pgap" />
            <div className="hm-sh">Filter</div>
            <div className="hm-pgrid">{['None', 'Halftone', 'Pop Art', 'Glitch', 'Film Grain'].map((n, i) => <span key={n} data-hm={`pf-${i}`} className={i ? '' : 'hm-pdim'} style={{ opacity: i ? 0 : 1 }}>{n}</span>)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HeroMotion({ tabs, tab, onTab, onPrivacy, recents }: {
  tabs: HeroTab[]
  tab: number
  onTab: (i: number) => void
  onPrivacy: () => void
  /** "Pick up where you left off", for people coming back. Sits in the hero so it stays on the first screens. */
  recents?: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const tabRef = useRef(tab)
  tabRef.current = tab
  const panel = useRef<HTMLElement>(null)
  const [play, setPlay] = useState(false)

  useEffect(() => {
    const el = root.current; if (!el) return
    document.documentElement.classList.add('hm-page')
    const unmount = mountHero(el, { getTab: () => tabRef.current, onHighlights: () => track('landing.section', { id: 'highlights' }) })
    return () => { unmount(); document.documentElement.classList.remove('hm-page') }
  }, [])

  // Another tab's demo plays only while the panel is on screen, like the rest of the page.
  useEffect(() => {
    const el = panel.current; if (!el) return
    const io = new IntersectionObserver(([e]) => setPlay(e.isIntersecting), { threshold: 0.35 })
    io.observe(el); return () => io.disconnect()
  }, [])

  const caption = (id: string) => tabs.find(t => t.id === id)?.caption
  const x = (i: number) => ({ '--i': i } as CSSProperties)
  const toPanel = (e: MouseEvent) => {
    e.preventDefault()
    track('landing.cta', { where: 'hero.secondary', href: '#highlights' })
    document.getElementById('highlights')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const pick = (i: number) => {
    onTab(i)
    if (i === 0) root.current?.dispatchEvent(new CustomEvent('hm:restart'))
  }
  const current = tabs[tab]

  return (
    <div ref={root} className="hm">
      <div className="hm-track" data-hm="track">
        <div className="hm-pin" data-hm="pin">
          <span className="hm-glow-t" data-hm="glow-t" aria-hidden />
          <span className="hm-glow" data-hm="glow-a" aria-hidden />
          <span className="hm-glow hm-glow-b" data-hm="glow-b" aria-hidden />
          <div className="hm-mq" data-hm="mq" aria-hidden><span>Studio</span><b>Editor</b><span>Effects</span><b>Studio</b><span>Editor</span><b>Effects</b></div>

          <div className="hm-hero" data-hm="hero">
            <div className="hm-hero-in">
              <div className="hm-copy">
                <p className="hm-eyebrow hm-in" data-hm-x="0" style={x(0)}>Voidcanvas</p>
                <h1 className="hm-h1">
                  <span className="hm-w hm-in" data-hm-x="1" style={x(1)}>From</span>{' '}
                  <span className="hm-w hm-in" data-hm-x="2" style={x(2)}>the</span>{' '}
                  <span className="hm-w hm-in" data-hm-x="3" style={x(3)}>brief<span className="hm-u" data-hm="u-brief" /></span>
                  <br className="hm-brd" />{' '}
                  <span className="hm-w hm-in" data-hm-x="4" style={x(4)}>to</span>
                  <br className="hm-brm" />{' '}
                  <span className="hm-w hm-in" data-hm-x="5" style={x(5)}>the</span>{' '}
                  <span className="hm-w hm-in" data-hm-x="6" style={x(6)}>finished file.<span className="hm-u" data-hm="u-file" /></span>
                </h1>
                <p className="hm-tab hm-in" data-hm-x="7" style={x(7)}>In one tab.</p>
                <p className="hm-sub hm-in" data-hm-x="8" style={x(8)}>
                  <strong>A layered editor, a studio for the job around it, and one-click effects.</strong> Runs in your browser, and your files never leave it.
                </p>
                <div className="hm-ctas">
                  <span className="hm-ctaw hm-in" data-hm="cta" style={x(9)}>
                    <span className="hm-ring" data-hm="cta-ring" />
                    <Link href="/editor" onClick={() => track('landing.cta', { where: 'hero', href: '/editor' })} className={`hm-cta ${focus}`}>
                      <span className="hm-sheen" data-hm="cta-sheen" />
                      <span className="hm-ctat">Start designing</span>
                      <ArrowRight size={19} strokeWidth={2.2} data-hm="cta-arrow" aria-hidden />
                    </Link>
                  </span>
                  <a href="#highlights" onClick={toPanel} className={`hm-ghost hm-in ${focus}`} data-hm-x="9" style={x(10)}>See how it works <ChevronDown size={16} /></a>
                </div>
                {recents && <div className="hm-recents hm-in" data-hm-x="10" style={x(11)}>{recents}</div>}
                <button type="button" onClick={onPrivacy} className={`hm-pill hm-in ${focus}`} data-hm-x="11" style={x(12)}><Lock size={14} />Free. No account. No cloud. Private by default.</button>
              </div>
              <div className="hm-slot hm-slot-hero" data-hm="slot-hero" aria-hidden />
            </div>
          </div>

          <div className="hm-next" data-hm="next">
            <div className="hm-next-in">
              <div className="hm-next-head">
                <h2 className="hm-h2">
                  {['Meet', 'the', 'tools.'].map((w, i) => <Fragment key={w}><span className="hm-m"><span data-hm-y={i}>{w}</span></span>{i < 2 ? ' ' : ''}</Fragment>)}
                  <br />
                  {['Three', 'of', 'them,', 'and', 'they', 'talk.'].map((w, i) => <Fragment key={w}><span className="hm-m"><span data-hm-y={i + 3}>{w}</span></span>{i < 5 ? ' ' : ''}</Fragment>)}
                </h2>
                <a href="/editor" data-hm="demo" onClick={() => track('landing.cta', { where: 'highlights.film', href: 'demo' })} className={`hm-demo ${focus}`}><span className="w-9 h-9 rounded-full bg-lp-panel flex items-center justify-center"><Play size={14} className="ml-0.5" /></span>Watch the 60-second demo</a>
              </div>
              <div role="tablist" aria-label="Highlights" className="hm-pills no-scrollbar" data-hm="pills">
                {tabs.map((t, i) => {
                  const loopIndex = ['studio', 'editor', 'effects'].indexOf(t.id)
                  return (
                    <button key={t.id} type="button" role="tab" id={`hm-tab-${t.id}`} aria-selected={i === tab} aria-controls="hm-panel" onClick={() => pick(i)} className={focus}>
                      {t.label}
                      {loopIndex >= 0 && <span className="hm-dot" data-hm={`pdot-${loopIndex}`} aria-hidden />}
                    </button>
                  )
                })}
              </div>
              <figure ref={panel} role="tabpanel" id="hm-panel" aria-labelledby={`hm-tab-${current.id}`} className={`hm-panel ${play ? 'lp-play' : ''}`}>
                <div className="hm-slot-panel" data-hm="slot-panel">
                  {tab !== 0 && <div key={current.id} className="hm-art">{current.art}</div>}
                </div>
                <figcaption className="hm-caps" data-hm="caps">
                  {['studio', 'editor', 'effects'].map((id, i) => <span key={id} data-hm={`cap-${i}`} aria-hidden={tab !== 0}>{caption(id)}</span>)}
                  {tab !== 0 && <span>{current.caption}</span>}
                </figcaption>
              </figure>
            </div>
          </div>

          <Stage />
        </div>
        <div id="highlights" className="hm-anchor" aria-hidden />
      </div>
    </div>
  )
}
