import type { Metadata } from 'next'
import { PairPage } from '@/components/account/PairPage'

export const metadata: Metadata = { title: 'Add a device · Voidcanvas', description: 'Approve a new device for your Voidcanvas account.', robots: { index: false } }

export default function Pair() { return <PairPage /> }
