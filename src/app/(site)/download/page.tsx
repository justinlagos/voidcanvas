import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow, SITE } from '@/components/site/bits'
import { DownloadButtons } from '@/components/site/DownloadButtons'

export const metadata: Metadata = {
  title: 'Download Voidcanvas for Windows, Mac and Linux',
  description: 'The full Voidcanvas app on your computer. Free, works offline, and saves your designs as real files in a folder you choose.',
  alternates: { canonical: `${SITE}/download` },
}

const POINTS: [string, string][] = [
  ['Your files, on your disk', 'Every design you save is a .void file in your Voidcanvas folder, in Documents. Put that folder in Dropbox, Google Drive, OneDrive or iCloud Drive and your designs are on your other computers too.'],
  ['Works offline', 'The whole app, its 16 built-in fonts and its help pages are on your computer. Only other Google Fonts, and Remove background the first time you use it, need the internet.'],
  ['Opens PSDs from your file browser', 'Double-click a .void file, or use Open with on a PSD. On Windows, Voidcanvas only becomes the default for PSDs when nothing else is.'],
  ['Same app, same price', 'Everything in the browser version, free. No account. Updates install themselves when you quit.'],
]

export default function Download() {
  return (
    <div className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-20">
      <Eyebrow>Download</Eyebrow>
      <h1 className="mt-3 text-[38px] sm:text-[56px] leading-[1.02] font-semibold tracking-[-0.035em] text-lp-fg">Voidcanvas on your computer.</h1>
      <p className="mt-4 text-[17px] sm:text-[19px] text-lp-muted max-w-[640px]">The same app as the browser, with your designs saved as real files you own. Free, no account.</p>

      <div className="mt-10"><DownloadButtons /></div>

      <div className="mt-16 grid sm:grid-cols-2 gap-5">
        {POINTS.map(([t, d]) => (
          <div key={t} className="rounded-[22px] bg-lp-card border border-lp-line p-6">
            <h2 className="text-[16px] font-semibold text-lp-fg">{t}</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-lp-dim">{d}</p>
          </div>
        ))}
      </div>

      <section className="mt-16 max-w-[720px] text-[14.5px] leading-relaxed text-lp-dim">
        <h2 className="text-[18px] font-semibold text-lp-fg">The first time you open it</h2>
        <p className="mt-3">The app is not yet signed with Apple and Microsoft certificates, so your computer will ask before opening it.</p>
        <ul className="mt-3 space-y-2 list-disc pl-5 marker:text-lp-faint">
          <li><strong className="text-lp-fg">Windows:</strong> if you see &ldquo;Windows protected your PC&rdquo;, click <strong className="text-lp-fg">More info</strong>, then <strong className="text-lp-fg">Run anyway</strong>.</li>
          <li><strong className="text-lp-fg">Mac:</strong> open the .dmg and drag Voidcanvas to Applications. If macOS says it cannot check the app, open <strong className="text-lp-fg">System Settings, Privacy &amp; Security</strong>, scroll down and click <strong className="text-lp-fg">Open Anyway</strong>. Until the Mac app is signed, download new versions from this page; it cannot update itself.</li>
          <li><strong className="text-lp-fg">Linux:</strong> on Ubuntu and Debian, install the .deb. The AppImage suits other distributions; make it executable and run it. Ubuntu 24.04 and later may refuse to start the AppImage, so use the .deb there.</li>
        </ul>
        <p className="mt-4">Prefer not to install anything? <Link href="/editor" className="text-lp-accent hover:text-lp-fg">Open Voidcanvas in your browser</Link>. <Link href="/learn/desktop-app" className="text-lp-accent hover:text-lp-fg">More about the desktop app</Link>.</p>
      </section>
    </div>
  )
}
