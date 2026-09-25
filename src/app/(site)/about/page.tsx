import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { EFFECT_COUNT } from '@/components/effect-list'
import { MotionPlayLabsLogo } from '@/components/landing/MotionPlayLabsLogo'
import { Eyebrow, SITE, focus } from '@/components/site/bits'

export const metadata: Metadata = {
  title: 'About · Voidcanvas',
  description: 'Voidcanvas is a free design suite that runs in your browser, made by MotionPlay Labs as the follow-up to Art Director Studio.',
  alternates: { canonical: `${SITE}/about` },
  openGraph: { title: 'About Voidcanvas', description: 'A free design suite that runs in your browser, made by MotionPlay Labs.', url: `${SITE}/about`, type: 'website' },
}

const PRINCIPLES: [string, string][] = [
  ['Full capability, low effort.', 'Layers, masks, type, retouching, print PDFs and brand systems, organised so you only meet what the job in front of you needs. Things are simplified by arranging them, never by taking them away.'],
  ['Your work stays with you.', 'Designs are saved in your browser, on your device. There is no account and no server holding your files. A private session keeps nothing at all once you close the tab.'],
  ['Free, properly.', 'Every tool, every export, full size, no watermark. Nothing is held back to be sold later.'],
  ['The phone is a real workplace.', 'A lot of design happens away from a desk. The Editor has its own touch layout, not a shrunk desktop, and the whole app installs to a home screen.'],
  ['Habits you already have still work.', 'Shortcuts and menus follow the tools designers learned on, so the first hour is spent designing, not relearning.'],
]

export default function About() {
  return (
    <div>
      <section className="relative">
        <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute left-1/2 top-[-30%] -translate-x-1/2 w-[900px] h-[520px] rounded-full bg-[radial-gradient(closest-side,var(--lp-glow),transparent)]" /></div>
        <div className="relative max-w-[900px] mx-auto px-5 sm:px-8 pt-14 sm:pt-24 text-center">
          <Eyebrow>About</Eyebrow>
          <h1 className="mt-3 text-[40px] sm:text-[68px] leading-[1] font-semibold tracking-[-0.04em] text-lp-fg">Professional design,<br className="hidden sm:block" /> in a browser tab.</h1>
          <p className="mt-6 text-[18px] sm:text-[21px] leading-relaxed text-lp-muted max-w-[680px] mx-auto">Voidcanvas is a free design suite: a studio for the client job, a layered editor, and {EFFECT_COUNT} one-click effects. It runs entirely in your browser and your files never leave your device.</p>
        </div>
      </section>

      <section className="max-w-[720px] mx-auto px-5 sm:px-8 pt-20 sm:pt-28 text-[17px] sm:text-[18px] leading-[1.75] text-lp-text space-y-6">
        <h2 className="text-[28px] sm:text-[36px] leading-tight font-semibold tracking-[-0.03em] text-lp-fg">Why it exists</h2>
        <p>Voidcanvas is the follow-up to <a href="https://artdirectorstudio.com" target="_blank" rel="noopener" className="text-lp-accent underline decoration-[var(--lp-line)] underline-offset-[3px] hover:decoration-current">Art Director Studio</a>, a tool built for and used by designers in Nigeria. Working with those designers made one thing plain: good work is held back less by talent than by tools. Professional software usually asks for a subscription, a powerful computer, a fast connection and an account before you can make anything.</p>
        <p>Voidcanvas asks for a browser. It opens in seconds, works offline once installed, uploads nothing and costs nothing. Behind that is a complete suite: the job around the design in <strong className="font-semibold text-lp-fg">Studio</strong>, the making in the <strong className="font-semibold text-lp-fg">Editor</strong>, and the play in <strong className="font-semibold text-lp-fg">Effects</strong>, each usable alone and able to pass work to the others.</p>
      </section>

      <section className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-20 sm:pt-28">
        <h2 className="text-center text-[28px] sm:text-[40px] leading-tight font-semibold tracking-[-0.03em] text-lp-fg">What we hold to</h2>
        <ol className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRINCIPLES.map(([t, b], i) => (
            <li key={t} className={`rounded-[24px] bg-lp-card border border-lp-line p-6 sm:p-7 ${i === 0 ? 'lg:col-span-2' : ''}`}>
              <span className="text-[13px] font-semibold text-lp-accent tabular-nums">0{i + 1}</span>
              <h3 className="mt-3 text-[20px] font-semibold tracking-tight text-lp-fg">{t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-lp-dim">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-20 sm:pt-28">
        <div className="rounded-[32px] bg-lp-card border border-lp-line p-7 sm:p-12 grid md:grid-cols-[auto_1fr] gap-8 items-start">
          <MotionPlayLabsLogo className="w-16 h-16 text-lp-fg" />
          <div>
            <h2 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.02em] text-lp-fg">Who makes it</h2>
            <p className="mt-3 text-[16.5px] leading-relaxed text-lp-muted max-w-[640px]"><strong className="font-semibold text-lp-fg">MotionPlay Labs</strong> is a design and software studio between Lagos and Kent. It was founded by Justin Ukaegbu, a brand and communication designer with more than a decade in the industry, who builds the tools he wants to design with.</p>
            <dl className="mt-6 grid sm:grid-cols-3 gap-4 text-[13.5px]">
              <div><dt className="text-lp-faint">Company</dt><dd className="mt-0.5 text-lp-text">MotionPlay Labs Ltd</dd></div>
              <div><dt className="text-lp-faint">England and Wales</dt><dd className="mt-0.5 text-lp-text">No. 17304660</dd></div>
              <div><dt className="text-lp-faint">Nigeria CAC</dt><dd className="mt-0.5 text-lp-text">RC 9621200</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-20 sm:pt-28 grid md:grid-cols-3 gap-4">
        {[
          { h: 'Learn', b: 'A guide for every feature, complete workflows, and design craft taught properly.', href: '/learn', cta: 'Browse the guides' },
          { h: 'Blog', b: 'A new post every Friday on how Voidcanvas works and why.', href: '/blog', cta: 'Read the blog' },
          { h: 'Report a bug', b: 'Something broken? Tell us. Every report is read, and your designs are never sent.', href: '/report-a-bug', cta: 'Report a bug' },
        ].map(c => (
          <Link key={c.h} href={c.href} className={`group rounded-[24px] border border-lp-line p-6 hover:border-lp-faint hover:bg-lp-card transition-colors ${focus}`}>
            <h2 className="text-[19px] font-semibold tracking-tight text-lp-fg">{c.h}</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-lp-dim">{c.b}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-lp-accent">{c.cta} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" /></span>
          </Link>
        ))}
      </section>

      <section className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-20 sm:pt-28 text-center">
        <h2 className="text-[30px] sm:text-[44px] font-semibold tracking-[-0.03em] text-lp-fg">Open a tab. Start designing.</h2>
        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/editor" className={`inline-flex items-center gap-2 h-12 px-6 rounded-full bg-lp-btn text-lp-btn-fg text-[16px] font-medium hover:bg-lp-btn-hover ${focus}`}>Start designing <ArrowRight size={17} /></Link>
          <a href="https://artdirectorstudio.com" target="_blank" rel="noopener" className={`inline-flex items-center gap-1.5 h-12 px-4 text-[15px] text-lp-accent hover:text-lp-fg ${focus}`}>Art Director Studio <ArrowUpRight size={15} /></a>
        </div>
      </section>
    </div>
  )
}
