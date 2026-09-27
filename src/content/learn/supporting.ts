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
]
