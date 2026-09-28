import { describe, expect, it } from 'vitest'
import { evalNumber } from '../numexpr'

describe('number fields', () => {
  it('reads plain numbers', () => {
    expect(evalNumber('120', 5)).toBe(120)
    expect(evalNumber('-10', 5)).toBe(-10)
    expect(evalNumber('12.5', 0)).toBe(12.5)
    expect(evalNumber('12,5', 0)).toBe(12.5)
  })
  it('works from the current value', () => {
    expect(evalNumber('+10', 100)).toBe(110)
    expect(evalNumber('-=10', 100)).toBe(90)
    expect(evalNumber('*2', 100)).toBe(200)
    expect(evalNumber('x3', 100)).toBe(300)
    expect(evalNumber('/4', 100)).toBe(25)
    expect(evalNumber('50%', 300)).toBe(150)
  })
  it('does sums in the usual order', () => {
    expect(evalNumber('100+20*2', 0)).toBe(140)
    expect(evalNumber('(100+20)*2', 0)).toBe(240)
    expect(evalNumber('1080/2', 0)).toBe(540)
  })
  it('keeps the value for anything else', () => {
    expect(evalNumber('', 5)).toBeNull()
    expect(evalNumber('abc', 5)).toBeNull()
    expect(evalNumber('1+', 5)).toBeNull()
    expect(evalNumber('/0', 5)).toBeNull()
    expect(evalNumber('alert(1)', 5)).toBeNull()
  })
})
