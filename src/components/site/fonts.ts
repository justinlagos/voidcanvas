// The editorial accent face for Learn, the same Instrument Serif the landing page's work samples use.
import { Instrument_Serif } from 'next/font/google'

export const serif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], display: 'swap', variable: '--font-serif', adjustFontFallback: false })
export const serifStyle = { fontFamily: 'var(--font-serif), Georgia, serif' } as const
