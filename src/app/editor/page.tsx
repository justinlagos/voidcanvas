import type { Metadata } from 'next'
import { EditorReuseShell } from '@/editor/components/EditorReuseShell'

export const metadata: Metadata = { title: 'Editor · Voidcanvas', description: 'Layers, masks, retouching and type in your browser.' }

export default function EditorPage() { return <EditorReuseShell /> }
