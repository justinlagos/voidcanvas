import type { Article } from '../types'

// Editor: boards, formats, import, export, templates, versions, history, menus and workspaces.
// Every label, number and shortcut here was checked against src/editor (September 2026).

export const articles: Article[] = [
  // ─── Boards ────────────────────────────────────────────────────────
  {
    slug: 'artboards',
    title: 'Work with boards (artboards)',
    summary: 'Put several boards of different sizes in one design, then add, move, resize, duplicate, tidy and delete them.',
    category: 'editor',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['resize-to-every-format', 'export-for-screen', 'layers', 'workflow-social-campaign'],
    keywords: 'artboard artboards board boards frames pages multiple sizes canvas multi page layout',
    body: [
      { t: 'p', text: 'Boards let one design hold several pages side by side, each with its own size, name and layers. Use them when a job has a set of pieces that belong together: a post, a story and a banner for the same launch, or the pages of a small leaflet. You keep everything in one file and can see the whole set at once.' },

      { t: 'h', text: 'How boards work' },
      { t: 'list', items: [
        'Each board has a name, a width and height in pixels, and a background. A board you add gets a white background.',
        'Every layer belongs to one board. When you drag a layer so its centre crosses into another board, it joins that board.',
        'The canvas around the boards grows and shrinks to fit them, so you can place boards anywhere.',
        'A plain design with one canvas has no boards at all. Nothing changes for it until you add some.',
      ] },
      { t: 'p', text: 'In the Layers panel, each board is a row with its size beside the name and its layers listed under it. Click the arrow to collapse a board, and click the row to make it the active board. An active board is outlined in the accent colour on the canvas.' },

      { t: 'h', text: 'Open the Boards dialog' },
      { t: 'p', text: 'Choose **File, Boards…**. The dialog has two tabs: **Boards**, for managing the boards you have, and **Cascade to touchpoints**, for laying one board out at many sizes (covered in [Resize one design to every format](/learn/resize-to-every-format)).' },

      { t: 'h', text: 'Add a board' },
      { t: 'steps', items: [
        'Open **File, Boards…** and stay on the **Boards** tab.',
        'Under **Add a board**, click a size: Instagram post, Square post, Story or Reel cover, YouTube thumbnail, LinkedIn banner, X header, Presentation slide or Website hero.',
        'For any other size, type a **Width** and **Height** and click **Add custom board**. Boards can be 16 to 8000 pixels on each side.',
        'The new board appears to the right of your existing boards, with a 120 pixel gap, and becomes the active board.',
      ] },
      { t: 'tip', text: 'If you have a finished single-canvas design and want more sizes of it, use the **Cascade to touchpoints** tab instead. It turns your canvas into the first board and lays its layers out on each new board for you.' },

      { t: 'h', text: 'Move a board' },
      { t: 'p', text: 'Every board has a name badge above its top-left corner showing its name and size. Drag the badge to move the board anywhere on the canvas. Everything on the board moves with it. When boards sit close together and the badge would overlap another board, it moves inside the board\'s corner instead.' },
      { t: 'p', text: 'With several boards, **Organise boards into a clean grid** (in the Boards dialog) lines them up in rows and columns with even gaps. Use it after a lot of dragging, or before you show the design to someone.' },

      { t: 'h', text: 'Resize a board' },
      { t: 'p', text: 'In the Boards dialog, each board card has width and height fields under its name. Type a new value and press Enter. The board changes size from its top-left corner. The layers on it are **not** scaled or moved, so check the edges afterwards: shrinking a board can leave layers hanging over its side.' },
      { t: 'p', text: 'To change a board\'s size and have the content re-laid for it, make a new board with Cascade instead and delete the old one.' },

      { t: 'h', text: 'Rename, duplicate and delete' },
      { t: 'table', head: ['To do this', 'Where'], rows: [
        ['Rename', 'Type in the name field on the board\'s card in the Boards dialog, or double-click the board name in the Layers panel.'],
        ['Duplicate', 'The copy icon on the board\'s card. The copy has "copy" added to its name, sits to the right of your boards, and gets its own independent groups.'],
        ['Delete', 'The × on the board\'s name badge on the canvas, the bin icon on its card, the bin on its row in the Layers panel, or drag the board row onto the Layers panel bin.'],
        ['Make active', 'Click its thumbnail in the dialog, click its row in the Layers panel, or click an empty part of it with the Move tool.'],
      ] },
      { t: 'warn', text: 'Deleting a board deletes every layer on it. Undo ({{Ctrl+Z}}) brings the board and its layers back. A design must keep at least one board. When only one is left, the × on the canvas and the bin in the Layers panel disappear, and the bin in the Boards dialog asks you to add another board first.' },

      { t: 'h', text: 'Zoom to a board' },
      { t: 'keys', rows: [
        ['Shift+1', 'Fit board: zoom to the active board'],
        ['Ctrl+0', 'Fit on screen: show every board'],
        ['Shift+2', 'Fit selected layers'],
      ] },
      { t: 'p', text: 'These are also in the **View** menu. On a Mac, use Cmd where it says Ctrl.' },

      { t: 'h', text: 'Export boards' },
      { t: 'p', text: 'Open **File, Export as…** ({{Ctrl+E}}). When the design has more than one board, the top of the dialog picks which to export: **This board**, **All N**, a **Boards** field for a range such as 1-3, 5, or click the thumbnails. Pick the file type and the size (1× is each board at its own size). With more than one board the button reads **Download N PNGs (zip)**, and the files are numbered in board order (01, 02…); the switch for that is under **More options**, on by default. Files are named after their boards, with the pixel size added unless the name already has it. For PDF, **More options** chooses **One PDF** with a page per board, or **A PDF per board**. See [Export for screens](/learn/export-for-screen).' },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        'Photoshop files with artboards open as boards, with their backgrounds. See [Open PSD, PDF and other files](/learn/import-psd-and-pdf).',
        'Brand guidelines sent from Studio open with one board per page.',
        'Name your boards before exporting the zip. The file names come from the board names.',
        'The Boards dialog is in the File menu on desktop and tablet screens, and under **More** in the phone Editor.',
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─── Resize to every format ────────────────────────────────────────
  {
    slug: 'resize-to-every-format',
    title: 'Resize one design to every format',
    summary: 'Turn one finished design into posts, stories, thumbnails and banners, as a ZIP of PNGs, as separate designs, or as linked boards.',
    category: 'editor',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['artboards', 'size-presets', 'designing-for-social', 'workflow-social-campaign'],
    keywords: 'resize resizer magic resize formats all sizes instagram story youtube linkedin x twitter header cascade variants adapt',
    body: [
      { t: 'p', text: 'Once one version of a design is right, you usually need it in several shapes. Voidcanvas has three ways to do that. Pick the one that matches what happens next: a quick download, separate files to fine-tune, or linked boards that stay in step with the original.' },

      { t: 'h', text: 'Which method to use' },
      { t: 'table', head: ['Method', 'Where', 'What you get', 'Best for'], rows: [
        ['Resize for other formats', 'File, Resize for other formats…', 'A ZIP of PNGs, or one new saved design per size. Your design is not changed.', 'A quick set of files, or copies you will finish one by one.'],
        ['Cascade to touchpoints', 'File, Boards…, Cascade to touchpoints', 'New boards in the same design, linked to the source board.', 'Seeing every size together and adjusting them side by side.'],
        ['Update formats from master', 'Layer, Formats', 'Text, colours and pictures from the master pushed into every linked board, keeping each board\'s own layout.', 'Late copy changes after the formats are laid out.'],
      ] },

      { t: 'h', text: 'The sizes on offer' },
      { t: 'table', head: ['Preset', 'Pixels'], rows: [
        ['Instagram post', '1080 x 1350'],
        ['Square post', '1080 x 1080'],
        ['Story or Reel cover', '1080 x 1920'],
        ['YouTube thumbnail', '1280 x 720'],
        ['LinkedIn banner', '1584 x 396'],
        ['X header', '1500 x 500'],
        ['Presentation slide', '1920 x 1080'],
        ['Website hero', '2400 x 1200'],
        ['A4 flyer', '2480 x 3508'],
        ['A5 flyer', '1748 x 2480'],
        ['Poster 18 × 24 in', '5400 x 7200'],
        ['Business card', '1050 x 600'],
      ] },
      { t: 'p', text: 'The full list, with uses, is in [Size presets](/learn/size-presets).' },

      { t: 'h', text: 'Resize for other formats' },
      { t: 'steps', items: [
        'Open **File, Resize for other formats…**.',
        'Click the sizes you need. Square post, Story or Reel cover and YouTube thumbnail are picked to start with. A preset that matches your current size is greyed out and marked **Current size**.',
        'Click **Download N as PNG** to get a ZIP called "your design all sizes.zip", with one PNG per size named by preset and pixel size.',
        'Or click **Save as separate designs**. Each size is saved as its own design, named "your design (preset name)", so you can open it from the start screen and fine-tune it.',
      ] },
      { t: 'p', text: 'How layers are placed: any layer that covers at least 95 percent of the page in both directions (a background colour or full-bleed photo) is scaled up until it fills the new page, so it may be cropped at the edges. Everything else keeps its position relative to the centre and is scaled to fit, so nothing is cut off. Text is resized by changing its font size, so it stays sharp.' },

      { t: 'h', text: 'Cascade to touchpoints' },
      { t: 'steps', items: [
        'Make the board you want to copy the active board. On a single-canvas design, skip this: the canvas becomes the first board.',
        'Open **File, Boards…** and choose the **Cascade to touchpoints** tab.',
        'Pick sizes from all twelve presets. Square post, Story or Reel cover, YouTube thumbnail and LinkedIn banner are picked to start with.',
        'Click **Create N boards**. The new boards appear in a row to the right, each laid out with the same cover and fit rules as above.',
      ] },
      { t: 'p', text: 'The new boards remember which board they came from. That link powers the two update commands below.' },

      { t: 'h', text: 'Keep linked boards up to date' },
      { t: 'p', text: 'There are two ways to push changes from the source (master) board into the linked ones. They behave very differently.' },
      { t: 'table', head: ['Command', 'What it keeps', 'What it replaces'], rows: [
        ['Layer, Formats, Update formats from master', 'Each board\'s own positions and sizes.', 'Text, fonts, colours, pictures, styles, opacity and blend. New master layers are added; layers removed from the master are removed.'],
        ['Layer, Formats, Re-lay this format from master', 'Nothing on the active board.', 'The active linked board\'s layout, rebuilt from the master by layer role.'],
        ['Re-sync icon on a master board\'s card (Boards dialog)', 'Nothing on any linked board.', 'Every linked board, rebuilt from the master with the simple cover and fit rules.'],
      ] },
      { t: 'p', text: 'Use **Update formats from master** after you have nudged the layouts by hand: fix a typo or swap the photo on the master, run it, and your hand-made layouts survive. When the new copy is longer, it is shrunk to fit the space the old copy had. Use the re-lay commands only when you want to throw a layout away and start again.' },
      { t: 'h3', text: 'Layer roles' },
      { t: 'p', text: '**Re-lay this format from master** places layers by role: background, image, headline, subheading, body text, details, call to action, logo or decoration. Voidcanvas guesses each role from size, position and name. To correct a guess, select the layer and open the **Layer** section of the Properties panel, then change **Role in formats** from Automatic. A layer named with "logo" is treated as a logo.' },
      { t: 'p', text: 'With roles, a much wider board splits into a text column and an image side, and a much taller board stacks the image above the text. Logos keep their corner.' },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**Very different shapes need a nudge.** Going from a tall story to a thin LinkedIn banner with simple resizing makes text small. Use the role-based re-lay, or adjust by hand.',
        '**Backgrounds lose their edges.** A full-page photo is scaled to cover, so the sides or top are cropped. Move the photo layer inside the new board to choose what shows.',
        '**Resize for other formats ignores boards.** It treats the whole canvas as one page. For a design with boards, use Cascade.',
        '**The ZIP is 1x.** Resize for other formats writes PNGs at the preset size exactly. The board zip in the Export dialog is 2x.',
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─── Import ────────────────────────────────────────────────────────
  {
    slug: 'import-psd-and-pdf',
    title: 'Open PSD, PDF and other files',
    summary: 'What a Photoshop file keeps when you open it, how PDF pages arrive as layers, and every other way to bring work into the Editor.',
    category: 'editor',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['file-formats', 'workflow-psd-to-social', 'layers', 'troubleshooting'],
    keywords: 'import open psd photoshop pdf file upload place image drag drop paste void project missing fonts smart object layers kept',
    body: [
      { t: 'p', text: 'You can open photos, Photoshop files, PDFs and Voidcanvas project files straight into the Editor. Everything is read inside your browser: nothing is uploaded, and opening a file never changes it. (A .void you open stays linked to its file, so pressing Ctrl+S saves your changes back to it.) This article explains what survives the trip, so you know what to check before you start editing.' },

      { t: 'h', text: 'Ways to bring files in' },
      { t: 'table', head: ['Method', 'What it does'], rows: [
        ['File, Open… ({{Ctrl+O}})', 'Opens images, PSD, PDF and .void files.'],
        ['Start screen, Open a photo', 'Click to choose, or drop files onto it.'],
        ['Drop onto the canvas', 'Drag files from your computer onto an open design.'],
        ['Paste ({{Ctrl+V}})', 'Pastes an image from your clipboard as a new layer.'],
        ['File, Place image as layer… ({{Ctrl+Shift+P}})', 'Adds image files to the open design as new layers.'],
      ] },
      { t: 'p', text: 'When no design is open, the first image starts a new design at that image\'s size, named after the file. When a design is open, images are added to it as layers. On a Mac, use Cmd where it says Ctrl.' },
      { t: 'note', text: 'Photos larger than 4096 pixels on their longest side are scaled down to 4096 when they come in. This keeps the Editor responsive in the browser.' },

      { t: 'h', text: 'Photoshop (.psd)' },
      { t: 'p', text: 'A PSD opens as a real layered design, not a flat picture. Here is what comes through.' },
      { t: 'h3', text: 'Kept and still editable' },
      { t: 'list', items: [
        'Pixel layers, with their position, opacity, fill opacity, visibility and colour labels.',
        'Groups, including groups inside groups, with their blend mode and opacity.',
        'Layer masks and clipping.',
        'Locks: transparent pixels, pixels and position.',
        'Text layers, as editable type, when the whole layer uses one font, one size and one colour.',
        'Adjustment layers: brightness and contrast, levels, curves, exposure, vibrance, hue and saturation (including single colour ranges), colour balance, black and white, photo filter, channel mixer, invert, posterize, threshold and gradient map.',
        'Layer styles: drop shadow, inner shadow, outer glow, inner glow, stroke, colour overlay, gradient overlay, and bevel and emboss.',
        'Photoshop artboards, which become [boards](/learn/artboards) with their background colour.',
      ] },
      { t: 'h3', text: 'Changed so it would open' },
      { t: 'list', items: [
        'Text with mixed fonts, sizes or colours, warped text and text on a path are kept as pixels.',
        'Smart objects and vector shapes are kept as pixels.',
        'Blend modes Voidcanvas cannot draw (such as linear burn, linear dodge, vivid light, pin light and dissolve) use the nearest match.',
        '16-bit files become 8-bit, and CMYK or other colour modes become RGB.',
        'Gradient or pattern strokes become a solid colour. Gradient overlays preserve multiple colour stops and gradient type; custom opacity stops and midpoint interpolation are simplified.',
        'Group masks are left out. A black and white tint is left out.',
        'An adjustment clipped to one layer is unclipped, so it affects everything below it.',
      ] },
      { t: 'h3', text: 'Not supported yet' },
      { t: 'list', items: [
        'Satin and pattern overlay effects.',
        'Any adjustment layer type not in the list above.',
      ] },
      { t: 'p', text: 'When anything was changed or left out, a report opens titled **Opened** and the file name. It lists what was **Kept**, what was **Changed so it would open** and what is **Not supported yet**. Read it before you edit, so nothing surprises you later.' },
      { t: 'h3', text: 'Missing fonts' },
      { t: 'p', text: 'If the PSD uses fonts that are not on your device or on Google Fonts, **Some fonts are missing** opens. Each font is read for what kind of face it is (a geometric sans, a high-contrast serif, a condensed face, a script) from its name, style words and common abbreviations such as BdCn, and two replacements are offered: **Closest match**, the nearest available face of the same kind and width, and **Safer fallback**, the plainest face of that kind. The list under them ranks every available font with a reason. Or click **Add font file** to load a .ttf, .otf, .woff or .woff2 file. Fonts you add are saved inside the design, so it looks the same next time.' },

      { t: 'h', text: 'PDF' },
      { t: 'p', text: 'Each page of a PDF becomes its own pixel layer, named Page 1, Page 2 and so on, with page 1 at the bottom of the stack. Only page 1 is visible at first. Turn the others on in the Layers panel. The design takes the size of page 1 and gets a white background.' },
      { t: 'list', items: [
        'Pages are rendered at up to twice their printed point size. An A4 page comes in at about 1190 x 1684 pixels.',
        'Text in a PDF becomes pixels. You cannot edit it as type. Add new text layers on top instead.',
        'Password-protected PDFs will not open.',
      ] },

      { t: 'h', text: 'Voidcanvas project files' },
      { t: 'p', text: 'Two file types carry a whole editable design: layers, masks, groups, swatches and board layout.' },
      { t: 'table', head: ['File', 'How to make it', 'Notes'], rows: [
        ['.void', 'File, Save to disk… or File, Download project file (.void)', 'A self-contained project file. Good for backups and for moving a design to another browser. Save to disk keeps the file linked, so Ctrl+S updates it in Chromium browsers.'],
        ['.void.png', 'File, Download editable picture (.void.png)', 'A normal PNG preview of your design (up to 1600 pixels) with the full project hidden inside it. It previews anywhere; open it in Voidcanvas to get the layers back.'],
      ] },
      { t: 'p', text: 'Opening either one creates a new copy of the design on this device. In Chrome, Edge and other Chromium browsers, a .void opened with File, Open or dropped on the start screen stays linked, so Ctrl+S also writes your changes back to that file. A plain PNG with no project inside shows "That PNG has no Voidcanvas project inside it."' },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**"Could not read that PSD."** The file may be damaged or use something the reader cannot handle. Try saving it again from Photoshop, or save a flattened copy.',
        '**"That PSD has no layers we can read."** Flatten it first, then open it.',
        '**Text looks slightly shifted.** Photoshop and browsers set type a little differently. Compare against the original and nudge.',
        '**Very large PSDs are slow.** The Editor draws with the browser\'s 2D canvas, so big files take longer to open and edit.',
        '**You need a PSD back.** Voidcanvas does not export PSD. Export PNG, or keep a .void file for editing later.',
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─── Export for screen ─────────────────────────────────────────────
  {
    slug: 'export-for-screen',
    title: 'Export for screens: PNG, JPG, WebP and SVG',
    summary: 'Pick the right file type and size for web and social, export the selected layers on their own, name files your way, and pick up where the last export left off.',
    category: 'editor',
    level: 'Beginner',
    updated: '2026-10-02',
    related: ['export-for-print', 'artboards', 'image-resolution-explained', 'file-formats'],
    keywords: 'export download save png jpg jpeg webp svg vector transparent background clipboard copy image retina 2x scale quality share file names naming pattern selection layer asset trim remembered last export also needed variation',
    body: [
      { t: 'p', text: 'Exporting turns your layered design into one image file you can post, send or put on a website. The design itself stays on your device, editable, so you can export as many times as you like. Getting the type and size right keeps files sharp and small.' },

      { t: 'h', text: 'Export in four steps' },
      { t: 'steps', items: [
        'Choose **File, Export as…** or press {{Ctrl+E}} (Cmd+E on a Mac).',
        'Pick where the file is going: **PNG · Social**, **PNG · Transparent**, **JPG · Web**, **PDF · Print** or **PDF · Client proof**. Each sets the file type, size and quality for that destination. Or pick the file type (PNG, JPG, WebP, PDF or SVG) and the size (1× to 4×) yourself, below them.',
        'Read the preflight list, if one appears, and fix or accept what it says.',
        'Click **Download PNG** (or JPG, WEBP, PDF, SVG), or **Copy** to put it on your clipboard.',
      ] },
      { t: 'h', text: 'Destinations' },
      { t: 'table', head: ['Destination', 'What it sets'], rows: [
        ['PNG · Social', 'PNG at board size, flat background. Instagram, WhatsApp, LinkedIn.'],
        ['PNG · Transparent', 'PNG with board colours left out, for placing on other work.'],
        ['JPG · Web', 'JPG at board size, 85% quality. Websites and email.'],
        ['PDF · Print', 'One page per board at its own size, 95% quality. Studio delivery adds bleed and crop marks for print sizes.'],
        ['PDF · Client proof', 'Half size, 80% quality, one page per board. For approvals, not production.'],
      ] },
      { t: 'h', text: 'Preflight' },
      { t: 'p', text: "Before the button, the dialog says what will happen to these boards at this size, only when there is something to say. A red dot needs attention, an amber one is worth checking. It never blocks the export." },
      { t: 'list', items: [
        "**A picture that will print soft**: a photo that is 640 px wide and prints at 11.7 in comes out at about 55 ppi, said in those words, with **Replace image** to jump to the layer. Print sizes come from the Studio job's formats, or from the design's dpi when it is 150 or more.",
        "**Text running past the edge** of the board, which will be cut off. **Select** jumps to it.",
        "**Empty text layers** and **hidden layers**, which will not export.",
        "**A board at a size the browser cannot draw**, with the scale that would work.",
        "**A missing font** drawn in a stand-in, with **Review fonts**.",
        "**A print size exported as PNG or JPG**: a print PDF adds bleed and crop marks; images do not.",
      ] },
      { t: 'h', text: 'Your choices are kept with the design' },
      { t: 'p', text: "The Export dialog opens with the choices you used last time for this design: file type, size, quality, transparency, which boards and the file names. They are saved with the design, so they are still there after a reload or on another day. A design you have never exported starts from the choices you used last in this window." },
      { t: 'p', text: "The top of the dialog says what was exported last, such as **Last exported 2 hours ago: 2 of 4 boards, PNG**, and boards exported before say **exported** under their thumbnail. Undo never takes an export record back." },

      { t: 'h', text: 'File names' },
      { t: 'p', text: "Files are named from a pattern, under **More options, File names**. The pattern starts as `{design}_{board}_{w}x{h}`, so a Story board of a design called Launch downloads as `Launch_Story_1080x1920.png`. Click a part to add it, or type your own. **For example** shows the name the first file will get, and **Reset** goes back to the usual pattern." },
      { t: 'table', head: ['Part', 'Becomes'], rows: [
        ['{design}', 'The design name.'],
        ['{board}', 'The board name. A board name that already says its size does not say it twice.'],
        ['{n}', 'The board number, 01, 02 and so on.'],
        ['{w} and {h}', 'Width and height in pixels, at the size you export.'],
        ['{scale}', 'The size, such as 2x.'],
        ["{date}", "Today, as 2026-10-02."],
      ] },
      { t: 'p', text: 'Several files in a zip get their board number in front, unless the pattern places `{n}` itself, so the zip keeps your board order.' },

      { t: 'h', text: 'Export the selected layers' },
      { t: 'p', text: "Select one or more layers, or a group, and open Export. **Selected layers**, at the top, exports just them, trimmed to what they cover (with their shadows and glows), at any size. Transparency is on, so a logo or a cut-out comes out ready to place. Board colours and board effects are left out, and layers are not cut off at the board edge. The file is named after the layer, the group, or **Selection** for a mix. A selection export does not change the choices the design's boards export with." },

      { t: 'h', text: 'Which file type' },
      { t: 'table', head: ['Type', 'What the dialog says', 'Use it for'], rows: [
        ['PNG', 'Best quality. Keeps transparency.', 'Graphics with text, logos, anything with see-through areas. The safe default.'],
        ['JPG', 'Smallest file for photos. No transparency.', 'Photo-heavy designs where file size matters, such as email.'],
        ['WebP', 'Small file that keeps transparency. Best for websites.', 'Website images. Most modern browsers and many platforms accept it.'],
        ['PDF', 'For printers and clients.', 'See [Export for print](/learn/export-for-print).'],
        ['SVG', 'Type and shapes stay vectors.', 'Handing a layout to Illustrator, Figma or Inkscape, or to a website, with the type still editable.'],
      ] },
      { t: 'p', text: 'For JPG, WebP and PDF, **More options** has a **Quality** slider, from 40 to 100 percent, starting at 92 (a PDF never goes below 90). Lower numbers make smaller files with more blocky artefacts, most visible around text and flat colour. Between 80 and 92 is a sensible range for photos. PNG and SVG have no quality slider, and neither does a lossless print PDF.' },

      { t: 'h', text: 'What goes into an SVG' },
      { t: 'list', items: [
        '**Text stays text**, one line per line as on the canvas, with its font, weight, size, colour, letter spacing, alignment, underline and strike. The file asks for the built-in fonts from Google Fonts; a font you added from a file goes inside the SVG.',
        '**Shapes stay shapes**: rectangles with their rounded corners, ellipses, lines, polygons, stars and pen paths, with their fill and stroke.',
        '**Photos and painted layers** go in as images, with their masks applied: solid ones as high-quality JPEG, see-through ones as PNG.',
        '**Anything an SVG cannot draw the same way** goes in as an image of just that layer, trimmed, in its place: effects, layer styles, masks on type and shapes, clipping, text on a path, text shadows and outlines, combined paths, and strokes set inside or outside.',
        '**Adjustment layers** change everything below them, so all of that becomes one image, and the layers above stay vectors. Board and design effects make the whole board one image.',
        'Groups stay groups, and layers keep their names, so the file opens with the same structure.',
      ] },

      { t: 'h', text: 'Which size' },
      { t: 'p', text: 'The size buttons are 1×, 2×, 3× and 4× the design size, with the result in pixels shown beside them. Only sizes the browser can draw are offered (up to 16,384 px on a side and about 67 megapixels), so very large designs show fewer. If even 1× is too big, one smaller size is offered instead.' },
      { t: 'list', items: [
        '**1×** gives exactly your design size. Use it when you designed at the platform\'s size, such as 1080 x 1350 for an Instagram post.',
        '**2×** is for sharp screens and websites that show images at half their pixel size.',
        '**3× and 4×** make type and shapes bigger and still sharp. Photos only get bigger, not sharper.',
      ] },
      { t: 'p', text: 'Text, shapes and layer styles are drawn fresh at the export size, so they stay crisp at 2× and 3×. Photos cannot gain detail they never had: scaling a small photo up makes it bigger, not sharper. More in [Image resolution explained](/learn/image-resolution-explained).' },

      { t: 'h', text: 'Transparency' },
      { t: 'list', items: [
        'If your design has no background colour, PNG and WebP keep the empty areas transparent.',
        'If it has one, open **More options** and tick **Transparent background (leave out board colours)**. The layers export on a transparent background. SVG can leave them out too.',
        'JPG cannot be transparent. Empty areas become white.',
      ] },

      { t: 'h', text: 'Copy to the clipboard' },
      { t: 'p', text: '**Copy** (shown when one board is picked) always copies a PNG at the size you picked. You will see "Copied. Paste it anywhere." Paste it into a chat, a document or another app. Some browsers limit clipboard access; if copying fails, use Download.' },

      { t: 'h', text: 'Boards and editable files' },
      { t: 'list', items: [
        'With [boards](/learn/artboards), pick which to export at the top of the dialog: **This board**, **All N**, a **Boards** field for a range such as 1-3, 5, or click the thumbnails. Several boards download as a zip, one file per board, named by the pattern. **More options** has **Number files in board order (01, 02…)**, on by default. When you last exported All, the next export picks every board again, new ones included.',
        '**File, Download editable picture (.void.png)** makes a PNG that also carries your full project. Send it to someone who uses Voidcanvas, or keep it as a backup. **Download project file (.void)** saves the project alone.',
      ] },

      { t: 'h', text: 'Other places to export' },
      { t: 'list', items: [
        'On the start screen, the **…** menu on a recent design has **Export PNG** (**Export PNGs** with boards), which downloads every board at full size without opening the design.',
        'On a phone, tap **Share** at the top. Phone exports are recorded with the design like any other. **Share PNG** hands the file to your phone\'s share sheet where it can, otherwise **Save PNG** downloads it. JPG and PDF sit beside it, with 1x and 2x sizes, and **More options** opens the full Export dialog.',
      ] },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        'Each Download also saves an automatic restore point called "Exported" in [Version history](/learn/templates-and-versions).',
        'If export fails, the message says what was too big and what will work, such as the scale to drop to or exporting fewer boards at once.',
        'A single path can also be exported on its own with **Layer, Path, Export path as SVG…**.',
      ] },

      { t: 'h', text: 'After you export' },
      { t: 'p', text: 'A small card appears in the corner for a while. It never blocks anything; close it or ignore it.' },
      { t: 'list', items: [
        "**Also needed?** lists boards of this design you have not exported yet (one click opens Export with just them), and common sizes from the same family the design does not have, such as a YouTube thumbnail after an Instagram post. Clicking a size lays this board out at that size as a linked board, the same as [Cascade](/learn/resize-to-every-format). A design from a Studio job only offers its own boards; its formats come from the job.",
        "**Use this again** has **Save as template** and **Duplicate as variation** (see [Templates and versions](/learn/templates-and-versions)).",
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─── Export for print ──────────────────────────────────────────────
  {
    slug: 'export-for-print',
    title: 'Export for print: PDF, dpi and bleed',
    summary: 'How the Editor\'s PDF works, which sizes print at 300 dpi, how to add bleed yourself, and what to ask your printer.',
    category: 'editor',
    level: 'Intermediate',
    updated: '2026-10-02',
    related: ['designing-for-print', 'workflow-print-flyer', 'export-for-screen', 'crop-and-canvas'],
    keywords: 'print pdf 300 dpi bleed crop marks trim printer flyer poster business card cmyk resolution a4 a5 lossless flate compression',
    body: [
      { t: 'p', text: 'Printers need a file at the right physical size with enough pixels to look sharp on paper. The Editor exports a PDF for this, one page per board. Knowing exactly how that PDF is built lets you set up the design correctly from the start, rather than finding out at the print shop.' },

      { t: 'h', text: 'What the PDF contains' },
      { t: 'list', items: [
        'One page per board, each at its own size (or one page for a design without boards). **More options** can make **A PDF per board** instead, as a zip.',
        'Each page holds the board as one image. With **Lossless pages for print** (on with the **PDF · Print** destination) every pixel goes in exactly, with no JPEG compression, so flat colour and small type stay clean; the file is larger. Without it (**PDF · Client proof**, or PDF picked on its own) pages are high-quality JPEG, 90 percent or higher.',
        'Flattened onto white. Transparent areas print as white.',
        'RGB colour. There is no CMYK export.',
        'No bleed and no crop marks are added for you.',
      ] },
      { t: 'p', text: 'Because the pages are images, the text in the PDF is not selectable and fonts are not embedded as type. It prints exactly as it looks on screen. For type a printer or another designer can edit, export SVG as well.' },

      { t: 'h', text: 'How the page size is set' },
      { t: 'p', text: 'Each page size comes from its board\'s pixel size alone. If the longest side is more than 2000 pixels, Voidcanvas treats it as print work at 300 dpi. If it is 2000 pixels or less, it uses 96 dpi, a screen size.' },
      { t: 'table', head: ['Preset', 'Pixels', 'PDF page size'], rows: [
        ['A4 flyer', '2480 x 3508', '210 x 297 mm (A4) at 300 dpi'],
        ['A5 flyer', '1748 x 2480', '148 x 210 mm (A5) at 300 dpi'],
        ['Poster 18 × 24 in', '5400 x 7200', '18 x 24 in at 300 dpi'],
        ['Business card', '1050 x 600', 'About 278 x 159 mm, because 1050 is under 2000 so 96 dpi is used'],
      ] },
      { t: 'warn', text: 'The Business card preset is 3.5 x 2 inches at 300 dpi, but its PDF comes out at 96 dpi, so the page is far too big. For cards, export a PNG at 1× and tell the printer it is 1050 x 600 pixels for a 3.5 x 2 inch card at 300 dpi, or ask them to scale the PDF to size.' },
      { t: 'note', text: 'The **Resolution** field in **Image, Image size…** changes the print-size readout in that dialog and the dpi shown in the status bar. It does not change the PDF page size.' },

      { t: 'h', text: 'Export the PDF' },
      { t: 'steps', items: [
        'Start from a print preset on the start screen (A4 flyer, A5 flyer or Poster 18 × 24 in), or a custom size worked out at 300 dpi.',
        'Finish the design, then press {{Ctrl+E}} (Cmd+E on a Mac).',
        'Choose **PDF · Print**. It sets PDF at 1× and ticks **Lossless pages for print** under **More options**.',
        'Leave **Size** at 1×. Choosing 2× keeps the same page size but packs in twice the pixels, which makes a much bigger file for little visible gain.',
        'Click **Download PDF**. The next time you export this design, the dialog starts from these choices.',
      ] },

      { t: 'h', text: 'Add bleed yourself' },
      { t: 'p', text: 'Bleed is extra artwork past the trim edge, so a slight misalignment when cutting does not leave a white sliver. Most printers ask for 3 mm on each side. At 300 dpi, 3 mm is about 36 pixels (3.05 mm).' },
      { t: 'steps', items: [
        'With your design open, choose **Image, Canvas size…**.',
        'Tick **Relative**, then enter 72 in **Add to width** and 72 in **Add to height** (36 pixels on each side).',
        'Leave the anchor in the centre and click **Apply**. Layers are not scaled.',
        'Stretch your background colour or photo so it reaches the new outer edge.',
        'Choose **View, Guides, New guide…** and add guides 36 pixels in from each edge to show the trim line. Keep text and logos well inside it.',
      ] },
      { t: 'p', text: 'An A5 flyer with 3 mm bleed becomes 1818 x 2550 pixels, and still exports at 300 dpi. For the reasoning behind bleed, trim and safe areas, read [Designing for print](/learn/designing-for-print).' },
      { t: 'tip', text: 'Studio\'s brand guideline print PDF does add 3 mm bleed and crop marks automatically. That is a separate export for guideline documents, covered in [Brand guideline exports](/learn/brand-guideline-exports).' },

      { t: 'h', text: 'What to ask your printer' },
      { t: 'list', items: [
        'Do you accept an RGB PDF and convert it to CMYK for me? Bright blues, greens and purples can print duller after conversion.',
        'How much bleed do you want, and do you need crop marks?',
        'Is an image-based PDF at 300 dpi fine, or do you need a different format?',
        'Can I see a proof before the full run? Colour on screen and on paper never match exactly.',
      ] },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**Soft print.** Photos placed small and scaled up lose sharpness. Check them at 100% ({{Ctrl+1}}) before exporting.',
        '**Page is the wrong size.** Check the design\'s pixel size against the table above. Anything 2000 pixels or less on its longest side comes out at 96 dpi.',
        '**Very large posters fail to export.** Browsers have limits on image size. Try again after closing other tabs, or ask the printer whether a smaller poster size works.',
      ] },
      { t: 'try', label: 'Start a print design', href: '/editor' },
    ],
  },

  // ─── Reuse library ─────────────────────────────────────────────────
  {
    slug: 'reuse-library',
    title: 'Carry Looks, text styles and assets between designs with Reuse',
    summary: 'Save a layer\'s treatment, a text style, a logo, a colour, a font or a whole template once, then apply it in any design. The library shows where each item is used, so deleting or replacing one never breaks earlier work.',
    category: 'editor',
    level: 'Intermediate',
    updated: '2026-10-06',
    related: ['templates-and-versions', 'brand-kit', 'layer-styles', 'privacy-and-data'],
    keywords: 'reuse library look looks text style styles saved styles copy style paste style asset library logo library texture colour font template reusable components used in replace source',
    body: [
      { t: 'p', text: "Reuse keeps the decisions you make once, such as a headline treatment, a gold text colour or the client's logo, so you can apply them in the next design instead of rebuilding them. Everything stays in this browser on this device." },

      { t: 'h', text: 'Open the library' },
      { t: 'list', items: [
        "**Desktop:** the **Reuse** button in the top bar, or {{Alt+Shift+L}}.",
        "**Tablet:** the **Reuse library** icon in the top bar.",
        "**Phone:** **More**, then **Reuse library**. It opens as a sheet across the bottom of the screen.",
      ] },

      { t: 'h', text: 'Save something for reuse' },
      { t: 'p', text: "Select what you want to keep, type a name under **Save for reuse** (or leave it, and the layer's name is used), then press what you are saving. A button is greyed out when the selection cannot be saved that way." },
      { t: 'table', head: ['Button', 'Select first', 'What it keeps'], rows: [
        ['Look', 'A layer, or a whole group', 'Opacity, blend mode, layer styles and the effects in their order. For a group, the treatment of the group as a whole. Never the content, position or effect masks.'],
        ['Text style', 'One text layer', 'Font, size, weight, colour, alignment, line height, letter spacing, paragraph settings, outline and shadow. Never the words.'],
        ['Brand text style', 'One text layer, in a design with a client brand', 'The same as Text style, kept with that brand.'],
        ['Logo, Image, Texture', 'One image layer', 'The picture, as a PNG.'],
        ['Colour', 'One text or shape layer', 'The text colour, or the shape fill.'],
        ['Font', 'One text layer', 'The font family, and the font file when it is one you added from your computer.'],
        ['Template', 'Any open design', 'A copy of the whole design that never changes. Your open design is not turned into a template.'],
      ] },
      { t: 'p', text: "When a layer has a treatment worth keeping, the library may say **This treatment may be worth reusing.** **Don't suggest again** turns that off for good." },

      { t: 'h', text: 'Apply it' },
      { t: 'p', text: "Select the layers to change, find the item under **Your library** and press **Apply**. One {{Ctrl+Z}} undoes it." },
      { t: 'list', items: [
        "A Look or text style changes how the selected layers look, never what they say or where they are.",
        "A colour changes selected text and shapes. A font changes selected text and keeps the rest of its type settings.",
        "A logo, image or texture replaces the picture in the selected image layers and keeps their size and place. With no image layer selected, it is added as a new layer.",
        "A template opens a new design copied from it. The template stays as it was.",
      ] },
      { t: 'p', text: "Search by name with **Search library**, or show one kind with the menu beside it (**Looks**, **Text styles**, **Logos** and so on). Items you used recently come first." },

      { t: 'h', text: 'Used in, Replace and Delete' },
      { t: 'p', text: "Each item says **used in N designs** once you have applied it. That counts your saved designs and the design open now." },
      { t: 'list', items: [
        "**Replace source** (the circular arrows, on logos, images, textures, colours, fonts and templates) swaps the stored item for your current selection. Designs that already used it keep what they have until you apply it again, and the library says how many.",
        "**Remove from library** (the bin) deletes an unused item straight away. If designs use it, you are asked first, with their names. Deleting it never changes those designs.",
      ] },

      { t: 'note', text: "The library lives in this browser, like your designs. It is not sent anywhere. In a [private session](/learn/private-session) it is kept only until you close the tab." },
    ],
  },

  // ─── Templates and versions ────────────────────────────────────────
  {
    slug: 'templates-and-versions',
    title: 'Save templates and restore versions',
    summary: 'Reuse a layout as a template that never changes, and go back to, name and compare earlier states of a design with version history.',
    category: 'editor',
    level: 'Beginner',
    updated: '2026-10-02',
    related: ['saving-and-your-files', 'history-and-undo', 'reuse-library', 'brand-kit'],
    keywords: 'template templates reuse layout version history versions named versions compare restore recover backup snapshot older copy autosave crash approved variation duplicate alternative',
    body: [
      { t: 'p', text: 'Templates and versions both protect work you have already done. A template is a starting point you reuse for new designs. A version is a restore point for one design, so you can go back to how it looked an hour or a day ago. Both are kept in your browser on this device.' },

      { t: 'h', text: 'Save a design as a template' },
      { t: 'steps', items: [
        'Open the design you want to reuse, such as a weekly post layout.',
        'Choose **File, Save as template**.',
        'You will see "Saved as a template. Find it on the start screen under Your templates."',
      ] },
      { t: 'p', text: 'The template is a separate copy, named after your design with "template" added. Your open design carries on as before. **Save as template** is also on the card that appears after an export.' },

      { t: 'h', text: 'Start from a template' },
      { t: 'p', text: 'On the start screen, **Your templates** lists every template you have saved. Click one and it opens as a fresh copy, without "template" in its name. As the start screen says: "Opening one makes a fresh copy. The template itself never changes." Edit away without worrying about the original.' },
      { t: 'p', text: 'To remove a template, hover it on the start screen and click the bin icon. To change a template, open a copy, make your changes, save it as a template again, and delete the old one.' },
      { t: 'tip', text: 'Put your brand colours, fonts and logos in the [Brand kit](/learn/brand-kit) as well. A template holds a layout; the brand kit makes your colours and fonts ready in every design, template or not.' },

      { t: 'h', text: 'Duplicate as variation' },
      { t: 'p', text: "To try another idea without touching the design you have, choose **File, Duplicate as variation**, or **Duplicate as variation** on the card after an export. A full copy opens in a new tab beside the first, named **Launch variation 2**, then 3, and so on. It starts with no exports of its own, and keeps the export choices. The first design is unchanged in its own tab." },

      { t: 'h', text: 'How saving works' },
      { t: 'p', text: 'Your design autosaves to this device about a second after you stop changing it, every few seconds while you keep working, and whenever you leave it or close the tab. {{Ctrl+S}} saves straight away. Versions are extra restore points on top of that. Deleting a design deletes its versions too.' },

      { t: 'h', text: 'When versions are made' },
      { t: 'table', head: ['Label in the list', 'When'], rows: [
        ['Saved by you', 'You choose **File, Save a version** or press {{Ctrl+Alt+S}}.'],
        ['Automatic', 'Every 10 minutes while you are editing (after a few changes). Change the interval in Preferences.'],
        ['Exported', 'Each time you click Download in the Export dialog.'],
        ['Before image size', 'Before resizing an image to more than 4000 pixels.'],
        ['Before restoring an older version', 'Just before you restore, so the restore can be undone.'],
        ['Sent for review', 'When Studio makes a review version from this design. It is named Review v1, Review v2 and so on.'],
      ] },
      { t: 'p', text: 'On a Mac, the shortcut is Cmd+Option+S.' },

      { t: 'h', text: 'Restore a version' },
      { t: 'steps', items: [
        'Choose **File, Version history…**.',
        'Find the version by its thumbnail, label, date, time and size.',
        'Click **Restore** to replace the open design with that version. Your current state is saved as a version first, so nothing is lost.',
        'Or click **As copy** to open that version as a separate design called "(restored)", leaving the current one alone.',
      ] },
      { t: 'p', text: 'The bin icon deletes a version. **Save a version now** at the top adds one immediately; type a name first, such as Direction A, to save it with that name.' },

      { t: 'h', text: 'Name, keep and compare' },
      { t: 'list', items: [
        'Click a version\'s name to rename it. Enter keeps the new name, Escape the old one.',
        'The pin button keeps a version for good. A version the client approved in Studio is kept for good automatically and shows **Kept for good**; it cannot be deleted until you stop keeping it.',
        '**Compare** shows that version against the design as it is now, under a slider you drag across or side by side. Pick any two versions at the top, and a board when the design has several.',
      ] },

      { t: 'h', text: 'Change how often versions are made' },
      { t: 'p', text: 'Open **Edit, Preferences…** ({{Ctrl+,}}) and choose **History and saving**. Set **Automatic version every** anywhere from 0 to 60 minutes. 0 turns automatic versions off; versions you save by hand and export versions still work.' },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        'Each design keeps up to 30 versions. When there are more, the oldest automatic ones go first, then the oldest unnamed ones you saved by hand. Named versions and ones kept for good are never removed to make room.',
        'Versions and templates live in this browser only. Clearing site data or using another browser means they are not there. For a copy you control, use **File, Download project file (.void)**. See [Saving and your files](/learn/saving-and-your-files).',
        'In a [private session](/learn/private-session), versions are not saved.',
        'If the browser or tab closes unexpectedly, the start screen offers to reopen every design that was open.',
        'Versions are separate from undo. Undo steps are lost when you close a design; versions are not. See [History and undo](/learn/history-and-undo).',
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─── History and undo ──────────────────────────────────────────────
  {
    slug: 'history-and-undo',
    title: 'Undo, history and before and after',
    summary: 'Step back through your edits, jump to any point in the History panel, pin snapshots, and compare with and without adjustments.',
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['templates-and-versions', 'adjustment-layers', 'keyboard-shortcuts', 'workspaces-and-panels'],
    keywords: 'undo redo history panel step back revert snapshot before after compare backslash memory steps',
    body: [
      { t: 'p', text: 'Every change you make in the Editor is recorded as a named step. You can undo one step at a time, jump straight to any earlier step, or pin a snapshot to come back to. Knowing the limits helps you decide when to rely on undo and when to save a version.' },

      { t: 'h', text: 'Undo and redo' },
      { t: 'keys', rows: [
        ['Ctrl+Z', 'Undo'],
        ['Ctrl+Shift+Z', 'Redo'],
        ['Ctrl+Y', 'Redo'],
        ['\\ (hold)', 'See the design before adjustments and filters'],
      ] },
      { t: 'p', text: 'Undo and Redo are also at the top of the **Edit** menu. On a Mac, use Cmd where it says Ctrl. With touch, tap with two fingers to undo and three fingers to redo. On a phone, the undo and redo arrows sit in the top bar.' },

      { t: 'h', text: 'The History panel' },
      { t: 'p', text: 'The History panel is docked in the Essentials and Photo workspaces. If you are in the default Simple workspace, switch with **Window, Workspace, Essentials**. It lists every step, oldest first, each with a name such as Add board, Opacity or Nudge, and the time.' },
      { t: 'list', items: [
        'Click any step to jump the design back to that moment. Steps after it turn grey.',
        'If you then make a new change, the grey steps are discarded and your new change becomes the latest step.',
        'Hover a step and click its × to delete just that step. The first step cannot be deleted.',
        'The footer shows how many steps you have, the limit, and the memory they use.',
      ] },

      { t: 'h', text: 'Snapshots' },
      { t: 'p', text: 'A snapshot pins the current state with a name, above the list of steps. Click the camera icon, **New snapshot**, at the bottom of the History panel. Snapshots are named Snapshot 1, Snapshot 2 and so on. Click one to return to it, or hover and click × to remove it.' },
      { t: 'p', text: 'Use snapshots to compare two directions: take a snapshot, try something bold, then click the snapshot to see the earlier state again.' },

      { t: 'h', text: 'How many steps are kept' },
      { t: 'p', text: 'Open **Edit, Preferences…** ({{Ctrl+,}}), then **History and saving**, or click the **History settings** button at the bottom of the History panel.' },
      { t: 'table', head: ['Setting', 'Range', 'Starts at', 'What it does'], rows: [
        ['Undo steps kept', '20 to 500', '100', 'The most steps kept. Older steps drop off.'],
        ['Memory for undo', '200 to 4000 MB', '1200 MB', 'When undo uses more memory than this, the oldest steps are dropped first, so the browser never runs out.'],
      ] },
      { t: 'p', text: 'Painting on big photos uses much more memory per step than moving text, so on large images you may have fewer steps than the limit. The last five steps are always kept.' },

      { t: 'h', text: 'Before and after' },
      { t: 'p', text: 'Hold the backslash key (\\) to hide every adjustment layer and filter layer. A label reads "Before: adjustments and filters hidden". Let go to see them again. **View, Before and after (hold \\)** shows the before view for a moment if you prefer a menu.' },
      { t: 'p', text: 'This compares your colour and filter work only. Painting, masks, moved layers and layer styles stay as they are. To compare against an earlier state of everything, use a snapshot or the History panel.' },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**Undo is empty after reopening a design.** Undo steps and snapshots are kept only while the design is open. Opening, switching to another tab, or closing the design clears them. Use [Version history](/learn/templates-and-versions) for restore points that last.',
        '**Old steps have gone.** You reached the step limit or the memory limit. Raise either in Preferences, or save a version before big changes.',
        '**Hold \\ does nothing.** Nothing to hide: the before view only hides adjustment and filter layers. See [Adjustment layers](/learn/adjustment-layers).',
        '**Keys do nothing while typing.** Shortcuts pause while a text box has focus. Click the canvas first.',
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─── Command palette and menus ─────────────────────────────────────
  {
    slug: 'command-palette-and-menus',
    title: 'Find any action: menus, Ctrl+K and the shortcut sheet',
    summary: 'Use the menu bar, search every command with Ctrl+K, and look up any shortcut with the ? sheet.',
    category: 'editor',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['keyboard-shortcuts', 'editor-tour', 'workspaces-and-panels', 'history-and-undo'],
    keywords: 'command palette search actions ctrl k cmd k menu bar menus shortcuts cheat sheet question mark find command photoshop',
    body: [
      { t: 'p', text: 'The Editor has one list of actions behind the menus, the command palette and the keyboard shortcuts. So a command has the same name and shortcut wherever you meet it. If you know roughly what you want but not where it lives, search for it.' },

      { t: 'h', text: 'Search every action with Ctrl+K' },
      { t: 'steps', items: [
        'With a design open, press {{Ctrl+K}} (Cmd+K on a Mac), or click **Search** in the menu bar.',
        'Type what you want to do. The box suggests trying "halftone" or "remove background".',
        'Use the up and down arrows to move through results, and Enter to run one. Esc closes the palette.',
      ] },
      { t: 'p', text: 'Every result shows its group on the left (Tool, File, Layer, Filter, Go to layer and so on) and, on the right, its shortcut and any extra search words it has. The search matches every word you type in any order, against the name, the group and those extra words. That is why "instagram" finds **Resize for other formats** and "backup" finds **Save a version**.' },
      { t: 'h3', text: 'What you can find' },
      { t: 'list', items: [
        'Every tool, by name.',
        '**Add text** and **Add photo, shape or blank layer**.',
        'Every menu command, adjustment and filter.',
        'Every layer in your design, under **Go to layer**. Choosing one selects it and zooms to it.',
      ] },
      { t: 'note', text: 'Commands that cannot run right now are left out. For example, **Crop to selection** only appears when there is a selection.' },

      { t: 'h', text: 'The menu bar' },
      { t: 'table', head: ['Menu', 'What is in it'], rows: [
        ['File', 'New, open, place, save, versions, templates, export, .void file, resize for other formats, boards, close.'],
        ['Edit', 'Undo, clipboard, fill and stroke, transform, brand kit, preferences.'],
        ['Image', 'Adjustments, image size, canvas size, expand with AI fill, rotation, crop, trim, flatten.'],
        ['Layer', 'New and duplicate, layer styles, masks, clipping, formats, pathfinder, paths, groups, arrange, align, remove background, merge.'],
        ['Select', 'All, deselect, inverse, subject, colour range, select and mask, modify, quick mask.'],
        ['Filter', 'Filter gallery, remove object, and every filter by category.'],
        ['View', 'Zoom, rulers, guides, snap, pixel grid, before and after, bars, touch mode.'],
        ['Window', 'Panels, floating tools, workspaces, interface size.'],
        ['Help', 'Search every action, keyboard shortcuts, AI on this device, privacy, feedback, Report a bug (opens a bug report form in the app), Learn, Blog and About.'],
      ] },
      { t: 'list', items: [
        'Greyed-out items need something first, such as a selected layer or an active selection.',
        'Items with a tick are on or off settings, such as Rulers or Snap.',
        'Press and release Alt on its own to open the menu bar from the keyboard.',
        'On narrower screens the menus collapse into one menu button. On a phone with a design open, the Editor switches to a simpler layout with its own controls at the bottom, and the menu bar is hidden.',
      ] },

      { t: 'h', text: 'The shortcut sheet' },
      { t: 'p', text: 'Press **?** (or **Help, Keyboard shortcuts**) to open the sheet. It is built from the same action list as the menus, so it is always complete. Type in **Find a shortcut** to filter it. It has three columns:' },
      { t: 'list', items: [
        '**Tools**: the key for every tool.',
        '**Menus**: every command that has a shortcut.',
        '**Canvas**: pan, zoom, brush size, opacity, before and after, channel views, and touch gestures.',
      ] },
      { t: 'p', text: 'Coming from Photoshop? The tool keys are the same, and Shift plus a tool key cycles through that tool\'s family. For the full list, see [Keyboard shortcuts](/learn/keyboard-shortcuts).' },

      { t: 'h', text: 'Shortcuts worth learning first' },
      { t: 'keys', rows: [
        ['Ctrl+K', 'Search every action'],
        ['?', 'Keyboard shortcuts'],
        ['Ctrl+Z', 'Undo'],
        ['Ctrl+S', 'Save'],
        ['Ctrl+E', 'Export as'],
        ['Ctrl+J', 'Duplicate layer'],
        ['Ctrl+0', 'Fit on screen'],
        ['Ctrl+,', 'Preferences'],
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─── Workspaces and panels ─────────────────────────────────────────
  {
    slug: 'workspaces-and-panels',
    title: 'Arrange panels, workspaces and preferences',
    summary: 'Dock, tab, float and tuck panels, switch between workspaces or save your own, and set interface size, density and touch mode.',
    category: 'editor',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['editor-tour', 'command-palette-and-menus', 'designing-on-a-phone', 'history-and-undo'],
    keywords: 'panels dock workspace layout floating panel tabs reset workspace preferences settings interface size ui scale density touch mode tools toolbar',
    body: [
      { t: 'p', text: 'The panels on the right of the Editor can be rearranged to suit the job: a few for quick edits, many for detailed retouching. Your layout, interface size and preferences are saved in this browser for you, never inside a design, so every design opens the way you like.' },

      { t: 'h', text: 'Workspaces' },
      { t: 'p', text: 'A workspace is a saved panel layout. Switch with **Window, Workspace**.' },
      { t: 'table', head: ['Workspace', 'Docked panels'], rows: [
        ['Simple (the default)', 'Properties, and Layers. No icon strip.'],
        ['Essentials', 'Properties, History and Swatches in one group; Layers, Channels and Paths in another. Other panels in the icon strip.'],
        ['Photo', 'Adjustments and Properties; History on its own; Layers, Channels and Paths.'],
        ['Design', 'Properties, Character, Paragraph and Layer styles; Layers, Swatches and Brand kit.'],
        ['Minimal', 'Layers only. Everything else in the icon strip.'],
      ] },
      { t: 'p', text: 'Simple suits most jobs. Move to Essentials, Photo or Design when you want more panels to hand, such as History or Character.' },

      { t: 'h', text: 'Dock, tabs and groups' },
      { t: 'p', text: 'The dock is the column of panel groups on the right. Each group has a row of tabs.' },
      { t: 'list', items: [
        'Click a tab to show that panel.',
        'Drag a tab onto another group\'s tab row to join that group.',
        'Drag a tab to the strip at the bottom of a group to give it its own group there.',
        'Drag the thin line between two groups to share the height between them.',
        'Drag the left edge of the dock to make it wider or narrower (240 to 520 pixels).',
        'The arrow collapses a group to its tab row. The × tucks the panel into the side strip.',
      ] },

      { t: 'h', text: 'The icon strip and floating panels' },
      { t: 'p', text: 'In workspaces with an icon strip, tucked panels sit there as icons beside the dock. Click an icon to open the panel as a flyout; click **Dock** in the flyout to add it to the dock. You can also drag an icon into the dock.' },
      { t: 'p', text: 'To float a panel, drag its tab or icon and let go over the canvas. It becomes a window you can:' },
      { t: 'list', items: [
        'Move by dragging its title bar.',
        'Resize from its bottom-right corner.',
        'Add more panels to, by dropping tabs on its title bar.',
        'Send back with **Dock**, or tuck away with ×.',
      ] },
      { t: 'p', text: 'The **Window** menu lists every panel: Properties, Layers, Channels, Paths, History, Colour and swatches, Adjustments, Character, Paragraph, Info, Brand kit, Navigator, Layer styles and Brief. A tick shows which are docked or floating. Choosing one brings it to the front, or opens it from the icon strip.' },

      { t: 'h', text: 'Floating tools' },
      { t: 'p', text: 'The tool rail can float over the canvas too. Drag its grip onto the canvas, or choose **Window, Floating tools**. A floating tool panel can be reshaped from one column to a grid or one long row by dragging its corner, collapsed to the current tool by double-clicking its handle, and docked on the left again from its header.' },

      { t: 'h', text: 'Save and reset your own workspace' },
      { t: 'steps', items: [
        'Arrange the panels the way you want.',
        'Choose **Window, Workspace, Save workspace…**, type a name and click **Save**.',
        'Your workspace now appears in **Window, Workspace** beside the built-in ones.',
      ] },
      { t: 'p', text: '**Window, Workspace, Reset workspace** puts the current workspace back to how it was saved. If you lose a panel, reset or switch workspace.' },

      { t: 'h', text: 'Preferences' },
      { t: 'p', text: 'Open **Edit, Preferences…** ({{Ctrl+,}}, Cmd+, on a Mac). There are four tabs.' },
      { t: 'table', head: ['Tab', 'Settings'], rows: [
        ['Interface', 'Interface size (80 to 160 percent), Density (Comfortable or Compact), Touch mode, the floating action bar above the selected layer, and the status bar.'],
        ['History and saving', 'Undo steps kept, Memory for undo, and Automatic version every. See [History and undo](/learn/history-and-undo).'],
        ['Guides and snapping', 'Rulers, guides, lock guides, snapping to the page, layers and guides, and the pixel grid past 800% zoom.'],
        ['AI and privacy', 'Every on-device AI model with its size and licence, and a button to remove downloaded models.'],
      ] },
      { t: 'p', text: '**Interface size** makes menus, panels and tools bigger or smaller without touching the canvas. It helps on sharp laptop screens and large monitors. **Window, Interface size** has quick steps from 90% to 150%, plus Compact and Comfortable.' },

      { t: 'h', text: 'Touch mode' },
      { t: 'p', text: 'It is on by itself on touch screens; you can also turn it on in Preferences or with **View, Touch mode (bigger controls)**. Controls get bigger, and when you draw with a pen, your fingers pan and zoom instead of painting. Two-finger tap undoes; three-finger tap redoes.' },
      { t: 'p', text: 'On a phone, the Editor uses its own layout instead of the dock: a Layers button on the canvas, and short sheets for each mode along the bottom. See [Designing on a phone](/learn/designing-on-a-phone).' },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        'Layout and preferences are stored per browser. A different browser or device starts from Simple.',
        'Clearing site data resets them, along with your designs. Export anything you need first.',
        'The dock and icon strip show on screens 768 pixels wide and up.',
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },
]
