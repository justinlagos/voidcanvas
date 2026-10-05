import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Lock, Sparkles } from 'lucide-react'
import { TOOLS } from '@/tools/defs'

export const metadata: Metadata = {
  title: 'Free image effect tools — private, in your browser · Voidcanvas',
  description: 'Halftone, dither, glitch, film grain, pixel sorting and more. Use the effect immediately, download the result, or keep editing in Voidcanvas.',
  alternates: { canonical: '/tools' },
}

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export default function ToolsPage() {
  const tools = Object.values(TOOLS)
  return (
    <main className="min-h-[100dvh] bg-void-950 text-void-100 px-5 sm:px-8 py-10 sm:py-16">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-light"><Sparkles size={13} />Quick tools</p>
          <h1 className="mt-3 text-[38px] sm:text-[52px] leading-[1.02] font-semibold tracking-[-0.035em]">Start with the effect, not the software.</h1>
          <p className="mt-4 text-[17px] sm:text-[19px] leading-relaxed text-void-300">Drop in an image, make the treatment, download it, or send it into the full Editor as part of a layered design.</p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-void-500"><Lock size={13} />Processing stays in your browser. No account required.</p>
        </div>

        <section className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map(tool => (
            <Link key={tool.slug} href={`/tools/${tool.slug}`} className={`group rounded-2xl border border-void-800 bg-[#111116] p-5 hover:border-void-600 hover:bg-[#15151b] transition-colors ${focus}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[16px] font-semibold text-white">{tool.name}</h2>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-void-400">{tool.tagline}</p>
                </div>
                <ArrowRight size={16} className="mt-1 shrink-0 text-void-600 group-hover:text-white group-hover:translate-x-0.5 transition" />
              </div>
              <p className="mt-5 text-[11.5px] text-void-500">Upload · live controls · PNG · continue in Editor</p>
            </Link>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border border-void-800 bg-[#111116] px-5 sm:px-7 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><h2 className="text-[16px] font-semibold">Need the full layer stack?</h2><p className="mt-1 text-[13.5px] text-void-400">Open the Editor for masks, type, adjustments, boards, PSD files and multi-format production.</p></div>
          <Link href="/editor" className={`shrink-0 h-10 px-4 rounded-xl bg-white text-void-950 inline-flex items-center gap-2 text-[13px] font-medium ${focus}`}>Open Editor <ArrowRight size={14} /></Link>
        </section>
      </div>
    </main>
  )
}
