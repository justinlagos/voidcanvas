// Goals are the "What are you trying to do?" layer of Learn. Each goal is a real page (/learn/do/<id>) with a
// quick answer, an ordered route through the guides, and the honest product paragraph. Query phrases come from
// the autocomplete research in research/learn-seo (September 2026); they feed search, not the copy.

export interface GoalStep { slug: string; why: string }
export interface Goal {
  id: string
  name: string            // short label for the chip, "Make a poster"
  prompt: string          // the sentence a person would say, "I want to make a poster"
  blurb: string           // one line under the chip
  answer: string          // the quick answer on the goal page, two or three sentences, tool-agnostic first
  steps: GoalStep[]       // guides in reading order, each with the reason it is there
  queries: string[]       // searches people type for this goal, from the research
  product: { text: string; label: string; href: string }
  faq?: { q: string; a: string }[]
  primary?: boolean       // shown as a first-row chip on the hub
}

export const GOALS: Goal[] = [
  {
    id: 'make-a-poster', name: 'Make a poster', prompt: 'I want to make a poster', primary: true,
    blurb: 'From a photo or a blank page to a file the printer accepts.',
    answer: 'Start from the final size at 300 dpi with 3 mm of bleed, decide the one thing the poster says, set that in large type, and keep every other word inside a 5 mm safe area. Export a PDF at final size and tell the printer what is in it. The guides below take you from the first decision to the handover.',
    steps: [
      { slug: 'prepare-a-poster-for-print', why: 'The whole job in one page: size, resolution, bleed, colour, export and the printer checklist.' },
      { slug: 'workflow-event-poster', why: 'The same job done step by step in the Editor, from a photo to a print-ready PDF.' },
      { slug: 'layout-and-composition', why: 'Why one focal point and a grid make a poster read from across a room.' },
      { slug: 'typography-fundamentals', why: 'Hierarchy, size and spacing: the difference between a poster and a notice.' },
      { slug: 'make-a-halftone-portrait', why: 'The classic gig-poster treatment, with a live example.' },
      { slug: 'printed-design-looks-blurry', why: 'The check to run before it goes to the printer.' },
      { slug: 'export-for-print', why: 'Exactly what the Editor puts in a PDF and how the page size is decided.' },
    ],
    queries: ['how to design a good poster', 'poster design for beginners', 'how to make a poster for print', 'poster size for printing', 'poster design without photo', 'how to make a gig poster', 'a3 poster design', 'poster design ideas', 'how to make a poster online free'],
    product: { text: 'The Editor starts from print presets (A4, A5, 18 × 24 in) and custom sizes at 300 dpi, works in layers, and exports a one-page PDF. It runs in the browser and the file stays on your device.', label: 'Start a poster in the Editor', href: '/editor?preset=poster' },
    faq: [
      { q: 'What size should a poster be?', a: 'A3 (297 × 420 mm) for notice boards and shop windows, A2 or 18 × 24 in for walls. At 300 dpi an A3 poster is 3508 × 4961 px before bleed.' },
      { q: 'Can I make a poster without a photo?', a: 'Yes. Type, one strong colour and a shape or a halftone texture carry a poster on their own, and often read better from a distance than a photo does.' },
    ],
  },
  {
    id: 'prepare-for-print', name: 'Prepare something for print', prompt: 'I want to prepare something for print', primary: true,
    blurb: 'Bleed, dpi, colour and PDFs a printer will accept, with the honest limits.',
    answer: 'Work at 300 dpi at the final physical size, add the bleed your printer asks for (usually 3 mm), keep text 5 mm inside the trim, and export a PDF. Ask the printer whether they accept RGB and convert it themselves; most do. The guides below explain each of those words and show the numbers for every common size.',
    steps: [
      { slug: 'designing-for-print', why: 'The terms a printer will use and the numbers they expect.' },
      { slug: 'how-much-bleed', why: 'The bleed to add, in millimetres and pixels, and how to add it to a design built without one.' },
      { slug: 'what-is-a-print-ready-pdf', why: 'What the printer checks, and the one-line note to send with the file.' },
      { slug: 'printed-design-looks-blurry', why: 'The three reasons a print comes back soft, a one-minute check, and the fix for each.' },
      { slug: 'image-resolution-explained', why: 'Pixels, dpi and print size, properly, so the check above makes sense.' },
      { slug: 'export-for-print', why: 'How the Editor builds its PDF, which presets print at 300 dpi and how to add bleed yourself.' },
      { slug: 'workflow-print-flyer', why: 'An A5 flyer with bleed, done from start to handover.' },
      { slug: 'print-looks-different-from-screen', why: 'The four reasons a print never matches the monitor, and which you can plan for.' },
      { slug: 'colour-that-works', why: 'What happens to bright RGB colours on press and how to plan for it.' },
      { slug: 'delivering-files', why: 'Naming, versioning and the delivery list when the job is for a client.' },
    ],
    queries: ['how to prepare artwork for print', 'print ready pdf', 'how much bleed for printing', 'what dpi for printing', 'rgb or cmyk for print', 'why does my print look blurry', 'a5 flyer size in pixels', 'crop marks', 'safe area print', 'print ready file checklist', 'why does my print look different than on screen'],
    product: { text: 'Studio delivery builds a print PDF with 3 mm bleed, crop marks and a slug line for any print format on the brief. The Editor exports a one-page PDF at 300 dpi for print sizes; you add the bleed with Canvas size. Both are RGB, and the guides say so.', label: 'Open Studio', href: '/studio' },
    faq: [
      { q: 'Does Voidcanvas export CMYK?', a: 'No. Every export is RGB. Most printers convert RGB PDFs with their own press profile; ask before you send, and ask for a proof when colour matters.' },
      { q: 'How many pixels is 3 mm of bleed?', a: 'About 35 to 36 px at 300 dpi (3 mm is 0.118 in; 0.118 × 300 = 35.4). The Editor guide uses 36 px on each side.' },
    ],
  },
  {
    id: 'edit-a-photo', name: 'Edit a photo', prompt: 'I want to edit a photo', primary: true,
    blurb: 'Cut out, retouch, fix colour and tone, without uploading the photo anywhere.',
    answer: 'Do the destructive things last. Crop and straighten, remove the background if you need to, fix tone and colour with adjustment layers, retouch on a separate layer, then sharpen once at the output size. Every step below is non-destructive in the Editor, and none of it leaves your device.',
    steps: [
      { slug: 'remove-background', why: 'The most common photo job, done by a model that runs in your browser.' },
      { slug: 'adjustment-layers', why: 'Curves, levels and colour fixes you can change or switch off later.' },
      { slug: 'retouching', why: 'Heal, clone and brush on a separate layer so the original survives.' },
      { slug: 'workflow-portrait-retouch', why: 'A portrait taken through the whole process.' },
      { slug: 'crop-and-canvas', why: 'Crop, resize, rotate and flip, and what each does to the pixels.' },
      { slug: 'export-for-screen', why: 'PNG, JPG or WebP, and which to pick for what.' },
      { slug: 'photo-editor-that-does-not-upload', why: 'How to check that an online editor is not sending your photos anywhere.' },
    ],
    queries: ['how to edit photos', 'photo editing for beginners', 'free photo editor online no upload', 'remove background from image free', 'how to retouch a photo', 'photo editor without watermark', 'edit photos on laptop free', 'photo editor that doesn\'t upload your photos', 'how to make a photo look professional'],
    product: { text: 'The Editor is a layered image editor with adjustment layers, masks, heal and clone, and on-device background removal. Nothing is uploaded: the model downloads once and runs in your browser.', label: 'Open a photo in the Editor', href: '/editor' },
    faq: [
      { q: 'Is my photo uploaded when I remove the background?', a: 'No. The background model is downloaded to your browser the first time and runs there. See the privacy guide for exactly what is and is not sent.' },
    ],
  },
  {
    id: 'build-a-brand', name: 'Build a brand', prompt: 'I want to build a brand', primary: true,
    blurb: 'Logo, colour, type and the rules that keep them consistent.',
    answer: 'A brand you can keep consistent is a small set of decisions written down: one or two typefaces with a scale, a colour system with contrast checked, logo clear space and minimum size, and examples of the rules applied. Build the system before the first poster, not after the third. The guides below do it in that order.',
    steps: [
      { slug: 'building-a-brand-identity', why: 'From brief to logo, colour, type and rules: the thinking before the tools.' },
      { slug: 'keep-a-brand-consistent', why: 'Why brands drift and the system that stops it: one kit, one master, a check before export.' },
      { slug: 'brand-guidelines', why: 'Build the guideline itself, with locks for the parts the client has approved.' },
      { slug: 'colour-that-works', why: 'Palettes and ramps that hold up on screen and on paper.' },
      { slug: 'brand-colour-palette-that-passes-contrast', why: 'The WCAG numbers, ramps in OKLCH, and the builder that checks every pairing.' },
      { slug: 'typography-fundamentals', why: 'Choose and pair type, and set a scale the whole brand shares.' },
      { slug: 'brand-kit', why: 'Keep the colours, fonts and logos one click away in every design.' },
      { slug: 'brand-guideline-exports', why: 'Hand the system to clients, printers and developers in the formats they use.' },
      { slug: 'workflow-client-brand-guideline', why: 'The whole job for a client, from logo to handoff.' },
    ],
    queries: ['how to create brand guidelines', 'brand identity checklist', 'what to include in a brand kit', 'how to keep branding consistent', 'brand guidelines online free', 'how to make a brand style guide', 'brand identity for small business', 'brand colour palette', 'accessible brand colours', 'logo clear space'],
    product: { text: 'Studio has a brand guideline builder: colour ramps with contrast checks, a type scale, logo rules, and exports to PDF, HTML, CSS, Tailwind, tokens JSON and .ase. Brands save to a library and load into any Editor design as a brand kit.', label: 'Open the brand guideline builder', href: '/studio' },
  },
  {
    id: 'social-content', name: 'Create social content', prompt: 'I want to create social content', primary: true,
    blurb: 'Posts, stories and covers that read on a phone, in every size at once.',
    answer: 'Design one master at the tallest format you need, keep text away from the edges where the interface sits, and let the other sizes follow from it. The Editor can resize one design to every preset and give you a ZIP. The guides below cover the design rules, then the mechanics.',
    steps: [
      { slug: 'designing-for-social', why: 'Formats, safe zones and legibility on a phone screen.' },
      { slug: 'social-media-sizes-and-safe-zones', why: 'Every size in pixels and a live view of what each platform covers.' },
      { slug: 'resize-to-every-format', why: 'One design, every size, one download.' },
      { slug: 'workflow-social-campaign', why: 'A launch post taken into every format, step by step.' },
      { slug: 'size-presets', why: 'Every preset and its pixel size, from Instagram to LinkedIn.' },
      { slug: 'brand-kit', why: 'Keep every post on brand without re-entering colours and fonts.' },
      { slug: 'artboards', why: 'Several formats side by side in one document.' },
    ],
    queries: ['how to make social media graphics', 'instagram post size', 'how to design social media templates', 'social media design for beginners', 'resize design for instagram story', 'how to make consistent social media posts', 'story size pixels', 'linkedin banner size', 'instagram story safe zone'],
    product: { text: 'The Editor has presets for posts, stories, covers and banners, boards to hold several formats in one file, and Resize to every format, which adapts one design to every preset and downloads them as a ZIP.', label: 'Start a social post', href: '/editor?preset=ig-post' },
  },
  {
    id: 'work-with-psd', name: 'Work with PSD files', prompt: 'I want to work with a PSD file', primary: true,
    blurb: 'Open, edit and export a Photoshop file without Photoshop, and know what carries over.',
    answer: 'A PSD can be opened and edited without Photoshop, with limits. Pixel layers, groups, opacity, most blend modes and layer masks carry over well; text layers arrive as pixels or need the font, and smart objects, adjustment layers and layer styles vary by tool. Open the file, check the import report, and fix what did not survive before you start work. The guides below show exactly what the Editor keeps.',
    steps: [
      { slug: 'edit-a-psd-without-photoshop', why: 'The direct answer: what survives, what to check, and how to finish the job.' },
      { slug: 'import-psd-and-pdf', why: 'Every import format and precisely what the Editor keeps and drops.' },
      { slug: 'workflow-psd-to-social', why: 'A real PSD from a colleague, adapted for social.' },
      { slug: 'layers', why: 'Layer kinds, order, groups and labels, as the Editor does them.' },
      { slug: 'masks', why: 'Layer masks and clipping masks, which is where most PSD edits happen.' },
      { slug: 'file-formats', why: 'Every format you can open and export, and what each one keeps.' },
    ],
    queries: ['how to edit a psd file', 'can you edit a psd file without photoshop', 'open psd file online free', 'is psd file editable', 'psd editor online', 'convert psd to png', 'how to open psd without photoshop', 'psd viewer'],
    product: { text: 'The Editor opens PSD files in the browser, keeps layers, groups, masks, text, adjustments and layer styles, and shows an import report listing anything it had to render as pixels. It does not save PSD: export PNG, JPG, WebP or PDF, or keep the layers in a .void file.', label: 'Open a PSD in the Editor', href: '/editor' },
    faq: [
      { q: 'Can I save back to PSD?', a: 'No. The Editor opens PSD files but does not write them. Export PNG, JPG, WebP or PDF for delivery, or save a .void file to keep the layers editable in Voidcanvas.' },
    ],
  },
  {
    id: 'design-effects', name: 'Create design effects', prompt: 'I want to create an effect', primary: true,
    blurb: 'Halftone, dither, glitch, duotone, risograph and the rest, with live examples.',
    answer: 'Most print and retro effects come down to a handful of moves: reduce tone to dots or a pattern (halftone, dither), limit the colours (duotone, posterize), then add the imperfection of the medium (grain, misregistration, a slice or a shift). Do the effect on a copy, at the output size, and keep the original layer underneath.',
    steps: [
      { slug: 'make-a-halftone-portrait', why: 'The most searched effect, with a working halftone on the page.' },
      { slug: 'make-a-risograph-effect', why: 'What makes riso look like riso, and the five moves that fake it, with a live duotone.' },
      { slug: 'make-a-duotone-image', why: 'Two colours, one photo: how to pick the pair and apply it in one click.' },
      { slug: 'effects-overview', why: 'How Effects works: load, pick, tune, compare, export, send to the Editor.' },
      { slug: 'quick-tools', why: 'Halftone, Dither and Glitch as single-purpose tools with a download.' },
      { slug: 'dither-effect-explained', why: 'The threshold, the pattern and why it must be made at final size.' },
      { slug: 'glitch-effect-explained', why: 'Slices, offset and RGB shift, and where the effect stops helping.' },
      { slug: 'workflow-textured-print-look', why: 'A risograph or screen-print look, built in Effects and finished in the Editor.' },
      { slug: 'artistic-effects', why: 'Every artistic effect and what each slider does.' },
      { slug: 'colour-effects', why: 'Duotone, gradient map, posterize and the other colour effects.' },
      { slug: 'distortion-effects', why: 'Glitch, RGB shift, pixel sort, wave and the distortions.' },
      { slug: 'filters-in-the-editor', why: 'The same effects as editable layers inside a design.' },
    ],
    queries: ['how to make a halftone effect', 'halftone effect online', 'dither effect', 'glitch effect online free', 'how to make a duotone', 'risograph effect', 'screen print effect', 'comic book effect', 'photo to sketch', 'vintage photo effect'],
    product: { text: 'Effects has 58 one-click effects with sliders, a compare view and Send to Editor. The quick tools do halftone, dither and glitch on their own pages with a download. All of it runs on your device.', label: 'Open Effects', href: '/effects' },
  },
  {
    id: 'client-project', name: 'Run a client project', prompt: 'I want to run a client design project', primary: true,
    blurb: 'Brief, directions, review rounds and named files, without the chaos.',
    answer: 'A client job goes wrong in the gaps: an unclear brief, directions presented without a decision, feedback lost in email, and files named final_v3_FINAL. Fix the process: read the brief into formats and deadlines, present two or three directions and record the answer, run review rounds with a version each, and deliver a named package. Studio is built around exactly those four stages.',
    steps: [
      { slug: 'run-a-client-design-project', why: 'The four-stage process, what each stage must produce, and where projects go wrong.' },
      { slug: 'studio-overview', why: 'How a job moves through Studio: direction, design, review, delivered.' },
      { slug: 'design-brief-example', why: 'What a brief must contain, a real example and the five-minute template.' },
      { slug: 'start-a-job-from-a-brief', why: 'Paste the brief; get formats, deadlines and a starting design.' },
      { slug: 'references-and-palettes', why: 'Reference boards and palettes pulled from them, kept with the job.' },
      { slug: 'directions-and-review', why: 'Present directions, record the client\'s answer, run review rounds.' },
      { slug: 'get-client-feedback-you-can-act-on', why: 'Ask so the answer is usable, pin it to the place, turn it into a checklist.' },
      { slug: 'review-and-delivery-links', why: 'Send a link the client can review or download from, without an account.' },
      { slug: 'delivering-files', why: 'Every format, named and versioned, in one package.' },
      { slug: 'brands-library', why: 'Keep each client\'s brand ready for the next job.' },
    ],
    queries: ['how to manage client design projects', 'design review process', 'client feedback on design', 'design handoff to client', 'how to present design to client', 'freelance graphic design workflow', 'design brief template', 'design brief example', 'how to get client feedback on design', 'design versioning'],
    product: { text: 'Studio runs the job around the design: brief reader, reference boards, directions, review rounds with recorded answers, and a delivery package. Review and delivery links are sealed on your device, so the server never sees the work.', label: 'Start a job in Studio', href: '/studio' },
  },
  {
    id: 'many-formats', name: 'Make one design in many formats', prompt: 'I want one design in every format',
    blurb: 'Poster, post, story, banner and card from one master, without redrawing.',
    answer: 'Design the master at the most demanding size, anchor the parts that must stay put (logo to a corner, text to a safe zone), and adapt rather than scale: reflow the layout for each ratio and check every one at real size. Resize to every format does the adapting; the guides below cover how to design so it works.',
    steps: [
      { slug: 'resize-to-every-format', why: 'The mechanics: every preset, a ZIP, or each size saved as a design.' },
      { slug: 'artboards', why: 'Hold the formats side by side and edit them together.' },
      { slug: 'designing-for-social', why: 'Safe zones per platform so nothing sits under the interface.' },
      { slug: 'social-media-sizes-and-safe-zones', why: 'The sizes and the covered areas, format by format.' },
      { slug: 'workflow-social-campaign', why: 'A launch post adapted into every format.' },
      { slug: 'size-presets', why: 'The pixel sizes of every preset.' },
    ],
    queries: ['resize design to multiple sizes', 'one design multiple formats', 'resize for every social platform', 'batch resize design', 'adapt poster to instagram', 'magic resize alternative'],
    product: { text: 'Resize to every format takes one design and adapts it to every preset at once, keeping text readable and anchored elements in place. Download the set as a ZIP or keep each as its own design.', label: 'Open the Editor', href: '/editor' },
  },
  {
    id: 'learn-design', name: 'Learn graphic design', prompt: 'I want to learn graphic design', primary: true,
    blurb: 'Type, colour, layout, resolution and print, taught properly and tied to real work.',
    answer: 'Learn by finishing things. Make a poster, a flyer and a set of social posts, and study the four things that decide whether they work: hierarchy in the type, a colour system, a grid with one focal point, and the right resolution for where it will be seen. The guides below teach each one with the numbers, then hand you a workflow to apply it.',
    steps: [
      { slug: 'typography-fundamentals', why: 'Six decisions that make plain type look designed.' },
      { slug: 'layout-and-composition', why: 'Grids, space and a focal point.' },
      { slug: 'colour-that-works', why: 'Palettes, contrast and colour on screen versus print.' },
      { slug: 'image-resolution-explained', why: 'Pixels, dpi and why images look soft.' },
      { slug: 'make-your-design-look-less-generic', why: 'The moves that separate a template from a design.' },
      { slug: 'your-first-design', why: 'Make and export a first design in five minutes.' },
      { slug: 'workflow-print-flyer', why: 'Apply all of it to one finished flyer.' },
      { slug: 'glossary', why: 'Every term, in plain English.' },
    ],
    queries: ['how to learn graphic design', 'graphic design basics', 'graphic design for beginners', 'can i learn graphic design on my own', 'graphic design fundamentals', 'typography for beginners', 'colour theory for designers', 'layout design principles'],
    product: { text: 'Every craft guide ends with where each setting lives in Voidcanvas, so you can practise as you read. The Editor, Studio and Effects are free and need no account.', label: 'Open the Editor', href: '/editor' },
  },
  {
    id: 'leave-photoshop', name: 'Move away from Photoshop', prompt: 'I want to work without Photoshop', primary: true,
    blurb: 'What carries over, what is different, and where everything lives.',
    answer: 'Layers, masks, selections, adjustment layers, blend modes, PSD import and most shortcuts carry over. What is different: no CMYK, no smart objects, image-based PDFs, and the app runs in a browser tab with your files on your device rather than in a cloud library. The guides below map each Photoshop habit to its equivalent.',
    steps: [
      { slug: 'coming-from-photoshop', why: 'The migration guide: what carries over, what is different, and the three shortcuts that change.' },
      { slug: 'edit-a-psd-without-photoshop', why: 'Start with your own files: what survives the move.' },
      { slug: 'editor-tour', why: 'Where the tools, panels and menus are.' },
      { slug: 'keyboard-shortcuts', why: 'Most shortcuts are the ones you know.' },
      { slug: 'masks', why: 'Layer, vector, clipping and quick masks.' },
      { slug: 'adjustment-layers', why: 'Curves, levels, hue and saturation as layers.' },
      { slug: 'command-palette-and-menus', why: 'Find any action by name with Ctrl+K.' },
      { slug: 'file-formats', why: 'What you can open and export.' },
    ],
    queries: ['photoshop alternative free', 'free photoshop alternative browser', 'photoshop alternative no subscription', 'photoshop alternative no download', 'online photoshop alternative', 'switch from photoshop', 'photoshop without subscription', 'best photoshop alternative for youtube thumbnails'],
    product: { text: 'The Editor is a layered image editor in the browser: masks, adjustment layers, selections, retouching, PSD import, print and screen export. Free, no account, and your files stay on your device. It also installs as an app and works offline.', label: 'Open the Editor', href: '/editor' },
  },
  {
    id: 'private-and-offline', name: 'Work privately or offline', prompt: 'I want to design without uploading anything',
    blurb: 'What is sent, what is not, and how to work with no connection at all.',
    answer: 'A browser tool can be private if it does the work on your device and says exactly what it sends. Voidcanvas keeps designs in the browser\'s own storage, runs its AI models locally, and sends only anonymous usage counts you can turn off. Install it as an app or use the desktop build and it works with no connection.',
    steps: [
      { slug: 'photo-editor-that-does-not-upload', why: 'What "private" means for a web editor and a two-minute test you can run on any tool.' },
      { slug: 'privacy-and-data', why: 'Exactly what Voidcanvas sends and what never leaves your device.' },
      { slug: 'install-as-an-app', why: 'Install to the home screen or dock and use it offline.' },
      { slug: 'desktop-app', why: 'The desktop app for Windows, macOS and Linux.' },
      { slug: 'saving-and-your-files', why: 'Where designs live and how to back them up.' },
      { slug: 'private-session', why: 'A private session on a shared computer.' },
      { slug: 'ai-on-this-device', why: 'The AI tools, and why they run locally.' },
    ],
    queries: ['photo editor that doesn\'t upload', 'offline graphic design software', 'private photo editor', 'design app that works offline', 'graphic design software no account', 'photo editor no sign up', 'does canva upload my photos'],
    product: { text: 'Nothing you design is uploaded. Designs live in your browser\'s database, the background and AI models run on your device, and a private session leaves nothing behind. The privacy guide lists every request the app makes.', label: 'Read what is sent', href: '/learn/privacy-and-data' },
  },
  {
    id: 'work-faster', name: 'Work faster', prompt: 'I want to work faster',
    blurb: 'Shortcuts, the command palette, templates, versions and workspaces.',
    answer: 'Speed comes from not leaving the keyboard, not repeating setup, and being able to go back. Learn the twenty shortcuts you use daily, find everything else with Ctrl+K, save templates for the formats you make weekly, and let versions take the fear out of trying things.',
    steps: [
      { slug: 'keyboard-shortcuts', why: 'Every shortcut, in one table.' },
      { slug: 'command-palette-and-menus', why: 'Ctrl+K finds any action by name.' },
      { slug: 'templates-and-versions', why: 'Save the setup once; restore any version.' },
      { slug: 'workspaces-and-panels', why: 'Panels where you want them, saved as workspaces.' },
      { slug: 'brand-kit', why: 'Colours, fonts and logos without hunting.' },
      { slug: 'resize-to-every-format', why: 'Every size from one design.' },
    ],
    queries: ['graphic design shortcuts', 'design faster', 'design workflow tips', 'how designers organise files', 'design templates for freelancers'],
    product: { text: 'The Editor has a command palette, a shortcut sheet, templates, versions and saved workspaces. Studio removes the setup around a client job entirely.', label: 'Open the Editor', href: '/editor' },
  },
]

export const getGoal = (id: string) => GOALS.find(g => g.id === id)
export const PRIMARY_GOALS = GOALS.filter(g => g.primary)
