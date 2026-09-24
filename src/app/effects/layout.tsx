import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Effects: 58 image effects, free, in your browser · Voidcanvas',
  description: 'Halftone, dither, glitch, bloom, oil paint and more. Upload a photo, tune the sliders, download at full size. Nothing leaves your device.',
  alternates: { canonical: '/effects' },
  openGraph: { title: 'Voidcanvas Effects', description: 'Image effects that run entirely in your browser.', type: 'website' },
}

export default function EffectsLayout({ children }: { children: React.ReactNode }) { return children }
