// The concept map behind Learn search. A query word that lands in a group also matches the other words in the
// group at a lower weight, so "blurry" finds the resolution guide and "photoshop masks" finds masks.
// Groups were built from the autocomplete research (research/learn-seo/autocomplete.csv) and the product's own vocabulary.
// Keep terms lower case, single words or short phrases people type. Order inside a group does not matter.

export const CONCEPTS: string[][] = [
  ['blurry', 'blurred', 'blur', 'pixelated', 'pixelate', 'pixelation', 'soft', 'fuzzy', 'low quality', 'low res', 'lowres', 'resolution', 'dpi', 'ppi', 'upscale', 'sharp', 'sharpen', 'sharpness', 'quality', 'grainy', 'jagged'],
  ['print', 'printing', 'printer', 'press', 'cmyk', 'bleed', 'trim', 'crop marks', 'safe area', 'proof', 'gsm', 'paper', 'litho', 'print ready', 'press ready', 'prepress'],
  ['photoshop', 'ps', 'psd', 'adobe', 'illustrator', 'indesign', 'affinity', 'gimp', 'photopea', 'canva', 'figma', 'alternative', 'switch', 'migrate', 'subscription'],
  ['mask', 'masks', 'masking', 'layer mask', 'clipping mask', 'clip', 'hide', 'reveal', 'non destructive', 'nondestructive', 'quick mask', 'vector mask'],
  ['background', 'remove background', 'background removal', 'bg', 'cutout', 'cut out', 'transparent', 'transparency', 'transparent png', 'isolate', 'subject', 'silhouette', 'knockout'],
  ['resize', 'resizing', 'scale', 'scaling', 'dimensions', 'size', 'sizes', 'pixels', 'px', 'canvas size', 'image size', 'aspect ratio', 'enlarge', 'shrink', 'bigger', 'smaller', 'width', 'height'],
  ['brand', 'branding', 'brand identity', 'identity', 'logo', 'brand kit', 'style guide', 'guideline', 'guidelines', 'consistent', 'consistency', 'brand book', 'visual identity', 'brand colours', 'brand colors', 'brand fonts'],
  ['social', 'social media', 'instagram', 'ig', 'story', 'stories', 'reel', 'reels', 'tiktok', 'facebook', 'linkedin', 'youtube', 'thumbnail', 'post', 'posts', 'banner', 'header', 'cover', 'carousel'],
  ['halftone', 'halftones', 'dots', 'dot pattern', 'dot', 'screen print', 'screenprint', 'screen printing', 'silkscreen', 'comic', 'comic book', 'ben day', 'newspaper', 'lichtenstein', 'pop art', 'stipple'],
  ['risograph', 'riso', 'misregistration', 'grain', 'texture', 'textured', 'vintage', 'retro', 'analogue', 'analog', 'print look', 'zine', 'overprint'],
  ['dither', 'dithering', 'dithered', 'pixel art', '8 bit', '8bit', 'lo fi', 'lofi', 'game boy', 'bitmap', 'floyd steinberg', 'threshold', '1 bit'],
  ['glitch', 'glitchy', 'datamosh', 'rgb shift', 'rgb split', 'chromatic', 'distort', 'distortion', 'corrupt', 'vhs', 'crt', 'scanlines', 'pixel sort'],
  ['duotone', 'two colour', 'two color', 'two tone', 'gradient map', 'tint', 'tinted', 'colour grade', 'color grade', 'monochrome', 'sepia', 'posterize', 'posterise'],
  ['font', 'fonts', 'typeface', 'typefaces', 'typography', 'type', 'text', 'lettering', 'kerning', 'tracking', 'leading', 'line height', 'letter spacing', 'hierarchy', 'headline', 'serif', 'sans', 'pairing', 'pair fonts', 'font pairing', 'type scale'],
  ['colour', 'color', 'colours', 'colors', 'palette', 'palettes', 'swatch', 'swatches', 'hex', 'gradient', 'contrast', 'accessibility', 'accessible', 'wcag', 'oklch', 'hsl', 'rgb', 'tints', 'shades', 'hue', 'saturation'],
  ['export', 'exporting', 'download', 'save', 'save as', 'png', 'jpg', 'jpeg', 'webp', 'pdf', 'svg', 'file format', 'formats', 'file size', 'compress', 'quality'],
  ['offline', 'no internet', 'without internet', 'install', 'installed', 'app', 'desktop', 'pwa', 'windows', 'mac', 'macos', 'linux', 'home screen'],
  ['private', 'privacy', 'upload', 'uploaded', 'uploading', 'no upload', 'without uploading', 'no account', 'no sign up', 'sign up', 'login', 'secure', 'confidential', 'gdpr', 'data', 'tracking', 'local', 'on device'],
  ['client', 'clients', 'freelance', 'freelancer', 'freelancing', 'brief', 'briefs', 'feedback', 'review', 'reviews', 'approval', 'approve', 'sign off', 'deliver', 'delivery', 'handoff', 'hand off', 'handover', 'directions', 'presentation', 'present', 'agency', 'job', 'jobs', 'project', 'projects'],
  ['poster', 'posters', 'flyer', 'flyers', 'leaflet', 'leaflets', 'a4', 'a5', 'a3', 'a2', 'a1', 'business card', 'cards', 'roll up', 'rollup', 'banner', 'signage', 'gig poster', 'event poster', 'menu', 'invitation'],
  ['layers', 'layer', 'group', 'groups', 'align', 'alignment', 'distribute', 'guides', 'grid', 'snap', 'snapping', 'artboard', 'artboards', 'board', 'boards', 'canvas', 'stack', 'order', 'merge', 'flatten'],
  ['retouch', 'retouching', 'heal', 'healing', 'clone', 'clone stamp', 'blemish', 'blemishes', 'skin', 'spot', 'spots', 'portrait', 'portraits', 'headshot', 'wrinkles', 'smooth', 'brush', 'eraser', 'dodge', 'burn'],
  ['adjust', 'adjustment', 'adjustments', 'curves', 'levels', 'brightness', 'contrast', 'exposure', 'tone', 'tones', 'white balance', 'temperature', 'vibrance', 'black and white', 'b&w', 'colour correction', 'color correction', 'grade'],
  ['shortcut', 'shortcuts', 'hotkey', 'hotkeys', 'keyboard', 'keys', 'command palette', 'ctrl', 'cmd', 'faster', 'speed', 'quick', 'quickly', 'efficient', 'productivity'],
  ['undo', 'redo', 'history', 'version', 'versions', 'restore', 'recover', 'lost', 'autosave', 'saved', 'backup', 'back up', 'crash', 'disappeared', 'gone'],
  ['template', 'templates', 'preset', 'presets', 'reuse', 'starting point', 'blank'],
  ['ai', 'artificial intelligence', 'generate', 'generative', 'model', 'machine learning', 'automatic', 'auto', 'smart', 'magic'],
  ['selection', 'select', 'selecting', 'marquee', 'lasso', 'magic wand', 'wand', 'feather', 'select subject', 'outline', 'trace'],
  ['shape', 'shapes', 'pen', 'pen tool', 'path', 'paths', 'vector', 'vectors', 'bezier', 'polygon', 'star', 'rectangle', 'circle', 'line', 'stroke', 'outline'],
  ['effect', 'effects', 'filter', 'filters', 'style', 'styles', 'look', 'looks', 'aesthetic', 'treatment', 'layer style', 'drop shadow', 'shadow', 'glow', 'stroke'],
  ['learn', 'learning', 'beginner', 'beginners', 'basics', 'fundamentals', 'principles', 'course', 'courses', 'tutorial', 'tutorials', 'lesson', 'lessons', 'teach', 'self taught', 'study'],
  ['generic', 'boring', 'amateur', 'amateurish', 'professional', 'polished', 'better', 'improve', 'good', 'great', 'cheap looking', 'template look', 'stand out', 'unique', 'original'],
  ['team', 'teams', 'share', 'sharing', 'collaborate', 'collaboration', 'colleague', 'colleagues', 'together', 'sync', 'account', 'sign in', 'devices'],
  ['phone', 'mobile', 'tablet', 'ipad', 'android', 'iphone', 'touch', 'pen pressure', 'stylus', 'on the go'],
  ['bug', 'broken', 'not working', 'crash', 'crashes', 'slow', 'freeze', 'freezes', 'error', 'problem', 'problems', 'issue', 'fix', 'troubleshoot', 'troubleshooting', 'help', 'support', 'fonts missing', 'missing'],
  ['crop', 'cropping', 'straighten', 'rotate', 'rotation', 'flip', 'mirror', 'trim', 'cut'],
  ['blend', 'blending', 'blend mode', 'blend modes', 'multiply', 'screen', 'overlay', 'opacity', 'fill', 'fade', 'transparent layer'],
]

/** Words that carry no meaning on their own in a search. */
export const STOP = new Set(['a', 'an', 'the', 'to', 'of', 'in', 'on', 'for', 'is', 'it', 'its', 'do', 'does', 'i', 'my', 'me', 'we', 'our', 'you', 'your', 'how', 'what', 'can', 'and', 'or', 'with', 'be', 'am', 'are', 'was', 'this', 'that', 'there', 'when', 'from', 'into', 'at', 'as', 'by', 'up', 'make', 'get', 'use', 'using', 'want', 'need', 'should', 'would', 'could', 'some', 'any', 'one', 'way', 'ways', 'voidcanvas', 'void', 'canvas',
  // So common in this library that they carry no signal on their own
  'design', 'designs', 'designing', 'designer', 'designers', 'graphic', 'graphics'])

/** Light stemmer: enough to match plurals and -ing forms without a dictionary. */
export function stem(w: string): string {
  if (w.length <= 3) return w
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y'
  if (w.endsWith('ing') && w.length > 6) return w.slice(0, -3)          // printing -> print, but not bring
  if (w.endsWith('ed') && w.length > 5 && !w.endsWith('eed')) return w.slice(0, -2) // masked -> mask, but not bleed or need
  if (w.endsWith('es') && w.length > 4 && !w.endsWith('ses')) return w.slice(0, -2)
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

const BY_TERM = new Map<string, Set<string>>()
for (const g of CONCEPTS) for (const t of g) { const set = BY_TERM.get(t) ?? new Set<string>(); g.forEach(x => { if (x !== t) set.add(x) }); BY_TERM.set(t, set) }

/** Related terms for a word or a phrase, or an empty array. Spelling variants (colour/color) are in the groups. */
export function related(term: string): string[] {
  const direct = BY_TERM.get(term)
  if (direct) return Array.from(direct)
  const s = stem(term)
  let hit: string[] = []
  BY_TERM.forEach((v, k) => { if (!hit.length && stem(k) === s) hit = Array.from(v) })
  return hit
}
