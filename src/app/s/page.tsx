import type { Metadata } from 'next'
import { SharePage } from '@/components/share/SharePage'

export const metadata: Metadata = { title: 'Shared with you · Voidcanvas', description: 'Designs shared for review or delivery.', robots: { index: false, follow: false } }

export default function Share() { return <SharePage /> }
