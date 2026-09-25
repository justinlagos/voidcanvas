import type { Metadata } from 'next'
import { RescuePage } from '@/make/pages'

export const metadata: Metadata = { title: 'This image is terrible · Voidcanvas', description: 'Please improve it. A rescue challenge in the browser Editor.' }

export default function Page() { return <RescuePage /> }
