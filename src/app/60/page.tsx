import type { Metadata } from 'next'
import { SixtyPage } from '@/make/pages'

export const metadata: Metadata = { title: 'You have 60 seconds · Voidcanvas', description: 'Sixty seconds to make something in your browser. No account.' }

export default function Page() { return <SixtyPage /> }
