import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync('src/studio/BrandGuideline.tsx', 'utf8')
const pdf = fs.readFileSync('src/studio/brand-pdf.ts', 'utf8')

describe('Brand V2 output rendering', () => {
  it('uses the same runtime IR for handoff and saved guideline assets', () => {
    expect(source).toContain('const outputRuntime = useMemo(() => composeRuntimePages')
    expect(source).toContain('await eachRuntimePage({ pages, irByIndex: outputRuntime.irByIndex')
    expect(source.match(/eachRuntimePage\(\{ pages, irByIndex: outputRuntime\.irByIndex/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('passes the runtime IR into screen and print PDF generation', () => {
    expect(source).toContain('decisions, photos, outputRuntime.irByIndex)')
    expect(pdf).toContain("import { eachRuntimePage } from './brand-v2-render'")
    expect(pdf.match(/eachRuntimePage\(\{/g)?.length).toBe(2)
  })
})
