import type { Metadata } from 'next'
import { OneImagePage } from '@/make/pages'

export const metadata: Metadata = { title: 'One image, ten lives · Voidcanvas', description: 'One image, ten creative directions, in the browser.' }

export default function Page() { return <OneImagePage /> }
