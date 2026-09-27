// Title and description rules shared by the article page, the goal and topic pages and the Open Graph images.
import type { Article } from '../types'

/** <title>: the query-shaped seoTitle when there is one, plus the site name only while the whole thing stays near 60 characters. */
export function pageTitle(a: Pick<Article, 'title' | 'seoTitle'>) {
  const t = a.seoTitle ?? a.title
  return t.length <= 44 ? `${t} · Voidcanvas Learn` : t.length <= 52 ? `${t} · Voidcanvas` : t
}
