'use client'

// Social formats with the interface the platform draws on top, and the safe area that is left. The overlay sizes are
// the commonly published guidance (Meta's 14 per cent for Stories, the Reels caption and action column, YouTube's
// duration badge, the LinkedIn profile photo). Platforms change them, so the figure says "approximate".
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { track } from '@/lib/analytics'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

type Zone = { x: number; y: number; w: number; h: number; label: string }
type Fmt = { id: string; name: string; w: number; h: number; preset: string; zones: Zone[]; safe: { x: number; y: number; w: number; h: number }; note: string }
const FORMATS: Fmt[] = [
  { id: 'post', name: 'Instagram post', w: 1080, h: 1350, preset: 'ig-post', zones: [], safe: { x: 0, y: 135, w: 1080, h: 1080 }, note: 'Nothing is drawn over a feed post, but the profile grid shows a 1:1 crop from the centre. Keep the subject inside that square if the grid matters.' },
  { id: 'story', name: 'Story', w: 1080, h: 1920, preset: 'story', zones: [{ x: 0, y: 0, w: 1080, h: 250, label: 'Progress bar, name, close' }, { x: 0, y: 1670, w: 1080, h: 250, label: 'Reply box, share' }], safe: { x: 0, y: 250, w: 1080, h: 1420 }, note: 'Meta suggests keeping roughly the top and bottom 14 per cent (about 250 px) free of text and logos.' },
  { id: 'reel', name: 'Reel cover', w: 1080, h: 1920, preset: 'story', zones: [{ x: 0, y: 0, w: 1080, h: 220, label: 'Status bar, tabs' }, { x: 0, y: 1500, w: 1080, h: 420, label: 'Account, caption, audio' }, { x: 960, y: 700, w: 120, h: 800, label: 'Like, comment, share' }], safe: { x: 60, y: 220, w: 900, h: 1280 }, note: 'Reels lose more of the bottom to the caption and audio line, and a column on the right to the buttons. Keep text upper-middle and off the right edge.' },
  { id: 'yt', name: 'YouTube thumbnail', w: 1280, h: 720, preset: 'yt', zones: [{ x: 1080, y: 640, w: 200, h: 80, label: 'Duration' }], safe: { x: 40, y: 40, w: 1200, h: 600 }, note: 'The video length sits in the bottom right. Thumbnails are seen at 200 to 400 px wide, so the safe area matters less than size: three words, one face.' },
  { id: 'li', name: 'LinkedIn banner', w: 1584, h: 396, preset: 'li', zones: [{ x: 60, y: 200, w: 300, h: 196, label: 'Profile photo' }, { x: 0, y: 0, w: 1584, h: 40, label: 'Top strip, cropped on some screens' }, { x: 0, y: 356, w: 1584, h: 40, label: 'Bottom strip, cropped on some screens' }], safe: { x: 400, y: 60, w: 1120, h: 276 }, note: 'The profile photo covers the lower left, more so on phones, and the top and bottom are cropped differently by screen. Keep the message in the centre band, right of the photo.' },
]

export default function SafeZonesDemo({ caption }: { caption?: string }) {
  const [id, setId] = useState('story')
  const [ui, setUi] = useState(true)
  const f = FORMATS.find(x => x.id === id)!
  const touched = { current: false }
  const mark = () => { if (!touched.current) { touched.current = true; track('learn.demo', { kind: 'safe-zones' }) } }
  const tall = f.h >= f.w

  return (
    <figure className="not-prose rounded-[24px] border border-lp-line bg-lp-card overflow-hidden">
      <div className="grid md:grid-cols-[minmax(0,1fr)_300px]">
        <div className="p-5 bg-lp-panel/40 flex items-center justify-center min-h-[300px] md:min-h-[460px]">
          <svg viewBox={`0 0 ${f.w} ${f.h}`} role="img" aria-label={`${f.name}: the interface overlays and the safe area`} className="rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.35)]" style={tall ? { height: 420, width: 'auto', maxWidth: '100%' } : { width: '100%', maxWidth: 600, height: 'auto' }}>
            <defs>
              <linearGradient id="sz-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f7bff" /><stop offset="1" stopColor="#0a2a8a" /></linearGradient>
              <pattern id="sz-hatch" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="24" height="24" fill="rgba(0,0,0,0.35)" /><rect width="6" height="24" fill="rgba(255,255,255,0.18)" /></pattern>
            </defs>
            <rect width={f.w} height={f.h} fill="url(#sz-bg)" />
            <circle cx={f.w * 0.72} cy={f.h * 0.42} r={Math.min(f.w, f.h) * 0.28} fill="#27ff8f" opacity="0.9" />
            {/* Sample content, placed inside the safe area */}
            <rect x={f.safe.x + f.safe.w * 0.06} y={f.safe.y + f.safe.h * 0.12} width={f.safe.w * 0.7} height={Math.min(f.safe.h * 0.11, 120)} rx="8" fill="#fff" />
            <rect x={f.safe.x + f.safe.w * 0.06} y={f.safe.y + f.safe.h * 0.12 + Math.min(f.safe.h * 0.11, 120) * 1.3} width={f.safe.w * 0.5} height={Math.min(f.safe.h * 0.11, 120)} rx="8" fill="#fff" />
            <rect x={f.safe.x + f.safe.w * 0.06} y={f.safe.y + f.safe.h - Math.min(f.safe.h * 0.08, 90) - f.safe.h * 0.06} width={Math.min(f.safe.w * 0.28, 260)} height={Math.min(f.safe.h * 0.08, 90)} rx="45" fill="#ff4fd8" />
            <rect x={f.safe.x + f.safe.w - Math.min(f.safe.h * 0.1, 110) - f.safe.w * 0.06} y={f.safe.y + f.safe.h - Math.min(f.safe.h * 0.1, 110) - f.safe.h * 0.06} width={Math.min(f.safe.h * 0.1, 110)} height={Math.min(f.safe.h * 0.1, 110)} rx="16" fill="#fff" opacity="0.9" />
            {/* Interface overlays */}
            {ui && f.zones.map((z, i) => {
              const fs = Math.min(Math.max(28, f.w * 0.03), z.h * 0.7, (z.w - 48) / (z.label.length * 0.52))
              return (
              <g key={i}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} fill="url(#sz-hatch)" />
                {z.w < 300 && z.h > z.w
                  ? <text transform={`translate(${z.x + z.w / 2 + 12} ${z.y + z.h / 2}) rotate(90)`} textAnchor="middle" fontSize={Math.max(28, f.w * 0.03)} fontFamily="Inter, system-ui, sans-serif" fill="#fff" opacity="0.95">{z.label}</text>
                  : <text x={z.x + 24} y={z.y + Math.min(z.h, 120) / 2 + fs * 0.36} fontSize={fs} fontFamily="Inter, system-ui, sans-serif" fill="#fff" opacity="0.95">{z.label}</text>}
              </g>
              )
            })}
            {/* Safe area */}
            <rect x={f.safe.x + 4} y={f.safe.y + 4} width={f.safe.w - 8} height={f.safe.h - 8} fill="none" stroke="#fff" strokeWidth={Math.max(4, f.w * 0.004)} strokeDasharray={`${f.w * 0.02} ${f.w * 0.012}`} opacity="0.9" />
          </svg>
        </div>
        <div className="p-5 border-t md:border-t-0 md:border-l border-lp-line flex flex-col gap-4 text-[13.5px]">
          <div className="flex flex-wrap gap-1.5">
            {FORMATS.map(x => <button key={x.id} type="button" onClick={() => { setId(x.id); mark() }} aria-pressed={x.id === id} className={`h-8 px-3 rounded-full border text-[12.5px] ${x.id === id ? 'bg-lp-btn text-lp-btn-fg border-transparent' : 'border-lp-line text-lp-dim hover:text-lp-fg'} ${focus}`}>{x.name}</button>)}
          </div>
          <label className="flex items-center gap-2 text-lp-text"><input type="checkbox" checked={ui} onChange={e => { setUi(e.target.checked); mark() }} className="accent-[var(--accent)]" />Show the platform's interface</label>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px] border-t border-lp-line pt-3">
            <dt className="text-lp-dim">Canvas</dt><dd className="tabular-nums text-lp-fg">{f.w} × {f.h} px</dd>
            <dt className="text-lp-dim">Safe area</dt><dd className="tabular-nums text-lp-fg">{f.safe.w} × {f.safe.h} px</dd>
            <dt className="text-lp-dim">Keep clear</dt><dd className="tabular-nums text-lp-fg">{f.zones.length ? f.zones.map(z => `${z.label.toLowerCase()} (${z.w} × ${z.h})`).join('; ') : 'nothing drawn over it'}</dd>
          </dl>
          <p className="text-[12.5px] leading-snug text-lp-dim">{f.note}</p>
          <p className="text-[12px] text-lp-faint">Approximate, from published platform guidance. Check the current spec before a paid placement.</p>
          <Link href={`/editor?preset=${f.preset}`} onClick={() => track('learn.try', { where: 'safe-zones', preset: f.preset })} className={`mt-auto inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-lp-btn text-lp-btn-fg text-[14px] font-medium hover:bg-lp-btn-hover ${focus}`}>Open this preset <ArrowRight size={15} /></Link>
        </div>
      </div>
      {caption && <figcaption className="px-5 py-3 border-t border-lp-line text-[13.5px] text-lp-dim">{caption}</figcaption>}
    </figure>
  )
}
