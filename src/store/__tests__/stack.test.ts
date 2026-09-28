import { beforeEach, describe, expect, it } from 'vitest'
import { fullStack, useStore } from '../useStore'
import { scaleParams } from '@/lib/effect-scale'

const s = () => useStore.getState()
const names = () => fullStack(s()).map(x => x.effect)

describe('the Effects page stack', () => {
  beforeEach(() => useStore.setState({ activeEffect: 'none', below: [], above: [], history: [] }))

  it('keeps the effect you were on and starts another on top', () => {
    s().setActiveEffect('halftone')
    s().setParam('scale', 30)
    s().addAnother()
    expect(names()).toEqual(['halftone', 'none'])
    expect(fullStack(s(), true).map(x => x.effect)).toEqual(['halftone'])
    s().setActiveEffect('grain')
    expect(names()).toEqual(['halftone', 'grain'])
    expect(s().below[0].params.scale).toBe(30)
  })

  it('switching which one you change keeps the order and the settings', () => {
    s().setActiveEffect('halftone'); s().setParam('scale', 30); s().addAnother(); s().setActiveEffect('grain'); s().setParam('intensity', 70)
    s().editAt(0)
    expect(s().activeEffect).toBe('halftone')
    expect(s().params.scale).toBe(30)
    expect(names()).toEqual(['halftone', 'grain'])
    expect(s().above[0].params.intensity).toBe(70)
  })

  it('an empty slot goes when you pick another to change', () => {
    s().setActiveEffect('halftone'); s().addAnother()
    s().editAt(0)
    expect(names()).toEqual(['halftone'])
  })

  it('removes one and undo brings it back', () => {
    s().setActiveEffect('halftone'); s().addAnother(); s().setActiveEffect('grain'); s().addAnother(); s().setActiveEffect('vignette')
    s().removeAt(1)
    expect(names()).toEqual(['halftone', 'vignette'])
    s().undo()
    expect(names()).toEqual(['halftone', 'grain', 'vignette'])
  })

  it('scales pixel settings down for small previews and up for exports', () => {
    const p = { ...s().params, scale: 40 }
    expect(scaleParams('halftone', p, 0.5).scale).toBe(20)
    expect(scaleParams('halftone', p, 2).scale).toBe(80)
    expect(scaleParams('halftone', p, 1)).toBe(p)
    expect(scaleParams('duotone', p, 0.5).scale).toBe(40)
  })
})
