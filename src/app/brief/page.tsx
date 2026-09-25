import type { Metadata } from 'next'
import { BriefPage } from '@/make/pages'

export const metadata: Metadata = { title: 'Client from hell · Voidcanvas', description: 'A random client brief, then the messages start. Survive it.' }

export default function Page() { return <BriefPage /> }
