import { describe, expect, it } from 'vitest'
import { BRIEFS, CLIENT_LINES, DIRECTIONS, formatClock, pick, pickNext } from '../briefs'
import { buildChallenge } from '../challenge'

describe('briefs', () => {
  it('has enough briefs, lines and directions for the campaign', () => {
    expect(BRIEFS.length).toBeGreaterThanOrEqual(20)
    expect(CLIENT_LINES.length).toBeGreaterThanOrEqual(15)
    expect(DIRECTIONS.map(d => d.name)).toEqual(['Editorial', 'Poster', 'Album cover', 'Social', 'Experimental', 'Luxury', 'Brutalist', 'Retro', 'Minimal', 'Completely stupid'])
    expect(new Set(BRIEFS.map(b => b.id)).size).toBe(BRIEFS.length)
  })
  it('picks the same brief for the same seed', () => {
    expect(pick(BRIEFS, 42)).toBe(pick(BRIEFS, 42))
    expect(pick(BRIEFS, 1)).not.toBe(pick(BRIEFS, 2))
  })
  it('Try another never repeats the last brief', () => {
    for (let i = 0; i < 50; i++) { const last = BRIEFS[i % BRIEFS.length]; expect(pickNext(BRIEFS, last).id).not.toBe(last.id) }
  })
  it('formats the clock', () => {
    expect(formatClock(60)).toBe('01:00'); expect(formatClock(3)).toBe('00:03'); expect(formatClock(-2)).toBe('00:00'); expect(formatClock(90)).toBe('01:30')
  })
})

describe('buildChallenge', () => {
  it('/60 always runs sixty seconds', () => { for (let s = 0; s < 30; s++) expect(buildChallenge('60', { seed: s }).seconds).toBe(60) })
  it('/five allows five clicks and no clock', () => { const c = buildChallenge('five'); expect(c.clicks).toBe(5); expect(c.seconds).toBe(0) })
  it('/brief brings five distinct client lines', () => { const c = buildChallenge('brief', { seed: 7 }); expect(new Set(c.lines).size).toBe(5); expect(c.seconds).toBe(120) })
  it('/one-image asks for your own image and lists ten lives', () => { const c = buildChallenge('one-image'); expect(c.starter).toBe('own'); expect(c.directions?.length).toBe(10) })
  it('/rescue uses the terrible product shot', () => { expect(buildChallenge('rescue').starter).toBe('product') })
})
