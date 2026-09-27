import type { Article } from '../types'

// Problem-first cornerstones: each one answers a search people actually type (research/learn-seo), solves the problem
// independently of any tool, then shows how Voidcanvas handles it. Every product detail is checked against the code:
// presets (src/editor/presets.ts), PDF export and size rules (src/editor/export.ts, ExportDialog), Studio delivery
// (src/studio/job/DeliverTab.tsx, src/studio/pdf.ts), the halftone effect (src/lib/effects.ts), PSD import (src/editor/import-formats.ts).

export const articles: Article[] = [
  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'prepare-a-poster-for-print',
    title: 'How to prepare a poster for print',
    seoTitle: 'How to prepare a poster for print: size, dpi, bleed, PDF',
    summary: 'Document size, resolution, bleed, safe area, colour, type, images, PDF export and the printer checklist, with the numbers for every common poster size and a live setup you can flip between.',
    description: 'Set up a poster at 300 dpi with 3 mm bleed and a 5 mm safe area, export a PDF at final size and hand it to the printer with the right notes. Numbers for A4, A3, A2 and 18 × 24 in.',
    category: 'craft',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'cornerstone',
    feature: 'Editor · Print presets and PDF',
    goals: ['make-a-poster', 'prepare-for-print'],
    answers: ['how to prepare a poster for print', 'how to make a poster print ready', 'poster print settings', 'what size should a poster be', 'what dpi should a poster be', 'a3 poster in pixels', 'poster bleed', 'how to print a poster', 'poster design for print', 'print ready poster pdf'],
    related: ['designing-for-print', 'export-for-print', 'workflow-event-poster', 'image-resolution-explained'],
    keywords: 'poster print ready a3 a2 a1 18x24 300 dpi bleed 3mm safe area crop marks pdf cmyk rgb printer checklist poster size pixels',
    guide: {
      before: ['image-resolution-explained'],
      next: ['workflow-event-poster', 'export-for-print'],
      also: [{ when: 'you want the terms explained in depth', slug: 'designing-for-print' }, { when: 'you want the halftone poster look', slug: 'make-a-halftone-portrait' }, { when: 'it is an A5 flyer rather than a poster', slug: 'workflow-print-flyer' }],
    },
    body: [
      { t: 'answer', text: 'Set the document to the final poster size at **300 dpi**, add **3 mm of bleed** on every side, keep text and logos at least **5 mm inside the trim**, use photos that are at least as many pixels wide as the poster itself, and export a **PDF at final size**. Tell the printer the file is RGB and includes bleed, and ask for a proof. The rest of this page gives you the numbers, the reasons and the checks.' },
      { t: 'p', text: 'Print is unforgiving in ways screens are not. The sheet is cut with a small margin of error, ink is duller than light, and a photo that looked fine on your monitor can print as mush. Everything below exists to close those three gaps. You can do all of it in any competent design application; the last section shows the route in Voidcanvas.' },

      { t: 'h', text: 'What you will need' },
      { t: 'list', items: [
        'The **final size** of the poster. If you are not sure, A3 (297 × 420 mm) is the usual notice board size and A2 (420 × 594 mm) the usual wall size. In the US, 18 × 24 in is the equivalent of A2.',
        'The **printer\'s specification**: how much bleed they want (nearly always 3 mm, or 0.125 in), whether they want crop marks, and whether they accept RGB. Ask before you start; a two-line email saves a reprint.',
        'Your **images at full size**. A photo for an A3 poster needs to be about 3500 px on its long edge to fill the width at 300 dpi. Phone photos are; images saved from the web are not.',
        'The **words**, checked. Dates, prices and web addresses are the things that get reprinted.',
      ] },

      { t: 'h', text: 'Try the setup before you read the rest' },
      { t: 'p', text: 'Pick a size and flip the three settings that decide whether a poster prints well. The sheet on the left is what comes back from the printer if the cut drifts by a millimetre, which it will. The close-up is a 30 mm square at print scale.' },
      { t: 'demo', kind: 'print-setup', caption: 'Simulated. The CMYK preview approximates a generic conversion, not your printer\'s profile. The point is the direction of the change, not the exact colour.' },

      { t: 'h', text: 'The correct document setup' },
      { t: 'p', text: 'Work at the final size from the start. Scaling a finished A4 up to A2 doubles every pixel and softens every photo. The table gives the pixel size of each common poster at 300 dpi, and the size with 3 mm bleed added on every side (36 px each side at 300 dpi, so 72 px on each dimension).' },
      { t: 'table', head: ['Size', 'Millimetres', 'Trim at 300 dpi', 'With 3 mm bleed'], rows: [
        ['A4', '210 × 297', '2480 × 3508 px', '2552 × 3580 px'],
        ['A3', '297 × 420', '3508 × 4961 px', '3580 × 5033 px'],
        ['A2', '420 × 594', '4961 × 7016 px', '5033 × 7088 px'],
        ['18 × 24 in', '457 × 610', '5400 × 7200 px', '5472 × 7272 px'],
        ['A1', '594 × 841', '7016 × 9933 px', 'see the note on large posters'],
      ] },
      { t: 'note', text: 'A poster is read from a distance, so A1 and larger are usually printed from files at 150 dpi, which halves every number above and keeps the file a manageable size. A1 at 150 dpi is 3508 × 4967 px. Ask the printer; large-format shops say what they want.' },
      { t: 'p', text: 'Use the calculator for any other size, in millimetres or inches.' },
      { t: 'demo', kind: 'size-calculator' },

      { t: 'h', text: 'Resolution' },
      { t: 'p', text: 'Resolution only matters for photos and textures; type and flat shapes drawn in the application are sharp at any size. The rule: a photo should have at least as many pixels as the area it covers at 300 dpi. A photo that fills the width of an A3 poster needs about 3500 px; one that fills a quarter of it needs about 1750 px. Check by viewing the photo at 100 per cent at the document\'s size and looking at an edge. If it is soft there, it will be soft on paper. Enlarging a small photo does not add detail, it only smooths the softness. [Image resolution explained](/learn/image-resolution-explained) has the maths and the fixes.' },

      { t: 'h', text: 'Bleed' },
      { t: 'p', text: 'Bleed is artwork that runs past the trim edge so the guillotine, which drifts by up to a millimetre, still cuts into colour rather than into white paper. Anything that touches an edge (a background, a photo, a stripe) must continue 3 mm beyond it. Anything that does not touch an edge needs nothing. Crop marks are the short lines outside the bleed that show where the cut goes; the printer usually adds them, and if you add them yourself they must not touch the artwork.' },

      { t: 'h', text: 'Safe area' },
      { t: 'p', text: 'The same drift that makes bleed necessary can slice into a phone number set close to the edge. Keep text, logos and anything that would look wrong cut at least 5 mm inside the trim (59 px at 300 dpi). On a poster, 10 to 15 mm looks better anyway: a wide margin reads as confidence, a tight one as a mistake.' },

      { t: 'h', text: 'Colour' },
      { t: 'p', text: 'Screens make colour with light (RGB) and presses make it with ink (CMYK), and ink cannot reach the brightest blues, greens, oranges and pinks a screen can show. Someone converts your file, and the best person to do it is the printer, with the profile for their press and paper. So work in RGB, avoid building the design around a neon that will not survive, and ask for a proof if the colour matters. Two things to ask about: whether black text will print in black ink only (a generic conversion can turn it into a four-ink mix that looks fuzzy), and whether large black areas should be a rich black. [Colour that works](/learn/colour-that-works) covers how to plan a palette that survives the trip.' },

      { t: 'h', text: 'Typography' },
      { t: 'p', text: 'Posters have three levels of type: the one thing (event, product, headline), the facts (date, place, price) and the small print. Make each level clearly different in size, not slightly different. A poster is read at two distances: the headline from across the room, the facts from a metre. As a rule of thumb, small print on a poster should not go below 18 pt (about 75 px at 300 dpi), and the facts sit comfortably at 30 to 48 pt (125 to 200 px). Points are 1/72 of an inch, so at 300 dpi one point is about 4.2 px, which is why type that looks big on a zoomed-out canvas can be tiny on paper. [Typography fundamentals](/learn/typography-fundamentals) explains scale, measure and spacing.' },

      { t: 'h', text: 'Images' },
      { t: 'list', items: [
        'Place photos at 100 per cent or smaller, never enlarged. If you must enlarge, stop at about 120 per cent.',
        'Crop hard. A poster is a single image seen from a distance; a wide photo with a small subject reads as nothing.',
        'Lift the shadows a little for uncoated paper, which absorbs ink and fills dark areas in. On coated stock, leave them.',
        'Sharpen once, gently, at the final size, as the last step before export.',
        'If the only photo you have is too small, make that the design: a coarse [halftone](/learn/make-a-halftone-portrait), a duotone or a heavy crop turns low resolution into a treatment rather than a defect.',
      ] },

      { t: 'h', text: 'Export settings' },
      { t: 'p', text: 'Export a PDF at the final size including bleed. If your application offers PDF/X-1a or PDF/X-4, use it; if it offers only a plain PDF, that is fine for a poster, as long as the page size is right and images are not downsampled below 300 dpi. Keep a PNG at the same pixel size as a fallback: some large-format printers prefer it. Do not send a JPG of the poster; JPEG compression softens type.' },

      { t: 'h', text: 'Printer checklist' },
      { t: 'checklist', items: [
        'Page size equals the trim size plus bleed, and the printer knows which is which.',
        'Every photo checked at 100 per cent at document size; nothing enlarged past 120 per cent.',
        'Text and logos at least 5 mm inside the trim; nothing important within 10 mm of a corner.',
        'Backgrounds and photos run to the bleed edge, not the trim edge.',
        'Small print at 18 pt or more. Every date, price and URL read aloud by a second person.',
        'The file is RGB and the printer has confirmed they will convert it, or you have converted it to their profile.',
        'A proof requested for anything with a photo of a person or a brand colour.',
        'The email to the printer says: size, bleed, RGB or CMYK, crop marks or not, paper and quantity.',
      ] },

      { t: 'h', text: 'How to do it in Voidcanvas' },
      { t: 'p', text: 'There are two routes. Use the Editor when you want to design the poster by hand and are happy to add the bleed yourself; use Studio when the poster is one format in a client job and you want bleed, crop marks and a slug line added for you.' },
      { t: 'h3', text: 'In the Editor' },
      { t: 'steps', items: [
        'On the start screen choose **Poster 18 × 24 in** (5400 × 7200), **A4 flyer** (2480 × 3508), or type a custom size from the table above, for example 3508 × 4961 for A3.',
        'Before you design, add the bleed: **Image, Canvas size…**, tick **Relative**, enter 72 in **Add to width** and 72 in **Add to height**, anchor in the centre, **Apply**. Nothing is scaled; the canvas grows by 36 px on each side.',
        'Add guides for the trim and the safe area: **View, New guide…** at 36 px from each edge for the trim, and again at 95 px (36 + 59) for the safe area. **View, New guide layout…** puts a column grid inside them if you want one.',
        'Design. Run the background and photos to the outer edge of the canvas. Keep type inside the inner guides. Check photos at 100 per cent with {{Ctrl+1}} (Cmd+1 on a Mac).',
        'Export with {{Ctrl+E}} and choose **PDF**. Because the design is over 2000 px on its longest side, the page is sized at 300 dpi, so an A3 with bleed comes out at 303 × 426 mm. Leave **Size** at 1× and **Quality** high.',
        'Send the PDF with the note: "RGB, 300 dpi, 3 mm bleed included, no crop marks."',
      ] },
      { t: 'warn', text: 'The Editor\'s PDF is one page holding your design as a high-quality image, flattened onto white, in RGB. It adds no bleed or crop marks of its own, which is why steps 2 and 3 exist. Type is rendered to pixels at 300 dpi, so it prints as it looks on screen but is not selectable. Details in [Export for print](/learn/export-for-print).' },
      { t: 'h3', text: 'In Studio' },
      { t: 'steps', items: [
        'Open a job and, on the **Brief** tab, add a print format: **A3 poster**, **Poster 18 × 24 in** or **A4 flyer**. Each knows its size in millimetres.',
        'Build the design on the **Key visual** tab, or send it there from the Editor.',
        'On **Deliver**, tick **Print PDF** and choose **Build the package**. The PDF is at trim size with 3 mm bleed made by extending the artwork\'s edges, crop marks outside the bleed, TrimBox and BleedBox set for the printer\'s software, and a slug line recording the job, version, size, bleed and that the file is RGB.',
      ] },
      { t: 'note', text: 'Studio\'s bleed repeats the edge pixels outwards. That is clean for flat colour and simple backgrounds. For a detailed photo running off the edge, design the photo 3 mm larger in the Editor route instead.' },
      { t: 'product', text: 'Both routes run in the browser and the file never leaves your device. Print presets are at 300 dpi, the PDF is sized at 300 dpi for anything over 2000 px, and the guides above are the only setup a poster needs.', label: 'Start a poster in the Editor', href: '/editor?preset=poster' },

      { t: 'h', text: 'Common mistakes' },
      { t: 'list', items: [
        '**Designing at screen size and scaling up.** A 1080 px social post enlarged to A3 is 92 dpi. Start at the print size.',
        '**Adding bleed by stretching the finished design.** That moves the safe area and enlarges the photos. Add canvas, then extend the background.',
        '**White hairline on one edge of the printed poster.** No bleed, or the background stopped at the trim.',
        '**Colours came back dull.** Expected for bright RGB. Ask for a proof next time, and see the colour section above.',
        '**The PDF opened at the wrong size.** In the Editor, a design 2000 px or smaller on its longest side is treated as a screen document at 96 dpi. Posters are always bigger than that; business cards are not.',
        '**Very large exports fail.** Browsers cap image size. Exports over about 67 megapixels (an A1 at 300 dpi is 70) are scaled down to fit. Use 150 dpi for A1 and above.',
      ] },

      { t: 'h', text: 'Quick checklist' },
      { t: 'checklist', items: [
        'Final size, 300 dpi (150 for A1 and up), bleed added as canvas.',
        'Guides at trim and safe area; type inside the inner one.',
        'Photos checked at 100 per cent.',
        'Three type levels, small print 18 pt or more.',
        'PDF at final size; printer told RGB, bleed, marks.',
      ] },

      { t: 'faq', items: [
        { q: 'What resolution should a poster be?', a: '300 dpi at final size for A3 and smaller, which is read up close. 150 dpi is normal for A1 and larger, which is read from a distance and would otherwise be a huge file. Always confirm with the printer.' },
        { q: 'How much bleed does a poster need?', a: '3 mm on every side is the standard in the UK and Europe; 0.125 in (about 3.2 mm) in the US. Some large-format printers ask for 5 mm. At 300 dpi, 3 mm is about 36 px.' },
        { q: 'Should a poster be RGB or CMYK?', a: 'Design in RGB and let the printer convert with their own profile unless they specifically ask for CMYK. Voidcanvas exports RGB only. Expect very bright blues, greens and pinks to print duller either way, and ask for a proof.' },
        { q: 'Can I print a poster from a PNG?', a: 'Most digital and large-format printers accept a PNG at the right pixel size. A PDF at final size is safer because it carries the physical size. Do not send a JPG; the compression softens type.' },
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor?preset=poster' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'make-a-halftone-portrait',
    title: 'How to make a halftone portrait',
    seoTitle: 'How to make a halftone portrait (live example, no Photoshop)',
    summary: 'What a halftone is, how to pick the photo, the dot size for screen or print, how to colour the dots, and the variations. With a working halftone on the page and the same tool one click away.',
    description: 'Turn a photo into halftone dots: prepare the portrait, choose a dot size for screen or print, set the contrast, recolour with a blend mode. Live example, then the free browser tool.',
    category: 'effects',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'cornerstone',
    feature: 'Halftone tool · Effects · Filter layers',
    goals: ['design-effects', 'make-a-poster'],
    answers: ['how to make a halftone portrait', 'how to make a halftone effect', 'halftone effect online', 'halftone image generator', 'how to halftone an image', 'halftone without photoshop', 'best halftone settings for screen printing', 'comic book dot effect', 'newspaper dot effect', 'how to make a pop art portrait'],
    related: ['quick-tools', 'artistic-effects', 'filters-in-the-editor', 'workflow-textured-print-look'],
    keywords: 'halftone dots portrait pop art comic newspaper screen print lpi dot size contrast recolour blend mode multiply screen threshold stipple dot matrix dither',
    guide: {
      next: ['workflow-textured-print-look', 'filters-in-the-editor'],
      also: [{ when: 'it is going on a printed poster', slug: 'prepare-a-poster-for-print' }, { when: 'you want every setting of every effect', slug: 'artistic-effects' }, { when: 'you want the coarser, random look', slug: 'stylise-effects' }],
    },
    body: [
      { t: 'answer', text: 'A halftone turns a photo into dots on a grid: dark areas get large dots that merge, light areas get small ones or none. To make a good halftone portrait, start with a high-contrast black and white photo on a plain background, choose a dot size that suits where it will be seen (fine for screens, coarse for print and posters), set the contrast so the shadows fill in without swallowing the face, then recolour the dots with a blend mode. Below is a working halftone; move the sliders and watch what each one does.' },
      { t: 'demo', kind: 'effect', effect: 'halftone', caption: 'This is the same code as the Halftone tool and the Halftone filter in the Editor. Dot size is the grid spacing; Contrast is how fast dots grow in the shadows.' },

      { t: 'h', text: 'What a halftone is' },
      { t: 'p', text: 'Printing presses cannot print grey. They print ink or no ink. A halftone fakes grey by printing dots of varying size on a regular grid: from a distance the eye averages a big dot and its white surround into a dark grey, a small dot into a light grey. Newspapers, comics and screen prints all work this way, which is why the look reads as printed even on a screen. The pop-art portrait is a halftone made coarse enough that the trick is visible.' },
      { t: 'p', text: 'Three things decide how a halftone looks: the **spacing** of the grid (dot size), how quickly dots **grow** with darkness (contrast), and the **photo** underneath. Most disappointing halftones have the third problem, not the first two.' },

      { t: 'h', text: 'Choose and prepare the photo' },
      { t: 'list', items: [
        '**Strong light and shadow.** A face lit from one side, with real shadows, gives the dots something to describe. Flat, even lighting turns into a uniform grey field of medium dots.',
        '**A plain background.** Busy backgrounds become busy dots and compete with the face. Remove or darken it first ([Remove a background](/learn/remove-background) does it on your device).',
        '**Crop tight.** Halftone reads at a distance; a small face in a big frame becomes a smudge.',
        '**Black and white, then contrast.** Convert to black and white and push the contrast so the brightest skin goes almost white and the darkest shadows almost black. In the Editor, a **Curves** or **Levels** adjustment layer does this without touching the photo ([Adjustment layers](/learn/adjustment-layers)).',
      ] },

      { t: 'h', text: 'Dot size: match it to where it will be seen' },
      { t: 'p', text: 'Dot size is really grid spacing, and the right spacing depends on the output size, not on how it looks zoomed out on screen. In Voidcanvas the **Dot Size** slider runs from 10 to 100 and sets a cell of roughly Dot Size ÷ 8 pixels on the working image (so 40 gives a 5 px cell, 80 a 10 px cell). When you download from the Halftone tool at full size, the setting is scaled with the image so the result matches the preview.' },
      { t: 'table', head: ['Where it will be seen', 'Aim for', 'Why'], rows: [
        ['Instagram post or story', 'a cell of 4 to 8 px on the 1080 px image', 'Smaller and the phone screen smooths it back into a photo; larger and the face breaks up.'],
        ['Web hero or presentation', '6 to 12 px on the exported image', 'Big enough to read as dots at arm\'s length.'],
        ['A3 poster at 300 dpi', '6 to 12 px, which is 0.5 to 1 mm on paper', 'Visible dots from a metre away without turning to mud up close. Roughly 25 to 50 lines per inch.'],
        ['Screen printing', 'ask the printer for their line count', 'Typical screens hold 35 to 65 lines per inch. At 300 dpi, 45 lpi is a cell of about 6.7 px.'],
      ] },
      { t: 'tip', text: 'Make the halftone at the final pixel size and never scale it afterwards. Scaling a halftone up softens the dots; scaling it down creates moiré patterns as the grid fights the pixel grid.' },

      { t: 'h', text: 'Contrast: fill the shadows, keep the face' },
      { t: 'p', text: '**Contrast** (20 to 100) controls how large dots grow for a given darkness. At 50 the darkest dots just fill their cell. Above 50, dark dots grow into each other and shadows become solid black, which is the punchy comic look. Below 50, every dot shrinks and the whole image lightens. For a portrait, raise it until the shadow side of the face goes solid but the eyes and the bridge of the nose still read as separate dots. If the eyes vanish, back off, or paint the effect out of the eyes afterwards (below).' },

      { t: 'h', text: 'Colour the dots' },
      { t: 'p', text: 'The effect produces black dots on white. Colour is added afterwards with a layer and a blend mode, which is also how it was done on paper: ink colour and paper colour.' },
      { t: 'list', items: [
        '**Coloured dots on white:** put a solid colour layer above the halftone and set it to **Screen**. White stays white; the black dots take the colour.',
        '**Black dots on coloured paper:** put the colour layer above and set it to **Multiply**. The white becomes the colour; the dots stay black.',
        '**Coloured dots on coloured paper:** do both, with two colour layers, or use a **Duotone** filter under the halftone to tint the photo first, then set the halftone layer itself to **Multiply** so its dots print over the tint.',
      ] },
      { t: 'p', text: 'Blend modes are explained in [Blend modes and opacity](/learn/blend-modes-and-opacity).' },

      { t: 'h', text: 'Variations' },
      { t: 'list', items: [
        '**Two-tone poster:** Duotone first (a deep colour for shadows, a pale one for highlights), then Halftone at a coarse setting on Multiply.',
        '**Cut-out portrait:** remove the background, halftone the person only, and put them on a flat colour.',
        '**Sharp eyes:** apply the halftone as a filter layer in the Editor, then erase it over the eyes so they stay photographic. The contrast between dots and detail is the whole trick.',
        '**Random dots instead of a grid:** the **Stipple** effect scatters dots by density rather than on a grid. **Dither** gives a fine, non-grid pattern that suits small sizes.',
        '**Light dots on dark:** **Dot Matrix** keeps colour and puts bright dots on black, the reverse of a halftone.',
      ] },

      { t: 'h', text: 'How to do it in Voidcanvas' },
      { t: 'h3', text: 'Quickest: the Halftone tool' },
      { t: 'steps', items: [
        'Open the [Halftone tool](/tools/halftone). A sample is loaded so you can see the effect before you do anything.',
        'Click **Upload your image** or drop your photo on the preview. Nothing is uploaded anywhere; the page does the work in your browser.',
        'Set **Dot size** and **Contrast** under **Adjust**, using the table above for the size.',
        'Press **Download PNG**. The file is rendered again from your original at its own size (up to 8000 px on the long edge) with the settings scaled to match the preview, and named `halftone-<width>x<height>.png`.',
        'Or press **Send to Layer Stack** to open the Editor with your photo as one layer and the halftone as a live filter layer above it, ready to recolour and mask.',
      ] },
      { t: 'h3', text: 'In the Editor, as an editable layer' },
      { t: 'steps', items: [
        'Open the photo and prepare it: crop, then add a **Black and white** and a **Curves** adjustment layer from the Layers panel\'s **New adjustment layer** menu.',
        'Choose **Filter, Filter gallery…** and click **Halftone**. It is added as a layer named Halftone filter above everything below it.',
        'Select the filter layer and set **Dot Size** and **Contrast** in the **Filter settings** section of Properties.',
        'To keep the eyes sharp, pick the **Eraser** with the filter layer selected and paint over the eyes. The Editor adds a mask for you; paint with the **Brush** to bring the effect back.',
        'Add a colour layer above: **Layer, New layer**, then **Edit, Fill…** ({{Shift+F5}}) with your colour, or draw a rectangle over the whole canvas. Set its blend mode to **Screen** or **Multiply** as described above.',
        'Export as PNG ({{Ctrl+E}}). PNG keeps the dots crisp; JPG softens them.',
      ] },
      { t: 'product', text: 'The Halftone tool, Effects and the Editor\'s Halftone filter share one implementation, so the dots you tune in one are the dots you get in the others. Everything runs on your device, with no account and no upload.', label: 'Open the Halftone tool', href: '/tools/halftone' },

      { t: 'h', text: 'Common mistakes' },
      { t: 'list', items: [
        '**Grey soup.** The photo had no contrast. Fix the photo first; no slider rescues flat lighting.',
        '**Dots too fine for print.** They fill in on paper and the portrait goes dark. Use the table and think in millimetres.',
        '**Moiré (wavy interference patterns).** The halftone was scaled after it was made, or a second grid was laid over it. Make it at final size, once.',
        '**Soft dots.** Exported as JPG, or scaled up. Export PNG at the size you made it.',
        '**Eyes gone.** Contrast too high with no mask. Lower it or erase the effect over the eyes.',
      ] },

      { t: 'faq', items: [
        { q: 'What are the best halftone settings for screen printing?', a: 'Ask the printer for their line count (lpi) and make the halftone at the final size at 300 dpi with a cell that matches it: cell in pixels = 300 ÷ lpi. For 45 lpi that is about 6.7 px, so a Dot Size around 50. Keep Contrast so the shadows go solid; screens cannot hold very small dots.' },
        { q: 'Can I make a halftone in colour?', a: 'The effect itself is black and white. Add colour with a layer above it set to Screen (colours the dots) or Multiply (colours the paper), or tint the photo with Duotone first.' },
        { q: 'Is the halftone made from my photo uploaded anywhere?', a: 'No. The tool, Effects and the Editor all run in your browser. See [Privacy and data](/learn/privacy-and-data) for exactly what the app does send.' },
      ] },
      { t: 'try', label: 'Open the Halftone tool', href: '/tools/halftone' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'edit-a-psd-without-photoshop',
    title: 'How to edit a PSD without Photoshop',
    seoTitle: 'How to edit a PSD without Photoshop (what carries over)',
    summary: 'What survives when a Photoshop file is opened elsewhere, what to check before you touch anything, how to finish the edit and get a file back out, and what to do when the client wants a PSD back.',
    description: 'Open and edit a PSD without Photoshop: which layers, masks, text, adjustments and styles carry over, what turns into pixels, how to fix missing fonts, and how to export the result.',
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'cornerstone',
    feature: 'Editor · Open PSD',
    goals: ['work-with-psd', 'leave-photoshop'],
    answers: ['how to edit a psd without photoshop', 'can you edit a psd file without photoshop', 'how to open a psd file', 'open psd online free', 'is a psd file editable', 'psd editor online', 'edit photoshop file without photoshop', 'psd to png', 'how to open psd on a laptop without photoshop'],
    related: ['import-psd-and-pdf', 'workflow-psd-to-social', 'layers', 'file-formats'],
    keywords: 'psd photoshop file open edit without photoshop free online layers masks text smart object adjustment layer fonts missing export png pdf void',
    guide: {
      next: ['import-psd-and-pdf', 'workflow-psd-to-social'],
      also: [{ when: 'you are moving off Photoshop altogether', slug: 'editor-tour' }, { when: 'the edit is mostly masks', slug: 'masks' }, { when: 'the text needs re-setting', slug: 'type' }],
    },
    body: [
      { t: 'answer', text: 'Yes, a PSD can be opened and edited without Photoshop. A PSD is a layered file, and several editors read it, including Voidcanvas in a browser. What carries over cleanly: pixel layers, groups, opacity, blend modes, layer masks, clipping, simple text as editable type, most adjustment layers and most layer styles. What turns into flat pixels: smart objects, vector shapes, and text with mixed styling. Open the file, read the import report, replace any missing fonts, then edit as normal. You will get PNG, JPG, WebP or PDF out; you will not get a PSD back.' },

      { t: 'h', text: 'What is inside a PSD' },
      { t: 'p', text: 'A PSD is a stack of layers with a set of instructions attached to each: position, opacity, blend mode, a mask, maybe a style like a drop shadow, maybe an adjustment such as curves that applies to everything below it. Some layers are plain pixels. Some are text, kept as words plus a font. Some are smart objects, which are other files embedded whole. Any editor that opens a PSD has to decide, layer by layer, whether it can rebuild the instruction or has to bake the result into pixels. The honest ones tell you which they did.' },

      { t: 'h', text: 'What carries over, and what does not' },
      { t: 'p', text: 'This is what the Voidcanvas Editor does with each kind of layer. Other applications draw the lines in different places; the categories are the ones to ask about whichever tool you use.' },
      { t: 'table', head: ['Kept and still editable', 'Kept, but changed so it would open', 'Not supported yet'], rows: [
        ['Pixel layers with position, opacity, fill opacity, visibility and colour labels', 'Text with mixed fonts, sizes or colours, warped text and text on a path: kept as pixels', 'Satin and pattern overlay effects'],
        ['Groups, including nested groups, with their blend mode and opacity', 'Smart objects and vector shapes: kept as pixels', 'Adjustment layers not in the list on the left'],
        ['Layer masks and clipping masks; locks; Photoshop artboards as boards', 'Blend modes the Editor does not have (linear burn, vivid light, pin light, dissolve and a few others): nearest match', 'Group masks; the black and white tint option'],
        ['Text as editable type when the whole layer uses one font, size and colour', '16-bit files become 8-bit; CMYK and other modes become RGB', ''],
        ['Adjustment layers: brightness/contrast, levels, curves, exposure, vibrance, hue/saturation, colour balance, black and white, photo filter, channel mixer, invert, posterize, threshold, gradient map', 'Gradient or pattern strokes become a solid colour; gradient overlays with more than two colours keep the first and last', ''],
        ['Layer styles: drop shadow, inner shadow, outer glow, inner glow, stroke, colour overlay, gradient overlay, bevel and emboss', 'An adjustment clipped to one layer is unclipped and affects everything below it', ''],
      ] },
      { t: 'p', text: 'Whenever anything lands in the second or third column, a report titled **Opened** and the file name lists it under **Kept**, **Changed so it would open** and **Not supported yet**. Read it before you edit. It is the difference between knowing the logo is now pixels and finding out when you try to recolour it.' },

      { t: 'h', text: 'Before you edit: two checks' },
      { t: 'steps', items: [
        '**Read the report.** Anything under Changed is now pixels or an approximation. If the thing you were asked to change is in that list (a smart-object logo, a warped headline), plan to rebuild it rather than edit it.',
        '**Fix the fonts.** If the file uses fonts that are not on your device or on Google Fonts, a **Some fonts are missing** dialog opens listing each font and how many layers use it. Pick a replacement, keep a stand-in for now, or **Add font file** to load the .ttf, .otf, .woff or .woff2 the designer sent. Added fonts are saved inside the design.',
      ] },
      { t: 'warn', text: 'Text set in a missing font is drawn in a stand-in until you fix it, and it will reflow: line breaks move and a headline can grow. Fix fonts first, then check every text layer against the original before you change anything else.' },

      { t: 'h', text: 'Doing the edit' },
      { t: 'p', text: 'Once the file is open with its fonts, the common jobs are the same as in Photoshop, and the tools have the same names.' },
      { t: 'list', items: [
        '**Change text:** double-click the text layer with the Type tool ({{T}}) and type. Font, size, colour, leading and tracking are in the **Character** panel. See [Add and style text](/learn/type).',
        '**Swap a photo:** place the new image as a layer ({{Ctrl+Shift+P}}), drag it into the same group as the old one, and if the old photo had a mask, copy the mask across or paint a new one. See [Masks](/learn/masks).',
        '**Recolour a flat element:** if it is still a shape or has a colour overlay style, change the colour there. If it arrived as pixels, use a **Hue/saturation** adjustment layer clipped to it, or select it with the **Magic wand** and fill.',
        '**Adjust the photo:** add adjustment layers rather than editing the pixels, so the original survives ([Adjustment layers](/learn/adjustment-layers)).',
        '**Resize for another format:** [Resize one design to every format](/learn/resize-to-every-format) adapts the layered file rather than stretching it. The workflow [Take a PSD from a colleague and adapt it for social](/learn/workflow-psd-to-social) does exactly this job end to end.',
      ] },

      { t: 'h', text: 'Getting a file back out' },
      { t: 'table', head: ['You need', 'Export', 'Notes'], rows: [
        ['A picture for web, social or a slide', 'PNG, JPG or WebP ({{Ctrl+E}})', 'PNG for transparency and sharp type; JPG or WebP for photos. See [Export for screens](/learn/export-for-screen).'],
        ['A file for a printer', 'PDF', 'One page, image based, RGB, sized at 300 dpi when the design is over 2000 px on its longest side. See [Export for print](/learn/export-for-print).'],
        ['To keep editing later, or hand layers to another Voidcanvas user', '.void or .void.png', 'The .void.png is a normal PNG preview with the whole layered project hidden inside it.'],
        ['A PSD back', 'not available', 'The Editor opens PSD but does not write it. See below.'],
      ] },

      { t: 'h', text: 'When someone wants a PSD back' },
      { t: 'p', text: 'Be clear early. If the deliverable is a picture (a post, a flyer, a banner), a PNG or PDF is the deliverable and nobody needs the PSD. If the client or agency genuinely needs an editable Photoshop file, either the edit belongs in Photoshop, or you deliver the flat exports plus a .void file and say so up front. What you should not do is promise a PSD and discover at the end that the tool cannot write one.' },

      { t: 'h', text: 'How to do it in Voidcanvas' },
      { t: 'steps', items: [
        'Open the [Editor](/editor) and press {{Ctrl+O}} (Cmd+O on a Mac), or drop the .psd on the start screen. The file is read in your browser; nothing is uploaded and the original is not changed.',
        'Read the **Opened** report if one appears, and settle **Some fonts are missing** if it appears.',
        'Edit. The Layers panel shows the same groups, masks, labels and locks as the original.',
        'Export: {{Ctrl+E}} for PNG, JPG, WebP or PDF. Choose **Save editable file** in the same dialog for a .void.png, or **File, Download project file (.void)**.',
      ] },
      { t: 'note', text: 'Photos larger than 4096 px on their longest side are scaled to 4096 on the way in, and very large PSDs open slowly because the Editor draws with the browser\'s 2D canvas. Password-protected PDFs will not open; PSDs are never password protected.' },
      { t: 'product', text: 'The Editor opens PSD files as real layered designs, reports anything it changed, matches fonts by name and lets you load the missing ones, and exports PNG, JPG, WebP and PDF. It does not write PSD, and it says so.', label: 'Open a PSD in the Editor', href: '/editor' },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**"Could not read that PSD."** The file may be damaged or use a feature the reader cannot handle. Ask for it to be saved again, or for a flattened copy.',
        '**"That PSD has no layers we can read."** It was saved without layers (Maximize Compatibility off, or flattened). Ask for a layered save.',
        '**Text shifted slightly.** Photoshop and browsers set type a little differently. Compare against a flat export of the original and nudge.',
        '**The logo will not recolour.** It was a smart object or a vector shape and is now pixels. Ask for the logo as SVG or PNG and place it fresh.',
        '**Colours look different.** The file was CMYK and has been converted to RGB. Check against the original\'s flat export and correct with an adjustment layer.',
      ] },

      { t: 'faq', items: [
        { q: 'Can I open a PSD without Photoshop for free?', a: 'Yes. The Voidcanvas Editor opens PSD files in the browser with no account, and keeps layers, groups, masks, text, adjustments and styles as far as it can, with a report of anything it changed.' },
        { q: 'Will the layers still be there?', a: 'Pixel layers, groups, masks, clipping, opacity and blend modes come through as layers. Smart objects and vector shapes come through as pixel layers. Text comes through as editable type when a layer uses one font, size and colour.' },
        { q: 'Can I save the file as a PSD again?', a: 'Not from Voidcanvas. Export PNG, JPG, WebP or PDF for delivery, and keep a .void file if you want to edit the layers later.' },
        { q: 'Does opening a PSD upload it?', a: 'No. The file is read on your device. See [Privacy and data](/learn/privacy-and-data).' },
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'make-your-design-look-less-generic',
    title: 'How to make a design look less generic',
    seoTitle: 'How to make a design look less generic (posters, flyers, posts)',
    summary: 'Why a poster, flyer or post reads as a template, and the six moves that fix it: a real type scale, one colour that leads, a cropped and treated photo, a grid with one focal point, texture from a process, and taking things away.',
    description: 'Six concrete moves that take a poster, flyer or social post from template to designed: type scale, one leading colour, a treated photo, a grid with a focal point, real texture, and restraint.',
    category: 'craft',
    level: 'Intermediate',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'cornerstone',
    feature: 'Editor · Guides, type and filters',
    goals: ['learn-design', 'make-a-poster', 'social-content'],
    answers: ['how to make my design look less generic', 'why does my design look amateur', 'how to make a poster look professional', 'design looks like a template', 'how to make a flyer look better', 'make a social post look designed', 'design tips to look professional'],
    related: ['typography-fundamentals', 'layout-and-composition', 'colour-that-works', 'workflow-textured-print-look'],
    keywords: 'generic template amateur professional poster flyer post hierarchy type scale one colour accent crop photo treatment grid focal point texture grain restraint',
    guide: {
      before: ['typography-fundamentals', 'layout-and-composition'],
      next: ['make-a-halftone-portrait', 'workflow-textured-print-look'],
      also: [{ when: 'the colour is the problem', slug: 'colour-that-works' }, { when: 'it is a brand, not one piece', slug: 'building-a-brand-identity' }],
    },
    body: [
      { t: 'answer', text: 'A design looks generic when nothing in it was decided: the layout came with the template, every element is the same size and importance, the colours are safe mid-tones, and the photo is used whole. Fix it with six decisions, in this order: set a real type scale so one thing is clearly biggest; let one colour lead and one accent answer it; crop the photo hard and give it a treatment; put everything on a grid with a single focal point and real margins; add texture from an actual process rather than a filter preset; then remove a third of what is left. Each move is below, with where to do it in Voidcanvas.' },

      { t: 'h', text: 'Diagnose it first' },
      { t: 'p', text: 'Look at the piece from across the room, or shrink it to a thumbnail. Ask five questions. Every yes is a specific fix, and the fixes are the sections below.' },
      { t: 'checklist', items: [
        'Is the biggest text less than twice the size of the next biggest? (Type scale)',
        'Are there more than two colours doing equal work? (One colour leads)',
        'Is the photo used at its original crop, with the subject in the middle? (Crop and treat)',
        'Is everything centred, or does nothing line up with anything else? (Grid and focal point)',
        'Is every surface perfectly flat and every edge perfectly clean? (Texture)',
      ] },

      { t: 'h', text: 'Move 1: a real type scale' },
      { t: 'p', text: 'Templates set headings about 30 per cent bigger than body text, which reads as timid. A designed piece has a scale: each level is a fixed ratio bigger than the one below, and the top level is many times the body. For a poster, a ratio of 1.5 or more and a headline eight to twelve times the small print is normal. Try it below: the same words, and only the ratio changes.' },
      { t: 'demo', kind: 'type-scale', caption: 'The ratio changes how much hierarchy the page has. Posters and covers want 1.5 and above; documents and interfaces want 1.2 to 1.25.' },
      { t: 'p', text: 'Two more rules that separate set type from typed text. Tighten headlines: large type looks loose by default, and about -0.025 em (in Voidcanvas, tracking in pixels, so about -2.4 px at 96 px) makes it look deliberate. And use one family with several weights before you reach for a second font. [Typography fundamentals](/learn/typography-fundamentals) has the numbers for measure, leading and pairing.' },

      { t: 'h', text: 'Move 2: one colour leads' },
      { t: 'p', text: 'Generic palettes are three or four mid-saturation colours sharing the work. Designed palettes have a hierarchy too: one colour owns the piece (60 to 70 per cent of the surface, often as the background), a neutral carries the text, and one accent appears in two or three small places, so the eye goes there. The accent works because it is rare. If you are unsure, take the accent from the photo with the eyedropper and make the leading colour a deep or pale version of it.' },
      { t: 'p', text: 'Contrast is part of this. Text on a mid-tone background is the surest sign of a template. Put text on the darkest or lightest colour you have, and check it: the brand guideline builder in Studio flags text and background pairs that fail WCAG contrast. [Colour that works](/learn/colour-that-works) covers ramps and the screen-to-print gap.' },

      { t: 'h', text: 'Move 3: crop the photo and treat it' },
      { t: 'p', text: 'A photo placed whole, subject centred, with the sky and the floor still in it, is a snapshot. Three things make it a design element. **Crop** until the subject fills the frame or is cut by its edge; a face cropped at the forehead is more confident than a whole head with air above it. **Treat** it so it matches the palette: a duotone in the leading colour and the neutral, a black and white with lifted contrast, or a coarse [halftone](/learn/make-a-halftone-portrait). **Place** it so it touches at least one edge of the page, or sits in one cell of the grid, not floating in the middle.' },
      { t: 'p', text: 'If the photo is small or poor, the treatment is the rescue: a halftone or a heavy duotone turns low resolution into a style.' },

      { t: 'h', text: 'Move 4: a grid and one focal point' },
      { t: 'p', text: 'Centre everything and the page has no tension; align nothing and it has no order. A grid gives both. Divide the page into columns (four or six is enough for a poster), set generous margins (a tenth of the page width is a good start), and align every element to a column edge. Then choose the one thing the eye should land on and make it the largest, the highest contrast and the loneliest element on the page. Everything else is smaller, quieter and grouped away from it. Empty space is not wasted; it is what makes the focal point a focal point.' },
      { t: 'p', text: 'Asymmetry is the cheapest trick in the book and it works: headline top left, facts bottom right, photo bleeding off one edge. [Layout and composition](/learn/layout-and-composition) goes deeper on reading order and balance.' },

      { t: 'h', text: 'Move 5: texture from a process' },
      { t: 'p', text: 'Perfectly flat colour and perfectly crisp edges are what software produces by default, and the eye reads them as software. Real print has grain, slight misregistration, ink that is denser in some places. Borrow one of those, lightly. A film grain at low opacity over the whole piece; a halftone on the photo only; a second colour shifted by two pixels behind a headline. One texture, used consistently, is a style. Three textures is noise. The workflow [Make a risograph or screen-print look](/learn/workflow-textured-print-look) builds a full example.' },

      { t: 'h', text: 'Move 6: take a third away' },
      { t: 'p', text: 'When the first five moves are done, the piece usually still has too much on it: a second logo, a tagline nobody asked for, a decorative shape, a third weight of type. Remove things until removing the next one would lose information. Templates add; designers subtract. The white space you get back is what makes it look expensive.' },

      { t: 'h', text: 'How to do it in Voidcanvas' },
      { t: 'steps', items: [
        '**Grid:** choose **View, New guide layout…** and set the columns, gutter and margins. Snap is on by default, so layers land on the guides.',
        '**Type scale:** in Studio\'s **Brand guideline builder**, the **Type** tab sets a scale (Minor third to Golden ratio) and a base size and lists every step in pixels. In the Editor, set sizes in the **Character** panel and tighten headlines with **Tracking** in pixels.',
        '**Colour:** save the leading colour, neutral and accent as swatches, or as a [brand kit](/learn/brand-kit) so every piece in the series uses the same three.',
        '**Photo treatment:** add a **Black and white** or **Curves** adjustment layer, then **Filter, Filter gallery…** for **Duotone**, **Halftone** or **Film Grain** as an editable layer you can fade or mask. See [Filters in the Editor](/learn/filters-in-the-editor).',
        '**Texture:** put **Film Grain** or **Noise** as a filter layer at the top of the stack and lower its opacity until you only notice it when you switch it off (hold {{\\}} for the before view).',
        '**Restraint:** hide layers with the eye icon rather than deleting them, look at the result, and delete only what you did not miss.',
      ] },
      { t: 'product', text: 'Guides, a type scale, a saved palette and editable filter layers are the tools that make these six moves quick to try and easy to undo. The Editor and Studio run in the browser, free, with your files on your device.', label: 'Open the Editor', href: '/editor' },

      { t: 'h', text: 'Common mistakes' },
      { t: 'list', items: [
        '**Adding a texture to hide weak layout.** Do the grid and the scale first; texture on a generic layout is a generic layout with grain.',
        '**Two accents.** If two colours are rare and bright, neither is the accent. Pick one.',
        '**Cropping the photo, then centring it.** Cropping gives you a strong element; centring throws away the strength. Put it against an edge.',
        '**A scale with too many steps.** Three or four sizes on a poster. Every extra size makes the hierarchy flatter.',
        '**Trusting the zoomed-out view.** Check type sizes at real size, or print a page of it.',
      ] },

      { t: 'h', text: 'Quick checklist' },
      { t: 'checklist', items: [
        'Headline at least four times the small print; a ratio of 1.5 or more on posters.',
        'One leading colour, one neutral, one accent used two or three times.',
        'Photo cropped hard, treated to match the palette, touching an edge or a grid cell.',
        'Columns and margins set; one focal point; everything else grouped away from it.',
        'One texture, at low opacity, consistent across the series.',
        'A third of the elements removed since the first draft.',
      ] },

      { t: 'faq', items: [
        { q: 'Why does my design look amateur even though it is neat?', a: 'Neatness is not hierarchy. If every element is similar in size, weight and colour, the eye has nowhere to start, and that reads as amateur even when nothing is misaligned. Make one thing clearly dominant and everything else clearly secondary.' },
        { q: 'Is using a template always generic?', a: 'No. A template is a grid and a scale someone else set, which is a fine start. It becomes generic when you keep the template\'s photo crop, its three colours and its decorative shapes. Change the photo treatment, reduce the palette and remove the decoration, and the template disappears.' },
        { q: 'How many fonts should a poster use?', a: 'One family with two or three weights covers nearly every poster. A second family is for contrast of structure (a serif headline over a sans body), not for variety.' },
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },
]
