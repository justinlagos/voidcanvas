import type { Metadata } from 'next'
import { PsdPage } from '@/make/pages'

export const metadata: Metadata = { title: 'Your PSD is not trapped · Voidcanvas', description: 'Drop a PSD and it opens with its layers, in the browser.' }

export default function Page() { return <PsdPage /> }
