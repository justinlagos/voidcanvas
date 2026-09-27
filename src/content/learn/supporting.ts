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
      also: [{ when: 'you want pixel sorting instead', slug: 'pixel-sorting-explained' }, { when: 'you want the old-screen texture too', slug: 'make-a-crt-effect' }, { when: 'it is for a YouTube thumbnail', slug: 'youtube-thumbnail-size' }],
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
      next: ['print-handover-checklist', 'how-much-bleed'],
      also: [{ when: 'it is a poster', slug: 'prepare-a-poster-for-print' }, { when: 'the design was made in a browser tool', slug: 'print-a-design-from-a-browser-tool' }],
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
      { t: 'p', text: 'Voidcanvas exports RGB only. Studio\'s print PDFs say so in the slug line under the artwork; the Editor\'s PDF does not, so write it in your note to the printer. The printer then converts with the profile for their press and paper, which gives a better result than a generic conversion in the design tool. There is no CMYK export and no soft-proofing. What you do have: **Curves** and **Levels** as adjustment layers to lift shadows for uncoated stock without touching the photo, **Ctrl+1** for the 100 per cent check, and print presets at 300 dpi so the page size is right. The brand guideline builder keeps colours in OKLCH ramps, which makes it easy to pick a printable step of a bright brand colour instead of the neon itself.' },
      { t: 'product', text: 'Studio\'s print PDFs state that they are RGB, the adjustment layers let you prepare a photo for a given paper without damaging it, and the 100 per cent view shows what the preview hides. Ask the printer for a proof; that part no tool replaces.', label: 'Open the Editor', href: '/editor?preset=a4' },

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
        ['Type with Character and Paragraph panels', 'The same', 'Any Google Font by name, or a font file from your computer (.ttf, .otf, .woff, .woff2). Fonts installed on the computer are not listed; add the file. Text on a path. See [Type](/learn/type).'],
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

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'what-dpi-should-a-poster-be',
    title: 'What dpi a poster should be, by size and viewing distance',
    seoTitle: 'What dpi should a poster be? By size and viewing distance',
    summary: 'Not always 300. The right number depends on how far away people stand, and a big poster at 300 dpi is a file nobody needs. The table for every common size at 150 and 300 dpi, the limits that matter, and a calculator.',
    description: 'A poster read at arm\'s length needs 300 dpi; one read from a metre or two is fine at 150; banners and billboards need less. The pixel sizes for A3 to A0 and 18 × 24 in at both, with a calculator.',
    category: 'craft',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Editor · Print presets',
    goals: ['prepare-for-print', 'make-a-poster'],
    answers: ['what dpi should a poster be', 'poster dpi', 'what resolution for a poster', 'a3 poster size in pixels', 'a2 poster size in pixels', 'a1 poster size in pixels', 'a0 in pixels 300 dpi', 'poster sizes in pixels', 'is 150 dpi ok for a poster', 'is 72 dpi ok for printing'],
    related: ['image-resolution-explained', 'prepare-a-poster-for-print', 'printed-design-looks-blurry', 'size-presets'],
    keywords: 'poster dpi ppi resolution a3 a2 a1 a0 pixels 150 300 viewing distance banner billboard 4096 cap export limit',
    guide: {
      before: ['image-resolution-explained'],
      next: ['prepare-a-poster-for-print', 'how-much-bleed'],
      also: [{ when: 'the last print came back soft', slug: 'printed-design-looks-blurry' }, { when: 'you need every other size too', slug: 'size-presets' }],
    },
    body: [
      { t: 'answer', text: 'Match the dpi to the viewing distance. **300 dpi** for anything read at arm\'s length (flyers, A4 and A3 posters on a notice board). **150 dpi** for posters read from a metre or two (A2, A1, A0 on a wall, 18 × 24 in and larger). **100 dpi or less** for banners and billboards, and ask the printer. The number is pixels divided by inches, so an A2 poster at 150 dpi is 2480 × 3508 px, which is the same file as an A4 at 300. Above about A2, 300 dpi makes a very large file that adds nothing you can see from where people stand.' },
      { t: 'demo', kind: 'size-calculator', caption: 'Type the poster size in mm or inches, pick the dpi, and read the pixel size. The presets open the Editor at that size.' },

      { t: 'h', text: 'The table' },
      { t: 'table', head: ['Size', 'mm', 'At 150 dpi', 'At 300 dpi', 'Read from'], rows: [
        ['A4', '210 × 297', '1240 × 1754', '2480 × 3508', 'Arm\'s length: use 300'],
        ['A3', '297 × 420', '1754 × 2480', '3508 × 4961', 'Close: use 300'],
        ['A2', '420 × 594', '2480 × 3508', '4961 × 7016', 'A metre or so: 150 to 300'],
        ['A1', '594 × 841', '3508 × 4967', '7016 × 9933', 'Across a room: 150'],
        ['A0', '841 × 1189', '4967 × 7022', '9933 × 14043', 'Across a room: 150 or less'],
        ['18 × 24 in', '457 × 610', '2700 × 3600', '5400 × 7200', 'A metre or so: either'],
        ['24 × 36 in', '610 × 914', '3600 × 5400', '7200 × 10800', 'Across a room: 150'],
      ] },
      { t: 'p', text: 'The formula: pixels = inches × dpi, and inches = mm ÷ 25.4. So A3 at 300 dpi is 297 ÷ 25.4 × 300 = 3508 px wide. Round up, never down.' },

      { t: 'h', text: 'Why distance decides' },
      { t: 'p', text: 'The eye resolves about one minute of arc. At 30 cm that is roughly 300 dots per inch, which is why 300 became the print standard: at reading distance you cannot see the dots. At a metre you resolve about a third of that, so 150 dpi looks as sharp from a metre as 300 does from 30 cm. At three metres, 100 dpi is plenty. A billboard is often printed at 10 to 20 dpi and looks fine from the road. Printing a wall poster at 300 dpi is not wrong; it is a file four times bigger than it needs to be, which is slower to export, slower to upload, and more likely to hit a limit somewhere.' },
      { t: 'note', text: 'The dpi that matters is the photo\'s dpi at final size, not the document\'s. A 1200 px wide photo stretched across an A2 poster is 72 dpi however the document is set up. [Why your printed design looks blurry](/learn/printed-design-looks-blurry) has the one-minute check.' },

      { t: 'h', text: 'Limits worth knowing' },
      { t: 'list', items: [
        '**Imported photos are capped at 4096 px** on the long side in the Editor. That is A3 at about 248 dpi, A2 at 175, A1 at 124, all measured on the long side, all fine from their viewing distance. It also means a photo cannot make an A0 poster sharp close up, whatever you do.',
        '**Exports are capped at about 67 million pixels.** A1 at 300 dpi is just over that and A0 at 300 is double it; the Editor scales such an export down to fit. Both sizes are right at 150 dpi anyway.',
        '**Text and shapes are vector** and are drawn sharp at whatever size you export. Only photos and painted layers have a dpi.',
        '**Very large canvases are slow.** Above 8000 px on a side the browser warns you. Work at 150 dpi for big posters and everything is quicker.',
      ] },

      { t: 'h', text: 'How Voidcanvas handles this' },
      { t: 'p', text: 'The Editor\'s print presets are A4 and A5 at 300 dpi and Poster 18 × 24 in at 300 dpi (5400 × 7200). For any other size, use the calculator above and enter the pixel size as a custom canvas on the start screen. Any design over 2000 px on its long side exports as a PDF at 300 dpi; a poster made at 150 dpi therefore comes out at half the physical size on the PDF page, so tell the printer the intended size, or export a PNG and state the size in millimetres. Studio\'s poster format is 2700 × 3600, which is 18 × 24 in at 150 dpi, and its delivery PDF carries the size in mm with bleed and crop marks.' },
      { t: 'product', text: 'Print presets at 300 dpi, a custom size for everything else, the Image size dialog showing the print size at any dpi, and the 4096 px import cap stated rather than hidden.', label: 'Start a poster', href: '/editor?preset=poster' },

      { t: 'faq', items: [
        { q: 'Is 150 dpi good enough for a poster?', a: 'Yes for anything read from a metre or more: A2 and larger, 18 × 24 in and larger. Use 300 for A3 and smaller, which people read up close.' },
        { q: 'Is 72 dpi OK for printing?', a: 'Only for very large formats seen from far away (banners, billboards). For a poster it prints soft. Check the photo\'s pixel size, not the number in the file: a 3000 px wide file labelled 72 dpi is the same image as one labelled 300.' },
        { q: 'What size is an A3 poster in pixels?', a: '3508 × 4961 px at 300 dpi, 1754 × 2480 at 150 dpi.' },
        { q: 'Should I add bleed to those numbers?', a: 'If the printer asks for it, yes: 3 mm on each side is 36 px at 300 dpi and 18 px at 150 dpi. See How much bleed a print job needs.' },
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor?preset=poster' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'rgb-or-cmyk-for-print',
    title: 'RGB or CMYK for print: what to do in an RGB-only tool',
    seoTitle: 'RGB or CMYK for print? What to do in an RGB-only tool',
    summary: 'Printers press in CMYK; most design tools, including this one, work in RGB. What the difference is, why sending RGB is usually right, what to say to the printer, and the three things to change in the design so the conversion goes well.',
    description: 'Send RGB and say so. Most printers convert with the profile for their press, which beats a generic conversion. What CMYK means, the colours that shift, pure black for text, and what to do when a printer insists on CMYK.',
    category: 'craft',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Editor · Print PDF',
    goals: ['prepare-for-print'],
    answers: ['rgb or cmyk for print', 'rgb vs cmyk', 'do i need cmyk for printing', 'what is cmyk', 'my printer wants cmyk', 'convert rgb to cmyk', 'can i print an rgb file', 'why does cmyk look dull', 'rich black vs pure black'],
    related: ['print-looks-different-from-screen', 'designing-for-print', 'what-is-a-print-ready-pdf', 'colour-that-works'],
    keywords: 'rgb cmyk print convert gamut profile printer ink pure black rich black text conversion rgb only tool proof',
    guide: {
      before: ['designing-for-print'],
      next: ['what-is-a-print-ready-pdf', 'prepare-a-poster-for-print'],
      also: [{ when: 'you want to understand the whole screen-to-paper gap', slug: 'print-looks-different-from-screen' }, { when: 'the printer asked for crop marks', slug: 'crop-marks-trim-marks-and-bleed' }],
    },
    body: [
      { t: 'answer', text: '**Send RGB and say so.** RGB is how screens make colour (light); CMYK is how presses make it (four inks). Every file is converted to CMYK before it is printed. The question is who converts: you, with a generic profile, or the printer, with the profile for their press and paper. The printer\'s conversion is usually better, and most commercial and online printers accept RGB PDFs for exactly that reason. Voidcanvas exports RGB only, so write "RGB, please convert" in the order note and ask for a proof. What you can control is the design: avoid building it on colours ink cannot reach, keep text in pure black, and check bright brand colours against a printed sample.' },
      { t: 'demo', kind: 'print-setup', caption: 'Switch to the CMYK preview to see the direction of the change. Bright blues, greens and pinks lose the most. It is a simulation, not your printer\'s profile.' },

      { t: 'h', text: 'What the two are' },
      { t: 'table', head: ['', 'RGB', 'CMYK'], rows: [
        ['Made of', 'Red, green and blue light, added together', 'Cyan, magenta, yellow and black ink, layered on paper'],
        ['Used by', 'Screens, cameras, the web, most design tools', 'Presses and most professional printers'],
        ['Range of colours', 'Wider, especially bright and saturated colours', 'Narrower; bright blues, greens, oranges and pinks are out of reach'],
        ['White', 'All three at full', 'The paper; no ink'],
        ['Black', 'All three at zero', 'Black ink alone (pure black) or black plus colour (rich black)'],
        ['In a file', 'Three numbers per pixel, or a hex code', 'Four percentages per colour, plus a profile that describes the press'],
      ] },
      { t: 'p', text: 'There is no single CMYK. A conversion depends on a profile (the press, the ink set and the paper), so "convert to CMYK" without a profile is a guess. That is why the printer, who knows the profile, is the better place for it.' },

      { t: 'h', text: 'What to change in the design' },
      { t: 'list', items: [
        '**Do not build on a neon.** Bright saturated colours shift most. Use them small; use a slightly deeper version of the colour for large surfaces.',
        '**Text in pure black.** RGB black (#000000) converts to a mix of all four inks in a generic conversion, which looks fuzzy on small type if the plates are a fraction out. Ask the printer to keep text as 100 per cent K; most do this by default for black text.',
        '**Large black areas as rich black.** Black ink alone prints as a dark grey on big areas. Printers add cyan and magenta to deepen it. Say "rich black for large areas" in the note and let them set the mix.',
        '**Check light tints.** Very pale colours (a 3 per cent tint) can disappear or come out patchy. Keep tints above about 8 per cent.',
        '**Look at a printed sample** of the brand colour before a big run. A proof answers what no preview can.',
      ] },

      { t: 'h', text: 'When the printer says CMYK only' },
      { t: 'p', text: 'Some printers, especially trade printers with automated preflight, reject RGB files. Three ways through, in order of preference:' },
      { t: 'steps', items: [
        'Ask. "I can supply RGB; can you convert with your profile?" Most will, and a note in the order form is usually enough.',
        'Have them convert as a paid prepress step. Small fee, correct profile.',
        'Convert it yourself in a tool that exports CMYK PDFs (a desktop layout or vector app), choosing the profile the printer names, usually a coated or uncoated FOGRA or SWOP profile. Open the exported RGB PDF or PNG there, place it on a page of the right size, and export as PDF/X. Expect the on-screen colours to look duller after conversion; that is the preview being honest.',
      ] },

      { t: 'h', text: 'How Voidcanvas handles this' },
      { t: 'p', text: 'Every export is RGB. Studio\'s print PDFs say so in the slug line, with bleed and crop marks; the Editor\'s PDF does not label itself, so put RGB in the order note. Both are image-based at 300 dpi, which printers accept and convert with their own profile. There is no CMYK export, no soft proof and no profile embedding. The brand guideline builder keeps colours in OKLCH ramps, which makes it easy to pick a less saturated step for print surfaces, and the print-setup preview above shows which colours are going to move.' },
      { t: 'product', text: 'RGB output, print presets at 300 dpi, and Studio print PDFs whose slug line tells the printer the file is RGB. The conversion belongs with the person who owns the press.', label: 'Open the Editor', href: '/editor?preset=a4' },

      { t: 'faq', items: [
        { q: 'Can I print an RGB file?', a: 'Yes. Home printers expect RGB, and most commercial and online printers accept RGB PDFs and convert them with their press profile. Say RGB in the order note so nobody assumes.' },
        { q: 'Why does CMYK look dull on screen?', a: 'The screen is showing you a simulation of what ink can do. Ink reflects light; a screen emits it. The dullness is the truth about paper, not a fault in the file.' },
        { q: 'Should I design in CMYK from the start?', a: 'Only if the tool and the printer both support a specific profile and you have a calibrated screen. Otherwise design in RGB, avoid out-of-gamut colours, and proof.' },
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'poster-design-rules',
    title: 'Poster design rules that work from across a room',
    seoTitle: 'Poster design rules: 9 that work from across a room',
    summary: 'A poster is read in three seconds from three metres. Nine rules that follow from that, with the numbers: how big the type must be, how many sizes to use, where the details go, and the two tests to run before you export.',
    description: 'Nine poster design rules with numbers: one message, type big enough for the distance, three sizes, one focal point, margins, two colours plus a neutral, details in reading order, the squint and phone tests, and the right dpi.',
    category: 'craft',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Editor · Guides, Character panel',
    goals: ['make-a-poster', 'learn-design'],
    answers: ['poster design rules', 'poster design tips', 'how to design a poster', 'poster design principles', 'how big should text be on a poster', 'poster text size', 'what makes a good poster', 'poster layout tips', 'poster design for beginners'],
    related: ['layout-and-composition', 'typography-fundamentals', 'prepare-a-poster-for-print', 'workflow-event-poster'],
    keywords: 'poster design rules tips principles hierarchy focal point type size distance legibility margins colour reading order squint test event poster',
    guide: {
      before: ['layout-and-composition', 'typography-fundamentals'],
      next: ['design-a-poster-with-no-photo', 'prepare-a-poster-for-print'],
      also: [{ when: 'you want the whole job step by step', slug: 'workflow-event-poster' }, { when: 'it still looks like a template', slug: 'make-your-design-look-less-generic' }],
    },
    body: [
      { t: 'answer', text: 'A poster is seen from a distance, for a few seconds, by someone who was not looking for it. Everything follows from that. **One message**, not three. **Type sized for the distance**: capitals about 10 mm tall for every 3 m the reader stands away, and the headline two to three times that. **Three sizes** of type, each clearly bigger than the next. **One focal point** that wins by a wide margin. **Margins** and a grid so it looks placed, not dropped. **Two colours and a neutral.** **Details in reading order**: what, when, where, how to get in. Then two tests: squint at it, and shrink it to the size of your phone. If the headline and the date survive both, it works.' },

      { t: 'h', text: '1. One message' },
      { t: 'p', text: 'Decide the one thing a passer-by should take away, and make that the headline. Everything else is detail. A poster that also explains the organisation, lists six sponsors at the same size and adds a slogan has three headlines and no message. If the client insists on more, the answer is two posters.' },

      { t: 'h', text: '2. Size type for the distance' },
      { t: 'p', text: 'A signage rule of thumb: for comfortable reading, capital letters need about **10 mm of height for every 3 m** between reader and poster, and to be noticed rather than merely readable, double it. A poster on a corridor wall is read from 2 to 3 m; one across a street from 10 m or more.' },
      { t: 'table', head: ['Read from', 'Smallest details (cap height)', 'Headline (cap height)', 'On an A3 at 300 dpi'], rows: [
        ['1 m (notice board, up close)', '4 mm', '15 mm and up', 'details 47 px, headline 180 px+'],
        ['3 m (corridor, shop window)', '10 mm', '30 mm and up', 'details 118 px, headline 350 px+'],
        ['10 m (across a street)', '35 mm', '100 mm and up', 'A3 is too small; use A1 or larger'],
      ] },
      { t: 'p', text: 'Cap height is roughly 70 per cent of the point size for most fonts, so a 10 mm capital is about a 14 mm (40 pt) setting. In the Editor, set sizes in the **Character** panel in pixels: at 300 dpi, 1 mm is 11.8 px. The Properties slider stops at 600 px; the Character panel does not.' },

      { t: 'h', text: '3. Three sizes, clearly different' },
      { t: 'p', text: 'Headline, facts, small print. Each level at least 1.5 times the next, and the headline usually three times the facts. Four sizes is the maximum; more and the hierarchy dissolves. One type family with a range of weights is always safe; a display face for the headline over a plain sans for the facts is the classic poster pairing. Pick sizes from a scale rather than by eye:' },
      { t: 'demo', kind: 'type-scale', caption: 'A steep ratio (1.5 or 1.618) suits posters: few steps, big jumps. Set the base to the small print size and read the headline size off the top.' },

      { t: 'h', text: '4. One focal point' },
      { t: 'p', text: 'One element wins: the headline, or the image, never both. Make it win by a wide margin, two to three times the size of the next thing, or the only thing in colour, or the only thing with space around it. A poster with two equal things has a tie, and the reader walks past a tie.' },

      { t: 'h', text: '5. Margins and a grid' },
      { t: 'p', text: 'Keep everything at least 5 per cent of the short side away from the edge (15 mm on A3, 25 mm on 18 × 24 in). Printers trim with a small tolerance, frames cover edges, and a margin makes the design look placed. Inside the margin, align to two or three edges, not seven. The Editor\'s **View, Guides, New guide layout…** has a **Safe margins** preset; set the margin in pixels and snap to it.' },

      { t: 'h', text: '6. Two colours and a neutral' },
      { t: 'p', text: 'A background, a type colour and one accent is a complete poster palette. Contrast between the type and what is behind it matters more than the colours themselves: dark on light or light on dark, at 4.5:1 or better, because posters are read in bad light. Bright saturated colours print duller than they look on screen, so put the neon in the accent, not the background. [Colour that works](/learn/colour-that-works) has the system.' },

      { t: 'h', text: '7. Details in reading order' },
      { t: 'p', text: 'After the headline the eye wants: **what** it is, **when**, **where**, **how much** and **how to get in**. Put them in that order, top to bottom or in one block, in the second size, aligned to one edge. Logos go at the bottom in a row, aligned along their base, each no taller than the small print is wide. A QR code is a detail: 25 mm minimum for a 1 m scan, with quiet space around it.' },

      { t: 'h', text: '8. The two tests' },
      { t: 'list', items: [
        '**Squint.** Blur your eyes (or add a Black and white adjustment layer and step back). What still stands out is the real focal point. If it is the sponsor strip, fix the tone.',
        '**Phone size.** Zoom out until the poster is the size of your phone screen. If you can still read the headline and the date, it works from across a street. If not, the type is too small or the contrast too low.',
        'Then **100 per cent** ({{Ctrl+1}}) to check the photo and the smallest type at print scale, because the phone test hides softness.',
      ] },

      { t: 'h', text: '9. The right resolution' },
      { t: 'p', text: '300 dpi for A3 and smaller, 150 dpi for A2 and larger, and the photo\'s own pixels checked at final size. [What dpi a poster should be](/learn/what-dpi-should-a-poster-be) has the table; [How to prepare a poster for print](/learn/prepare-a-poster-for-print) has the export.' },

      { t: 'h', text: 'Common mistakes' },
      { t: 'table', head: ['Mistake', 'What it looks like', 'Fix'], rows: [
        ['Everything the same size', 'A wall of text; nothing to read first', 'Three sizes, headline 3× the facts'],
        ['Centred everything', 'Ragged edges everywhere, no line to follow', 'Align to one left edge, or centre only the headline'],
        ['Type over a busy photo', 'Half the letters vanish', 'Tone the photo down under the type, or put the type on a flat band'],
        ['Too many fonts', 'Looks like a ransom note', 'One family, or two with different jobs'],
        ['Small text at the edge', 'Cut off or hidden by the frame', 'Safe margin, and nothing important in the bottom 5 per cent'],
        ['Neon background', 'Prints muddy', 'Neutral or dark background, neon as accent'],
      ] },

      { t: 'checklist', items: [
        'One message; the headline says it.',
        'Headline capitals at least 30 mm for a 3 m read; details at least 10 mm.',
        'Three type sizes, each at least 1.5× the next.',
        'One focal point; the squint test agrees.',
        'Safe margin on all sides; two or three alignment edges.',
        'Two colours and a neutral; type contrast 4.5:1 or better.',
        'What, when, where, price, how to get in, in that order.',
        'Passes the phone-size test; checked at 100 per cent.',
        '300 dpi at A3 and below, 150 above; photo pixels checked at final size.',
      ] },

      { t: 'h', text: 'How Voidcanvas handles this' },
      { t: 'p', text: 'Print presets at 300 dpi, a Safe margins guide layout that snaps, the Character panel for headline sizes beyond the slider, adjustment layers to tone a photo down under type, **Ctrl+1** for the print-scale check and a one-page PDF at 300 dpi. The event poster workflow applies all nine rules to one real job.' },
      { t: 'product', text: 'Start from the poster preset, drop in the Safe margins guides, and the rest is the nine rules. The workflow linked below walks a real event poster through them.', label: 'Start a poster', href: '/editor?preset=poster' },

      { t: 'faq', items: [
        { q: 'How big should text be on a poster?', a: 'For a 3 m read, capitals at least 10 mm tall for details and 30 mm or more for the headline; double those to be noticed rather than merely legible. At 300 dpi, 10 mm is about 118 px.' },
        { q: 'How many fonts should a poster use?', a: 'One family with a range of weights, or two with different jobs (a display face for the headline, a plain face for the facts). Never three.' },
        { q: 'What size should a poster be?', a: 'A3 for notice boards and shop windows read up close, A2 or A1 for walls and read from a few metres, A0 or larger across a street. The bigger the poster, the further away it is read and the lower the dpi it needs.' },
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor?preset=poster' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'design-a-poster-with-no-photo',
    title: 'Design a poster with no photo',
    seoTitle: 'How to design a poster with no photo (type, shape, colour)',
    summary: 'No image is not a problem; it is a brief. Five ways to make a poster from type, shape, colour and texture alone, each with the Editor steps, and the rules that stop a type-only poster looking empty.',
    description: 'Five ways to design a poster without a photo: type as the image, shape blocks, a gradient field with grain, a pattern built from one element, and type on a path. Editor steps for each and the mistakes to avoid.',
    category: 'craft',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Editor · Type, Shapes, Gradient, Filter layers',
    goals: ['make-a-poster', 'learn-design'],
    answers: ['design a poster with no photo', 'poster without images', 'typography poster', 'text only poster design', 'how to make a poster with just text', 'poster design without pictures', 'type based poster', 'minimalist poster design'],
    related: ['poster-design-rules', 'typography-fundamentals', 'shapes-and-pen', 'type'],
    keywords: 'poster no photo text only typography poster shapes gradient grain pattern text on a path minimalist swiss style colour field',
    guide: {
      before: ['poster-design-rules'],
      next: ['prepare-a-poster-for-print', 'make-your-design-look-less-generic'],
      also: [{ when: 'you want a printed texture over it', slug: 'make-a-risograph-effect' }, { when: 'you do have a photo', slug: 'workflow-event-poster' }],
    },
    body: [
      { t: 'answer', text: 'Make the type the image. Most of the posters people remember are words, colour and a shape, not a photograph. Five approaches that work every time: **the headline as the picture** (one word so big it touches the edges), **shape blocks** (two or three flat shapes that carry the composition), **a colour field with grain** (a gradient, texture and small type), **a pattern from one element** (a word or shape repeated until it becomes texture), and **type on a path** (a circle or curve that gives flat words movement). Pick one. Keep the palette to two colours and a neutral, keep the details small and aligned, and leave real empty space; a type poster fails by being timid, not by being plain.' },

      { t: 'h', text: 'Before you start' },
      { t: 'list', items: [
        'Open the poster at its final size: [A4](/editor?preset=a4) or the [18 × 24 in poster](/editor?preset=poster) preset, or a custom size from [the dpi table](/learn/what-dpi-should-a-poster-be).',
        'Add guides: **View, Guides, New guide layout…**, the **Safe margins** preset, margin about 5 per cent of the short side. Keep **Snap** on.',
        'Choose the palette first: a background, a type colour with 4.5:1 contrast on it, and one accent. Set them as the main and second colours so every new shape and text arrives in the right colour.',
        'Write the words down: the headline (one to three words), the facts in reading order, the small print. A type poster is edited on paper before it is designed.',
      ] },

      { t: 'h', text: '1. The headline is the picture' },
      { t: 'p', text: 'One word or a short phrase, so large it runs to the margins or off the edge. The letters become shapes; their counters and the gaps between them become the composition. Works best with a heavy or condensed face and one colour.' },
      { t: 'steps', items: [
        'Press **T**, click, type the word. Open the **Character** panel (Window menu) and set the size in pixels: on a 2480 px wide A4, start at 700 px and adjust. The Properties slider stops at 600; the Character panel does not.',
        'Tighten **Tracking** to slightly negative so the word reads as one block, and set **Leading** below the size if it wraps to two lines.',
        'Let the word touch or cross the edge on one side only. Cropping a letter is fine; cropping two sides looks like a mistake.',
        'Put the facts in the second size in the space the word leaves, aligned to one of its edges.',
      ] },

      { t: 'h', text: '2. Shape blocks' },
      { t: 'p', text: 'Two or three flat shapes, a circle and a rectangle say, in the accent and the type colour, arranged so they overlap or touch. The shapes hold the composition; the type sits in or against them. This is the Swiss-poster move and it has never stopped working.' },
      { t: 'steps', items: [
        'Press **U** for the Shape tool. Drag a rectangle from one edge past the middle. Hold Shift and drag a circle. A click without dragging drops a 300 px shape you can resize.',
        'In Properties, set **Fill** to the accent for one and the type colour for the other. Remove the outline. Set the circle\'s **Opacity** to about 85 per cent so the overlap shows a third tone.',
        'Select both and use **Layer, Pathfinder** (Minus front, Intersect, Divide) if you want one shape cut by the other.',
        'Set the headline across the boundary between shape and background, in the colour that contrasts with both, or in white with a subtle **Layer style** stroke.',
      ] },

      { t: 'h', text: '3. A colour field with grain' },
      { t: 'p', text: 'A gradient from the background colour to a deeper or warmer version of itself, a film grain filter on top so it prints as texture rather than banding, and small type set with a lot of space. Quiet, expensive-looking, and quick.' },
      { t: 'steps', items: [
        'Add a new layer ({{Ctrl+Shift+N}}). Set the main colour to the light end and the second colour to the dark end. Press **G** and drag from one corner to the other; a longer drag gives a softer blend.',
        'Choose **Filter, Enhance, Film Grain**, or pick it in **Filter, Filter gallery…**. It arrives as a filter layer above the gradient. Set Amount low, 15 to 25, and Grain Size small. Grain breaks up gradient banding, which is the thing that makes a printed gradient look cheap.',
        'Set the headline in the second colour or white, medium size, with the facts far below it in a small size. Resist filling the space.',
        'For a printed feel, add **Filter, Enhance, Vignette** at low strength, or the riso treatment linked below.',
      ] },

      { t: 'h', text: '4. A pattern from one element' },
      { t: 'p', text: 'Repeat the word, a number, a shape or the date across the page until it reads as texture, then set the real headline once, clearly, over the top or in a gap.' },
      { t: 'steps', items: [
        'Make the element: a text layer or a shape in the accent colour at about 15 per cent opacity, or in a tint of the background.',
        'Duplicate it ({{Ctrl+J}}) and nudge with Shift plus an arrow key (10 px steps) to place the second copy exactly. Select both, duplicate again, and the spacing doubles. Six or seven duplications fill a page.',
        'Select all the copies and **Layer, Group** ({{Ctrl+G}}) them, so they move as one and the group can be masked to the margins.',
        'Set the headline over the pattern in the full type colour, larger than the pattern element, or leave a clear band for it.',
      ] },

      { t: 'h', text: '5. Type on a path' },
      { t: 'p', text: 'Words around a circle, along an arc or up the side of the page give a flat layout movement, and they need no image to feel designed. Works for names, dates, and repeated phrases.' },
      { t: 'steps', items: [
        'Draw the path: a circle with the Shape tool (Shift-drag, then untick Fill in Properties), or a curve with the **Curvature pen** ({{Shift+P}} until you reach it) in **Path** mode.',
        'With the Type tool, click on the shape\'s outline or the selected path. The text flows along it. Properties then has **Start along the path**, **Lift off the path** and **Flip side**.',
        'Set the tracking a little wider than usual; letters on a curve crowd on the inside.',
        'Put the headline in the centre of the circle or across the curve, straight, so the poster has one straight thing to anchor the eye.',
      ] },

      { t: 'h', text: 'Why type posters look empty, and the fix' },
      { t: 'table', head: ['Problem', 'Cause', 'Fix'], rows: [
        ['It looks unfinished', 'Everything is medium sized and centred', 'Make one thing huge or one thing tiny. Extremes are what read as intent.'],
        ['It looks like a Word document', 'Default sizes, default spacing, a white background', 'Colour the background. Set the headline in the Character panel at a size that scares you a little.'],
        ['Banding in the gradient', 'Smooth gradient, no texture, JPG export', 'Film grain at low amount; export PNG or PDF.'],
        ['The words fight', 'Two headlines', 'One message. Demote the other to the facts size.'],
        ['It looks cheap in print', 'Neon background, thin light type', 'Neutral or deep background, the neon as an accent, weight in the headline.'],
      ] },

      { t: 'h', text: 'How Voidcanvas handles this' },
      { t: 'p', text: 'Everything above is in the Editor: text set in pixels in the Character panel with tracking and leading, shape layers with Pathfinder, the Gradient tool and Gradient overlay style, filter layers for grain and vignette that re-render sharp at export size, type on a path from any shape or pen path, and guides that snap. Export a PDF at 300 dpi when it is done, or send it through Studio for bleed and crop marks.' },
      { t: 'product', text: 'Text, shapes and filters are all vector or re-rendered at export, so a type-only poster is sharp at any size. Start from the poster preset and try approach 1 first; it takes ten minutes.', label: 'Start a poster', href: '/editor?preset=poster' },

      { t: 'faq', items: [
        { q: 'Can a poster be just text?', a: 'Yes, and many of the best are. The type has to do the work the photo would have done: one huge element for the eye to land on, and real empty space around it.' },
        { q: 'What font should I use for a text-only poster?', a: 'A heavy or condensed sans for the headline if the message is loud, a serif display face if it is formal, and one plain family for the facts. Never more than two families.' },
        { q: 'Where do I get textures without stock images?', a: 'Make them: film grain and noise filters, a halftone or dither filter on a gradient, or a pattern built from your own type. They print well and belong to the design.' },
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor?preset=poster' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'offline-design-software',
    title: 'Offline design software, including the browser apps that work offline',
    seoTitle: 'Offline design software (and which browser apps work offline)',
    summary: 'What "offline" has to mean for a design tool, the three kinds of software and how each behaves without a connection, a one-minute test you can run on any of them, and what to do before a flight.',
    description: 'Offline design software explained: installed apps, browser apps that install and cache themselves, and web apps that need a connection. A one-minute test, what to prepare before you lose signal, and how Voidcanvas behaves offline.',
    category: 'start',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Install as an app · Desktop app',
    goals: ['private-and-offline'],
    answers: ['offline design software', 'design software that works offline', 'graphic design software offline free', 'can i use a browser design tool offline', 'offline photo editor', 'design app that works without internet', 'does voidcanvas work offline', 'offline design app for laptop', 'design software for a plane'],
    related: ['install-as-an-app', 'desktop-app', 'saving-and-your-files', 'photo-editor-that-does-not-upload'],
    keywords: 'offline design software no internet browser app pwa install desktop app fonts ai models cache test airplane mode chromebook linux',
    guide: {
      before: ['photo-editor-that-does-not-upload'],
      next: ['install-as-an-app', 'desktop-app'],
      also: [{ when: 'you want to know where your files are', slug: 'saving-and-your-files' }, { when: 'you are on a Chromebook or an unusual browser', slug: 'browser-support' }],
    },
    body: [
      { t: 'answer', text: 'A design tool works offline when it can **open, edit, save and export** with no connection, not just show you the last screen. Three kinds of software behave three ways. **Installed desktop apps** (GIMP, Inkscape, Krita, Scribus, Affinity, and the Voidcanvas desktop app) work offline by nature; files live on your disk. **Browser apps that install themselves** keep a copy of the app on your device after the first visit and keep working when the connection drops; Voidcanvas is one, and after one visit the Editor, Studio and Effects run offline with your designs stored in the browser. **Web apps that need a connection** load their editor and your files from a server each time, so they stop or go read-only without one. The test below tells you which kind you have in one minute.' },

      { t: 'h', text: 'The one-minute test' },
      { t: 'steps', items: [
        'Open the tool and open one of your designs while you are online.',
        'Turn Wi-Fi off (or airplane mode on).',
        'Reload the page or restart the app. If it does not come back, it needs a connection to load.',
        'Open a different design, add a text layer, save, and export a PNG. If any of those fails or hangs, it needs a connection for that step.',
        'Turn Wi-Fi back on. A tool that syncs quietly when it reconnects, without losing what you did, has passed.',
      ] },

      { t: 'h', text: 'The three kinds' },
      { t: 'table', head: ['Kind', 'Examples', 'Offline', 'Where files are', 'Watch for'], rows: [
        ['Installed desktop app', 'GIMP, Inkscape, Krita, Scribus, Affinity, Voidcanvas desktop', 'Everything', 'Your disk', 'Fonts you have not installed; cloud features inside the app'],
        ['Browser app that installs', 'Voidcanvas (install from the address bar or Add to Dock)', 'Everything after the first visit, with the exceptions below', 'The browser\'s storage on that device, plus .void files you save to disk', 'Web fonts never used before; AI models not yet downloaded; clearing site data deletes the designs'],
        ['Web app that needs a connection', 'Most cloud design tools', 'Little or nothing; some show recent files read-only', 'Their servers', 'A dropped connection mid-edit; anything you did not export before the signal went'],
      ] },
      { t: 'p', text: 'The middle kind is the one people do not expect. A browser app can register a service worker that stores the whole app on the device and serves it from there, connection or not. It is still "in the browser", but the browser is now the runtime, not a window onto a server. Whether a given tool does this is what the test tells you.' },

      { t: 'h', text: 'What needs the internet the first time' },
      { t: 'p', text: 'Even offline-capable tools fetch a few things once. Prepare them before you go:' },
      { t: 'checklist', items: [
        'Open the app once and open the parts you use (in Voidcanvas: the Editor, Studio, Effects and any quick tool). They are stored on the device from then on.',
        'Use every font you plan to use. Web fonts load once and are kept; a font you have never used will not load offline. The 16 fonts built into Voidcanvas are always available.',
        'Run each AI tool once (Remove background, Select subject, Expand with AI fill). Each downloads its model the first time, then runs on the device.',
        'Save a .void file of anything important to disk, or install the desktop app so designs are files in a folder you own.',
        'Export a PNG of the current state of the job, in case you need to send it from a phone.',
      ] },

      { t: 'h', text: 'Offline and private are different' },
      { t: 'p', text: 'A tool can work offline and still upload your work the moment it reconnects. Offline tells you where the work happens; private tells you where the work goes. [Photo editors that do not upload your photos](/learn/photo-editor-that-does-not-upload) has the network test for the second question. Voidcanvas passes both: the work happens on the device, and by default the only thing sent when you reconnect is an anonymous usage count you can turn off. The optional sharing features (account sync, teams, review links) encrypt on the device before anything leaves.' },

      { t: 'h', text: 'How Voidcanvas handles this' },
      { t: 'list', items: [
        '**In the browser**, after the first visit, the home page, Editor, Studio and Effects are stored on the device; the quick tools are stored once visited. Designs live in the browser\'s storage on that device and can be saved to .void files on disk. Install it from the address bar (Chrome, Edge), **Add to Dock** (Safari) or **Add to Home Screen** (iPhone, Android) and it opens in its own window and works with no connection.',
        '**The desktop app** for Windows, macOS and Linux is the same app installed, with designs saved as .void files in a Voidcanvas folder inside Documents (or a folder of your choice, including a synced one), the 16 built-in fonts and these Learn pages on the machine, and PSD opening from the file browser.',
        '**Needs the internet once:** Google Fonts you have not used, and each AI model the first time. **Never needs it:** opening, editing, saving, exporting, PSD import, effects, the brand kit.',
        '**Sends when online:** anonymous usage counts (off in Your privacy). If you choose to use them, account sync sends your settings, teams send the brands and jobs you share, and review and delivery links send that version\'s files, all encrypted on the device first. See [What Voidcanvas sends](/learn/privacy-and-data).',
      ] },
      { t: 'product', text: 'Install it as an app or use the desktop build; open the Editor once with your fonts and AI tools, and it works on a plane. Your designs stay on the device either way.', label: 'Install Voidcanvas', href: '/download' },

      { t: 'faq', items: [
        { q: 'Can a browser-based design tool work offline?', a: 'Yes, if it installs a service worker that stores the app on your device and keeps your files there too. Not every web tool does. Reload it with Wi-Fi off; if it comes back and lets you save and export, it does.' },
        { q: 'Does Voidcanvas work offline?', a: 'Yes, after one visit. The Editor, Studio and Effects are stored on the device, designs are kept in the browser or as .void files, and the desktop app needs no connection at all. Fonts you have never used and AI models you have never run need the internet once.' },
        { q: 'What free design software works offline on a laptop?', a: 'Installed: GIMP and Krita for raster, Inkscape for vector, Scribus for layout, all free. Browser-installed: Voidcanvas, free and with no account. The best choice depends on the job; a layered image editor and a page-layout tool are different things.' },
        { q: 'Will I lose my designs if I clear my browser?', a: 'Designs in browser storage are deleted with the site\'s data. Keep a .void file of anything that matters, or use the desktop app, where every design is a file in your Documents folder.' },
      ] },
      { t: 'try', label: 'Download the desktop app', href: '/download' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'leaving-creative-cloud-checklist',
    title: 'Leaving Creative Cloud as a designer: the checklist',
    seoTitle: 'Leaving Creative Cloud: the checklist before you cancel',
    summary: 'What stops working the day the subscription ends, what to export while you still can, which files still open afterwards, and an honest map of what a browser editor covers and what it does not.',
    description: 'Before you cancel Creative Cloud: fonts deactivate, apps stop opening, libraries go. What to export (PSDs, fonts list, swatches, vectors, brand assets), what still opens later, and what a browser editor does and does not replace.',
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Editor · PSD import',
    goals: ['leave-photoshop'],
    answers: ['leaving creative cloud checklist', 'cancel adobe subscription designer', 'what happens to my files if i cancel creative cloud', 'photoshop alternative no subscription', 'can i open psd files after cancelling adobe', 'what to do before cancelling creative cloud', 'adobe fonts after cancelling', 'photoshop replacement for freelancers'],
    related: ['coming-from-photoshop', 'edit-a-psd-without-photoshop', 'file-formats', 'import-psd-and-pdf'],
    keywords: 'leaving creative cloud cancel adobe subscription checklist fonts deactivate psd ai indd libraries swatches ase export before cancelling freelancer',
    guide: {
      before: ['coming-from-photoshop'],
      next: ['edit-a-psd-without-photoshop', 'file-formats'],
      also: [{ when: 'your work is mostly client jobs', slug: 'run-a-client-design-project' }, { when: 'you want the brand assets somewhere useful', slug: 'brand-kit' }],
    },
    body: [
      { t: 'answer', text: 'Your files are yours; the apps and the fonts are not. The day the subscription ends, the apps stop opening (after any grace period) and every font activated through Adobe Fonts deactivates, which means any design using one will substitute a fallback wherever you open it. Before you cancel: **make a list of the fonts you actually use and license or replace them**, **export vector work as SVG or PDF** (AI files do not open in most other tools), **flatten or export anything that depends on smart objects, actions or plug-ins**, **export libraries and swatches**, and **keep the PSDs**, which open in other editors with their layers. Then check the honest map below of what a browser editor replaces and what it does not, because one or two jobs may still need a desktop tool.' },

      { t: 'h', text: 'What stops on the day' },
      { t: 'table', head: ['Thing', 'What happens', 'Do first'], rows: [
        ['The apps', 'Stop opening once the plan ends', 'Finish or export anything mid-job'],
        ['Adobe Fonts', 'Deactivate on every machine; documents fall back to another font', 'List the fonts you use; license, or pick Google Fonts equivalents, and test them in the files that matter'],
        ['Libraries (colours, styles, assets)', 'No longer accessible in the apps', 'Export swatches as .ase and save assets as SVG or PNG'],
        ['Cloud documents', 'Read-only, then removed after the retention period', 'Download every cloud document as a local file'],
        ['Your local files', 'Untouched', 'Nothing; they are files'],
      ] },

      { t: 'h', text: 'Which files still open afterwards' },
      { t: 'table', head: ['Format', 'Opens elsewhere', 'What to do before cancelling'], rows: [
        ['PSD', 'Yes, in most layered editors, including the Voidcanvas Editor: layers, groups, masks, text, adjustments and styles, with smart objects and vector shapes as pixels', 'Rasterise smart objects you need to keep editable, or keep their source files. Make sure the fonts used are files you own.'],
        ['AI (Illustrator)', 'Rarely as editable vectors', 'Export every AI file you care about as SVG (editable) and PDF (exact). Keep the AI file too.'],
        ['INDD (InDesign)', 'Almost nowhere', 'Export IDML (for Affinity Publisher or Scribus) and a PDF of each document. Package the fonts and links.'],
        ['PDF', 'Everywhere', 'Nothing. The Voidcanvas Editor opens PDFs as layers.'],
        ['Lightroom catalogue', 'Only in Lightroom', 'Export the photos with edits applied, and the catalogue as XMP sidecars if you want the edit data.'],
        ['XD, After Effects, Premiere projects', 'Not in Voidcanvas; specialised tools exist', 'Export finished assets and, where offered, an interchange format.'],
      ] },

      { t: 'h', text: 'The checklist' },
      { t: 'checklist', items: [
        'Fonts: a list of every typeface in current client work; each one licensed as a file you own, or replaced with a Google Font and the files updated and re-exported.',
        'Every AI file exported as SVG and PDF; every INDD as IDML and PDF with fonts and links packaged.',
        'Smart objects you still need editable: rasterised in a copy, or their source files saved next to the PSD.',
        'Actions and scripts you rely on: written down as steps, and an equivalent found (templates, a brand kit, batch resize) or accepted as manual.',
        'Libraries: swatches as .ase, logos as SVG and PNG, text styles noted.',
        'Cloud documents downloaded; the Creative Cloud Files folder copied somewhere ordinary.',
        'One CMYK-critical job identified, if you have one, and a plan for it (printer converts, or a desktop layout app for that job).',
        'A trial run: open your three most important PSDs in the new tool and read the import report before the plan ends, while you can still fix things in Photoshop.',
      ] },

      { t: 'h', text: 'What a browser editor covers, honestly' },
      { t: 'table', head: ['You used', 'In Voidcanvas', 'Notes'], rows: [
        ['Photoshop for layered design, retouching, type, export', 'The Editor', 'Layers, masks, adjustment layers, selections, retouching, layer styles, type, PSD import. See Coming from Photoshop for the full map.'],
        ['Photoshop for CMYK prepress, soft proofing, Camera Raw', 'Not covered', 'RGB export only; printers convert. For raw processing use a raw developer and bring in the result.'],
        ['Illustrator for logos and icons', 'Partly', 'Shape layers, the Pen tools, Pathfinder and SVG export cover simple vector work. Complex illustration wants a vector app (Inkscape, Affinity).'],
        ['InDesign for multi-page documents', 'Not covered', 'The Editor is single-page with boards. Brand guidelines export as a multi-page PDF from Studio, but a book or catalogue needs a layout app.'],
        ['Libraries for brand assets', 'Brand kit and the brands library', 'Colours, fonts, logos and rules per brand, loaded into any design, with checks before export.'],
        ['Actions for repeat work', 'Templates, Resize to every format, Studio formats', 'Not scripting, but it covers the common cases: same design in every size, same setup every time.'],
        ['Adobe Fonts', 'Google Fonts, or font files you add', 'Installed fonts are not listed; add the font file, and it is saved inside the design so it travels with it.'],
        ['Cloud documents and sync', 'Files on your device; optional encrypted account sync', 'Nothing leaves the device readable.'],
      ] },

      { t: 'h', text: 'How Voidcanvas handles the move' },
      { t: 'p', text: 'Open a PSD and the Editor reports what carried over and what it had to render as pixels, so you know before you start. Fonts missing from a PSD are listed and can be replaced or loaded from a file. The tool keys and most shortcuts are Photoshop\'s. There is no subscription, no account requirement and no cloud library: designs are in the browser on your device or as .void files on disk, and the desktop app keeps them in a folder you choose. What it does not do is on the table above rather than in a footnote.' },
      { t: 'product', text: 'Open your three most important PSDs in the Editor before the plan ends and read the import reports. That tells you, for your files, whether the move works.', label: 'Open a PSD in the Editor', href: '/editor' },

      { t: 'faq', items: [
        { q: 'Can I still open my PSD files after cancelling?', a: 'Yes. A PSD is a file on your disk and it opens in other layered editors. In the Voidcanvas Editor, layers, groups, masks, text, adjustments and styles come through; smart objects and vector shapes arrive as pixels, with a report of what changed.' },
        { q: 'What happens to Adobe Fonts when I cancel?', a: 'They deactivate on every machine. Documents that use them fall back to another font wherever they are opened next. List the fonts in your current work and license or replace each one before the plan ends.' },
        { q: 'Is a browser editor enough for a freelance designer?', a: 'For layered design, retouching, type, social and print export, yes. For CMYK prepress, raw processing, complex vector illustration and multi-page layout, no; keep or find a desktop tool for those jobs. Most freelancers have one such job a year and can plan around it.' },
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'make-a-comic-book-effect',
    title: 'How to make a comic book effect from a photo',
    seoTitle: 'Comic book effect from a photo, in the browser',
    summary: 'A comic book look is three things stacked: flat colour, halftone dots in the shadows, and black ink lines. How each is made, why the order matters, and the recipe in the Editor with a live Pop Art example.',
    description: 'Make a comic book effect from a photo: flatten the colour with Posterize or Pop Art, add coarse halftone dots on Multiply, and put black edge lines on top. The recipe in the Editor, with a live example.',
    category: 'effects',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Effects · Pop Art, Halftone, Edge Detect',
    goals: ['design-effects'],
    answers: ['comic book effect', 'how to make a comic book effect from a photo', 'comic effect online', 'turn a photo into a comic', 'pop art effect', 'cartoon effect photo', 'halftone comic effect', 'roy lichtenstein effect', 'comic filter free'],
    related: ['make-a-halftone-portrait', 'artistic-effects', 'stylise-effects', 'filters-in-the-editor'],
    keywords: 'comic book effect pop art lichtenstein halftone dots ink lines posterize edge detect cartoon photo multiply filter layers',
    guide: {
      before: ['make-a-halftone-portrait'],
      next: ['filters-in-the-editor', 'artistic-effects'],
      also: [{ when: 'you want the printed, misregistered version', slug: 'make-a-risograph-effect' }, { when: 'you want cleaner flat colour', slug: 'posterize-an-image' }, { when: 'you want one click and a download', slug: 'effects-overview' }],
    },
    body: [
      { t: 'answer', text: 'A comic book effect is three layers of printing history stacked on one photo: **flat colour** (comics were printed in a few inks, so smooth shading becomes bands), **halftone dots** where the shading was (that is how the inks made mid-tones), and **black ink lines** on top (the artist\'s line work). Make them in that order: flatten the colour with **Posterize** or **Pop Art**, add a coarse **Halftone** set to Multiply so the dots sit in the shadows, then add **Edge Detect**, inverted and set to Multiply, for the lines. A high-contrast photo on a plain background gives the best result; a face at three-quarter angle with a strong light is the classic subject.' },
      { t: 'demo', kind: 'effect', effect: 'popart', caption: 'Pop Art bands the photo into a few flat colours from a fixed palette. It is the fastest route to the look; the recipe below adds the dots and the lines.' },

      { t: 'h', text: 'The three parts' },
      { t: 'table', head: ['Part', 'What it did on the printed page', 'Effect that makes it', 'Setting to start from'], rows: [
        ['Flat colour', 'Comics were printed with a few inks, so skin, hair and sky were flat fills', 'Posterize (keeps the photo\'s own colours) or Pop Art (swaps in a bright palette)', 'Posterize Levels 20 to 30; Pop Art Colour levels 30 to 40, Colour blend 100'],
        ['Dots', 'Mid-tones and shadows were screened into dots, usually one ink over another', 'Halftone', 'Dot size 40 to 60, Contrast 50; coarser for print, finer for a phone'],
        ['Lines', 'The inker\'s black outlines', 'Edge Detect, inverted', 'Threshold 50 to 90; higher for cleaner outlines'],
      ] },
      { t: 'p', text: 'Each part on its own is a different effect. Posterize alone is a poster; halftone alone is newsprint; edge detect alone is a blueprint. The comic look is the stack, and the order matters because each filter works on what is below it.' },

      { t: 'h', text: 'The recipe in the Editor' },
      { t: 'steps', items: [
        'Open the photo. Crop tight, and add a **Curves** adjustment layer to push the contrast: comics have no soft shadows. If the background is busy, **Layer, Remove background** and put a flat colour layer underneath.',
        'Flat colour: **Filter, Stylize, Posterize** (or **Filter, Artistic, Pop Art**). It arrives as a filter layer named after the filter. In **Filter settings** in Properties, drop Posterize to 20 to 30 levels. Every filter you add from here goes above the last.',
        'Dots: **Filter, Artistic, Halftone**. Set **Dot Size** around 50 and **Contrast** around 50. Then set the filter layer\'s blend mode to **Multiply** in the Layers panel: the white parts of the halftone vanish and the black dots sit on the flat colour. Lower the layer\'s **Opacity** to 60 to 80 per cent so the dots tint the shadows rather than covering them.',
        'Lines: duplicate the original photo ({{Ctrl+J}}) and drag the copy to the top of the stack. Add **Filter, Stylize, Edge Detect** above it, set **Threshold** so only the strong outlines remain, then select the filter layer and choose **Layer, Merge down** to bake the lines into the copy. Add an **Invert** adjustment directly above the copy and **Merge down** again: Merge down applies it to that one layer only, so the lines turn black on white. Set the copy to **Multiply**. White becomes transparent; the lines stay black.',
        'Finish: a **Film Grain** filter at a low amount over everything for paper texture, and a text layer in a bold display face if you want a caption box or a sound effect. Export as PNG.',
      ] },
      { t: 'tip', text: 'For the Lichtenstein look, use Pop Art with Colour levels low and Colour blend at 100, make the halftone coarse (Dot size 70 or more) and keep the lines thick by raising the Edge Detect threshold and adding a 2 px **Stroke** layer style to the line layer.' },

      { t: 'h', text: 'Where it goes wrong' },
      { t: 'table', head: ['Problem', 'Cause', 'Fix'], rows: [
        ['Muddy, grey result', 'Photo has low contrast; posterize levels too high', 'Curves first; fewer levels'],
        ['Dots everywhere, face lost', 'Halftone at Normal blend or 100 per cent opacity', 'Multiply, opacity 60 to 80 per cent, and a mask over the face highlights'],
        ['Lines are noise, not outlines', 'Edge Detect threshold too low', 'Raise it until only the strongest edges stay; blur the copy slightly first for smoother lines'],
        ['White lines instead of black', 'Edge Detect not inverted', 'Add an Invert adjustment above the line layer and Merge down, then Multiply'],
        ['Looks like a filter, not a comic', 'No flat background, no type', 'Cut the subject out, put it on one flat colour, add one bold word'],
      ] },

      { t: 'h', text: 'How Voidcanvas handles this' },
      { t: 'p', text: 'Posterize, Pop Art, Halftone and Edge Detect are four of the 58 effects. In Effects you can try each alone with sliders and Compare, and Send to Editor. In the Editor they are filter layers: stackable, reorderable, maskable, with blend modes and opacity, and re-rendered sharp at export size. The example above runs the same Pop Art code as the product.' },
      { t: 'product', text: 'Four effects, stacked as filter layers with blend modes, is the comic recipe. Start in Effects to pick your settings, then Send to Editor to build the stack.', label: 'Open Pop Art in Effects', href: '/effects?effect=popart' },

      { t: 'faq', items: [
        { q: 'Is there a one-click comic book filter?', a: 'Pop Art gets closest in one click: flat colours from a comic palette. The full look needs the dots and the lines as well, which is three filters stacked in the Editor. Ten minutes, and it looks like a comic rather than a filter.' },
        { q: 'What photo works best?', a: 'High contrast, one strong light, a plain background, and a face or figure that fills the frame. Soft, evenly lit photos come out grey whatever you do.' },
        { q: 'Can I print it?', a: 'Yes. Make the halftone coarse (a dot cell of at least 6 px at 300 dpi) so the dots survive the press, and export a PDF or PNG at the poster size. Halftone for screen printing and DTF has the numbers.' },
      ] },
      { t: 'try', label: 'Open Effects', href: '/effects?effect=popart' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'halftone-for-screen-printing-and-dtf',
    title: 'Halftone for screen printing and DTF: the numbers',
    seoTitle: 'Halftone for screen printing and DTF: lpi, dot size, files',
    summary: 'The dot size that survives a screen, the relation between lines per inch and mesh count, why DTF is different, and how to get a Voidcanvas halftone to those numbers and into the right file.',
    description: 'Halftone for screen printing: 35 to 55 lpi depending on mesh, dot cell in pixels at 300 dpi, black on white or transparent, one file per colour. For DTF, supply full-resolution artwork and let the RIP screen it.',
    category: 'effects',
    level: 'Intermediate',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Halftone tool · Halftone filter',
    goals: ['design-effects', 'prepare-for-print'],
    answers: ['halftone for screen printing', 'halftone for dtf', 'what lpi for screen printing', 'halftone dot size for screen printing', 'screen print halftone settings', 'how to make a halftone for screen printing', 'dtf halftone', 'mesh count and lpi', 'halftone t shirt design'],
    related: ['make-a-halftone-portrait', 'quick-tools', 'what-dpi-should-a-poster-be', 'export-for-screen'],
    keywords: 'halftone screen printing dtf lpi lines per inch mesh count dot gain dot size pixels 300 dpi positive film black white transparent one colour per file',
    guide: {
      before: ['make-a-halftone-portrait'],
      next: ['quick-tools', 'filters-in-the-editor'],
      also: [{ when: 'the job is a poster rather than a shirt', slug: 'what-dpi-should-a-poster-be' }, { when: 'you need flat colour separations first', slug: 'posterize-an-image' }, { when: 'you want the comic version of the look', slug: 'make-a-comic-book-effect' }],
    },
    body: [
      { t: 'answer', text: '**Screen printing:** use a coarse halftone, **35 to 55 lines per inch**, matched to the mesh (mesh count at least four times the lpi: 156 mesh for 35 to 40 lpi, 230 for about 55). At 300 dpi that is a dot cell of **5.5 to 8.5 px**. Keep dots between roughly 10 and 90 per cent so the smallest ones hold on the screen and the largest do not fill in. Supply **black dots on white or transparent, one file per ink colour**, at final size, as PNG or PDF. **DTF is different:** the printer\'s RIP does its own screening, so supply full-resolution artwork with a transparent background and treat any halftone in it as a design choice with coarse dots (a 6 px cell or larger), so the RIP\'s screen does not fight yours.' },
      { t: 'demo', kind: 'effect', effect: 'halftone', caption: 'The same halftone code as the tool and the Editor filter. Dot size is the grid spacing; make it coarse for a screen.' },

      { t: 'h', text: 'Why a screen needs coarse dots' },
      { t: 'p', text: 'A screen is a mesh; ink passes through the open holes. A halftone dot smaller than a few mesh openings does not stay on the screen (the emulsion cannot hold it) and a dot bigger than the space around it fills in with ink spread (dot gain). So the dot grid has to be much coarser than the mesh, and the tonal range has to avoid the extremes. Newspapers print at 65 to 85 lpi on paper; shirts print at 35 to 55 lpi because the mesh is coarser and the fabric absorbs.' },
      { t: 'table', head: ['Mesh count (threads per inch)', 'Halftone lpi', 'Dot cell at 300 dpi', 'Typical use'], rows: [
        ['110', '25 to 28', '11 to 12 px', 'Heavy white ink underbase, very coarse art'],
        ['156', '35 to 40', '7.5 to 8.5 px', 'General one- and two-colour shirt work'],
        ['200', '45 to 50', '6 to 6.5 px', 'Finer detail, lighter ink deposit'],
        ['230', '50 to 55', '5.5 to 6 px', 'Fine detail, simulated process'],
        ['305', '60 to 65', '4.5 to 5 px', 'Very fine work; ask the printer'],
      ] },
      { t: 'p', text: 'The formula: dot cell in pixels = dpi ÷ lpi. At 300 dpi, 50 lpi is a 6 px cell. Ask the printer what mesh they will use; if they do not know yet, 45 lpi (a 6.7 px cell at 300 dpi) is the safe middle for most shops.' },

      { t: 'h', text: 'Getting a Voidcanvas halftone to a number' },
      { t: 'p', text: 'The **Dot Size** slider is grid spacing. In the Editor, a filter layer\'s cell is about **Dot Size ÷ 8** document pixels at a 1× export, so on a 300 dpi document: Dot Size 48 is a 6 px cell (50 lpi), 56 is 7 px (43 lpi), 64 is 8 px (37.5 lpi). In the Halftone tool the setting is scaled with the download so the result matches the preview; measure the exported file rather than trusting the slider.' },
      { t: 'steps', items: [
        'Set the document to the print size at 300 dpi (a 12 × 16 in shirt print area is 3600 × 4800 px). Place the photo; convert it to black and white with an adjustment layer and push **Curves** until the shadows are dark and the highlights nearly white. Screens print ink or no ink, so the photo has to be graphic already.',
        'Add **Filter, Artistic, Halftone**. Set **Dot Size** from the table (48 to 64 for most shirts) and **Contrast** to about 50, so the darkest dots just fill their cell rather than merging into a solid.',
        'Zoom to 100 per cent ({{Ctrl+1}}) and count: the distance between dot centres is your cell. Adjust Dot Size until it matches the lpi you agreed.',
        'Check the extremes. Very small dots in the highlights will drop out; very large in the shadows will fill in. Use Curves under the filter to pull the tonal range in, so the smallest printed dot is around 10 per cent and the largest around 90.',
        'One ink per file. Hide everything except the layers for that ink, export a PNG at 1×. Black is ink; white or transparent is no ink. For a two-colour job, make one halftone per colour on its own layer stack and export each separately, at the same size, so they register.',
      ] },
      { t: 'note', text: 'Many screen printers prefer to make the halftone themselves in their RIP from a continuous-tone greyscale file, because they know their mesh, emulsion and ink. Ask first. If they do, send a high-contrast greyscale PNG at 300 dpi and tell them the lpi you would like; skip the halftone filter entirely.' },

      { t: 'h', text: 'DTF is not screen printing' },
      { t: 'p', text: 'Direct-to-film prints CMYK plus white through an inkjet onto film, and the printer\'s RIP software converts the whole image into its own fine screen (often 55 lpi or more) before printing. If you send it an image that is already halftoned, the RIP screens your dots again, and two grids at similar angles make moiré. So for DTF:' },
      { t: 'list', items: [
        'Supply **full-resolution artwork with a transparent background** (PNG at 300 dpi at final size). Let the RIP do the screening; it knows the film and the powder.',
        'If you want visible halftone dots as part of the design, make them **coarse**: a cell of 6 px or more at 300 dpi, which the RIP\'s much finer screen renders cleanly as shapes rather than fighting.',
        'Keep the smallest solid detail above about 1 mm; very fine dots and hairlines shed powder and peel.',
        'Transparent means no ink and no white underbase. Anything semi-transparent gets a partial white layer under it, which can look chalky on dark garments. Keep edges hard.',
      ] },

      { t: 'h', text: 'How Voidcanvas handles this' },
      { t: 'p', text: 'The Halftone tool and the Halftone filter run the same code; the filter gives you the document-size control and the layer stack for one ink per file. Exports are PNG with transparency preserved, so a halftone on a transparent layer exports as black dots on nothing, which is what a screen positive and a DTF file both want. There is no CMYK separation and no RIP; for process work, send the printer a high-resolution RGB file and let them separate.' },
      { t: 'product', text: 'Halftone as a filter layer at document size, Curves to control the tonal range under it, and a PNG export with transparency per ink. Enough for one- and two-colour shirt work; ask the printer before anything with more inks.', label: 'Open the Halftone tool', href: '/tools/halftone' },

      { t: 'faq', items: [
        { q: 'What lpi should I use for screen printing a t-shirt?', a: '35 to 55 lpi, matched to the mesh: about 40 lpi on 156 mesh, 50 on 230. If you do not know the mesh, 45 lpi is the safe middle. At 300 dpi that is a dot cell of about 6.7 px.' },
        { q: 'Should I halftone my design for DTF?', a: 'Not for tonal reasons; the printer\'s RIP screens it. Send full-resolution artwork with a transparent background. Add halftone dots only as a visible design element, and make them coarse.' },
        { q: 'Black on white or black on transparent?', a: 'Either works for a screen positive; ask the shop. Transparent is safer for DTF because white would print as white ink. In Voidcanvas, a halftone filter over a layer with transparency keeps the transparency on export.' },
      ] },
      { t: 'try', label: 'Open the Halftone tool', href: '/tools/halftone' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'open-a-psd-file-online-free',
    title: 'Open a PSD file online, free, without an account',
    seoTitle: 'Open a PSD file online free (layers kept, nothing uploaded)',
    summary: 'Drop the PSD on the Editor and it opens with its layers, in the browser, with no account and no upload. What you see, what to check first, and how to get a PNG, JPG or PDF out.',
    description: 'Open a PSD online for free: drop it on the Voidcanvas Editor, keep layers, groups, masks and text, read the import report, and export PNG, JPG, WebP or PDF. Nothing is uploaded; there is no account.',
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'supporting',
    feature: 'Editor · Import',
    goals: ['work-with-psd'],
    answers: ['open psd file online free', 'psd viewer online', 'how to open a psd file', 'open psd without photoshop free', 'psd opener', 'view psd file online', 'convert psd to png online free', 'psd to jpg free', 'open psd on chromebook'],
    related: ['edit-a-psd-without-photoshop', 'import-psd-and-pdf', 'file-formats', 'export-for-screen'],
    keywords: 'open psd online free viewer no account no upload layers convert psd to png jpg pdf chromebook browser',
    guide: {
      next: ['edit-a-psd-without-photoshop', 'import-psd-and-pdf'],
      also: [{ when: 'it will not open', slug: 'psd-will-not-open' }, { when: 'you only need a PNG out', slug: 'convert-psd-to-png' }, { when: 'the file is confidential', slug: 'photo-editor-that-does-not-upload' }],
    },
    body: [
      { t: 'answer', text: 'Open [the Editor](/editor) and drop the PSD on it, or press {{Ctrl+O}} and choose the file. It opens with its layers, groups, masks, text, adjustment layers and layer styles, in the browser, on any computer including a Chromebook. Nothing is uploaded and there is no account. If anything had to change to open, a report lists it. To get a flat image out, press {{Ctrl+E}} and choose PNG, JPG, WebP or PDF. The Editor does not save back to PSD; keep the original, or save a .void file to keep the layers editable here.' },

      { t: 'h', text: 'Open it' },
      { t: 'steps', items: [
        'Go to [the Editor](/editor). On the start screen, drop the PSD onto **Open a photo**, or drag it onto an open design, or press {{Ctrl+O}} (Cmd+O on a Mac).',
        'Wait a moment for large files. Layers appear in the Layers panel in their original order, with groups, masks, opacity and blend modes.',
        'If a report titled **Opened** appears, read it: it lists what was **Kept**, what was **Changed so it would open** (smart objects and vector shapes become pixels, text with mixed styles becomes pixels) and what is **Not supported yet**.',
        'If **Some fonts are missing** appears, pick a replacement for each font, keep a stand-in, or press **Add font file** to load the real one from your computer.',
      ] },

      { t: 'h', text: 'Get a file out' },
      { t: 'table', head: ['You want', 'Do', 'Notes'], rows: [
        ['A PNG or JPG of the whole design', '{{Ctrl+E}}, choose PNG or JPG, Download', 'PNG keeps transparency; JPG is smaller for photos'],
        ['One layer as an image', 'Hide the others, then export', 'Or select the layer and copy it into a new design'],
        ['A PDF to send', '{{Ctrl+E}}, PDF', 'One page, image based; 300 dpi for designs over 2000 px'],
        ['Keep the layers editable', '{{Ctrl+S}} (saved in this browser) or {{Ctrl+Shift+S}} (a .void file on disk)', 'PSD is read, not written'],
      ] },

      { t: 'h', text: 'Limits, stated plainly' },
      { t: 'list', items: [
        'Layers larger than 4096 px on the long side are scaled to 4096 px.',
        'Smart objects and vector shapes arrive as pixels. Warped text, text on a path and text with mixed styles arrive as pixels.',
        'A few blend modes (linear burn, linear dodge, vivid light, pin light, dissolve) use the nearest match. 16-bit files open as 8-bit.',
        'No PSD export. Deliver PNG, JPG, WebP or PDF; keep layers in a .void file.',
      ] },

      { t: 'h', text: 'How Voidcanvas handles this' },
      { t: 'p', text: 'The PSD is read on your device; no file is sent anywhere, which is why it works offline and why a client file under NDA is safe here. The import report is deliberate: it tells you what changed before you touch anything, instead of leaving you to find out later. [How to edit a PSD without Photoshop](/learn/edit-a-psd-without-photoshop) covers what to do once it is open.' },
      { t: 'product', text: 'Drop the file, read the report, export what you need. Free, no account, nothing uploaded, and it works on a Chromebook.', label: 'Open a PSD in the Editor', href: '/editor' },

      { t: 'faq', items: [
        { q: 'Is it really free with no account?', a: 'Yes. The Editor runs in the browser with no sign-up. An optional account exists for encrypted sync between devices; opening and editing a PSD does not need it.' },
        { q: 'Is my PSD uploaded?', a: 'No. The file is read in your browser and never leaves your device. You can open it with the Wi-Fi off.' },
        { q: 'Can I convert PSD to PNG here?', a: 'Yes: open the PSD, press Ctrl+E, choose PNG, Download. Hide layers first if you want only some of them.' },
        { q: 'Does it work on a Chromebook or a phone?', a: 'Chromebook, yes, with the full Editor. Phones get the phone Editor; a large PSD may be slow on a phone, and the 4096 px cap applies.' },
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },
]
