import { GOALS, getGoal } from '@/content/learn/index'
import { ogImage } from '@/components/site/og'

export const dynamic = 'force-static'
export function generateStaticParams() { return GOALS.map(g => ({ goal: g.id })) }

export function GET(_req: Request, { params }: { params: { goal: string } }) {
  const g = getGoal(params.goal)
  if (!g) return ogImage({ eyebrow: 'Learn', title: 'Learn Voidcanvas' })
  return ogImage({ eyebrow: 'A route', title: g.prompt, answer: g.answer, meta: `${g.steps.length} guides in order` })
}
