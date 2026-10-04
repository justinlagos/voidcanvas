'use client'

import { Plus, X } from 'lucide-react'
import { useStore, fullStack } from '@/store/useStore'
import { effects } from './effect-list'

const nameOf = (id: string) => effects.find(e => e.id === id)?.name ?? id

/**
 * The effects on the photo, in the order they run. The highlighted one is the one the controls change;
 * tap another to change it instead. "Add another effect" keeps what is there and starts a new one on top.
 */
export function StackBar({ onPick }: { onPick?: () => void }) {
  const s = useStore()
  const all = fullStack(s)
  if (!s.originalImage || !fullStack(s, true).length) return null
  const at = s.below.length
  return (
    <div data-fx-stack className="px-4 py-3 border-b border-void-800/60">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-void-300 uppercase tracking-wider">Your effects</span>
        {all.length > 1 && <span className="text-[11px] text-void-500">Run in this order</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {all.map((e, i) => {
          const on = i === at, name = e.effect === 'none' ? 'Pick an effect' : nameOf(e.effect)
          return (
            <span key={i} data-fx-stack-item={e.effect} data-editing={on || undefined}
              className={`inline-flex items-center rounded-md border text-[12px] ${on ? 'border-accent bg-accent/15 text-white' : 'border-void-700/60 bg-void-900 text-void-300 hover:text-white'}`}>
              <button onClick={() => { s.editAt(i); onPick?.() }} className="pl-2 pr-1.5 py-1 min-h-[30px]" aria-pressed={on} title={on ? 'Adjusting this effect' : 'Change this one'}>
                <span className="text-void-500 mr-1">{i + 1}</span>{name}
              </button>
              {e.effect !== 'none' && (
                <button onClick={() => s.removeAt(i)} aria-label={`Remove ${name}`} className="px-1.5 py-1 min-h-[30px] text-void-500 hover:text-red-300"><X size={12} /></button>
              )}
            </span>
          )
        })}
        {s.activeEffect !== 'none' && (
          <button data-fx-add-another onClick={s.addAnother} className="inline-flex items-center gap-1 px-2 py-1 min-h-[30px] rounded-md border border-dashed border-void-600 text-[12px] text-void-300 hover:text-white hover:border-void-400">
            <Plus size={12} />Add another effect
          </button>
        )}
      </div>
    </div>
  )
}
