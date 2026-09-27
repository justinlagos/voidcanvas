'use client'

// Research mode for the Working Designer Study. Only active for someone who opened Voidcanvas through their study
// link (?study=). Shows a small, dismissible note in Studio and the Editor, and keeps the active-time counter for the
// job running as they move between the two. Records timing only, never designs, text, images or file names.

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { FlaskConical, X } from 'lucide-react'
import { activeStudyJob, leaveStudyMode, startJobTimer, studyEvent, studyToken } from '@/lib/research'

export function StudyMode() {
  const path = usePathname() || ''
  const inApp = path.startsWith('/studio') || path.startsWith('/editor')
  const [token, setToken] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!inApp) return
    const t = studyToken()
    setToken(t)
    if (!t) return
    try { setHidden(sessionStorage.getItem('vc-study-note') === 'hidden') } catch { /* ignore */ }
    try { if (!sessionStorage.getItem('vc-study-open')) { sessionStorage.setItem('vc-study-open', '1'); studyEvent('study.open', { area: path.split('/')[1] }) } } catch { /* ignore */ }
    const job = activeStudyJob()
    if (job) startJobTimer(job)
  }, [inApp, path])

  if (!inApp || !token || hidden) return null
  return (
    <div className="fixed z-[70] left-3 bottom-3 max-w-[calc(100vw-24px)] flex items-center gap-2 rounded-full bg-[#1b1b22]/95 border border-white/10 pl-3 pr-1.5 py-1.5 text-[12px] text-white/80 shadow-lg backdrop-blur" role="status">
      <FlaskConical size={13} className="text-[#a99cff] shrink-0" aria-hidden />
      <span>Study mode: timing on, designs never recorded.</span>
      <a href={`/research/me?p=${token}`} target="_blank" rel="noopener" className="text-[#a99cff] hover:text-white underline underline-offset-2">Study page</a>
      <button onClick={() => { if (confirm('Turn off study mode on this device? Jobs you do from now on will not count towards the study.')) { leaveStudyMode(); setToken(null) } }} className="px-1.5 text-white/50 hover:text-white">Turn off</button>
      <button onClick={() => { setHidden(true); try { sessionStorage.setItem('vc-study-note', 'hidden') } catch { /* ignore */ } }} aria-label="Hide this note" className="p-1 rounded-full hover:bg-white/10"><X size={12} /></button>
    </div>
  )
}
