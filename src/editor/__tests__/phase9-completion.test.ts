import { describe, expect, it } from 'vitest'
import { pressureDecision } from '../stage-production'
import { phase9TortureSummary } from '../phase9-torture'
import { pdfxBlocking, pdfxPreflight } from '../pdfx-preflight'
import { pdfx4StructureText } from '../pdfx4'
import { flipRgbaRows, tileRenderPlan } from '../hybrid-tiled-renderer'
import type { Doc } from '../types'

describe('Phase 9 completion gates', () => {
  it('keeps every torture fixture bounded instead of resident in full', () => {
    const s = phase9TortureSummary()
    expect(s.allBounded).toBe(true)
    expect(s.fixtures.find(x => x.fixture.id === 'exhibition')!.residentTiles).toBeLessThan(s.fixtures.find(x => x.fixture.id === 'exhibition')!.wholeDocumentTiles)
  })

  it('reduces resident memory aggressively under pressure', () => {
    expect(pressureDecision({ heapUsed: 500, heapLimit: 1000 }).level).toBe('normal')
    expect(pressureDecision({ heapUsed: 760, heapLimit: 1000 }).residentFactor).toBeLessThan(1)
    expect(pressureDecision({ storageUsage: 940, storageQuota: 1000 })).toMatchObject({ level: 'critical', clearScratch: true })
  })

  it('plans bounded tiles and vertically corrects WebGL readback rows', () => {
    expect(tileRenderPlan({ x: 0, y: 0, w: 2500, h: 1200 }, 5000, 3000, 1024).map(x => x.key)).toEqual(['0:0', '1:0', '2:0', '0:1', '1:1', '2:1'])
    const flipped = flipRgbaRows(new Uint8Array([1,2,3,4, 5,6,7,8]), 1, 2)
    expect(Array.from(flipped)).toEqual([5,6,7,8, 1,2,3,4])
  })

  it('blocks PDF/X without an output intent and reports production policy warnings', () => {
    const doc: Doc = { id: 'p', name: 'Print', width: 1000, height: 1000, background: '#fff', dpi: 150 }
    const findings = pdfxPreflight(doc, [], { bleedMm: 0 })
    expect(pdfxBlocking(findings).some(x => x.code === 'output-intent')).toBe(true)
    expect(findings.some(x => x.code === 'bleed-none')).toBe(true)
    expect(findings.some(x => x.code === 'document-dpi')).toBe(true)
  })

  it('recognises the required PDF/X-4 structural contract and rejects DeviceRGB', () => {
    const fake = new TextEncoder().encode('%PDF-1.6 /S /GTS_PDFX /DestOutputProfile /ColorSpace [/ICCBased 5 0 R] /TrimBox /BleedBox pdfxid:GTS_PDFXVersion PDF/X-4')
    expect(pdfx4StructureText(fake)).toEqual({ pdf16: true, outputIntent: true, iccBased: true, trimBox: true, bleedBox: true, xmp: true, noDeviceRgb: true })
    const rgb = new TextEncoder().encode('%PDF-1.6 /S /GTS_PDFX /DestOutputProfile /ColorSpace [/ICCBased 5 0 R] /TrimBox /BleedBox pdfxid:GTS_PDFXVersion PDF/X-4 /DeviceRGB')
    expect(pdfx4StructureText(rgb).noDeviceRgb).toBe(false)
  })
})
