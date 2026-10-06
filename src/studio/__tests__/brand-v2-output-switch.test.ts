import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync('src/studio/BrandGuideline.tsx', 'utf8')
const pdf = fs.readFileSync('src/studio/brand-pdf.ts', 'utf8')
const render = fs.readFileSync('src/studio/brand-v2-render.ts', 'utf8')
const publish = fs.readFileSync('src/brand/client.ts', 'utf8')

describe('Brand V2 output rendering', () => {
  it('uses the same runtime IR for handoff and saved guideline assets', () => {
    expect(source).toContain('const outputRuntime = useMemo(() => (v2 ? composeRuntimePages')
    expect(source).toContain('await eachRuntimePage({ pages, irByIndex: outputRuntime.irByIndex')
    expect(source.match(/eachRuntimePage\(\{ pages, irByIndex: outputRuntime\.irByIndex/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('passes the runtime IR into screen and print PDF generation', () => {
    expect(source).toContain('decisions, photos, outputRuntime.irByIndex)')
    expect(pdf).toContain("import { eachRuntimePage } from './brand-v2-render'")
    expect(pdf.match(/eachRuntimePage\(\{/g)?.length).toBe(2)
  })

  it('keeps PDF callers compatible when no V2 map is supplied', () => {
    expect(pdf.match(/irByIndex: Map<number, IrPage> = new Map\(\)/g)?.length).toBe(2)
  })

  it('records Open in Editor layers from the same runtime IR as the preview', () => {
    expect(source).toContain('await recordRuntimePages({ pages, irByIndex: outputRuntime.irByIndex')
    expect(source).not.toMatch(/\brecordPages\(/)
    expect(render).toContain('export async function recordRuntimePages')
    expect(render).toMatch(/if \(usesV2\(target\)\)[\s\S]*recordPage\(target\.irPage\.width, target\.irPage\.height/)
  })

  it('publishes brand pages through the same renderer switch as the builder, with the builder logo', () => {
    expect(publish).toContain("await import('./compose/runtime')")
    expect(publish).toContain('const runtime = brandV2Enabled()')
    expect(publish).toContain('composeRuntimePages({')
    expect(publish).toContain('await eachRuntimePage({')
    expect(publish).toContain('source.logoFile')
    expect(publish).not.toMatch(/\beachPage\b/)
  })

  it('keeps the page scale when drawing the misuse demo', () => {
    expect(render).not.toContain('setTransform(1, 0, 0, 1, 0, 0)')
  })
})
