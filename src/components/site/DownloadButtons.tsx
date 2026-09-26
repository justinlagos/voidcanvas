'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { focus } from './bits'

// Stable file names from desktop/package.json (artifactName), always the latest release.
const BASE = 'https://github.com/justinlagos/voidcanvas/releases/latest/download'
type Os = 'windows' | 'mac' | 'linux'
const FILES: Record<Os, { label: string; items: [string, string][] }> = {
  windows: { label: 'Windows', items: [['Windows (64-bit)', 'Voidcanvas-Setup-x64.exe'], ['Windows on Arm', 'Voidcanvas-Setup-arm64.exe']] },
  mac: { label: 'Mac', items: [['Mac with Apple silicon', 'Voidcanvas-arm64.dmg'], ['Mac with Intel', 'Voidcanvas-x64.dmg']] },
  linux: { label: 'Linux', items: [['AppImage', 'Voidcanvas-x86_64.AppImage'], ['Debian and Ubuntu (.deb)', 'Voidcanvas-amd64.deb']] },
}

function detect(): Os | null {
  const ua = navigator.userAgent
  if (/Windows/i.test(ua)) return 'windows'
  if (/Macintosh|Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)) return 'mac'
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'linux'
  return null
}

export function DownloadButtons() {
  const [os, setOs] = useState<Os | null>(null)
  useEffect(() => setOs(detect()), [])
  const order: Os[] = os ? [os, ...(['windows', 'mac', 'linux'] as Os[]).filter(o => o !== os)] : ['windows', 'mac', 'linux']
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {order.map((o, i) => (
        <div key={o} className={`rounded-[22px] border p-5 ${i === 0 && os ? 'bg-lp-card border-accent' : 'bg-lp-card border-lp-line'}`}>
          <p className="text-[13px] font-medium text-lp-muted">{i === 0 && os ? 'For this computer' : FILES[o].label}</p>
          <div className="mt-3 space-y-2">
            {FILES[o].items.map(([label, file], j) => (
              <a key={file} href={`${BASE}/${file}`} className={`flex items-center gap-2.5 rounded-full px-4 h-11 text-[14px] font-medium ${focus} ${i === 0 && os && j === 0 ? 'bg-lp-btn text-lp-btn-fg hover:bg-lp-btn-hover' : 'bg-lp-panel text-lp-fg hover:bg-lp-line'}`}>
                <Download size={16} />{label}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
