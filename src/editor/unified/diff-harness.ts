// B05: rendering/export comparison + performance budget harness.
// Compares settings (not pixels) in unit tests; browser e2e does pixel goldens.
// Perf budgets are recorded, never asserted as flaky CI gates.
export interface RenderExpectation {
  boardWidth: number
  boardHeight: number
  fxLongSide: number
  scale: number
  expectedGrain: number
}

export function fxScale(boardLongSide: number, fxLong: number, scale: number): number {
  const base = Math.min(1200, fxLong)
  return (scale * fxLong) / Math.max(1, base) * (fxLong / Math.max(1, boardLongSide) > 1 ? boardLongSide / fxLong : 1)
}

export function previewExportMatch(preview: RenderExpectation, exported: RenderExpectation, tolerance = 0.05): boolean {
  const p = preview.expectedGrain
  const e = exported.expectedGrain
  if (p === 0 && e === 0) return true
  return Math.abs(p - e) / Math.max(1, Math.abs(p)) <= tolerance
}

export interface PerfSample { action: string; ms: number; budgetMs: number }
export function withinBudget(s: PerfSample): boolean { return s.ms <= s.budgetMs }
export function summarizePerf(samples: PerfSample[]): { over: PerfSample[]; p50: number } {
  const sorted = [...samples].map(s => s.ms).sort((a, b) => a - b)
  const p50 = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
  return { over: samples.filter(s => !withinBudget(s)), p50 }
}
