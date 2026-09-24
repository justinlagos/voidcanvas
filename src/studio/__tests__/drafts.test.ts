import { describe, expect, it } from 'vitest'
import { readBrief } from '../drafts'

// Briefs from the 24 Sept 2026 QA report (B04), plus edge cases. Expected values follow the report's "Expected" lines.

const BAKERY = `We need an Instagram post for our bakery's new sourdough range. Warm and friendly. Launch Saturday 3 May at our Yaba shop. Loaves from N4,500. Must include the Mama's Oven logo and "Baked fresh every morning". Budget is tight so keep it simple.`

const LAGOS_NIGHTS = `Poster for Lagos Nights, a rooftop party at The Wings Tower, Victoria Island. Friday 12 July, 9pm till late. Tickets N10,000, early bird N7,500. Bold and premium. Get tickets at lagosnights.ng. Must include: the Lagos Nights logo, sponsor logos (Star, Pepsi), and the hashtag #LagosNights. Deadline Friday.`

const KANO = `Flyer for a free health screening at Kano Central Mosque hall. Saturday 20 April, 8am to 2pm. For families and the elderly. Clean, trustworthy. Include the Ministry of Health logo and the Red Cross logo. Please send first drafts by Tuesday.`

describe('readBrief: bakery (apostrophe, must-have list, instructions)', () => {
  const f = readBrief(BAKERY)
  it('does not treat the apostrophe in Mama\'s as a quote', () => {
    expect(f.headline).not.toMatch(/^S Oven/)
    expect(f.headline.toLowerCase()).toContain('sourdough')
  })
  it('never prints budget or deadline talk', () => {
    for (const v of [f.headline, f.subhead, ...f.must]) expect(v.toLowerCase()).not.toMatch(/budget|keep it simple/)
  })
  it('does not use the job sentence as a must-have', () => {
    expect(f.must.join(' | ').toLowerCase()).not.toContain('we need an instagram post')
  })
  it('splits the must-have list into items and keeps the quoted line', () => {
    expect(f.must).toContain("The Mama's Oven logo")
    expect(f.must).toContain('Baked fresh every morning')
  })
  it('finds the venue and the date', () => {
    expect(f.venue).toBe('Yaba shop')
    expect(f.date).toMatch(/Saturday 3 May/i)
  })
  it('reads the price and the feel', () => {
    expect(f.price).toBe('₦4,500')
    expect(f.feel).toEqual(expect.arrayContaining(['warm', 'friendly']))
  })
})

describe('readBrief: Lagos Nights (deadline, comma lists, sponsors)', () => {
  const f = readBrief(LAGOS_NIGHTS)
  it('headline is the event', () => expect(f.headline).toBe('Lagos Nights'))
  it('subhead is never the deadline', () => {
    expect(f.subhead.toLowerCase()).not.toContain('deadline')
    expect(f.must.join(' ').toLowerCase()).not.toContain('deadline')
  })
  it('splits the must list on commas and "and"', () => {
    expect(f.must).toEqual(expect.arrayContaining(['The Lagos Nights logo', 'Sponsor logos (Star, Pepsi)', 'The hashtag #LagosNights']))
    expect(f.must.length).toBeGreaterThanOrEqual(3)
  })
  it('gets date, time, price, cta, contact', () => {
    expect(f.date).toMatch(/Friday 12 July/i)
    expect(f.time).toBe('9pm')
    expect(f.price).toBe('₦10,000')
    expect(f.cta.toLowerCase()).toContain('get tickets')
    expect(f.contact).toContain('lagosnights.ng')
  })
})

describe('readBrief: Kano (please send drafts, include X and Y)', () => {
  const f = readBrief(KANO)
  it('headline comes from the job line', () => expect(f.headline).toBe('Free Health Screening'))
  it('subhead is never the delivery request', () => {
    expect(f.subhead.toLowerCase()).not.toMatch(/please|drafts|tuesday/)
    for (const m of f.must) expect(m.toLowerCase()).not.toMatch(/please|drafts/)
  })
  it('splits "Include A and B" into two logos', () => {
    expect(f.must).toEqual(expect.arrayContaining(['The Ministry of Health logo', 'The Red Cross logo']))
  })
  it('audience, venue, time', () => {
    expect(f.audience.toLowerCase()).toContain('families')
    expect(f.venue).toBe('Kano Central Mosque hall')
    expect(f.time).toBe('8am to 2pm')
  })
})

describe('readBrief: edge cases', () => {
  it('labelled lines win', () => {
    const f = readBrief('Headline: Harvest Sunday\nSubhead: Give thanks together\nDate: 6 Oct\nVenue: Grace Chapel\nMust include: choir photo, offering details')
    expect(f.headline).toBe('Harvest Sunday')
    expect(f.subhead).toBe('Give thanks together')
    expect(f.venue).toBe('Grace Chapel')
    expect(f.must).toEqual(['Choir photo', 'Offering details'])
  })
  it('a straight-quoted title still works at word edges', () => {
    const f = readBrief(`Poster for 'Night of Praise' at Redeemed Hall. Sunday 3 March, 6pm.`)
    expect(f.headline).toBe('Night of Praise')
  })
  it('possessives never open a quote', () => {
    const f = readBrief(`Flyer for Tunde's Grill opening. It's on Friday 5 May at Lekki Phase 1. Tell people they're welcome.`)
    expect(f.headline).toBe("Tunde's Grill Opening")
  })
  it('deadlines with a date are not printed', () => {
    const f = readBrief(`Banner for the Tech Summit. Deadline is 3 June. Send by Monday please. Include the Andela logo.`)
    expect(f.subhead.toLowerCase()).not.toMatch(/deadline|send by/)
    expect(f.must).toEqual(['The Andela logo'])
  })
  it('deliverables lists are not must-haves', () => {
    const f = readBrief(`Flyer for Summer Sale. We need an Instagram post, a story and an A4 poster. Must include the store logo.`)
    expect(f.must).toEqual(['The store logo'])
  })
  it('empty brief gives empty fields', () => {
    const f = readBrief('')
    expect(f.headline).toBe('')
    expect(f.must).toEqual([])
  })
})
