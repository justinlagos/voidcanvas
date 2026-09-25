import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import { MacKeys } from '@/components/site/MacKeys'
import { THEME_SCRIPT } from '@/components/site/theme-script'

// Learn, Blog, About and Report a bug. They share the landing page's look, header, footer and dark or light choice.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <div className="lp vc-tap min-h-[100dvh] bg-lp-bg text-lp-text overflow-x-clip flex flex-col">
        <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:z-[60] focus:top-2 focus:left-2 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-lp-btn focus:text-lp-btn-fg">Skip to content</a>
        <SiteHeader />
        <div aria-hidden className="h-12" />
        <main id="content" className="flex-1">{children}</main>
        <SiteFooter />
        <MacKeys />
      </div>
    </>
  )
}
