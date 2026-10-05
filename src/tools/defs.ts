import type { ToolDef } from './ToolPage'

export const TOOLS: Record<string, ToolDef> = {
  halftone: {
    slug: 'halftone', effect: 'halftone', name: 'Halftone Generator',
    tagline: 'Turn any image into a custom halftone graphic directly in your browser.',
    labels: { scale: 'Dot size', intensity: 'Contrast' },
    about: 'Halftone recreates a continuous-tone image using a grid of dots that vary in size. It is the look of newspaper print, comic books and screen-printed posters. Upload a photo, set the dot size and contrast, and download the result as a PNG. Everything runs on your device, so nothing is uploaded.',
    faqs: [
      { q: 'What image sizes work best?', a: 'Any common photo works. Very large images are scaled down to keep the tool fast; the download still looks crisp for screen and most print use.' },
      { q: 'Can I keep editing the result?', a: 'Yes. Use Open in Editor to send the halftone into the VoidCanvas editor, where you can add type, combine it with other layers, or place it on a poster.' },
      { q: 'Is it free?', a: 'Yes, and there is no account. The tool runs in your browser and your image never leaves your device.' },
    ],
  },
  dither: {
    slug: 'dither', effect: 'dither', name: 'Dither Generator',
    tagline: 'Give any image a retro, low-bit dithered look, right in your browser.',
    labels: { threshold: 'Threshold' },
    about: 'Dithering simulates extra shades using patterns of a few colours, the way early computers and game consoles rendered images. It creates a distinctive grainy, retro texture. Upload an image, adjust the threshold, and export. Processing happens locally in your browser.',
    faqs: [
      { q: 'What is the threshold control?', a: 'It shifts where the pattern turns light areas to dark. Lower keeps more detail bright; higher pushes more of the image into the dithered dark pattern.' },
      { q: 'Can I use this for pixel art or game assets?', a: 'Yes. Dithering pairs well with pixel and lo-fi styles. Send the result to the editor to resize or combine it with other artwork.' },
      { q: 'Does my image get uploaded?', a: 'No. The tool works entirely on your device. Nothing is sent to a server.' },
    ],
  },
  glitch: {
    slug: 'glitch', effect: 'glitch', name: 'Glitch Image Generator',
    tagline: 'Add a broken-signal glitch effect to any image, free and in your browser.',
    labels: { intensity: 'Offset', scale: 'Slice height' },
    about: 'The glitch effect slices an image and shifts the slices sideways, like a corrupted video signal or a datamoshed frame. Upload a photo, set the offset and slice height, hit Randomize for a new variation, and download. It runs locally, so your image stays on your device.',
    faqs: [
      { q: 'How do I get a different glitch each time?', a: 'Press Randomize. Each press reshuffles the slices for a fresh result while keeping your offset and slice settings.' },
      { q: 'Can I make this into a poster or thumbnail?', a: 'Yes. Open in Editor to add text and layout, or drop it onto one of the poster and thumbnail sizes in the editor.' },
      { q: 'Is there a watermark?', a: 'No watermark, no account, no upload. The result is yours and it is made on your device.' },
    ],
  },
  grain: {
    slug: 'grain', effect: 'grain', name: 'Film Grain Generator',
    tagline: 'Add controllable film grain and texture to a photo directly in your browser.',
    labels: { amount: 'Grain amount', scale: 'Grain size', seed: 'Pattern' },
    about: 'Film grain adds controlled texture to digital images so clean gradients and photographs feel less clinical. Upload a photo, tune the amount and grain size, shuffle the pattern, then download the result. The processing is local in your browser, so the image stays on your device and can be sent into the Editor for a larger design.',
    faqs: [
      { q: 'How much grain should I add?', a: 'Start low and judge at the final viewing size. Small amounts break up overly clean digital surfaces; heavier grain works as a deliberate poster or editorial treatment.' },
      { q: 'What does grain size change?', a: 'Small grain reads as fine photographic texture. Larger grain becomes more graphic and obvious, especially in flat colours and smooth gradients.' },
      { q: 'Can I keep the grain editable?', a: 'Yes. Send the result to the Editor as a live filter layer so you can change the grain while you continue building the artwork.' },
    ],
  },
  'pixel-sort': {
    slug: 'pixel-sort', effect: 'pixelSort', name: 'Pixel Sort Generator',
    tagline: 'Create stretched pixel-sorting streaks from any image directly in your browser.',
    labels: { threshold: 'Brightness threshold', seed: 'Pattern' },
    about: 'Pixel sorting rearranges runs of pixels selected by brightness, producing long digital streaks without painting them by hand. Upload an image, choose the brightness threshold and shuffle the pattern until the streaks land where you want them. It runs locally on your device, and you can continue in the Editor with the effect kept inside a layered design.',
    faqs: [
      { q: 'What does brightness threshold do?', a: 'It controls which parts of the image are eligible for sorting. A lower threshold usually creates longer and more widespread streaks; a higher value keeps more of the original image intact.' },
      { q: 'Why does shuffling change the result?', a: 'The pattern value changes how eligible pixel runs are distributed, giving you another composition without changing your threshold.' },
      { q: 'Can I add type after pixel sorting?', a: 'Yes. Send the image to the Editor, then place typography, shapes, masks and other effects above the live pixel-sort layer.' },
    ],
  },
}
