import type { Metadata } from 'next'
import { JoinPage } from '@/components/account/JoinPage'

export const metadata: Metadata = { title: 'Join a team · Voidcanvas', description: 'Accept an invite to a Voidcanvas team.', robots: { index: false } }

export default function Join() { return <JoinPage /> }
