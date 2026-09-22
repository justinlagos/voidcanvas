import type { Metadata } from 'next'
import { ToolPage } from '@/tools/ToolPage'
import { TOOLS } from '@/tools/defs'

const def = TOOLS['dither']
export const metadata: Metadata = {
  title: `${def.name} · Free, in your browser · Voidcanvas`,
  description: def.tagline,
  alternates: { canonical: '/tools/dither' },
  openGraph: { title: def.name, description: def.tagline, type: 'website' },
}

export default function Page() { return <ToolPage def={def} /> }
