'use client'

// Shared pieces for the Working Designer Study pages: the page frame, form controls and the token-loading hook.

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { loadView, studyErrorText, type StudyView } from '@/lib/research'

export const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
export const field = `w-full rounded-xl bg-[var(--lp-field)] border border-lp-line px-3.5 text-[15px] text-lp-text placeholder:text-lp-faint focus:border-lp-faint focus:outline-none ${focus} transition-colors`
export const label = 'block text-[14.5px] font-medium text-lp-fg'
export const hint = 'mt-1 text-[13px] leading-relaxed text-lp-dim'

export function StudyFrame({ eyebrow, title, intro, children, width = 760 }: { eyebrow: string; title: ReactNode; intro?: ReactNode; children: ReactNode; width?: number }) {
  return (
    <div className="mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-8" style={{ maxWidth: width }}>
      <p className="text-[13px] sm:text-[14px] font-semibold text-lp-accent tracking-wide">{eyebrow}</p>
      <h1 className="mt-3 text-[34px] sm:text-[48px] leading-[1.04] font-semibold tracking-[-0.035em] text-lp-fg">{title}</h1>
      {intro && <div className="mt-4 text-[16.5px] sm:text-[18px] leading-relaxed text-lp-muted">{intro}</div>}
      <div className="mt-10">{children}</div>
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[24px] bg-lp-card border border-lp-line p-5 sm:p-8 ${className}`}>{children}</div>
}

export function Button({ children, disabled, busy, onClick, type = 'button', variant = 'primary', className = '' }: { children: ReactNode; disabled?: boolean; busy?: boolean; onClick?: () => void; type?: 'button' | 'submit'; variant?: 'primary' | 'secondary'; className?: string }) {
  const look = variant === 'primary' ? 'bg-lp-btn text-lp-btn-fg hover:bg-lp-btn-hover' : 'bg-transparent border border-lp-line text-lp-fg hover:border-lp-faint'
  return (
    <button type={type} onClick={onClick} disabled={disabled || busy} aria-busy={busy} className={`inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-[15px] font-medium disabled:opacity-40 transition-colors ${look} ${focus} ${className}`}>
      {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}{children}
    </button>
  )
}

export function Tick({ checked, onChange, children, required, id }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; required?: boolean; id: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-[3px] w-[18px] h-[18px] shrink-0 accent-[#8b7cff]" aria-required={required} />
      <label htmlFor={id} className="text-[15px] leading-relaxed text-lp-text">{children}</label>
    </div>
  )
}

export function Choice<T extends string>({ name, value, options, onChange, columns = 1 }: { name: string; value: T | ''; options: [T, string, string?][]; onChange: (v: T) => void; columns?: 1 | 2 | 3 }) {
  const cols = columns === 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : ''
  return (
    <div role="radiogroup" className={`mt-2 grid gap-2 ${cols}`}>
      {options.map(([v, t, d]) => (
        <label key={v} className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${value === v ? 'border-lp-accent bg-lp-panel' : 'border-lp-line hover:border-lp-faint'}`}>
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="mt-[3px] accent-[#8b7cff]" />
          <span><span className="block text-[15px] text-lp-fg">{t}</span>{d && <span className="block text-[13px] text-lp-dim mt-0.5">{d}</span>}</span>
        </label>
      ))}
    </div>
  )
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'error' | 'ok'; children: ReactNode }) {
  const Icon = kind === 'error' ? AlertCircle : kind === 'ok' ? CheckCircle2 : AlertCircle
  const tone = kind === 'error' ? 'border-rose-400/40 text-rose-300' : kind === 'ok' ? 'border-emerald-400/40 text-emerald-300' : 'border-lp-line text-lp-muted'
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-[14.5px] leading-relaxed ${tone}`}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden /><div className="text-lp-text">{children}</div>
    </div>
  )
}

export function Loading({ text = 'Loading your study details…' }: { text?: string }) {
  return <p className="flex items-center gap-2 text-lp-dim text-[15px]"><Loader2 size={16} className="animate-spin" aria-hidden />{text}</p>
}

/** Reads ?p=<token> and loads the participant. Every personal study page uses it. */
export function useParticipant() {
  const [token, setToken] = useState<string | null>(null)
  const [view, setView] = useState<StudyView | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const t = new URLSearchParams(location.search).get('p')
    if (!t) { setError('This page needs the personal link from your study email.'); return }
    setToken(t)
    loadView(t).then(setView).catch(e => setError(studyErrorText(e)))
  }, [])
  return { token, view, setView, error }
}

export function StudyFooterLinks() {
  return (
    <p className="mt-12 text-[13.5px] text-lp-dim">
      <Link href="/research/information" className="text-lp-accent hover:text-lp-fg">Participant information</Link>{' · '}
      <Link href="/research/terms" className="text-lp-accent hover:text-lp-fg">Incentive terms</Link>{' · '}
      <Link href="/research/privacy" className="text-lp-accent hover:text-lp-fg">Privacy notice</Link>{' · '}
      Questions: <a href="mailto:research@voidcanvas.app" className="text-lp-accent hover:text-lp-fg">research@voidcanvas.app</a>
    </p>
  )
}
