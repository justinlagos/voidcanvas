import type { Metadata } from 'next'
import { RemixPage } from '@/make/pages'

export const metadata: Metadata = { title: 'Remix · Voidcanvas', description: 'Make your version of a shared result.' }

export default function Page() { return <RemixPage /> }
