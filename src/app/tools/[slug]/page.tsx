import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ToolPage } from '@/tools/ToolPage'
import { TOOLS } from '@/tools/defs'
import { metadataForTool } from '@/tools/factory'

export const dynamicParams = false

export function generateStaticParams() {
  return Object.values(TOOLS).map(tool => ({ slug: tool.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const def = TOOLS[params.slug]
  return def ? metadataForTool(def) : {}
}

export default function Page({ params }: { params: { slug: string } }) {
  const def = TOOLS[params.slug]
  if (!def) notFound()
  return <ToolPage def={def} />
}
