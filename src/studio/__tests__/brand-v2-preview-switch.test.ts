import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync('src/studio/BrandGuideline.tsx', 'utf8')

describe('Brand V2 live guideline preview', () => {
  it('renders the live preview through the runtime V2 boundary', () => {
    expect(source).toContain("import { composeRuntimePages } from '@/brand/compose/runtime'")
    expect(source).toContain("import { renderRuntimePage } from './brand-v2-render'")
    expect(source).toContain('renderRuntimePage({ spec, irPage: runtime.irByIndex.get(sourceIndex)')
    expect(source).toContain('data-brand-renderer=')
  })

  it('keeps V2 selection driven by both take salts', () => {
    expect(source).toContain('const salt = useBrand(s => s.tokens.salt)')
    expect(source).toContain('const layoutSalt = useBrand(s => s.tokens.layoutSalt ?? 0)')
    expect(source).toContain('composeRuntimePages({ brand, logo, pages, salt, layoutSalt })')
  })
})
