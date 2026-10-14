export interface SizePreset { id: string; label: string; group: string; width: number; height: number; print?: import('./types').Frame['print'] }

export const SIZE_PRESETS: SizePreset[] = [
  { id: 'ig-post', label: 'Instagram post', group: 'Social', width: 1080, height: 1350 },
  { id: 'square', label: 'Square post', group: 'Social', width: 1080, height: 1080 },
  { id: 'story', label: 'Story or Reel cover', group: 'Social', width: 1080, height: 1920 },
  { id: 'yt', label: 'YouTube thumbnail', group: 'Social', width: 1280, height: 720 },
  { id: 'li', label: 'LinkedIn banner', group: 'Social', width: 1584, height: 396 },
  { id: 'x', label: 'X header', group: 'Social', width: 1500, height: 500 },
  { id: 'slide', label: 'Presentation slide', group: 'Screen', width: 1920, height: 1080 },
  { id: 'web', label: 'Website hero', group: 'Screen', width: 2400, height: 1200 },
  { id: 'a4', label: 'A4 flyer', group: 'Print', width: 2480, height: 3508, print: { widthMm: 210, heightMm: 297, dpi: 300 } },
  { id: 'a5', label: 'A5 flyer', group: 'Print', width: 1748, height: 2480, print: { widthMm: 148, heightMm: 210, dpi: 300 } },
  { id: 'poster', label: 'Poster 18 × 24 in', group: 'Print', width: 5400, height: 7200, print: { widthMm: 457.2, heightMm: 609.6, dpi: 300 } },
  { id: 'card', label: 'Business card', group: 'Print', width: 1050, height: 600, print: { widthMm: 88.9, heightMm: 50.8, dpi: 300 } },
]
