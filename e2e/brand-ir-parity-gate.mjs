import { readFile } from 'node:fs/promises'

const file = 'e2e/.out/brand-ir-parity/metrics.json'
const rows = JSON.parse(await readFile(file, 'utf8'))

const limits = {
  meanRgbAbsolute: 0.15,
  changedPixelShare: 0.003,
  maxSharedTextBoxDrift: 1,
}

let failures = 0
for (const row of rows) {
  const label = `${row.fixture} / ${row.kind}`
  const checks = [
    [
      'mean RGB drift',
      row.pixel.meanRgbAbsolute <= limits.meanRgbAbsolute,
      `${row.pixel.meanRgbAbsolute.toFixed(4)} <= ${limits.meanRgbAbsolute}`,
    ],
    [
      'changed pixel share',
      row.pixel.changedPixelShare <= limits.changedPixelShare,
      `${(row.pixel.changedPixelShare * 100).toFixed(3)}% <= ${(limits.changedPixelShare * 100).toFixed(1)}%`,
    ],
    [
      'shared text geometry',
      row.recorder.maxSharedTextBoxDrift == null ||
        row.recorder.maxSharedTextBoxDrift <= limits.maxSharedTextBoxDrift,
      `${row.recorder.maxSharedTextBoxDrift ?? 'n/a'} <= ${limits.maxSharedTextBoxDrift} page unit`,
    ],
    [
      'recorded text count',
      row.recorder.legacy.text === row.recorder.ir.text,
      `${row.recorder.ir.text} IR = ${row.recorder.legacy.text} legacy`,
    ],
  ]
  for (const [name, pass, detail] of checks) {
    console.log(`${pass ? 'PASS' : 'FAIL'} ${label} · ${name} · ${detail}`)
    if (!pass) failures++
  }
}

if (!rows.length) {
  console.error('FAIL no parity rows were produced')
  failures++
}

if (failures) {
  console.error(`Brand IR parity gate failed: ${failures} check${failures === 1 ? '' : 's'}.`)
  process.exitCode = 1
} else {
  console.log(`PASS Brand IR parity gate · ${rows.length} comparisons`)
}
