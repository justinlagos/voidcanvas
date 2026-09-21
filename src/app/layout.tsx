import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Voidcanvas: brief to finished design in your browser',
  description: 'Studio for briefs and references, a layered Editor, and one-click Effects. Free, in your browser.',
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
