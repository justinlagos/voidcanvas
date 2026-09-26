'use client'

// Invite links land here. The secret is in the URL fragment, which browsers never send to a server.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AccountPanel } from './AccountPanel'

export function JoinPage() {
  const [link, setLink] = useState<string | null>(null)
  useEffect(() => { setLink(location.hash.length > 1 ? location.href : ''); history.replaceState(null, '', '/join') }, [])
  return (
    <main className="min-h-screen bg-[#0b0b0f] text-void-100 flex items-start sm:items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#17171c] border border-void-800">
        <div className="px-5 py-4 border-b border-void-800/70">
          <h1 className="text-[15px] font-semibold">Join a team</h1>
          <p className="text-[12.5px] text-void-400 mt-0.5">{link === '' ? 'This page needs the full invite link. Ask the person who invited you to send it again.' : 'Sign in with the email address the invite was sent to. You join as soon as this device is ready.'}</p>
        </div>
        {link !== null && <AccountPanel joinLink={link || undefined} />}
        <div className="px-5 pb-5 flex gap-4"><Link href="/studio" className="text-[13px] text-void-400 hover:text-void-100 underline">Open Studio</Link><Link href="/editor" className="text-[13px] text-void-400 hover:text-void-100 underline">Open the Editor</Link></div>
      </div>
    </main>
  )
}
