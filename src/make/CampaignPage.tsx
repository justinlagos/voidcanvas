'use client'

// The campaign destinations share one shape: one headline, one button, nothing to read.
// Five seconds in, the person knows what to do, where to click, and why it is interesting.
import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { track } from '@/lib/analytics'
import type { ChallengeKind } from './briefs'

export const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'

export function CampaignPage({ kind, title, sub, children, footer, dark = true }: { kind: ChallengeKind; title: ReactNode; sub?: ReactNode; children?: ReactNode; footer?: ReactNode; dark?: boolean }) {
  useEffect(() => { track('challenge.visit', { kind }) }, [kind])
  return (
    <main className={`min-h-[100dvh] flex flex-col ${dark ? 'bg-[#0b0b0e] text-white' : 'bg-[#f2f0ea] text-[#0b0b0e]'}`}>
      <header className="h-14 flex items-center justify-between px-5 sm:px-8">
        <Link href="/" className={`text-[15px] font-semibold tracking-tight rounded ${focus}`}>Void<span className="opacity-50">canvas</span></Link>
        <Link href="/make" className={`text-[13px] opacity-60 hover:opacity-100 rounded ${focus}`}>All challenges</Link>
      </header>
      <section className="flex-1 flex flex-col items-center justify-center text-center px-5 pb-20">
        <h1 className="text-[44px] sm:text-[84px] lg:text-[112px] font-semibold tracking-[-0.05em] leading-[0.92] max-w-5xl">{title}</h1>
        {sub && <p className="mt-5 text-[17px] sm:text-[22px] opacity-70 max-w-xl">{sub}</p>}
        <div className="mt-9 sm:mt-12 flex flex-col items-center gap-4">{children}</div>
      </section>
      <footer className="px-5 sm:px-8 pb-6 text-center text-[12.5px] opacity-50">{footer ?? 'No account. Nothing leaves your browser.'}</footer>
    </main>
  )
}

export function BigButton({ onClick, children, busy, className = '', light }: { onClick?: () => void; children: ReactNode; busy?: boolean; className?: string; light?: boolean }) {
  return (
    <button data-campaign-cta onClick={onClick} disabled={busy}
      className={`h-16 sm:h-20 px-9 sm:px-12 rounded-full text-[18px] sm:text-[24px] font-semibold tracking-tight transition-transform active:scale-[0.98] disabled:opacity-60 ${light ? 'bg-[#0b0b0e] text-white hover:bg-[#222]' : 'bg-white text-[#0b0b0e] hover:bg-[#e9e9ec]'} ${focus} ${className}`}>
      {busy ? 'Opening…' : children}
    </button>
  )
}

/** A drop zone that is also a button: click to pick, or drop a file on it. */
export function DropButton({ accept, onFile, children, light }: { accept: string; onFile: (f: File) => void; children: ReactNode; light?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  useEffect(() => {
    const stop = (e: DragEvent) => { e.preventDefault(); setOver(true) }
    const leave = () => setOver(false)
    const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); const f = e.dataTransfer?.files?.[0]; if (f) onFile(f) }
    window.addEventListener('dragover', stop); window.addEventListener('dragleave', leave); window.addEventListener('drop', drop)
    return () => { window.removeEventListener('dragover', stop); window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop) }
  }, [onFile])
  return (
    <>
      <input ref={input} type="file" accept={accept} className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      <BigButton light={light} onClick={() => input.current?.click()} className={over ? 'ring-4 ring-white/40 scale-[1.03]' : ''}>{children}</BigButton>
      <p className="text-[13px] opacity-50">or drop it anywhere on this page</p>
    </>
  )
}

export function Small({ children }: { children: ReactNode }) { return <p className="text-[13px] opacity-60 max-w-sm">{children}</p> }
