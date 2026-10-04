import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readPublication } from '@/brand/server'
import { SECTIONS, validSlug, type Section } from '@/brand/model'
import { BrandPortal } from '@/brand/BrandPortal'
export const dynamic = 'force-dynamic'
type Props = { params: { slug: string; section?: string[] } }
async function read({ params }: Props) {
  if (
    !validSlug(params.slug) ||
    (params.section?.length ?? 0) > 1 ||
    (params.section?.[0] && !SECTIONS.includes(params.section[0] as Section))
  )
    notFound()
  const p = await readPublication(params.slug)
  if (!p) notFound()
  return p
}
export async function generateMetadata(props: Props): Promise<Metadata> {
  const p = await read(props),
    section = props.params.section?.[0]
  const title = `${p.snapshot.name} · ${section ? section.replace(/-/g, ' ') : 'Brand Guidelines'}`
  const url = `https://voidcanvas.app/b/${p.slug}${section ? '/' + section : ''}`
  return {
    title,
    description: `${p.snapshot.name}: colours, typography, logo assets and brand rules.`,
    robots:
      p.visibility === 'public'
        ? { index: true, follow: true }
        : { index: false, follow: false },
    alternates: { canonical: url },
    openGraph: {
      title,
      url,
      description: `The ${p.snapshot.name} brand system.`,
    },
  }
}
export default async function PublishedBrand(props: Props) {
  return (
    <BrandPortal
      publication={await read(props)}
      section={(props.params.section?.[0] as Section) ?? 'overview'}
    />
  )
}
