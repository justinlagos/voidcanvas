import type { Article } from '../types'

// Tier 2 supporting pages: each answers one search inside a cluster and links up to its cornerstone. Short, answer-first,
// one demo where it teaches something. Product details checked against src/lib/effects.ts, src/tools/defs.ts,
// src/editor/export.ts and the guides they link to.

export const articles: Article[] = [
  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'make-a-duotone-image',
    title: 'How to make a duotone image',
    seoTitle: 'How to make a duotone image (and pick the two colours)',
    summary: 'A duotone maps a photo\'s brightness onto two colours. How to choose a pair that keeps the photo readable, how it is made in any editor, and the one-click route with a live example.',
    description: 'Make a duotone image: map shadows to one colour and highlights to another, choose a dark and a light colour that keep the photo readable, and apply it in one click with a live example.',
    category: 'effects',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Effects · Duotone',
    goals: ['design-effects', 'build-a-brand'],
    answers: ['how to make a duotone', 'duotone effect online', 'duotone image', 'how to make a duotone photo', 'two colour photo effect', 'spotify duotone effect', 'duotone without photoshop', 'brand colour photo effect'],
    related: ['colour-effects', 'make-a-risograph-effect', 'colour-that-works', 'brand-kit'],
    keywords: 'duotone two colour tone gradient map shadow highlight brand colours photo treatment spotify look tint monochrome',
    guide: {
      before: ['effects-overview'],
      next: ['make-a-risograph-effect', 'colour-effects'],
      also: [{ when: 'you want dots as well as two colours', slug: 'make-a-halftone-portrait' }, { when: 'you are choosing brand colours', slug: 'colour-that-works' }],
    },
    body: [
      { t: 'answer', text: 'A duotone replaces a photo\'s greys with a blend between two colours: the darkest areas take the **shadow colour**, the brightest take the **highlight colour**, and everything between is a mix. Pick one dark, rich colour and one light, pale one; two colours of similar lightness flatten the photo. In Voidcanvas it is one effect with two colour pickers, below. For a set of photos that need to match, or a photo that has to sit on brand colours, it is the fastest treatment there is.' },
      { t: 'demo', kind: 'effect', effect: 'duotone', caption: 'Shadows and highlights are the two colours. Swap them and the photo inverts its mood; bring them close together in lightness and it goes flat.' },

      { t: 'h', text: 'Choosing the two colours' },
      { t: 'list', items: [
        '**One dark, one light.** The photo\'s detail lives in the difference between the two. A navy and a pale yellow keep every fold and shadow; a red and an orange lose them.',
        '**Take them from the brand.** The primary as the shadow and a tint of the background as the highlight puts any photo on brand without recolouring it by hand. Load them from your [brand kit](/learn/brand-kit) so they are exact.',
        '**Cool shadow, warm highlight** reads as printed and calm. **Warm shadow, cool highlight** reads as electric. The classic streaming-app look is a deep colour under a bright, saturated highlight.',
        '**Paper, not white.** For a print feel, set the highlight to an off-white or cream rather than pure white.',
      ] },

      { t: 'h', text: 'How it works in any editor' },
      { t: 'p', text: 'Every duotone is the same two steps: convert the photo to greyscale, then map that grey ramp onto a gradient from the shadow colour to the highlight colour. In some tools the second step is called a gradient map; in others it is a duotone adjustment. Do it non-destructively (as an adjustment or a filter layer) so you can change the colours later, and do it after any contrast fix, because a duotone can only redistribute the tones the photo already has.' },

      { t: 'h', text: 'How to do it in Voidcanvas' },
      { t: 'steps', items: [
        'Open [Effects](/effects), drop in the photo, choose **Color**, then **Duotone**.',
        'Under **Parameters**, set **Shadow Color** and **Highlight Color**. The starting pair is black and white, which is plain greyscale; pick your own two to see the effect.',
        'Press **Download** for a PNG, JPG or WebP, or **Open in Editor** to carry on with the duotone as a live filter layer.',
        'In the Editor, the same effect is **Filter, Colour, Duotone**: a filter layer with the two colours in **Filter settings**, which you can fade with the layer\'s opacity or paint out of a face with the Eraser.',
      ] },
      { t: 'product', text: 'Duotone in Voidcanvas is two colour pickers on a live layer. It runs in the browser, the photo stays on your device, and the brand kit puts the exact brand colours one click away.', label: 'Open Effects', href: '/effects?effect=duotone' },

      { t: 'h', text: 'Common mistakes' },
      { t: 'list', items: [
        '**Flat result.** The two colours are too close in lightness. Darken one or lighten the other.',
        '**Muddy midtones.** The photo had little contrast to begin with. Add a Curves adjustment below the duotone first.',
        '**Skin looks ill.** Green or cyan shadows on a face rarely work. Keep the shadow colour warm or neutral for portraits.',
      ] },
      { t: 'faq', items: [
        { q: 'What is the difference between a duotone and a gradient map?', a: 'A duotone is a gradient map with two stops. A gradient map can have more colours along the ramp, which gives a tritone or a full false-colour treatment.' },
        { q: 'Can I make a duotone with brand colours?', a: 'Yes, and it is the best use of one. Use the brand\'s primary as the shadow colour and a pale tint of the background or a neutral as the highlight, so the photo keeps its detail.' },
      ] },
      { t: 'try', label: 'Open Effects', href: '/effects?effect=duotone' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'dither-effect-explained',
    title: 'Dithering explained: threshold, patterns and when to use it',
    seoTitle: 'Dithering explained: threshold, patterns, when to use it',
    summary: 'What dithering does to a photo, why the threshold matters more than it looks, why the effect must be made at final size, how to colour it afterwards, and the one-click tool with a live example.',
    description: 'Dithering turns grey tones into patterns of black and white pixels. What the threshold does, why to make it at final size, how to colour it, and the free browser tool with a live example.',
    category: 'effects',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Dither tool · Effects',
    goals: ['design-effects'],
    answers: ['dither effect', 'dithering effect online', 'what is dithering', 'dither image', 'floyd steinberg dither', 'retro pixel photo effect', '1 bit image effect', 'game boy photo effect', 'dither generator'],
    related: ['quick-tools', 'make-a-halftone-portrait', 'artistic-effects', 'stylise-effects'],
    keywords: 'dither dithering floyd steinberg error diffusion threshold 1 bit black and white retro game boy pixel zine one colour print pattern',
    guide: {
      before: ['make-a-halftone-portrait'],
      next: ['quick-tools', 'glitch-effect-explained'],
      also: [{ when: 'you want dots on a grid instead', slug: 'make-a-halftone-portrait' }, { when: 'you want blocky pixels rather than a pattern', slug: 'stylise-effects' }],
    },
    body: [
      { t: 'answer', text: 'Dithering turns every pixel pure black or pure white and spreads the rounding error to its neighbours, so grey becomes a pattern of scattered dots that the eye averages back into tone. It is how early computers and game consoles showed photos, and it reads as retro, printed and deliberate. One control matters: the **threshold**, which decides where grey tips into black. Make it at the final pixel size, export PNG, and colour it afterwards with a blend mode. Try it below.' },
      { t: 'demo', kind: 'effect', effect: 'dither', caption: 'Floyd-Steinberg dithering, pixel by pixel. Move the threshold and watch the balance between black and white shift across the whole image.' },

      { t: 'h', text: 'What the threshold does' },
      { t: 'p', text: 'Every pixel is compared with the threshold: brighter goes white, darker goes black, and the difference between the real value and the choice is pushed onto the pixels to the right and below (that is the Floyd-Steinberg part). A **low threshold** keeps more of the image bright, so only true shadows fill with black; a **high threshold** pushes midtones dark and the image becomes mostly pattern. Portraits usually sit a little below the middle; graphic, high-contrast subjects can go higher.' },

      { t: 'h', text: 'Make it at final size' },
      { t: 'p', text: 'Because the pattern is one pixel fine, it belongs to a particular pixel size. Scale a dithered image up and the pixels become soft blocks; scale it down and the pattern collapses into grey mush or moiré. Decide where the image will be seen, make the dither at that exact pixel size, and export as PNG, which keeps every pixel. JPG compression smears the pattern.' },
      { t: 'note', text: 'The Dither tool previews at up to 1200 px on the long edge and renders the download from your original file. Dithering works pixel by pixel, so the full-size download of a large photo has a finer pattern than the preview. If you want the coarse look at full size, reduce the image first, or use the Pixelate effect before the dither.' },

      { t: 'h', text: 'Colour it afterwards' },
      { t: 'p', text: 'The result is black and white. In the Editor, a colour layer above it set to **Screen** colours the black pixels; set to **Multiply** it colours the white ones. A dark green dither on a pale green field is the handheld-console look; black on cream is the zine look. [Blend modes and opacity](/learn/blend-modes-and-opacity) explains the two.' },

      { t: 'h', text: 'How to do it in Voidcanvas' },
      { t: 'steps', items: [
        'Open the [Dither tool](/tools/dither) and drop in a photo, or use the sample that is already loaded.',
        'Move **Threshold** under **Adjust** until the balance is right.',
        'Press **Download PNG** for the full-size file, or **Send to Layer Stack** to open the Editor with the dither as a live filter layer you can colour, mask and combine.',
        'In the Editor and in Effects the same effect is **Dither** under **Artistic**.',
      ] },
      { t: 'product', text: 'The Dither tool, Effects and the Editor share one implementation. Everything runs in your browser and the photo never leaves your device.', label: 'Open the Dither tool', href: '/tools/dither' },

      { t: 'h', text: 'Common mistakes' },
      { t: 'list', items: [
        '**Grey soup.** Low-contrast photo. Fix the contrast first, then dither.',
        '**Blurry pattern.** Exported as JPG, or scaled after the fact. PNG, at final size.',
        '**Too fine to notice.** A 4000 px photo dithered at full size looks like a photo. Reduce it to the display size first.',
      ] },
      { t: 'faq', items: [
        { q: 'Dithering or halftone?', a: 'Halftone puts dots of varying size on a regular grid and reads as print. Dithering scatters single pixels and reads as an early screen. Halftone survives scaling better; dithering is sharper at small sizes.' },
        { q: 'Can I dither in colour?', a: 'The effect itself is black and white. Colour it afterwards with a blend mode, or tint the photo with Duotone first and set the dither layer to Multiply.' },
      ] },
      { t: 'try', label: 'Open the Dither tool', href: '/tools/dither' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'glitch-effect-explained',
    title: 'The glitch effect: slices, offset and RGB shift explained',
    seoTitle: 'Glitch effect explained: slices, offset, RGB shift',
    summary: 'What a glitch effect actually does to an image, what the three controls change, the companion effects that complete the look, where it works and where it ruins the picture, and the one-click tool with a live example.',
    description: 'Glitch effect explained: horizontal slices shifted sideways, the offset, slice height and randomise controls, RGB shift and scanlines to finish it, and the free browser tool with a live example.',
    category: 'effects',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Glitch tool · Effects',
    goals: ['design-effects', 'social-content'],
    answers: ['glitch effect online', 'how to make a glitch effect', 'glitch image generator', 'glitch photo effect free', 'datamosh effect', 'rgb shift effect', 'vhs effect online', 'glitch text effect'],
    related: ['quick-tools', 'distortion-effects', 'texture-effects', 'dither-effect-explained'],
    keywords: 'glitch slices offset slice height randomize rgb shift chromatic scanlines crt vhs datamosh corrupted thumbnail music artwork',
    guide: {
      before: ['effects-overview'],
      next: ['distortion-effects', 'quick-tools'],
      also: [{ when: 'you want the old-screen texture too', slug: 'texture-effects' }, { when: 'it is for a YouTube thumbnail', slug: 'size-presets' }],
    },
    body: [
      { t: 'answer', text: 'A glitch effect cuts the image into horizontal strips and slides some of them sideways, the way a corrupted video frame tears. Three controls: **Offset** is how far the strips move, **Slice height** is how tall they are, and **Randomize** picks which strips move. About three strips in ten shift; the rest stay put, which is what keeps the picture readable. Add an **RGB shift** for the colour fringe and **scanlines** or **CRT** for the screen, and stop before the face disappears. Try it below, then the same tool with a download.' },
      { t: 'demo', kind: 'effect', effect: 'glitch', caption: 'Thin slices with a small offset read as signal noise; tall slices with a large offset read as broken blocks. Randomize changes which strips move.' },

      { t: 'h', text: 'What each control does' },
      { t: 'table', head: ['Control', 'Range', 'What changes'], rows: [
        ['Offset', '10 to 100', 'How far the shifted strips move. Low values give a subtle tear at the edges; high values throw strips across the frame.'],
        ['Slice height', '5 to 100', 'How tall each strip is. Thin strips look like interference; tall strips look like a frozen frame.'],
        ['Randomize', '0 to 1000', 'Which strips move and by how much. Scrub it until the tears land somewhere that helps the picture, usually away from the eyes.'],
      ] },

      { t: 'h', text: 'Finish the look' },
      { t: 'list', items: [
        '**RGB Shift** separates the red, green and blue channels by a few pixels, the colour fringe every real glitch has. Keep it small; it doubles the edges of everything.',
        '**Scanlines** or **CRT** put the image on an old screen. One or the other, not both.',
        '**Pixel Sort** smears bright or dark runs into streaks, the heavier datamosh look.',
        '**Noise** at low opacity ties the layers together.',
      ] },
      { t: 'p', text: 'Each of these is a live filter layer in the Editor, so the order and the opacity stay adjustable. [Distortion effects](/learn/distortion-effects) has every setting.' },

      { t: 'h', text: 'Where it works, and where it does not' },
      { t: 'p', text: 'Glitch reads best on faces, on type and on clean product shots, because the eye needs something intact to measure the damage against. It works for music artwork, event posters, gaming and tech thumbnails. It ruins small text, busy photos and anything that has to be read in a hurry. On a thumbnail, glitch the background or one edge of the face and leave the words alone.' },

      { t: 'h', text: 'How to do it in Voidcanvas' },
      { t: 'steps', items: [
        'Open the [Glitch tool](/tools/glitch) and drop in a photo.',
        'Set **Offset** and **Slice height** under **Adjust**. Press **Shuffle** for a new arrangement of slices, or scrub **Randomize**.',
        'Press **Download PNG**, or **Send to Layer Stack** to open the Editor with the glitch as a live filter layer.',
        'In the Editor, add **Filter, Distort, RGB Shift** and **Filter, Enhance, Scanlines** above it, and paint the glitch out of the eyes with the Eraser on the filter layer.',
      ] },
      { t: 'product', text: 'The Glitch tool, Effects and the Editor share one implementation, and the companions (RGB Shift, Scanlines, CRT, Pixel Sort) are filter layers you can stack, fade and mask. In the browser, on your device.', label: 'Open the Glitch tool', href: '/tools/glitch' },

      { t: 'h', text: 'Common mistakes' },
      { t: 'list', items: [
        '**Everything glitched.** Nothing left to compare against. Lower the offset or mask the effect off the subject.',
        '**Unreadable text.** Glitch the image, not the words, or offset a duplicate of the text by a few pixels in one colour instead.',
        '**Every companion at once.** RGB shift, scanlines, CRT, noise and pixel sort together is a texture, not a glitch. Two is plenty.',
      ] },
      { t: 'faq', items: [
        { q: 'Can I get a different glitch each time?', a: 'Yes. Press Shuffle on the Glitch tool, or scrub the Randomize slider. Filters with a random element also get a fresh pattern each time you add one in the Editor.' },
        { q: 'How do I make glitch text?', a: 'Set the text, duplicate the layer twice, colour the copies cyan and red, set them to Screen and offset each by a few pixels. Then put a Glitch filter layer above with a small offset and mask it off most of the letters.' },
      ] },
      { t: 'try', label: 'Open the Glitch tool', href: '/tools/glitch' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'what-is-a-print-ready-pdf',
    title: 'What a print-ready PDF is, and what yours needs',
    seoTitle: 'What is a print-ready PDF? What the printer checks',
    summary: 'The printer asked for a print-ready PDF. What the term means, the six things a printer checks, what it means when your tool makes an image-based PDF, how to check your own file before you send it, and the note to send with it.',
    description: 'A print-ready PDF has the right page size with bleed, 300 dpi images, embedded or rasterised type, a known colour mode, marks if asked, and one file per piece. How to check yours and what to tell the printer.',
    category: 'craft',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Editor · PDF export, Studio · Print PDF',
    goals: ['prepare-for-print'],
    answers: ['what is a print ready pdf', 'print ready pdf meaning', 'what does a print ready pdf look like', 'how to make a print ready pdf', 'print ready pdf with bleed and crop marks', 'how to check if a pdf is print ready', 'press ready pdf'],
    related: ['export-for-print', 'designing-for-print', 'prepare-a-poster-for-print', 'how-much-bleed'],
    keywords: 'print ready pdf press ready pdf/x trimbox bleedbox crop marks embedded fonts rasterised image based 300 dpi rgb cmyk check page size document properties printer note',
    guide: {
      before: ['designing-for-print'],
      next: ['export-for-print', 'how-much-bleed'],
      also: [{ when: 'it is a poster', slug: 'prepare-a-poster-for-print' }, { when: 'it is a client delivery', slug: 'delivering-files' }],
    },
    body: [
      { t: 'answer', text: 'A print-ready PDF is a file the printer can send to the press without opening it to fix anything: the **page size equals the trim size plus bleed**, images are at **300 dpi at final size**, type is **embedded or rendered to pixels** so it cannot reflow, the **colour mode is known** (CMYK, or RGB with the printer converting), **crop marks** are present if the printer asked for them, and there is **one file per piece**. If your tool exports an image-based PDF, as Voidcanvas does, the type is already rendered and the questions left are size, resolution, bleed and colour. Check those four and write them in the email.' },

      { t: 'h', text: 'What the printer checks' },
      { t: 'table', head: ['Check', 'Pass', 'Fail'], rows: [
        ['Page size', 'Trim plus bleed, in mm or inches, so it matches the job', 'A4 sent for an A5 job; a page with no bleed on a full-bleed design'],
        ['Resolution', 'Photos at 300 dpi at final size (150 for large posters)', 'A 1080 px social image on an A4 page'],
        ['Type', 'Fonts embedded, outlined, or the whole page rendered as an image', 'Fonts referenced but missing, so the press substitutes'],
        ['Colour', 'CMYK, or RGB with a note asking the printer to convert', 'Spot colours nobody asked for; a mix of profiles'],
        ['Marks', 'Crop marks outside the bleed if requested; none if not', 'Marks drawn inside the artwork'],
        ['Structure', 'One PDF per piece, pages in order, no hidden layers or comments', 'A single PDF holding three different flyers'],
      ] },

      { t: 'h', text: 'Image-based PDFs are print-ready too' },
      { t: 'p', text: 'Professional layout tools write PDFs with live type and vector shapes. Browser design tools, Voidcanvas included, usually write the page as one high-quality image at 300 dpi. That is fine for flyers, posters and cards, as long as the page is sized correctly and the image is at 300 dpi: the type is crisp at that resolution and cannot reflow, which removes the font problem entirely. What you lose is selectable text and the very sharpest hairlines. Tell the printer it is image-based so nobody looks for fonts to embed.' },

      { t: 'h', text: 'Check your own file in two minutes' },
      { t: 'steps', items: [
        'Open the PDF in any viewer and look at the document properties. The page size should be the trim size plus bleed: 216 × 303 mm for an A4 with 3 mm bleed, 154 × 216 mm for an A5.',
        'Zoom to 400 per cent on the smallest text. It should be crisp. If it is soft, the page was rendered below 300 dpi or the design was scaled up.',
        'Look at the edges. Background colour and photos should run to the very edge of the page (into the bleed). White strips at the edge mean no bleed.',
        'Count the pages. One piece, one file, in order.',
        'Note the colour mode you exported and whether marks are on. That goes in the email.',
      ] },

      { t: 'h', text: 'The note to send with it' },
      { t: 'p', text: 'One line saves a phone call: "A5 flyer, 154 × 216 mm page including 3 mm bleed, image-based PDF at 300 dpi, RGB, no crop marks, 170 gsm silk, 500 copies. Please convert to your profile and send a PDF proof." Change the numbers, keep the shape.' },

      { t: 'h', text: 'How to do it in Voidcanvas' },
      { t: 'list', items: [
        '**Editor:** design at a print preset or a 300 dpi custom size, add bleed with **Image, Canvas size…** (Relative, 72 px each way), export with {{Ctrl+E}} as **PDF**. Designs over 2000 px on their longest side are sized at 300 dpi. The PDF is one page, image-based, RGB, with no marks. Details in [Export for print](/learn/export-for-print).',
        '**Studio:** add a print format on the **Brief** tab, build it, and on **Deliver** tick **Print PDF**. The package PDF is at trim size with 3 mm bleed, crop marks outside the bleed, TrimBox and BleedBox set, and a slug line stating the size, bleed, version and that the file is RGB. Details in [Deliver every format](/learn/delivering-files).',
      ] },
      { t: 'product', text: 'Voidcanvas writes image-based PDFs at 300 dpi for print sizes, and Studio adds the bleed, crop marks and boxes a printer\'s software reads. Both say RGB on the file, so the printer knows to convert.', label: 'Export a PDF from the Editor', href: '/editor?preset=a5' },

      { t: 'faq', items: [
        { q: 'Does a print-ready PDF have to be CMYK?', a: 'No. Most digital printers accept RGB and convert with their own press profile, which is usually better than a generic conversion on your side. Say RGB in the note and ask for a proof if colour matters. Some litho and packaging printers do require CMYK; ask first.' },
        { q: 'What is PDF/X?', a: 'A family of PDF standards for print (PDF/X-1a, PDF/X-4) that lock down fonts, colour and boxes. Printers like them because nothing is ambiguous. An image-based PDF at the right size behaves like one in practice: nothing can reflow and the boxes can be set.' },
        { q: 'Does the printer add the bleed?', a: 'Only if you ask and they agree, and only for flat colour. Anything with a photo or a pattern at the edge needs the bleed in your file.' },
      ] },
      { t: 'try', label: 'Open Studio', href: '/studio' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'how-much-bleed',
    title: 'How much bleed a print job needs',
    seoTitle: 'How much bleed do I need? 3 mm, and the pixel maths',
    summary: 'The bleed most printers ask for, when you need it at all, how many pixels it is at 300 and 150 dpi, the safe area that goes with it, and how to add it to a design that was built without one.',
    description: 'Most printers want 3 mm (0.125 in) of bleed on every side, which is 36 px at 300 dpi. When you need it, the safe area that goes with it, and how to add it to an existing design.',
    category: 'craft',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Editor · Canvas size',
    goals: ['prepare-for-print'],
    answers: ['how much bleed do i need', 'how much bleed for printing', 'what is bleed in printing', 'bleed size mm', '3mm bleed in pixels', 'bleed printing example', 'printing bleed vs no bleed', 'do i need bleed', 'bleed for business cards'],
    related: ['designing-for-print', 'export-for-print', 'prepare-a-poster-for-print', 'what-is-a-print-ready-pdf'],
    keywords: 'bleed 3mm 0.125 inch pixels 300 dpi 36 px safe area trim crop guillotine drift canvas size relative full bleed business card flyer poster large format 5mm',
    guide: {
      before: ['designing-for-print'],
      next: ['export-for-print', 'what-is-a-print-ready-pdf'],
      also: [{ when: 'it is a poster', slug: 'prepare-a-poster-for-print' }, { when: 'you want to see what a missing bleed looks like', slug: 'printed-design-looks-blurry' }],
    },
    body: [
      { t: 'answer', text: '**3 mm on every side** in the UK and Europe, **0.125 in** (about 3.2 mm) in the US, and 5 mm or more for large-format work if the printer asks. You only need bleed when something touches the edge of the page: a background colour, a photo, a stripe. At 300 dpi, 3 mm is **36 px** per side, so an A5 flyer at 1748 × 2480 becomes 1820 × 2552. Keep text and logos 5 mm inside the trim as well, because the cut that needs bleed on one side can take a bite out of the other.' },

      { t: 'h', text: 'Why it exists' },
      { t: 'p', text: 'Printers print on larger sheets and cut them down with a guillotine that drifts by up to a millimetre. If your artwork stops exactly at the trim line, a drift outwards leaves a hairline of white paper along the edge. Bleed is artwork that continues past the trim so the drift lands on colour. The same drift going inwards is why the **safe area** exists: anything within about 5 mm of the trim can be clipped.' },

      { t: 'h', text: 'How much, by job' },
      { t: 'table', head: ['Job', 'Bleed', 'Safe area', 'Notes'], rows: [
        ['Business card', '3 mm', '3 to 5 mm', 'Small cards are cut in stacks; keep text well in.'],
        ['Flyer, leaflet, postcard', '3 mm', '5 mm', 'The standard case.'],
        ['Poster to A2', '3 mm', '10 mm', 'A wide margin looks better on a poster anyway.'],
        ['Large format, banners, boards', '5 to 10 mm, or what the printer says', '20 mm or more', 'Ask. Some want no bleed and trim to the artwork.'],
        ['Booklets and folded pieces', '3 mm on outer edges', '5 mm, plus the fold', 'Nothing important across a fold.'],
      ] },

      { t: 'h', text: 'The pixel maths' },
      { t: 'p', text: 'Bleed in pixels = bleed in mm ÷ 25.4 × dpi, rounded up so the bleed is never short. 3 mm at 300 dpi is 35.4, so use 36 px. At 150 dpi it is 18 px. The calculator does it for any size and any bleed.' },
      { t: 'demo', kind: 'size-calculator', caption: 'Trim size, bleed and dpi in; the document size to set up, the trim in pixels and the safe area out.' },

      { t: 'h', text: 'Add bleed to a design built without it' },
      { t: 'p', text: 'Do not scale the finished design up: that moves the safe area and softens the photos. Grow the canvas instead, then extend whatever touches the edge.' },
      { t: 'steps', items: [
        'In the Editor choose **Image, Canvas size…**, tick **Relative**, enter 72 in **Add to width** and 72 in **Add to height** (36 px each side at 300 dpi), leave the anchor in the centre and **Apply**. Nothing is scaled.',
        'Add guides 36 px in from each edge with **View, New guide…** so you can see the trim, and another 59 px further in for the safe area.',
        'Stretch or move the background colour and any edge photo so it reaches the new outer edge. Check nothing important slid past the inner guides.',
        'Export the PDF with {{Ctrl+E}} and tell the printer: "3 mm bleed included, no crop marks."',
      ] },
      { t: 'note', text: 'In Studio, print formats on a job get the bleed added for you at delivery: 3 mm made by extending the edge pixels, plus crop marks and TrimBox and BleedBox. That is clean for flat colour; for a photo that runs off the edge, build the extra 3 mm into the design as above.' },
      { t: 'product', text: 'Canvas size with Relative ticked adds bleed without scaling anything, the size calculator gives the numbers for any paper size, and Studio adds bleed and marks to its print PDFs automatically.', label: 'Open the Editor', href: '/editor?preset=a5' },

      { t: 'faq', items: [
        { q: 'Do I need bleed if nothing touches the edge?', a: 'No. A design with a white margin all round can be supplied at trim size. Keep the safe area anyway, because the cut can still drift inwards.' },
        { q: 'Is bleed the same as a margin?', a: 'No. Bleed is extra artwork outside the trim that gets cut off. A margin is empty space inside the trim that stays. The safe area is the part of the margin nothing important should cross.' },
        { q: 'How many pixels is 3 mm of bleed?', a: '36 px at 300 dpi (35.4 rounded up), 18 px at 150 dpi, 9 px at 72 dpi. Add it to both sides, so 72 px to the width and 72 px to the height at 300 dpi.' },
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor?preset=a5' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'print-looks-different-from-screen',
    title: 'Why a print looks different from the screen',
    seoTitle: 'Why a print looks different from the screen (and what to do)',
    summary: 'Colours duller, everything darker, the layout not quite where the preview put it. The four reasons a print never matches a monitor, which of them you can plan for, and how to get close on the first run.',
    description: 'Prints look duller and darker than the screen because ink cannot make light, paper absorbs, monitors are too bright and previews are scaled. What to change in the file and what to ask the printer.',
    category: 'craft',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Editor · Adjustment layers, Print PDF',
    goals: ['prepare-for-print'],
    answers: ['why does my print look different than on screen', 'print preview looks different than document', 'why does my printed document look different than print preview', 'colours print duller than screen', 'why is my print darker than my screen', 'print colours do not match monitor', 'how to make print match screen'],
    related: ['colour-that-works', 'designing-for-print', 'prepare-a-poster-for-print', 'printed-design-looks-blurry'],
    keywords: 'print different screen monitor duller darker cmyk gamut paper uncoated coated brightness proof soft proof calibrate expectations rich black',
    guide: {
      before: ['designing-for-print'],
      next: ['colour-that-works', 'prepare-a-poster-for-print'],
      also: [{ when: 'it is soft as well as dull', slug: 'printed-design-looks-blurry' }, { when: 'you want a PDF the printer accepts first time', slug: 'what-is-a-print-ready-pdf' }],
    },
    body: [
      { t: 'answer', text: 'A print never matches a screen exactly, for four reasons you can plan for. **Ink cannot make light**: a monitor shows colour with light and can reach bright blues, greens, oranges and pinks that no press can print, so those come back duller. **Paper absorbs**: uncoated stock soaks up ink and everything prints darker and softer than coated stock. **Monitors are too bright**: most are set far brighter than paper under room light, so a print looks dark by comparison. **Previews are scaled**: a whole page at 30 per cent hides what 100 per cent shows. Plan for all four: avoid building the design on a neon, lift the shadows a little for uncoated paper, check at 100 per cent, and ask for a proof.' },
      { t: 'p', text: 'Flip the colour setting below to see the direction of the change. It is a simulation of a generic conversion, not your printer\'s profile, but the colours that lose the most are the same ones that lose on any press.' },
      { t: 'demo', kind: 'print-setup', caption: 'Bright blue, green and pink lose the most in the CMYK preview. The reds and the neutrals hold. That is why brand systems built on a neon are trouble in print.' },

      { t: 'h', text: 'Reason 1: ink cannot make light' },
      { t: 'p', text: 'A screen mixes red, green and blue light and can produce a range of colours (a gamut) that is wider than what cyan, magenta, yellow and black ink can reflect off paper. The overlap is most of the palette; the difference is the brightest, most saturated colours. When the file is converted, those get pulled to the nearest printable colour, which is duller. Nothing in the file is wrong; the press cannot do it.' },
      { t: 'list', items: [
        'Avoid making a bright, saturated colour the foundation of a print design. Use it small, as an accent, where a shift will not be noticed.',
        'Expect blue-violets, bright greens, oranges and hot pinks to shift most. Reds, yellows, browns and neutrals shift least.',
        'Black text should be black ink only. A generic conversion can turn pure RGB black into a mix of all four inks, which looks fuzzy on small type. Ask the printer to keep text as 100 per cent black.',
        'Large black areas print better as a rich black (black plus some cyan and magenta). Ask; do not guess.',
      ] },

      { t: 'h', text: 'Reason 2: paper absorbs' },
      { t: 'p', text: 'On coated paper (gloss, silk, matt) the ink sits on the surface and stays crisp and saturated. On uncoated paper it soaks in: dots spread, dark areas fill in, everything is softer and darker with a warmer feel. Both are fine; they are different products. For uncoated stock, lift the shadows a little (a gentle Curves adjustment) and avoid fine light type on dark backgrounds. If the printer offers a paper sample, hold it next to your screen.' },

      { t: 'h', text: 'Reason 3: the monitor is too bright' },
      { t: 'p', text: 'A typical monitor at default brightness is two to three times brighter than a sheet of paper under office light. Everything on it looks luminous, so the print looks dark and flat by comparison even when the colours are right. You cannot fix that in the file; you can stop being surprised by it. Turn the monitor down when you judge a print job, look at it in the light the print will be seen in, and trust the proof over the screen.' },

      { t: 'h', text: 'Reason 4: the preview was scaled' },
      { t: 'p', text: 'Print preview shows the whole page, so it is drawn at a third or a quarter of its size. Fine detail, hairlines, small type and soft photos look better shrunk than they are. Zoom to 100 per cent ({{Ctrl+1}} in the Editor; Cmd+1 on a Mac) and look at the smallest text and the busiest photo before you export. What you see at 100 per cent is close to what 300 dpi ink will show. If something moved between the preview and the print, the page size was wrong and the printer scaled the file; [What a print-ready PDF is](/learn/what-is-a-print-ready-pdf) covers that check.' },

      { t: 'h', text: 'What to do before the first run' },
      { t: 'checklist', items: [
        'The design does not depend on a neon or a bright blue-violet for its main surfaces.',
        'Black text is pure black; large black areas discussed with the printer.',
        'Shadows lifted a little if the stock is uncoated.',
        'Checked at 100 per cent, not in the scaled preview.',
        'Paper chosen with a sample in hand, or the printer\'s recommendation.',
        'A proof requested: a PDF proof for layout, a printed proof on the real stock for anything colour-critical.',
      ] },

      { t: 'h', text: 'How Voidcanvas handles this' },
      { t: 'p', text: 'Voidcanvas exports RGB and says so on every print file, so the printer knows to convert with the profile for their press and paper, which gives a better result than a generic conversion in the design tool. There is no CMYK export and no soft-proofing. What you do have: **Curves** and **Levels** as adjustment layers to lift shadows for uncoated stock without touching the photo, **Ctrl+1** for the 100 per cent check, and print presets at 300 dpi so the page size is right. The brand guideline builder keeps colours in OKLCH ramps, which makes it easy to pick a printable step of a bright brand colour instead of the neon itself.' },
      { t: 'product', text: 'Every print export states that it is RGB, the adjustment layers let you prepare a photo for a given paper without damaging it, and the 100 per cent view shows what the preview hides. Ask the printer for a proof; that part no tool replaces.', label: 'Open the Editor', href: '/editor?preset=a4' },

      { t: 'faq', items: [
        { q: 'Can I make the print match my screen?', a: 'Not exactly, and neither can a professional studio without a calibrated monitor, a soft-proofing profile and a printed proof. You can get close: avoid out-of-gamut colours, judge the design at a sane brightness, check at 100 per cent and correct after a proof.' },
        { q: 'Why did my colours come back so dull?', a: 'The design used bright, saturated colours that ink cannot reproduce, so the conversion pulled them to the nearest printable colour. Choose a slightly deeper, less saturated version of the colour as the base and keep the bright one for small accents.' },
        { q: 'Should I convert to CMYK myself?', a: 'Only if the printer asks for it. A printer converting with their own profile usually does better than a generic conversion, and Voidcanvas exports RGB only. Say RGB in the note and ask for a proof.' },
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'design-brief-example',
    title: 'A design brief that starts the job (example and template)',
    seoTitle: 'Design brief example and template for designers and clients',
    summary: 'What a design brief has to contain before a designer can start, a real example the way a client actually writes one, a template that gets the same information in five minutes, and how a tool can read it into a checklist.',
    description: 'A design brief example and a five-minute template: the headline, the facts, the formats and dates, the must-haves and the brand assets. Plus what to do when the client sends three WhatsApp messages instead.',
    category: 'studio',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Studio · Brief reader',
    goals: ['client-project'],
    answers: ['design brief example', 'what is a design brief', 'how to write a design brief', 'design brief template', 'what should a design brief include', 'graphic design brief example for a client', 'creative brief template', 'design brief for a poster', 'what to ask a client before designing'],
    related: ['start-a-job-from-a-brief', 'run-a-client-design-project', 'studio-overview', 'directions-and-review'],
    keywords: 'design brief example template creative brief client questions headline deliverables formats deadline must include brand assets tone audience',
    guide: {
      before: ['run-a-client-design-project'],
      next: ['start-a-job-from-a-brief', 'directions-and-review'],
      also: [{ when: 'the job is a whole brand', slug: 'building-a-brand-identity' }],
    },
    body: [
      { t: 'answer', text: 'A design brief has done its job when a designer can start without asking a question. That takes six things: **what it is for** (the event, product or message, in one line), **the words that must appear** (headline, date, time, venue, price, contacts), **what is owed** (every format with its size and its date), **must-haves** (logos, sponsors, hashtags, legal lines), **the brand assets** (logo files, fonts, colours, any guideline), and **tone and audience** in a few words. Below is a real-shaped example, the template that gets those six in five minutes, and what a good brief looks like when it arrives as three messages.' },

      { t: 'h', text: 'An example, the way clients write them' },
      { t: 'quote', text: 'Hi! We need a flyer and some socials for our harvest thanksgiving at Grace Chapel, Sunday 12 October, service at 10am then lunch. Theme is "Rooted in Gratitude". Free entry, everyone welcome. Need an A4 flyer for the notice board, an Instagram post and a story. Must include the church logo and the food bank partner logo, and the hashtag #RootedInGratitude. Warm and welcoming, not too churchy. Deadline for socials is next Friday, flyer can be the week after. Logo attached.', by: 'A brief that works, in 90 words' },
      { t: 'p', text: 'It reads like a message because it is one, and it is still complete: the headline (the event), the subheading (the theme), the date, the time, the venue, the price, the must-haves, the formats with their dates, the tone, and the assets. A designer can start. The template below produces the same thing on purpose rather than by luck.' },

      { t: 'h', text: 'The five-minute template' },
      { t: 'p', text: 'Send this to the client, or fill it in on a call. Labels matter: a line that starts with **Headline:** is never misread.' },
      { t: 'table', head: ['Line', 'Example', 'Why it is there'], rows: [
        ['Headline:', 'Harvest Thanksgiving', 'The one thing the piece says. Also the working name of the job.'],
        ['Subheading or theme:', 'Rooted in Gratitude', 'The second line, if there is one.'],
        ['Date: / Time: / Venue:', 'Sun 12 Oct / 10am, lunch after / Grace Chapel, Mill Lane', 'The facts that get reprinted when wrong. Labelled, so nothing is guessed.'],
        ['Price:', 'Free', 'Or the amount and currency. "Free" is information.'],
        ['Contact:', '@gracechapel, gracechapel.org', 'Up to two: a handle, a web address, a phone number, an email.'],
        ['Must include:', 'church logo, food bank logo, #RootedInGratitude', 'Logos, sponsors, partners, hashtags, disclaimers, a lineup. Comma separated.'],
        ['Formats:', 'A4 flyer (by 24 Oct), Instagram post and story (by 17 Oct)', 'Every deliverable, its size or platform, and its own date.'],
        ['Tone:', 'warm, welcoming, not too formal', 'Three words is plenty. They steer type and colour.'],
        ['Audience:', 'the congregation and the neighbours', 'Who is reading it, in a phrase.'],
        ['Assets:', 'logo attached as SVG; fonts and colours as in last year\'s flyer', 'What exists. Ask for vector logos and real font files.'],
        ['References:', 'link or attachment', 'Anything they like, and one thing they do not.'],
      ] },
      { t: 'tip', text: 'Ask for the logo as an SVG or a large PNG with a transparent background, and for fonts as files or names. A logo screenshot from a website is the most common reason a job stalls on day one.' },

      { t: 'h', text: 'When the brief is three messages and a voice note' },
      { t: 'p', text: 'Most briefs arrive in pieces. Do not tidy them into a document for the client; that is your time spent on their job. Paste the pieces together in the order they arrived, pull the two lists out (what must appear, what is owed), and send those back as the brief: "Here is what I read. Anything missing?" Their yes is the sign-off. Keep the original text underneath, because when a detail is disputed later the original settles it.' },

      { t: 'h', text: 'How to do it in Voidcanvas' },
      { t: 'steps', items: [
        'In Studio press **Start a job** and paste the client\'s words as they sent them into **The brief**. Do not tidy first; the reader expects real messages.',
        'Under **Read from the brief**, check what Studio found: the headline, subheading, date, time, venue, price, contact and must-haves, plus the tone words and who it is for. This list goes to the Editor as a checklist that ticks itself off as the words land on the design.',
        'If the reader guessed wrong, add a labelled line to the brief (**Headline: Harvest Thanksgiving**). Labels always win.',
        'Under **Formats**, press the buttons for the formats the brief mentions, or **Add all**, then set a due date per format. Print formats carry their size in mm so delivery can add bleed and crop marks.',
        'Choose the client\'s brand under **Which brand is this for?** so the Editor checks colours, fonts and logo rules against it.',
      ] },
      { t: 'product', text: 'Studio reads a pasted brief into the checklist, the format list and the starting palette and type for the key visual. Nothing is uploaded; the reader runs on your device and gives the same result for the same text every time.', label: 'Start a job in Studio', href: '/studio' },

      { t: 'faq', items: [
        { q: 'What is the difference between a design brief and a creative brief?', a: 'In practice, size. A creative brief for a campaign adds objectives, positioning, audience research and messaging hierarchy. A design brief for a piece needs the six things above. Most small-business jobs need the second and are slowed down by templates for the first.' },
        { q: 'Should the client write the brief or the designer?', a: 'The client supplies the facts and the intent; the designer shapes them into the two lists and sends them back for a yes. Whoever writes it, the designer owns checking it.' },
        { q: 'How long should a design brief be?', a: 'As long as the six things take. The example above is 90 words and complete. A brief that runs to pages usually hides the deliverables and the dates somewhere in the middle.' },
      ] },
      { t: 'try', label: 'Open Studio', href: '/studio' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'get-client-feedback-you-can-act-on',
    title: 'Get client feedback you can act on',
    seoTitle: 'How to get design feedback from clients you can act on',
    summary: '"Make it pop" is not feedback. How to ask so the answer is usable, how to record it so it does not come back, how to turn a message into a checklist, and how to run rounds that end.',
    description: 'Get usable design feedback from clients: ask against the brief, one voice, comments pinned to the place, replies turned into a numbered checklist, versions with a status, and rounds that end.',
    category: 'studio',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Studio · Review',
    goals: ['client-project'],
    answers: ['how to get client feedback on design', 'client feedback examples design', 'how to handle vague client feedback', 'make it pop feedback', 'design review round process', 'how to present revisions to a client', 'client feedback graphic design', 'design feedback questions to ask'],
    related: ['directions-and-review', 'review-and-delivery-links', 'run-a-client-design-project', 'delivering-files'],
    keywords: 'client feedback design review rounds revisions pins checklist approve changes asked version status vague feedback make it pop questions',
    guide: {
      before: ['run-a-client-design-project'],
      next: ['directions-and-review', 'review-and-delivery-links'],
      also: [{ when: 'you are showing first ideas rather than a version', slug: 'directions-and-review' }, { when: 'the round is approved and it is time to deliver', slug: 'delivering-files' }],
    },
    body: [
      { t: 'answer', text: 'Usable feedback is specific, located and written down. Get it by **asking against the brief** ("does this say Harvest Thanksgiving to a neighbour?") rather than "what do you think?", by having **one person** collect the team\'s comments, by **pinning every comment to the place** on the design it refers to, and by **turning the reply into a numbered checklist** before you change anything. Give every version a number and a status, and send the next one with "changes in v3: 1, 2, 3". Two rounds of changes are in the price; say so before round one.' },

      { t: 'h', text: 'Ask questions that have answers' },
      { t: 'p', text: '"What do you think?" invites taste. Questions tied to the brief invite decisions. Send the version with two or three of these, and no more:' },
      { t: 'list', items: [
        '"Is every fact right: date, time, venue, price, spelling of names?" (The question that saves reprints.)',
        '"Does the headline say the one thing you wanted said?"',
        '"Would your audience recognise this as yours next to your last piece?"',
        '"Is there anything you would remove?" (Better than "add", because it makes designs better.)',
        '"Which of these two is closer?" when you are unsure yourself. Offer two concrete moves and let them pick.',
      ] },

      { t: 'h', text: 'Translate the vague ones' },
      { t: 'table', head: ['They say', 'They usually mean', 'Ask or offer'], rows: [
        ['Make it pop', 'More contrast, or a bigger focal point', '"Bigger headline, or a stronger colour behind it? Here are both."'],
        ['It feels busy', 'Too many elements at the same weight', 'Remove one thing and show it. Ask what they missed.'],
        ['Can you make the logo bigger', 'The logo is not visible enough where it is', 'Move it to a quieter corner or add space around it first; size second.'],
        ['I do not like the font', 'The tone is wrong, or it is hard to read at that size', 'Ask which: "too formal, too playful, or hard to read?"'],
        ['Something is off', 'Alignment or spacing', 'Check the grid and the margins before asking anything.'],
        ['Can we see more options', 'They have not decided what the piece is for', 'Go back to the brief, not forward to variations.'],
      ] },

      { t: 'h', text: 'One voice, one place' },
      { t: 'p', text: 'Five people replying separately produce contradictions you will be blamed for resolving. Ask the client to name one person who collects the team\'s comments and sends them together. Then put every comment where it belongs: pinned to the spot on the design, numbered, with the version it refers to. Feedback in a voice note or a phone call gets written down by you and sent back in one message: "As discussed: 1, 2, 3. Shout if I misheard."' },

      { t: 'h', text: 'Turn the reply into a checklist' },
      { t: 'p', text: 'Before you open the file, split the reply into single changes, one per line, numbered. Anything that is not a change (a compliment, a question, a maybe) goes at the bottom as a note. Do the numbered items, tick them, and send the next version with the same numbers: "v3: 1 done, 2 done, 3 we tried and it hid the date, so we did this instead." The client sees their words became work, and nobody re-argues round two in round three.' },

      { t: 'h', text: 'Rounds that end' },
      { t: 'list', items: [
        'Put the number of rounds in the quote: two rounds of changes after v1 is the usual freelance shape.',
        'Give every version a status: Draft, Sent, Changes asked, Approved. Approval is a written status, not a feeling in a meeting.',
        'Changes to an approved version start a new version and, if they are more than a typo, a new round.',
        'Show the work in context (a poster on a wall, a post on a phone). Decisions come faster and calmer than from a flat rectangle on white.',
      ] },

      { t: 'h', text: 'How to do it in Voidcanvas' },
      { t: 'steps', items: [
        'On the job\'s **Review** tab, save a version with **New version from the design** (v1, v2, v3…). Write **What changed in** the version; the client sees it at the top of the review.',
        'In **Feedback** mode, click the image where the client pointed to drop a numbered pin and type what they said. **Done** turns a pin green when it is fixed.',
        'Paste the client\'s email or WhatsApp message into **Client\'s reply** and press **Turn into a checklist**. Studio splits it into one to-do per line, bullet or sentence and sets the version to **Changes asked**. Tick each to-do as you make the change.',
        'Send the round three ways: **Send a review link** (the client pins comments, replies and approves in their browser with no account; you need one, and everything is encrypted with a key that lives in the link), a **Review pack PDF** with one page per format and the pins numbered, or **WhatsApp images** with a footer naming the client, job, format, version and date.',
        'Set the version to **Approved** when they approve, and **Compare** any two versions with a slider when someone asks what changed. **Mockups** puts the current image on a wall, a phone or a tote before you send.',
      ] },
      { t: 'product', text: 'Studio keeps every version, every pin and every reply with the job, turns a pasted message into a checklist, and lets the client comment and approve from a link. Details in Present directions and run review rounds.', label: 'Open Studio', href: '/studio' },

      { t: 'faq', items: [
        { q: 'How many rounds of revisions should I offer?', a: 'Two rounds of changes after the first version is the usual freelance quote. Write it down before round one. Changes after approval are a new round or a new job.' },
        { q: 'What do I do with feedback from five different people?', a: 'Ask the client to name one person who collects and sends it together, and reply only to that person. Until then, put every comment on the version as a numbered pin so the contradictions are visible to everyone.' },
        { q: 'How do I say no to a change?', a: 'Try it, show it, and say what it cost: "We tried the bigger logo; it covered the date, so we gave it space instead. Both attached." A client who sees the trade-off usually chooses the better one.' },
      ] },
      { t: 'try', label: 'Open Studio', href: '/studio' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'social-media-sizes-and-safe-zones',
    title: 'Social media sizes and safe zones',
    seoTitle: 'Social media sizes and safe zones (2026), with a live view',
    summary: 'The pixel sizes for posts, stories, reels, thumbnails and banners, and the parts of each the platform covers with its own interface. With a live view of every format and the text sizes that survive a phone screen.',
    description: 'Social media sizes in pixels and the safe zones the interface leaves: Instagram post 1080 × 1350, story and reel 1080 × 1920, YouTube thumbnail 1280 × 720, LinkedIn banner 1584 × 396. Live view of each.',
    category: 'craft',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Editor · Presets and guides',
    goals: ['social-content', 'many-formats'],
    answers: ['social media sizes', 'social media sizes and safe zones', 'social media sizes chart 2026', 'instagram story safe zone', 'reel safe zone', 'social media image sizes in pixels', 'youtube thumbnail safe area', 'linkedin banner safe area', 'what size should a social media post be'],
    related: ['designing-for-social', 'size-presets', 'resize-to-every-format', 'workflow-social-campaign'],
    keywords: 'social media sizes safe zones instagram post story reel youtube thumbnail linkedin banner x header pixels 1080 1350 1920 interface overlay caption buttons profile photo',
    guide: {
      before: ['designing-for-social'],
      next: ['resize-to-every-format', 'size-presets'],
      also: [{ when: 'you want one design in every size', slug: 'resize-to-every-format' }, { when: 'you are setting up a series', slug: 'workflow-social-campaign' }],
    },
    body: [
      { t: 'answer', text: 'Sizes: **Instagram post 1080 × 1350** (4:5), **square 1080 × 1080**, **story and reel 1080 × 1920** (9:16), **YouTube thumbnail 1280 × 720**, **LinkedIn banner 1584 × 396**, **X header 1500 × 500**. Safe zones: stories lose roughly the **top and bottom 250 px** to the interface; reels lose more of the bottom (about 420 px) and a **column on the right** to the buttons; thumbnails lose the **bottom-right corner** to the duration; banners lose the **lower left** to the profile photo. Pick a format below to see what is covered and what is left.' },
      { t: 'demo', kind: 'safe-zones', caption: 'Hatched areas are what the platform draws over your image. The dashed rectangle is where text and logos are safe. Sizes are approximate and change; check before a paid placement.' },

      { t: 'h', text: 'The sizes' },
      { t: 'table', head: ['Format', 'Pixels', 'Ratio', 'Where it is covered'], rows: [
        ['Instagram post', '1080 × 1350', '4:5', 'Nothing over it. The profile grid shows a 1:1 crop from the centre.'],
        ['Square post', '1080 × 1080', '1:1', 'Nothing. Works on every platform; smaller in the feed than 4:5.'],
        ['Story', '1080 × 1920', '9:16', 'Top and bottom, about 250 px each: progress bar and name above, reply box below.'],
        ['Reel cover', '1080 × 1920', '9:16', 'Bottom about 420 px (account, caption, audio) and a column about 120 px wide on the right (like, comment, share).'],
        ['YouTube thumbnail', '1280 × 720', '16:9', 'The duration badge, bottom right. Seen at 200 to 400 px wide.'],
        ['LinkedIn banner', '1584 × 396', '4:1', 'Profile photo over the lower left; the top and bottom cropped differently by screen.'],
        ['X header', '1500 × 500', '3:1', 'Profile photo over the lower left; cropped on some screens.'],
      ] },
      { t: 'p', text: 'Studio adds X post (1600 × 900), Facebook cover (1640 × 624), WhatsApp flyer (1080 × 1350) and Email header (1200 × 600) as job formats. The full list with uses is in [Size presets](/learn/size-presets).' },

      { t: 'h', text: 'Text that survives a phone' },
      { t: 'p', text: 'A 1080 px wide post is shown about 360 to 430 layout pixels wide on a phone, so everything appears at roughly a third of its canvas size. Text at 36 px on the canvas reads at about 13 px on the phone: caption size. On a 1080 px wide canvas, keep headlines at 80 to 120 px or more, supporting lines at 48 px, and small print at 36 to 40 px. Seven words of headline. Contrast well above 4.5:1, because phones are used outdoors at low brightness. [Design social posts that read on a phone](/learn/designing-for-social) has the reasoning.' },

      { t: 'h', text: 'Make the safe zone once' },
      { t: 'steps', items: [
        'Open the [Story preset](/editor?preset=story) (1080 × 1920).',
        'Choose **View, New guide…** and add horizontal guides at 250 and 1670 px. For a reel cover add one at 1500 px and a vertical guide at 960 px.',
        'Choose **File, Save as template**. Every new story starts from it with the zones marked, and snapping keeps text inside them.',
        'Design the most constrained format first (usually the 4:5 post), then **File, Resize for other formats…** or Studio\'s key visual to build the rest, and move anything that landed in a covered area.',
      ] },
      { t: 'product', text: 'The Editor has presets for every size above, guides that snap, templates that keep the safe zones, and Resize to every format to derive the other sizes from one master.', label: 'Start a social post', href: '/editor?preset=ig-post' },

      { t: 'faq', items: [
        { q: 'What is the Instagram story safe zone?', a: 'Keep text and logos out of roughly the top and bottom 14 per cent of the 1080 × 1920 canvas, about 250 px each, where the progress bar, name and reply box sit. The middle 1420 px is safe.' },
        { q: 'Are these sizes still current?', a: 'The canvas sizes have been stable for years; what changes is how much interface each app draws over them. Treat the safe zones as approximate and check the platform\'s own guidance before a paid placement.' },
        { q: 'Should I export at 2× for social?', a: 'No. The presets are already at platform size; export at 1× as PNG for graphics and text or JPG for photo-led posts. Platforms recompress uploads either way.' },
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor?preset=story' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'coming-from-photoshop',
    title: 'Coming from Photoshop: what carries over, what is different',
    seoTitle: 'Coming from Photoshop: what carries over in a browser editor',
    summary: 'A migration guide for people who know Photoshop and are trying a browser editor. The habits that work unchanged, the ones with a new name, the things that are not there, and the three shortcuts the browser forces you to relearn.',
    description: 'Switching from Photoshop: layers, masks, adjustment layers, selections, free transform, tool keys and PSD import carry over. No CMYK, no smart objects, no PSD save. The shortcuts that differ and why.',
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Editor',
    goals: ['leave-photoshop'],
    answers: ['photoshop alternative browser', 'switching from photoshop', 'free photoshop alternative no subscription', 'photoshop alternative no download', 'online photoshop alternative', 'photoshop replacement for designers', 'is there a free photoshop', 'photoshop without subscription'],
    related: ['editor-tour', 'edit-a-psd-without-photoshop', 'keyboard-shortcuts', 'file-formats'],
    keywords: 'photoshop alternative migration switch browser editor layers masks adjustment layers smart objects cmyk actions shortcuts ctrl n ctrl w psd import free no subscription',
    guide: {
      before: ['edit-a-psd-without-photoshop'],
      next: ['editor-tour', 'keyboard-shortcuts'],
      also: [{ when: 'you want to know what is sent anywhere', slug: 'privacy-and-data' }, { when: 'you work on a phone or tablet too', slug: 'designing-on-a-phone' }],
    },
    body: [
      { t: 'answer', text: 'Most of Photoshop carries over: **layers, groups, masks, clipping masks, adjustment layers, selections with feather and select-and-mask, free transform, layer styles, the single-letter tool keys and the Ctrl shortcuts**, plus opening PSDs with their layers. Three things are different by design: it runs in a browser tab with your files on your device rather than in a cloud library, it exports **RGB only**, and it **does not write PSD**. Three things are not there: **smart objects**, **actions**, and **third-party plugins**. And three shortcuts change because the browser owns them: New is **Ctrl+Alt+N**, Close is **Ctrl+Alt+W**, Export is **Ctrl+E**.' },

      { t: 'h', text: 'What works the way you expect' },
      { t: 'table', head: ['Photoshop habit', 'In the Editor', 'Notes'], rows: [
        ['Layers panel, groups, opacity, blend modes', 'The same', 'Colour labels, lock, hide, rename, merge and stamp visible ({{Ctrl+Alt+Shift+E}}) all present. See [Layers](/learn/layers).'],
        ['Layer mask, Alt-click to view, Shift-click to disable', 'The same', 'Layer, Layer mask, Add mask. Vector masks and quick mask ({{Q}}) too. See [Masks](/learn/masks).'],
        ['Clipping mask', '{{Ctrl+Alt+G}}', 'Press again to release.'],
        ['Adjustment layers', 'Curves, Levels, Hue/Saturation, Colour balance, Black and white and the rest, as layers', 'From the Layers panel button or Image, Adjustments. See [Adjustment layers](/learn/adjustment-layers).'],
        ['Selections, feather, Select subject, Select and mask', 'The same, {{Ctrl+Alt+R}} for Select and mask', 'Marquee, lasso, polygonal lasso, magic wand, object select. See [Selections](/learn/selections).'],
        ['Free transform', '{{Ctrl+T}}', 'Skew, distort, perspective and warp in the Edit menu.'],
        ['Layer styles', 'Drop shadow, inner shadow, glows, stroke, colour and gradient overlay, bevel', 'See [Layer styles](/learn/layer-styles).'],
        ['Tool keys', 'The same letters: V M L W C I J B S E G O P A T U H Z', 'Shift plus the key cycles the family, as in Photoshop.'],
        ['Type with Character and Paragraph panels', 'The same', 'Google fonts, local fonts and font files. Text on a path. See [Type](/learn/type).'],
        ['Filters', 'Filter gallery, applied as editable filter layers', 'Fade, mask and stack them. See [Filters in the Editor](/learn/filters-in-the-editor).'],
        ['Artboards', 'Boards', 'See [Boards](/learn/artboards).'],
        ['History panel and before/after', 'History panel; hold {{\\}} for the before view', 'See [History and undo](/learn/history-and-undo).'],
        ['Open a PSD', 'File, Open ({{Ctrl+O}})', 'Layers, groups, masks, text, adjustments and styles come through, with a report of anything changed. See [Edit a PSD without Photoshop](/learn/edit-a-psd-without-photoshop).'],
      ] },

      { t: 'h', text: 'What is different by design' },
      { t: 'list', items: [
        '**Where the files are.** Designs are saved in the browser on this device ({{Ctrl+S}}), or to a .void file on disk ({{Ctrl+Shift+S}}). There is no cloud library and no account needed. Back up by exporting or saving to disk. See [Saving and your files](/learn/saving-and-your-files).',
        '**RGB only.** Every export is RGB. Printers convert with their own profile; the print files say RGB on them. See [Designing for print](/learn/designing-for-print).',
        '**PSD in, not out.** PSDs open with their layers; the Editor does not write PSD. Deliver PNG, JPG, WebP or PDF, and keep a .void file for the layers.',
        '**Image-based PDF.** The PDF export renders the page at 300 dpi as an image. Fine for flyers and posters; not selectable text.',
        '**Imports are capped at 4096 px** on the longest side, to keep the browser responsive. Enough for A4 at 300 dpi and A3 at about 248 dpi.',
      ] },

      { t: 'h', text: 'What is not there' },
      { t: 'list', items: [
        '**Smart objects.** Layers are pixels, text, shapes, adjustments or filters. A smart object in a PSD arrives as pixels.',
        '**Actions and scripting.** Repeatable work is done with templates, the brand kit, and Resize to every format instead.',
        '**Third-party plugins and Camera Raw.** Adjustment layers and the 58 effects are what there is.',
        '**Colour management and soft proofing.** Ask the printer for a proof.',
      ] },

      { t: 'h', text: 'The shortcuts that change, and why' },
      { t: 'keys', rows: [
        ['Ctrl+Alt+N', 'New design. The browser keeps Ctrl+N for a new window'],
        ['Ctrl+Alt+W', 'Close the design. The browser keeps Ctrl+W for the tab'],
        ['Ctrl+E', 'Export as (PNG, JPG, WebP, PDF). Photoshop\'s Ctrl+Alt+Shift+S is not needed'],
        ['Ctrl+Alt+I and Ctrl+Alt+C', 'Image size and Canvas size, as in Photoshop'],
        ['Ctrl+K', 'Search every action by name. Faster than remembering where a command lives'],
        ['?', 'The shortcut sheet, with a search box'],
      ] },
      { t: 'p', text: 'Everything else is on [Every keyboard shortcut in Voidcanvas](/learn/keyboard-shortcuts). Mac users press Cmd wherever this says Ctrl.' },

      { t: 'h', text: 'First hour: a suggested order' },
      { t: 'steps', items: [
        'Open one of your own PSDs with {{Ctrl+O}} and read the **Opened** report. That tells you, for your files, what carried over.',
        'Take the [Editor tour](/learn/editor-tour) to see where the panels are. The layout follows Photoshop on purpose.',
        'Press {{Ctrl+K}} and type the name of any command you cannot find. If it exists, it is there.',
        'Do a job you know: a mask, a curves fix, a type layer with a stroke, an export. Then the [Coming from Photoshop route](/learn/do/leave-photoshop) covers the rest in order.',
      ] },
      { t: 'product', text: 'The Editor is a layered image editor in the browser with Photoshop\'s vocabulary and tool keys, PSD import with an honest report, and your files on your device. Free, no account, and it installs as an app that works offline.', label: 'Open the Editor', href: '/editor' },

      { t: 'faq', items: [
        { q: 'Is it a free Photoshop alternative?', a: 'For layered image editing, retouching, type, effects and print and screen export, yes, in the browser with no account. It is not a replacement for CMYK prepress, smart objects, actions or Camera Raw.' },
        { q: 'Can I keep using my PSD files?', a: 'You can open them, with layers, masks, text, adjustments and styles carried over as far as the format allows and a report of anything changed. You cannot save back to PSD; keep a .void file for the layers and deliver PNG, JPG, WebP or PDF.' },
        { q: 'Do my shortcuts still work?', a: 'The tool keys and most Ctrl shortcuts are the same. New, Close and Export differ because the browser owns Ctrl+N and Ctrl+W; they are Ctrl+Alt+N, Ctrl+Alt+W and Ctrl+E.' },
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'brand-colour-palette-that-passes-contrast',
    title: 'Build a brand colour palette that passes contrast',
    seoTitle: 'Brand colour palette that passes contrast (WCAG), step by step',
    summary: 'A palette is not five colours you like; it is a system of ramps where text is readable on every surface. The WCAG numbers, how to build ramps that stay even, where brand colours fail and how to fix them, and the builder that checks every pairing.',
    description: 'Build a brand colour palette that passes WCAG contrast: 4.5:1 for text, 3:1 for large text and graphics, ramps in OKLCH so steps stay even, and a checked pairing list. The builder does the checks.',
    category: 'studio',
    level: 'Intermediate',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Studio · Brand guideline builder, Colour tab',
    goals: ['build-a-brand'],
    answers: ['brand colour palette generator', 'brand color palette', 'how to choose brand colours', 'accessible brand colours', 'wcag contrast brand colours', 'colour palette for a brand', 'brand colours contrast ratio', 'how many colours should a brand have', 'colour ramp tints and shades'],
    related: ['colour-that-works', 'brand-guidelines', 'keep-a-brand-consistent', 'building-a-brand-identity'],
    keywords: 'brand colour palette contrast wcag 4.5 3 to 1 aa aaa ramps tints shades oklch harmony complementary accent secondary neutral warmth checks tokens',
    guide: {
      before: ['colour-that-works'],
      next: ['brand-guidelines', 'keep-a-brand-consistent'],
      also: [{ when: 'the palette is going to print', slug: 'print-looks-different-from-screen' }, { when: 'you want the colours in every design', slug: 'brand-kit' }],
    },
    body: [
      { t: 'answer', text: 'A brand palette that works is a **brand colour**, a **secondary** and an **accent** chosen for a job each, a **neutral** family for text and surfaces, and a **ramp of tints and shades** for every one of them, with a short list of **approved pairings** that pass contrast: **4.5:1** for body text, **3:1** for large text, icons and the brand colour used as a graphic. Most brand colours fail as text on white at full strength; the fix is to use a darker step of the same ramp for text and keep the bright step for surfaces and accents. The builder below generates the ramps and checks every pairing for you.' },

      { t: 'h', text: 'The numbers' },
      { t: 'table', head: ['Pairing', 'Minimum ratio', 'Grade'], rows: [
        ['Body text on a surface', '4.5:1', 'AA. 7:1 is AAA.'],
        ['Large text (about 24 px regular, 19 px bold) on a surface', '3:1', 'AA large.'],
        ['Icons, borders that carry meaning, the brand colour used as a graphic', '3:1', 'WCAG minimum for graphics.'],
        ['Button label on the accent', '4.5:1', 'The pairing that most often fails.'],
        ['Logo edge on its background', '3:1', 'Otherwise use the reversed or dark mono logo.'],
      ] },
      { t: 'p', text: 'Contrast is measured between the text colour and the colour directly behind it, not between two brand colours in the abstract. A palette passes when every pairing you will actually use passes, which is why the output of this work is a list of pairings, not a row of swatches.' },

      { t: 'h', text: 'Why ramps, and why OKLCH' },
      { t: 'p', text: 'A single brand colour cannot do every job: the bright blue that looks right as a button background is unreadable as text on white, and too dark to put black text on. A ramp of ten steps from a near-white tint (50) to a near-black shade (900) gives you a version for each job that still reads as the same colour. Build the ramp in OKLCH rather than HSL: in OKLCH equal steps look equally different, so step 500 of a yellow and step 500 of a blue are equally light, and tints stay clean instead of going grey or neon. Then the same rule works across the palette: text on step 50 uses step 700 or darker; text on step 700 uses step 50.' },

      { t: 'h', text: 'Where brand colours fail' },
      { t: 'list', items: [
        '**Brand colour as body text on white.** Most mid-saturation brands sit at 3:1 to 4:1. Use step 700 of the ramp for text and keep the true brand colour for surfaces, buttons and large headings.',
        '**White text on the accent.** Yellows, oranges and light greens cannot carry white text. Use dark text on them, or darken the accent one step.',
        '**Two accents.** If both are bright and both are rare, neither is the accent. One.',
        '**Neutrals that fight the brand.** Pure greys next to a warm brand colour look dirty. Add a little of the brand hue to the neutral family (neutral warmth) so surfaces and text belong to the same palette.',
        '**Print.** The brightest step of a ramp is the one the press cannot reach. Choose a printable step for print surfaces; see [Why a print looks different from the screen](/learn/print-looks-different-from-screen).',
      ] },

      { t: 'h', text: 'How to do it in Voidcanvas' },
      { t: 'steps', items: [
        'Open Studio and choose **Brand guideline builder**. On the **Identity** tab enter the name and drop in the logo; if the logo has a clear colour it becomes the brand colour.',
        'On the **Colour** tab, set the **Brand colour** (hex or picker) and a **Harmony**: Analogous, Complementary, Triadic or Split complement. The **Secondary** and **Accent** are built from it and darkened or lightened until white or dark text reads on them. Set either by hand to lock it.',
        'Set **Neutral warmth** to decide how much of the brand hue shows in the greys.',
        'Read the ramps: every colour gets ten steps from 50 to 900, built in OKLCH, plus success, warning and error colours.',
        'Open the **Contrast** list: each recommended pairing (body text on the light surface, button labels on the accent, secondary text and so on) with its ratio and grade, AAA, AA, AA large or Fail. The button at the top right reads **All N checks pass** or **N issues**; it also checks that body text is at least 16 px and that the accent reads as distinct from the brand colour.',
        'Fix a failure by locking a different step or colour, or press **New take** to regenerate everything you have not locked.',
        'On the **Export** tab, export the guideline (PDF, HTML), the tokens (CSS, Tailwind, JSON), the .ase swatches, and press **Save as a client brand in Studio** so every job and the Editor\'s brand kit use the same values.',
      ] },
      { t: 'product', text: 'The builder turns one brand colour into a full system of ramps in OKLCH, checks every pairing against WCAG, flags the logo on each background, and exports the result for people and for code. All on your device.', label: 'Open the brand guideline builder', href: '/studio' },

      { t: 'faq', items: [
        { q: 'How many colours should a brand have?', a: 'One brand colour, one secondary, one accent and a neutral family, each with a ramp of tints and shades. That is four families and forty-odd usable steps, which is plenty. More than that and nobody can keep them consistent.' },
        { q: 'What contrast ratio do brand colours need?', a: '4.5:1 for body text on a surface, 3:1 for large text and for the brand colour used as a graphic or an icon, and 3:1 between the logo\'s edge and whatever it sits on. Measure the pairings you will use, not the swatches in the abstract.' },
        { q: 'My brand colour fails as text. Do I have to change the brand?', a: 'No. Keep the brand colour for surfaces, buttons and large headings, and use a darker step of the same ramp for text. It still reads as the brand and it passes.' },
      ] },
      { t: 'try', label: 'Open Studio', href: '/studio' },
    ],
  },
]
