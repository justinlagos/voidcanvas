import type { Metadata } from 'next'
import { StudioShell } from '@/studio/StudioShell'

export const metadata: Metadata = { title: 'Studio · Voidcanvas', description: 'The art director\'s desk: references read for you, direction boards, every format from one key visual, sign-off and delivery.' }

export default function StudioPage() { return <StudioShell /> }
