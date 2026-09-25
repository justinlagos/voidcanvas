// Small shared pieces for Learn and the Blog. Server-safe (no hooks).
import Link from 'next/link'
import type { ReactNode } from 'react'
import { BookMarked, Briefcase, Compass, Layers, LifeBuoy, PenTool, Route, Sparkles } from 'lucide-react'
import type { LearnCategory, Level } from '@/content/types'

export const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export const CAT_ICON: Record<LearnCategory, typeof Layers> = {
  start: Compass, editor: Layers, studio: Briefcase, effects: Sparkles, workflows: Route, craft: PenTool, reference: BookMarked, help: LifeBuoy,
}

export function CatIcon({ id, size = 18, className = '' }: { id: LearnCategory; size?: number; className?: string }) {
  const I = CAT_ICON[id]
  return <I size={size} className={className} aria-hidden />
}

export function LevelTag({ level }: { level: Level }) {
  const dot = level === 'Beginner' ? 'bg-emerald-500' : level === 'Intermediate' ? 'bg-amber-400' : 'bg-rose-400'
  return <span className="inline-flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden />{level}</span>
}

export function ArticleCard({ href, title, summary, meta, className = '' }: { href: string; title: string; summary: string; meta?: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`group flex flex-col rounded-2xl bg-lp-card border border-lp-line p-5 hover:border-lp-faint hover:-translate-y-0.5 transition-[border-color,transform] duration-200 ${focus} ${className}`}>
      <span className="text-[16.5px] font-semibold tracking-tight leading-snug text-lp-fg group-hover:text-lp-accent transition-colors">{title}</span>
      <span className="mt-1.5 text-[14px] leading-relaxed text-lp-dim line-clamp-3">{summary}</span>
      {meta && <span className="mt-auto pt-4 flex items-center gap-3 text-[12.5px] text-lp-faint">{meta}</span>}
    </Link>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[13px] sm:text-[14px] font-semibold text-lp-accent tracking-wide">{children}</p>
}

export const SITE = 'https://voidcanvas.netlify.app'
