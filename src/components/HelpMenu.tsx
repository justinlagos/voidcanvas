'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Bug, HelpCircle, GraduationCap, Keyboard, MessageSquare, Newspaper, Info, BookOpen } from 'lucide-react'
import { openBugReport, openFeedback, track } from '@/lib/analytics'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

// The guide that fits the page you are on.
const GUIDE: [RegExp, string, string][] = [
  [/^\/studio/, '/learn/studio-overview', 'Studio guide'],
  [/^\/effects/, '/learn/effects-overview', 'Effects guide'],
  [/^\/tools/, '/learn/quick-tools', 'Quick tools guide'],
  [/^\/editor/, '/learn/editor-tour', 'Editor guide'],
]

/** Help for Studio, Effects and the quick tools: Learn, shortcuts, feedback, bug reports, Blog, About.
 *  Links open in a new tab so nothing on the canvas is lost. The Editor has the same entries in its Help menu. */
export function HelpMenu({ className = '' }: { className?: string }) {
  const path = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    addEventListener('pointerdown', out); addEventListener('keydown', esc)
    return () => { removeEventListener('pointerdown', out); removeEventListener('keydown', esc) }
  }, [open])
  const guide = GUIDE.find(([re]) => re.test(path))
  const item = `flex items-center gap-2.5 w-full h-9 px-3 rounded-lg text-[13px] text-void-100 hover:bg-white/[0.07] hover:text-white text-left ${focus}`
  const link = (href: string, label: string, Icon: typeof Bug) => (
    <a role="menuitem" href={href} target="_blank" rel="noopener" onClick={() => { track('help.open', { to: href }); setOpen(false) }} className={item}>
      <Icon size={15} className="text-void-400" /><span className="flex-1">{label}</span><ArrowUpRight size={12} className="text-void-500" />
    </a>
  )
  return (
    <div ref={box} className={`relative ${className}`}>
      <button onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Help" title="Help, Learn and bug reports"
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-void-400 hover:text-white hover:bg-void-900 ${open ? 'bg-void-900 text-white' : ''} ${focus}`}>
        <HelpCircle size={17} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1.5 z-50 w-[240px] p-1.5 rounded-xl bg-[#1d1d23] border border-white/[0.09] shadow-2xl animate-[fadein_.15s_ease]">
          {guide && link(guide[1], guide[2], BookOpen)}
          {link('/learn', 'Learn Voidcanvas', GraduationCap)}
          {link('/learn/keyboard-shortcuts', 'Keyboard shortcuts', Keyboard)}
          <div className="my-1 mx-2 h-px bg-white/[0.07]" />
          <button role="menuitem" onClick={() => { setOpen(false); openFeedback('help') }} className={item}><MessageSquare size={15} className="text-void-400" />Send feedback</button>
          <button role="menuitem" onClick={() => { setOpen(false); openBugReport('help') }} className={item}><Bug size={15} className="text-void-400" />Report a bug</button>
          <div className="my-1 mx-2 h-px bg-white/[0.07]" />
          {link('/blog', 'Blog', Newspaper)}
          {link('/about', 'About Voidcanvas', Info)}
        </div>
      )}
    </div>
  )
}
