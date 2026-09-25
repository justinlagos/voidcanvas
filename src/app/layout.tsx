import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Pwa } from '@/components/Pwa'
import { Analytics } from '@/components/Feedback'
import './globals.css'

// Fonts ship with the app (self-hosted by next/font), so nothing is fetched from Google at runtime.
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], display: 'swap', variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], display: 'swap', variable: '--font-mono' })

export const metadata: Metadata = {
  metadataBase: new URL('https://voidcanvas.netlify.app'),
  title: 'Voidcanvas: brief to finished design in your browser',
  description: 'A layered editor, brand builder and effects that run entirely in your browser. Your files never leave your device. No account, no cloud.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
  appleWebApp: { capable: true, title: 'Voidcanvas', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = { themeColor: '#141416', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}<Pwa /><Analytics /></body>
    </html>
  )
}
