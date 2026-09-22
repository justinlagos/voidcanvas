'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Logo } from '@/components/AppNav'
import { Lock } from 'lucide-react'
import { PrivacyPanel, PrivateBadge } from '@/editor/components/PrivacyPanel'
import { initPrivateFromSession } from '@/editor/io'
import { listProjects, type ProjectSummary } from '@/editor/io'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b7cff]'

// Each module is a complete tool on its own. The arrows between them are real: work moves with one click.
const MODULES = [
  { href: '/studio', name: 'Studio', line: 'Start from a brief', body: 'Write the brief, collect references, and get a palette pulled from them. Then open it all in the Editor.', art: 'studio' },
  { href: '/editor', name: 'Editor', line: 'Design and retouch', body: 'Layers, masks, type, shapes, background removal, healing, and 60 live filters. Nothing to install.', art: 'editor' },
  { href: '/effects', name: 'Effects', line: 'One photo, one click', body: 'Halftone, dither, glitch, ASCII and more. Export straight away or send the result to the Editor.', art: 'effects' },
] as const

function Art({ kind }: { kind: string }) {
  if (kind === 'studio') return (
    <svg viewBox="0 0 240 120" className="w-full h-full" aria-hidden>
      <rect x="16" y="18" width="62" height="84" rx="6" fill="#2a2a33" /><rect x="86" y="18" width="62" height="40" rx="6" fill="#3a3358" /><rect x="86" y="64" width="62" height="38" rx="6" fill="#23232b" /><rect x="156" y="18" width="68" height="56" rx="6" fill="#2f2f39" />
      {['#8b7cff', '#ff5a5f', '#ffb020', '#eeeef0'].map((c, i) => <rect key={c} x={156 + i * 17.5} y="84" width="15" height="18" rx="4" fill={c} />)}
    </svg>
  )
  if (kind === 'editor') return (
    <svg viewBox="0 0 240 120" className="w-full h-full" aria-hidden>
      <rect x="40" y="34" width="120" height="70" rx="6" fill="#23232b" /><rect x="60" y="24" width="120" height="70" rx="6" fill="#3a3358" /><rect x="80" y="14" width="120" height="70" rx="6" fill="#8b7cff" />
      <circle cx="200" cy="14" r="4" fill="#fff" /><circle cx="80" cy="84" r="4" fill="#fff" /><circle cx="200" cy="84" r="4" fill="#fff" /><circle cx="80" cy="14" r="4" fill="#fff" />
    </svg>
  )
  return (
    <svg viewBox="0 0 240 120" className="w-full h-full" aria-hidden>
      {Array.from({ length: 9 }).flatMap((_, y) => Array.from({ length: 18 }).map((__, x) => {
        const d = Math.hypot(x - 8.5, y - 4); const r = Math.max(0.6, 5.2 - d * 0.62)
        return <circle key={`${x}-${y}`} cx={18 + x * 12} cy={12 + y * 12} r={r} fill={d < 3.2 ? '#8b7cff' : '#4d4d58'} />
      }))}
    </svg>
  )
}

export default function Home() {
  const [recent, setRecent] = useState<ProjectSummary[]>([])
  const [privacy, setPrivacy] = useState(false)
  useEffect(() => { initPrivateFromSession(); listProjects().then(setRecent).catch(() => {}) }, [])

  return (
    <main className="min-h-[100dvh] bg-void-950 text-void-100">
      <header className="h-14 flex items-center justify-between px-5 sm:px-8"><div className="flex items-center gap-3"><Logo /><PrivateBadge /></div>
        <button onClick={() => setPrivacy(true)} className="flex items-center gap-1.5 text-[13px] text-void-400 hover:text-white"><Lock size={14} />Your privacy</button>
      </header>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-8 sm:pt-14 pb-16">
        <h1 className="text-[34px] sm:text-[52px] leading-[1.04] font-semibold tracking-[-0.03em] max-w-3xl">From the brief to the finished file, in one tab.</h1>
        <p className="mt-4 text-[15px] sm:text-[17px] text-void-400 max-w-xl leading-relaxed">Three tools that work alone and hand work to each other. Free to use, and your files never leave your browser.</p>
        <button onClick={() => setPrivacy(true)} className="mt-4 inline-flex items-center gap-2 px-3 h-9 rounded-full bg-void-900 border border-void-800 text-[13px] text-void-300 hover:text-white hover:border-void-600"><Lock size={14} className="text-[#b9afff]" />No account. No cloud. Private by default.</button>

        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {MODULES.map((m, i) => (
            <Link key={m.href} href={m.href} className={`group relative flex flex-col rounded-2xl bg-[#131318] border border-void-800/80 hover:border-void-600 transition-colors ${focus}`}>
              <span className="block h-36 p-4 bg-[#0f0f13] rounded-t-2xl"><Art kind={m.art} /></span>
              <span className="block p-5">
                <span className="block text-[12.5px] text-[#b9afff] font-medium">{m.line}</span>
                <span className="block mt-0.5 text-[20px] font-semibold tracking-tight">{m.name}</span>
                <span className="block mt-2 text-[13.5px] text-void-400 leading-relaxed">{m.body}</span>
                <span className="inline-block mt-4 text-[13px] font-medium text-white underline underline-offset-4 decoration-void-600 group-hover:decoration-white">Open {m.name}</span>
              </span>
              {i < 2 && <span aria-hidden className="hidden md:flex absolute -right-[13px] top-[62px] z-10 w-6 h-6 rounded-full bg-void-950 border border-void-700 items-center justify-center text-void-400 text-[12px]">›</span>}
            </Link>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="text-[13px] font-semibold text-void-200 mb-3">Quick tools, no account needed</h2>
          <div className="flex flex-wrap gap-2">
            {[['halftone','Halftone'],['dither','Dither'],['glitch','Glitch']].map(([slug,name]) => (
              <Link key={slug} href={`/tools/${slug}`} className={`h-9 px-3.5 rounded-lg bg-void-900 border border-void-800 text-[13px] text-void-200 hover:text-white hover:border-void-600 flex items-center ${focus}`}>{name}</Link>
            ))}
            <Link href="/effects" className={`h-9 px-3.5 rounded-lg bg-void-900 border border-void-800 text-[13px] text-void-200 hover:text-white hover:border-void-600 flex items-center ${focus}`}>All 60 effects</Link>
          </div>
        </section>

        {recent.length > 0 && (
          <section className="mt-14">
            <h2 className="text-[13px] font-semibold text-void-200 mb-3">Your recent designs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {recent.slice(0, 6).map(p => (
                <Link key={p.id} href={`/editor?project=${p.id}`} className={`block rounded-xl overflow-hidden bg-void-900 border border-void-800 hover:border-void-600 ${focus}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className="block aspect-square bg-void-950"><img src={p.thumb} alt="" className="w-full h-full object-contain" /></span>
                  <span className="block px-2.5 py-2 text-[12.5px] font-medium truncate">{p.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      {privacy && <PrivacyPanel onClose={() => setPrivacy(false)} />}
    </main>
  )
}
