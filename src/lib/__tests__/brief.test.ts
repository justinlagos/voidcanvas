import { describe, expect, it } from 'vitest'
import { briefCheck, datesIn, formatsIn, questionsEmail, resolveDate, sizesIn } from '../intelligence/brief'
import { readBrief } from '@/studio/drafts'

// Monday 28 September 2026.
const TODAY = new Date(2026, 8, 28)
const check = (text: string, o: { hasBrand?: boolean } = {}) => briefCheck(readBrief(text), text, TODAY, o)
const ids = (text: string, o: { hasBrand?: boolean } = {}) => check(text, o).issues.map(i => i.id.replace(/-\d+$/, ''))

describe('reading dates', () => {
  it('reads written and numeric dates, day first', () => {
    const d = datesIn('Sat 12 Oct, then October 19th 2026, and 3/11/2026.')
    expect(d.map(x => [x.day, x.month, x.year, x.weekday])).toEqual([[12, 9, null, 6], [19, 9, 2026, null], [3, 10, 2026, null]])
  })
  it('knows a deadline from the date of the event', () => {
    const d = datesIn('Launch on 10 October. We need the files by 2 October. Register by 8 October.')
    expect(d.map(x => x.deadline)).toEqual([false, true, false])
  })
  it('puts a date without a year in the coming year, unless it has only just passed', () => {
    expect(resolveDate({ day: 12, month: 9, year: null }, TODAY).getFullYear()).toBe(2026)
    expect(resolveDate({ day: 5, month: 0, year: null }, TODAY).getFullYear()).toBe(2027)
    expect(resolveDate({ day: 1, month: 8, year: null }, TODAY).getFullYear()).toBe(2026)
  })
})

describe('checking a brief', () => {
  it('finds a weekday that does not match its date', () => {
    const r = check('Afrobeats night. Friday 12 October, 8pm at The Hub. Tickets ₦10,000 at tix.ng. Book now. Logo attached. Deadline 5 October. IG post.')
    const w = r.issues.find(i => i.kind === 'weekday')!
    expect(w.question).toBe('The brief says Friday 12 October, but 12 October 2026 is a Monday. Which is right, the day or the date?')
    expect(w.quote).toBe('Friday 12 October')
  })

  it('asks for what is missing, and only that', () => {
    expect(ids('Afrobeats night at The Hub, Lekki. Monday 12 October, 8pm. Get tickets at tix.ng. Logo attached. Need an IG post and a story by 5 October.')).toEqual([])
    expect(ids('A flyer for our harvest thanksgiving service.')).toEqual(['date', 'time', 'venue', 'cta', 'contact', 'logo', 'deadline'])
    expect(ids('A flyer for our harvest thanksgiving service.', { hasBrand: true })).not.toContain('logo')
    expect(ids('Instagram post for our new sourdough range. Order on 0803 123 4567. Deadline Friday.')).toEqual(['logo'])
  })

  it('flags two dates, but not a range', () => {
    expect(ids('Conference on 14 October at the Civic Centre, 9am. Register at conf.ng. Logo attached. IG post. Deadline 1 October. Also 21 October.')).toContain('dates')
    expect(ids('Festival from 12 to 14 October at the Civic Centre, 9am. Register at fest.ng. Logo attached. IG post. Deadline 1 October.')).not.toContain('dates')
  })

  it('flags files due after the event, and a date that has passed', () => {
    const r = check('Launch party on 10 October at The Hub, 7pm. RSVP at hub.ng. Logo attached. IG post. We need the files by 20 October.')
    expect(r.issues.find(i => i.id === 'deadline-after')?.question).toBe('The files are due on 20 October 2026, after the event on 10 October 2026. When do you need them?')
    expect(ids('Party on 1 September at The Hub, 7pm. RSVP at hub.ng. Logo attached. IG post. Deadline tomorrow.')).toContain('past')
  })

  it('flags two prices unless they are different tickets', () => {
    expect(ids('Concert, 10 October 7pm at The Hub. Tickets ₦5,000 and ₦7,500 at tix.ng. Logo attached. IG post. Deadline tomorrow.')).toContain('prices')
    expect(ids('Concert, 10 October 7pm at The Hub. Regular ₦5,000, VIP ₦20,000 at tix.ng. Logo attached. IG post. Deadline tomorrow.')).not.toContain('prices')
  })

  it('reads sizes and formats', () => {
    const presets = [{ id: 'ig-post', width: 1080, height: 1350 }, { id: 'rollup', width: 2008, height: 4724, mm: { w: 850, h: 2000 } }, { id: 'a3', width: 3508, height: 4961, mm: { w: 297, h: 420 } }]
    const s = sizesIn('We need 1080x1350, a 1080 x 1920 px story, an 85 x 200 cm roll-up and an A3 poster.', presets)
    expect(s.map(x => [x.label, x.presetId ?? null])).toEqual([['1080 × 1350', 'ig-post'], ['1080 × 1920', null], ['85 × 200 cm', 'rollup'], ['A3', 'a3']])
    expect(s[2].mm).toEqual({ w: 850, h: 2000 })
    expect(sizesIn('Sat 12 by 8 people, ₦10,000.')).toEqual([])
    expect(formatsIn('An IG post, a WhatsApp status and a flyer')).toEqual(['ig-post', 'story', 'wa-status', 'a4'])
  })

  it('writes the questions as a short email', () => {
    const r = check('A flyer for our harvest thanksgiving service.')
    const mail = questionsEmail(r.issues.slice(0, 2), { client: 'Ada', job: 'Harvest flyer' })
    expect(mail).toBe('Hi Ada,\n\nThanks for the brief for Harvest flyer. Before I start, a few quick questions:\n\n1. What is the date of the event?\n2. What time does it start, and when does it end?\n\nThanks!')
  })
})
