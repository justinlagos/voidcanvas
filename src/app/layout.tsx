import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Voidcanvas — Transform Your Images',
  description: 'Real-time image effects and artistic transformations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
