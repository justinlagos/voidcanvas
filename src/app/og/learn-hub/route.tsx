import { ARTICLES } from '@/content/learn/index'
import { ogImage } from '@/components/site/og'

export const dynamic = 'force-static'

export function GET() {
  return ogImage({ eyebrow: 'Learn', title: 'Arrive with a problem. Leave with the file.', answer: `${ARTICLES.length} guides that answer real design questions, then show the steps in Voidcanvas.` })
}
