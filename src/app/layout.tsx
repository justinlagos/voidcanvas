import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Voidcanvas: brief to finished design in your browser',
  description: 'A layered editor, brand builder and effects that run entirely in your browser. Your files never leave your device. No account, no cloud.',
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
