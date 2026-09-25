import type { Metadata } from 'next'
import { MakePage } from '@/make/pages'

export const metadata: Metadata = { title: 'Make something · Voidcanvas', description: 'A random creative brief, a clock, and the Editor. No account.' }

export default function Page() { return <MakePage /> }
