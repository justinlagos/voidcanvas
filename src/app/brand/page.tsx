import type { Metadata } from 'next'
import { BrandWorkspace } from '@/brand/BrandWorkspace'
export const metadata: Metadata = {
  title: 'Brand Guidelines · VoidCanvas',
  description:
    'Build a living brand system. Colours, typography, logo rules, downloadable assets and a shareable brand website.',
}
export default function BrandPage() {
  return <BrandWorkspace />
}
