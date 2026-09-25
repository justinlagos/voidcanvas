import type { Post } from '../types'

// The Voidcanvas blog. One post a week, dated on Fridays. Posts dated in the future stay hidden
// until that day, so this list doubles as the publishing queue.
// Facts come from the Learn articles in src/content/learn (already checked against the code)
// and from the code itself. Voice rules: src/content/learn/BRIEF.md.

const AUTHOR = 'Justin Ukaegbu'

export const posts: Post[] = [
  // ─── 1 ────────────────────────────────────────────────────────────
  {
    slug: 'why-voidcanvas-runs-in-your-browser',
    title: 'Why Voidcanvas runs in your browser, and what never leaves it',
    summary: "Voidcanvas has no account and never uploads your files. Here is why it is built that way, what stays on your device, and the short list of things that do go over the network.",
    date: '2026-09-25',
    author: AUTHOR,
    tags: ['Product', 'Privacy'],
    body: [
      { t: 'p', text: "Voidcanvas is a free design suite: Studio for client jobs, the Editor for layered design, and Effects for one-click image treatments. All of it runs inside your browser. There is no account to make, and your images and designs are never uploaded. This post explains why I built it that way and exactly where the line sits between your device and the network." },

      { t: 'h', text: 'Where this comes from' },
      { t: 'p', text: "Voidcanvas is made by MotionPlay Labs, a design and software studio between Lagos and Kent. It is the follow-up to [Art Director Studio](https://artdirectorstudio.com), which I built for designers in Nigeria. Voidcanvas keeps the same focus on the working designer and takes a firm position on files: they stay with you." },
      { t: 'p', text: "The reasoning is simple. Much of what designers handle is not theirs to share. Campaigns before launch, event artwork before the announcement, a client's logo files under an NDA. A tool that sends every file to a server asks you to trust that server, its staff and its security. A tool that never sends the file removes the question." },
      { t: 'p', text: "There is a practical side too. When editing happens on your own machine, there is no upload to wait for before you can start on a large PSD, and nothing slows down because a server is busy. Once you have visited, the app keeps a copy of itself and works offline. See [Install Voidcanvas as an app](/learn/install-as-an-app)." },

      { t: 'h', text: 'What stays on your device' },
      { t: 'p', text: "Editing, effects, the AI tools, Studio boards and every export run in the browser. These are never sent anywhere:" },
      { t: 'list', items: [
        "Your images, photos, PSDs and PDFs.",
        "Your designs, layers, text and anything you type into them.",
        "File names and design names.",
        "Studio jobs, briefs, references, brands and brand guidelines.",
        "Fonts you add from files on your computer. They are never requested from Google.",
      ] },
      { t: 'p', text: "Your work is saved in a database inside the browser (IndexedDB, named `voidcanvas`). The Editor autosaves about two seconds after each change. Even the handoff between modules stays local: when Effects sends a photo to the Editor, it writes to a small inbox in the same browser storage, and the Editor picks it up from there." },

      { t: 'h', text: 'What does go over the network' },
      { t: 'p', text: "Running in a browser does not mean nothing ever loads. Here is the complete list." },
      { t: 'table', head: ['What', 'Why', 'What it contains'], rows: [
        ['The app itself', 'To load the pages and, once installed, update them.', 'Ordinary page requests.'],
        ['Web fonts from Google Fonts', 'So text layers can use fonts such as Inter or Playfair Display.', 'The font family name. No text or design.'],
        ['AI model files, first use only', 'The on-device AI tools need their model downloaded once.', 'A download from jsDelivr and Hugging Face. Your image is not sent.'],
        ['Anonymous usage counts', 'To see which tools get used and what breaks.', 'Event names and small settings. Details below.'],
        ['Feedback and bug reports', 'Only when you press send.', 'What you type, plus basic device context.'],
      ] },
      { t: 'p', text: "Usage counts record events such as 'a design was exported as PNG'. Each carries the event name, small settings like a file type or export size, the page, the device type, browser, operating system, time zone, language and screen size, and a random id for the browser and the visit. They never contain images, file names, text or layer content. At most 600 events are sent in one visit, and error messages have web addresses removed." },

      { t: 'h', text: 'Turning usage counts off' },
      { t: 'steps', items: [
        "In the Editor, open Help, **Your privacy**. It is also in the **V** menu and in the header of the home page.",
        "Switch off **Share anonymous usage counts**.",
      ] },
      { t: 'p', text: "They are also off automatically in a [private session](/learn/private-session), and when your browser sends Do Not Track or Global Privacy Control." },

      { t: 'h', text: 'The AI tools run here too' },
      { t: 'p', text: "Remove background, Select subject, Object select, Remove object and Expand with AI fill all run the model inside your browser. The first time you use one, it asks before downloading. After that the model is cached and works offline. The models range from MODNet at 26 MB to LaMa at 208 MB, and Help, **AI on this device** lists them with **Remove downloaded models** if you want the space back. There are no credits: the tools are free because the work happens on your hardware. [Browser support](/learn/browser-support) explains what WebGPU changes." },

      { t: 'h', text: 'The trade-off, stated plainly' },
      { t: 'p', text: "No cloud copy means your work lives in this browser, on this device. Open Voidcanvas in another browser or on another computer and your designs are not there. Clearing the site's data in your browser settings deletes them for good." },
      { t: 'p', text: "So backups are a file you keep. File, **Download project file (.void)** saves the whole editable design as one file, and the export dialog's **Save editable file** makes a .void.png that previews as a normal image and opens with every layer. Both are how you move a design to another machine. [Saving and your files](/learn/saving-and-your-files) covers the details." },
      { t: 'tip', text: "Working on a computer that is not yours? Switch on **Private session** in Your privacy before you start. Nothing is written to the device, a **Private** badge shows in the top bar, and closing the tab discards everything. Export before you leave." },
      { t: 'p', text: "On your own machine, **Delete all my data** removes the whole Voidcanvas database from the browser in one step. It asks first, and it cannot be undone." },

      { t: 'h', text: 'Why I think it is the right trade' },
      { t: 'p', text: "A design tool that holds your files for you can offer sync and sharing. It also has to be trusted with everything you make. I would rather be clear that backups are your job and never be in a position to lose, leak or look at your work. Everything else in Voidcanvas, from the Studio brief reader to the effects, is built on that starting point. [What Voidcanvas sends](/learn/privacy-and-data) is the reference page, and it is kept to the same standard as the code." },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─── 2 ────────────────────────────────────────────────────────────
  {
    slug: 'studio-the-job-around-the-design',
    title: 'Studio holds the job around the design: brief, directions, review, delivery',
    summary: "Much of a designer's time goes on work around the pixels: reading the brief, agreeing a direction, tracking changes and naming files. Studio keeps that work in one place, from the pasted brief to the delivered zip.",
    date: '2026-10-02',
    author: AUTHOR,
    tags: ['Studio', 'Product'],
    body: [
      { t: 'p', text: "Most design tools start at an empty canvas. Client work does not. It starts with a message, moves through a conversation about direction, goes round several rounds of changes and ends with a set of files that have to be right. Studio is the part of Voidcanvas built for that job around the design. The Editor still makes the pixels; Studio keeps track of everything else." },

      { t: 'h', text: 'Why a job needs its own home' },
      { t: 'p', text: "When I built [Art Director Studio](https://artdirectorstudio.com) for designers in Nigeria, the brief was usually a chat message and the review happened in the same thread. Details went missing: the date left off the poster, the sponsor logos forgotten, a file called final_final2.png. None of these are design problems. They are record-keeping problems, and software is good at records." },
      { t: 'p', text: "So a Studio job runs in six tabs, in the order the work happens: **Brief**, **References**, **Directions**, **Key visual**, **Review** and **Deliver**. A tick shows which steps have something in them, and nothing is locked. See [Studio overview](/learn/studio-overview)." },

      { t: 'h', text: 'The brief, read for you' },
      { t: 'p', text: "Press **Start a job** and paste the brief exactly as it arrived: an email, a WhatsApp message, a list. Studio reads it on your device and picks out the headline, subheading, date, time, venue, price, call to action, contact and up to five must-haves, such as sponsor logos or a hashtag. Prices are recognised in ₦, N, NGN, £, $, €, GHS and KES, because those are the currencies the briefs arrive in." },
      { t: 'p', text: "Things said to you rather than things to print are left out on purpose: deadlines, budgets, 'please send drafts'. If the reader guesses wrong, add a labelled line such as **Headline: Lekki Nights** and it takes that instead. It also suggests the formats the brief mentions, so a line asking for 'an IG post, a story and an A3 poster' becomes the job's list of deliverables." },
      { t: 'p', text: "That reading travels. When you start the key visual, the Editor's **Brief** panel shows it as a checklist that ticks itself off as matching text appears on the design. [Start a job from the client's brief](/learn/start-a-job-from-a-brief) has the full rules." },

      { t: 'h', text: 'References that explain themselves' },
      { t: 'p', text: "Drop in the images the client sent and the ones you have in mind. For each one, Studio reads its palette by how much of the image each colour covers, its light (key, contrast, temperature, direction), its composition and its lettering, and lists close Google fonts for the type style. **Take the look** saves the reference's colour grade so you can apply it to your own photos as an adjustment layer. See [References and palettes](/learn/references-and-palettes)." },

      { t: 'h', text: 'Two or three directions, not one design' },
      { t: 'p', text: "Clients choose better between clear options than they react to a single design. The **Directions** tab is an open board with frames for Direction A, B and C. Sort references, notes, swatches and type cards into them, give each a name and an idea in one line, and present them full screen, as a PDF at 1920 × 1080, or as **WhatsApp images**: 1080 × 1350 JPGs that fill a phone screen in a chat. When the client picks, press **Client chose this one** and that direction's palette and type seed the key visual." },

      { t: 'h', text: 'One key visual, every format' },
      { t: 'p', text: "You design one hero in the Editor. Studio then builds every other format from it, placing each element by its role (headline, image, logo, call to action) rather than shrinking the whole picture. The formats stay linked, so a late change to the date goes into all of them with **Update formats from the master**, and layouts you adjusted by hand are kept." },

      { t: 'h', text: 'A record of every round' },
      { t: 'p', text: "Each time you show the client something, save a version. **New version from the design** renders every format and numbers it v1, v2, v3. Pin their comments to the image, paste their reply and press **Turn into a checklist** to split it into to-dos. **Compare** puts any two versions side by side or under a slider, and **Mockups** places the design in a real photo, from a street wall poster to a phone in hand. The review pack PDF and WhatsApp images carry a footer naming the job and version, so a forwarded screenshot still says which round it came from. See [Directions and review](/learn/directions-and-review)." },

      { t: 'h', text: 'Delivery without the last-minute mistakes' },
      { t: 'p', text: "The **Deliver** tab renders every format at full size in the file types you tick and names each file client_job_format_version, such as `lekki-nights_launch_a3-poster_v2.pdf`. Print formats get a PDF at trim size with 3 mm bleed and crop marks. The zip includes a delivery note listing every file, size and font, and a brand sheet when the job has a brand. [Deliver every format](/learn/delivering-files) explains each part." },

      { t: 'h', text: 'Status that keeps itself' },
      { t: 'p', text: "A job moves from Direction to Design to Review to Delivered as you work, without you setting it. The **Next** bar at the bottom names the single most useful thing to do, such as **Paste the brief** or **2 formats to build**, and the same label shows on the Studio home screen, so your job list doubles as a to-do list." },
      { t: 'note', text: "Like the rest of Voidcanvas, Studio saves jobs in this browser and uploads nothing. A job made on one computer is not visible on another." },
      { t: 'try', label: 'Start a job in Studio', href: '/studio' },
    ],
  },

  // ─── 3 ────────────────────────────────────────────────────────────
  {
    slug: 'opening-photoshop-files-in-a-browser',
    title: 'Opening Photoshop files in a browser: what survives and what changes',
    summary: "A PSD opens in the Voidcanvas Editor as real layers, read entirely on your device. Here is what comes through editable, what is changed so it can open, and how to check a file before you work on it.",
    date: '2026-10-09',
    author: AUTHOR,
    tags: ['Editor', 'Product'],
    body: [
      { t: 'p', text: "Someone sends you a Photoshop file and you do not have Photoshop to hand. Voidcanvas opens it in the Editor as a layered design, not a flat picture, and it reads the file inside your browser: nothing is uploaded and the original is never changed. No PSD reader outside Photoshop gets everything, so the useful thing is to know in advance what survives. This post sets it out." },

      { t: 'h', text: 'How to open one' },
      { t: 'p', text: "Drop the PSD on the Editor start screen, or press {{Ctrl+O}} (Cmd+O on a Mac) and choose it. If you installed Voidcanvas as an app, your system may offer it in the **Open with** list for .psd files. Photoshop artboards become [boards](/learn/artboards) with their background colours; otherwise the file opens as one canvas." },

      { t: 'h', text: 'What comes through editable' },
      { t: 'list', items: [
        "Pixel layers with their position, opacity, fill opacity, visibility and colour labels.",
        "Groups, including groups inside groups, with their blend mode and opacity.",
        "Layer masks and clipping, and the transparent pixels, pixels and position locks.",
        "Text layers as editable type, when the whole layer uses one font, one size and one colour.",
        "Adjustment layers: brightness and contrast, levels, curves, exposure, vibrance, hue and saturation, colour balance, black and white, photo filter, channel mixer, invert, posterize, threshold and gradient map.",
        "Layer styles: drop shadow, inner shadow, outer and inner glow, stroke, colour overlay, gradient overlay, and bevel and emboss.",
      ] },
      { t: 'p', text: "That covers most of the files designers pass to each other: a photo, some adjustments, type set in one style per layer, a few shadows and strokes." },

      { t: 'h', text: 'What changes so it can open' },
      { t: 'list', items: [
        "Text with mixed fonts, sizes or colours, warped text and text on a path arrive as pixels.",
        "Smart objects and vector shapes arrive as pixels.",
        "Blend modes the Editor cannot draw, such as linear burn, vivid light and dissolve, use the nearest match.",
        "16-bit files become 8-bit, and CMYK or other colour modes become RGB.",
        "Gradient or pattern strokes become a solid colour. Gradient overlays with more than two colours use the first and last.",
        "Group masks are left out, and an adjustment clipped to one layer opens unclipped, so it affects everything below it.",
        "Satin and pattern overlay effects are not supported yet.",
      ] },
      { t: 'p', text: "The clipped adjustment is the one to watch. A curves layer that only brightened a face in Photoshop will brighten the whole picture beneath it. Masking the adjustment, or grouping it with its layer, gets the original look back." },

      { t: 'h', text: 'The report tells you what happened' },
      { t: 'p', text: "Whenever anything was changed or left out, a report opens titled **Opened** and the file name, listing what was **Kept**, what was **Changed so it would open** and what is **Not supported yet**. I would rather tell you than let you find out after an hour of editing. Treat the list as your repair list, and read it before you touch anything." },
      { t: 'tip', text: "Ask whoever sent the PSD for a flattened PNG or JPG of it as well. Put it on a layer at the top, set it to Difference, and anything that shifted in the import shows up bright. [Take a PSD from a colleague](/learn/workflow-psd-to-social) walks through the whole check." },

      { t: 'h', text: 'Fonts' },
      { t: 'p', text: "If the PSD uses fonts that are neither on your device nor on Google Fonts, **Some fonts are missing** opens and shows how many text layers use each one. Pick a replacement, keep a stand-in for now, or click **Add font file** to load a .ttf, .otf, .woff or .woff2. A font you add is saved inside the design, so it looks the same next time and travels with a .void file." },
      { t: 'p', text: "Even with the right font, Photoshop and browsers set type slightly differently, so compare line breaks against the original and nudge where needed." },

      { t: 'h', text: 'Size limits' },
      { t: 'p', text: "The Editor draws with the browser's 2D canvas, which is comfortable up to around 4000 pixels on a side. Photos larger than 4096 pixels on their longest side are scaled down to 4096 as they come in. Very large PSDs open, but more slowly, and on a phone they are more likely to hit memory limits. [Troubleshooting](/learn/troubleshooting) has the messages you might see and what they mean." },

      { t: 'h', text: 'PDFs open too' },
      { t: 'p', text: "A PDF opens with each page as its own pixel layer, named Page 1, Page 2 and so on, with only page 1 visible at first. Pages come in at up to twice their printed point size, so an A4 page is about 1190 × 1684 pixels. Text in a PDF becomes pixels, so add new text layers on top rather than trying to edit it. Password-protected PDFs will not open until the password is removed." },

      { t: 'h', text: 'Getting work back out' },
      { t: 'p', text: "Voidcanvas does not export PSD. If the design needs to go back to someone in Photoshop, send a PNG, or a PDF for print. To keep it editable for yourself, use File, **Download project file (.void)** or the export dialog's **Save editable file**, which keep every layer, mask and group. [Open PSD, PDF and other files](/learn/import-psd-and-pdf) is the full reference." },
      { t: 'try', label: 'Open a PSD in the Editor', href: '/editor' },
    ],
  },

  // ─── 4 ────────────────────────────────────────────────────────────
  {
    slug: 'print-ready-bleed-trim-300-dpi',
    title: 'Print-ready explained: bleed, trim, 300 dpi, and how to get them out of Voidcanvas',
    summary: "What a printer means by trim, bleed, safe area and 300 dpi, and the honest routes to a print file from Voidcanvas today: Studio delivery with bleed and crop marks, or the Editor PDF with bleed you add yourself.",
    date: '2026-10-16',
    author: AUTHOR,
    tags: ['Print', 'Craft'],
    body: [
      { t: 'p', text: "Screen work forgives a lot. Print does not: paper is cut with a small margin of error, ink behaves differently from light, and a mistake costs a reprint. 'Print-ready' is a handful of specific requirements. This post explains each one, then shows exactly what Voidcanvas does and does not do for you, because the two export routes behave differently and it matters which you use." },

      { t: 'h', text: 'Trim, bleed and safe area' },
      { t: 'p', text: "Printers print on larger sheets and cut them down. The guillotine can drift by a millimetre or so, so artwork needs three zones." },
      { t: 'table', head: ['Zone', 'What it is', 'Typical size'], rows: [
        ['Trim', 'The finished size, where the cut should go.', 'A5 is 148 × 210 mm.'],
        ['Bleed', 'Artwork past the trim that gets cut away. Anything touching the edge must continue into it.', '3 mm each side in the UK and Europe. US printers often ask for 1/8 in.'],
        ['Safe area', 'An inner margin for text, logos and anything important.', 'At least 3 to 5 mm inside the trim.'],
      ] },
      { t: 'p', text: "Without bleed, a slight drift leaves a hairline of white paper along the edge. Without a safe area, the same drift can cut through a phone number. **Crop marks** are short lines outside the bleed that show where to cut." },

      { t: 'h', text: 'What 300 dpi actually means' },
      { t: 'p', text: "Only pixels are real. The dpi number stored in a file is a note about how big to print it. The formula is **print size in inches = pixels ÷ ppi**. Anything read at arm's length (flyers, cards, brochures) wants 300 ppi at its final size, which is why the A4 flyer preset is 2480 × 3508 pixels: exactly 210 × 297 mm at 300. Posters seen from a metre or two can drop to 150, and billboards far lower. At 300 ppi, 3 mm of bleed is about 36 pixels (3.05 mm). [Image resolution explained](/learn/image-resolution-explained) has the maths." },

      { t: 'h', text: 'Colour: RGB in, CMYK on paper' },
      { t: 'p', text: "Screens mix light; presses lay down cyan, magenta, yellow and black ink. Very bright RGB blues, greens, pinks and oranges have no ink equivalent and come out duller. Voidcanvas works in sRGB and every export is RGB: there is no CMYK export, no ICC profile handling and no spot colour. Studio's print PDFs say so on their slug line. The right person to convert is your printer, with the profile for their press and paper, and the right safeguard is a proof." },

      { t: 'h', text: 'Route 1: Studio delivery, with bleed and crop marks' },
      { t: 'p', text: "This is the fullest print output Voidcanvas makes, and the one I would use for any job going to a printer. Studio's print formats know their size in millimetres: A4 flyer, A5 flyer, A3 poster, Poster 18 × 24 in, Business card and Roll-up banner. On the **Deliver** tab, tick **Print PDF** and press **Build the package**. Each print PDF has:" },
      { t: 'list', items: [
        "The artwork at its trim size in mm.",
        "3 mm bleed on every side, and crop marks outside it.",
        "TrimBox and BleedBox set, so the printer's software finds the cut line on its own.",
        "A slug line naming the client, job, format, version, trim size and bleed, and noting that the colour is RGB.",
      ] },
      { t: 'warn', text: "The bleed is made by extending the edge pixels of your artwork outwards. Flat colour and simple backgrounds extend cleanly. A detailed photo at the edge gets streaks in the bleed; they are cut away, but a drifting trim can show a sliver. For photos that bleed, extend the photo past the edge yourself, as in route 2." },
      { t: 'p', text: "Outdoor formats such as billboards have no fixed size in mm, so their PDF takes its size from the pixels at 300 dpi. Confirm the real size with the sign maker. [Deliver every format](/learn/delivering-files) covers the package." },

      { t: 'h', text: 'Route 2: the Editor PDF, with bleed you add' },
      { t: 'p', text: "Export as… ({{Ctrl+E}}, Cmd+E on a Mac) with **PDF** makes a one-page, image-based PDF: your design as a single high-quality JPEG, flattened onto white. It adds no bleed and no crop marks. The page size comes from the pixel size alone. Over 2000 pixels on the longest side, the Editor treats it as print at 300 dpi. At 2000 or under, it uses 96 dpi, a screen size." },
      { t: 'p', text: "That rule works for the A4 flyer, A5 flyer and 18 × 24 in poster presets. It does not work for the Business card preset: 1050 × 600 pixels is 3.5 × 2 inches at 300 dpi, but it is under 2000, so the PDF page comes out far too big. For cards, use Studio delivery, or send a PNG and tell the printer the size." },
      { t: 'p', text: "To add bleed in the Editor, start from a print preset and before you design:" },
      { t: 'steps', items: [
        "Choose Image, **Canvas size…**, tick **Relative**, and add 72 to the width and 72 to the height with the anchor in the centre. That is 36 pixels, about 3 mm, on each side.",
        "Run backgrounds and photos out to the new edge.",
        "Add guides 36 pixels in from each edge with View, Guides, **New guide…** to mark the trim, and keep text well inside them.",
        "Export as **PDF** at 1×, and tell the printer: RGB, 300 dpi, 3 mm bleed included, no crop marks.",
      ] },
      { t: 'p', text: "Text in this PDF is rendered to pixels at 300 dpi rather than kept as type. At normal sizes it prints well; very small text is where you would notice. [Export for print](/learn/export-for-print) has the full detail." },

      { t: 'h', text: 'Route 3: brand guideline print PDF' },
      { t: 'p', text: "The brand guideline builder in Studio has its own **Print PDF**: multi-page, 300 dpi, 3 mm bleed and crop marks, on A4 portrait or 297 × 167 mm for the deck layout. See [Brand guideline exports](/learn/brand-guideline-exports)." },

      { t: 'h', text: 'Four questions for your printer' },
      { t: 'list', items: [
        "Do you accept an RGB PDF and convert it to CMYK with your profile?",
        "How much bleed do you want, and do you need crop marks?",
        "Is an image-based PDF at 300 dpi fine for this job?",
        "Can I see a proof before the full run?",
      ] },
      { t: 'p', text: "Then print a copy at 100 per cent on an office printer. The colour will be wrong, but the size will not, and it is the quickest way to find text sitting too close to the trim. [Designing for print](/learn/designing-for-print) covers paper, proofs and the rest." },
      { t: 'try', label: 'Deliver a print job from Studio', href: '/studio' },
    ],
  },

  // ─── 5 ────────────────────────────────────────────────────────────
  {
    slug: 'where-halftone-dither-and-glitch-come-from',
    title: 'Where halftone, dither and glitch come from, and how to use them well',
    summary: "Each of these looks started as a technical workaround: printing photographs with one ink, showing grey on screens that had none, and video that broke. Knowing the origin tells you how to use them with intent.",
    date: '2026-10-23',
    author: AUTHOR,
    tags: ['Craft', 'Effects'],
    body: [
      { t: 'p', text: "Halftone, dither and glitch are three of the most requested effects in Voidcanvas, which is why each has its own quick tool. All three began as solutions, or failures, in printing and computing before anyone treated them as style. When you know what problem a look was solving, you can tell when it fits a piece and when it is just decoration." },

      { t: 'h', text: 'Halftone: photographs with one ink' },
      { t: 'p', text: "A printing press puts down ink or no ink. It cannot print grey. For most of the 1800s, newspapers could only reproduce pictures as engravings cut by hand. The halftone process changed that in the 1880s: a photograph was shot through a fine screen that broke it into dots, big where the image was dark and small where it was light. From reading distance the eye blends the dots back into tone. By the end of the century halftone photographs were a normal part of printed news." },
      { t: 'p', text: "The dots stayed visible in cheap printing, and comics used their own flat dot tints for colour. In the 1960s pop artists, Roy Lichtenstein most famously, enlarged those dots into the subject of the work. That is the association halftone still carries: print, mass media, a slightly rough edge." },
      { t: 'h3', text: 'Using it' },
      { t: 'p', text: "The Halftone effect lays black dots on a square grid, each sized by the darkness of that patch. **Dot Size** sets the grid spacing: low values read as a photo from a distance, high values become graphic. **Contrast** sets how large the dots grow; above 50 the shadows fill in solid." },
      { t: 'list', items: [
        "Pick images with a clear silhouette and strong tonal range. Flat, grey photos turn to mush. Add contrast underneath first.",
        "Decide whether the dots are texture or subject. Fine dots suggest print; big dots make a statement.",
        "The result is black and white. For colour, send it to the Editor and add a **Duotone** filter above it to put one ink on coloured paper.",
        "Export PNG. JPG compression smears hard dot edges.",
      ] },

      { t: 'h', text: 'Dither: grey on screens that had none' },
      { t: 'p', text: "Early computer displays and printers often had one bit per pixel: each dot was on or off. Dithering fakes the missing tones by mixing on and off pixels in patterns. The best-known method, published by Robert Floyd and Louis Steinberg in 1976, works through the image pixel by pixel, rounds each one to black or white, and passes the rounding error on to the neighbours not yet visited. The result is a fine, organic scatter rather than a regular grid." },
      { t: 'p', text: "It became the look of early one-bit screens and a certain era of games and interfaces, which is why dither now reads as retro computing, zines and photocopies." },
      { t: 'h3', text: 'Using it' },
      { t: 'p', text: "The Dither effect in Voidcanvas is Floyd-Steinberg. Its one setting, **Threshold**, moves the split between black and white: higher pushes more of the image dark." },
      { t: 'list', items: [
        "Dither works pixel by pixel with no size setting, so the full-size download of a large photo has a much finer pattern than the preview. To make the pattern visible and chunky, work at a smaller size.",
        "If you want no grey at all, use **Threshold** from the Stylize tab instead. It cuts straight to black and white for a stencil or photocopy look.",
        "Dither suits one-colour print and screen graphics equally. Keep it as PNG.",
      ] },

      { t: 'h', text: 'Glitch: when the signal breaks' },
      { t: 'p', text: "Glitch comes from failure: tape with tracking errors, a video stream that loses data and smears one frame into the next, a file opened as the wrong kind of file. Artists began provoking these errors on purpose, and by the late 2000s glitch art was a recognised practice, with writers such as Rosa Menkman arguing for the error as a medium in its own right. The look now signals technology, music and anything that wants to feel unstable." },
      { t: 'h3', text: 'Using it' },
      { t: 'p', text: "The Glitch effect cuts the image into horizontal strips and slides about three in ten of them sideways. **Offset** sets how far they move, **Slice Height** how tall each strip is, and **Randomize** picks which strips move. In the quick tool, **Shuffle** gives a new arrangement." },
      { t: 'list', items: [
        "Scrub **Randomize** until the tears miss the parts that must read, such as eyes or a logo. Each value is repeatable, so you can note a number and come back to it.",
        "Thin strips look like signal noise; tall ones look like broken blocks. Match the strip height to the scale of the design.",
        "Related looks sit in the Distort tab: **RGB Shift** for colour fringes, **Slice Shift** when every band should move, and **Pixel Sort** for streaks in bright areas.",
        "A glitch is loud. Lower the effect's **Opacity** in Effects, or mask part of it in the Editor, so the error lands where it adds tension.",
      ] },

      { t: 'h', text: 'Keep it editable' },
      { t: 'p', text: "Each quick tool has **Send to Layer Stack**, which opens the Editor with your photo on one layer and the effect as a live filter layer above it, with your settings. You can still change the dot size after you have set the type, mask the effect off a face, or stack a Duotone and a grain layer on top. The downloads are rendered from your original at full size, up to 8000 pixels on the long edge, with pixel settings scaled to match the preview." },
      { t: 'p', text: "For a full print look, [Make a risograph or screen-print look](/learn/workflow-textured-print-look) combines Halftone, Duotone, overprinting type and grain. The settings for every effect are in [Artistic effects](/learn/artistic-effects) and [Distort effects](/learn/distortion-effects)." },
      { t: 'try', label: 'Try the Halftone Generator', href: '/tools/halftone' },
    ],
  },

  // ─── 6 ────────────────────────────────────────────────────────────
  {
    slug: 'designing-on-a-phone',
    title: 'Designing on a phone: how the mobile Editor is laid out, and why',
    summary: "On a phone the Editor becomes a thumb-first layout with five modes and short sheets, while every desktop tool stays one tap away. Here is how it works and what differs from the desktop.",
    date: '2026-10-30',
    author: AUTHOR,
    tags: ['Mobile', 'Editor'],
    body: [
      { t: 'p', text: "A phone is often the device closest to hand when a change is needed: a date to fix, a post to resize, a photo to cut out. The Voidcanvas Editor runs on a phone as a full editor, not a viewer, and it saves and exports on the phone like everywhere else. This post explains how the phone layout is organised and the reasoning behind it." },

      { t: 'h', text: 'Two layouts, chosen by width' },
      { t: 'p', text: "The Editor picks its layout from the width of the window. Below 768 pixels, which covers most phones held upright, you get the phone layout. Wider than that, including most tablets, you get the full desktop Editor with menus, tool rail and panels, and touch still works there." },
      { t: 'p', text: "Shrinking the desktop interface onto a phone would leave dozens of targets too small for a thumb. So the phone layout starts from a different question: what are the handful of things you do most, and how do you reach them from the bottom of the screen?" },

      { t: 'h', text: 'Five modes along the bottom' },
      { t: 'p', text: "The top bar holds the way back to the start screen, the design name, **Undo**, **Redo** and **Share**. The canvas fills the middle, with a **Layers** button and count at the top right. Along the bottom sits the mode bar:" },
      { t: 'table', head: ['Mode', 'What it gives you'], rows: [
        ['Select', 'For the selected layer: **Edit text**, **Crop**, **Remove background**, **Filters**, colour, **Duplicate**, **Delete**, **Opacity**, ordering, **Flip**, **Centre** and **More tools**.'],
        ['Text', '**Add heading** or **Add paragraph**, then font, **Size** (8 to 400), weight, alignment and **Colour**.'],
        ['Image', '**Add photo** from your files, or **Camera** to take one. Then **Crop**, **Remove background** and **Flip**.'],
        ['Shape', '**Rectangle**, **Circle**, **Line** and **Polygon**, with **Fill** and **Stroke** colours.'],
        ['Effects', '**Filters** opens the filter gallery; **Adjustments** adds an adjustment. Both go on as their own layers.'],
      ] },
      { t: 'p', text: "Each mode opens a short sheet with only the controls that matter for it, so the canvas stays visible. Tapping a layer opens the Select sheet for it; tapping empty canvas closes it. While you type on the canvas, the sheets and mode bar hide to make room for the keyboard." },

      { t: 'h', text: 'Nothing removed, just moved' },
      { t: 'p', text: "It would have been easier to build a cut-down phone editor. I did not want a design started on a phone to hit a wall the moment it needed a mask or a clone stamp. So every desktop tool is still there: open **Select**, tap **More tools**, and pick the brush, eraser, selections, heal, clone stamp, pen, gradient or any other. A pill at the top of the canvas names the tool, and **Done** takes you back to moving and selecting." },
      { t: 'p', text: "Filters and adjustments added from the Effects mode are layers, as they are on desktop. You can change or remove them later, and a design made on a phone opens on a computer with the same structure." },

      { t: 'h', text: 'Gestures' },
      { t: 'keys', rows: [
        ['Pinch', 'Zoom around your fingers'],
        ['Two-finger drag', 'Pan'],
        ['Two-finger tap', 'Undo'],
        ['Three-finger tap', 'Redo'],
        ['Tap', 'Select a layer'],
        ['Drag a layer', 'Move it; drag a handle to resize'],
      ] },
      { t: 'p', text: "The two and three finger taps count only when they are quick and your fingers stay still, so a pinch does not undo anything by accident. The same gestures work in the desktop layout on a tablet." },

      { t: 'h', text: 'Tablets and pens' },
      { t: 'p', text: "With a pen that reports pressure, pressing harder makes brush strokes bigger. On a tablet, turn on **Touch mode** from the View menu. It makes controls bigger, and once you have used a pen, your fingers pan and zoom instead of painting, so resting your hand on the screen leaves no marks." },

      { t: 'h', text: 'Getting the file out' },
      { t: 'p', text: "Tap **Share**. **Share PNG**, **JPG** and **PDF** hand the file to your phone's share sheet, so it can go straight into a chat, an email or your photos. If the phone cannot share files from the browser, the button reads **Save PNG** and downloads instead. Pick 1x or 2x under **Size**, or **More options** for the full export dialog." },

      { t: 'h', text: 'The rest of Voidcanvas on a phone' },
      { t: 'list', items: [
        "**Effects** puts the canvas on top and the effect list underneath, with **Undo**, **Reset**, **Clear**, **Editor** and the download buttons pinned to the bottom within reach of your thumb.",
        "**Studio** works on a phone, but some parts need room. Naming a direction, setting its palette and recording the client's choice need a wider window, and format due dates are hidden on narrow screens.",
        "The **brand guideline builder** stacks the preview, page list and controls in one long scroll. Everything works.",
      ] },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "Photos, PSDs and PDFs open as layers on a phone, and nothing leaves the phone.",
        "Phones have less memory than computers. If the Editor slows down, work at a smaller size or with fewer large photos.",
        "Adding Voidcanvas to your home screen gives it the full screen and lets it work offline. See [Install Voidcanvas as an app](/learn/install-as-an-app).",
        "In a private session, the Share sheet reminds you that nothing is saved on the phone unless you export it.",
      ] },
      { t: 'p', text: "[Design on a phone or tablet](/learn/designing-on-a-phone) is the reference for every control mentioned here." },
      { t: 'try', label: 'Open the Editor on your phone', href: '/editor' },
    ],
  },

  // ─── 7 ────────────────────────────────────────────────────────────
  {
    slug: 'a-brand-guideline-in-an-afternoon',
    title: 'A brand guideline in an afternoon: OKLCH ramps, WCAG 2.2 contrast and a type scale',
    summary: "The brand guideline builder in Studio turns a brand colour, a logo and a personality into a checked system: colour ramps, contrast pairings, a type scale, logo rules and 13 pages, with exports for clients, printers and developers.",
    date: '2026-11-06',
    author: AUTHOR,
    tags: ['Brand', 'Studio', 'Craft'],
    body: [
      { t: 'p', text: "A brand guideline is often the last thing made and the first thing ignored, because it takes days to build by hand and is out of date by the time it ships. Most of that work is not judgement. It is arithmetic: tints and shades, contrast ratios, a size for every heading. The brand guideline builder in Studio does the arithmetic so your time goes on the decisions." },

      { t: 'h', text: 'Decide a few things, lock them' },
      { t: 'p', text: "Open Studio and choose **Brand guideline builder**. Start on the **Identity** tab with the brand name, the logo (SVG, PNG or JPG) and a **Personality**: Bold, Refined, Playful, Minimal, Warm or Technical. If the logo has a clear colour, it becomes the brand colour." },
      { t: 'p', text: "Every value in the system is either locked, because you set it, or free, generated for you. **New take** regenerates everything free and leaves locked values alone. That is how you explore: lock what the client has agreed, and press New take until the rest works. Choosing a value locks it; the padlock beside each field toggles it." },
      { t: 'warn', text: "Free values are generated from the brand colour, the brand name and the personality. Changing any of those gives the free values a fresh set. Lock what you like before you rename the brand." },

      { t: 'h', text: 'Colour ramps in OKLCH' },
      { t: 'p', text: "Each colour gets a ramp from 50 to 900 in ten steps. The ramps are built in OKLCH rather than HSL, and that choice is the reason the system holds together. HSL says pure yellow and pure blue are equally light; your eye sees yellow as nearly white and blue as nearly black. OKLCH measures lightness the way it looks, so step 500 of a yellow and step 500 of a blue look equally light, and contrast lines up across hues." },
      { t: 'p', text: "On the **Colour** tab, set the **Brand colour** and a **Harmony**: Analogous, Complementary, Triadic or Split complement. The **Secondary** and **Accent** colours are built from it and adjusted until text on them reads. **Neutral warmth** sets how much of the brand hue shows in the greys. Chroma eases off at the lightest and darkest steps so tints stay clean, and the system adds success, warning and error colours." },

      { t: 'h', text: 'Contrast, checked against WCAG 2.2' },
      { t: 'p', text: "WCAG measures contrast as a ratio from 1:1 to 21:1. Normal text needs 4.5:1 for level AA and 7:1 for AAA; large text and graphics such as icons need 3:1. WCAG 2.2 keeps the same contrast rules as 2.1." },
      { t: 'p', text: "The **Contrast** list shows the pairings the guideline recommends, such as body text on the light surface and button labels on the accent, each graded AAA, AA, AA large or Fail. Because every ramp uses the same lightness per step, the numbers are predictable: on white, step 600 usually passes AA for body text and step 700 reaches AAA, though the exact figure depends on the hue. The logo gets the same treatment: where its outer edge falls below 3:1 against a background, the builder recommends the **Reversed** or **Dark mono** version." },
      { t: 'p', text: "The button at the top right reads **All N checks pass** or **N issues**. It also checks that body text is at least 16 px and that the accent is distinct from the brand colour. Fix an issue by locking a different colour or font, or with New take. [Colour that works](/learn/colour-that-works) explains the theory in full." },

      { t: 'h', text: 'A type scale' },
      { t: 'p', text: "On the **Type** tab, choose **Headings**, **Body**, and **Data and code** fonts from Google Fonts, or upload your own font files, which never leave the browser. Then pick a **Scale**, from Minor third (1.2) to Golden ratio (1.618), and a **Base size** of 14 to 18 px. Each size is the one below it multiplied by the ratio, giving Display, H1 to H4, Body, Small and Caption." },
      { t: 'p', text: "Line height and letter spacing are set per size: large headings get tighter leading and tracking, small text a little more room. Small and Caption never go below 13 and 12 px, so a steep scale cannot produce unreadable captions. See [Typography fundamentals](/learn/typography-fundamentals)." },

      { t: 'h', text: 'Pages and exports' },
      { t: 'p', text: "The guideline has 13 pages, from Cover and Principles through Logo, Colour, Contrast and Type scale to Voice, Tokens and Close, as landscape **Deck** slides or portrait **Document** pages. Reorder them, leave pages out, or switch layouts. The **Export** tab then gives each reader what they need:" },
      { t: 'table', head: ['Export', 'For'], rows: [
        ['Screen PDF', 'Clients reading on screen or in email'],
        ['Print PDF', 'A printer: 300 dpi, 3 mm bleed and crop marks'],
        ['HTML handoff', 'One self-contained file with logo downloads and click-to-copy colours'],
        ['CSS, Tailwind, JSON', 'Developers: custom properties, a theme extension, or design tokens'],
        ['.ase', 'Swatches for Illustrator, Photoshop or InDesign'],
        ['Editor', 'Every page as a board of real layers, to adjust by hand'],
      ] },
      { t: 'p', text: "**Save as a client brand in Studio** turns the finished system into a brand you can pick on any job, and the Editor then flags off-brand colours, wrong fonts, small logos and crowded clear space. [Brand guideline exports](/learn/brand-guideline-exports) covers every file." },

      { t: 'h', text: 'Where your judgement still matters' },
      { t: 'p', text: "The builder does not choose the brand colour, the logo or the personality, and it cannot tell you whether the type feels right for the client. Those are the decisions worth an afternoon. It also shows CMYK only as an approximate starting point: all exports are RGB, so confirm print colours against a proof. For the whole process from logo to handoff, see [Build a brand guideline for a client](/learn/workflow-client-brand-guideline)." },
      { t: 'try', label: 'Open the brand guideline builder in Studio', href: '/studio' },
    ],
  },

  // ─── 8 ────────────────────────────────────────────────────────────
  {
    slug: 'one-design-every-format',
    title: 'One design, every format: resize, cascade, or let Studio lay it out',
    summary: "Voidcanvas has four ways to turn one design into posts, stories, banners and print. They differ in one thing that matters: whether the result is scaled or laid out by role, and whether it stays linked to the original.",
    date: '2026-11-13',
    author: AUTHOR,
    tags: ['Editor', 'Studio', 'Craft'],
    body: [
      { t: 'p', text: "A launch rarely needs one image. It needs a post, a story, a thumbnail and a banner that all say the same thing, and it needs them again when the date changes. Voidcanvas has several ways to get there. This post explains how each one places your layers, so you can pick the right one before you start rather than fixing the wrong one after." },

      { t: 'h', text: 'Why resizing is hard' },
      { t: 'p', text: "Scaling a design to a new shape is simple arithmetic, and it is usually wrong. Take a 1080 × 1350 portrait post and fit it to a 1584 × 396 LinkedIn banner. The height sets the scale, so everything shrinks to under a third of its size and the headline becomes unreadable. A good banner is not a small post. It is a different layout: text in one column, the image beside it, details dropped." },
      { t: 'p', text: "So the question for every method is how much it knows about what each layer is." },

      { t: 'h', text: '1. Resize for other formats' },
      { t: 'p', text: "File, **Resize for other formats…** in the Editor is the quick route. Pick sizes from the presets and choose **Download N as PNG** for a zip, or **Save as separate designs** to get one editable design per size. Your original is not changed." },
      { t: 'p', text: "It uses two simple rules. A layer that covers at least 95 per cent of the page in both directions, such as a background colour or full-bleed photo, is scaled up to cover the new page and may be cropped at the edges. Everything else keeps its position relative to the centre and scales to fit, so nothing is cut off. Text is resized by changing its font size, so it stays sharp. Good for close shapes, weak for extreme ones." },

      { t: 'h', text: '2. Cascade to touchpoints' },
      { t: 'p', text: "File, **Boards…**, then **Cascade to touchpoints**, uses the same rules but builds the sizes as boards beside your design, in the same file. You see every format at once and adjust them side by side. The boards remember which board they came from, and that link is what makes the next step possible." },

      { t: 'h', text: '3. Update formats from master' },
      { t: 'p', text: "Once formats are linked, Layer, Formats, **Update formats from master** pushes text, fonts, colours, pictures and styles from the master into every linked board, while keeping each board's own positions and sizes. Fix a typo or swap the photo on the master, run it, and your hand-made layouts survive. When new copy is longer, it is shrunk to fit the space the old copy had." },
      { t: 'p', text: "This is the command that stops a campaign going out with one size carrying the old date. Change it once, on the master." },
      { t: 'warn', text: "The re-sync icon on a master board's card in the Boards dialog does something different: it rebuilds every linked board from scratch and discards their changes. Re-sync before fine-tuning, not after." },

      { t: 'h', text: '4. Studio formats, laid out by role' },
      { t: 'p', text: "Studio goes further. In a job, the **Key visual** tab builds each format by giving every layer a role: background, image, headline, subheading, body text, details, call to action, logo or decoration. With roles, a much wider board splits into a text column and an image side, a much taller board stacks the image above the text, and logos keep their corner. That is the difference between a banner that is laid out and one that is shrunk." },
      { t: 'p', text: "Press **Build N missing formats** to lay out every format on your list, and **Update formats from the master** after a change. **Re-lay** on a format's card throws its own changes away and lays it out again. The formats come from the job's list, which covers social, screen, print and outdoor sizes, and delivery renders them all at full size, named and zipped. See [Start a job from the client's brief](/learn/start-a-job-from-a-brief)." },

      { t: 'h', text: 'Design the master so it can adapt' },
      { t: 'p', text: "Every method works better when the master is built for it. These habits help:" },
      { t: 'list', items: [
        "Keep each element on its own layer: photo, headline, subheading, details, button and logo. Merged layers cannot be placed by role.",
        "Let the background fill the whole page, so it is treated as a background in every size.",
        "Name your logo layer with the word logo, so it is treated as a logo without setup.",
        "Keep the headline short. The thumbnail and the banners test it hardest.",
        "Choose the master format carefully. Start from the size most people will see and that carries the most content, usually the 1080 × 1350 Instagram post for social.",
      ] },
      { t: 'p', text: "If a layer lands in the wrong place, select it on the master and set **Role in formats** in the Properties panel, then re-lay that format." },

      { t: 'h', text: 'Finish by hand' },
      { t: 'p', text: "Automatic layout gets you most of the way. The last part is judgement: what to drop from a banner, how big the headline needs to be on a thumbnail seen at phone size. Select a board and press {{Shift+1}} to fit it on screen on its own, and adjust. Size changes you make on one format are kept when you next update from the master." },

      { t: 'h', text: 'Getting the files out' },
      { t: 'list', items: [
        "**Resize for other formats** writes PNGs at exactly the preset size.",
        "In the Editor's export dialog, **Each board as its own PNG (zip)** exports one PNG per board at 2×, named after the boards.",
        "Studio's **Deliver** tab renders every format in the file types you tick, including a print PDF with bleed for print formats, named client_job_format_version.",
      ] },
      { t: 'p', text: "Which to use comes down to what happens next. A personal post in three sizes: Resize. A set you want to see together: Cascade. A client campaign that will change before it ships: a Studio job. [Resize one design to every format](/learn/resize-to-every-format) and [Turn one launch post into every social format](/learn/workflow-social-campaign) have the step-by-step detail." },
      { t: 'try', label: 'Start a job in Studio', href: '/studio' },
    ],
  },
]
