// next/font gives Inter a generated family name. Canvas text and inline styles that name the font
// read it from the CSS variable set on <html>, so they match the rest of the UI.
let cached = ''
export function uiFont(): string {
  if (cached) return cached
  if (typeof document === 'undefined') return 'Inter, system-ui, sans-serif'
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-inter').trim()
  cached = v ? `${v}, Inter, system-ui, sans-serif` : 'Inter, system-ui, sans-serif'
  return cached
}
