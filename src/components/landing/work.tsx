/* eslint-disable @next/next/no-img-element */
// Finished design work, built as real layouts on real photographs. These are the pieces the product page shows
// when it needs to prove what comes out of Voidcanvas. Each one is a self-contained composition that scales with
// its container (all sizes are in container-query units, so a piece looks the same at 120px or 1200px wide).
// Photos: public/landing/*.jpg (Unsplash licence). Effect outputs are real renders of those photos.

import { Bebas_Neue, Instrument_Serif } from 'next/font/google'
import type { CSSProperties, ReactNode } from 'react'

export const display = Bebas_Neue({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--font-display' })
export const serif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], display: 'swap', variable: '--font-serif' })
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
export function Kofi({ className = '' }: { className?: string }) {
  return (
    <Piece ratio={4 / 5} className={`bg-[#1b0f08] ${className}`}>
      <Img src="latte.jpg" style={{ objectPosition: '50% 40%' }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(27,15,8,0.05)_35%,rgba(27,15,8,0.92)_100%)]" />
      <div className="absolute" style={{ left: '6cqw', top: '5cqw', ...M, fontSize: '2.6cqw', letterSpacing: '0.18em', color: '#f1e3c9' }}>KOFI · EST. LAGOS</div>
      <div className="absolute" style={{ right: '6cqw', top: '5cqw', ...M, fontSize: '2.6cqw', letterSpacing: '0.18em', color: '#f1e3c9' }}>№ 01</div>
      <div className="absolute" style={{ left: '5cqw', bottom: '20cqw', ...D, fontSize: '29cqw', lineHeight: 0.84, color: '#f7f2ea', letterSpacing: '0.01em' }}>SLOW<br />MORNING</div>
      <div className="absolute" style={{ left: '6cqw', bottom: '8cqw', ...S, fontStyle: 'italic', fontSize: '5.2cqw', color: '#f1e3c9', lineHeight: 1.1 }}>Roasted in Yaba. Poured from 6am.</div>
      <div className="absolute rounded-full flex items-center justify-center" style={{ right: '6cqw', bottom: '8cqw', width: '17cqw', height: '17cqw', background: '#c9752b', ...M, fontSize: '2.4cqw', color: '#1b0f08', textAlign: 'center', lineHeight: 1.2, transform: 'rotate(-12deg)' }}>OPENS<br />04.10</div>
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
export function Sessions({ className = '' }: { className?: string }) {
  return (
    <Piece ratio={2 / 3} className={`bg-[#07070a] ${className}`}>
      <Img src="smoke.jpg" className="opacity-90" style={{ objectPosition: '50% 30%' }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,10,0.1)_0%,rgba(7,7,10,0.3)_50%,rgba(7,7,10,0.95)_100%)]" />
      <div className="absolute" style={{ left: '6cqw', top: '6cqw', ...M, fontSize: '2.6cqw', letterSpacing: '0.2em', color: '#fff' }}>LAGOS</div>
      <div className="absolute" style={{ right: '6cqw', top: '6cqw', ...M, fontSize: '2.6cqw', letterSpacing: '0.2em', color: '#fff' }}>VOL. IX</div>
      <div className="absolute" style={{ left: '5cqw', top: '30cqw', ...D, fontSize: '30cqw', lineHeight: 0.86, color: '#fff', letterSpacing: '-0.01em' }}>NIGHT<br />SESS<br />IONS</div>
      <div className="absolute" style={{ left: '6cqw', bottom: '20cqw', ...S, fontSize: '5cqw', color: '#fff', lineHeight: 1.25 }}>Tems · Odumodublvck · Bloody Civilian<br /><span style={{ fontStyle: 'italic', color: '#b9afff' }}>with special guests</span></div>
      <div className="absolute flex items-end justify-between" style={{ left: '6cqw', right: '6cqw', bottom: '6cqw', borderTop: '1px solid rgba(255,255,255,0.35)', paddingTop: '2.5cqw', ...M, fontSize: '2.6cqw', letterSpacing: '0.14em', color: '#fff', lineHeight: 1.6 }}>
        <span>SAT 12 DEC<br />DOORS 9PM</span><span style={{ textAlign: 'right' }}>MUSON CENTRE<br />ONIKAN</span>
      </div>
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
export function KofiGuide({ className = '' }: { className?: string }) {
  const ramp = ['#2b1608', '#4a2610', '#6f3a17', '#98511f', '#c9752b', '#dd9a5e', '#ebbf98', '#f5dfca', '#fbf1e6']
  return (
    <Piece ratio={16 / 10} className={`bg-[#fbf1e6] ${className}`}>
      <div className="absolute" style={{ left: '4cqw', top: '4cqw', ...M, fontSize: '1.4cqw', letterSpacing: '0.16em', color: '#6f3a17' }}>KOFI BRAND GUIDELINES · 03 COLOUR</div>
      <div className="absolute" style={{ right: '4cqw', top: '4cqw', ...M, fontSize: '1.4cqw', color: '#6f3a17' }}>12 / 28</div>
      <div className="absolute" style={{ left: '4cqw', top: '11cqw', ...S, fontSize: '7cqw', lineHeight: 1, color: '#2b1608' }}>Roast, <span style={{ fontStyle: 'italic' }}>from bean to crema.</span></div>
      <div className="absolute flex" style={{ left: '4cqw', right: '4cqw', top: '27cqw', height: '14cqw', gap: '0.6cqw' }}>
        {ramp.map((c, i) => <div key={c} className="flex-1 flex items-end" style={{ background: c, borderRadius: '0.8cqw', padding: '1cqw', ...M, fontSize: '1.1cqw', color: i < 5 ? '#fbf1e6' : '#2b1608' }}>{(i + 1) * 100}</div>)}
      </div>
      <div className="absolute" style={{ left: '4cqw', top: '45cqw', ...M, fontSize: '1.3cqw', letterSpacing: '0.14em', color: '#6f3a17' }}>PRIMARY · ROAST 500</div>
      <div className="absolute" style={{ left: '4cqw', top: '48.5cqw', ...M, fontSize: '1.3cqw', color: '#2b1608', lineHeight: 1.8 }}>#C9752B · oklch(64% 0.14 55)<br />On Cream 900: 5.1 : 1 AA<br />On Roast 100: 7.6 : 1 AAA</div>
      <div className="absolute" style={{ left: '40cqw', top: '45cqw', ...M, fontSize: '1.3cqw', letterSpacing: '0.14em', color: '#6f3a17' }}>TYPE</div>
      <div className="absolute" style={{ left: '40cqw', top: '48cqw', ...D, fontSize: '5.2cqw', lineHeight: 1, color: '#2b1608' }}>BEBAS NEUE</div>
      <div className="absolute" style={{ left: '40cqw', top: '54cqw', ...S, fontSize: '3.2cqw', fontStyle: 'italic', color: '#2b1608' }}>Instrument Serif, italic</div>
      <div className="absolute rounded-full flex items-center justify-center" style={{ right: '4cqw', bottom: '4cqw', width: '13cqw', height: '13cqw', background: '#c9752b', ...D, fontSize: '4.5cqw', color: '#2b1608' }}>KOFI</div>
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
  const tools = ['V', 'M', 'L', 'W', 'C', 'I', 'J', 'S', 'B', 'E', 'G', 'T', 'U', 'H', 'Z']
  return (
    <Piece ratio={16 / 10} className={`${chrome} ${className}`} style={{ fontFamily: 'var(--font-inter), Inter, system-ui' }}>
      <div className="absolute inset-x-0 top-0 flex items-center" style={{ height: '5cqw', background: '#141416', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 2cqw', gap: '2.4cqw', fontSize: '1.35cqw', color: '#b8b8c1' }}>
        <span className="rounded" style={{ width: '2.2cqw', height: '2.2cqw', background: '#fff' }} />
        {['File', 'Edit', 'Image', 'Layer', 'Select', 'Filter', 'View', 'Window', 'Help'].map(m => <span key={m}>{m}</span>)}
        <span className="ml-auto rounded-full" style={{ padding: '0.5cqw 1.6cqw', background: '#fff', color: '#0c0c0e', fontWeight: 600 }}>Export</span>
      </div>
      <div className="absolute flex flex-col items-center" style={{ left: 0, top: '5cqw', bottom: 0, width: '4.4cqw', background: '#141416', borderRight: '1px solid rgba(255,255,255,0.06)', paddingTop: '1cqw', gap: '0.6cqw' }}>
        {tools.map((t, i) => <span key={t} className="rounded flex items-center justify-center" style={{ width: '2.8cqw', height: '2.8cqw', background: i === 0 ? '#8b7cff' : 'transparent', color: i === 0 ? '#fff' : '#747484', fontSize: '1.2cqw', fontWeight: 600 }}>{t}</span>)}
      </div>
      <div className="absolute flex items-center justify-center" style={{ left: '4.4cqw', right: '22cqw', top: '5cqw', bottom: 0, background: '#0c0c0e' }}>
        <div className="relative" style={{ height: '46cqw', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
          <div className="h-full [&>*]:h-full">{piece}</div>
          <div className="absolute inset-0 pointer-events-none" style={{ outline: '1px solid #8b7cff', outlineOffset: '-1px' }}>
            {[[0, 0], [100, 0], [0, 100], [100, 100]].map(([x, y]) => <span key={`${x}${y}`} className="absolute bg-white" style={{ width: '0.9cqw', height: '0.9cqw', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', border: '1px solid #8b7cff' }} />)}
          </div>
        </div>
      </div>
      <div className="absolute" style={{ right: 0, top: '5cqw', bottom: 0, width: '22cqw', background: '#1a1a1e', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center" style={{ height: '3.6cqw', padding: '0 1.4cqw', fontSize: '1.3cqw', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', gap: '1.4cqw' }}><span>Layers</span><span style={{ color: '#5e5e6c', fontWeight: 400 }}>Properties</span><span style={{ color: '#5e5e6c', fontWeight: 400 }}>History</span></div>
        <div className="flex items-center" style={{ padding: '0.9cqw 1.4cqw', gap: '1cqw', fontSize: '1.15cqw', color: '#91919f' }}><span className="rounded" style={{ padding: '0.3cqw 0.8cqw', background: '#222228' }}>Normal</span><span className="rounded ml-auto" style={{ padding: '0.3cqw 0.8cqw', background: '#222228' }}>100%</span></div>
        {layers.map((l, i) => (
          <div key={l.name} className="flex items-center" style={{ margin: '0 0.8cqw 0.5cqw', padding: '0.7cqw 0.8cqw', borderRadius: '0.6cqw', background: i === 0 ? '#2b2740' : 'transparent', gap: '1cqw', fontSize: '1.25cqw' }}>
            <span style={{ width: '1cqw', color: l.on === false ? '#42424b' : '#b8b8c1', fontSize: '1cqw' }}>●</span>
            <span className="rounded" style={{ width: '2.4cqw', height: '2.4cqw', background: l.kind === 'text' ? '#f7f7f8' : l.kind === 'filter' ? '#8b7cff' : l.kind === 'adjust' ? '#ffb020' : l.kind === 'shape' ? '#c9752b' : '#3a3358', color: '#0c0c0e', fontSize: '1.3cqw', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l.kind === 'text' ? 'T' : l.kind === 'filter' ? 'fx' : l.kind === 'adjust' ? '◐' : ''}</span>
            <span className="truncate" style={{ color: i === 0 ? '#fff' : '#b8b8c1' }}>{l.name}</span>
          </div>
        ))}
      </div>
    </Piece>
  )
}

/** Studio with a real job open: brief, references, the palette pulled from them, directions. */
export function StudioFrame({ className = '' }: { className?: string }) {
  return (
    <Piece ratio={16 / 10} className={`${chrome} ${className}`} style={{ fontFamily: 'var(--font-inter), Inter, system-ui' }}>
      <div className="absolute inset-x-0 top-0 flex items-center" style={{ height: '5cqw', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 2cqw', gap: '1.6cqw', fontSize: '1.35cqw', color: '#b8b8c1' }}>
        <span className="rounded" style={{ width: '2.2cqw', height: '2.2cqw', background: '#fff' }} />
        <span style={{ color: '#fff', fontWeight: 600 }}>Kofi · Launch campaign</span>
        {['Brief', 'References', 'Directions', 'Formats', 'Review', 'Deliver'].map((t, i) => <span key={t} className="rounded-full" style={{ padding: '0.5cqw 1.2cqw', background: i === 2 ? '#2b2740' : 'transparent', color: i === 2 ? '#fff' : '#91919f' }}>{t}</span>)}
      </div>
      <div className="absolute" style={{ left: '2cqw', top: '7cqw', width: '30cqw', bottom: '2cqw' }}>
        <p style={{ fontSize: '1.2cqw', letterSpacing: '0.12em', color: '#8b7cff', fontWeight: 600 }}>BRIEF</p>
        <p style={{ marginTop: '0.8cqw', fontSize: '1.45cqw', lineHeight: 1.5, color: '#d9d9de' }}>Launch a specialty coffee bar in Yaba. Warm, premium, quietly confident. Instagram first, A5 flyers for the estate, one poster for the window. Avoid the usual green.</p>
        <p style={{ marginTop: '2.2cqw', fontSize: '1.2cqw', letterSpacing: '0.12em', color: '#8b7cff', fontWeight: 600 }}>PALETTE FROM REFERENCES</p>
        <div className="flex" style={{ marginTop: '0.8cqw', gap: '0.6cqw' }}>{['#2b1608', '#6f3a17', '#c9752b', '#ebbf98', '#fbf1e6'].map(c => <span key={c} className="flex-1 rounded" style={{ height: '3.4cqw', background: c }} />)}</div>
        <p style={{ marginTop: '2.2cqw', fontSize: '1.2cqw', letterSpacing: '0.12em', color: '#8b7cff', fontWeight: 600 }}>DIRECTION</p>
        <p style={{ marginTop: '0.8cqw', fontSize: '1.45cqw', lineHeight: 1.5, color: '#d9d9de' }}>Editorial. Big condensed type, one italic serif line, mono for facts.</p>
        <span className="absolute bottom-0 left-0 rounded-full" style={{ padding: '0.9cqw 2cqw', background: '#fff', color: '#0c0c0e', fontSize: '1.35cqw', fontWeight: 600 }}>Start design in Editor</span>
      </div>
      <div className="absolute grid grid-cols-3" style={{ left: '35cqw', right: '2cqw', top: '7cqw', gap: '1cqw' }}>
        <Photo src="latte.jpg" ratio={16 / 9} className="rounded-lg" />
        <Photo src="beans.jpg" ratio={16 / 9} className="rounded-lg" />
        <Photo src="beanie.jpg" ratio={16 / 9} className="rounded-lg" position="50% 20%" />
      </div>
      <div className="absolute grid grid-cols-3" style={{ left: '35cqw', right: '2cqw', top: '20cqw', gap: '1cqw' }}>
        {['A', 'B', 'C'].map((d, i) => (
          <div key={d} className="rounded-lg overflow-hidden" style={{ background: '#0c0c0e', border: `1px solid ${i === 1 ? '#8b7cff' : 'rgba(255,255,255,0.08)'}` }}>
            <div className="relative overflow-hidden" style={{ margin: '0.8cqw', height: '30cqw', borderRadius: '0.5cqw' }}><div className="absolute inset-x-0 top-0">{i === 1 ? <Kofi /> : i === 0 ? <KofiAlt /> : <KofiC />}</div></div>
            <div className="flex items-center justify-between" style={{ padding: '0 1cqw 0.9cqw', fontSize: '1.15cqw', color: i === 1 ? '#b9afff' : '#747484' }}><span>Direction {d}</span>{i === 1 && <span>Approved</span>}</div>
          </div>
        ))}
      </div>
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

/** Effects with a real photo and its real halftone side by side. */
export function EffectsFrame({ className = '' }: { className?: string }) {
  const list = ['Halftone', 'Dither', 'ASCII', 'Glitch', 'Pixel sort', 'CRT', 'Duotone', 'Crosshatch', 'Low poly']
  return (
    <Piece ratio={16 / 10} className={`${chrome} ${className}`} style={{ fontFamily: 'var(--font-inter), Inter, system-ui' }}>
      <div className="absolute inset-x-0 top-0 flex items-center" style={{ height: '5cqw', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 2cqw', gap: '1.6cqw', fontSize: '1.35cqw', color: '#b8b8c1' }}>
        <span className="rounded" style={{ width: '2.2cqw', height: '2.2cqw', background: '#fff' }} /><span style={{ color: '#fff', fontWeight: 600 }}>Effects</span>
        <span className="ml-auto rounded-full" style={{ padding: '0.5cqw 1.6cqw', border: '1px solid rgba(255,255,255,0.2)' }}>Open in Editor</span>
        <span className="rounded-full" style={{ padding: '0.5cqw 1.6cqw', background: '#fff', color: '#0c0c0e', fontWeight: 600 }}>Download PNG</span>
      </div>
      <div className="absolute" style={{ left: '2cqw', top: '7cqw', width: '26cqw' }}>
        <div className="flex flex-col" style={{ gap: '0.4cqw' }}>
          {list.map((n, i) => <span key={n} className="rounded-lg" style={{ padding: '0.9cqw 1.2cqw', background: i === 0 ? '#8b7cff' : 'transparent', color: i === 0 ? '#fff' : '#b8b8c1', fontSize: '1.35cqw', fontWeight: i === 0 ? 600 : 400 }}>{n}</span>)}
        </div>
        <div style={{ marginTop: '1.6cqw', fontSize: '1.15cqw', color: '#91919f' }}>
          {[['Dot size', 62], ['Contrast', 40]].map(([l, v]) => <div key={l as string} style={{ marginBottom: '1cqw' }}><div className="flex justify-between"><span>{l}</span><span style={{ color: '#eeeef0' }}>{v}</span></div><div className="relative rounded" style={{ height: '0.5cqw', background: '#34343d', marginTop: '0.5cqw' }}><div className="absolute left-0 top-0 h-full rounded" style={{ width: `${v}%`, background: '#8b7cff' }} /></div></div>)}
        </div>
      </div>
      <div className="absolute" style={{ left: '30cqw', right: '2cqw', top: '7cqw', bottom: '2cqw' }}>
        <div className="relative h-full w-full rounded-lg overflow-hidden">
          <img src="/landing/beard.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <img src="/landing/fx-halftone.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ clipPath: 'inset(0 0 0 42%)' }} />
          <span className="absolute top-0 bottom-0" style={{ left: '42%', width: '2px', background: '#fff' }} />
          <span className="absolute rounded-full" style={{ left: '42%', top: '50%', width: '3cqw', height: '3cqw', background: '#fff', transform: 'translate(-50%,-50%)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }} />
        </div>
      </div>
    </Piece>
  )
}
