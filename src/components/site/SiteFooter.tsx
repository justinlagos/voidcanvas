'use client'

// One footer for every public page: the landing page, Learn, Blog, About and Report a bug.
// A quiet closing layer: links, a feedback form, who makes it, the fine print.

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Logo } from '@/components/AppNav'
import { MotionPlayLabsLogo } from '@/components/landing/MotionPlayLabsLogo'
import { PrivacyPanel } from '@/editor/components/PrivacyPanel'
import { sendFeedback, track } from '@/lib/analytics'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export const FOOTER_LINKS: [string, [string, string][]][] = [
  ['Make', [['Studio', '/studio'], ['Editor', '/editor'], ['Effects', '/effects'], ['Halftone', '/tools/halftone'], ['Dither', '/tools/dither'], ['Glitch', '/tools/glitch'], ...(process.env.NEXT_PUBLIC_DESKTOP ? [] : [['Desktop app', '/download'] as [string, string]])]],
  ['Learn', [['All guides', '/learn'], ['Start here', '/learn/your-first-design'], ['Workflows', '/learn#workflows'], ['Shortcuts', '/learn/keyboard-shortcuts'], ['Blog', '/blog']]],
  ['Company', [['About', '/about'], ['Report a bug', '/report-a-bug'], ['Privacy', '#privacy'], ['Art Director Studio', 'https://artdirectorstudio.com']]],
]

/** Feedback, in the footer. One field, an optional email, a send button; sends through the same channel as the app. */
function FeedbackForm() {
  const [msg, setMsg] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!msg.trim() || state === 'sending') return
    setState('sending')
    const ok = await sendFeedback({ mood: null, message: msg, email, trigger: 'footer' })
    setState(ok ? 'done' : 'failed')
    if (ok) { setMsg(''); setEmail('') }
  }
  const field = `w-full rounded-lg bg-[var(--lp-field)] border border-lp-line px-3 text-[13px] text-lp-text placeholder:text-lp-faint focus:border-lp-faint focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent transition-colors`
  return (
    <form onSubmit={submit} aria-label="Feedback" className="text-[13px]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lp-faint">Feedback</h3>
      <p className="mt-2.5 text-lp-dim">What would you improve? Every message is read. Something broken? <Link href="/report-a-bug" className={`text-lp-accent hover:text-lp-fg rounded ${focus}`}>Report a bug</Link>.</p>
      {state === 'done' ? (
        <div role="status" className="mt-3 rounded-lg border border-lp-line bg-lp-panel px-3 py-2.5 text-lp-text flex items-center justify-between gap-3">
          <span>Thanks. Every message is read.</span>
          <button type="button" onClick={() => setState('idle')} className={`text-lp-dim hover:text-lp-fg rounded ${focus}`}>Send another</button>
        </div>
      ) : (
        <>
          <textarea value={msg} onChange={e => { setMsg(e.target.value); if (state === 'failed') setState('idle') }} maxLength={2000} rows={2} required aria-label="Your feedback" placeholder="What should we fix or add?" className={`${field} mt-3 py-2 resize-none`} />
          <div className="mt-2 flex gap-2">
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" maxLength={200} aria-label="Email, only if you want a reply" placeholder="Email, if you want a reply" className={`${field} h-9 min-w-0 flex-1`} />
            <button type="submit" disabled={state === 'sending' || !msg.trim()} aria-busy={state === 'sending'} className={`h-9 px-3.5 shrink-0 rounded-lg bg-lp-btn text-lp-btn-fg text-[13px] font-medium disabled:opacity-40 hover:bg-lp-btn-hover ${focus}`}>{state === 'sending' ? 'Sending…' : 'Send feedback'}</button>
          </div>
          <p className={`mt-2 text-[11.5px] ${state === 'failed' ? 'text-rose-400' : 'text-lp-faint'}`} role={state === 'failed' ? 'alert' : undefined}>{state === 'failed' ? 'Could not send. Check your connection and try again.' : 'Your designs are never sent.'}</p>
        </>
      )}
    </form>
  )
}

export function SiteFooter({ notes, onPrivacy }: { notes?: ReactNode; onPrivacy?: () => void }) {
  const [privacy, setPrivacy] = useState(false)
  const openPrivacy = () => { track('landing.footer', { to: 'privacy' }); if (onPrivacy) onPrivacy(); else setPrivacy(true) }
  return (
    <footer className="mt-20 sm:mt-28 border-t border-lp-line text-lp-dim">
      <div className="max-w-[1120px] mx-auto px-5 sm:px-8">
        <div className="grid gap-x-8 gap-y-8 py-9 md:grid-cols-12">
          <div className="md:col-span-3">
            <div className="flex items-center gap-2.5 text-lp-fg"><Logo compact /><span className="text-[14px] font-semibold tracking-tight">Voidcanvas</span></div>
            <p className="mt-3 text-[13px] leading-relaxed max-w-[260px]">A free design suite in your browser. Brand work in Studio, layouts in the Editor, image treatments in Effects.</p>
            <Link href="/editor" onClick={() => track('landing.cta', { where: 'footer', href: '/editor' })} className={`mt-4 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-lp-btn text-lp-btn-fg text-[13px] font-medium hover:bg-lp-btn-hover ${focus}`}>Start designing <ArrowRight size={13} /></Link>
          </div>
          <nav aria-label="Footer" className="md:col-span-5 grid grid-cols-3 gap-4 text-[13px]">
            {FOOTER_LINKS.map(([head, links]) => (
              <div key={head}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lp-faint">{head}</h3>
                <ul className="mt-2.5 space-y-1.5">
                  {links.map(([label, href]) => (
                    <li key={label}>
                      {href === '#privacy' ? <button onClick={openPrivacy} className={`text-left hover:text-lp-fg rounded ${focus}`}>{label}</button>
                        : href.startsWith('http') ? <a href={href} target="_blank" rel="noopener" onClick={() => track('landing.footer', { to: href })} className={`inline-flex items-center gap-0.5 hover:text-lp-fg rounded ${focus}`}>{label}<ArrowUpRight size={11} aria-hidden /></a>
                        : <Link href={href} onClick={() => track('landing.footer', { to: href })} className={`hover:text-lp-fg rounded ${focus}`}>{label}</Link>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="md:col-span-4"><FeedbackForm /></div>
        </div>

        <div className="border-t border-lp-line py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 text-[12px] leading-relaxed">
          <MotionPlayLabsLogo className="w-10 h-10 shrink-0 text-lp-fg" />
          <p className="text-lp-text sm:flex-1"><span className="text-lp-fg font-semibold">MotionPlay Labs</span>, a design and software studio between Lagos and Kent, makes Voidcanvas as the follow-up to <a href="https://artdirectorstudio.com" target="_blank" rel="noopener" className={`underline underline-offset-2 decoration-[var(--lp-line)] hover:text-lp-fg rounded ${focus}`}>Art Director Studio</a>.</p>
          <p className="text-[11px] text-lp-faint sm:text-right sm:max-w-[300px]">MotionPlay Labs Ltd. England and Wales no. 17304660. Nigeria CAC RC 9621200.</p>
        </div>
        {notes}

        <div className="border-t border-lp-line py-3.5 pb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11.5px] text-lp-faint">
          <p>© {new Date().getFullYear()} MotionPlay Labs Ltd.</p>
          <p>Free. No account. Your files stay on your device.</p>
        </div>
      </div>
      {privacy && <PrivacyPanel onClose={() => setPrivacy(false)} />}
    </footer>
  )
}
