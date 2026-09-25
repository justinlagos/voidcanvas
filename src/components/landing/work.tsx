/* eslint-disable @next/next/no-img-element */
// Finished design work, built as real layouts on real photographs. These are the pieces the product page shows
// when it needs to prove what comes out of Voidcanvas. Each one is a self-contained composition that scales with
// its container (all sizes are in container-query units, so a piece looks the same at 120px or 1200px wide).
// Photos: public/landing/*.jpg (Unsplash licence). Effect outputs are real renders of those photos.

import { Bebas_Neue, Instrument_Serif } from 'next/font/google'
import type { CSSProperties, ReactNode } from 'react'
import { Scene } from './motion'

export const display = Bebas_Neue({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--font-display' })
export const serif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], display: 'swap', variable: '--font-serif', adjustFontFallback: false })
export const workFonts = `${display.variable} ${serif.variable}`

const D: CSSProperties = { fontFamily: 'var(--font-display), Impact, sans-serif' }
const S: CSSProperties = { fontFamily: 'var(--font-serif), Georgia, serif' }
const M: CSSProperties = { fontFamily: 'var(--font-mono), monospace' }

/** A fixed-ratio canvas that sets up container query units. `ratio` is width / height. */
function Piece({ ratio, className = '', children, style }: { ratio: number; className?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className={`relative overflow-hidden select-none ${className}`} style={{ aspectRatio: `${ratio}`, containerType: 'inline-size', ...style }}>
      {children}
    </div>
  )
}

const Img = ({ src, className = '', style }: { src: string; className?: string; style?: CSSProperties }) => (
  <img src={`/landing/${src}`} alt="" draggable={false} className={`absolute inset-0 w-full h-full object-cover ${className}`} style={style} />
)

/* ---------- the work ---------- */

/** Kofi: a Lagos coffee brand launch. Instagram post, 4:5. */
export function Kofi({ className = '', c }: { className?: string; c?: { grad: string; eyebrow: string; head: string; sub: string; badge: string } }) {
  return (
    <Piece ratio={4 / 5} className={`bg-[#1b0f08] ${className}`}>
      <Img src="latte.jpg" style={{ objectPosition: '50% 40%' }} />
      <div className={`absolute inset-0 bg-[linear-gradient(180deg,rgba(27,15,8,0.05)_35%,rgba(27,15,8,0.92)_100%)] ${c?.grad ?? ''}`} />
      <div className={`absolute ${c?.eyebrow ?? ''}`} style={{ left: '6cqw', top: '5cqw', ...M, fontSize: '2.6cqw', letterSpacing: '0.18em', color: '#f1e3c9' }}>KOFI · EST. LAGOS</div>
      <div className={`absolute ${c?.eyebrow ?? ''}`} style={{ right: '6cqw', top: '5cqw', ...M, fontSize: '2.6cqw', letterSpacing: '0.18em', color: '#f1e3c9' }}>№ 01</div>
      <div className={`absolute ${c?.head ?? ''}`} style={{ left: '5cqw', bottom: '20cqw', ...D, fontSize: '29cqw', lineHeight: 0.84, color: '#f7f2ea', letterSpacing: '0.01em' }}>SLOW<br />MORNING</div>
      <div className={`absolute ${c?.sub ?? ''}`} style={{ left: '6cqw', bottom: '8cqw', ...S, fontStyle: 'italic', fontSize: '5.2cqw', color: '#f1e3c9', lineHeight: 1.1 }}>Roasted in Yaba. Poured from 6am.</div>
      <div className={`absolute rounded-full flex items-center justify-center ${c?.badge ?? ''}`} style={{ right: '6cqw', bottom: '8cqw', width: '17cqw', height: '17cqw', background: '#c9752b', ...M, fontSize: '2.4cqw', color: '#1b0f08', textAlign: 'center', lineHeight: 1.2, rotate: '-12deg' }}>OPENS<br />04.10</div>
    </Piece>
  )
}

/** OYA: an independent fashion magazine. Cover, 3:4. */
export function Oya({ className = '' }: { className?: string }) {
  return (
    <Piece ratio={3 / 4} className={`bg-[#0c0c0e] ${className}`}>
      <div className="absolute inset-x-0 text-center" style={{ top: '3cqw', ...D, fontSize: '40cqw', lineHeight: 0.9, color: '#f7f7f8', letterSpacing: '0.02em' }}>OYA</div>
      <Img src="portrait-pattern.jpg" style={{ top: '24cqw', height: 'auto', objectPosition: '50% 0%' }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_60%,rgba(12,12,14,0.85)_100%)]" />
      <div className="absolute" style={{ left: '6cqw', top: '52cqw', ...S, fontStyle: 'italic', fontSize: '7cqw', color: '#fff', lineHeight: 1.05, width: '46cqw', textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>The new<br />Lagos tailors</div>
      <div className="absolute" style={{ right: '6cqw', top: '52cqw', textAlign: 'right', ...M, fontSize: '2.4cqw', letterSpacing: '0.16em', color: '#fff', lineHeight: 1.6 }}>ISSUE 07<br />HARMATTAN 2026</div>
      <div className="absolute" style={{ left: '6cqw', bottom: '7cqw', ...M, fontSize: '2.6cqw', letterSpacing: '0.14em', color: '#f7f7f8', lineHeight: 1.7 }}>ADAEZE ON HERITAGE CLOTH<br />THE 40-PAGE ANKARA PORTFOLIO<br />WHY EVERYONE MOVED TO LEKKI</div>
      <div className="absolute" style={{ right: '6cqw', bottom: '7cqw', ...D, fontSize: '6cqw', color: '#8b7cff' }}>₦4,500</div>
    </Piece>
  )
}

/** MOVE: a streetwear drop. Square, 1:1. */
export function Move({ className = '' }: { className?: string }) {
  return (
    <Piece ratio={1} className={`bg-[#f5c400] ${className}`}>
      <div className="absolute" style={{ left: '-2cqw', top: '-4cqw', ...D, fontSize: '62cqw', lineHeight: 0.85, color: '#0c0c0e', letterSpacing: '-0.02em' }}>MOVE</div>
      <Img src="yellow.jpg" style={{ left: '34cqw', top: '18cqw', width: '58cqw', height: '78cqw', objectPosition: '50% 20%' }} />
      <div className="absolute" style={{ left: '6cqw', bottom: '30cqw', ...S, fontStyle: 'italic', fontSize: '8cqw', color: '#0c0c0e', lineHeight: 1 }}>Drop 03</div>
      <div className="absolute" style={{ left: '6cqw', bottom: '8cqw', ...M, fontSize: '2.6cqw', letterSpacing: '0.16em', color: '#0c0c0e', lineHeight: 1.7 }}>TRACKSUIT · CANARY<br />LIMITED TO 200<br />SAT 10AM WAT</div>
      <div className="absolute" style={{ right: '4cqw', bottom: '4cqw', ...D, fontSize: '5cqw', color: '#0c0c0e', writingMode: 'vertical-rl' }}>MOVE.NG</div>
    </Piece>
  )
}

/** Night Sessions: a concert poster. 2:3. */
export function Sessions({ className = '', c }: { className?: string; c?: { grad: string; curves: string; eyebrow: string; l1: string; l2: string; l3: string; caret: string; lineup: string; foot: string; grain: string; box: string } }) {
  const line = (cls: string, text: string) => <span className={`block ${cls}`} style={{ transformOrigin: 'left' }}>{text}</span>
  return (
    <Piece ratio={2 / 3} className={`bg-[#07070a] ${className}`}>
      <Img src="smoke.jpg" className="opacity-90" style={{ objectPosition: '50% 30%' }} />
      <div className={`absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,10,0.1)_0%,rgba(7,7,10,0.3)_50%,rgba(7,7,10,0.95)_100%)] ${c?.grad ?? ''}`} />
      {c && <div className={`absolute inset-0 ${c.curves}`} style={{ background: 'rgba(7,7,10,0.35)', mixBlendMode: 'multiply' }} />}
      <div className={`absolute ${c?.eyebrow ?? ''}`} style={{ left: '6cqw', top: '6cqw', ...M, fontSize: '2.6cqw', letterSpacing: '0.2em', color: '#fff' }}>LAGOS</div>
      <div className={`absolute ${c?.eyebrow ?? ''}`} style={{ right: '6cqw', top: '6cqw', ...M, fontSize: '2.6cqw', letterSpacing: '0.2em', color: '#fff' }}>VOL. IX</div>
      <div className="absolute" style={{ left: '5cqw', top: '30cqw', ...D, fontSize: '30cqw', lineHeight: 0.86, color: '#fff', letterSpacing: '-0.01em' }}>
        {c ? <>{line(c.l1, 'NIGHT')}{line(c.l2, 'SESS')}<span className="block relative">{line(c.l3, 'IONS')}<span className={`absolute ${c.caret}`} style={{ left: '100%', top: '8%', width: '0.8cqw', height: '78%', background: '#8b7cff', marginLeft: '1cqw' }} /></span></> : <>NIGHT<br />SESS<br />IONS</>}
      </div>
      <div className={`absolute ${c?.lineup ?? ''}`} style={{ left: '6cqw', bottom: '20cqw', ...S, fontSize: '5cqw', color: '#fff', lineHeight: 1.25 }}>Tems · Odumodublvck · Bloody Civilian<br /><span style={{ fontStyle: 'italic', color: '#b9afff' }}>with special guests</span></div>
      <div className={`absolute flex items-end justify-between ${c?.foot ?? ''}`} style={{ left: '6cqw', right: '6cqw', bottom: '6cqw', borderTop: '1px solid rgba(255,255,255,0.35)', paddingTop: '2.5cqw', ...M, fontSize: '2.6cqw', letterSpacing: '0.14em', color: '#fff', lineHeight: 1.6 }}>
        <span>SAT 12 DEC<br />DOORS 9PM</span><span style={{ textAlign: 'right' }}>MUSON CENTRE<br />ONIKAN</span>
      </div>
      {c && <div className={`absolute inset-0 pointer-events-none ${c.grain}`} style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.22) 0.5px, transparent 0.6px)', backgroundSize: '3px 3px', mixBlendMode: 'overlay' }} />}
      {c && <div className={`absolute ${c.box}`} style={{ left: '4cqw', top: '29cqw', width: '66cqw', height: '78cqw', outline: '1px solid #8b7cff' }}>
        {[[0, 0], [100, 0], [0, 100], [100, 100], [50, 0], [50, 100], [0, 50], [100, 50]].map(([x, y]) => <span key={`${x}${y}`} className="absolute bg-white" style={{ width: '2cqw', height: '2cqw', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', border: '1px solid #8b7cff' }} />)}
      </div>}
    </Piece>
  )
}

/** Àmì: a skincare brand. 4:5. */
export function Ami({ className = '' }: { className?: string }) {
  return (
    <Piece ratio={4 / 5} className={`bg-[#efd6d3] ${className}`}>
      <Img src="pink.jpg" style={{ objectPosition: '50% 25%' }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(239,214,211,0)_55%,rgba(239,214,211,0.85)_100%)]" />
      <div className="absolute" style={{ left: '6cqw', top: '5cqw', ...S, fontSize: '9cqw', color: '#3a1d1a', lineHeight: 1 }}>àmì<span style={{ fontStyle: 'italic' }}>.</span></div>
      <div className="absolute" style={{ right: '6cqw', top: '7cqw', ...M, fontSize: '2.4cqw', letterSpacing: '0.16em', color: '#3a1d1a' }}>SHEA · NIACINAMIDE</div>
      <div className="absolute" style={{ left: '6cqw', bottom: '9cqw', ...S, fontSize: '10cqw', color: '#3a1d1a', lineHeight: 0.98, width: '72cqw' }}>Skin that<br /><span style={{ fontStyle: 'italic' }}>remembers</span> the sun.</div>
      <div className="absolute" style={{ right: '6cqw', bottom: '9cqw', ...M, fontSize: '2.4cqw', color: '#3a1d1a', textAlign: 'right', lineHeight: 1.6 }}>SPF 50<br />50 ML</div>
    </Piece>
  )
}

/** Analogue: a product landing hero for a film camera shop. 16:9. */
export function Analogue({ className = '' }: { className?: string }) {
  return (
    <Piece ratio={16 / 9} className={`bg-[#f4f2ee] ${className}`}>
      <Img src="polaroid.jpg" style={{ left: '48cqw', top: '6cqw', width: '48cqw', height: '88cqw', objectFit: 'contain', mixBlendMode: 'multiply' }} />
      <div className="absolute" style={{ left: '5cqw', top: '5cqw', ...M, fontSize: '1.6cqw', letterSpacing: '0.18em', color: '#1a1a1f' }}>ANALOGUE STORE · LAGOS &amp; LONDON</div>
      <div className="absolute" style={{ left: '5cqw', top: '22cqw', ...S, fontSize: '9cqw', lineHeight: 0.98, color: '#1a1a1f', width: '46cqw' }}>Shoot film.<br /><span style={{ fontStyle: 'italic' }}>Skip</span> the wait.</div>
      <div className="absolute" style={{ left: '5cqw', top: '54cqw', fontSize: '1.9cqw', lineHeight: 1.5, color: '#5e5e6c', width: '36cqw' }}>Instant cameras, refurbished and tested. Ships in 48 hours.</div>
      <div className="absolute rounded-full" style={{ left: '5cqw', top: '68cqw', padding: '1.4cqw 3cqw', background: '#1a1a1f', color: '#fff', fontSize: '1.7cqw', fontWeight: 600 }}>Shop instant</div>
      <div className="absolute" style={{ right: '5cqw', bottom: '5cqw', ...M, fontSize: '1.6cqw', color: '#1a1a1f' }}>FROM £129</div>
    </Piece>
  )
}

/** Kofi brand guideline page: colour and type. 16:10. */
export function KofiGuide({ className = '', live, mobile }: { className?: string; live?: boolean; mobile?: boolean }) {
  const ramp = ['#2b1608', '#4a2610', '#6f3a17', '#98511f', '#c9752b', '#dd9a5e', '#ebbf98', '#f5dfca', '#fbf1e6']
  // The guideline page generating itself: the primary colour first, the ramp grown outward from it, then the checks.
  const sc = live ? new Scene(mobile ? 'lpBrM' : 'lpBr', 12) : null
  const k = (key: string, at: [number, number], o?: Parameters<Scene['show']>[2]) => sc ? sc.show(key, at, o) : ''
  const END = 11.3
  const swatch = (i: number) => k(`sw${i}`, [2.4 + Math.abs(i - 4) * 0.28, END], { from: 'opacity:0;transform:scaleY(0.6)', to: 'opacity:1;transform:none', d: 0.35 })
  const badge = (t: string) => <b style={{ background: '#2b1608', color: '#fbf1e6', padding: '0 0.5em', borderRadius: '0.3em', fontWeight: 500 }}>{t}</b>
  if (mobile) return (
    <Piece ratio={4 / 5} className={`bg-[#fbf1e6] ${sc ? 'lpBrM-root' : ''} ${className}`}>
      <div className={`absolute flex justify-between ${k('hd', [0.3, END])}`} style={{ left: '6cqw', right: '6cqw', top: '6cqw', ...M, fontSize: '2.4cqw', letterSpacing: '0.16em', color: '#6f3a17' }}><span>KOFI · 03 COLOUR</span><span>12 / 28</span></div>
      <div className={`absolute ${k('title', [0.8, END], { from: 'clip-path:inset(0 100% 0 0);opacity:1', to: 'clip-path:inset(0 0 0 0);opacity:1', d: 1.1 })}`} style={{ left: '6cqw', right: '6cqw', top: '13cqw', ...S, fontSize: '11cqw', lineHeight: 1, color: '#2b1608' }}>Roast, <span style={{ fontStyle: 'italic' }}>from bean to crema.</span></div>
      <div className="absolute flex" style={{ left: '6cqw', right: '6cqw', top: '42cqw', height: '18cqw', gap: '1cqw' }}>
        {ramp.map((c, i) => <div key={c} className={`flex-1 ${swatch(i)}`} style={{ background: c, borderRadius: '1.4cqw', transformOrigin: 'bottom', outline: i === 4 && sc ? '2px solid #2b1608' : undefined, outlineOffset: '2px' }} />)}
      </div>
      <div className={`absolute ${k('pl', [5.0, END])}`} style={{ left: '6cqw', top: '65cqw', ...M, fontSize: '2.4cqw', letterSpacing: '0.14em', color: '#6f3a17' }}>PRIMARY · ROAST 500</div>
      <div className="absolute" style={{ left: '6cqw', top: '70cqw', ...M, fontSize: '2.6cqw', color: '#2b1608', lineHeight: 1.9 }}>
        <span className={`block ${k('c1', [5.3, END])}`}>#C9752B · oklch(64% 0.14 55)</span>
        <span className={`block ${k('c2', [5.8, END])}`}>On Cream 900: 5.1 : 1 {badge('AA')}</span>
        <span className={`block ${k('c3', [6.3, END])}`}>On Roast 100: 7.6 : 1 {badge('AAA')}</span>
      </div>
      <div className={`absolute ${k('tl', [7.0, END])}`} style={{ left: '6cqw', top: '90cqw', ...M, fontSize: '2.4cqw', letterSpacing: '0.14em', color: '#6f3a17' }}>TYPE</div>
      <div className={`absolute ${k('t1', [7.3, END])}`} style={{ left: '6cqw', top: '95cqw', ...D, fontSize: '9cqw', lineHeight: 1, color: '#2b1608' }}>BEBAS NEUE</div>
      <div className={`absolute ${k('t2', [7.8, END])}`} style={{ left: '6cqw', top: '105cqw', ...S, fontSize: '5.4cqw', fontStyle: 'italic', color: '#2b1608' }}>Instrument Serif, italic</div>
      <div className={`absolute rounded-full flex items-center justify-center ${k('logo', [8.6, END], { from: 'opacity:0;transform:scale(0.5)', to: 'opacity:1;transform:none', ease: 'cubic-bezier(.2,1.4,.4,1)', d: 0.6 })}`} style={{ right: '6cqw', top: '88cqw', width: '24cqw', height: '24cqw', background: '#c9752b', ...D, fontSize: '8cqw', color: '#2b1608' }}>KOFI</div>
      {sc && <div className="absolute flex" style={{ left: '6cqw', bottom: '5cqw', gap: '1.2cqw' }}>
        {['PDF', 'HTML', 'CSS', 'Tokens'].map((f, i) => <span key={f} className={`rounded-full ${k(`x${i}`, [9.6 + i * 0.22, END], { from: 'opacity:0;transform:translateY(0.8cqw)', to: 'opacity:1;transform:none', d: 0.35 })}`} style={{ padding: '1cqw 2.4cqw', border: '1px solid #6f3a17', ...M, fontSize: '2.2cqw', color: '#2b1608' }}>{f}</span>)}
      </div>}
      {sc && <style>{sc.style()}</style>}
    </Piece>
  )
  return (
    <Piece ratio={16 / 10} className={`bg-[#fbf1e6] ${sc ? 'lpBr-root' : ''} ${className}`}>
      <div className={`absolute ${k('hd', [0.3, END])}`} style={{ left: '4cqw', top: '4cqw', ...M, fontSize: '1.4cqw', letterSpacing: '0.16em', color: '#6f3a17' }}>KOFI BRAND GUIDELINES · 03 COLOUR</div>
      <div className={`absolute ${k('hd', [0.3, END])}`} style={{ right: '4cqw', top: '4cqw', ...M, fontSize: '1.4cqw', color: '#6f3a17' }}>12 / 28</div>
      <div className={`absolute ${k('title', [0.8, END], { from: 'clip-path:inset(0 100% 0 0);opacity:1', to: 'clip-path:inset(0 0 0 0);opacity:1', d: 1.1 })}`} style={{ left: '4cqw', top: '11cqw', ...S, fontSize: '7cqw', lineHeight: 1, color: '#2b1608' }}>Roast, <span style={{ fontStyle: 'italic' }}>from bean to crema.</span></div>
      <div className="absolute flex" style={{ left: '4cqw', right: '4cqw', top: '27cqw', height: '14cqw', gap: '0.6cqw' }}>
        {ramp.map((c, i) => <div key={c} className={`flex-1 flex items-end ${swatch(i)}`} style={{ background: c, borderRadius: '0.8cqw', padding: '1cqw', ...M, fontSize: '1.1cqw', color: i < 5 ? '#fbf1e6' : '#2b1608', transformOrigin: 'bottom', outline: i === 4 && sc ? '2px solid #2b1608' : undefined, outlineOffset: '2px' }}>{(i + 1) * 100}</div>)}
      </div>
      <div className={`absolute ${k('pl', [5.0, END])}`} style={{ left: '4cqw', top: '45cqw', ...M, fontSize: '1.3cqw', letterSpacing: '0.14em', color: '#6f3a17' }}>PRIMARY · ROAST 500</div>
      <div className="absolute" style={{ left: '4cqw', top: '48.5cqw', ...M, fontSize: '1.3cqw', color: '#2b1608', lineHeight: 1.8 }}>
        <span className={`block ${k('c1', [5.3, END])}`}>#C9752B · oklch(64% 0.14 55)</span>
        <span className={`block ${k('c2', [5.8, END])}`}>On Cream 900: 5.1 : 1 <b style={{ background: '#2b1608', color: '#fbf1e6', padding: '0 0.5cqw', borderRadius: '0.3cqw', fontWeight: 500 }}>AA</b></span>
        <span className={`block ${k('c3', [6.3, END])}`}>On Roast 100: 7.6 : 1 <b style={{ background: '#2b1608', color: '#fbf1e6', padding: '0 0.5cqw', borderRadius: '0.3cqw', fontWeight: 500 }}>AAA</b></span>
      </div>
      <div className={`absolute ${k('tl', [7.0, END])}`} style={{ left: '40cqw', top: '45cqw', ...M, fontSize: '1.3cqw', letterSpacing: '0.14em', color: '#6f3a17' }}>TYPE</div>
      <div className={`absolute ${k('t1', [7.3, END])}`} style={{ left: '40cqw', top: '48cqw', ...D, fontSize: '5.2cqw', lineHeight: 1, color: '#2b1608' }}>BEBAS NEUE</div>
      <div className={`absolute ${k('t2', [7.8, END])}`} style={{ left: '40cqw', top: '54cqw', ...S, fontSize: '3.2cqw', fontStyle: 'italic', color: '#2b1608' }}>Instrument Serif, italic</div>
      <div className={`absolute rounded-full flex items-center justify-center ${k('logo', [8.6, END], { from: 'opacity:0;transform:scale(0.5)', to: 'opacity:1;transform:none', ease: 'cubic-bezier(.2,1.4,.4,1)', d: 0.6 })}`} style={{ right: '4cqw', bottom: '4cqw', width: '13cqw', height: '13cqw', background: '#c9752b', ...D, fontSize: '4.5cqw', color: '#2b1608' }}>KOFI</div>
      {sc && <div className="absolute flex" style={{ left: '4cqw', bottom: '1.6cqw', gap: '0.6cqw' }}>
        {['PDF', 'HTML', 'CSS', 'Tokens'].map((f, i) => <span key={f} className={`rounded-full ${k(`x${i}`, [9.6 + i * 0.22, END], { from: 'opacity:0;transform:translateY(0.8cqw)', to: 'opacity:1;transform:none', d: 0.35 })}`} style={{ padding: '0.5cqw 1.1cqw', border: '1px solid #6f3a17', ...M, fontSize: '1.1cqw', color: '#2b1608' }}>{f}</span>)}
      </div>}
      {sc && <style>{sc.style()}</style>}
    </Piece>
  )
}

/** One of the real effect renders, full bleed. */
export function Fx({ kind, className = '', ratio = 4 / 3 }: { kind: 'halftone' | 'dither' | 'glitch' | 'ascii'; className?: string; ratio?: number }) {
  const ext = kind === 'dither' || kind === 'ascii' ? 'png' : 'jpg'
  return <Piece ratio={ratio} className={`bg-void-950 ${className}`}><Img src={`fx-${kind}.${ext}`} /></Piece>
}

/** A plain photo, for reference boards. */
export function Photo({ src, ratio = 1, className = '', position }: { src: string; ratio?: number; className?: string; position?: string }) {
  return <Piece ratio={ratio} className={`bg-void-900 ${className}`}><Img src={src} style={{ objectPosition: position }} /></Piece>
}

/* ---------- the product around the work ---------- */

const chrome = 'bg-[#141416] text-[#eeeef0]'

/** The Editor with a real design open: menu bar, tool rail, canvas, layers. */
export function EditorFrame({ piece, layers, className = '' }: { piece: ReactNode; layers: { name: string; kind: 'image' | 'text' | 'shape' | 'adjust' | 'filter'; on?: boolean }[]; className?: string }) {
  return <EditorChrome className={className} layers={layers.map(l => ({ ...l, cls: '' }))} sel={0} canvas={piece} />
}

/** The Editor building the Night Sessions poster: layers added one by one, type set on the canvas, then exported. */
export function EditorLive({ className = '', mobile }: { className?: string; mobile?: boolean }) {
  const sc = new Scene(mobile ? 'lpEdM' : 'lpEd', 14)
  const END = 13.4
  const k = (key: string, at: [number, number], o?: Parameters<Scene['show']>[2]) => sc.show(key, at, o)
  const typed = (key: string, t: number, n: number) => k(key, [t, END], { from: 'clip-path:inset(0 100% 0 0);opacity:1', to: 'clip-path:inset(0 0 0 0);opacity:1', d: 0.55, ease: `steps(${n},end)` })
  const c = {
    grad: k('grad', [1.0, END], { from: 'opacity:0', to: 'opacity:1', d: 0.6 }),
    curves: k('curves', [2.2, END], { from: 'opacity:0', to: 'opacity:1', d: 0.6 }),
    eyebrow: k('eyebrow', [3.4, END]),
    l1: typed('l1', 4.0, 5), l2: typed('l2', 4.8, 4), l3: typed('l3', 5.6, 4),
    caret: k('caret', [4.0, 6.5], { from: 'opacity:0', to: 'opacity:1', d: 0.1, final: 'hidden' }),
    lineup: k('lineup', [6.9, END]),
    foot: k('foot', [7.7, END]),
    grain: k('grain', [8.7, END], { from: 'opacity:0', to: 'opacity:0.55', d: 0.6 }),
    box: k('box', [9.5, 12.4], { from: 'opacity:0', to: 'opacity:1', d: 0.25, final: 'hidden' }),
  }
  const row = (key: string, t: number) => k(`row-${key}`, [t, END], { from: 'opacity:0;max-height:0', to: `opacity:1;max-height:${mobile ? 7 : 4.5}cqw`, d: 0.35 })
  const layers = [
    { name: 'NIGHT SESSIONS', kind: 'text' as const, cls: row('title', 4.0) },
    { name: 'Line-up', kind: 'text' as const, cls: row('lineup', 6.9) },
    { name: 'Date and venue', kind: 'text' as const, cls: row('foot', 7.7) },
    { name: 'Film grain', kind: 'filter' as const, cls: row('grain', 8.7) },
    { name: 'Curves', kind: 'adjust' as const, cls: row('curves', 2.2) },
    { name: 'Gradient fade', kind: 'shape' as const, cls: row('grad', 1.0) },
    { name: 'smoke.jpg', kind: 'image' as const, cls: '' },
  ]
  // The Layers panel lists top first, so new rows push in at the top; each gets the highlight while it is being made.
  const sel = [
    k('sel-img', [0, 1.0], { from: 'opacity:0', to: 'opacity:1', d: 0.2, final: 'hidden' }),
    k('sel-grad', [1.0, 2.2], { from: 'opacity:0', to: 'opacity:1', d: 0.2, final: 'hidden' }),
    k('sel-curves', [2.2, 4.0], { from: 'opacity:0', to: 'opacity:1', d: 0.2, final: 'hidden' }),
    k('sel-title', [4.0, 6.9], { from: 'opacity:0', to: 'opacity:1', d: 0.2, final: 'hidden' }),
    k('sel-lineup', [6.9, 7.7], { from: 'opacity:0', to: 'opacity:1', d: 0.2, final: 'hidden' }),
    k('sel-foot', [7.7, 8.7], { from: 'opacity:0', to: 'opacity:1', d: 0.2, final: 'hidden' }),
    k('sel-grain', [8.7, 9.5], { from: 'opacity:0', to: 'opacity:1', d: 0.2, final: 'hidden' }),
    k('sel-title2', [9.5, END], { from: 'opacity:0', to: 'opacity:1', d: 0.2 }),
  ]
  const selFor: Record<string, string[]> = { 'smoke.jpg': [sel[0]], 'Gradient fade': [sel[1]], Curves: [sel[2]], 'NIGHT SESSIONS': [sel[3], sel[7]], 'Line-up': [sel[4]], 'Date and venue': [sel[5]], 'Film grain': [sel[6]] }
  const tool = { text: k('tool-t', [3.3, 8.4], { from: 'opacity:0', to: 'opacity:1', d: 0.15, final: 'hidden' }), move: k('tool-v', [8.4, END], { from: 'opacity:0', to: 'opacity:1', d: 0.15 }) }
  const exportPulse = k('export', [11.2, 11.7], { from: 'transform:none', to: 'transform:scale(0.94)', d: 0.15, final: 'hidden' })
  const toast = k('toast', [11.9, 13.3], { from: 'opacity:0;transform:translate(-50%,0.8cqw)', to: 'opacity:1;transform:translate(-50%,0)', d: 0.3, final: 'hidden' })
  if (mobile) return <EditorPhone className={`lpEdM-root ${className}`} layers={layers} selCls={selFor} tool={tool} exportCls={exportPulse} canvas={<Sessions c={c} />} style={sc.style()}
    toast={<span className={`absolute rounded-lg ${toast}`} style={{ left: '50%', bottom: '3cqw', padding: '1.6cqw 2.8cqw', background: '#fff', color: '#0c0c0e', fontSize: '2.6cqw', fontWeight: 600, whiteSpace: 'nowrap' }}>Exported night_sessions_poster.png</span>} />
  return (
    <EditorChrome className={`lpEd-root ${className}`} layers={layers} selCls={selFor} tool={tool} exportCls={exportPulse} canvas={<Sessions c={c} />} style={sc.style()}
      toast={<span className={`absolute rounded-lg ${toast}`} style={{ left: '50%', bottom: '2cqw', padding: '0.8cqw 1.4cqw', background: '#fff', color: '#0c0c0e', fontSize: '1.25cqw', fontWeight: 600, whiteSpace: 'nowrap' }}>Exported night_sessions_poster.png · 2× · 1200 × 1800</span>} />
  )
}

type ChromeProps = {
  canvas: ReactNode; layers: { name: string; kind: 'image' | 'text' | 'shape' | 'adjust' | 'filter'; on?: boolean; cls: string }[]
  sel?: number; selCls?: Record<string, string[]>; tool?: { text: string; move: string }; exportCls?: string; toast?: ReactNode; style?: string; className?: string
}

const kindTile = (kind: ChromeProps['layers'][number]['kind']) => ({ background: kind === 'text' ? '#f7f7f8' : kind === 'filter' ? '#8b7cff' : kind === 'adjust' ? '#ffb020' : kind === 'shape' ? '#c9752b' : '#3a3358', color: '#0c0c0e', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' } as CSSProperties)
const kindGlyph = (kind: ChromeProps['layers'][number]['kind']) => kind === 'text' ? 'T' : kind === 'filter' ? 'fx' : kind === 'adjust' ? '◐' : ''

/** The phone Editor, as it really is: the canvas fills the screen, tools sit in a bottom bar, Layers opens as a sheet. */
function EditorPhone({ canvas, layers, selCls, tool, exportCls = '', toast, style, className = '' }: ChromeProps) {
  return (
    <Piece ratio={4 / 5} className={`${chrome} ${className}`} style={{ fontFamily: 'var(--font-inter), Inter, system-ui' }}>
      <div className="absolute inset-x-0 top-0 flex items-center" style={{ height: '9cqw', padding: '0 3cqw', gap: '2cqw', fontSize: '2.8cqw', color: '#b8b8c1', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="rounded" style={{ width: '4.4cqw', height: '4.4cqw', background: '#fff' }} /><span style={{ color: '#fff', fontWeight: 600 }}>Night Sessions</span>
        <span className={`ml-auto rounded-full ${exportCls}`} style={{ padding: '1.1cqw 3cqw', background: '#fff', color: '#0c0c0e', fontWeight: 600 }}>Export</span>
      </div>
      <div className="absolute inset-x-0 flex items-start justify-center overflow-hidden" style={{ top: '9cqw', bottom: '46cqw', background: '#0c0c0e', padding: '4cqw 0' }}>
        <div className="relative" style={{ height: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}><div className="h-full [&>*]:h-full">{canvas}</div></div>
        {toast}
      </div>
      {/* Layers sheet, as on the phone. */}
      <div className="absolute inset-x-0 bottom-0" style={{ height: '46cqw', background: '#1a1a1e', borderTop: '1px solid rgba(255,255,255,0.08)', borderRadius: '4cqw 4cqw 0 0' }}>
        <div className="flex items-center justify-between" style={{ padding: '2.4cqw 4cqw 1.6cqw', fontSize: '3cqw', fontWeight: 600 }}><span>Layers</span><span style={{ color: '#5e5e6c', fontWeight: 400, fontSize: '2.6cqw' }}>Done</span></div>
        <div style={{ padding: '0 2cqw' }}>
          {layers.map(l => (
            <div key={l.name} className={`overflow-hidden ${l.cls}`} style={{ maxHeight: l.cls ? undefined : '7cqw' }}>
              <div className="relative flex items-center" style={{ margin: '0 0 0.6cqw', padding: '1cqw 2cqw', borderRadius: '1.2cqw', gap: '2cqw', fontSize: '2.6cqw' }}>
                {(selCls?.[l.name] ?? []).map(cls => <span key={cls} className={`absolute inset-0 ${cls}`} style={{ background: '#2b2740', borderRadius: '1.2cqw' }} />)}
                <span className="relative rounded" style={{ width: '4.6cqw', height: '4.6cqw', fontSize: '2.6cqw', ...kindTile(l.kind) }}>{kindGlyph(l.kind)}</span>
                <span className="relative truncate" style={{ color: '#d9d9de' }}>{l.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Bottom tool bar sits under the sheet; the active tool shows in the sheet header instead. */}
      <span className="absolute" style={{ right: '4cqw', top: '11.4cqw', fontSize: '2.4cqw', color: '#b9afff', fontWeight: 600 }}>
        {tool && <><span className={`absolute right-0 ${tool.text}`}>Type</span><span className={`absolute right-0 ${tool.move}`}>Move</span></>}
      </span>
      {style && <style>{style}</style>}
    </Piece>
  )
}

function EditorChrome({ canvas, layers, sel, selCls, tool, exportCls = '', toast, style, className = '' }: ChromeProps) {
  const tools = ['V', 'M', 'L', 'W', 'C', 'I', 'J', 'S', 'B', 'E', 'G', 'T', 'U', 'H', 'Z']
  return (
    <Piece ratio={16 / 10} className={`${chrome} ${className}`} style={{ fontFamily: 'var(--font-inter), Inter, system-ui' }}>
      <div className="absolute inset-x-0 top-0 flex items-center" style={{ height: '5cqw', background: '#141416', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 2cqw', gap: '2.4cqw', fontSize: '1.35cqw', color: '#b8b8c1' }}>
        <span className="rounded" style={{ width: '2.2cqw', height: '2.2cqw', background: '#fff' }} />
        {['File', 'Edit', 'Image', 'Layer', 'Select', 'Filter', 'View', 'Window', 'Help'].map(m => <span key={m}>{m}</span>)}
        <span className={`ml-auto rounded-full ${exportCls}`} style={{ padding: '0.5cqw 1.6cqw', background: '#fff', color: '#0c0c0e', fontWeight: 600 }}>Export</span>
      </div>
      <div className="absolute flex flex-col items-center" style={{ left: 0, top: '5cqw', bottom: 0, width: '4.4cqw', background: '#141416', borderRight: '1px solid rgba(255,255,255,0.06)', paddingTop: '1cqw', gap: '0.6cqw' }}>
        {tools.map((t, i) => {
          const on = tool ? (t === 'V' ? tool.move : t === 'T' ? tool.text : '') : i === 0 ? 'opacity-100' : ''
          return (
            <span key={t} className="relative rounded flex items-center justify-center" style={{ width: '2.8cqw', height: '2.8cqw', color: '#747484', fontSize: '1.2cqw', fontWeight: 600 }}>
              {on && <span className={`absolute inset-0 rounded ${on}`} style={{ background: '#8b7cff' }} />}
              <span className="relative" style={{ color: on ? '#fff' : undefined }}>{t}</span>
            </span>
          )
        })}
      </div>
      <div className="absolute flex items-center justify-center" style={{ left: '4.4cqw', right: '22cqw', top: '5cqw', bottom: 0, background: '#0c0c0e' }}>
        <div className="relative" style={{ height: '46cqw', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
          <div className="h-full [&>*]:h-full">{canvas}</div>
          {!tool && <div className="absolute inset-0 pointer-events-none" style={{ outline: '1px solid #8b7cff', outlineOffset: '-1px' }}>
            {[[0, 0], [100, 0], [0, 100], [100, 100]].map(([x, y]) => <span key={`${x}${y}`} className="absolute bg-white" style={{ width: '0.9cqw', height: '0.9cqw', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', border: '1px solid #8b7cff' }} />)}
          </div>}
        </div>
        {toast}
      </div>
      <div className="absolute" style={{ right: 0, top: '5cqw', bottom: 0, width: '22cqw', background: '#1a1a1e', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center" style={{ height: '3.6cqw', padding: '0 1.4cqw', fontSize: '1.3cqw', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', gap: '1.4cqw' }}><span>Layers</span><span style={{ color: '#5e5e6c', fontWeight: 400 }}>Properties</span><span style={{ color: '#5e5e6c', fontWeight: 400 }}>History</span></div>
        <div className="flex items-center" style={{ padding: '0.9cqw 1.4cqw', gap: '1cqw', fontSize: '1.15cqw', color: '#91919f' }}><span className="rounded" style={{ padding: '0.3cqw 0.8cqw', background: '#222228' }}>Normal</span><span className="rounded ml-auto" style={{ padding: '0.3cqw 0.8cqw', background: '#222228' }}>100%</span></div>
        {layers.map((l, i) => {
          const hi = selCls ? selCls[l.name] ?? [] : i === sel ? ['opacity-100'] : []
          return (
            <div key={l.name} className={`overflow-hidden ${l.cls}`} style={{ margin: '0 0.8cqw', maxHeight: l.cls ? undefined : '4.5cqw' }}>
            <div className="relative flex items-center" style={{ margin: '0 0 0.5cqw', padding: '0.7cqw 0.8cqw', borderRadius: '0.6cqw', gap: '1cqw', fontSize: '1.25cqw' }}>
              {hi.map(cls => <span key={cls} className={`absolute inset-0 ${cls}`} style={{ background: '#2b2740', borderRadius: '0.6cqw' }} />)}
              <span className="relative" style={{ width: '1cqw', color: l.on === false ? '#42424b' : '#b8b8c1', fontSize: '1cqw' }}>●</span>
              <span className="relative rounded" style={{ width: '2.4cqw', height: '2.4cqw', background: l.kind === 'text' ? '#f7f7f8' : l.kind === 'filter' ? '#8b7cff' : l.kind === 'adjust' ? '#ffb020' : l.kind === 'shape' ? '#c9752b' : '#3a3358', color: '#0c0c0e', fontSize: '1.3cqw', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l.kind === 'text' ? 'T' : l.kind === 'filter' ? 'fx' : l.kind === 'adjust' ? '◐' : ''}</span>
              <span className="relative truncate" style={{ color: '#d9d9de' }}>{l.name}</span>
            </div>
            </div>
          )
        })}
      </div>
      {style && <style>{style}</style>}
    </Piece>
  )
}

/** Studio with a real job open: brief, references, the palette pulled from them, directions. With `live`, the job
 *  runs through in order: brief written, references dropped in, palette pulled, directions made, one approved. */
export function StudioFrame({ className = '', live, mobile }: { className?: string; live?: boolean; mobile?: boolean }) {
  const sc = live ? new Scene(mobile ? 'lpStM' : 'lpSt', 14) : null
  const END = 13.4
  const k = (key: string, at: [number, number], o?: Parameters<Scene['show']>[2]) => sc ? sc.show(key, at, o) : ''
  const reveal = (key: string, t: number, d: number) => k(key, [t, END], { from: 'clip-path:inset(0 0 100% 0);opacity:1', to: 'clip-path:inset(0 0 -1% 0);opacity:1', d })
  const tabs = ['Brief', 'References', 'Directions', 'Formats', 'Review', 'Deliver']
  const tabOn = sc ? { Brief: k('tab-brief', [0, 3.2], { from: 'opacity:0', to: 'opacity:1', d: 0.2, final: 'hidden' }), References: k('tab-refs', [3.2, 6.6], { from: 'opacity:0', to: 'opacity:1', d: 0.2, final: 'hidden' }), Directions: k('tab-dir', [6.6, END], { from: 'opacity:0', to: 'opacity:1', d: 0.2 }) } as Record<string, string> : { Directions: 'opacity-100' }
  const photo = (i: number) => k(`ph${i}`, [3.5 + i * 0.5, END], { from: 'opacity:0;transform:scale(0.94) translateY(0.8cqw)', to: 'opacity:1;transform:none', d: 0.4 })
  const chip = (i: number) => k(`chip${i}`, [5.2 + i * 0.18, END], { from: 'opacity:0;transform:scaleY(0)', to: 'opacity:1;transform:none', d: 0.3 })
  const card = (i: number) => k(`card${i}`, [7.2 + i * 0.5, END], { from: 'opacity:0;transform:translateY(1.2cqw)', to: 'opacity:1;transform:none', d: 0.45 })
  if (mobile) return (
    <Piece ratio={4 / 5} className={`${chrome} ${sc ? 'lpStM-root' : ''} ${className}`} style={{ fontFamily: 'var(--font-inter), Inter, system-ui' }}>
      <div className="absolute inset-x-0 top-0 flex items-center" style={{ height: '9cqw', padding: '0 3cqw', gap: '2cqw', fontSize: '2.8cqw', color: '#b8b8c1', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="rounded" style={{ width: '4.4cqw', height: '4.4cqw', background: '#fff' }} /><span style={{ color: '#fff', fontWeight: 600 }}>Kofi · Launch</span>
        <span className="ml-auto flex" style={{ gap: '1cqw', fontSize: '2.4cqw' }}>{['Brief', 'References', 'Directions'].map(t => <span key={t} className="relative rounded-full" style={{ padding: '0.9cqw 2cqw', color: '#91919f' }}>{tabOn[t] && <span className={`absolute inset-0 rounded-full ${tabOn[t]}`} style={{ background: '#2b2740' }} />}<span className="relative" style={{ color: tabOn[t] ? '#fff' : undefined }}>{t}</span></span>)}</span>
      </div>
      <div className="absolute" style={{ left: '4cqw', right: '4cqw', top: '13cqw' }}>
        <p className={k('bl', [0.3, END])} style={{ fontSize: '2.4cqw', letterSpacing: '0.12em', color: '#8b7cff', fontWeight: 600 }}>BRIEF</p>
        <p className={reveal('brief', 0.7, 2.0)} style={{ marginTop: '1.2cqw', fontSize: '3cqw', lineHeight: 1.45, color: '#d9d9de' }}>Launch a specialty coffee bar in Yaba. Warm, premium, quietly confident. Instagram first, A5 flyers, one window poster. Avoid the usual green.</p>
        <div className="grid grid-cols-3" style={{ marginTop: '3.4cqw', gap: '2cqw' }}>
          <Photo src="latte.jpg" ratio={4 / 3} className={`rounded-lg ${photo(0)}`} />
          <Photo src="beans.jpg" ratio={4 / 3} className={`rounded-lg ${photo(1)}`} />
          <Photo src="beanie.jpg" ratio={4 / 3} className={`rounded-lg ${photo(2)}`} position="50% 20%" />
        </div>
        <p className={k('pl', [4.9, END])} style={{ marginTop: '3.4cqw', fontSize: '2.4cqw', letterSpacing: '0.12em', color: '#8b7cff', fontWeight: 600 }}>PALETTE FROM REFERENCES</p>
        <div className="flex" style={{ marginTop: '1.4cqw', gap: '1.4cqw' }}>{['#2b1608', '#6f3a17', '#c9752b', '#ebbf98', '#fbf1e6'].map((c, i) => <span key={c} className={`flex-1 rounded ${chip(i)}`} style={{ height: '6cqw', background: c, transformOrigin: 'bottom' }} />)}</div>
        <p className={k('dl', [6.8, END])} style={{ marginTop: '3.4cqw', fontSize: '2.4cqw', letterSpacing: '0.12em', color: '#8b7cff', fontWeight: 600 }}>DIRECTIONS</p>
        <div className="grid grid-cols-3" style={{ marginTop: '1.4cqw', gap: '2cqw' }}>
          {['A', 'B', 'C'].map((d, i) => (
            <div key={d} className={`relative rounded-lg overflow-hidden ${card(i)}`} style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.08)' }}>
              {i === 1 && <span className={`absolute inset-0 rounded-lg pointer-events-none ${sc ? k('ok-ring', [9.4, END], { from: 'opacity:0', to: 'opacity:1', d: 0.3 }) : ''}`} style={{ boxShadow: 'inset 0 0 0 1.5px #8b7cff', zIndex: 1 }} />}
              <div className="relative overflow-hidden" style={{ margin: '1.4cqw', height: '24cqw', borderRadius: '1cqw' }}><div className="absolute inset-x-0 top-0">{i === 1 ? <Kofi /> : i === 0 ? <KofiAlt /> : <KofiC />}</div></div>
              <div className="flex items-center justify-between" style={{ padding: '0 1.6cqw 1.4cqw', fontSize: '2.2cqw', color: '#747484' }}><span>{d}</span>{i === 1 && <span className={k('ok', [9.5, END], { from: 'opacity:0;transform:scale(0.7)', to: 'opacity:1;transform:none', ease: 'cubic-bezier(.2,1.4,.4,1)', d: 0.5 })} style={{ color: '#b9afff' }}>Approved</span>}</div>
            </div>
          ))}
        </div>
      </div>
      <span className={`absolute rounded-full ${k('go', [9.8, END], { from: 'opacity:0;transform:translateY(0.6cqw)', to: 'opacity:1;transform:none' })}`} style={{ left: '4cqw', right: '4cqw', bottom: '4cqw', padding: '2.6cqw', textAlign: 'center', background: '#fff', color: '#0c0c0e', fontSize: '3cqw', fontWeight: 600 }}>
        {sc && <span className={`absolute inset-0 rounded-full ${k('go-press', [11.2, 11.6], { from: 'opacity:0', to: 'opacity:0.25', d: 0.15, final: 'hidden' })}`} style={{ background: '#8b7cff' }} />}<span className="relative">Start design in Editor</span>
      </span>
      {sc && <style>{sc.style()}</style>}
    </Piece>
  )
  return (
    <Piece ratio={16 / 10} className={`${chrome} ${sc ? 'lpSt-root' : ''} ${className}`} style={{ fontFamily: 'var(--font-inter), Inter, system-ui' }}>
      <div className="absolute inset-x-0 top-0 flex items-center" style={{ height: '5cqw', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 2cqw', gap: '1.6cqw', fontSize: '1.35cqw', color: '#b8b8c1' }}>
        <span className="rounded" style={{ width: '2.2cqw', height: '2.2cqw', background: '#fff' }} />
        <span style={{ color: '#fff', fontWeight: 600 }}>Kofi · Launch campaign</span>
        {tabs.map(t => <span key={t} className="relative rounded-full" style={{ padding: '0.5cqw 1.2cqw', color: '#91919f' }}>{tabOn[t] && <span className={`absolute inset-0 rounded-full ${tabOn[t]}`} style={{ background: '#2b2740' }} />}<span className="relative" style={{ color: tabOn[t] ? '#fff' : undefined }}>{t}</span></span>)}
      </div>
      <div className="absolute" style={{ left: '2cqw', top: '7cqw', width: '30cqw', bottom: '2cqw' }}>
        <p className={k('bl', [0.3, END])} style={{ fontSize: '1.2cqw', letterSpacing: '0.12em', color: '#8b7cff', fontWeight: 600 }}>BRIEF</p>
        <p className={reveal('brief', 0.7, 2.0)} style={{ marginTop: '0.8cqw', fontSize: '1.45cqw', lineHeight: 1.5, color: '#d9d9de' }}>Launch a specialty coffee bar in Yaba. Warm, premium, quietly confident. Instagram first, A5 flyers for the estate, one poster for the window. Avoid the usual green.</p>
        <p className={k('pl', [4.9, END])} style={{ marginTop: '2.2cqw', fontSize: '1.2cqw', letterSpacing: '0.12em', color: '#8b7cff', fontWeight: 600 }}>PALETTE FROM REFERENCES</p>
        <div className="flex" style={{ marginTop: '0.8cqw', gap: '0.6cqw' }}>{['#2b1608', '#6f3a17', '#c9752b', '#ebbf98', '#fbf1e6'].map((c, i) => <span key={c} className={`flex-1 rounded ${chip(i)}`} style={{ height: '3.4cqw', background: c, transformOrigin: 'bottom' }} />)}</div>
        <p className={k('dl', [6.8, END])} style={{ marginTop: '2.2cqw', fontSize: '1.2cqw', letterSpacing: '0.12em', color: '#8b7cff', fontWeight: 600 }}>DIRECTION</p>
        <p className={reveal('dir', 7.0, 0.9)} style={{ marginTop: '0.8cqw', fontSize: '1.45cqw', lineHeight: 1.5, color: '#d9d9de' }}>Editorial. Big condensed type, one italic serif line, mono for facts.</p>
        <span className={`absolute bottom-0 left-0 rounded-full ${k('go', [9.8, END], { from: 'opacity:0;transform:translateY(0.6cqw)', to: 'opacity:1;transform:none' })}`} style={{ padding: '0.9cqw 2cqw', background: '#fff', color: '#0c0c0e', fontSize: '1.35cqw', fontWeight: 600 }}>
          {sc && <span className={`absolute inset-0 rounded-full ${k('go-press', [11.2, 11.6], { from: 'opacity:0', to: 'opacity:0.25', d: 0.15, final: 'hidden' })}`} style={{ background: '#8b7cff' }} />}
          <span className="relative">Start design in Editor</span>
        </span>
      </div>
      <div className="absolute grid grid-cols-3" style={{ left: '35cqw', right: '2cqw', top: '7cqw', gap: '1cqw' }}>
        <Photo src="latte.jpg" ratio={16 / 9} className={`rounded-lg ${photo(0)}`} />
        <Photo src="beans.jpg" ratio={16 / 9} className={`rounded-lg ${photo(1)}`} />
        <Photo src="beanie.jpg" ratio={16 / 9} className={`rounded-lg ${photo(2)}`} position="50% 20%" />
      </div>
      <div className="absolute grid grid-cols-3" style={{ left: '35cqw', right: '2cqw', top: '20cqw', gap: '1cqw' }}>
        {['A', 'B', 'C'].map((d, i) => (
          <div key={d} className={`relative rounded-lg overflow-hidden ${card(i)}`} style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.08)' }}>
            {i === 1 && <span className={`absolute inset-0 rounded-lg pointer-events-none ${sc ? k('ok-ring', [9.4, END], { from: 'opacity:0', to: 'opacity:1', d: 0.3 }) : ''}`} style={{ boxShadow: 'inset 0 0 0 1px #8b7cff', zIndex: 1 }} />}
            <div className="relative overflow-hidden" style={{ margin: '0.8cqw', height: '30cqw', borderRadius: '0.5cqw' }}><div className="absolute inset-x-0 top-0">{i === 1 ? <Kofi /> : i === 0 ? <KofiAlt /> : <KofiC />}</div></div>
            <div className="flex items-center justify-between" style={{ padding: '0 1cqw 0.9cqw', fontSize: '1.15cqw', color: '#747484' }}>
              <span className={i === 1 && sc ? k('ok-lab', [9.4, END], { from: 'color:#747484', to: 'color:#b9afff', d: 0.3 }) : ''} style={i === 1 && !sc ? { color: '#b9afff' } : undefined}>Direction {d}</span>
              {i === 1 && <span className={k('ok', [9.5, END], { from: 'opacity:0;transform:scale(0.7)', to: 'opacity:1;transform:none', ease: 'cubic-bezier(.2,1.4,.4,1)', d: 0.5 })} style={{ color: '#b9afff' }}>Approved</span>}
            </div>
          </div>
        ))}
      </div>
      {sc && <style>{sc.style()}</style>}
    </Piece>
  )
}

/** Two alternative directions for the Kofi post, so the Studio board shows a real choice. */
function KofiAlt({ className = '' }: { className?: string }) {
  return (
    <Piece ratio={4 / 5} className={`bg-[#fbf1e6] ${className}`}>
      <Img src="beans.jpg" style={{ top: '38cqw', height: 'auto' }} />
      <div className="absolute" style={{ left: '6cqw', top: '6cqw', ...S, fontSize: '13cqw', lineHeight: 0.95, color: '#2b1608' }}>Slow<br /><span style={{ fontStyle: 'italic' }}>morning.</span></div>
      <div className="absolute" style={{ left: '6cqw', top: '34cqw', ...M, fontSize: '2.6cqw', letterSpacing: '0.16em', color: '#6f3a17' }}>KOFI · YABA · 04.10</div>
    </Piece>
  )
}
function KofiC({ className = '' }: { className?: string }) {
  return (
    <Piece ratio={4 / 5} className={`bg-[#c9752b] ${className}`}>
      <div className="absolute" style={{ left: '-3cqw', top: '-2cqw', ...D, fontSize: '48cqw', lineHeight: 0.85, color: '#2b1608' }}>KO<br />FI</div>
      <Img src="latte.jpg" className="rounded-full" style={{ left: '48cqw', top: '52cqw', width: '44cqw', height: '44cqw' }} />
      <div className="absolute" style={{ left: '6cqw', bottom: '8cqw', ...M, fontSize: '2.6cqw', letterSpacing: '0.16em', color: '#2b1608', lineHeight: 1.7 }}>OPENS 04.10<br />YABA</div>
    </Piece>
  )
}

/** Effects with a real photo and its real halftone side by side. With `live`, the compare handle sweeps across,
 *  contrast goes up, then the same photo is switched to Dither, and the PNG is downloaded. */
export function EffectsFrame({ className = '', live, mobile }: { className?: string; live?: boolean; mobile?: boolean }) {
  const list = ['Halftone', 'Dither', 'ASCII', 'Glitch', 'Pixel sort', 'CRT', 'Duotone', 'Crosshatch', 'Low poly']
  const sc = live ? new Scene(mobile ? 'lpFxM' : 'lpFx', 12) : null
  const k = (key: string, at: [number, number], o?: Parameters<Scene['show']>[2]) => sc ? sc.show(key, at, o) : ''
  const tw = (key: string, at: [number, number], from: string, to: string, o?: Parameters<Scene['tween']>[4]) => sc ? sc.tween(key, at, from, to, o) : ''
  const ease = 'cubic-bezier(.65,0,.35,1)'
  // Compare handle: from the right edge (all photo) to 42% across. clip-path on the render, left on the bar.
  const wipe = tw('wipe', [0.6, 3.0], 'clip-path:inset(0 0 0 100%)', 'clip-path:inset(0 0 0 42%)', { ease, rest: 'clip-path:inset(0 0 0 42%)' })
  const bar = tw('bar', [0.6, 3.0], 'left:100%', 'left:42%', { ease, rest: 'left:42%' })
  const contrast = tw('con', [3.6, 4.6], 'filter:contrast(1)', 'filter:contrast(1.35)', { ease, rest: 'filter:contrast(1.35)' })
  const slider = tw('sl', [3.6, 4.6], 'transform:scaleX(0.40)', 'transform:scaleX(0.58)', { ease, rest: 'transform:scaleX(0.58)' })
  const sliderVal = [k('v40', [0, 3.6], { from: 'opacity:0', to: 'opacity:1', d: 0.1, final: 'hidden' }), k('v58', [3.6, 12], { from: 'opacity:0', to: 'opacity:1', d: 0.1 })]
  const rowOn = sc ? { Halftone: [k('r-h1', [0, 5.6], { from: 'opacity:0', to: 'opacity:1', d: 0.15, final: 'hidden' }), k('r-h2', [9.4, 12], { from: 'opacity:0', to: 'opacity:1', d: 0.15 })], Dither: [k('r-d', [5.6, 9.4], { from: 'opacity:0', to: 'opacity:1', d: 0.15, final: 'hidden' })] } as Record<string, string[]> : { Halftone: ['opacity-100'] }
  const dither = k('dither', [5.8, 9.4], { from: 'opacity:0', to: 'opacity:1', d: 0.45, final: 'hidden' })
  const dl = k('dl', [10.2, 10.6], { from: 'transform:none', to: 'transform:scale(0.94)', d: 0.15, final: 'hidden' })
  const toast = k('toast', [10.8, 11.8], { from: 'opacity:0;transform:translate(-50%,0.8cqw)', to: 'opacity:1;transform:translate(-50%,0)', d: 0.3, final: 'hidden' })
  const compare = (u: string) => (
    <div className="relative h-full w-full rounded-lg overflow-hidden">
      <img src="/landing/beard.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className={`absolute inset-0 ${wipe}`} style={sc ? undefined : { clipPath: 'inset(0 0 0 42%)' }}><img src="/landing/fx-halftone.jpg" alt="" className={`absolute inset-0 w-full h-full object-cover ${contrast}`} /></div>
      {sc && <img src="/landing/fx-dither-portrait.png" alt="" className={`absolute inset-0 w-full h-full object-cover ${dither}`} style={{ clipPath: 'inset(0 0 0 42%)' }} />}
      <span className={`absolute top-0 bottom-0 ${bar}`} style={{ left: sc ? undefined : '42%', width: '2px', background: '#fff', transform: 'translateX(-1px)' }}>
        <span className="absolute rounded-full" style={{ left: '50%', top: '50%', width: u, height: u, background: '#fff', transform: 'translate(-50%,-50%)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }} />
      </span>
      {sc && <span className={`absolute rounded-lg ${toast}`} style={{ left: '50%', bottom: mobile ? '3cqw' : '2cqw', padding: mobile ? '1.6cqw 2.8cqw' : '0.8cqw 1.4cqw', background: '#fff', color: '#0c0c0e', fontSize: mobile ? '2.6cqw' : '1.25cqw', fontWeight: 600, whiteSpace: 'nowrap' }}>Saved portrait_halftone.png</span>}
    </div>
  )
  if (mobile) return (
    <Piece ratio={4 / 5} className={`${chrome} ${sc ? 'lpFxM-root' : ''} ${className}`} style={{ fontFamily: 'var(--font-inter), Inter, system-ui' }}>
      <div className="absolute inset-x-0 top-0 flex items-center" style={{ height: '9cqw', padding: '0 3cqw', gap: '2cqw', fontSize: '2.8cqw', color: '#b8b8c1', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="rounded" style={{ width: '4.4cqw', height: '4.4cqw', background: '#fff' }} /><span style={{ color: '#fff', fontWeight: 600 }}>Effects</span>
        <span className={`ml-auto rounded-full ${dl}`} style={{ padding: '1.1cqw 3cqw', background: '#fff', color: '#0c0c0e', fontWeight: 600 }}>Download PNG</span>
      </div>
      <div className="absolute" style={{ left: '3cqw', right: '3cqw', top: '12cqw', height: '70cqw' }}>{compare('6cqw')}</div>
      <div className="absolute flex no-scrollbar" style={{ left: '3cqw', right: '3cqw', top: '86cqw', gap: '1.4cqw', overflow: 'hidden' }}>
        {list.slice(0, 6).map(n => <span key={n} className="relative rounded-full shrink-0" style={{ padding: '1.4cqw 3cqw', color: '#b8b8c1', fontSize: '2.6cqw', border: '1px solid rgba(255,255,255,0.1)' }}>{rowOn[n]?.map(cls => <span key={cls} className={`absolute inset-0 rounded-full ${cls}`} style={{ background: '#8b7cff' }} />)}<span className="relative" style={rowOn[n] ? { color: '#fff', fontWeight: 600 } : undefined}>{n}</span></span>)}
      </div>
      <div className="absolute" style={{ left: '3cqw', right: '3cqw', top: '96cqw', fontSize: '2.5cqw', color: '#91919f' }}>
        <div className="flex justify-between" style={{ marginBottom: '1cqw' }}><span>Dot size</span><span style={{ color: '#eeeef0' }}>62</span></div><div className="relative rounded" style={{ height: '1cqw', background: '#34343d' }}><div className="absolute left-0 top-0 h-full rounded" style={{ width: '62%', background: '#8b7cff' }} /></div>
        <div className="flex justify-between" style={{ marginTop: '3cqw', marginBottom: '1cqw' }}><span>Contrast</span><span className="relative" style={{ color: '#eeeef0' }}>{sc ? <><span className={sliderVal[0]}>40</span><span className={`absolute right-0 top-0 ${sliderVal[1]}`}>58</span></> : '40'}</span></div><div className="relative rounded" style={{ height: '1cqw', background: '#34343d' }}><div className={`absolute left-0 top-0 h-full w-full rounded ${slider}`} style={{ background: '#8b7cff', transformOrigin: 'left', transform: sc ? undefined : 'scaleX(0.4)' }} /></div>
      </div>
      {sc && <style>{sc.style()}</style>}
    </Piece>
  )
  return (
    <Piece ratio={16 / 10} className={`${chrome} ${sc ? 'lpFx-root' : ''} ${className}`} style={{ fontFamily: 'var(--font-inter), Inter, system-ui' }}>
      <div className="absolute inset-x-0 top-0 flex items-center" style={{ height: '5cqw', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 2cqw', gap: '1.6cqw', fontSize: '1.35cqw', color: '#b8b8c1' }}>
        <span className="rounded" style={{ width: '2.2cqw', height: '2.2cqw', background: '#fff' }} /><span style={{ color: '#fff', fontWeight: 600 }}>Effects</span>
        <span className="ml-auto rounded-full" style={{ padding: '0.5cqw 1.6cqw', border: '1px solid rgba(255,255,255,0.2)' }}>Open in Editor</span>
        <span className={`rounded-full ${dl}`} style={{ padding: '0.5cqw 1.6cqw', background: '#fff', color: '#0c0c0e', fontWeight: 600 }}>Download PNG</span>
      </div>
      <div className="absolute" style={{ left: '2cqw', top: '7cqw', width: '26cqw' }}>
        <div className="flex flex-col" style={{ gap: '0.4cqw' }}>
          {list.map(n => <span key={n} className="relative rounded-lg" style={{ padding: '0.9cqw 1.2cqw', color: '#b8b8c1', fontSize: '1.35cqw' }}>{rowOn[n]?.map(cls => <span key={cls} className={`absolute inset-0 rounded-lg ${cls}`} style={{ background: '#8b7cff' }} />)}<span className="relative" style={rowOn[n] ? { color: '#fff', fontWeight: 600 } : undefined}>{n}</span></span>)}
        </div>
        <div style={{ marginTop: '1.6cqw', fontSize: '1.15cqw', color: '#91919f' }}>
          <div style={{ marginBottom: '1cqw' }}><div className="flex justify-between"><span>Dot size</span><span style={{ color: '#eeeef0' }}>62</span></div><div className="relative rounded" style={{ height: '0.5cqw', background: '#34343d', marginTop: '0.5cqw' }}><div className="absolute left-0 top-0 h-full rounded" style={{ width: '62%', background: '#8b7cff' }} /></div></div>
          <div style={{ marginBottom: '1cqw' }}>
            <div className="flex justify-between"><span>Contrast</span><span className="relative" style={{ color: '#eeeef0' }}>{sc ? <><span className={sliderVal[0]}>40</span><span className={`absolute right-0 top-0 ${sliderVal[1]}`}>58</span></> : '40'}</span></div>
            <div className="relative rounded" style={{ height: '0.5cqw', background: '#34343d', marginTop: '0.5cqw' }}><div className={`absolute left-0 top-0 h-full w-full rounded ${slider}`} style={{ background: '#8b7cff', transformOrigin: 'left', transform: sc ? undefined : 'scaleX(0.4)' }} /></div>
          </div>
        </div>
      </div>
      <div className="absolute" style={{ left: '30cqw', right: '2cqw', top: '7cqw', bottom: '2cqw' }}>{compare('3cqw')}</div>
      {sc && <style>{sc.style()}</style>}
    </Piece>
  )
}
