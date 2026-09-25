import type { Metadata } from 'next'
import { FivePage } from '@/make/pages'

export const metadata: Metadata = { title: 'The five-click test · Voidcanvas', description: 'Make something worth keeping in five clicks.' }

export default function Page() { return <FivePage /> }
