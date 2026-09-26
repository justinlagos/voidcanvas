'use client'

import { useEffect, useState } from 'react'
import { Check, Lock, Trash2, X } from 'lucide-react'
import { initPrivateFromSession, isPrivate, listProjects, setPrivateMode, wipeEverything } from '../io'
import { Button, Modal, focusRing } from './ui'
import { setUsageOff, usageTurnedOff } from '@/lib/analytics'
import { ensurePersistentStorage, formatBytes, storageStatus, type StorageStatus } from '@/lib/persist'

const POINTS = [
  'Your designs never leave your device. Editing, effects, boards and exports all run in this browser.',
  'Projects are saved in this browser on this computer, and as files wherever you choose to save them. There is no cloud copy and no account.',
  'No sign-up, no login. Open the site and start creating.',
  'No tracking of your work. We only count which tools get used, anonymously, so we know what to improve. You can turn that off below.',
]
const USAGE_NOTE = 'What is counted: page visits, which tools and menu commands are used, export file types, errors, device type, browser and time zone, with a random id for this browser. Never your images, file names, text or anything you type. Off automatically in a private session.'
const NOTE = 'Two things load from the internet so the app can work: web fonts (from Google Fonts) and, if you use Remove background, a one-time AI model download. Neither one sends your images or designs anywhere.'

export function PrivacyPanel({ onClose }: { onClose: () => void }) {
  const [priv, setPriv] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [wiped, setWiped] = useState(false)
  const [usage, setUsage] = useState(true)
  useEffect(() => { setUsage(!usageTurnedOff()) }, [])
  const [store, setStore] = useState<StorageStatus | null>(null)
  useEffect(() => { storageStatus().then(setStore).catch(() => {}) }, [])
  const protect = async () => { try { localStorage.removeItem('vc-persist-asked') } catch { /* ignore */ } await ensurePersistentStorage(); setStore(await storageStatus()) }
  const toggleUsage = () => { const next = !usage; setUsageOff(!next); setUsage(next) }
  useEffect(() => { initPrivateFromSession(); setPriv(isPrivate()); listProjects().then(p => setCount(p.length)).catch(() => setCount(null)) }, [])

  const togglePrivate = () => {
    const next = !priv
    if (next && !confirm('Turn on private session? Nothing you make will be saved to this device, and it clears when you close the tab.')) return
    setPrivateMode(next); setPriv(next)
  }
  const wipe = async () => {
    if (!confirm('Delete everything stored on this device? This removes all saved designs, boards and brand kits here. It cannot be undone.')) return
    await wipeEverything(); setWiped(true); setCount(0)
  }

  return (
    <Modal title="Your privacy" onClose={onClose}>
      <div className="p-5 space-y-5">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center shrink-0"><Lock size={18} /></span>
          <p className="text-[14px] text-void-200 leading-relaxed">Your files don't leave your browser. Edit locally, no cloud, no account, private by default.</p>
        </div>
        <ul className="space-y-2">
          {POINTS.map(p => <li key={p} className="flex gap-2.5 text-[13px] text-void-300 leading-relaxed"><Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />{p}</li>)}
        </ul>
        <p className="text-[12px] text-void-500 leading-relaxed border-l-2 border-void-700 pl-3">{NOTE}</p>

        <div className="rounded-xl border border-void-800 p-4">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[13px] font-medium">Private session</p><p className="text-[12px] text-void-400 mt-0.5">For shared or public computers. Nothing is written to this device; everything clears when you close the tab.</p></div>
            <button role="switch" aria-checked={priv} onClick={togglePrivate} className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${focusRing} ${priv ? 'bg-accent' : 'bg-void-700'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${priv ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {priv && <p className="mt-2.5 text-[12px] text-accent-light">Private session is on. Save and recents are turned off.</p>}
        </div>

        <div className="rounded-xl border border-void-800 p-4">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[13px] font-medium">Share anonymous usage counts</p><p className="text-[12px] text-void-400 mt-0.5">{USAGE_NOTE}</p></div>
            <button role="switch" aria-checked={usage} aria-label="Share anonymous usage counts" onClick={toggleUsage} className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${focusRing} ${usage ? 'bg-accent' : 'bg-void-700'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${usage ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {store && store.persisted !== null && !priv && (
          <div className="rounded-xl border border-void-800 p-4">
            <p className="text-[13px] font-medium">Storage on this device</p>
            <p className="text-[12px] text-void-400 mt-0.5">
              {store.persisted
                ? 'Protected. The browser will not clear your saved designs to free up space.'
                : 'Not protected yet. If the device runs low on space, or on Safari after a few weeks without a visit, the browser may clear saved designs. Use File, Save to disk for anything you need to keep.'}
              {store.usage != null && ` Using ${formatBytes(store.usage)}.`}
            </p>
            {!store.persisted && <Button onClick={protect} className="mt-3">Ask the browser to keep my designs</Button>}
          </div>
        )}

        <div className="rounded-xl border border-void-800 p-4">
          <p className="text-[13px] font-medium">Clear everything on this device</p>
          <p className="text-[12px] text-void-400 mt-0.5 mb-3">{count === null ? 'Removes all saved designs, boards and brand kits stored in this browser.' : wiped ? 'Everything on this device has been cleared.' : `You have ${count} saved design${count === 1 ? '' : 's'} in this browser. This deletes them and everything else stored here.`}</p>
          <Button onClick={wipe} disabled={wiped} className="!bg-rose-600/90 !text-white hover:!bg-rose-600"><Trash2 size={15} />{wiped ? 'Cleared' : 'Delete all my data'}</Button>
        </div>
      </div>
    </Modal>
  )
}

/** Small always-visible marker when a private session is active. */
/** True while a private session is on. Polls, since the flag lives outside React. */
export function usePrivate() {
  const [on, setOn] = useState(false)
  useEffect(() => { initPrivateFromSession(); setOn(isPrivate()); const i = setInterval(() => setOn(isPrivate()), 1000); return () => clearInterval(i) }, [])
  return on
}

export function PrivateBadge() {
  const on = usePrivate()
  if (!on) return null
  return <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-accent/20 text-accent-light text-[11.5px] font-medium border border-accent/30"><Lock size={11} />Private</span>
}
