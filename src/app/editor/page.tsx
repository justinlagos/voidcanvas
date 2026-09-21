import type { Metadata } from 'next'
import { EditorShell } from '@/editor/components/EditorShell'

export const metadata: Metadata = { title: 'Editor · Voidcanvas', description: 'Layers, masks, retouching and type in your browser.' }

export default function EditorPage() { return <EditorShell /> }
