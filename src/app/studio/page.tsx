import type { Metadata } from 'next'
import { StudioShell } from '@/studio/StudioShell'

export const metadata: Metadata = { title: 'Studio · Voidcanvas', description: 'Briefs, reference boards and palettes that open straight into the Editor.' }

export default function StudioPage() { return <StudioShell /> }
