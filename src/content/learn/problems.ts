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
      before: ['poster-design-rules', 'image-resolution-explained'],
      next: ['workflow-event-poster', 'export-for-print'],
      also: [{ when: 'you are not sure 300 dpi is right for the size', slug: 'what-dpi-should-a-poster-be' }, { when: 'the printer asked for CMYK', slug: 'rgb-or-cmyk-for-print' }, { when: 'you want the halftone poster look', slug: 'make-a-halftone-portrait' }, { when: 'it is an A5 flyer rather than a poster', slug: 'workflow-print-flyer' }],
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
        'Add guides for the trim and the safe area: **View, Guides, New guide…** at 36 px from each edge for the trim, and again at 95 px (36 + 59) for the safe area. **View, Guides, New guide layout…** puts a column grid inside them if you want one.',
        'Design. Run the background and photos to the outer edge of the canvas. Keep type inside the inner guides. Check photos at 100 per cent with {{Ctrl+1}} (Cmd+1 on a Mac).',
        'Export with {{Ctrl+E}} and choose **PDF**. Because the design is over 2000 px on its longest side, the page is sized at 300 dpi, so an A3 with bleed comes out at 303 × 426 mm. Leave **Size** at 1× and **Quality** high.',
        'Send the PDF with the note: "RGB, 300 dpi, 3 mm bleed included, no crop marks."',
      ] },
      { t: 'warn', text: 'The Editor\'s PDF is one page holding your design as a high-quality image, flattened onto white, in RGB. It adds no bleed or crop marks of its own, which is why steps 2 and 3 exist. Type is rendered to pixels at 300 dpi, so it prints as it looks on screen but is not selectable. Details in [Export for print](/learn/export-for-print).' },
      { t: 'h3', text: 'In Studio' },
      { t: 'steps', items: [
        'Open a job and, on the **Brief** tab, add a print format: **A3 poster** (300 dpi), **Poster 18 × 24 in** (2700 × 3600, which is 150 dpi) or **A4 flyer** (300 dpi). Each knows its size in millimetres.',
        'Build the design on the **Key visual** tab.',
        'On **Deliver**, tick **Print PDF** and choose **Build the package**. The PDF is at trim size with 3 mm bleed made by extending the artwork\'s edges, crop marks outside the bleed, TrimBox and BleedBox set for the printer\'s software, and a slug line recording the job, version, size, bleed and that the file is RGB.',
      ] },
      { t: 'note', text: 'Studio\'s bleed repeats the edge pixels outwards. That is clean for flat colour and simple backgrounds. For a detailed photo running off the edge, design the photo 3 mm larger in the Editor route instead.' },
      { t: 'product', text: 'Both routes run in the browser and the file never leaves your device. The Editor\'s print presets are at 300 dpi, its PDF is sized at 300 dpi for anything over 2000 px, and the guides above are the only setup a poster needs.', label: 'Start a poster in the Editor', href: '/editor?preset=poster' },

      { t: 'h', text: 'Common mistakes' },
      { t: 'list', items: [
        '**Designing at screen size and scaling up.** A 1080 px social post enlarged to A3 is 92 dpi. Start at the print size.',
        '**Adding bleed by stretching the finished design.** That moves the safe area and enlarges the photos. Add canvas, then extend the background.',
        '**White hairline on one edge of the printed poster.** No bleed, or the background stopped at the trim.',
        '**Colours came back dull.** Expected for bright RGB. Ask for a proof next time, and see the colour section above.',
        '**The PDF opened at the wrong size.** In the Editor, a design 2000 px or smaller on its longest side is treated as a screen document at 96 dpi. Posters are always bigger than that; business cards are not.',
        '**Very large sizes do not fit.** New designs stop at 8000 px a side, so an A1 or A0 cannot be started at 300 dpi (an A1 would be 7016 × 9933, about 70 megapixels, more than a browser can export at 1×). Use 150 dpi for A1 and above, which is right for them anyway.',
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
      also: [{ when: 'it is going on a shirt', slug: 'halftone-for-screen-printing-and-dtf' }, { when: 'you want dots as a background', slug: 'make-a-halftone-gradient-background' }, { when: 'you want the full comic look', slug: 'make-a-comic-book-effect' }, { when: 'it is going on a printed poster', slug: 'prepare-a-poster-for-print' }, { when: 'you want every setting of every effect', slug: 'artistic-effects' }],
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
      { t: 'p', text: 'Dot size is really grid spacing, and the right spacing depends on the output size, not on how it looks zoomed out on screen. In Voidcanvas the **Dot Size** slider runs from 10 to 100 and sets a cell of about Dot Size ÷ 8 pixels on the preview, which is at most 1200 px on the long edge (so 40 gives a 5 px cell, 80 a 10 px cell). When you export or download, the setting is scaled with the image so the result looks like the preview: the cell in the final file is Dot Size ÷ 8 on images up to 1200 px (a 1080 px post, say), and about **Dot Size ÷ 8 × long side ÷ 1200** on bigger ones: on a 4800 px print file, Dot Size ÷ 2.' },
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
        '**Coloured dots on coloured paper:** add a **Gradient map** adjustment above the halftone with two stops. The first stop colours the dots, the second colours the paper.',
        '**Dots over the photo:** set the halftone layer itself to **Multiply**. Its white drops out and the photo shows between the dots, a softer look than pure dots.',
      ] },
      { t: 'p', text: 'Blend modes are explained in [Blend modes and opacity](/learn/blend-modes-and-opacity).' },

      { t: 'h', text: 'Variations' },
      { t: 'list', items: [
        '**Two-tone poster:** Halftone at a coarse setting, then a Gradient map above it with a deep colour and a pale one.',
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
        { q: 'What are the best halftone settings for screen printing?', a: 'Ask the printer for their line count (lpi) and make the halftone at the final size at 300 dpi with a cell that matches it: cell in pixels = 300 ÷ lpi, so 45 lpi is about 6.7 px. On a 3600 × 4800 px shirt file the cell is about Dot Size ÷ 2, so Dot Size 14 gives 7 px (43 lpi). The preview is drawn from a 1200 px copy, so measure the exported file. Keep Contrast so the shadows go solid; screens cannot hold very small dots. More in [Halftone for screen printing and DTF](/learn/halftone-for-screen-printing-and-dtf).' },
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
      also: [{ when: 'you are moving off Photoshop altogether', slug: 'coming-from-photoshop' }, { when: 'you are about to cancel the subscription', slug: 'leaving-creative-cloud-checklist' }, { when: 'the edit is mostly masks', slug: 'masks' }, { when: 'the text needs re-setting', slug: 'type' }],
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
        '**Recolour a flat element:** if it is still a shape or has a colour overlay style, change the colour there. If it arrived as pixels, add a **Colour overlay** layer style to it (it recolours only that layer and stays editable), or select it with the **Magic wand** and fill.',
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
        'Export: {{Ctrl+E}} for PNG, JPG, WebP or PDF. For a file that keeps the layers, **File, Download editable picture (.void.png)** or **File, Download project file (.void)**.',
      ] },
      { t: 'note', text: 'Photos larger than 4096 px on their longest side are scaled to 4096 on the way in, and very large PSDs open slowly because the Editor draws with the browser\'s 2D canvas. Password-protected PDFs will not open; PSDs are never password protected.' },
      { t: 'product', text: 'The Editor opens PSD files as real layered designs, reports anything it changed, matches fonts by name and lets you load the missing ones, and exports PNG, JPG, WebP and PDF. It does not write PSD, and it says so.', label: 'Open a PSD in the Editor', href: '/editor' },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**"Could not read that PSD."** The file is damaged, or saved in CMYK, Lab, Duotone or Multichannel, which the Editor cannot read yet. Ask for an RGB copy, saved again.',
        '**"That PSD has no layers or picture we can read."** Neither its layers nor its flattened picture could be read. Ask for it to be saved again with Maximize Compatibility on. (A flattened PSD opens as one layer.)',
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
      also: [{ when: 'the colour is the problem', slug: 'colour-that-works' }, { when: 'it is a poster', slug: 'poster-design-rules' }, { when: 'it is a brand, not one piece', slug: 'building-a-brand-identity' }],
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
        '**Grid:** choose **View, Guides, New guide layout…** and set the columns, gutter and margins. Snap is on by default, so layers land on the guides.',
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

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'printed-design-looks-blurry',
    title: 'Why your printed design looks blurry',
    seoTitle: 'Why your printed design looks blurry (and the three fixes)',
    summary: 'A design that looked sharp on screen came back soft from the printer. There are three causes, a one-minute way to find which one you have, and a fix for each. With a live comparison at print scale.',
    description: 'Printed design blurry? Three causes: an enlarged photo, a document set up at screen size, or a lossy export. How to check pixel size against print size in a minute, and what fixes each one.',
    category: 'craft',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'cornerstone',
    feature: 'Editor · Image size and print presets',
    goals: ['prepare-for-print', 'make-a-poster', 'edit-a-photo'],
    answers: ['why does my print look blurry', 'why does my printed design look blurry', 'printed image blurry', 'why is my poster blurry when printed', 'design looks pixelated when printed', 'image looks fine on screen but prints blurry', 'how to check if an image is high resolution enough to print', 'print came out soft', 'blurry flyer print'],
    related: ['image-resolution-explained', 'prepare-a-poster-for-print', 'crop-and-canvas', 'export-for-print'],
    keywords: 'blurry print pixelated soft resolution dpi ppi upscaled photo screen size 72 dpi jpg compression check 100 per cent image size',
    guide: {
      before: ['image-resolution-explained'],
      next: ['prepare-a-poster-for-print', 'export-for-print'],
      also: [{ when: 'the photo itself is the problem', slug: 'crop-and-canvas' }, { when: 'the design is going to social, not print', slug: 'export-for-screen' }],
    },
    body: [
      { t: 'answer', text: 'A print looks blurry for one of three reasons: a **photo was enlarged** past what its pixels can support, the **document was set up at screen size** (1080 px, 1920 px, 72 dpi) and then printed much larger, or the file was **exported small or as a heavy JPG**. Check in one minute: divide the design\'s pixel width by its printed width in inches. Under 150 and everything prints soft; 300 is what a printer wants for anything read up close. Then fix the cause: replace or shrink the photo, rebuild at the print size, or export a PDF or PNG at full size.' },
      { t: 'p', text: 'The frustrating part is that the screen never warned you. A monitor shows about 100 pixels per inch and a phone hides the rest, so a 1080 px image looks perfect at any zoom until it meets 300 dots per inch of ink. This page is the diagnosis and the three repairs, in the order that saves the most time.' },

      { t: 'h', text: 'See it at print scale' },
      { t: 'p', text: 'The close-up below is a 30 mm square of a poster as the press would see it. Switch the resolution to 72 dpi, which is what a design made at screen size amounts to, and watch the type and the small print go soft. That is what came back from the printer.' },
      { t: 'demo', kind: 'print-setup', caption: 'Simulated at print scale. The whole poster on the left always looks fine at this size, which is exactly why the problem is invisible until it is printed.' },

      { t: 'h', text: 'The one-minute check' },
      { t: 'steps', items: [
        'Find the pixel size of the design (in Voidcanvas, **Image, Image size…**, or the status bar). Write down the width, for example 1080.',
        'Find the printed width in inches. A4 is 8.27 in wide, A3 is 11.7 in, A5 is 5.83 in, a US letter is 8.5 in. Divide millimetres by 25.4 if you only have those.',
        'Divide pixels by inches. 1080 ÷ 11.7 = 92. That is the effective resolution in pixels per inch.',
        'Read the result: **300 or more** prints sharp at reading distance. **150 to 300** is fine for a poster on a wall. **Under 150** prints soft, and under 100 prints visibly blurry with jagged text.',
        'Do the same for the biggest photo in the design: its pixel width divided by the width it covers on paper. A 1200 px photo across an A4 page is 145 ppi; the same photo across a quarter of the page is 580 ppi and perfectly fine.',
      ] },
      { t: 'tip', text: 'Zoom to 100 per cent ({{Ctrl+1}} in the Editor; Cmd+1 on a Mac) and look at an edge in the photo. At 100 per cent one image pixel is one screen pixel, which is close to how paper will treat it at 300 dpi. If it is soft here, it is soft on paper.' },

      { t: 'h', text: 'Cause 1: a photo enlarged past its pixels' },
      { t: 'p', text: 'This is the most common one. The design itself was set up correctly at 300 dpi, but a photo saved from the web, a WhatsApp forward or a screenshot was dragged in and scaled up to fill the space. Enlarging invents pixels by blending neighbours; it never adds detail. Everything else on the page is crisp and the photo is mush, which is the giveaway.' },
      { t: 'list', items: [
        '**Fix: get the original.** Ask for the photo as it came off the camera or phone. A modern phone photo is 3000 to 4000 px wide and covers an A4 page at 300 dpi with room to spare. A WhatsApp forward has been shrunk to about 1200 px; ask for it sent as a document instead.',
        '**Fix: use less of it.** If no better file exists, place the photo smaller so its pixels are dense enough, and let colour or type carry the rest of the page.',
        '**Fix: make it a treatment.** A coarse [halftone](/learn/make-a-halftone-portrait), a duotone or a heavy crop turns low resolution into a style. Nobody asks whether a halftone was sharp.',
        '**Does not fix it: upscaling.** Enlarging in software, including with AI, smooths the softness and can invent detail that was never there. It can rescue a small shortfall for a poster read from a distance; it cannot make a 600 px web image into a flyer photo.',
      ] },

      { t: 'h', text: 'Cause 2: the document was set up at screen size' },
      { t: 'p', text: 'The design was made as a 1080 × 1350 social post, or a 1920 × 1080 slide, and then sent to print as an A4 flyer. Here everything is soft, text included, because the whole file has a quarter of the pixels the page needs. This also happens when a "72 dpi" document is set to the right size in inches but the pixel count was never raised.' },
      { t: 'list', items: [
        '**Fix: rebuild at the print size.** Start a new document at the print preset (A4 flyer is 2480 × 3508 px, A5 is 1748 × 2480, the 18 × 24 in poster is 5400 × 7200) and bring the layers across. Text and shapes drawn in the application are redrawn sharp at any size, so only the photos need attention, and see cause 1 for those.',
        '**Do not scale the finished design up.** Scaling a flat export enlarges every pixel; scaling the layered design keeps the type sharp but not the photos. Rebuilding sounds slower and is faster.',
        '**Check the dpi note is not fooling you.** The dpi stored in a file is a label, not detail. A 1080 px file at 300 dpi prints at 3.6 inches wide, sharp. The same file forced to A4 is 92 dpi. Only the pixels are real; [Image resolution explained](/learn/image-resolution-explained) covers this properly.',
      ] },

      { t: 'h', text: 'Cause 3: the export lost it' },
      { t: 'p', text: 'The document and photos were fine and the export threw the quality away: a JPG at low quality, a PNG exported at half size, a screenshot of the design, or a PDF made by a tool that downsampled the images. Type with soft, dirty edges and blocky patches in flat colour are the signs; blurry photos alone are not.' },
      { t: 'list', items: [
        '**Fix: export at 1× or larger, as PNG or PDF.** JPG compression is designed for photos and eats sharp edges first. For anything with type, PNG or a PDF at final size.',
        '**Fix: never send a screenshot or a phone photo of the design.** Both are resampled to the screen. Work from the source file.',
        '**Fix: check the PDF page size.** A PDF that opens at the wrong physical size will be scaled by the printer, and scaling up softens it. The page should equal the trim size plus bleed.',
      ] },

      { t: 'h', text: 'How Voidcanvas handles this' },
      { t: 'list', items: [
        '**Image size…** ({{Ctrl+Alt+I}}) shows the design\'s pixel size, roughly how many MB each layer takes, and what it prints at in centimetres at the **Resolution** you enter. Type 300 and read the print size; if it is smaller than the paper, you have cause 2.',
        'The **print presets** (A4 flyer, A5 flyer, Poster 18 × 24 in, Business card) are at 300 dpi, and a **Custom size** takes up to 8000 px a side.',
        '**Photos over 4096 px on their longest side are scaled to 4096 when imported.** That is enough for A4 at 300 dpi and A3 at about 248 dpi. For a photo that has to fill A2 or larger at full resolution, split it or accept 150 dpi, which is normal for posters read from a distance.',
        'Text and shapes are redrawn at export size, so a 2× or 3× export of type is crisp; photos are resampled and cannot gain detail.',
        '**Export as…** ({{Ctrl+E}}) offers PNG, JPG, WebP and PDF at 1×, 2×, 3× and 4×, as far as the browser can draw. For print, PDF at 1× from a print-size document, or PNG at 1×.',
      ] },
      { t: 'product', text: 'The Image size dialog answers the one-minute check for you, the presets are at 300 dpi, and the PDF export is sized at 300 dpi for anything over 2000 px. All in the browser, with the file on your device.', label: 'Check a design in the Editor', href: '/editor' },

      { t: 'h', text: 'Before you send it again' },
      { t: 'checklist', items: [
        'Pixel width ÷ printed inches is 300 or more (150 for a poster on a wall).',
        'Every photo checked at 100 per cent; none enlarged past about 120 per cent.',
        'The document was built at the print size, not scaled up from a screen size.',
        'Exported as PDF or PNG at 1× or larger; no JPG for anything with type.',
        'The PDF page size equals trim plus bleed, and the printer knows the file is RGB.',
      ] },

      { t: 'faq', items: [
        { q: 'Can I fix a blurry print by changing the dpi to 300?', a: 'No. Changing the dpi value changes the size the file prints at, not the amount of detail. A 1080 px wide file at 300 dpi prints sharp at 3.6 inches and soft at A4 whatever the label says. You need more pixels, which means a bigger original photo or a document built at the print size.' },
        { q: 'What resolution does a print need?', a: '300 pixels per inch at the final printed size for flyers, cards and anything read in the hand. 150 to 300 for posters read from a metre or two. Large-format printers often accept 100 to 150 for banners and ask for their own figure for billboards.' },
        { q: 'Why does the design look fine on my screen?', a: 'A screen shows roughly 100 pixels per inch and zooms the design to fit, so a 1080 px file always looks sharp there. Paper at 300 dpi needs three times the pixels per inch. Zooming to 100 per cent is the closest a screen gets to showing you the truth.' },
        { q: 'Will an AI upscaler fix it?', a: 'It can smooth a small shortfall for a poster seen from a distance. It invents detail rather than recovering it, so faces, text and logos can come out wrong. Get the original file first, and upscale only when there is no other option.' },
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'run-a-client-design-project',
    title: 'How to run a client design project',
    seoTitle: 'How to run a client design project (brief to delivery)',
    summary: 'A four-stage process for client work that does not end in final_final_v3: a brief that becomes a checklist, two or three directions with a recorded decision, numbered review rounds with pinned feedback, and a named delivery package.',
    description: 'Run a client design project in four stages: brief, directions, review, delivery. What each stage produces, where projects go wrong, how many options and rounds, and how Studio runs the same process.',
    category: 'studio',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'cornerstone',
    feature: 'Studio',
    goals: ['client-project'],
    answers: ['how to manage a client design project', 'how to manage design clients as a freelancer', 'client design process', 'freelance graphic design workflow', 'design project workflow', 'how many design options to show a client', 'how many revision rounds', 'how to handle client feedback on design', 'design project management for freelancers'],
    related: ['studio-overview', 'start-a-job-from-a-brief', 'directions-and-review', 'delivering-files'],
    keywords: 'client project freelance workflow brief directions review rounds revisions feedback approval delivery handover file naming versions process',
    guide: {
      next: ['studio-overview', 'start-a-job-from-a-brief'],
      also: [{ when: 'the job is a brand identity', slug: 'workflow-client-brand-guideline' }, { when: 'you want the client to comment without an account', slug: 'review-and-delivery-links' }, { when: 'you are at the delivery stage now', slug: 'delivering-files' }],
    },
    body: [
      { t: 'answer', text: 'Run every client job through the same four stages and make each one produce something you can point to. **Brief**: turn the client\'s words into a checklist and a list of deliverables with dates. **Directions**: show two or three distinct ideas, not one design, and record which they chose. **Review**: number every version, pin every comment to the place it refers to, and turn their reply into a to-do list before you touch the file. **Delivery**: hand over every format at full size, named consistently, with a note that says what is in the box. Most client problems are one of these stages skipped.' },
      { t: 'p', text: 'Design goes wrong in the gaps between the work: the brief that lived in three WhatsApp messages, the option the client "sort of liked", the feedback that arrived as a voice note, the file called final_v3_FINAL. None of that is design skill. It is process, and the process below is the smallest one that closes the gaps. You can run it with a notebook and folders; the last section shows how Studio runs it for you.' },

      { t: 'h', text: 'Stage 1: the brief becomes a checklist' },
      { t: 'p', text: 'Take whatever the client sent, in their words, and pull out two lists before you design anything. The first is **what must appear**: headline, date, time, venue, price, contacts, sponsor logos, the thing they said twice. The second is **what you owe**: every format (Instagram post, story, A3 poster) with its size and its due date. Send both lists back in one message: "Here is what I read; tell me what is missing." That message is the cheapest correction you will ever make.' },
      { t: 'list', items: [
        'Keep the client\'s original text. When a detail is disputed later, the brief settles it.',
        'Put deadlines against formats, not against the job. The story is needed Friday; the poster can wait for the printer.',
        'Ask for the brand assets now: logo files, fonts, colours, any guideline. Do not start with a logo screenshot.',
        'If they have no brief, write one from a ten-minute call and send it for a yes. [Start a job from the client\'s brief](/learn/start-a-job-from-a-brief) shows what a good one contains.',
      ] },

      { t: 'h', text: 'Stage 2: directions, and a decision' },
      { t: 'p', text: 'Clients choose better between two or three clear ideas than they react to one finished design. A direction is not a full design: it is a mood board with a sentence, a palette, a type pairing and a handful of references, presented as a page. Three is the right number. One gives them nothing to compare; four means you have not decided either.' },
      { t: 'list', items: [
        'Name each direction and give it one line: "Night heat: warm neon on deep indigo, big condensed type, grain."',
        'Make the three different in kind, not in shade. If two directions share a palette, merge them.',
        'Present them in one sitting, in order, and ask for a choice at the end of the meeting. A choice by email a week later is usually no choice.',
        '**Record the decision** in writing, with the date, before you design. "You chose B" in a message is enough, and it ends the "we never agreed that" conversation before it starts.',
      ] },
      { t: 'p', text: '[Present directions and run review rounds](/learn/directions-and-review) covers the board, the presentation and how the choice carries into the design.' },

      { t: 'h', text: 'Stage 3: review rounds with a record' },
      { t: 'p', text: 'Every time you show the client something, it gets a number: v1, v2, v3. Every comment is pinned to the place on the design it refers to, and every reply from the client is turned into a checklist before you open the file. That checklist is what you tick off, and it is what you send back: "Changes in v3: 1, 2, 3." The client sees their words became work, and neither of you re-litigates the last round.' },
      { t: 'table', head: ['Problem', 'Cause', 'Rule'], rows: [
        ['Endless rounds', 'No agreed number', 'Two rounds of changes are in the price. Say so in the quote, not in round three.'],
        ['Feedback from five people', 'No single voice', 'One person collects and sends the feedback. You reply to that person.'],
        ['"Make it pop"', 'A feeling, not a change', 'Ask what they would compare it to, or offer two concrete moves and let them pick.'],
        ['Changes to approved things', 'Approval was verbal', 'Set the version to Approved in writing. Later changes start a new version, and a new round.'],
        ['The wrong version got printed', 'Files named by feeling', 'Version numbers on every file and every message, so v3 is v3 everywhere.'],
      ] },
      { t: 'p', text: 'Show work in context when you can. A poster on a wall or a post on a phone screen gets a faster, calmer decision than a flat rectangle on white.' },

      { t: 'h', text: 'Stage 4: a delivery they can use without you' },
      { t: 'p', text: 'Delivery is one package, built from the approved version, containing every format at full size in the file types each one needs: PNG and JPG for screens, a print PDF with bleed and crop marks for the printer. Name every file the same way, **client_job_format_version**, so the folder sorts itself and the version number matches the round that was approved. Include a short note: what each file is for, the pixel and paper sizes, the fonts used, and what to tell the printer. A client who can find the right file in six months without emailing you is the best marketing you will get.' },
      { t: 'p', text: '[Deliver every format, named and ready for the printer](/learn/delivering-files) has the naming scheme, the print PDF details and the delivery note.' },

      { t: 'h', text: 'How to do it in Voidcanvas' },
      { t: 'p', text: 'Studio is built around exactly these four stages. A job has six tabs in the order the work happens, a **Next** bar that names the one thing to do, and a status (Direction, Design, Review, Delivered) that moves forward on its own.' },
      { t: 'steps', items: [
        '**Brief tab.** Press **Start a job** and paste the client\'s words. Studio reads the headline, date, time, venue, price, contacts and must-haves into a checklist the Editor keeps, and lists the formats the brief names under **The brief mentions**. Add due dates per format and pick the client\'s brand.',
        '**References and Directions tabs.** Drop in references, then sort them into **Direction A, B and C** frames with a name, a line, a palette and a type pairing each. **Present** shows them full screen; **PDF** and **WhatsApp images** send them. When the client picks, press **Client chose this one**: the job moves to Design and that palette and type seed the design.',
        '**Key visual tab.** **Start key visual in the Editor** opens a design at the master format with the brief as a checklist in the **Brief** panel, then **Build N missing formats** lays out every other size from it.',
        '**Review tab.** **New version from the design** saves v1, v2, v3. Drop pins where the client pointed, paste their message into **Client\'s reply** and press **Turn into a checklist**. Set the version to **Sent**, **Changes asked** or **Approved**. **Compare** and **Mockups** put the work in context. **Send a review link** lets the client pin comments and approve in their browser with no account (you need one; the images and comments are encrypted with a key that lives in the link).',
        '**Deliver tab.** Tick the file types per format and press **Build the package**. Every file is named client_job_format_version, print PDFs carry 3 mm bleed, crop marks and a slug line, and a delivery note lists what is in the zip. **Send as a link** gives the client a download page instead (you need an account for links; the client does not).',
      ] },
      { t: 'product', text: 'Studio keeps the brief, the directions, the decision, every version and every comment with the job, on your device, and builds the delivery with the latest version\'s number and a note of the approved ones. The Editor is one click away at every stage.', label: 'Start a job in Studio', href: '/studio' },

      { t: 'h', text: 'Common mistakes' },
      { t: 'list', items: [
        '**Designing from the first message.** Send the two lists back first. Ten minutes now saves a round later.',
        '**One option, polished.** They cannot say what they want until they see what they do not. Show three directions before one design.',
        '**Feedback in your head.** If it is not written down and numbered, it will come back.',
        '**Delivering the working file.** Deliver finished formats and a note. Send editable files only when the contract says so, and say what tool opens them.',
        '**No end.** Set the number of rounds, mark the approved version, and call the job delivered. Anything after that is a new job.',
      ] },

      { t: 'faq', items: [
        { q: 'How many design options should I show a client?', a: 'Two or three directions, presented together, different in kind rather than shade. One design gives them nothing to compare; more than three means the decision has been pushed to them.' },
        { q: 'How many rounds of revisions are normal?', a: 'Two rounds of changes after the first version is the usual freelance quote. Put the number in the quote, mark the approved version in writing, and treat changes after approval as a new round or a new job.' },
        { q: 'What files should I deliver to a client?', a: 'Every format at full size in the file types it needs: PNG and JPG for screens, a print PDF with bleed and crop marks for the printer, all named the same way with the version number, plus a short note listing what each file is for, the sizes and the fonts used.' },
        { q: 'How do I get usable feedback instead of "make it pop"?', a: 'Ask them to point at the place and say what they would compare it to, offer two concrete moves and let them pick, and turn every reply into a numbered checklist you send back with the next version.' },
      ] },
      { t: 'try', label: 'Open Studio', href: '/studio' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'make-a-risograph-effect',
    title: 'How to make a risograph effect',
    seoTitle: 'How to make a risograph effect (no Photoshop, live example)',
    summary: 'What makes a risograph print look the way it does, the five moves that fake it in any layered editor (limited inks, halftone, translucent overprint, misregistration, grain), the classic ink pairs, and the route in Voidcanvas with a live duotone to start from.',
    description: 'Make a risograph effect from a photo: two flat inks, a halftone, translucent overprint, a small misregistration and grain. The five moves in any editor, riso colour pairs, and the browser route.',
    category: 'effects',
    level: 'Intermediate',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'cornerstone',
    feature: 'Effects · Halftone, Duotone, Film Grain',
    goals: ['design-effects', 'make-a-poster'],
    answers: ['how to make a risograph effect', 'risograph effect online', 'riso effect without photoshop', 'how to make a riso print look', 'risograph texture', 'misregistration effect', 'how to make a risograph effect in canva', 'riso colours', 'screen print effect from a photo'],
    related: ['workflow-textured-print-look', 'make-a-halftone-portrait', 'colour-effects', 'blend-modes-and-opacity'],
    keywords: 'risograph riso effect print look two colour inks fluorescent pink blue overprint multiply misregistration offset halftone grain paper texture zine poster',
    guide: {
      before: ['make-a-halftone-portrait'],
      next: ['workflow-textured-print-look', 'blend-modes-and-opacity'],
      also: [{ when: 'it is going to a real printer', slug: 'designing-for-print' }, { when: 'you want every effect and its settings', slug: 'colour-effects' }],
    },
    body: [
      { t: 'answer', text: 'A risograph look is five things stacked: **two or three flat ink colours** instead of full colour, tone made of **visible dots** (a halftone), inks that **darken where they overlap** because they are translucent, layers slightly **out of register**, and **grain** with the paper showing through. To fake it from a photo: convert the photo to a halftone, map it to one ink on a paper colour with a duotone, set type and shapes in a second ink on Multiply, nudge one ink a few pixels off, and lay a light grain over everything. Start with the duotone below; the full recipe follows.' },
      { t: 'demo', kind: 'effect', effect: 'duotone', caption: 'Duotone is the ink-on-paper step: shadows become the ink, highlights become the paper. Try a fluorescent pink shadow on a warm off-white, or a deep blue on cream. The halftone, overprint and grain come next.' },

      { t: 'h', text: 'What makes a riso look like a riso' },
      { t: 'p', text: 'A risograph is a stencil duplicator: one drum per ink, one pass per colour, soy-based ink pushed through a master onto uncoated paper. Every quirk of the look comes from that mechanism, which is why filters that add "riso texture" to a full-colour photo never convince.' },
      { t: 'table', head: ['Quality', 'Where it comes from', 'How to fake it'], rows: [
        ['Few, flat colours', 'One drum per ink; most prints are one to three colours', 'Duotone (one ink plus paper), then a second ink for type and shapes'],
        ['Visible dots in the photo', 'The master screens the image into dots', 'Halftone before the duotone, coarse enough to see'],
        ['Darker colour where inks cross', 'Inks are translucent, so overprints mix', 'Multiply blend mode on every ink layer'],
        ['Slight misalignment', 'Each pass is fed separately; registration drifts', 'Duplicate a layer in the other ink and nudge it 3 to 6 px'],
        ['Grain and speckle', 'Ink on uncoated paper, uneven coverage', 'Film grain at low opacity over the whole design'],
        ['Warm, not white', 'Paper stock is usually cream or coloured', 'Set the duotone highlight to an off-white or the paper colour'],
      ] },

      { t: 'h', text: 'Pick the inks' },
      { t: 'p', text: 'Real riso inks are a fixed set, and the recognisable pairs are recognisable because they are those inks. Working from the classics keeps the result honest.' },
      { t: 'table', head: ['Pair', 'Ink 1', 'Ink 2', 'Paper', 'Feels'], rows: [
        ['The classic', 'Fluorescent pink #FF48B0', 'Blue #0078BF', 'Warm white #F4EFE6', 'Zines, gig posters. Overprint goes purple.'],
        ['Warm', 'Red #FF665E', 'Teal #00838A', 'Cream #F6F0DC', 'Food, summer, markets. Overprint goes dark brown.'],
        ['Cool', 'Federal blue #3D5588', 'Yellow #FFE800', 'White #F7F7F2', 'Editorial, posters. Overprint goes green.'],
        ['Quiet', 'Black #000000', 'Orange #FF6C2F', 'Kraft #D9C4A3', 'One ink plus a spot colour on brown paper.'],
      ] },
      { t: 'p', text: 'One ink carries the photo; the other carries type and shapes. The paper colour is the lightest thing on the page, so nothing should be pure white.' },

      { t: 'h', text: 'The five moves, in any layered editor' },
      { t: 'steps', items: [
        '**Prepare the photo.** Crop tight, convert to black and white, and push the contrast so the highlights go nearly white and the shadows nearly black. Flat photos make grey, muddy dots.',
        '**Halftone it.** Turn the tone into dots at the size you will see it: fine for a screen, coarser for a poster (0.5 to 1 mm dots on paper). [How to make a halftone portrait](/learn/make-a-halftone-portrait) has the sizes.',
        '**Ink it.** Map the halftone to one ink on the paper colour with a duotone: shadows to the ink, highlights to the paper. This is the layer the whole design sits on.',
        '**Overprint the second ink.** Set the headline, shapes or a second image in the other ink and set that layer to Multiply. Where it crosses the first ink, the two darken into a third colour, exactly as translucent inks do.',
        '**Knock it out of register, then add grain.** Duplicate a type or shape layer, recolour the copy in the first ink, keep it on Multiply and nudge it 3 to 6 px. Finish with a light film grain over the whole stack so the photo, the ink and the type share one texture.',
      ] },
      { t: 'warn', text: 'Keep the offset small. At 300 dpi, 6 px is half a millimetre: enough to read as printed, not enough to read as a mistake. Two or three misregistered elements are plenty; misregister everything and it looks broken rather than printed.' },

      { t: 'h', text: 'How to do it in Voidcanvas' },
      { t: 'h3', text: 'Quick: one image, no type' },
      { t: 'steps', items: [
        'Open [Effects](/effects) and drop in the photo. In the **Effects** panel choose **Artistic**, then **Halftone**, and set **Dot Size** and **Contrast** under **Parameters**.',
        'Press **Open in Editor**. The photo arrives with the halftone as a live filter layer.',
        'Choose **Filter, Colour, Duotone**, above the Halftone layer, and set **Shadow Color** to your ink and **Highlight Color** to your paper colour.',
        'Choose **Filter, Enhance, Film Grain**, keep **Amount** low, and lower the layer\'s **Opacity** if it is too strong. Export as PNG.',
      ] },
      { t: 'h3', text: 'Full: a poster with type in two inks' },
      { t: 'p', text: 'The complete recipe at print size, with the second ink on Multiply, the duplicate nudged out of register, the grain over everything and a PDF at the end, is the workflow [Make a risograph or screen-print look with Effects and the Editor](/learn/workflow-textured-print-look). It uses the same five moves with every menu named.' },
      { t: 'product', text: 'Halftone, Duotone, Film Grain and RGB Shift are live filter layers in the Editor, so every part of the look stays adjustable, and the Effects page lets you find the settings first on a preview. It runs in the browser and the photo stays on your device.', label: 'Open Effects', href: '/effects' },

      { t: 'h', text: 'Common mistakes' },
      { t: 'list', items: [
        '**Full-colour photo with grain on top.** That is a filter, not a riso. Reduce to one ink first.',
        '**Pure white paper.** Set the duotone highlight to cream or off-white; white kills the print feel.',
        '**Inks on Normal.** Without Multiply the overlap does not darken and the second ink looks pasted on.',
        '**Everything misregistered.** One or two elements, a few pixels. More reads as an error.',
        '**Halftone too fine for print.** Dots that vanish on screen also vanish on paper, and the image goes solid.',
      ] },

      { t: 'faq', items: [
        { q: 'Does this make files for a real risograph printer?', a: 'No. A riso printer needs one greyscale file per ink (the separations). This recipe makes the look in one flat file for screens or ordinary printing. To print on a real riso, ask the print shop how they want the separations and build each ink as its own black-and-white layer.' },
        { q: 'What colours are risograph inks?', a: 'A fixed set from the manufacturer, of which the best known are fluorescent pink, blue, red, teal, green, yellow, federal blue, orange and black. The pairs in the table above use their approximate hex values.' },
        { q: 'Risograph or screen print: is the effect different?', a: 'They share dots, flat inks, overprint and misregistration. Screen prints tend to have cleaner, more solid ink and coarser dots; riso has more speckle, more paper showing through and a softer edge. Raise the grain and lower the ink opacity slightly for riso; lower the grain and use a coarser halftone for screen print.' },
      ] },
      { t: 'try', label: 'Open Effects', href: '/effects' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'photo-editor-that-does-not-upload',
    title: 'Photo editors that do not upload your photos: how to tell',
    seoTitle: 'Photo editors that don\'t upload your photos: how to check',
    summary: 'What "online" and "private" actually mean for an image editor, a two-minute test that shows whether a web tool sends your photo to a server, what a privacy page should say, and exactly what Voidcanvas does and does not send.',
    description: 'How to check whether an online photo editor uploads your images: the network test, the offline test, and what a privacy page must say. Plus the exact list of what Voidcanvas sends.',
    category: 'help',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'cornerstone',
    feature: 'Privacy · On-device processing',
    goals: ['private-and-offline', 'edit-a-photo'],
    answers: ['photo editor that doesn\'t upload your photos', 'private photo editor', 'does an online photo editor upload my photos', 'photo editor no upload', 'how to check if a website uploads my image', 'secure photo editor for client work', 'image editor that works offline in the browser', 'edit photos without uploading them', 'is my photo sent to a server'],
    related: ['privacy-and-data', 'ai-on-this-device', 'private-session', 'install-as-an-app'],
    keywords: 'privacy upload server on device local browser network tab devtools offline test nda client photos confidential gdpr private session no account no cloud',
    guide: {
      next: ['privacy-and-data', 'ai-on-this-device'],
      also: [{ when: 'you share a computer', slug: 'private-session' }, { when: 'you want it to work with no connection at all', slug: 'offline-design-software' }, { when: 'you want to know where the files are kept', slug: 'saving-and-your-files' }],
    },
    body: [
      { t: 'answer', text: '"Online photo editor" says where the app came from, not where your photo goes. Most web editors send the image to their servers to process it; a few do the work inside your browser and send nothing. You can tell in two minutes: open the browser\'s developer tools on the Network tab, load a photo into the editor and apply an edit, and look for a request roughly the size of your photo leaving the page. Then switch the browser to offline and try the same edit. A tool that keeps working offline and sends nothing the size of your image is processing on your device. Voidcanvas is built that way, and the exact list of what it does send is below.' },

      { t: 'h', text: 'Three things "private" can mean' },
      { t: 'table', head: ['Claim', 'What it usually means', 'What to check'], rows: [
        ['"Your photos are safe" or "encrypted in transit"', 'The photo is uploaded, over HTTPS, and processed on their server', 'The privacy policy: how long they keep it, who processes it, whether it trains a model'],
        ['"We delete your files after 24 hours"', 'The photo is uploaded and stored for a while', 'Whether "delete" includes backups and logs; usually not stated'],
        ['"Processed in your browser" or "on your device"', 'The pixels never leave your computer; only the app code is downloaded', 'The network test below. If it is true, the test shows nothing leaving'],
      ] },
      { t: 'p', text: 'Only the third is private in the sense most people mean. It matters when the photo is a client\'s unreleased product, a person who did not consent to a cloud upload, a medical or legal document, or simply yours.' },

      { t: 'h', text: 'The two-minute test' },
      { t: 'h3', text: 'Test 1: watch the network' },
      { t: 'steps', items: [
        'Open the editor in Chrome, Edge or Firefox. Press **F12** (or Cmd+Option+I on a Mac) and choose the **Network** tab. Clear the list with the clear button, and tick the option to preserve or persist the log if it is offered.',
        'Load a photo into the editor. Watch the list. A request that **sends** data (POST or PUT) with a size close to your photo\'s file size means the photo went up. Downloads of scripts, fonts and images from the tool\'s own domain are the app loading, not your photo leaving.',
        'Apply an edit: a filter, a background removal, a resize. Watch again. If the edit triggers a send and then a download of a new image, the processing happened on a server.',
        'Sort by size if the list is long. Your photo is usually the largest thing that leaves, and it is easy to spot.',
      ] },
      { t: 'h3', text: 'Test 2: pull the plug' },
      { t: 'steps', items: [
        'With the editor open and a photo loaded, set the Network tab\'s throttling menu to **Offline**, or switch off Wi-Fi.',
        'Apply the same edit. A tool that processes on your device carries on. One that needs a server fails, spins, or says it cannot connect.',
        'Export the result. Local tools export offline too.',
      ] },
      { t: 'note', text: 'A few things legitimately load from the network even in a local tool: the app itself, web fonts, and any on-device AI model the first time it is used. These are downloads of the tool\'s own files, not uploads of yours. They are also why a brand-new local tool may need a connection once before working offline.' },

      { t: 'h', text: 'What a privacy page should tell you' },
      { t: 'checklist', items: [
        'Whether image data is sent to a server at all, in plain words.',
        'What is sent and why, as a list, including analytics and crash reports.',
        'Whether any third party processes images (AI providers, CDNs that store uploads).',
        'Whether anything is used to train models.',
        'How to turn analytics off, and whether the browser\'s Do Not Track or Global Privacy Control signals are honoured.',
        'Where your files are stored (their servers, your browser, your disk) and how to delete everything.',
      ] },
      { t: 'p', text: 'A page that talks only about cookies, or only about "security", has not answered the question.' },

      { t: 'h', text: 'What Voidcanvas sends, and what it never sends' },
      { t: 'p', text: 'Editing, effects, the AI tools, Studio and every export run inside your browser. These never leave your device unless you share them with a team or through a client link, and then only encrypted: your images, photos, PSDs and PDFs; your designs, layers and text; file and design names; Studio jobs, briefs, references, brands and brand guidelines; fonts you add from files.' },
      { t: 'table', head: ['What goes over the network', 'Why', 'What it contains'], rows: [
        ['The app itself', 'To load the pages and, once installed, update them', 'Ordinary page requests'],
        ['Web fonts from Google Fonts', 'So text layers can use fonts such as Inter or Playfair Display', 'A request for the font family by name. No text, no design'],
        ['AI model files, first use only', 'Remove background, Select subject, Object select, Remove object and Expand with AI fill run on your device and need their model downloaded once', 'A download of the model from public hosts (jsDelivr and Hugging Face). Your image is not sent'],
        ['Anonymous usage counts', 'To know which tools get used and what breaks', 'Event names and small settings such as a file type or a preset name, the page, device type, browser, operating system, browser language, screen size, time zone, whether the app is installed, and random browser and visit ids. Never images, file names, text or layer content. Off in a private session or when your browser sends Do Not Track or Global Privacy Control'],
        ['Feedback and bug reports, only when you press send', 'So you can tell us something', 'What you type, plus the page, device and browser context and the random ids'],
      ] },
      { t: 'p', text: 'You never need an account. If you make one, it syncs interface settings, encrypted on your device before they are sent, with a key only your devices have; your email address and the names of the devices you signed in on are all it keeps readable. Teams share the client brands and jobs you choose, encrypted with the team\'s key. Review and delivery links for clients are encrypted the same way, with the key in the link itself. [What Voidcanvas sends and what stays on your device](/learn/privacy-and-data) is the full list and stays current with the app.' },
      { t: 'steps', items: [
        'Run the two tests above on Voidcanvas. Open the [Editor](/editor), load a photo, remove its background, export a PNG, then go offline and do it again.',
        'To switch off usage counts, open Help, **Your privacy**, and turn off **Share anonymous usage counts**.',
        'On a shared computer, start a [private session](/learn/private-session): nothing is written to this browser and **Delete all my data** clears everything Voidcanvas stored.',
        'To work with no connection at all, [install it as an app](/learn/install-as-an-app) or use the [desktop app](/learn/desktop-app).',
      ] },
      { t: 'product', text: 'Voidcanvas does the work on your device and lists every request it makes. No account is required, the AI models download once and run locally, and a private session leaves nothing behind.', label: 'Open the Editor', href: '/editor' },

      { t: 'faq', items: [
        { q: 'Does an online photo editor upload my photos?', a: 'Most do: the image is sent to their server, processed there and sent back. Some process entirely in your browser. The only reliable way to know is to watch the Network tab while you load a photo and apply an edit, and to see whether the edit still works offline.' },
        { q: 'Is HTTPS enough to make an upload private?', a: 'HTTPS protects the photo on the way to the server. Once there, the service has it, and what happens next depends on their retention, staff access, third-party processors and training policies. "Encrypted in transit" is not the same as "never uploaded".' },
        { q: 'Why does a local tool still need the internet the first time?', a: 'To download the app, its fonts and any AI model it uses. Those are the tool\'s own files coming down, not your images going up. After that first load, a local tool works offline.' },
        { q: 'Can I use Voidcanvas for client work under an NDA?', a: 'The images, designs, briefs and brands stay on your device, and the list of what is sent is published. Read it, run the two tests yourself, and switch off usage counts if your agreement requires it. For the strictest cases, use the desktop app offline.' },
      ] },
      { t: 'try', label: 'Read what is sent', href: '/learn/privacy-and-data' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'keep-a-brand-consistent',
    title: 'How to keep a brand consistent',
    seoTitle: 'How to keep a brand consistent across every design',
    summary: 'Brands drift because there is no single source of truth and every post is rebuilt by hand. The fix is mechanical: one kit with roles, one master per campaign, every format derived from it, a check before export, and a guideline other people can follow.',
    description: 'Keep branding consistent across social, print and web: one brand kit with colour roles, two fonts and logo rules, one master design per campaign, formats derived not redrawn, and a check before export.',
    category: 'studio',
    level: 'Beginner',
    updated: '2026-09-27',
    published: '2026-09-27',
    role: 'cornerstone',
    feature: 'Brand kit · Brands library · Resize to every format',
    goals: ['build-a-brand', 'social-content', 'client-project'],
    answers: ['how to keep branding consistent', 'brand consistency', 'why is brand consistency important', 'how to keep social media posts consistent', 'brand consistency across platforms', 'consistent branding for small business', 'how to make sure designs are on brand', 'brand consistency checklist', 'how to keep brand colours consistent'],
    related: ['brand-kit', 'brands-library', 'resize-to-every-format', 'brand-guidelines'],
    keywords: 'brand consistency consistent branding brand kit colours roles fonts logo minimum size clear space master design formats templates guideline check off brand',
    guide: {
      before: ['building-a-brand-identity'],
      next: ['brand-kit', 'brands-library', 'resize-to-every-format'],
      also: [{ when: 'you need a document others will follow', slug: 'brand-guidelines' }, { when: 'you want the numbers behind the palette and the type', slug: 'colour-that-works' }, { when: 'it is a client brand', slug: 'workflow-client-brand-guideline' }],
    },
    body: [
      { t: 'answer', text: 'A brand stays consistent when nobody has to remember it. Put the brand in one place the tools read from: **colours with roles** (primary, accent, background, text), **two fonts** with a scale, and **logo files with a minimum size and clear space**. Design **one master per campaign** and derive every other format from it instead of redrawing each one. **Check before you export**: off-brand colours, wrong fonts, a logo too small or crowded. Write the rules down once as a guideline so the next person, or you in six months, gets the same result. Consistency is a system, not discipline.' },
      { t: 'p', text: 'Every brand drifts the same way. The hex code gets retyped from memory and comes out a shade off. Someone picks a "close enough" font on a phone. The logo is stretched into a corner at 40 px. The story is rebuilt from scratch and loses the grid the post had. None of these is a taste problem; each is a step where a person had to reconstruct the brand by hand. Remove the reconstruction and the drift stops.' },

      { t: 'h', text: 'Why brands drift' },
      { t: 'table', head: ['Symptom', 'Cause', 'Fix'], rows: [
        ['Five slightly different blues', 'Colours typed from memory or eyedropped from JPGs', 'One kit with named colours; pick, never type'],
        ['Headlines in three fonts', 'The font was not installed where the post was made', 'Two fonts, loaded by the tool, the first one the default for new text'],
        ['Logo squashed, tiny or jammed in a corner', 'No rule for size and space', 'Minimum size and clear space, checked automatically'],
        ['Post, story and banner look like three brands', 'Each one rebuilt by hand', 'One master, every format derived from it'],
        ['New designer, new brand', 'The rules live in someone\'s head', 'A guideline with the numbers, exported for people and for code'],
      ] },

      { t: 'h', text: '1. One kit, with roles' },
      { t: 'p', text: 'A brand kit is not a mood board; it is the few assets every design reaches for, stored where the tool can offer them. Give each colour a **role** rather than a name: primary, secondary, accent, neutral, background, text. Roles make decisions for you (text goes in the text colour, the button is the accent) and they survive a rebrand: change the accent once and every design that used "accent" follows. Two fonts, a headline face and a text face, are enough; the first becomes the default so new text starts on brand. Add the logo files in the versions you actually use, on light and on dark, and set two numbers: the smallest width it may appear at and the clear space around it as a fraction of its height.' },

      { t: 'h', text: '2. One master, every format derived' },
      { t: 'p', text: 'The post, the story, the banner and the poster for one campaign should be one design in several shapes, not four designs. Make the most demanding format first (usually the tallest social size or the print piece), get it right, and then adapt it to the rest: reflow the layout for each ratio, keep the logo in its corner and the text in its safe zone, and change nothing that does not have to change. When the copy changes, change it on the master and push it to the formats; do not edit five files. [Resize one design to every format](/learn/resize-to-every-format) covers the mechanics and the layer roles that make a wide banner and a tall story each get a sensible layout.' },

      { t: 'h', text: '3. A check before you export' },
      { t: 'p', text: 'Consistency fails at the last minute, so the check belongs at the last minute. Before any export, look for four things: a colour on text or shapes that is not a brand colour, a font that is not one of the two, a logo below the minimum size, and anything sitting inside the logo\'s clear space. In a tool with a brand attached this can be automatic; by hand it is a thirty-second scan of the layers.' },

      { t: 'h', text: '4. Rules other people can follow' },
      { t: 'p', text: 'You will not be the only person making things for this brand. A guideline is the kit plus the reasons and the numbers: the palette with roles and contrast checked, the type scale, the logo rules with examples, and what to do and not do. Export it in the forms people use: a PDF for the client and the printer, a web page, and tokens (CSS, Tailwind, JSON) for the developers so the website uses the same values as the poster. [Build a brand guideline](/learn/brand-guidelines) and [Export a brand guideline](/learn/brand-guideline-exports) cover the builder and every export.' },

      { t: 'h', text: 'How to do it in Voidcanvas' },
      { t: 'h3', text: 'Your own brand: the Editor\'s brand kit' },
      { t: 'steps', items: [
        'Open **Edit, Brand kit…**. Under **Colours**, add each brand colour; under **Fonts**, switch on your headline font first and your text font second (the first becomes the default for new text); under **Logos**, add PNG or SVG files with transparent backgrounds.',
        'In every design, brand colours sit first in the swatches, in the **Brand kit** panel a click makes a brand colour the main colour and an Alt-click puts it on the selected text or shape, and your logos appear under **Your logos** in the **Add** menu. [Brand kit](/learn/brand-kit) has the details.',
      ] },
      { t: 'h3', text: 'Client brands: Studio\'s brands library, with checks' },
      { t: 'steps', items: [
        'In Studio, press **Client brands**, then **New brand**. Enter each colour with a role (primary, secondary, accent, neutral, background or text), a **Headlines** and a **Text** font, the logo files under **Logo system** (each is measured and named, and the honest reversed and mono versions are derived from a primary), the **Smallest on screen** (in px on a 1080 px wide design, so one rule covers every format) and the **Clear space** as a share of the logo\'s height.',
        'Or build the brand in the **Brand guideline builder** and press **Save as a client brand in Studio** on its Export tab, which fills all of this in.',
        'On a job\'s **Brief** tab choose the brand under **Which brand is this for?**. The key visual opens with its colours and fonts, and the Editor\'s **Brief** panel shows **On brand** or a list to fix: off-brand colours (**Fix** moves every layer using that colour to the nearest brand colour), fonts that are not the brand\'s (**Fix** sets headlines and text), logos under the minimum size, layers inside the clear space (**Select** jumps to them), and a logo losing contrast on what is behind it, with the version that would hold one click away (**Use reversed**). Place the logo from the **Add** menu, where the brand\'s versions are listed, and the checks know which artwork it is.',
        'Build every format from the master on the **Key visual** tab and push later changes with **Update formats from the master**. Delivery can include a brand sheet with each colour\'s role, hex, RGB and approximate CMYK, the fonts and the logo rules.',
      ] },
      { t: 'product', text: 'The brand kit puts the colours, fonts and logos where you pick rather than type them; the brands library holds one brand per client and checks every design against it before you export; Resize and Cascade derive every format from one master; and the guideline builder exports the rules for people and for code.', label: 'Open Studio', href: '/studio' },

      { t: 'h', text: 'Common mistakes' },
      { t: 'list', items: [
        '**Too many colours in the kit.** Five with roles beats fifteen without. Tints can be made from the five.',
        '**Brand colours only in the guideline PDF.** If the tool cannot offer them, they will be retyped. Load them into the kit.',
        '**A logo rule with no number.** "Give it room" is not a rule. Half the logo\'s height on every side is.',
        '**Templates that are really finished posts.** A template should carry the grid, the type styles and the logo position, and nothing that changes per post.',
        '**Checking by eye at thumbnail size.** A shade off is invisible at 200 px. Check the values, or let the tool check them.',
      ] },

      { t: 'faq', items: [
        { q: 'Why is brand consistency important?', a: 'Recognition compounds. Every post, poster and page that looks like the last one adds to the same memory in the audience; every one that drifts starts a new one. It also makes work faster, because nobody decides the colour of a button twice.' },
        { q: 'How do I keep social media posts consistent?', a: 'One kit the tool offers, one master per campaign with the other sizes derived from it, and a template that carries the grid and type styles but no content. Check colours and fonts against the kit before export rather than by eye.' },
        { q: 'What should a brand kit contain?', a: 'Colours with roles, two fonts (headline and text), logo files for light and dark backgrounds, the logo\'s minimum size and clear space. Everything else belongs in the guideline.' },
        { q: 'How do I share a brand with a team?', a: 'Load it into a place everyone works from. In Voidcanvas, Studio brands and jobs can be shared with a team, and the guideline exports tokens for developers so the website matches the design.' },
      ] },
      { t: 'try', label: 'Open Studio', href: '/studio' },
    ],
  },
]
