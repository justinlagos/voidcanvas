'use client'

// Opened by scanning the QR code a new device shows. The code arrives in the URL fragment,
// which browsers never send to a server.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AccountPanel } from './AccountPanel'

export function PairPage() {
  const [code, setCode] = useState<string | null>(null)
  useEffect(() => { setCode(decodeURIComponent(location.hash.slice(1)) || ''); history.replaceState(null, '', '/pair') }, [])
  return (
    <main className="min-h-screen bg-[#0b0b0f] text-void-100 flex items-start sm:items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#17171c] border border-void-800">
        <div className="px-5 py-4 border-b border-void-800/70">
          <h1 className="text-[15px] font-semibold">Add a device</h1>
          <p className="text-[12.5px] text-void-400 mt-0.5">Sign in on this device first if you are not already. Then approve the request.</p>
        </div>
        {code !== null && <AccountPanel approveCode={code || undefined} />}
        <div className="px-5 pb-5"><Link href="/editor" className="text-[13px] text-void-400 hover:text-void-100 underline">Open the Editor</Link></div>
      </div>
    </main>
  )
}
