// Open Graph images for Learn, drawn with next/og at build time. One design, three uses: guides, routes and the hub.
// Kept plain on purpose: the title is the picture. Colours are the site's dark theme so the card matches the page.
import { ImageResponse } from 'next/og'

export const OG_SIZE = { width: 1200, height: 630 }

const short = (s: string, max: number) => { if (s.length <= max) return s; const cut = s.slice(0, max); return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…' }

export function ogImage({ eyebrow, title, meta, answer: answerIn }: { eyebrow: string; title: string; meta?: string; answer?: string }) {
  const size = title.length > 70 ? 46 : title.length > 44 ? 56 : 66
  const answer = answerIn ? short(answerIn, title.length > 44 ? 170 : 230) : undefined
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: 'linear-gradient(135deg, #0d0d10 0%, #141420 60%, #1b1633 100%)', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: '#8b7cff' }} />
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>Voidcanvas</div>
            <div style={{ fontSize: 26, color: '#8f8fa3', marginLeft: 4 }}>Learn</div>
          </div>
          <div style={{ fontSize: 22, color: '#b9afff', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{eyebrow}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 1000 }}>
          <div style={{ fontSize: size, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div>
          {answer && <div style={{ fontSize: 26, lineHeight: 1.4, color: '#c9c9d4' }}>{answer}</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 22, color: '#8f8fa3' }}>
          <div>{meta ?? 'Guides that answer real design questions, then show the steps.'}</div>
          <div style={{ color: '#fff', fontWeight: 500 }}>voidcanvas.netlify.app/learn</div>
        </div>
      </div>
    ),
    OG_SIZE,
  )
}
