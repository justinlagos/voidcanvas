// Number fields accept a little maths, like design apps do:
//   "120"        the value
//   "+10" "-=10" add to or take from the current value ("-10" on its own is minus ten)
//   "*2" "/3"    multiply or divide the current value
//   "50%"        half of the current value
//   "100+20*2"   a sum, worked out with the usual order
// Anything else returns null and the field keeps its value.

export function evalNumber(text: string, current: number): number | null {
  const t = text.trim().replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/')
  if (!t) return null
  const pct = /^(-?\d*\.?\d+)\s*%$/.exec(t)
  if (pct) return fin(current * Number(pct[1]) / 100)
  const rel = /^([+*/x]|[-+*/]=)\s*(.+)$/i.exec(t)
  if (rel) {
    const n = calc(rel[2]); if (n === null) return null
    const op = rel[1][0].toLowerCase()
    return fin(op === '+' ? current + n : op === '-' ? current - n : op === '*' || op === 'x' ? current * n : n === 0 ? NaN : current / n)
  }
  return calc(t)
}

const fin = (n: number) => (Number.isFinite(n) ? n : null)

/** + - * / and brackets over plain numbers. */
function calc(src: string): number | null {
  const toks = src.match(/\d*\.?\d+(?:e[-+]?\d+)?|[-+*/()]|\S/gi)
  if (!toks) return null
  let i = 0
  const peek = () => toks[i], take = () => toks[i++]
  function expr(): number { let v = term(); while (peek() === '+' || peek() === '-') { const op = take(); const r = term(); v = op === '+' ? v + r : v - r } return v }
  function term(): number { let v = unary(); while (peek() === '*' || peek() === '/') { const op = take(); const r = unary(); v = op === '*' ? v * r : v / r } return v }
  function unary(): number { if (peek() === '-') { take(); return -unary() } if (peek() === '+') { take(); return unary() } return atom() }
  function atom(): number {
    const t = take()
    if (t === '(') { const v = expr(); if (take() !== ')') throw 0; return v }
    if (t !== undefined && /^\d*\.?\d+(?:e[-+]?\d+)?$/i.test(t)) return Number(t)
    throw 0
  }
  try { const v = expr(); return i === toks.length ? fin(v) : null } catch { return null }
}
