import type { Article } from '../types'

// General design education, tied to the tools. Every product detail here is checked against the code:
// Character and Paragraph panels (src/editor/components/panels.tsx), the brand guideline builder
// (src/studio/BrandGuideline.tsx, src/studio/brand/color.ts, tokens.ts), export (ExportDialog.tsx, io.ts),
// Studio delivery (src/studio/job/DeliverTab.tsx, src/studio/pdf.ts) and the size presets.

export const articles: Article[] = [
  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'typography-fundamentals',
    title: 'Set type that reads well',
    summary: 'Hierarchy, pairing, size, measure, leading and tracking: the numbers that make text easy to read, and where to set each one in Voidcanvas.',
    category: 'craft',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['type', 'layout-and-composition', 'brand-guidelines', 'designing-for-social'],
    keywords: 'typography fonts font pairing type scale line height leading letter spacing tracking kerning measure line length hierarchy readability text size',
    body: [
      { t: 'p', text: 'Most text problems come down to six decisions: what matters most, which fonts, how big, how long the lines are, how far apart they sit, and how tightly the letters pack. Get these right and plain type looks designed. Get them wrong and no effect will rescue it.' },

      { t: 'h', text: 'Hierarchy: decide what is read first' },
      { t: 'p', text: 'Before you pick a font, rank the words. A poster usually has three levels: the one thing (headline or event name), the facts (date, place, price) and the small print. Each level should be clearly different from the next, not slightly different. A heading 10 per cent bigger than the body looks like a mistake; one at least 1.5 times bigger looks like a decision.' },
      { t: 'p', text: 'You have four levers: **size**, **weight**, **colour** and **space**. Use two at a time. A bold heading in the same size as the body can work; a bigger, bolder, coloured, underlined heading is shouting. Limit a single piece to three or four sizes.' },

      { t: 'h', text: 'Pairing fonts' },
      { t: 'p', text: 'One family with a range of weights is always safe. If you pair two, pair for contrast of structure and agreement of proportion: a serif display face over a clean sans for reading, or a condensed bold sans over a wide, calm text face. Two fonts that are nearly the same (two geometric sans, say) look like an error.' },
      { t: 'list', items: [
        'Give each font one job: headings, reading text, and optionally numbers or code.',
        'Check the x-height (the height of a lowercase x). Faces with similar x-heights sit well together on the same line.',
        'Choose families that have the weights you need. A heading at 700 and body at 400 needs both weights to exist.',
        'Stop at two families. A third is for data or code, not for variety.',
      ] },
      { t: 'p', text: 'The brand guideline builder in Studio pairs within a personality. For example, Refined reaches for DM Serif Display with DM Sans, or Playfair Display with Lora; Minimal uses Inter, Manrope or IBM Plex Sans on its own and carries hierarchy with weight and size.' },

      { t: 'h', text: 'Size' },
      { t: 'p', text: 'On screen, body text should be at least 16 px. The brand guideline builder flags a body size under 16 px as hard to read. In print, body text is usually 9 to 12 pt, captions 7 to 8 pt, and anything under 6 pt is legal small print at best.' },
      { t: 'p', text: 'A point is 1/72 of an inch (0.353 mm). Voidcanvas works in pixels, so convert: at 300 ppi one point is about 4.2 px. That means 10 pt body text on the A4 flyer preset (2480 px wide, 300 ppi) is about 42 px, and a 48 pt headline is 200 px. Designers often set print text far too small because 42 px looks tiny on a zoomed-out canvas.' },
      { t: 'h3', text: 'Use a type scale' },
      { t: 'p', text: 'A scale multiplies a base size by a fixed ratio for each step up. With a 16 px base and a ratio of 1.25 (a major third) you get 16, 20, 25, 31, 39, 49. Every size is related to every other, so the page feels consistent even when you cannot say why.' },
      { t: 'table', head: ['Ratio', 'Name', 'Feels'], rows: [
        ['1.2', 'Minor third', 'Quiet. Good for dense documents and interfaces.'],
        ['1.25', 'Major third', 'Balanced. A safe default.'],
        ['1.333', 'Perfect fourth', 'Clear steps. Editorial.'],
        ['1.5', 'Perfect fifth', 'Dramatic. Posters and landing pages.'],
        ['1.618', 'Golden ratio', 'Very steep. Few steps fit on one page.'],
      ] },

      { t: 'h', text: 'Measure: how long a line is' },
      { t: 'p', text: 'Measure is line length in characters. For body text, aim for 45 to 75 characters per line, with about 66 as the sweet spot. Shorter lines make the eye jump back too often; longer lines make it lose its place on the return. Headlines and captions can break the rule because they are read differently.' },
      { t: 'p', text: 'A rough way to size a text box: many text faces average about half an em per character, so 66 characters at 16 px needs roughly 66 × 0.5 × 16 = 528 px. Set it, then count a line and adjust.' },

      { t: 'h', text: 'Leading: space between lines' },
      { t: 'p', text: 'Leading (line spacing) is written as a multiple of the font size. Body text wants 1.4 to 1.6. Big headlines want much less, 1.0 to 1.15, because the gaps grow with the size and a two-line heading at 1.5 falls apart. Longer lines need a little more leading than short ones.' },
      { t: 'p', text: 'The type scale in the brand guideline builder follows this: 1.5 for sizes around body text, 1.25 from 22 px, 1.15 from 32 px and 1.05 from 48 px.' },

      { t: 'h', text: 'Tracking and kerning' },
      { t: 'p', text: '**Kerning** adjusts the space between particular pairs (AV, To). Good fonts ship with kerning tables; leave them on. **Tracking** changes spacing evenly across a whole line.' },
      { t: 'list', items: [
        'Large display text looks loose by default. Tighten it slightly: about -0.025 em at 48 px and above.',
        'All caps and small caps need more room: +0.05 to +0.1 em.',
        'Body text: leave tracking at 0.',
        'Small text under 14 px can take a touch more, about +0.01 em.',
      ] },
      { t: 'p', text: 'Design apps often measure tracking in thousandths of an em, where -25 means -0.025 em. Voidcanvas measures it in pixels, so multiply by the font size: -0.025 em at 96 px is -2.4 px; +0.08 em on 24 px capitals is about +2 px.' },

      { t: 'h', text: 'Alignment' },
      { t: 'p', text: 'Left-aligned, ragged-right text is the easiest to read in most Latin-script languages because every line starts in the same place. Centre short things only: a headline, an invitation, three lines at most. Justified text needs a long measure, or it opens up rivers of white space between words.' },

      { t: 'h', text: 'Do it in Voidcanvas' },
      { t: 'steps', items: [
        'Press {{T}} for the Type tool. Click for a single line of text, or drag a box for a paragraph that wraps.',
        'Open the **Character** panel (Window menu) for **Size**, **Weight**, **Leading** (as a multiple, ×), **Tracking** (px), **Word spacing**, **Baseline shift** and **Width**. Keep **Use the font\'s kerning** ticked.',
        'Use the **TT** and **Tt** buttons for all caps and small caps, then add positive tracking.',
        'Open the **Paragraph** panel for alignment, **Wrap in a text box**, **Box width**, **First-line indent** and **Space after paragraph**. Set Box width to control the measure; the panel shows the line count.',
        'For a quick change, the **Properties** panel has **More type options** with Size, Line spacing and Letter spacing sliders.',
      ] },
      { t: 'p', text: 'To plan a whole system, open Studio, choose **Brand guideline builder**, and use the **Type** tab: pick **Headings**, **Body** and **Data and code** fonts, a **Scale** (Minor third to Golden ratio) and a **Base size** from 14 to 18. The preview lists every step from Display to Caption with its pixel size, and the tokens export gives developers the same numbers.' },
      { t: 'try', label: 'Open the Editor', href: '/editor' },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**Justify does nothing.** Justify needs a text box to spread lines across. Tick Wrap in a text box first.',
        '**A font looks different on another computer.** The font was not available there. Google fonts load by name; fonts you add from a file are saved inside the design. See [Type](/learn/type).',
        '**Everything looks the same weight.** You changed size but not weight or colour, or the steps are too close. Go up a step in the scale.',
        '**Headline lines crash into each other.** Leading below 1.0 with tall ascenders or accents. Raise it until the marks clear.',
      ] },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'colour-that-works',
    title: 'Choose colours that work on screen and in print',
    summary: 'Build palettes with roles, make even ramps in OKLCH, pass WCAG 2.2 contrast, and know what happens when RGB colour goes to a printer.',
    category: 'craft',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['brand-guidelines', 'colour-and-swatches', 'designing-for-print', 'references-and-palettes'],
    keywords: 'colour color palette oklch oklab hsl ramp tints shades contrast ratio wcag accessibility aa aaa cmyk rgb srgb gamut print colour pantone accessible colours',
    body: [
      { t: 'p', text: 'A good palette is not a set of nice colours. It is a small system: each colour has a job, each has lighter and darker steps, and the pairs you actually use can be read by everyone. This article covers how to build one and check it, and what changes when the work is printed.' },

      { t: 'h', text: 'Start with roles, not swatches' },
      { t: 'p', text: 'Give every colour a job before you worry about the exact hue.' },
      { t: 'table', head: ['Role', 'Job', 'Typical share'], rows: [
        ['Brand', 'Logo, key surfaces, the colour people remember', 'Large'],
        ['Neutral', 'Backgrounds, body text, borders, most of the page', 'Largest'],
        ['Secondary', 'Supporting blocks, illustration, charts', 'Medium'],
        ['Accent', 'Calls to action and highlights. One per view.', 'Small'],
        ['Semantic', 'Success, warning, error. Only for meaning.', 'Rare'],
      ] },
      { t: 'p', text: 'The old 60/30/10 rule is a fair starting point: most of the area in one dominant colour, a third in a supporting one, a tenth in the accent. The accent works because it is rare. Use it everywhere and it stops pointing at anything.' },

      { t: 'h', text: 'Why HSL misleads you' },
      { t: 'p', text: 'HSL says pure yellow and pure blue both have 50 per cent lightness. Your eye disagrees: yellow looks almost white and blue looks almost black. Build a palette in HSL and the steps look uneven, text contrast jumps around between hues, and a "500" yellow and a "500" blue are nothing alike.' },
      { t: 'p', text: '**OKLCH** fixes this. It describes a colour by three numbers:' },
      { t: 'list', items: [
        '**L, lightness**, from 0 (black) to 1 or 100 per cent (white), scaled to how light the colour looks, not how the screen makes it.',
        '**C, chroma**, how colourful it is. 0 is grey; strong screen colours reach about 0.3 to 0.37.',
        '**H, hue**, an angle in degrees around the colour wheel.',
      ] },
      { t: 'p', text: 'In OKLCH, pure yellow sits at about L 0.97 and pure blue at about L 0.45, which matches what you see. Hold L constant and change H, and you get colours that feel equally light. That is exactly what you want for a set of tints.' },

      { t: 'h', text: 'Build ramps' },
      { t: 'p', text: 'A ramp is one hue in several steps, usually numbered 50 (palest) to 900 (darkest). You use light steps for tinted backgrounds, middle steps for fills and dark steps for text on those tints. Build every ramp with the same lightness per step, ease chroma off at the very light and very dark ends so tints stay clean and shades do not go muddy, and keep the hue fixed.' },
      { t: 'p', text: 'Some OKLCH colours cannot be shown on a normal sRGB screen, especially very saturated light colours. When that happens, lower the chroma and keep the lightness and hue. Lowering lightness instead would break the ramp.' },

      { t: 'h', text: 'Contrast and WCAG 2.2' },
      { t: 'p', text: 'WCAG measures contrast as a ratio between the relative luminance of two colours: (lighter + 0.05) ÷ (darker + 0.05). It runs from 1:1 (identical) to 21:1 (black on white). WCAG 2.2 keeps the same contrast rules as 2.1.' },
      { t: 'table', head: ['What', 'Level AA', 'Level AAA'], rows: [
        ['Normal text', '4.5:1', '7:1'],
        ['Large text: 24 px regular, or about 18.7 px bold (18 pt and 14 pt)', '3:1', '4.5:1'],
        ['Icons, input borders, chart lines, focus rings (non-text contrast)', '3:1', 'No extra level'],
      ] },
      { t: 'list', items: [
        'Logos and brand names in a logo are exempt, as are purely decorative graphics and disabled controls. Everything a reader needs is not.',
        '#767676 is the lightest grey that passes 4.5:1 on white. #777777 fails, at 4.48:1.',
        'Never use colour alone to carry meaning. Pair red with an icon or a word, because about 1 in 12 men has some form of colour vision deficiency.',
        'Contrast on a photo changes across the image. Check the lightest part behind the text, or add a scrim.',
      ] },
      { t: 'note', text: 'Because the brand guideline builder uses the same OKLCH lightness for each step in every ramp, contrast lines up across hues. On white, step 500 lands around 3.4 to 4.2:1 (large text only), step 600 around 4.9 to 6.1:1 (passes AA for body text) and step 700 around 7.3 to 8.9:1 (AAA). The exact figure depends on the hue, so always read the Contrast list.' },

      { t: 'h', text: 'Screen colour and print colour' },
      { t: 'p', text: 'Screens mix red, green and blue light (RGB). Presses lay down cyan, magenta, yellow and black ink (CMYK) on paper. The range of colours each can produce, the gamut, is different. Bright RGB colours such as electric blue, acid green, hot pink and vivid orange have no CMYK equivalent and come out duller in print. Uncoated paper dulls and darkens colour further because the ink soaks in.' },
      { t: 'list', items: [
        'Convert with the printer\'s profile. They know their press and paper; a generic formula does not.',
        'If a colour must match exactly across jobs (a logo on packaging, say), specify a spot colour from a physical swatch book with your printer. Voidcanvas does not manage spot colours.',
        'Ask for a printed proof of any colour-critical job and judge it in daylight.',
      ] },
      { t: 'warn', text: 'Voidcanvas works in sRGB and every export is RGB. The CMYK values the brand guideline builder shows are a simple device conversion with no ICC profile. Treat them as a starting point for the printer, not a spec. The guideline says so on the page: CMYK values are approximate. Confirm against a printed proof.' },

      { t: 'h', text: 'Do it in Voidcanvas' },
      { t: 'steps', items: [
        'Open Studio and choose **Brand guideline builder**, then the **Colour** tab.',
        'Enter your **Brand colour** as a hex value or pick it. Its ramp appears underneath, with a dot on the step your colour sits closest to. Adding a logo on the Identity tab can set this colour for you.',
        'Pick a **Harmony**: Analogous, Complementary, Triadic or Split complement. The **Secondary** and **Accent** colours are built from it, and generated ones are darkened or lightened until a label on them is readable.',
        'Set **Neutral warmth** to decide how much of the brand hue shows in the greys. A little warmth makes greys feel like part of the brand.',
        'Read the **Contrast** list. Each row shows a real pairing (body text, button label, accent links, tinted panels), its ratio and a grade: AAA, AA, AA large or Fail. Brand as text or icon is checked against 3:1; the rest against 4.5:1.',
        'Click the checks button in the header (it reads "All N checks pass" or "N issues") for the full list with the ratio each failing pair needs.',
        'Editing a colour locks it. **New take** only changes what is unlocked.',
      ] },
      { t: 'p', text: 'In the Editor, the colour picker has HEX, RGB and HSL fields. When a design has a brief, the **Brief** panel shows **Selected text contrast** for the selected text layer against its board or page colour, graded AAA, AA, large text only or too low. See [Colour and swatches](/learn/colour-and-swatches) for the picker and swatches.' },
      { t: 'try', label: 'Open Studio', href: '/studio' },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**The accent looks weak next to the brand colour.** They are too close in hue and lightness. Try Complementary or Split complement, or lock a darker accent.',
        '**White text on the brand colour fails.** The brand colour sits around step 400 or 500. Use a darker step (700) for surfaces with text, and keep the pure brand colour for large shapes.',
        '**The print came back dull.** The colour was outside the CMYK gamut. Ask the printer for a proof and choose a nearby colour that survives conversion.',
      ] },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'layout-and-composition',
    title: 'Lay out a page with a grid, space and a clear focal point',
    summary: 'Use columns, margins and a spacing scale, align to fewer edges, give the page one focal point and control the order people read in.',
    category: 'craft',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['groups-align-guides', 'typography-fundamentals', 'designing-for-social', 'designing-for-print'],
    keywords: 'layout composition grid columns gutter margin white space negative space alignment focal point visual hierarchy reading order z pattern f pattern rule of thirds balance spacing',
    body: [
      { t: 'p', text: 'Layout is how you decide where things go and how far apart they are. A layout works when a stranger knows where to look first, second and third without thinking. You will learn the few rules that do most of the work, and how to set up guides and alignment in the Editor.' },

      { t: 'h', text: 'Start with a grid' },
      { t: 'p', text: 'A grid is a set of columns separated by gutters, inside margins. It is not a cage. It gives you a small number of edges to line things up to, so the page looks intentional.' },
      { t: 'list', items: [
        '**Margins** keep content off the edge. They protect against trimming in print and against phone interfaces on social.',
        '**Columns** set where blocks can start and end. Twelve columns divide into 2, 3, 4 and 6, which is why web layouts use them. Posters and flyers often need only 2 to 6.',
        '**Gutters** are the gaps between columns. Make them wide enough that two columns of text never read as one line.',
      ] },
      { t: 'p', text: 'Let an element span several columns. A headline over all twelve, an image over eight, a caption in the remaining four: that is a grid working.' },

      { t: 'h', text: 'Align to fewer edges' },
      { t: 'p', text: 'Every element creates invisible lines along its edges and centre. Each new alignment line adds visual noise. A strong layout shares edges: the headline, body and button all start at the same left edge. Count the distinct left edges on your page; if there are more than three or four, merge some.' },
      { t: 'p', text: 'Trust your eye over the numbers for round and pointed shapes. An O or a triangle aligned exactly to a square edge looks slightly inset, so nudge it out a little. This is optical alignment, and type designers do the same with round letters.' },

      { t: 'h', text: 'Space is a design element' },
      { t: 'p', text: 'Things close together read as a group; things far apart read as separate. This is proximity, and it is the cheapest way to organise a page. The space between a heading and its paragraph should be clearly smaller than the space between that paragraph and the next heading.' },
      { t: 'p', text: 'Pick spacing from a scale instead of by eye. With a base unit of 8 px, use 8, 16, 24, 32, 48, 64, 96, 128. Consistent steps make a page feel calm even when it is full. Empty space is not wasted. It makes the important thing look important.' },

      { t: 'h', text: 'One focal point' },
      { t: 'p', text: 'Every piece needs one thing that wins. Make it win by contrast: much bigger (two to three times the next element), much darker or brighter, a different colour, or the only thing with space around it. If two things compete, the reader picks neither.' },
      { t: 'tip', text: 'Squint test: blur your eyes, or add a **Black and white** adjustment layer (Image, Adjustments). Whatever still stands out is your real focal point. If it is not the one you meant, fix the tone before touching colour.' },
      { t: 'p', text: 'The rule of thirds is a helpful starting point for photos and big images: put the subject near where lines a third of the way in cross, rather than dead centre. Centred compositions are fine too; they read as calm and formal.' },

      { t: 'h', text: 'Control the reading order' },
      { t: 'p', text: 'In left-to-right languages, people scan a poster in a rough Z (top left, across, down diagonally, across the bottom) and a text-heavy page in an F (across the top, down the left side, shorter scans across). Put what matters where the eye already goes: the focal point near the top or at the first stop, the call to action at the end of the path, usually bottom right or bottom centre.' },
      { t: 'p', text: 'Number your elements 1 to 5 in the order you want them read, then look at the design fresh. If the eye goes to number 4 first, it is too big, too bright or too isolated.' },

      { t: 'h', text: 'Balance' },
      { t: 'p', text: 'A big dark block on one side needs something to answer it on the other: a smaller dark element further out, a block of text, or a lot of empty space. Symmetry is stable and formal. Asymmetry is lively but needs the weights to balance, like a see-saw with a heavy child near the middle and a light one at the end.' },

      { t: 'h', text: 'Do it in Voidcanvas' },
      { t: 'steps', items: [
        'Choose View, Guides, **New guide layout…** and set **Columns**, **Rows**, **Margin (px)** and **Gutter (px)**. The presets fill these in: **12 column web** (12 columns, 40 px margin, 20 px gutter), **Thirds** (3 by 3, no margin), **2 columns print** (60 px margin, 24 px gutter) and **Safe margins** (a single 60 px margin frame). Press **Make guides**.',
        'Turn on **Rulers** ({{Ctrl+R}}) to drag out single guides, or use View, Guides, **New guide…** to place one at an exact pixel position.',
        'Keep **Snap** on ({{Ctrl+Shift+;}}). Dragged layers snap their edges and centres to the canvas edges and centre, to other layers, and to guides while guides are showing. Hold {{Alt}} while dragging to move freely.',
        'Select several layers and use Layer, Align: **Left edges**, **Horizontal centres**, **Right edges**, **Top edges**, **Vertical centres**, **Bottom edges**. With three or more selected, **Distribute horizontally** or **Distribute vertically** evens out the gaps.',
        'Hide guides with {{Ctrl+;}} to judge the layout clean. **Lock guides** ({{Ctrl+Alt+;}}) stops you dragging them by accident.',
      ] },
      { t: 'p', text: 'On a Mac, use Cmd in place of Ctrl. For more on multi-select and grouping, see [Groups, align and guides](/learn/groups-align-guides).' },
      { t: 'p', text: 'The brand guideline builder records the system for a whole brand: on the Identity tab, **Spacing unit** (4 px or 8 px) sets a spacing scale of 1, 2, 3, 4, 6, 8, 12 and 16 times the unit, and **Grid** sets 6, 8 or 12 columns with a gutter of three units.' },
      { t: 'try', label: 'Open the Editor', href: '/editor' },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**It looks cluttered but nothing is wrong on its own.** Too many alignment edges or uneven gaps. Pick one spacing step for related items and a bigger one between groups.',
        '**The focal point gets lost.** Two or more things are the same size. Shrink everything except one.',
        '**Text sits too close to the edge.** Use the Safe margins preset and keep all text inside it.',
      ] },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'image-resolution-explained',
    title: 'Understand pixels, dpi and why images look soft',
    summary: 'How pixel dimensions, ppi and print size relate, why images blur when scaled, what makes files big, and the size limits in Voidcanvas.',
    category: 'craft',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['designing-for-print', 'export-for-screen', 'crop-and-canvas', 'file-formats'],
    keywords: 'resolution dpi ppi pixels megapixels print size blurry pixelated soft image upscale resample retina 2x file size compression jpg png webp quality',
    body: [
      { t: 'p', text: 'Resolution confuses people because one image can be called "72 dpi", "300 dpi" and "4000 pixels" all at once. Only the pixels are real. Once you understand that, you can tell in advance whether a photo is good enough for a poster, and why a sharp design turns soft after upload.' },

      { t: 'h', text: 'Pixels are the only real measure' },
      { t: 'p', text: 'A digital image is a grid of pixels, for example 2480 × 3508. That is all the detail it has. The dpi or ppi number stored in a file is only a note that says how big to print it. Change that note and the file prints at a different size, but no detail is added or lost.' },
      { t: 'p', text: '**ppi** (pixels per inch) is how densely image pixels are laid onto paper. **dpi** (dots per inch) strictly means the ink dots a printer lays down, but most people and most apps, Voidcanvas included, say dpi for both.' },

      { t: 'h', text: 'The one formula' },
      { t: 'p', text: '**Print size in inches = pixels ÷ ppi.** For millimetres, multiply by 25.4.' },
      { t: 'table', head: ['Use', 'Target ppi at final size', 'Why'], rows: [
        ['Flyers, cards, brochures, magazines', '300', 'Read at arm\'s length; fine detail and small text show.'],
        ['Posters read from a metre or two', '150 to 300', 'Viewing distance hides detail.'],
        ['Roll-up banners, billboards', 'About 100 to 150, or less for billboards', 'Seen from metres away. Ask the printer.'],
      ] },
      { t: 'p', text: 'So the A4 flyer preset, 2480 × 3508 px, is exactly A4 at 300 ppi (210 × 297 mm). The Poster 18 × 24 in preset in the Editor, 5400 × 7200, is 300 ppi. The Studio poster format of the same name is 2700 × 3600, which is 150 ppi: fine at viewing distance. Studio\'s roll-up banner at 2008 × 4724 px for 850 × 2000 mm works out at about 60 ppi. That holds up for big type and flat colour, but a detailed photo will look soft close up, so check with your printer.' },

      { t: 'h', text: 'Screens and "retina"' },
      { t: 'p', text: 'Screens do not care about dpi at all. A 1080 px wide post fills the width it is given. Modern phones pack two or three physical pixels into each layout pixel, so a graphic shown 400 px wide on a phone may be drawn with 800 to 1200 real pixels. Supply fewer and it gets stretched, which is where softness comes from.' },

      { t: 'h', text: 'Why images look soft' },
      { t: 'list', items: [
        '**Upscaling.** Making a raster image bigger invents pixels by blending neighbours. It never adds real detail. Scale photos down freely, up as little as possible.',
        '**Repeated resampling.** Every resize blurs a little. Resize once, from the original, to the final size.',
        '**Odd scale factors on screen.** A 1000 px image shown at 1080 px is stretched by 8 per cent and every edge smears. Export at the exact size the platform uses.',
        '**Compression.** JPG and WebP throw away detail to save space. Sharp text and flat colour show blocky artefacts first.',
        '**Platform recompression.** Social networks recompress uploads. Starting from the exact platform size with a clean file gives them less to damage.',
      ] },

      { t: 'h', text: 'What makes a file big' },
      { t: 'p', text: 'In memory, every pixel takes 4 bytes (red, green, blue, alpha). A 2480 × 3508 layer is about 33 MB uncompressed, and every layer holds its own. On disk, compression shrinks this:' },
      { t: 'table', head: ['Format', 'Compression', 'Best for'], rows: [
        ['PNG', 'Lossless. Keeps every pixel and transparency.', 'Graphics, text, logos, flat colour, anything with transparency.'],
        ['JPG', 'Lossy. No transparency.', 'Photos. Quality 80 to 90 per cent is usually indistinguishable from 100.'],
        ['WebP', 'Lossy here, with transparency.', 'Websites. Smaller than JPG at similar quality.'],
      ] },
      { t: 'p', text: 'Doubling width and height quadruples the pixels, so a 2× export is roughly four times the file size.' },

      { t: 'h', text: 'How Voidcanvas handles resolution' },
      { t: 'list', items: [
        '**Imported photos are capped.** When you open or place an image larger than 4096 px on its longest side, it is scaled down to 4096 px. A photo filling an A3 page at 300 ppi (3508 × 4961) is therefore at most about 248 ppi, and one filling the 18 × 24 in poster about 170 ppi. Both usually print well, but know the limit.',
        '**Text and shapes stay sharp at any size.** They are redrawn at the export size, so a 2× or 3× export of text is crisp. Photos and painted layers are resampled and cannot gain detail.',
        '**Image size** (Image menu, {{Ctrl+Alt+I}}) scales every layer. It shows the size in pixels, about how many MB each layer takes, and what that prints at in centimetres at the **Resolution** you enter. Change the Resolution to see a different print size.',
        '**Export as…** ({{Ctrl+E}}) offers 0.5×, 1×, 2× and 3×, showing the pixel size of each. Scales that would go over 8192 px on the longest side are not offered.',
        '**Custom size** on the start screen accepts 16 to 8000 px per side.',
      ] },
      { t: 'p', text: 'On a Mac, use Cmd in place of Ctrl.' },
      { t: 'try', label: 'Open the Editor', href: '/editor' },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        '**A "72 dpi" file is not low quality.** Check its pixel dimensions. A 3000 px wide file at 72 dpi is the same image as a 3000 px file at 300 dpi.',
        '**Save a version before a big resize.** The Image size dialog saves one for you when the new size is over 4000 px, and warns you above 8000 px that the browser may slow down.',
        '**Phone screenshots of designs are not originals.** They are resampled to the screen. Work from the source file.',
      ] },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'designing-for-print',
    title: 'Prepare artwork a printer will accept',
    summary: 'Trim, bleed, safe area, 300 ppi, RGB and CMYK, paper and proofs, with the honest limits of Voidcanvas print output and how to work around them.',
    category: 'craft',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['export-for-print', 'image-resolution-explained', 'colour-that-works', 'delivering-files'],
    keywords: 'print ready bleed trim safe area quiet zone crop marks 3mm bleed 300 dpi cmyk rgb conversion paper stock gsm coated uncoated proof printer pdf flyer business card poster',
    body: [
      { t: 'p', text: 'Print is less forgiving than screen. Paper is cut with a small margin of error, ink behaves differently from light, and mistakes cost money. This article covers the terms a printer will use, the numbers they expect, and exactly what Voidcanvas can and cannot give them.' },

      { t: 'h', text: 'Trim, bleed and safe area' },
      { t: 'p', text: 'Printers print on bigger sheets and cut them down. The guillotine can drift by a millimetre or so, so artwork needs three zones:' },
      { t: 'table', head: ['Zone', 'What it is', 'Typical size'], rows: [
        ['Trim', 'The finished size, where the cut is meant to go.', 'A5 is 148 × 210 mm; a UK business card 85 × 55 mm (Voidcanvas uses 89 × 51 mm, 3.5 × 2 in).'],
        ['Bleed', 'Extra artwork beyond the trim, cut away. Any colour or photo that touches the edge must continue into it.', '3 mm each side in the UK and Europe. US printers often ask for 1/8 in (3.175 mm).'],
        ['Safe area', 'An inner margin. Keep all text, logos and anything important inside it.', 'At least 3 to 5 mm inside the trim; more on large items.'],
      ] },
      { t: 'p', text: 'Without bleed, a slight drift leaves a hairline of white paper along the edge. Without a safe area, the drift can slice through a phone number.' },
      { t: 'p', text: '**Crop marks** are short lines outside the bleed that show the printer where to cut. They must not touch the artwork.' },

      { t: 'h', text: 'Resolution for print' },
      { t: 'p', text: 'Work at 300 ppi at the final printed size for anything read up close. At 300 ppi, 1 mm is about 11.8 px and 3 mm of bleed is about 35 to 36 px. See [Image resolution explained](/learn/image-resolution-explained) for large formats and the maths.' },

      { t: 'h', text: 'RGB and CMYK' },
      { t: 'p', text: 'Screens are RGB; presses print CMYK. Conversion happens at some point, and the question is who does it and with which profile. The best person is your printer, using the ICC profile for their press and paper. Expect very bright blues, greens, pinks and oranges to come out duller.' },
      { t: 'list', items: [
        '**Black text:** ideally prints in black ink only. After a generic conversion, pure RGB black can become a mix of all four inks, which can look slightly soft on very small text if the plates are not perfectly aligned. Keep small print at 7 pt or above and do not reverse fine text out of busy photos.',
        '**Large black areas:** printers often want a "rich black" (black plus some cyan, magenta and yellow) so it looks deep rather than grey. Ask them to handle it.',
        '**Colour-critical work:** ask for a proof. See [Choose colours that work on screen and in print](/learn/colour-that-works).',
      ] },
      { t: 'warn', text: 'Voidcanvas exports RGB only. There is no CMYK export, no ICC profile handling and no spot colours. The print PDFs from Studio and the brand guideline builder say so in their slug line; the Editor\'s PDF export does not. Tell your printer the file is RGB and ask them to convert with their profile and send a proof for important colours.' },

      { t: 'h', text: 'Paper' },
      { t: 'p', text: 'Paper weight is in gsm (grams per square metre). Flyers are commonly 130 to 170 gsm, posters 150 to 200 gsm, business cards 350 gsm and up. **Coated** paper (gloss, silk, matt) holds ink on the surface: sharper and more saturated. **Uncoated** paper absorbs ink: softer, darker and less saturated, with a warmer, more natural feel. Dark photos can fill in on uncoated stock, so lift the shadows a little if you know that is the paper.' },

      { t: 'h', text: 'Proofing' },
      { t: 'steps', items: [
        'Print it yourself at 100 per cent on an office printer. Colour will be wrong, but size is not: check text is readable and nothing sits too close to the trim.',
        'Read every word out loud, especially numbers, dates, prices and web addresses.',
        'Ask the printer for a PDF proof and check it has not moved anything.',
        'For colour-critical or large runs, pay for a hard (printed) proof on the real paper.',
      ] },

      { t: 'h', text: 'Print from Voidcanvas: three routes' },
      { t: 'h3', text: '1. Studio delivery (bleed and crop marks)' },
      { t: 'p', text: 'This is the fullest print output. In a Studio job, add a print format on the Brief tab (A4 flyer, A5 flyer, A3 poster, Poster 18 × 24 in, Business card or Roll-up banner 85 × 200 cm; each knows its size in mm), build it on the **Key visual** tab, then on **Deliver** tick **Print PDF** and choose **Build the package**.' },
      { t: 'list', items: [
        'The PDF is at trim size with 3 mm bleed, crop marks outside the bleed, and TrimBox and BleedBox set, which printers\' software reads.',
        'A slug line under the artwork records the client, job, format, version, trim size, bleed and that the file is RGB.',
        'The bleed is made by repeating the edge pixels of your artwork outwards. Flat colour and simple backgrounds extend cleanly. A detailed photo right at the edge gets streaks in the 3 mm bleed; they are cut away, but if the trim drifts a sliver can show. For photos that bleed, use route 2.',
      ] },
      { t: 'h3', text: '2. Editor export with bleed built in' },
      { t: 'p', text: 'Export as… ({{Ctrl+E}}) with **PDF** gives a one-page, image-based PDF, filled on white. It has no bleed and no crop marks. For designs over 2000 px on the longest side, the page is sized at 300 dpi; smaller designs are sized at 96 dpi, as a screen document.' },
      { t: 'steps', items: [
        'Start from a print preset, for example **A5 flyer** (1748 × 2480).',
        'Before you design, choose Image, **Canvas size…**, tick **Relative**, and add 72 px to the width and 72 px to the height with the anchor in the centre. That is 36 px, about 3 mm at 300 ppi, on each side.',
        'Add guides 36 px in from each edge for the trim, and another 59 px in (about 5 mm) for the safe area, using View, Guides, **New guide…**.',
        'Run backgrounds and photos to the outer edge. Keep text inside the safe area guides.',
        'Export as **PDF** and tell the printer: "RGB, 300 dpi, 3 mm bleed included, no crop marks."',
      ] },
      { t: 'h3', text: '3. Brand guideline print PDF' },
      { t: 'p', text: 'The brand guideline builder\'s **Print PDF** makes a multi-page document at 300 dpi with 3 mm bleed and crop marks, on A4 portrait (Document) or 297 × 167 mm (Deck). See [Brand guideline exports](/learn/brand-guideline-exports).' },
      { t: 'try', label: 'Open Studio', href: '/studio' },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**The printer says there is no bleed.** You exported from the Editor without adding it. Use route 1, or add it with Canvas size as in route 2.',
        '**A business card PDF from the Editor opens at the wrong size.** The Business card preset (1050 × 600) is under 2000 px, so the Editor sizes the page as a screen document. Use Studio delivery, which knows the card is 89 × 51 mm.',
        '**Text looks slightly less crisp than in InDesign.** Voidcanvas PDFs are image based: text is rendered to pixels at 300 dpi, not kept as vector type. At normal sizes this prints well; very small text is where you notice it.',
        '**Colours came back duller.** Expected for RGB brights. Ask for a proof and adjust.',
      ] },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'designing-for-social',
    title: 'Design social posts that read on a phone',
    summary: 'Pick the right format, keep text out of the interface, size type for a phone held at arm\'s length, and design a series that holds together.',
    category: 'craft',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['resize-to-every-format', 'size-presets', 'export-for-screen', 'layout-and-composition'],
    keywords: 'social media instagram post story reel youtube thumbnail linkedin banner x header facebook cover whatsapp safe zone text size phone carousel series template 1080x1350 1080x1920',
    body: [
      { t: 'p', text: 'Social graphics are seen for about a second, on a small screen, half covered by buttons, while the thumb keeps scrolling. Design for that and you can reuse the same idea across every platform. This article gives you the sizes, the safe zones and the text sizes that survive.' },

      { t: 'h', text: 'Pick the format first' },
      { t: 'table', head: ['Format', 'Pixels', 'Ratio', 'Notes'], rows: [
        ['Instagram post', '1080 × 1350', '4:5', 'Tall, so it takes more feed space than a square. A safe default.'],
        ['Square post', '1080 × 1080', '1:1', 'Works everywhere, smaller in the feed.'],
        ['Story or Reel cover', '1080 × 1920', '9:16', 'Full screen, heavily covered by the interface.'],
        ['YouTube thumbnail', '1280 × 720', '16:9', 'Seen very small in lists and side panels.'],
        ['LinkedIn banner', '1584 × 396', '4:1', 'Profile photo covers part of the lower left.'],
        ['X header', '1500 × 500', '3:1', 'Profile photo overlaps the lower left; crops on some screens.'],
      ] },
      { t: 'p', text: 'Studio adds X post (1600 × 900), Facebook cover (1640 × 624), WhatsApp flyer (1080 × 1350) and Email header (1200 × 600) as job formats. Full list: [Size presets](/learn/size-presets). Platforms revise their sizes and crops from time to time, so check the current spec before paid or high-stakes placements.' },

      { t: 'h', text: 'Safe zones' },
      { t: 'p', text: 'Platforms draw their own interface on top of your image: profile names, captions, buttons, progress bars. Anything important under them is lost.' },
      { t: 'list', items: [
        '**Stories:** Meta\'s guidance is to keep roughly the top and bottom 14 per cent (about 250 px on a 1920 px canvas) free of text and logos.',
        '**Reels:** the caption and buttons take more of the bottom and the right edge. Keep text in the upper-middle area and away from the right side.',
        '**YouTube thumbnails:** the video length sits in the bottom right corner. Keep faces and words out of it.',
        '**Banners and headers:** the profile photo covers part of the lower left, and different screens crop the top and bottom differently. Keep key content in the centre band.',
        '**Profile grids** show a cropped thumbnail of each post. Keep the subject away from the edges if the grid matters to you.',
      ] },
      { t: 'tip', text: 'Make a safe zone once: add guides with View, Guides, **New guide…** (for a Story, horizontal guides at 250 and 1670 px), then save the empty design with File, **Save as template**. Every new Story starts with the zones marked.' },

      { t: 'h', text: 'Text size for phones' },
      { t: 'p', text: 'A 1080 px wide post is shown about 360 to 430 layout pixels wide on most phones, so it is displayed at roughly a third to two-fifths of its size. Text set at 36 px on the canvas appears around 13 px on screen: caption size. Rough minimums on a 1080 px wide canvas:' },
      { t: 'table', head: ['Text', 'Minimum on a 1080 px canvas', 'Appears on a phone at about'], rows: [
        ['Headline', '80 to 120 px or more', '30 to 45 px'],
        ['Supporting line', '48 px', '18 px'],
        ['Small print (date, handle, URL)', '36 to 40 px', '13 to 15 px'],
      ] },
      { t: 'list', items: [
        'Keep it to about seven words of headline. Nobody reads a paragraph in a feed.',
        'Use strong contrast. Phones are used outdoors and at low brightness. Aim well above 4.5:1 for anything that must be read.',
        'Put text on calm areas of a photo, or add a scrim: a dark gradient behind the words.',
        'Check it small. In the Editor, zoom out with {{Ctrl+-}} until the design is about the width of your phone on your screen and read it from arm\'s length. On a Mac, use Cmd.',
      ] },

      { t: 'h', text: 'One idea, every format' },
      { t: 'p', text: 'Design the most constrained format first, usually the 4:5 post, then adapt. Adapting is not stretching: a wide banner needs the elements rearranged side by side, and a Story needs them stacked with space above and below for the interface.' },
      { t: 'steps', items: [
        'Finish the master design.',
        'Choose File, **Resize for other formats…**, tick the formats you need and choose **Download N as PNG** for a ZIP, or **Save as separate designs** to fine-tune each one. Backgrounds stretch to fill; everything else keeps its place and scales to fit. Your current design is not changed.',
        'Open each saved version and move things out of the safe zones.',
      ] },
      { t: 'p', text: 'In a Studio job, the **Key visual** tab builds every format you owe from one master, and Layer, Formats, **Update formats from master** carries later changes across. See [Resize to every format](/learn/resize-to-every-format).' },

      { t: 'h', text: 'Design a series' },
      { t: 'p', text: 'A campaign or carousel should be recognisable from any single post. Fix a few things and vary the rest.' },
      { t: 'list', items: [
        '**Fix:** grid and margins, headline position, fonts and sizes, logo position and size, the colour palette.',
        '**Vary:** the photo, the background colour within the palette, the words.',
        'Save one finished post as a template (File, **Save as template**) and start every post from it. Opening a template makes a fresh copy.',
        'Put brand colours and fonts in the **Brand kit** (Edit, Brand kit…) so they are ready in every design.',
        'For carousels, let one element cross the join between slides so people swipe.',
      ] },

      { t: 'h', text: 'Export' },
      { t: 'list', items: [
        'Export at **1×**. The presets are already at platform size.',
        '**PNG** for graphics with text and flat colour; **JPG** for photo-led posts. Platforms recompress uploads either way.',
        'Some platforms do not accept WebP uploads. Stick to PNG or JPG unless you know it is supported.',
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'building-a-brand-identity',
    title: 'Build a brand identity from brief to rules',
    summary: 'Turn a brief into a direction, then a logo, colour, type and a set of rules someone else can follow, using Studio and the brand guideline builder.',
    category: 'craft',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['brand-guidelines', 'start-a-job-from-a-brief', 'references-and-palettes', 'brand-kit'],
    keywords: 'brand identity branding logo design visual identity brand guidelines style guide brand book logo clear space minimum size wordmark logomark brand strategy moodboard directions',
    body: [
      { t: 'p', text: 'An identity is not a logo. It is a small set of decisions (mark, colour, type, space, voice) that let many people make things that look like they came from one place. This article walks through how a designer gets there, in order, and where each step lives in Voidcanvas.' },

      { t: 'h', text: '1. Read the brief for the problem' },
      { t: 'p', text: 'A brief lists what the client wants. Your job is to find what they need. Write down, in plain words:' },
      { t: 'list', items: [
        'Who it is for, specifically. "Everyone" is not an audience.',
        'What should people think or feel after seeing it: three words at most.',
        'Who the competitors are, and what they all look like, so you can avoid it.',
        'Where it will live: signage, app icon, social, packaging. A mark that must work at 16 px and on a van has different constraints.',
      ] },
      { t: 'p', text: 'In Studio, start a job and paste the brief into the **Brief** tab. See [Start a job from a brief](/learn/start-a-job-from-a-brief).' },

      { t: 'h', text: '2. Research and directions' },
      { t: 'p', text: 'Collect references: other identities, type, photography, textures, anything that carries the feeling. Then group them into two or three distinct **directions**, each with a name, a one-line idea and a few keywords. Directions let a client choose a route before you spend days on detail, and they stop you falling in love with the first idea.' },
      { t: 'p', text: 'In a Studio job, the **References** tab keeps images and pulls a palette from each. The **Directions** tab holds each route with its references, notes and swatches. See [References and palettes](/learn/references-and-palettes) and [Directions and review](/learn/directions-and-review).' },

      { t: 'h', text: '3. The mark' },
      { t: 'p', text: 'Common kinds: a **wordmark** (the name set in considered type), a **lettermark** (initials), a **symbol**, or a **combination** of symbol and name. Wordmarks are often the right answer for new brands, because nobody knows the symbol yet.' },
      { t: 'list', items: [
        '**Sketch in black first.** If it does not work in one flat colour, colour will not save it.',
        '**Test it small.** Shrink it to 16 px and 32 px wide. Fine lines and small counters close up; simplify until it survives.',
        '**Test it reversed.** White on a dark or brand-coloured background, and dark on light.',
        '**Test it on photos.** It will end up on busy images whether you plan for it or not.',
      ] },
      { t: 'p', text: 'In the Editor you can draw a mark with the Pen ({{P}}) and shapes ({{U}}), combine parts with Layer, Pathfinder (**Unite**, **Minus front**, **Intersect** and more), and export a path with **Export path as SVG…**. See [Shapes and the Pen](/learn/shapes-and-pen).' },

      { t: 'h', text: '4. Rules for the mark' },
      { t: 'p', text: '**Clear space** is the empty margin around the logo that nothing else may enter. Define it from the mark itself, not in millimetres, so it scales: a common choice is half the height of the mark (½ H). **Minimum size** is the smallest width at which it stays legible: typically 16 to 48 px on screen, and roughly 15 to 25 mm in print depending on detail.' },
      { t: 'p', text: 'The logo should also clear 3:1 contrast against every background you allow, which is WCAG\'s non-text contrast level. Where the full-colour version fails, specify a reversed (white) or single-colour dark version.' },

      { t: 'h', text: '5. Colour and type' },
      { t: 'p', text: 'Give colours roles (brand, secondary, accent, neutral) and build tints for each. Keep one accent per view. Choose at most two type families with clear jobs and a type scale. The detail is in [Choose colours that work on screen and in print](/learn/colour-that-works) and [Set type that reads well](/learn/typography-fundamentals).' },

      { t: 'h', text: '6. Write the rules down' },
      { t: 'p', text: 'A guideline is what lets someone else use the brand without you. Keep it short and specific: every rule should be something a person can check. Include the logo and its versions, clear space and minimum size, the palette with values and contrast-safe pairings, the type scale, spacing and grid, examples in use, and a few dos and don\'ts for voice.' },

      { t: 'h', text: 'Do it in Voidcanvas' },
      { t: 'steps', items: [
        'Open Studio and choose **Brand guideline builder**.',
        'On **Identity**, enter the **Brand name** and **Tagline** and **Add logo** (SVG, PNG or JPG). A flat background is removed so the mark sits on any colour, and the brand colour is taken from the logo if it has one.',
        'Set **Clear space** (¼ H, ½ H or 1 H, measured from the height of the mark) and **Minimum width** (16, 24, 32 or 48 px). The **Logo contrast** list shows, for each background, whether the full-colour, reversed or dark mono version reaches 3:1.',
        'Choose a **Personality** (Bold, Refined, Playful, Minimal, Warm or Technical) and an **Art direction** (editorial, graphic or systematic). Personality steers the fonts, scale and corners the builder suggests; art direction sets the design principles.',
        'Work through the **Colour** and **Type** tabs. Anything you edit is locked; press **New take** to regenerate everything unlocked while keeping your decisions.',
        'Check the header button until it reads "All N checks pass", or fix what it lists.',
        'On **Export**, produce the **Screen PDF**, **Print PDF** or **HTML handoff**, tokens for developers, or a **.ase** swatch file. **Save as a client brand in Studio** makes it available to jobs.',
      ] },
      { t: 'p', text: 'Once saved, pick the brand on a Studio job and the Editor\'s **Brief** panel checks every design against it, flagging off-brand colours and fonts with a **Fix** button. For everyday work, put the colours, fonts and logos in the Editor\'s **Brand kit** too. See [Brand guidelines](/learn/brand-guidelines) and [Brand kit](/learn/brand-kit).' },
      { t: 'try', label: 'Open Studio', href: '/studio' },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**The logo only works in colour.** Go back to black and white and simplify.',
        '**The client picks bits from every direction.** Directions were too similar or too vague. Make them clearly different and explain the idea behind each.',
        '**Nobody follows the guideline.** It is too long or too vague. Replace adjectives with numbers: sizes, ratios, hex values, spacing units.',
      ] },
    ],
  },
]
