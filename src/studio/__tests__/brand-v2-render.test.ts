import { describe, expect, it } from 'vitest'
import { eachRuntimePage, renderRuntimePage } from '../brand-v2-render'

describe('Brand V2 renderer bridge', () => {
  it('exposes one page renderer and one document iterator for production call sites', () => {
    expect(typeof renderRuntimePage).toBe('function')
    expect(typeof eachRuntimePage).toBe('function')
  })
})
