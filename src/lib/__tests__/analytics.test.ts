import { describe, expect, it } from 'vitest'
import { blankSummary, bucket, buildSummary, cleanSearchMiss, isRage, noteStep, stepKind, usageTotals, APP_VERSION } from '../analytics'

describe('usage counts', () => {
  it('sorts undo steps into kinds and never keeps the name', () => {
    expect(stepKind('Font')).toBe('text')
    expect(stepKind('Edit text')).toBe('text')
    expect(stepKind('Add board')).toBe('board')
    expect(stepKind('Delete board')).toBe('board')
    expect(stepKind('Nudge')).toBe('move')
    expect(stepKind('Align centres')).toBe('move')
    expect(stepKind('Gradient')).toBe('colour')
    expect(stepKind('Fill colour')).toBe('colour')
    expect(stepKind('Add effect')).toBe('effect')
    expect(stepKind('Reorder effects')).toBe('effect')
    expect(stepKind('Brush')).toBe('paint')
    expect(stepKind('Deselect')).toBe('select')
    expect(stepKind('Duplicate layer')).toBe('layer')
    expect(stepKind('Group layers')).toBe('layer')
    expect(stepKind('Something new')).toBe('other')
  })

  it('does not count opening or starting a design as a change', () => {
    const before = usageTotals().steps
    noteStep('New design'); noteStep('Open'); noteStep('Document')
    expect(usageTotals().steps).toBe(before)
    noteStep('Move')
    expect(usageTotals().steps).toBe(before + 1)
  })

  it('keeps search misses short, lower case and free of emails and numbers', () => {
    expect(cleanSearchMiss('  Gradient   FILL ')).toBe('gradient fill')
    expect(cleanSearchMiss('a')).toBeNull()
    expect(cleanSearchMiss('justin@example.com')).toBeNull()
    expect(cleanSearchMiss('call 08031234567')).toBeNull()
    expect(cleanSearchMiss('www.site.com')).toBeNull()
    expect(cleanSearchMiss('x'.repeat(50))).toHaveLength(32)
    expect(cleanSearchMiss('a4 flyer')).toBe('a4 flyer')
  })

  it('builds a summary only when something happened, with seconds and the busiest kinds', () => {
    expect(buildSummary(blankSummary())).toBeNull()
    const s = blankSummary()
    s.eng = 125_400; s.steps = { text: 4, move: 9 }; s.ctl = { Size: 3 }; s.saves = 2; s.saveMs = 81; s.exp = 1
    const p = buildSummary(s, { layers: '6-20', boards: '1' })!
    expect(p.eng).toBe(125)
    expect(p.n).toBe(13)
    expect(p.steps).toEqual({ move: 9, text: 4 })
    expect(p.ctl).toEqual({ Size: 3 })
    expect(p.layers).toBe('6-20')
    expect(JSON.stringify(p).length).toBeLessThan(1500)
  })

  it('caps the busiest lists so a row stays under the 2 KB limit', () => {
    const s = blankSummary()
    for (let i = 0; i < 60; i++) s.ctl[`Control number ${i} long label`] = i
    const p = buildSummary(s)!
    expect(Object.keys(p.ctl as object)).toHaveLength(12)
    expect(JSON.stringify(p).length).toBeLessThan(1500)
  })

  it('reads four quick clicks on one spot as a rage click, and a triple click as not', () => {
    const at = (t: number, x = 100, y = 100) => ({ t, x, y })
    expect(isRage([at(0), at(150), at(300)], 300)).toBe(false)
    expect(isRage([at(0), at(200), at(400), at(600)], 600)).toBe(true)
    expect(isRage([at(0), at(200), at(400), at(600, 160)], 600)).toBe(false)
    expect(isRage([at(0), at(700), at(1400), at(2100)], 2100)).toBe(false)
  })

  it('puts design sizes in buckets', () => {
    expect([0, 1, 2, 5, 6, 20, 21, 400].map(bucket)).toEqual(['0', '1', '2-5', '2-5', '6-20', '6-20', '21+', '21+'])
  })

  it('has a version the database accepts', () => {
    expect(APP_VERSION).toMatch(/^[0-9a-z.+-]{1,24}$/)
  })
})
