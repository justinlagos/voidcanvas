import type { Metadata, Viewport } from 'next'
import { Pwa } from '@/components/Pwa'
import './globals.css'

export const metadata: Metadata = {
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
    <html lang="en">
      <body className="font-sans antialiased">{children}<Pwa /></body>
    </html>
  )
}
