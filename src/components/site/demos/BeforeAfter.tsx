'use client'

// Two images, one slider. Keyboard: the range input is the control, so arrow keys work.
import { useState } from 'react'

export default function BeforeAfter({ before, after, alt, caption }: { before: string; after: string; alt?: string; caption?: string }) {
  const [v, setV] = useState(50)
  return (
    <figure className="not-prose rounded-[24px] border border-lp-line bg-lp-card overflow-hidden">
      <div className="relative select-none" style={{ aspectRatio: '4 / 3' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after} alt={alt ? `${alt}, after` : ''} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${v}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={before} alt={alt ? `${alt}, before` : ''} className="absolute inset-0 h-full object-cover" style={{ width: `${10000 / Math.max(1, v)}%`, maxWidth: 'none' }} draggable={false} />
        </div>
        <div aria-hidden className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.3)]" style={{ left: `calc(${v}% - 1px)` }}>
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white text-black text-[12px] font-semibold flex items-center justify-center shadow">↔</span>
        </div>
        <span aria-hidden className="absolute left-3 top-3 px-2 h-6 rounded-full bg-black/60 text-white text-[12px] flex items-center">Before</span>
        <span aria-hidden className="absolute right-3 top-3 px-2 h-6 rounded-full bg-black/60 text-white text-[12px] flex items-center">After</span>
        <input type="range" min={0} max={100} value={v} onChange={e => setV(+e.target.value)} aria-label="Reveal the before or after image" className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize" />
      </div>
      {caption && <figcaption className="px-5 py-3 border-t border-lp-line text-[13.5px] text-lp-dim">{caption}</figcaption>}
    </figure>
  )
}
