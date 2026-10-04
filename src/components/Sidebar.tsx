'use client'

import { useState } from 'react'
import { EffectSelector } from './EffectSelector'
import { ParamControls } from './ParamControls'
import { useStore, fullStack } from '@/store/useStore'
import { StackBar } from './StackBar'
import { effects } from './effect-list'

export function Sidebar({ onPick }: { onPick?: () => void }) {
  const { activeEffect } = useStore()
  const count = useStore(s => fullStack(s, true).length)
  const [tab, setTab] = useState<'browse' | 'adjust'>('browse')
  const choose = () => { if (useStore.getState().activeEffect !== 'none') setTab('adjust'); onPick?.() }
  return (
    <aside data-effects-sidebar className="vc-tap w-full h-[42%] min-h-[220px] border-t lg:w-80 lg:h-auto lg:min-h-0 lg:border-t-0 lg:border-l border-void-800/60 bg-void-950 flex flex-col shrink-0 overflow-hidden">
      <div className="shrink-0 max-h-[32%] overflow-auto"><StackBar onPick={choose} /></div>
      <div className="lg:hidden flex shrink-0 border-b border-void-800" role="tablist" aria-label="Effects workspace">
        {(['browse', 'adjust'] as const).map(id => <button key={id} id={`fx-tab-${id}`} role="tab" aria-controls={`fx-${id}`} aria-selected={tab === id}
          onClick={() => setTab(id)} className={`flex-1 px-3 py-3 text-sm ${tab === id ? 'text-white border-b-2 border-white' : 'text-void-400'}`}>{id === 'browse' ? 'Browse effects' : 'Adjust effect'}</button>)}
      </div>
      <div id="fx-browse" role="tabpanel" aria-labelledby="fx-tab-browse" className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${tab === 'browse' ? '' : 'hidden'} lg:block`}>
        <EffectSelector onPick={choose} />
      </div>
      <div id="fx-adjust" role="tabpanel" aria-labelledby="fx-tab-adjust" className={`flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 lg:hidden ${tab === 'adjust' ? '' : 'hidden'}`}>
        <h2 className="text-sm font-medium text-white mb-3">{effects.find(e => e.id === activeEffect)?.name ?? 'Choose an effect'}</h2>
        <ParamControls />
      </div>
      <div className="hidden lg:flex shrink-0 items-center justify-between p-3 border-t border-void-800 text-xs text-void-400">
        <span>{count} {count === 1 ? 'effect' : 'effects'}</span><span>Changes apply live</span>
      </div>
    </aside>
  )
}
