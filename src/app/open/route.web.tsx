// Web only (*.web.tsx): a redirect route the desktop app's static export cannot include and has no use for offline.
import { NextRequest, NextResponse } from 'next/server'
import { resolveOpenRequest } from '@/growth/open'

export const dynamic = 'force-dynamic'

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams
  const resolved = resolveOpenRequest({
    to: q.get('to'),
    tool: q.get('tool'),
    source: q.get('source'),
    medium: q.get('medium'),
    campaign: q.get('campaign'),
    content: q.get('content'),
  })
  const target = new URL(resolved.href, request.nextUrl.origin)
  return NextResponse.redirect(target, 307)
}
