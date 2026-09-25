import type { Article } from '../types'

// End-to-end recipes. Every click path here exists in the product: menus in src/editor/actions.ts,
// Studio in src/studio/**, Effects in src/app/effects and src/components, handoff via sendHandoff,
// sizes in src/editor/presets.ts and src/studio/jobs.ts, export in src/editor/components/ExportDialog.tsx.

export const articles: Article[] = [
  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'workflow-event-poster',
    title: 'Make an event poster from a photo to a print-ready PDF',
    summary: 'Build an 18 × 24 inch event poster in the Editor: cut the subject out so it stands in front of the headline, tone the background down, set the details in order and export a 300 dpi PDF.',
    category: 'workflows',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['remove-background', 'export-for-print', 'workflow-print-flyer', 'typography-fundamentals'],
    keywords: 'gig poster concert flyer event artwork print pdf 300 dpi photo cutout text behind subject large format',
    body: [
      { t: 'p', text: 'This recipe takes one good photo and turns it into a poster you can send to a printer. You will set the size first, cut the subject out so it overlaps the headline, quieten the background, and export a one-page PDF at 300 dpi. Use it for gigs, club nights, talks and exhibitions: anything where one image and a few facts have to work from across a room.' },
      { t: 'h', text: 'You will need' },
      { t: 'list', items: [
        'One strong photo of the act, speaker or venue, as large as you have. The subject should already fill most of the frame.',
        'The facts: event name, date and time, venue, ticket price and where to buy.',
        'Any sponsor or venue logos, ideally PNG or SVG with a transparent background.',
        'Your printer\'s spec sheet, if you have one. You will need it in stage 10.',
      ] },
      { t: 'h', text: 'Result' },
      { t: 'p', text: 'An 18 × 24 inch poster saved as a one-page PDF at 300 dpi, plus a smaller JPG of the same design for sharing online. The design stays editable on your device, with a saved version you can go back to.' },

      { t: 'h', text: '1. Start at the final size' },
      { t: 'p', text: 'Pick the size before anything else. Type sizes, margins and how much you can enlarge the photo all depend on it, and changing size later means redoing all of them.' },
      { t: 'steps', items: [
        'Open the Editor. On the start screen, under **What are you making?**, find the Print group.',
        'Choose **Poster 18 × 24 in**. The canvas is 5400 × 7200 px, which is 18 × 24 inches at 300 pixels per inch.',
      ] },
      { t: 'note', text: 'Shortcuts below use Ctrl. On a Mac, use Cmd instead, and Option for Alt.' },

      { t: 'h', text: '2. Set margins before you place anything' },
      { t: 'p', text: 'Printers trim with a small tolerance, and people read posters from the middle outwards. A clear margin keeps type safe from the knife and gives the design a frame.' },
      { t: 'steps', items: [
        'Choose **View > Guides > New guide layout…**.',
        'Click the **Safe margins** preset, then change **Margin (px)** to 300. At 300 dpi that is one inch on every side.',
        'Click **Make guides**. Check **View > Snap** is ticked ({{Ctrl+Shift+;}}) so layers settle on the guides as you drag.',
      ] },

      { t: 'h', text: '3. Place the photo and fill the page' },
      { t: 'steps', items: [
        'Choose **File > Place image as layer…** ({{Ctrl+Shift+P}}) and pick your photo.',
        'Press {{Ctrl+T}} for Free transform. Drag a corner until the photo covers the whole page, then press Enter to apply.',
        'Double-click the layer name in the Layers panel and call it Background photo.',
      ] },
      { t: 'warn', text: 'Images are scaled so their long side is at most 4096 px when they come in. On a 7200 px tall poster, a portrait photo that fills the page is enlarged about 1.8 times, roughly 170 pixels per inch at print size. A landscape photo cropped to fill the page is enlarged more. From normal poster viewing distance that holds up. What does not hold up is cropping hard into a small part of a photo, so choose an image where the subject already fills the frame.' },

      { t: 'h', text: '4. Cut the subject out so it can stand in front of the type' },
      { t: 'p', text: 'Putting the headline behind the subject gives a flat poster depth, and it ties the words to the person. You need two copies of the photo: the full picture at the back, and a cut-out copy on top.' },
      { t: 'steps', items: [
        'With Background photo selected, press {{Ctrl+J}} to duplicate it. Rename the copy Subject.',
        'With Subject selected, choose **Layer > Remove background**, or click **Remove background** in the Properties panel.',
        'The first time, you are asked to download the model once. It runs on your device and nothing is uploaded. For anything that is not a person, use **Not a person? Use the any-subject model** in Properties instead.',
        'The background is hidden with a mask, not deleted. To tidy an edge, click the mask thumbnail in the Layers panel and paint: Brush shows, Eraser hides.',
      ] },

      { t: 'h', text: '5. Tone the background down' },
      { t: 'p', text: 'A busy background fights the headline. Dropping its colour, or pushing it towards one brand colour, separates the subject and gives the type a calm surface to sit on. Adjustment layers do this without touching the photo, and they affect every layer beneath them, so where they sit in the stack matters.' },
      { t: 'steps', items: [
        'Select Background photo, then choose **Image > Adjustments > Black and white…**. For a coloured wash instead, choose **Gradient map…**.',
        'In the Layers panel, check the adjustment sits directly above Background photo and below Subject. Drag it there if not. The subject now stays in colour.',
        'To darken the background further, add **Image > Adjustments > Curves…** in the same place and pick a preset such as Darken in Properties.',
      ] },

      { t: 'h', text: '6. Set the headline behind the subject' },
      { t: 'steps', items: [
        'Press **T**, click on the canvas and type the event name.',
        'Set the font in Properties. Set the size in the **Character** panel (Window menu), where you type a number: on a 5400 px wide page, a headline that spans the width can be larger than the 600 px the Properties size slider reaches.',
        'In the Layers panel, drag the text layer down so it sits between the adjustment and Subject.',
        'Move the headline or the subject until the word still reads at a glance. Covering part of a letter or two adds depth; covering whole letters makes people guess.',
      ] },

      { t: 'h', text: '7. Add the details in a clear order' },
      { t: 'p', text: 'People read a poster in a fixed order: what it is, when, where, how to get in. Make each step visibly smaller than the one before, and keep one type family so the size changes do the work.' },
      { t: 'steps', items: [
        'Add a text layer each for date and time, venue, and tickets. Put them above Subject so nothing covers them.',
        'Shift-click the detail layers in the Layers panel, then choose **Layer > Align > Left edges** so they share one edge. With three or more selected, **Distribute vertically** evens the gaps.',
        'Add logos with **File > Place image as layer…**, or from **Your logos** in the Add menu if they are in your brand kit. Line them up along the bottom margin and align their bottom edges.',
      ] },

      { t: 'h', text: '8. Proof it at print size' },
      { t: 'steps', items: [
        'Choose **View > 100%** ({{Ctrl+1}}) and hold Space to pan. Check the photo\'s edges and the smallest type at real pixels.',
        'Hold the backslash key (\\) to see the design before adjustments and filters, then let go.',
        'Choose **File > Save a version** ({{Ctrl+Alt+S}}) so you can come back to this state after late changes.',
      ] },
      { t: 'tip', text: 'Zoom out until the poster is about the size of your phone screen. If you can still read the event name and the date, it will work from across a street.' },

      { t: 'h', text: '9. Export the PDF' },
      { t: 'steps', items: [
        'Choose **File > Export as…** ({{Ctrl+E}}) and pick **PDF**.',
        'Under Size, choose **1×** (5400 × 7200). Only 0.5× and 1× are offered here, because larger would pass 8192 px.',
        'Click **Download**.',
        'For social media, export again as **JPG** at **0.5×** (2700 × 3600).',
      ] },
      { t: 'p', text: 'The PDF is one page at 18 × 24 inches with the design placed as a 300 dpi image. The Editor treats any design over 2000 px on its long side as print work. Transparent areas print as white. Every download also saves a version named Exported, so you can always find the file you sent.' },

      { t: 'h', text: '10. Talk to the printer about bleed' },
      { t: 'p', text: 'The Editor\'s PDF stops exactly at the edge of the design: no bleed and no crop marks. Ask your printer whether they need bleed. If they do, you have two options.' },
      { t: 'list', items: [
        '**Add it in the Editor.** Choose **Image > Canvas size…**, tick **Relative**, add 72 px to both width and height (36 px, about 3 mm at 300 dpi, on each side), keep the centre anchor and click **Apply**. Canvas size does not scale layers. If the photo does not reach the new edge, stretch Background photo with {{Ctrl+T}}, then delete Subject and make it again from the stretched photo (stage 4) so the two stay lined up. Export the PDF again and tell the printer it includes 3 mm bleed with no crop marks.',
        '**Deliver it from Studio.** A Studio job adds 3 mm bleed and crop marks automatically. See [An A5 flyer with bleed for the printer](/learn/workflow-print-flyer) for that route.',
      ] },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**Export failed. Try a smaller size.** Very large canvases can exhaust browser memory. Close other heavy tabs and try again at 1×.',
        '**The cut-out has a halo.** Click the Subject mask thumbnail and paint along the edge with Eraser at low Hardness to pull the mask in.',
        '**Colours look duller on paper.** Exports are RGB. Ask the printer to convert with their profile and send you a proof.',
        '**The headline disappears behind the subject.** Move the text layer above Subject in the Layers panel, or move the subject over.',
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'workflow-social-campaign',
    title: 'Turn one launch post into every social format',
    summary: 'Use a Studio job to design one key visual, build linked versions for every social format, keep them in step when the copy changes, and deliver a named zip.',
    category: 'workflows',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['studio-overview', 'resize-to-every-format', 'designing-for-social', 'delivering-files'],
    keywords: 'campaign instagram story reel linkedin youtube x twitter facebook whatsapp resize formats key visual master linked variants all sizes',
    body: [
      { t: 'p', text: 'A launch rarely needs one image. It needs a post, a story, a banner and a thumbnail that all say the same thing. This recipe designs the hero once, then lets Studio build every other format from it, placing each element by what it is rather than shrinking the whole picture. When the date changes, you change it once.' },
      { t: 'h', text: 'You will need' },
      { t: 'list', items: [
        'The brief, as the client sent it, or a few lines of your own.',
        'A key photo or illustration, and the logo.',
        'Optionally, the client\'s brand saved in Studio, so the Editor can check colours and fonts.',
      ] },
      { t: 'h', text: 'Result' },
      { t: 'p', text: 'One Editor design holding the key visual and a linked board for each format, plus a zip of PNG and JPG files named client_job_format_version, with a delivery note listing every file, size and font.' },

      { t: 'h', text: '1. Start a job and paste the brief' },
      { t: 'steps', items: [
        'Open Studio and click **Start a job**.',
        'Paste the brief into **The brief**. Studio reads the audience and tone, and lists the facts it found under **Read from the brief. Goes to the Editor as a checklist.**',
        'Type the client and job name at the top of the page.',
        'If you have saved brands, pick one under **Which brand is this for?**. The Editor then checks colours, fonts and logo space against it.',
      ] },

      { t: 'h', text: '2. List every format you owe' },
      { t: 'p', text: 'Decide the formats before you design. The shapes you must fit change what the hero can hold: a 4:1 banner has no room for a paragraph, so the key visual should not depend on one.' },
      { t: 'steps', items: [
        'In the **Formats** panel, Studio suggests sizes the brief mentions under **The brief mentions:**. Click each one, or **Add all**.',
        'Click **All sizes and custom** for the rest. Social includes Instagram post, Square post, Story / Reel / Status, X post, Facebook cover, LinkedIn banner, X header, YouTube thumbnail and WhatsApp flyer.',
        'Set a due date on each row if the formats go out on different days.',
      ] },

      { t: 'h', text: '3. Start the key visual' },
      { t: 'p', text: 'The master should be the format most people will see and the one that carries the most content. For most launches that is the Instagram post at 1080 × 1350. Formats close to its shape adapt with little work; very wide ones like the LinkedIn banner and X header always need a hand.' },
      { t: 'steps', items: [
        'Open the **Key visual** step. If you picked a direction or a brand, Studio shows the palette and type it will open with.',
        'Under **Master format**, choose the format to design first.',
        'Click **Start key visual in the Editor**. The Editor opens at that size with the palette in your swatches and the brief in the Brief panel as a checklist that ticks itself off as the text appears on the design.',
      ] },

      { t: 'h', text: '4. Design the master so it can adapt' },
      { t: 'p', text: 'Studio lays out each format by giving every layer a role: background, image, headline, subheading, body text, details, call to action, logo or decoration. It can only do that if each element is its own layer.' },
      { t: 'list', items: [
        'Keep the photo, headline, subheading, details, button and logo as separate layers. Do not merge or rasterize them.',
        'Let the background photo fill the whole page. Layers that cover the page are treated as backgrounds and fill every format.',
        'Keep the text short. A headline that works at 1080 wide will be tested hardest on the thumbnail and the banners.',
      ] },
      { t: 'p', text: 'When the hero is right, click **Back to the job in Studio** at the top of the Brief panel. It saves first.' },

      { t: 'h', text: '5. Build the formats' },
      { t: 'steps', items: [
        'On the **Key visual** step, click **Build N missing formats** (N is how many are not built yet).',
        'The Editor opens with each format as a board beside the master, laid out from it.',
        'Back in Studio, each card shows a thumbnail and **master** or **linked** under its size.',
      ] },

      { t: 'h', text: '6. Finish each format by hand' },
      { t: 'p', text: 'Automatic layout gets you most of the way. The last part is judgement: what to drop on a banner, how big the headline should be on a thumbnail seen at phone size.' },
      { t: 'steps', items: [
        'Click a board and choose **View > Fit board** ({{Shift+1}}) to see it on its own.',
        'Adjust sizes and positions. On the wide banners, consider removing the details and keeping headline, image and logo.',
        'If Studio put something in the wrong place, select that layer on the master and set **Role in formats** in Properties (under Layer). Then use **Re-lay** on that format\'s card in Studio, or **Layer > Formats > Re-lay this format from master** in the Editor. Re-lay drops that format\'s own changes.',
      ] },

      { t: 'h', text: '7. Change once, update everywhere' },
      { t: 'p', text: 'Late changes are where campaigns go wrong: one size keeps the old date. Make the change on the master only.' },
      { t: 'steps', items: [
        'Edit the text, colour or picture on the master board.',
        'Choose **Layer > Formats > Update formats from master**, or click **Update formats from the master** in Studio.',
        'The content goes into every linked format. Layouts you adjusted by hand are kept.',
      ] },

      { t: 'h', text: '8. Show the client' },
      { t: 'p', text: 'On the **Review** step, click **New version from the design** each time you show something. You can pin the client\'s comments on the images, paste their reply and click **Turn into a checklist**, set the status to Sent, Changes asked or Approved, and send a **Review pack PDF** or **WhatsApp images**. See [Directions and review](/learn/directions-and-review).' },

      { t: 'h', text: '9. Deliver' },
      { t: 'steps', items: [
        'Open the **Deliver** step. Each format has tick boxes for PNG, JPG, WebP and Print PDF. Social formats start with PNG and JPG.',
        'If the job has a brand, leave **Include … brand sheet** ticked to add a one-page HTML summary.',
        'Click **Build the package**. You get one zip of every file at full size, named client_job_format_version, plus a delivery note. The job is marked Delivered.',
      ] },

      { t: 'h', text: 'Without a Studio job' },
      { t: 'p', text: 'For a quick personal post you can stay in the Editor. The results are less careful, because these tools scale the design rather than laying it out by role.' },
      { t: 'list', items: [
        '**File > Resize for other formats…** makes copies at the sizes you pick. Backgrounds stretch to fill; everything else keeps its place and scales to fit. Click **Download N as PNG** for a zip, or **Save as separate designs** to fine-tune each one. Your original is not changed.',
        '**File > Boards…**, then the **Cascade to touchpoints** tab, adds linked boards beside the current design. The **Re-sync variants** button on the master rebuilds them from it and throws away changes made on the variants, so re-sync before fine-tuning, not after.',
        'To export boards, open **File > Export as…** and click **Each board as its own PNG (zip)**. Boards export at 2×.',
      ] },
      { t: 'p', text: 'Scaling to fit is why a banner from a portrait post looks tiny: on a 1584 × 396 LinkedIn banner the scale is set by the height, so a 1080 × 1350 post shrinks to under a third. Plan to rework the wide formats by hand either way.' },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**A format says Not built yet on Deliver.** Build it on the Key visual step first.',
        '**The key visual is not saved on this device yet.** Studio and the Editor share this browser\'s storage. Open the job on the device and browser where you designed it.',
        '**Text is unreadable on the thumbnail.** Increase the headline on that board only. Updates from the master keep your size.',
      ] },
      { t: 'try', label: 'Start a job in Studio', href: '/studio' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'workflow-print-flyer',
    title: 'Make an A5 flyer with bleed for the printer',
    summary: 'Design an A5 flyer at 300 dpi with a safe margin, then deliver it from Studio as a print PDF with 3 mm bleed, crop marks and trim and bleed boxes set.',
    category: 'workflows',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['designing-for-print', 'export-for-print', 'delivering-files', 'image-resolution-explained'],
    keywords: 'a5 leaflet handbill flyer print bleed crop marks trim marks safe area 300 dpi print ready pdf printer',
    body: [
      { t: 'p', text: 'Printers print on bigger sheets and cut them down. If your background stops exactly at the edge, a slight slip of the blade leaves a white sliver. Bleed is extra picture past the edge so the cut always lands on colour. This recipe gets you a flyer the printer can use straight away.' },
      { t: 'p', text: 'The Editor\'s own PDF export has no bleed or crop marks. Studio\'s delivery step adds both, so even for your own flyer you set up a small Studio job. It takes a minute.' },
      { t: 'h', text: 'You will need' },
      { t: 'list', items: [
        'The flyer\'s words, written and checked.',
        'Photos at least 1748 px wide if they fill the width (A5 at 300 dpi is 1748 × 2480 px).',
        'Logos as PNG or SVG.',
        'The printer\'s requirements: paper, finish, quantity, and how much bleed they want.',
      ] },
      { t: 'h', text: 'Result' },
      { t: 'p', text: 'A print PDF at A5 trim size (148 × 210 mm) with 3 mm bleed on every side, crop marks outside the bleed, TrimBox and BleedBox set, and a slug line with the job details. A JPG for proofing and a delivery note come in the same zip.' },

      { t: 'h', text: 'Trim, bleed and safe area' },
      { t: 'table', head: ['Area', 'What it is', 'What goes there'], rows: [
        ['Trim', 'Where the flyer is cut: 148 × 210 mm for A5.', 'The design, exactly as you see it on the canvas.'],
        ['Bleed', '3 mm past the trim on every side, cut off after printing.', 'Background colour and pictures only. Studio makes it for you.'],
        ['Safe area', 'A margin inside the trim.', 'All text, logos and anything that must not be cut.'],
      ] },

      { t: 'h', text: '1. Set up a job with an A5 format' },
      { t: 'steps', items: [
        'Open Studio and click **Start a job**. Give it a client and job name at the top.',
        'Paste the flyer copy or a one-line brief into **The brief**. Anything Studio reads from it goes to the Editor as a checklist.',
        'In **Formats**, click **All sizes and custom**, then under Print click **A5 flyer**. The row shows 148 × 210 mm.',
      ] },

      { t: 'h', text: '2. Open the flyer in the Editor' },
      { t: 'steps', items: [
        'Open the **Key visual** step. Under **Master format**, A5 flyer (1748 × 2480) is selected.',
        'Click **Start key visual in the Editor**. The Editor opens a white 1748 × 2480 px page.',
      ] },

      { t: 'h', text: '3. Mark the safe area' },
      { t: 'p', text: 'At 300 dpi, one millimetre is about 11.8 px. A 5 mm safe margin is about 60 px, which is exactly the **Safe margins** preset.' },
      { t: 'steps', items: [
        'Choose **View > Guides > New guide layout…**.',
        'Click **Safe margins** (Columns 1, Rows 1, Margin 60 px) and click **Make guides**.',
        'Turn on **View > Rulers** ({{Ctrl+R}}) if you like to see positions. On a Mac, use Cmd for Ctrl.',
      ] },

      { t: 'h', text: '4. Take backgrounds to the edge' },
      { t: 'p', text: 'Studio makes the bleed by repeating the outermost pixels 3 mm outwards. That works for any colour or photo that reaches the edge. It shapes a few decisions:' },
      { t: 'list', items: [
        'Anything meant to run off the page must touch the canvas edge. A photo that stops 2 px short leaves a white line after trimming.',
        'Avoid thin borders or frames near the edge. Cutting tolerance makes them look uneven, and the repeated edge pixels turn them into a thick band in the bleed.',
        'Keep important detail in a photo away from the very edge, since the repeated strip is a stretch of those pixels.',
      ] },

      { t: 'h', text: '5. Set type that prints' },
      { t: 'p', text: 'Type on paper is judged in points. At 300 dpi, one point is about 4.2 px.' },
      { t: 'table', head: ['Use', 'Size in points', 'About this many px at 300 dpi'], rows: [
        ['Small print, terms', '7 to 8 pt', '29 to 33 px'],
        ['Body text', '9 to 11 pt', '38 to 46 px'],
        ['Subheads', '14 to 18 pt', '58 to 75 px'],
        ['Headline', '36 pt and up', '150 px and up'],
      ] },
      { t: 'list', items: [
        'Keep all text inside the guides.',
        'Small text over a photo is hard to read on paper. Put it on a solid panel, or darken the photo behind it with an adjustment layer.',
        'Check the smallest text at **View > 100%** ({{Ctrl+1}}).',
      ] },

      { t: 'h', text: '6. Check against the brief' },
      { t: 'p', text: 'The Brief panel shows how many brief items are on the design, for example **4 of 5 on the design**. Anything missing is usually the thing the client rings about. If the job has a brand, the same panel flags off-brand colours.' },

      { t: 'h', text: '7. Go back to Studio and send a proof' },
      { t: 'steps', items: [
        'Click **Back to the job in Studio** at the top of the Brief panel. It saves first.',
        'On the **Review** step, click **New version from the design**, then **Review pack PDF** to send the client something to sign off.',
      ] },

      { t: 'h', text: '8. Build the print package' },
      { t: 'steps', items: [
        'Open the **Deliver** step. The A5 flyer row has **Print PDF** and **JPG** ticked, the defaults for print formats.',
        'Click **Build the package**.',
        'The zip holds the PDF and JPG named client_job_a5-flyer_vN, where N is the version count, and a delivery note with print notes.',
      ] },
      { t: 'p', text: 'The slug line printed outside the trim reads like: Client - Job - A5 flyer - v1 - Trim 148 x 210 mm - Bleed 3 mm - RGB, convert with your printer\'s profile. It tells whoever opens the file what they are looking at.' },

      { t: 'h', text: '9. What to tell the printer' },
      { t: 'table', head: ['They will ask', 'Your answer'], rows: [
        ['Trim size', '148 × 210 mm (A5)'],
        ['Bleed', '3 mm on all sides, included'],
        ['Crop marks', 'Yes, outside the bleed. TrimBox and BleedBox are set.'],
        ['Resolution', '300 dpi'],
        ['Colour', 'RGB. Please convert with your profile and send a proof.'],
      ] },
      { t: 'warn', text: 'Bleed is fixed at 3 mm. If your printer asks for more, tell them before they quote.' },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**White sliver after trimming.** The background did not reach the canvas edge. Stretch it with {{Ctrl+T}} and deliver again.',
        '**Text too close to the edge.** It sat outside the 60 px guides. Move it in.',
        '**Photo looks soft on paper.** It was enlarged past its real size. Use a bigger original. See [Image resolution explained](/learn/image-resolution-explained).',
        '**Colours shifted.** Screens show RGB; presses print CMYK. Ask for a printed proof for any colour that matters.',
      ] },
      { t: 'try', label: 'Start a job in Studio', href: '/studio' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'workflow-client-brand-guideline',
    title: 'Build a brand guideline for a client, from logo to handoff',
    summary: 'Use the brand guideline builder to go from a client\'s logo to a checked colour system, type scale and logo rules, then hand over PDFs, an HTML file, tokens and swatches, and save the brand for future jobs.',
    category: 'workflows',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['brand-guidelines', 'brand-guideline-exports', 'brands-library', 'building-a-brand-identity'],
    keywords: 'brand book style guide brand manual guidelines pdf identity logo rules colour palette type scale design tokens css tailwind ase handoff',
    body: [
      { t: 'p', text: 'A guideline is how a brand survives after you hand it over. This recipe takes a client\'s logo and a few decisions and turns them into a full guideline, checks the colours for contrast, and exports it in every form the client\'s team needs: a document, a web file, code tokens and swatches.' },
      { t: 'h', text: 'You will need' },
      { t: 'list', items: [
        'The client\'s logo as SVG, PNG or JPG.',
        'The brand name and a short tagline.',
        'A sense of personality: which of Bold, Refined, Playful, Minimal, Warm or Technical fits best.',
        'Any fonts the client already owns, as .woff2, .woff, .ttf or .otf files, or Google Fonts names.',
      ] },
      { t: 'h', text: 'Result' },
      { t: 'p', text: 'A guideline of up to 13 pages as a screen PDF, a print PDF with bleed and crop marks, and a single HTML file the client opens in a browser. Plus CSS, Tailwind and JSON tokens, an .ase swatch file, the pages as editable Editor boards, and the brand saved in Studio so every future job is checked against it.' },

      { t: 'h', text: '1. Open the builder' },
      { t: 'steps', items: [
        'Open Studio. At the bottom of the page, under **Also here**, click **Brand guideline builder**.',
        'Work through the four tabs in the side panel: **Identity**, **Colour**, **Type** and **Export**. The preview updates as you go.',
      ] },
      { t: 'warn', text: 'The builder keeps one brand at a time on this device, saved as you work. Starting over clears it. Export or save the current client (stage 9) before you start the next one.' },

      { t: 'h', text: '2. Identity: logo and the rules around it' },
      { t: 'steps', items: [
        'Fill in **Brand name** and **Tagline**.',
        'Under **Logo**, click **Add logo**. If the logo has colour, the builder takes the brand colour from it. A flat background is removed so the mark sits on any colour.',
        'Set **Clear space** (¼ H, ½ H or 1 H, measured from the height of the mark) and **Minimum width** (16, 24, 32 or 48 px).',
        'Read **Logo contrast**. It lists each background with the logo version that works on it (Full colour, Reversed or Dark mono) and a contrast figure. Red means the logo is too faint there.',
        'Pick a **Personality**, an **Art direction** (editorial, graphic or systematic), **Corner radius**, **Spacing unit** and **Grid**.',
      ] },
      { t: 'p', text: 'Clear space measured from the mark itself, not in pixels, is what keeps the rule true at every size. Minimum width is the size below which the mark stops being recognisable; test it by zooming the preview out.' },

      { t: 'h', text: '3. Colour: a system, not a list' },
      { t: 'steps', items: [
        'Check **Brand colour**. It is the source; secondary and accent are built around it unless you lock them.',
        'Choose a **Harmony**: Analogous, Complementary, Triadic or Split complement.',
        'Adjust **Secondary** and **Accent** if the client has set colours. Editing a value locks it.',
        'Set **Neutral warmth** to decide how much brand hue shows in the greys.',
        'Read the **Contrast** list. Each pairing shows its ratio and a grade, or Fail.',
      ] },
      { t: 'p', text: 'Fix every Fail before the client sees it. A colour pairing that fails contrast will end up as grey text on a coloured button somewhere, and the brand will get the blame. Nudge the colour until the pairings you expect to use for text pass. See [Colour that works](/learn/colour-that-works).' },

      { t: 'h', text: '4. Type: families and a scale' },
      { t: 'steps', items: [
        'Set **Headings**, **Body** and **Data and code**. Type any Google Fonts family, or click the upload button to use a file. Uploaded fonts never leave this browser.',
        'Choose a **Scale**: Minor third (1.2), Major third (1.25), Perfect fourth (1.333), Aug. fourth (1.414), Perfect fifth (1.5) or Golden ratio (1.618).',
        'Choose a **Base size** from 14 to 18.',
      ] },
      { t: 'p', text: 'A small ratio suits dense material like reports and apps, where many levels of heading must stay close. A large ratio suits posters and campaigns, where the headline has to dominate. The preview under the controls shows the whole scale in the chosen fonts.' },

      { t: 'h', text: '5. Explore with New take, then lock' },
      { t: 'p', text: '**New take** in the top bar generates fresh choices for anything unlocked. Use it early to show the client options you would not have tried. Each field has a lock button; once the client approves a colour or font, lock it so later takes keep it. Page order and layouts are always kept.' },

      { t: 'h', text: '6. Check before you show anyone' },
      { t: 'p', text: 'The button in the top bar reads **All N checks pass** or **N issues**. Click it for the list. It covers colour contrast and the logo checks, and it is quicker to fix issues now than after the PDF is in the client\'s inbox.' },

      { t: 'h', text: '7. Shape the document' },
      { t: 'steps', items: [
        'Choose **Deck** (landscape, for presenting) or **Document** (portrait, for reading and printing) in the top bar.',
        'The page list holds Cover, Principles, Logo, Clear space, Colour, Tints, Contrast, Typography, Type scale, In use, Voice, Tokens and Close.',
        'Drag pages, or use the arrows on each thumbnail, to reorder.',
        'Pages with more than one layout show a counter such as 1/3. Click it, or Alt-click the thumbnail, for the next layout.',
        'Click the eye on a page to leave it out of exports. The reset button restores the default order and layouts.',
      ] },

      { t: 'h', text: '8. Export for everyone who will use it' },
      { t: 'table', head: ['Export', 'For', 'What you get'], rows: [
        ['Screen PDF', 'The client, email, presenting', 'A PDF of the included pages.'],
        ['Print PDF', 'A printed manual', 'A4 portrait (Document) or 297 × 167 mm (Deck), 300 dpi, 3 mm bleed and crop marks. RGB, so the printer converts.'],
        ['HTML handoff', 'Anyone with a browser', 'One file with arrow-key page navigation, logo downloads and click-to-copy colours. Google fonts are embedded where possible.'],
        ['Tokens for developers', 'The web or app team', 'CSS, Tailwind or JSON. Copy it, or click Save file.'],
        ['Download .ase', 'Other designers', 'Adobe Swatch Exchange, grouped by role, for Illustrator, Photoshop and InDesign.'],
        ['Editor', 'You, for custom edits', 'Every page as a board of real text, shape and image layers.'],
      ] },
      { t: 'p', text: 'Open the pages in the Editor when the client needs wording the builder does not generate, such as their own voice examples. Changes made there do not flow back to the builder, so finish the system first and edit last. To export the edited pages, use **File > Export as…** and **Each board as its own PNG (zip)**.' },

      { t: 'h', text: '9. Save it as a client brand' },
      { t: 'steps', items: [
        'On the Export tab, click **Save as a client brand in Studio**.',
        'The brand appears in Studio under **Client brands**, with its colours by role, fonts, logo, logo rules and voice.',
        'On any job, choose it under **Which brand is this for?**. The Editor then flags off-brand colours, wrong fonts, logo size and clear space as you design.',
        'In the brand\'s page, **Use as the Editor brand kit** puts its colours, fonts and logos ready in every design.',
      ] },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**A font could not be embedded in the HTML file.** The file then loads it from Google when online. Tell the client, or choose a font that embeds.',
        '**The brand colour came out grey.** A black, white or grey logo leaves the brand colour alone. Set **Brand colour** by hand.',
        '**The guideline could not open in the Editor.** If every page is hidden, include at least one in the page list.',
      ] },
      { t: 'try', label: 'Open Studio', href: '/studio' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'workflow-portrait-retouch',
    title: 'Retouch a portrait without destroying the original',
    summary: 'Clean up skin, soften it with restraint, shape light with masked Curves and grade the colour, all on layers you can switch off, so the untouched photo is always one click away.',
    category: 'workflows',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['retouching', 'masks', 'adjustment-layers', 'history-and-undo'],
    keywords: 'portrait retouch skin blemish spot heal clone stamp dodge burn soften skin headshot non destructive curves mask',
    body: [
      { t: 'p', text: 'Good retouching is invisible and reversible. This recipe keeps the original photo untouched at the bottom of the stack and does every change on a layer above it, so you or the client can compare, back off or undo any single step at any time.' },
      { t: 'h', text: 'You will need' },
      { t: 'list', items: [
        'A portrait photo, as large as you have.',
        'A mouse, trackpad or pen. With a pen, brush size follows pressure unless you untick **Pen size** in the options bar.',
        'About 20 minutes.',
      ] },
      { t: 'h', text: 'Result' },
      { t: 'p', text: 'A retouched portrait built from named layers: the original, a clean-up layer, a masked softening layer, two masked Curves for light, and a colour grade. Export a JPG for use, and keep the design to change later.' },

      { t: 'h', text: 'How the stack works' },
      { t: 'table', head: ['Layer (top to bottom)', 'What it does', 'Why separate'], rows: [
        ['Colour grade', 'Curves, Vibrance or Temperature for the overall look', 'Change the mood without touching the retouch'],
        ['Dodge and Burn curves', 'Two Curves, masked to where you paint', 'Light is shaped by brushing, and each side can be turned down'],
        ['Soften', 'A Blur adjustment, masked to skin, at low opacity', 'Easy to overdo, so it must stay adjustable'],
        ['Retouch', 'A copy of the photo with blemishes healed', 'Heal and Clone stamp work on the layer\'s own pixels'],
        ['Original', 'The untouched photo', 'Your reference, never painted on'],
      ] },

      { t: 'h', text: '1. Open the photo and protect it' },
      { t: 'steps', items: [
        'On the Editor start screen, click **Open a photo**, or press {{Ctrl+O}}. On a Mac, use Cmd for Ctrl and Option for Alt.',
        'Rename the photo layer Original: double-click its name in the Layers panel.',
        'Press {{Ctrl+J}} to duplicate it. Rename the copy Retouch.',
        'Click the lock on Original so you cannot paint on it by mistake.',
      ] },
      { t: 'p', text: 'Spot heal and Clone stamp change the pixels of the layer you are on, and they sample from that same layer. That is why they need a copy of the photo to work on, rather than an empty layer.' },

      { t: 'h', text: '2. Clean up blemishes with Spot heal' },
      { t: 'steps', items: [
        'Select Retouch and press **J** for Spot heal.',
        'Set **Size** just larger than the spot. Use [ and ] to change it as you go.',
        'Zoom to 100% ({{Ctrl+1}}). Paint over one spot, then let go. Work on one spot at a time.',
        'For anything bigger, such as a stray hair across the cheek, press {{Shift+J}} for **Remove object**. Paint over it and it is filled in on your device. The first use downloads the model once.',
      ] },
      { t: 'p', text: 'Remove only what is temporary: spots, marks, stray hairs. Moles, freckles and lines are part of the face, and removing them is where retouching starts to look fake.' },

      { t: 'h', text: '3. Fix edges with Clone stamp' },
      { t: 'steps', items: [
        'Press **S** for Clone stamp. The options bar says **Alt-click to choose where to copy from.**',
        'Alt-click on clean skin with the same light and texture, close to the problem.',
        'Lower **Opacity** to around 30 to 50% and **Flow** a little, and use a soft **Hardness**.',
        'Paint in short strokes. Alt-click a new source often so no pattern repeats.',
      ] },

      { t: 'h', text: '4. Soften skin, with restraint' },
      { t: 'p', text: 'Blurring skin removes texture, and texture is what makes a face look real. So the blur goes on its own layer, only where you paint it, at low strength.' },
      { t: 'steps', items: [
        'With Retouch selected, choose **Image > Adjustments > Blur…**. Rename it Soften.',
        'In Properties, set **Amount** so the skin just starts to smooth.',
        'Choose **Layer > Layer mask > Add layer mask**, then **Layer > Layer mask > Invert mask**. The blur is now hidden everywhere.',
        'Click the mask thumbnail in the Layers panel, press **B** and paint over the cheeks and forehead. Brush shows, Eraser hides. Stay off the eyes, brows, lips, nostrils and hairline.',
        'Lower the Soften layer\'s opacity until pores come back, usually between 20 and 50%.',
      ] },

      { t: 'h', text: '5. Shape the light with two masked Curves' },
      { t: 'p', text: 'Dodging and burning brightens and darkens areas to sculpt the face: lift under the eyes and along the nose, deepen the cheekbones and jaw. The Dodge and Burn tools exist, but they paint into the pixels. Two Curves layers do the same job and stay adjustable.' },
      { t: 'steps', items: [
        'Choose **Image > Adjustments > Curves…**. In Properties, pick the **Brighten** preset. Rename the layer Dodge.',
        'Add a mask, then **Invert mask**, as in stage 4.',
        'Paint on the mask with a large, soft brush at low **Opacity** (10 to 20%). Build up the light in several strokes.',
        'Repeat with a second Curves layer using the **Darken** preset. Rename it Burn and paint the shadows.',
        'Turn each layer\'s opacity down until the effect is felt rather than seen.',
      ] },
      { t: 'tip', text: 'Alt-click a mask thumbnail to view the mask itself. It shows exactly where you have painted, which is hard to judge on the photo.' },

      { t: 'h', text: '6. Grade the colour' },
      { t: 'steps', items: [
        'Select the top layer and add **Image > Adjustments > Temperature…** to warm or cool the whole picture.',
        'Add **Vibrance…** to lift muted colours without pushing skin tones too far.',
        'For skin that is too red, add **Hue and saturation…** and use its colour range picker to change just those hues.',
        'For a stronger look, add **Curves…** and try **Faded film** or **More contrast**. Use the Red, Green and Blue curves to fix a colour cast.',
      ] },

      { t: 'h', text: '7. Compare and step back' },
      { t: 'list', items: [
        'Hold the backslash key (\\) to hide every adjustment and filter and see the photo before them.',
        'Click the eye on Retouch to see the healing work switched off.',
        'Open **Window > History** to jump back to any earlier step.',
        'Choose **File > Save a version** ({{Ctrl+Alt+S}}) before any bold change.',
      ] },
      { t: 'p', text: 'Look away for a minute, then look again at 100%. If the first thing you notice is the retouching, turn the layers down.' },

      { t: 'h', text: '8. Export' },
      { t: 'steps', items: [
        'Press {{Ctrl+E}}. Choose **JPG** for a photo; it is the smallest file and has no transparency to worry about.',
        'Leave **Quality** around 90%. Pick the size and click **Download**.',
      ] },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**Spot heal says the area is too large.** It works on small spots away from the photo\'s edges. Use a smaller brush, or Remove object.',
        '**Clone stamp does nothing.** Alt-click a source first, and make sure the selected layer is Retouch, not an adjustment.',
        '**Brush strokes appear on a new layer.** Painting with Brush on a photo puts strokes on a new layer to protect the photo. To paint on a mask, click the mask thumbnail first.',
        '**Skin looks plastic.** Lower the Soften layer, or paint less of its mask.',
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'workflow-psd-to-social',
    title: 'Take a PSD from a colleague and adapt it for social',
    summary: 'Open a Photoshop file in the browser, read what was kept and what changed, fix fonts and replaced layers, then lay it out at every social size and export.',
    category: 'workflows',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['import-psd-and-pdf', 'artboards', 'resize-to-every-format', 'export-for-screen'],
    keywords: 'psd photoshop open import convert social media resize artboards fonts missing smart object layers without photoshop',
    body: [
      { t: 'p', text: 'Someone sends you a Photoshop file and needs a story, a post and a square by the afternoon. This recipe opens the PSD in the Editor as real layers, shows you how to check it against the original, repairs what did not come across, and adapts it to each format.' },
      { t: 'h', text: 'You will need' },
      { t: 'list', items: [
        'The .psd file.',
        'A flattened PNG or JPG of it from your colleague, to compare against. Ask for one; it saves guessing.',
        'The font files, if the design uses fonts that are not on Google Fonts.',
      ] },
      { t: 'h', text: 'Result' },
      { t: 'p', text: 'An editable design with a board for each social format, exported as a zip of PNGs. The original PSD is never changed and never uploaded.' },

      { t: 'h', text: '1. Open the PSD' },
      { t: 'steps', items: [
        'Open the Editor. Drop the PSD on the start screen, or press {{Ctrl+O}} and choose it. On a Mac, use Cmd for Ctrl.',
        'Large files take a moment. If the PSD had artboards, each becomes a board; otherwise it opens as one canvas.',
      ] },

      { t: 'h', text: '2. Read the import report' },
      { t: 'p', text: 'When anything had to change, a dialog titled **Opened** and the file name lists what happened in three groups: **Kept**, **Changed so it would open** and **Not supported yet**. Read it before touching anything; it is your repair list.' },
      { t: 'table', head: ['In the PSD', 'In the Editor'], rows: [
        ['Pixel layers, groups (nested), layer masks, locks, opacity, fill', 'Kept'],
        ['Text with one font, size and colour', 'Kept as editable text'],
        ['Text with mixed styles, a warp or on a path', 'Kept as pixels'],
        ['Adjustment layers such as Levels, Curves, Hue/Saturation, Colour Balance, Black & White, Gradient Map', 'Kept and editable'],
        ['A clipped adjustment layer', 'Opens unclipped, so it affects everything below'],
        ['Drop shadow, inner shadow, glows, stroke, colour overlay, bevel', 'Kept as editable layer styles'],
        ['Gradient overlay with more than two colours', 'Uses its first and last colour'],
        ['Satin and pattern overlay', 'Not supported yet'],
        ['Smart objects and vector shapes', 'Kept as pixels'],
        ['Group masks', 'Left out'],
        ['Blend modes Voidcanvas does not draw', 'Changed to the closest one'],
        ['16-bit or CMYK files', 'Converted to 8-bit RGB'],
      ] },

      { t: 'h', text: '3. Sort out fonts' },
      { t: 'p', text: 'If a font is not on your device or on Google Fonts, **Some fonts are missing** opens. Text would otherwise show in a stand-in font and the spacing would shift.' },
      { t: 'list', items: [
        '**Replace** swaps in a font you choose. Pick one with similar width, or line lengths will change.',
        '**Add font file** uses the real font from your device. It is saved inside this design.',
        '**Keep as is** leaves the stand-in, fine for a quick look but not for delivery.',
      ] },

      { t: 'h', text: '4. Check against the original' },
      { t: 'steps', items: [
        'Choose **File > Place image as layer…** ({{Ctrl+Shift+P}}) and pick your colleague\'s flattened PNG. Line it up over the design.',
        'Set its blend mode to **Difference** in the Layers panel. Anything that matches turns black; anything that moved or changed shows up bright.',
        'Fix what you find, then delete the comparison layer.',
      ] },

      { t: 'h', text: '5. Repair what came across as pixels' },
      { t: 'list', items: [
        '**Mixed-style text.** Hide the pixel layer and retype it with the Type tool (**T**), so you can edit it in each format.',
        '**A smart object you need to swap.** Place the new photo above it, then choose **Layer > Create clipping mask** ({{Alt+Ctrl+G}}). The new photo shows only inside the old one\'s shape.',
        '**A clipped adjustment now tinting everything.** Ctrl-click the thumbnail of the layer it used to clip to, to select its pixels. Select the adjustment and choose **Layer > Layer mask > Add layer mask**. The mask is made from the selection, so it only affects that layer again.',
      ] },
      { t: 'warn', text: 'Adding a mask to a text or shape layer turns it into pixels. Mask the photo or use a clipping mask instead, so text stays editable.' },

      { t: 'h', text: '6. Save a version, then make the formats' },
      { t: 'p', text: 'Before re-laying anything, choose **File > Save a version** ({{Ctrl+Alt+S}}). You now have the file exactly as it came in.' },
      { t: 'steps', items: [
        'Choose **File > Boards…** and open the **Cascade to touchpoints** tab.',
        'Pick the sizes you need, for example Instagram post, Square post and Story or Reel cover.',
        'Click **Create N boards**. Each appears beside the original as a linked board. Backgrounds fill; everything else keeps its place and scales to fit.',
      ] },
      { t: 'p', text: 'If the PSD already had artboards, cascade from the board that is closest to the format you need. A landscape banner cascades poorly to a tall story; a square does better.' },

      { t: 'h', text: '7. Fit each format by hand' },
      { t: 'steps', items: [
        'Click a board and press {{Shift+1}} to fit it on screen.',
        'Resize and move text for that shape. Stories need text out of the top and bottom strips, where the app\'s own buttons sit.',
        'Check each board at **View > 100%** ({{Ctrl+1}}).',
      ] },
      { t: 'warn', text: 'The **Re-sync variants** button in **File > Boards…** rebuilds every linked board from the original and throws away the changes you made on them. Use it only before fine-tuning.' },

      { t: 'h', text: '8. Export' },
      { t: 'steps', items: [
        'Press {{Ctrl+E}} and click **Each board as its own PNG (zip)**. Boards export at 2×, and each file is named after its board.',
        'Rename the boards in **File > Boards…** first if you want tidy file names.',
      ] },

      { t: 'h', text: 'Sending work back' },
      { t: 'p', text: 'Voidcanvas does not write PSD files. Send your colleague the PNGs. To keep an editable copy for yourself or another Voidcanvas user, choose **File > Download project file (.void)**, or **Save editable file (.void.png…)** in the Export dialog.' },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**Could not read that PSD.** It may be damaged or use a feature the reader cannot handle. Ask for a copy saved with maximum compatibility, or a flattened version.',
        '**That PSD has no layers we can read.** Ask your colleague to flatten it first; you will get one pixel layer.',
        '**Text looks slightly different.** A replaced font or rounding in the conversion. Compare with Difference and adjust size or spacing.',
      ] },
      { t: 'try', label: 'Open a PSD in the Editor', href: '/editor' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  {
    slug: 'workflow-textured-print-look',
    title: 'Make a risograph or screen-print look with Effects and the Editor',
    summary: 'Find a halftone look in Effects, rebuild it at print size in the Editor with live filter layers, set one ink on paper with Duotone, overprint type in a second ink, and finish with grain.',
    category: 'workflows',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['quick-tools', 'filters-in-the-editor', 'blend-modes-and-opacity', 'artistic-effects'],
    keywords: 'risograph riso screen print screenprint halftone duotone overprint misregistration grain zine poster texture two colour ink paper',
    body: [
      { t: 'p', text: 'Risograph and screen prints have a look people love: a few flat inks, visible dots, colours that overlap and darken, layers slightly out of line, and paper showing through. This recipe builds that look from live filter layers, so every part stays adjustable, and at a size you can print.' },
      { t: 'note', text: 'This makes the look on screen and in an exported file. It does not produce separate ink layers for a real risograph or screen-printing press.' },
      { t: 'h', text: 'You will need' },
      { t: 'list', items: [
        'A photo with a clear subject and strong light and shadow. Flat, grey photos make muddy dots.',
        'Two ink colours and a paper colour. Classic riso pairs are a fluorescent pink with a blue, or a red with a teal, on warm off-white.',
        'A short headline.',
      ] },
      { t: 'h', text: 'Result' },
      { t: 'p', text: 'An A4 design built from the photo, a Halftone filter, a Duotone filter, overprinting type in two inks and a grain layer, exported as PNG for screens or PDF for printing.' },

      { t: 'h', text: '1. Find the look in Effects' },
      { t: 'p', text: 'Effects is the fastest place to try things: one photo, every effect, instant preview.' },
      { t: 'steps', items: [
        'Open Effects and drop in your photo.',
        'In the **Effects** panel, choose **Artistic**, then **Halftone**.',
        'Under **Parameters**, move **Dot Size** until the dots read as dots at the size you will see the design. Raise **Contrast** until the shadows fill in and the highlights open up.',
        'Try **Woodcut** or **Stipple** too. Both suit print looks. Note down the numbers of the one you like.',
      ] },

      { t: 'h', text: '2. Choose your route into the Editor' },
      { t: 'p', text: '**Open in Editor** sends the photo with the effect as a live filter layer. Effects previews at up to 1200 px on the long side, and the photo goes over at that size, so this route suits a social post, not print.' },
      { t: 'p', text: 'For print, start at the print size instead:' },
      { t: 'steps', items: [
        'Open the Editor. Under Print, choose **A4 flyer** (2480 × 3508 px).',
        'Choose **File > Place image as layer…** ({{Ctrl+Shift+P}}), pick the original photo and scale it into place with {{Ctrl+T}}. On a Mac, use Cmd for Ctrl.',
        'Choose **Filter > Artistic > Halftone**. A Halftone filter layer appears. In Properties, under **Filter settings**, enter the numbers you noted.',
      ] },
      { t: 'p', text: 'Filter layers preview at the same 1200 px working size that Effects uses, so the settings look alike. When you export, the filter runs at full size with the dot size scaled up to match, so the result looks the same, only sharper.' },

      { t: 'h', text: '3. Prepare the photo underneath' },
      { t: 'p', text: 'Filters affect every layer beneath them. That means an adjustment placed below the Halftone layer changes what the halftone sees.' },
      { t: 'steps', items: [
        'Select the photo layer and add **Image > Adjustments > Curves…**. Pick **More contrast** in Properties.',
        'Check in the Layers panel that the order is: photo, Curves, Halftone. Drag to fix it.',
        'Watch the dots: more contrast gives you solid shadows, clean paper in the highlights, and fewer grey mid-dots.',
      ] },

      { t: 'h', text: '4. One ink on paper' },
      { t: 'p', text: 'The halftone gives black dots on white. A real print is one ink on coloured paper. Duotone maps dark to one colour and light to another, which is exactly that.' },
      { t: 'steps', items: [
        'With the Halftone layer selected, choose **Filter > Colour > Duotone**. Make sure it sits above Halftone.',
        'In **Filter settings**, set **Shadow Color** to your first ink and **Highlight Color** to your paper colour.',
      ] },
      { t: 'tip', text: 'To keep part of the photo smooth, such as a face, select the Halftone layer, choose **Layer > Layer mask > Add layer mask**, click the mask thumbnail and paint that area with Eraser. Eraser hides the filter there.' },

      { t: 'h', text: '5. Overprint type in a second ink' },
      { t: 'p', text: 'Riso inks are translucent: where two overlap, you get a third, darker colour. Multiply does the same on screen.' },
      { t: 'steps', items: [
        'Select the top layer, press **T** and type the headline. Set it large and bold, in your second ink colour.',
        'Keep the text layer above the filters. Filters only change layers below them, so the type stays crisp and solid like a flat ink.',
        'Set the text layer\'s blend mode to **Multiply** in the Layers panel. Where it crosses the first ink, the colours darken together.',
      ] },

      { t: 'h', text: '6. Knock it out of register' },
      { t: 'p', text: 'On a real press each ink is a separate pass, and they never line up perfectly. A small offset is what makes it read as printed rather than digital.' },
      { t: 'steps', items: [
        'With the headline selected, press {{Ctrl+J}} to duplicate it.',
        'Change the copy\'s colour to the first ink. Keep it on **Multiply**.',
        'Nudge it with the arrow keys, 3 to 6 px. Shift with an arrow moves 10 px, which is usually too far.',
      ] },
      { t: 'p', text: 'Keep the offset small. At 300 dpi, 6 px is half a millimetre: enough to feel, not enough to look like a mistake. For a colour fringe over the whole image instead, try **Filter > Distort > RGB Shift** at a low **Shift Amount**.' },

      { t: 'h', text: '7. Add grain over everything' },
      { t: 'steps', items: [
        'Select the top layer and choose **Filter > Enhance > Film Grain**.',
        'Set **Amount** low and adjust **Grain Size**. Moving the **Randomize** slider gives a different pattern.',
        'Lower the layer\'s **Opacity** if it is too strong. Filter settings have no opacity of their own, so use the layer\'s.',
      ] },
      { t: 'p', text: 'Because grain sits at the top, it textures the photo, the ink and the type alike. That shared texture is what makes separate layers look like they were printed on the same sheet.' },

      { t: 'h', text: '8. Check and export' },
      { t: 'steps', items: [
        'Hold the backslash key (\\) to see the design without filters and adjustments, then let go. It is a quick check that the photo underneath is doing its job.',
        'Press {{Ctrl+E}}. Choose **PNG** for screens or **PDF** for print. An A4 design is over 2000 px on its long side, so the PDF is set up at 300 dpi.',
        'Click **Download**. Filters render at full size on export, so it can take a few seconds.',
      ] },

      { t: 'h', text: 'Faster: the Halftone quick tool' },
      { t: 'p', text: 'For a single image with no type, the Halftone Generator is quicker. Drop an image in, set **Dot size** and **Contrast**, and click **Download PNG**. **Send to Layer Stack** opens the original in the Editor with a live Halftone layer on top, ready for stages 3 to 8.' },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        '**Dots are too fine to see.** Raise Dot Size. Remember a phone shows the design far smaller than print.',
        '**Everything is grey and muddy.** Add more contrast below the Halftone layer, or raise its Contrast.',
        '**The type got halftoned too.** It is below the Halftone layer. Drag it above the filters.',
        '**The Editor feels slow.** Filters recompute as you work. Hide the filter layers while you set type, then show them again.',
      ] },
      { t: 'try', label: 'Try the Halftone tool', href: '/tools/halftone' },
    ],
  },
]
