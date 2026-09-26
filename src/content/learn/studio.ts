import type { Article } from '../types'

// Studio articles. Every label, number and behaviour here was checked against src/studio/**
// and the Editor code it hands work to (Brief panel, brand checks, Role in formats).

export const articles: Article[] = [
  // ─── Overview ────────────────────────────────────────────────────
  {
    slug: 'studio-overview',
    title: 'Run a client job in Studio from brief to delivery',
    summary: "Studio keeps each client job in one place: the brief, references, directions, the key visual and its formats, review rounds and the final files. Here is how a job moves through it.",
    category: 'studio',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['start-a-job-from-a-brief', 'directions-and-review', 'delivering-files', 'brands-library'],
    keywords: 'studio jobs projects client work job tracker workflow pipeline brief to delivery art director status direction design review delivered',
    body: [
      { t: 'p', text: "Studio is where a client job lives. The Editor is where you make the design; Studio holds everything around it: what the client asked for, what you are looking at, which idea they picked, what they said about each version and which files you handed over. Read this first if you do client work, so you know which tab does what before you start." },

      { t: 'h', text: 'What is on the Studio home screen' },
      { t: 'p', text: "Open Studio and you see your jobs, most recently changed first. Each row shows the client, the job name, its status, the one thing to do next and the earliest due date (or the last change, if nothing has a due date). The first reference you added becomes the row's picture." },
      { t: 'list', items: [
        "**Start a job** makes a new, empty job and opens it on the Brief tab.",
        "**Find a job or client** and the status filters (All, Direction, Design, Review, Delivered) appear once you have more than five jobs. Until then there is nothing to search.",
        "**Client brands** opens your saved brands. See [Save client brands and reuse them](/learn/brands-library).",
        "**Brand guideline builder** opens the guideline tool. See [Build a brand guideline](/learn/brand-guidelines).",
      ] },
      { t: 'try', label: 'Open Studio', href: '/studio' },

      { t: 'h', text: 'The six steps of a job' },
      { t: 'p', text: "Inside a job, the tabs run in the order the work does. A tick on a tab means that step has something in it; the current tab is white. You can jump to any tab at any time, nothing is locked." },
      { t: 'table', head: ['Tab', 'What you do there', 'Ticked when'], rows: [
        ['Brief', "Paste the client's words, check what Studio read from them, list the formats you owe, pick the client's brand", 'There is a brief'],
        ['References', 'Drop in images, read their colour, light, composition and lettering, take a look to reuse', 'There is at least one reference'],
        ['Directions', 'Sort references, notes, swatches and type into two or three ideas, present them, record which one the client chose', 'One direction exists, or one of several is chosen'],
        ['Key visual', 'Design one hero in the Editor, then build every format from it', 'The key visual exists and every format is marked done'],
        ['Review', "Save versions, pin the client's comments, turn their reply into a checklist, compare, make mockups", 'A version is set to Approved'],
        ['Deliver', 'Render every format at full size, named and zipped, with print PDFs set up for the printer', 'The package has been built'],
      ] },

      { t: 'h', text: 'Status: direction, design, review, delivered' },
      { t: 'p', text: "A job's status moves forward by itself as you work, so you never have to set it by hand:" },
      { t: 'list', items: [
        "**Direction**: every new job starts here.",
        "**Design**: when you mark a direction with **Client chose this one**, or when you start the key visual.",
        "**Review**: when you save the first version on the Review tab.",
        "**Delivered**: when you press **Build the package** on the Deliver tab.",
      ] },
      { t: 'p', text: "Setting a version to **Approved** on the Review tab also sets the job to Review, even after delivery, so an approval never goes unnoticed. Saving a new version after delivery leaves the status as it is; use the version status (Draft, Sent, Changes asked, Approved) to track that round." },

      { t: 'h', text: 'The Next button' },
      { t: 'p', text: "At the bottom of a job there is a **Next** bar that names the single most useful thing to do, such as **Paste the brief**, **Add references**, **Set a direction**, **Pick a direction**, **Start the key visual**, **Add the formats**, **Send for review**, a count like **2 formats to build**, or **Ready to deliver**. Press it to jump to the right tab. The same label shows on the job's row on the home screen, so the list doubles as a to-do list. The bar hides when you are already on that tab, and once the job is delivered." },

      { t: 'h', text: 'How Studio and the Editor pass work' },
      { t: 'p', text: "Studio never edits pixels itself. When you start the key visual, open a direction as a board, or apply a reference's look to a photo, Studio opens the Editor with the work already in it. The key visual design remembers its job: the Editor's **Brief** panel shows the brief as a checklist, checks the design against the job's brand, and has a **Back to the job in Studio** button that saves and returns you to the job." },
      { t: 'p', text: "Studio reads the Editor design straight from this device to draw thumbnails, review images and delivery files, so what you deliver is exactly what you designed. If you come back to Studio in the same tab after working in the Editor, it picks up the latest save when the tab becomes visible. For more on the handoff, see [Move work between tools](/learn/moving-work-between-tools)." },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "Jobs are saved in this browser as you type, a moment after you stop. Nothing is uploaded and there is no account. See [Where your designs are saved](/learn/saving-and-your-files).",
        "The client and job name at the top of a job are editable fields. Until you rename it, the job takes its name from the headline Studio reads in the brief.",
        "Deleting a job removes its references, directions and versions. The Editor designs it made stay in the Editor.",
        "A link from the Editor back to a job only works on the device and browser where the job was made. Anywhere else Studio says **That job is not on this device.**",
      ] },
    ],
  },

  // ─── Brief ──────────────────────────────────────────────────────
  {
    slug: 'start-a-job-from-a-brief',
    title: "Start a job from the client's brief",
    summary: "Paste the brief as the client sent it. Studio reads the headline, date, venue, price, call to action, contact and must-haves, suggests the formats it mentions, and carries all of it into the key visual and every format built from it.",
    category: 'studio',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['studio-overview', 'references-and-palettes', 'directions-and-review', 'resize-to-every-format'],
    keywords: 'brief reader paste brief client brief checklist must include deliverables formats sizes key visual master format build formats linked formats role in formats update formats',
    body: [
      { t: 'p', text: "The brief is the first thing a job needs. Paste it once and Studio turns it into a checklist the Editor keeps for you, a list of formats you owe, and a starting point for the key visual. This saves you re-reading an email to check the date is on the poster, and it stops the last-minute \"you forgot the sponsor logos\"." },

      { t: 'h', text: 'Paste the brief' },
      { t: 'steps', items: [
        "In Studio, press **Start a job**. The job opens on the **Brief** tab with the cursor in **The brief**.",
        "Paste the client's words as they sent them: an email, a WhatsApp message, a list. Do not tidy it first; the reader expects real messages.",
        "Check what Studio read, under **Read from the brief. Goes to the Editor as a checklist.**",
        "Fill in **Client** at the top of the job. The job name fills itself from the headline until you type your own.",
      ] },

      { t: 'h', text: 'What the reader picks out' },
      { t: 'p', text: "Everything happens on your device, instantly, and the same text always gives the same result. The reader looks for these items:" },
      { t: 'table', head: ['Item', 'How it is found'], rows: [
        ['Headline', "A line labelled Headline, Title, Name or Event; else a quoted phrase; else the job name, once you have typed your own; else the subject of a line like \"a flyer for our harvest thanksgiving\"; else the first short sentence that is not an instruction"],
        ['Subheading', 'A line labelled Subhead, Tagline, Strapline or Theme, or a short sentence that is not the headline and not an instruction'],
        ['Date', 'A labelled line, or a date written like 12 Oct, Sat 12 October 2026, October 12th or 12/10/26'],
        ['Time', 'A labelled line, or a time like 8pm, 7:30 or 6pm to 11pm'],
        ['Venue', 'A labelled line (Venue, Where, Location, Address, At), or a place after the word at, such as at The Hub'],
        ['Price', 'A labelled line, or an amount in ₦, N, NGN, £, $, €, GHS or KES, or the word free'],
        ['Call to action', 'A labelled line, or a common action such as get tickets, book now, register, RSVP, shop now, call, DM or WhatsApp'],
        ['Contact', 'A labelled line, or up to two of: a web address, a social handle, a phone number, an email'],
        ['Must include', "Lines such as \"Must include: sponsor logos, hashtag and dress code\", split into separate items, plus lines that mention logos, sponsors, partners, hashtags, disclaimers, terms, speakers or a lineup. Up to five."],
      ] },
      { t: 'p', text: "Above the checklist Studio also shows who the job is for (only when the brief names people, like \"for young professionals\") and the tone words it found, such as bold, warm, premium or playful." },
      { t: 'tip', text: "Labels always win. If the reader guesses wrong, add a labelled line to the brief, for example **Headline: Lekki Nights** or **Date: Sat 12 Oct**, and it takes that instead. The brief box is yours to edit." },
      { t: 'p', text: "Things said to you rather than things to print are left out on purpose: deadlines, budgets, \"please send drafts\", \"see attached\", thanks and sign-offs. A line that lists the formats wanted (\"Need an IG post, a story and an A3 poster\") is treated as the deliverables, not as copy." },

      { t: 'h', text: 'List the formats you owe' },
      { t: 'p', text: "Below the brief, the **Formats** panel is the job's list of deliverables. Every later step works from it: the key visual builds these sizes, and the delivery package renders them." },
      { t: 'list', items: [
        "**The brief mentions:** shows a button for each format the brief names. Instagram gives Instagram post, story or reel gives Story / Reel / Status, poster gives A3 poster, flyer gives A4 flyer, roll-up gives Roll-up banner 85 × 200 cm, billboard gives Billboard 48-sheet, and so on. **Add all** adds every suggestion.",
        "When the brief names none, **Usual ones:** offers Instagram post, Story / Reel / Status and A4 flyer.",
        "**All sizes and custom** shows every size, grouped as Social, Screen, Print and Outdoor, plus **Custom size** with a name, width and height in pixels (at least 16 px each way).",
      ] },
      { t: 'p', text: "Each format in the list has a tick to mark it done, an editable name, its size (print sizes show in mm), a due date and a bin to remove it. Print sizes carry their size in mm so delivery can add bleed and crop marks later. The earliest due date shows on the Studio home screen." },
      { t: 'note', text: "On a narrow screen the size and due date columns are hidden to make room. Turn the phone sideways or use a wider window to set due dates." },

      { t: 'h', text: 'Pick the client brand' },
      { t: 'p', text: "If you have saved brands, **Which brand is this for?** appears under the brief. Choose one and the Editor checks the key visual against it: colours, fonts, logo size and clear space. **Manage brands…** opens your brands. See [Save client brands and reuse them](/learn/brands-library)." },

      { t: 'h', text: 'Start the key visual' },
      { t: 'p', text: "The **Key visual** tab is where the design itself begins. You design one hero in the Editor, then Studio builds every other format from it." },
      { t: 'steps', items: [
        "Open the **Key visual** tab.",
        "Under **Master format**, pick which of your formats the hero is. Studio picks the first social format for you. With no formats listed, it uses Instagram post at 1080 × 1350.",
        "Press **Start key visual in the Editor**.",
      ] },
      { t: 'p', text: "The Editor opens a new design at that size, seeded from the job:" },
      { t: 'list', items: [
        "**Colours**: the chosen direction's palette goes into your swatches. With no direction chosen, the brand's colours are used instead; with neither, you start plain.",
        "**Type**: the direction's headline and text fonts, or the brand's.",
        "**Brief**: the checklist appears in the Editor's **Brief** panel. It ticks each item off as soon as matching text is on the design, and **Add** places a missing item as a new text layer. It also shows the contrast of the selected text against its background. When the job has a palette, the panel offers Background, Text, Accent and Muted colours, picked so text reads on the background.",
      ] },
      { t: 'tip', text: "Choose a direction before you start the key visual, so it opens in the right palette and type. The Key visual tab tells you when none is chosen and links to the Directions tab." },

      { t: 'h', text: 'Build every format from the key visual' },
      { t: 'p', text: "Once the key visual exists, the Key visual tab shows the master and a card for every format. Studio does not shrink the master to fit each size. It places each element by what it is (headline, logo, image, button) so a wide banner and a tall story each get a sensible layout. The formats stay linked to the master." },
      { t: 'table', head: ['Button', 'What it does'], rows: [
        ['Open in the Editor', 'Opens the design with all its boards'],
        ['Build N missing formats', 'Lays out every format that does not have a board yet, as new boards beside the master'],
        ['Build (on one card)', 'Builds just that format'],
        ['Update formats from the master', 'Pushes text, colour and picture changes from the master into every linked format. Layouts you adjusted by hand are kept'],
        ['Re-lay (on one card)', "Throws away that format's own changes and lays it out from the master again"],
        ['Refresh', 'Redraws the thumbnails from the latest save'],
      ] },
      { t: 'p', text: "If Studio puts something in the wrong place, give the layer a role on the master in the Editor: **Properties**, **Role in formats**. The roles are Background, Image, Headline, Subheading, Body text, Details, Call to action, Logo and Decoration, or Automatic. Roles decide where each element goes in the other sizes. For resizing outside Studio, see [Resize one design to every format](/learn/resize-to-every-format)." },
      { t: 'p', text: "Tick each format card when you are happy with it. When every format is ticked, the Key visual tab gets its tick." },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**The headline is a sentence from the email.** Add a line starting **Headline:** to the brief.",
        "**A must-have is missing.** Put it on its own line starting **Must include:**, with items separated by commas or \"and\".",
        "**The key visual is not saved on this device yet.** Studio could not find the Editor design. Press **Open it** to open and save it, or **Start again** if it was deleted.",
        "**A format card says Not built yet.** Press **Build** on the card, or **Build N missing formats**.",
      ] },
    ],
  },

  // ─── References ─────────────────────────────────────────────────
  {
    slug: 'references-and-palettes',
    title: 'Collect references and pull palettes from them',
    summary: "Add the images the client sent and the ones you have in mind. Studio reads each for colour, light, composition, texture and lettering, gives you its palette with proportions, and lets you save its colour grade to reuse on your own photos.",
    category: 'studio',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['directions-and-review', 'start-a-job-from-a-brief', 'colour-that-works', 'typography-fundamentals'],
    keywords: 'references moodboard mood board inspiration palette from image colour picker extract colours hex colour grade take the look colour match font identifier what font is this lettering composition rule of thirds',
    body: [
      { t: 'p', text: "References are how you and the client agree on a look before anyone designs anything. The **References** tab keeps them with the job and tells you, in words and numbers, why each one works: its colours and how much of the image each covers, where the light comes from, where the eye lands, and what kind of lettering it uses." },

      { t: 'h', text: 'Add references' },
      { t: 'list', items: [
        "Press **Add references** (or **Choose images** on an empty job) and pick one or more images.",
        "Drag images from your desktop anywhere onto the tab.",
        "Paste an image with {{Ctrl+V}} (Cmd+V on a Mac), for example a screenshot. Pasting while typing in a text box pastes text as normal.",
      ] },
      { t: 'p', text: "Images wider or taller than 2400 px are scaled down to 2400 px on their longest side when added, which keeps the job small. Studio reads each one as it arrives; you will see **Reading N references…** for a moment. Hover a card and press the bin to remove it; it also leaves the Directions board." },
      { t: 'p', text: "Each card shows a strip of the image's colours, sized by how much of the picture they cover, and a short reading such as **Low-key, warm, vivid**." },

      { t: 'h', text: 'Read a reference' },
      { t: 'p', text: "Click a reference to open it full size with its reading beside it. Buttons along the bottom of the image draw guides over it; turn on as many as you like." },
      { t: 'table', head: ['Overlay', 'What it shows'], rows: [
        ['Thirds', 'The rule-of-thirds grid'],
        ['Golden ratio', 'Lines at 38.2% and 61.8% each way'],
        ['Focal point', 'A ring where the eye is most likely to land first'],
        ['Where the eye goes', 'A heat map of the areas that stand out, by colour contrast with their surroundings and by edges'],
        ['Negative space', 'Quiet areas with little detail, where type could sit'],
        ['Lettering', 'A box around the line of text Studio read'],
      ] },
      { t: 'p', text: "The side panel reads the image the way an art director would describe it:" },
      { t: 'list', items: [
        "**The recipe**: six lines that sum it up, for example \"Low-key exposure, hard contrast\" or \"Subject on a thirds point, 40% negative space\". Useful to paste into a note or a direction's idea.",
        "**Colour, by how much of the image it covers**: up to six colours with their share in percent and a role: dominant, accent, shadow, highlight or supporting. Click any colour or hex value to copy it.",
        "**Light**: a brightness histogram, the key (low-key dark and moody, mid-key, or high-key bright and airy), contrast (soft, medium or hard), temperature (from cool to warm, with any green or magenta tint), saturation (muted, natural or vivid) and the direction the light comes from.",
        "**Composition**: where the subject sits (centred, on a thirds point, high, low or off the grid), how much negative space there is, whether lines run horizontal, vertical, diagonal or balanced, and how symmetrical it is.",
        "**Texture**: detail (crisp, moderate or soft) and grain (clean, light or visible).",
        "**Your note**: write what you like about it. It stays with the reference.",
      ] },
      { t: 'note', text: "The palette comes from grouping similar colours across the image and merging near-duplicates, so a large flat background shows as one dominant colour rather than many shades of it. The share is area, not importance: a small accent can matter more than it measures." },

      { t: 'h', text: 'Identify the type style' },
      { t: 'p', text: "The first time you open a reference, Studio looks for its biggest line of lettering and describes it: weight, width, capitals or italic, thick-thin contrast and serif style. It then lists close Google fonts, each shown in a sample." },
      { t: 'list', items: [
        "If it read the wrong line, or found nothing, press **Point at the lettering** and drag a box around one line of the biggest text.",
        "Copy a font name with the copy button, or press **+** to add a type card for it to the Directions board.",
      ] },
      { t: 'warn', text: "This tells you the kind of face, not the exact font. When the lettering is small, Studio says to treat the suggestions as a rough guide." },

      { t: 'h', text: 'Take the look and apply it to a photo' },
      { t: 'p', text: "A reference's colour grade can travel to your own images. Studio records the reference's overall colour and tonal spread, plus its grain." },
      { t: 'list', items: [
        "**Take the look** saves it on this device. In the Editor, add it to any photo from the Layers panel: **New adjustment layer**, **Colour match from a saved look…**.",
        "**Apply the look to a photo** asks for a photo, saves the look, and opens the photo in the Editor with the look applied as a Colour match layer, with grain added when the reference has it.",
      ] },
      { t: 'p', text: "Because the look is an adjustment layer, you can lower its opacity or mask it like any other. See [Adjustment layers](/learn/adjustment-layers)." },

      { t: 'h', text: 'From references to a palette' },
      { t: 'p', text: "References feed the job's colours in two ways. When you group references into a direction on the **Directions** tab (press **Group into directions**), the direction's palette is read from the swatches and references inside it: swatches first, then the strongest colours of the references, skipping colours too close to one already picked, up to six. An empty direction borrows the colours of all the job's references, so it never opens colourless." },
      { t: 'p', text: "To fix the palette yourself, click any colour in the direction's side panel and choose another, or press **+** to add one. From then on the palette stays as you set it, whatever you move on the board. **Read from board** goes back to reading it from the references. See [Present directions and run review rounds](/learn/directions-and-review)." },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "All reading happens on your device, on a small copy of the image, in a fraction of a second. Nothing is uploaded.",
        "References from older Studio boards are read the first time you open the job's References tab.",
        "If an image cannot be read, Studio says **Could not read** and the file name, and carries on with the rest.",
      ] },
    ],
  },

  // ─── Directions and review ───────────────────────────────────────
  {
    slug: 'directions-and-review',
    title: 'Present directions and run review rounds',
    summary: "Group references into two or three directions the client can choose from, present them as slides, a PDF or WhatsApp images, record their choice, then save each version you show them, pin their comments and turn their reply into a checklist.",
    category: 'studio',
    level: 'Intermediate',
    updated: '2026-09-26',
    related: ['references-and-palettes', 'start-a-job-from-a-brief', 'delivering-files', 'review-and-delivery-links'],
    keywords: 'directions concepts routes moodboard present pitch client feedback revisions amends comments pins versions compare before after mockup poster mockup review pack approval whatsapp',
    body: [
      { t: 'p', text: "Clients choose better between two or three clear ideas than from one design. The **Directions** tab turns references into ideas the client can pick from, and the **Review** tab keeps a record of every version you showed them and everything they said about it. Use both and you always know what was agreed." },

      { t: 'h', text: 'The directions board' },
      { t: 'p', text: "The Directions tab is an open board. The first time you open it with references in the job, Studio lays your references out along the bottom and makes three empty frames, **Direction A**, **Direction B** and **Direction C**, to sort them into. Anything whose centre sits inside a frame belongs to that direction." },
      { t: 'table', head: ['Toolbar', 'What it adds or does'], rows: [
        ['Direction', 'A new, empty direction frame to the right of the others'],
        ['Note', 'A yellow sticky note. Double-click it to edit'],
        ['Swatch', 'A colour card, from the colour picker'],
        ['Type card…', 'A sample of a font, in bold'],
        ['Fit everything (the expand icon)', 'Zooms to show the whole board'],
        ['Present', 'Shows each direction full screen'],
        ['PDF', 'One landscape page per direction'],
        ['WhatsApp images', 'One portrait image per direction, zipped'],
      ] },
      { t: 'keys', rows: [
        ['Drag on empty board', 'Pan'],
        ['Ctrl + scroll', 'Zoom (Cmd + scroll on a Mac, or pinch on a trackpad)'],
        ['Shift-click', 'Pick several items'],
        ['Delete', 'Remove the selected items'],
      ] },
      { t: 'p', text: "Drag a direction by its name to move it with everything inside. Drag the round handle on its corner to resize it. Selected items get a handle too; references keep their shape when resized. On wider screens the references also sit in a tray on the left, ready to drag onto the board." },

      { t: 'h', text: 'Shape each direction' },
      { t: 'p', text: "Select a direction (click its name, or its letter in the side panel) and fill in the side panel:" },
      { t: 'list', items: [
        "**Name**, then **The idea, in a line**, such as \"Night heat: warm neon on deep indigo, big condensed type, grain.\"",
        "**Keywords**, separated by commas.",
        "**Palette**: read from the board unless you set it. Click a colour to change it, or **+** to add one. See [Collect references and pull palettes from them](/learn/references-and-palettes).",
        "**Type**: a headline font and a text font. Unless you choose, the first type card inside the direction is the headline font and the second is the text font. With no type cards, it uses Montserrat for headlines.",
      ] },
      { t: 'warn', text: "The side panel only shows on a large screen. On a phone or a narrow window you can arrange the board, but naming a direction, setting its palette and recording the client's choice need a wider window." },

      { t: 'h', text: 'Present directions to the client' },
      { t: 'p', text: "Each direction becomes a page: the job and \"Direction A of 3\", the name, the idea, keywords, the palette with hex values, the brief's headline set in the direction's headline font, the font names, your notes (landscape pages only), and a collage of up to six of its references." },
      { t: 'list', items: [
        "**Present** shows the pages full screen. Use the arrow keys or Space to move, Escape or a click to close.",
        "**PDF** downloads the pages at 1920 × 1080, one per direction, named after the client and job.",
        "**WhatsApp images** downloads a zip of 1080 × 1350 JPGs, a shape that fills a phone screen in a chat.",
        "**Open as a board** opens the selected direction's page in the Editor as editable layers, if you want to polish it before sending.",
      ] },

      { t: 'h', text: "Record the client's choice" },
      { t: 'p', text: "When the client picks, select that direction and press **Client chose this one**. It gets a **Chosen** badge on the board, the job moves to Design, and its palette and type go into the key visual when you start it." },

      { t: 'h', text: 'Save a version for review' },
      { t: 'p', text: "Save a version every time you show the client something. That gives you a numbered history (v1, v2, v3) to compare and point back to." },
      { t: 'list', items: [
        "**New version from the design** renders every format in the key visual design as an image, up to 1800 px on the long side, and saves them as the next version.",
        "**New version from images** saves images you choose instead, for work done elsewhere.",
      ] },
      { t: 'p', text: "Each version has a status you set from the menu at the top: **Draft**, **Sent**, **Changes asked** or **Approved**. Setting any version to Approved ticks the Review tab. The list on the left shows each version's date, number of images and how many pins and to-dos are still open." },

      { t: 'h', text: 'Pin comments and turn a reply into a checklist' },
      { t: 'p', text: "In **Feedback** mode, click the image where the client pointed to drop a numbered pin, and type what they said. Press **Done** on a pin when it is fixed; it turns green and can be reopened." },
      { t: 'steps', items: [
        "Paste the client's WhatsApp message or email into **Client's reply**.",
        "Press **Turn into a checklist**. Studio splits it into one to-do per line, bullet or sentence, and sets the version to Changes asked (unless it is already Approved).",
        "Tick each to-do as you make the change.",
        "Write **What changed in** the next version, so the client sees it on the review pack.",
      ] },

      { t: 'h', text: 'Compare versions' },
      { t: 'p', text: "**Compare** puts the current version against any earlier one, matching formats by name. **Slider** stacks them with a divider you drag across; **Side by side** shows both. You need at least two versions." },

      { t: 'h', text: 'Mockups' },
      { t: 'p', text: "**Mockups** puts the current image into a real photo, so the client sees a poster on a wall rather than a flat file. Studio starts on the scene closest in shape to your design." },
      { t: 'list', items: [
        "Scenes: Poster on a street wall, 48-sheet billboard, Bus shelter lightbox, Shop window poster, Roll-up banner, A4 flyer on a desk, Magazine spread, Business cards, Phone in hand, Laptop, Tote bag and T-shirt.",
        "**Auto**, **Fill** and **Fit** set placement. Fill crops the design to the surface; Fit shows all of it with the surface around it. Auto fills when the shapes nearly match and fits when they do not.",
        "**Your own photo**: shoot a blank wall, frame, screen, sign or sheet. Studio finds the brightest plain surface; drag the corners if it picked the wrong one (or select a corner and nudge it with the arrow keys, Shift for bigger steps). Set **Paper or print**, **Screen or lightbox** or **Fabric**, and tick **Keep hands and objects in front** when something overlaps the surface.",
        "**Download mockup** saves it as a JPG.",
      ] },
      { t: 'p', text: "The photo's own light, shadows, folds and paper colour are laid over your design, which is why the result looks printed rather than pasted." },

      { t: 'h', text: 'Send the round' },
      { t: 'list', items: [
        "**Send a review link**: a link your client opens in any browser, with no account and nothing to install. They pin comments on the images, reply, and approve or ask for changes; it all appears on this version. See [Review and delivery links](/learn/review-and-delivery-links).",
        "**Review pack PDF**: a cover with the client, job, version, date and what changed, then one page per format with its pins numbered and the comments listed beside it.",
        "**WhatsApp images**: each image at 1080 px wide with a footer band naming the client, job, format, version, date and \"for review\". One image downloads on its own; several come as a zip.",
      ] },
      { t: 'tip', text: "The footer stamp on WhatsApp images means a screenshot forwarded around the client's team still says which version it is." },
    ],
  },

  // ─── Review and delivery links ─────────────────────────────────
  {
    slug: 'review-and-delivery-links',
    title: 'Send review and delivery links to clients',
    summary: 'Send a client a link to a version. They pin comments, reply, and approve or ask for changes in their browser, with no account. Delivery links hand over the final files the same way. Everything is encrypted before it leaves your device.',
    category: 'studio',
    level: 'Intermediate',
    updated: '2026-09-26',
    related: ['directions-and-review', 'delivering-files', 'teams', 'account-and-sync'],
    keywords: 'share link client review approve approval comments pins feedback delivery handover download send whatsapp email browser no account encrypted expire stop',
    body: [
      { t: 'p', text: "A review link shows your client one version of a job in their browser. They can pin comments where they want changes, reply to yours, and approve the version or ask for changes. What they do appears on the version in Studio within about 20 seconds. They need no account and install nothing." },
      { t: 'p', text: "You need an [account](/learn/account-and-sync) on the device you send from. The images, notes and every comment are encrypted on the devices that make them, with a key that sits in the link itself. Voidcanvas stores only what it cannot read." },

      { t: 'h', text: 'Send a review link' },
      { t: 'steps', items: [
        "Open the job's **Review** tab and choose a version (or save a new one).",
        "Write **What changed in** the version. The client sees it at the top of the page.",
        "Choose **Send a review link**, then **Make a link**.",
        "Choose **Copy** and send the link any way you like: WhatsApp, email, a message.",
      ] },
      { t: 'p', text: "A version in **Draft** moves to **Sent**. Each version has its own link, so the client always knows which one they are looking at." },

      { t: 'h', text: 'What the client does' },
      { t: 'list', items: [
        "Types their name, so you know who said what.",
        "Taps the image where something should change and writes a comment. It gets a number, like the pins you add yourself.",
        "Replies to comments, and marks them resolved.",
        "Chooses **Approve**, or **Ask for changes** with a note.",
      ] },

      { t: 'h', text: 'What you see' },
      { t: 'list', items: [
        "Their pins appear on the image with their name. Open one to reply; the client sees your reply marked **Designer**. **Done** marks it resolved for them too. **Hide** removes it from your view only.",
        "Approval sets the version to **Approved**. A request for changes sets it to **Changes asked** and adds their note to the to-do list.",
        "Comments arrive while the Review tab is open, and when you come back to it.",
      ] },

      { t: 'h', text: 'Delivery links' },
      { t: 'p', text: "On the **Deliver** tab, **Send as a link** builds the package and gives you a link instead of a zip. The client sees each file with its size, and can download one at a time or everything as a zip. The delivery is listed under **Delivered before** with its link." },
      { t: 'table', head: ['Limit', 'Amount'], rows: [
        ['One file', '50 MB'],
        ['One link', '500 MB'],
        ['How long a link works', '30 days'],
      ] },

      { t: 'h', text: 'Stopping a link' },
      { t: 'p', text: "Open the link box and choose **Stop this link**. The files and comments are deleted from the server and the link stops working at once. Comments already on your version stay. After 30 days a link stops working by itself, and its files are deleted the next time you open Studio." },
      { t: 'tip', text: "Anyone who has the link can open it, so send it only to the people who should see the work. Stop it and send a new one if it goes further than you meant." },
    ],
  },

  // ─── Delivery ──────────────────────────────────────────────────
  {
    slug: 'delivering-files',
    title: 'Deliver every format, named and ready for the printer',
    summary: "The Deliver tab renders every format at full size in the file types you tick, names each file by client, job, format and version, adds print PDFs with bleed and crop marks, and zips it all with a delivery note.",
    category: 'studio',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['export-for-print', 'directions-and-review', 'start-a-job-from-a-brief', 'designing-for-print'],
    keywords: 'deliver final files handover export zip package file naming version numbers print pdf bleed crop marks delivery note brand sheet artwork hand off',
    body: [
      { t: 'p', text: "Delivery is where small mistakes cost the most: a file called final_final2.png, a poster without bleed, a missing size. The **Deliver** tab builds the whole handover in one go, from the same design you reviewed, so every file is there, full size and properly named." },

      { t: 'h', text: 'Before you deliver' },
      { t: 'p', text: "Delivery works from the key visual design and its format boards. A format with no board is greyed out with **Not built yet**; build it on the **Key visual** tab first (see [Start a job from the client's brief](/learn/start-a-job-from-a-brief)). The top of the panel shows how many formats are ready, for example **3 of 4 formats ready**." },

      { t: 'h', text: 'Choose file types for each format' },
      { t: 'p', text: "Each ready format has four boxes: **PNG**, **JPG**, **WebP** and **Print PDF**. Studio ticks sensible ones for you:" },
      { t: 'table', head: ['Format group', 'Ticked by default', 'Why'], rows: [
        ['Social, Screen, Custom', 'PNG and JPG', 'PNG for sharp text and flat colour; JPG as the small file most platforms and chat apps prefer'],
        ['Print and Outdoor', 'Print PDF and JPG', 'The PDF for the printer; the JPG for proofing on a phone or posting online'],
      ] },
      { t: 'p', text: "WebP is smaller than PNG or JPG at the same look and suits websites. Tick it for a website hero or email header when the client's developer asks for it." },

      { t: 'h', text: 'Build the package' },
      { t: 'steps', items: [
        "Check the file list under **What goes in the zip**.",
        "If the job has a brand, decide on **Include … brand sheet**.",
        "Press **Build the package**. Studio renders each format in turn and shows its progress.",
        "Save the zip. The job is marked **Delivered**, every format in the package is ticked done, and the delivery is listed under **Delivered before** with its date and file count.",
      ] },
      { t: 'p', text: "**Send as a link** builds the same files and gives you a link instead of a zip. The client downloads each file, or everything as a zip, from their browser. See [Review and delivery links](/learn/review-and-delivery-links)." },
      { t: 'try', label: 'Open Studio', href: '/studio' },

      { t: 'h', text: 'How files are named' },
      { t: 'p', text: "Every file follows **client_job_format_version**, lower case, with spaces turned into hyphens. For a client called Lekki Nights, a job called Launch, and the second version:" },
      { t: 'list', items: [
        "`lekki-nights_launch_instagram-post_v2.png`",
        "`lekki-nights_launch_a3-poster_v2.pdf`",
        "`lekki-nights_launch_v2_delivery.zip` for the zip itself",
      ] },
      { t: 'p', text: "The version number is the number of versions saved on the Review tab (v1 if there are none). So if you saved v3 for review and the client approved it, the delivered files say v3 too, and everyone is talking about the same thing. Rename a format on the Brief tab if you want a different name in the file." },

      { t: 'h', text: 'What the print PDF contains' },
      { t: 'list', items: [
        "The artwork at its trim size in mm, as set by the format (A4, A5, A3, the 18 × 24 in poster, the business card, the roll-up banner).",
        "3 mm bleed on every side, made by extending the edge pixels outwards, so background colour runs past the cut.",
        "Crop marks outside the bleed.",
        "TrimBox and BleedBox set, so the printer's software finds the cut line on its own.",
        "A slug line under the artwork with the client, job, format, version, trim size, bleed, and a reminder that the colour is RGB.",
      ] },
      { t: 'warn', text: "Bleed is made from the edge pixels, not from extra artwork. Keep text and logos well inside the edge, and make sure anything meant to run off the page reaches the edge of the board. See [Export for print](/learn/export-for-print) and [Designing for print](/learn/designing-for-print)." },
      { t: 'p', text: "Outdoor formats (billboards, the lamp-post banner) have no set size in mm. Their PDF takes its size from the pixels at 300 dpi, so check the real size and the file they want with the printer or sign maker before you send it." },
      { t: 'note', text: "Everything is RGB. The delivery note and the PDF both say so: ask the printer to convert with their profile, and ask for a proof when colour matters." },

      { t: 'h', text: 'The delivery note and brand sheet' },
      { t: 'p', text: "Every package includes a delivery note, a small web page the client can open in any browser. It lists every file with its size, every format with its pixel size (and mm for print), which versions were approved, the fonts used in the design (so whoever edits it next installs them first), and print notes." },
      { t: 'p', text: "When the job has a brand and **Include … brand sheet** is ticked, the zip also carries a brand sheet page: each colour with its role, hex, RGB and an approximate CMYK starting point, the headline and text fonts, the logo's minimum size and clear space, and the voice, do and don't lists. See [Save client brands and reuse them](/learn/brands-library)." },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**Nothing to deliver yet.** The job has no key visual design on this device. Design it on the Key visual tab first.",
        "**Could not build the package. Try fewer formats at once.** Very large formats use a lot of memory. Untick file types or formats, build, then build again for the rest.",
        "**Fonts look wrong in the files.** Studio waits for the design's fonts before rendering. If a font never loaded (you were offline, or it was a local font that is not on this device), open the design in the Editor and fix the missing font first.",
      ] },
    ],
  },

  // ─── Brands ─────────────────────────────────────────────────────
  {
    slug: 'brands-library',
    title: 'Save client brands and reuse them on every job',
    summary: "Keep each client's colours, fonts, logos, logo rules and voice as a brand in Studio. Pick it on a job and the Editor checks the design against it, flagging off-brand colours, wrong fonts, small logos and crowded clear space.",
    category: 'studio',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['brand-guidelines', 'brand-kit', 'delivering-files', 'building-a-brand-identity'],
    keywords: 'client brands brand library brand memory brand colours brand fonts logos on brand off brand check brand compliance clear space minimum size voice tone',
    body: [
      { t: 'p', text: "Most client work repeats: the same colours, the same fonts, the same logo, job after job. A brand in Studio is the one place that holds them. Save it once, choose it on each job, and the Editor tells you when a design drifts off it, which saves checking hex codes by eye." },

      { t: 'h', text: 'Create a brand' },
      { t: 'steps', items: [
        "On the Studio home screen, press **Client brands**.",
        "Press **New brand**.",
        "Fill in the sections below. Every change saves itself a moment after you stop typing.",
      ] },
      { t: 'p', text: "Or build a full brand system in the guideline builder and press **Save as a client brand in Studio** on its Export tab. That fills in the colours, fonts, type scale, logo, logo rules and voice for you. See [Build a brand guideline](/learn/brand-guidelines)." },

      { t: 'h', text: 'What a brand holds' },
      { t: 'table', head: ['Section', 'What to enter'], rows: [
        ['Brand and Client', 'The brand name and whose it is'],
        ['Colours', 'Each colour with a role: primary, secondary, accent, neutral, background or text. Pick with the colour chip or type a six-digit hex'],
        ['Type', 'A **Headlines** font and a **Text** font. Any Google font name works; it loads when a design uses it'],
        ['Logos', 'Logo files, each marked **On light** or **On dark** so you know which version goes where'],
        ['Smallest size', 'The narrowest the logo may be, in px on a 1080 px wide design. Starts at 80'],
        ['Clear space', 'The empty margin the logo needs, as a share of its height. 0.5 means half the logo height on every side'],
        ['Voice', "**Voice words**, **Do** and **Don't**, one per line"],
      ] },
      { t: 'tip', text: "Measuring the logo's minimum size against a 1080 px wide design means one rule works for a story, a post and a banner, whatever their actual pixel size." },

      { t: 'h', text: 'Use a brand on a job' },
      { t: 'p', text: "On the job's **Brief** tab, choose the brand under **Which brand is this for?** (it only appears once you have a brand). When you start the key visual, the brand's colours and fonts are used if no direction has been chosen, and the Editor's **Brief** panel shows a **Brand:** section for the design." },

      { t: 'h', text: 'What the Editor checks' },
      { t: 'p', text: "The brand section shows the brand's colours (click one to make it your main colour) and either **On brand** or a count of things to check:" },
      { t: 'list', items: [
        "**Off-brand colours**: text colours and shape fills and outlines that are not close to a brand colour. White and black always count as allowed. **Fix** changes every layer using that colour to the nearest brand colour.",
        "**Fonts that are not brand fonts**. **Fix** sets larger text to the headline font and smaller text to the text font.",
        "**Logos under the minimum size**, measured as if the board were 1080 px wide.",
        "**Layers inside the logo's clear space**. A layer that covers most of the board, such as a background photo, does not count.",
      ] },
      { t: 'p', text: "A layer counts as a logo when its **Role in formats** is Logo, or when its name contains the word logo. Name your logo layers, and the checks work without any setup. **Select** jumps to the logo layer in question." },
      { t: 'note', text: "Only text and shape layers are checked for colour. The colours inside photos and image layers are not checked, since a photo is never going to be all brand colours." },

      { t: 'h', text: "Load a brand into the Editor's brand kit" },
      { t: 'p', text: "The Editor has its own brand kit, used in every design and in the Add menu. **Use as the Editor brand kit** copies the brand's colours, both fonts and its logos into it. See [Brand kit](/learn/brand-kit)." },
      { t: 'warn', text: "This replaces the colours, fonts and logos in the Editor's brand kit. If you keep your own kit there, note it down first." },

      { t: 'h', text: 'Brands in delivery' },
      { t: 'p', text: "When a job has a brand, the delivery package can include a brand sheet: a small web page with each colour's role, hex, RGB and approximate CMYK, the fonts, the logo rules and the voice lists. See [Deliver every format](/learn/delivering-files)." },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "Brands are stored in this browser, like jobs. To move one to another computer, build it in the guideline builder there, or rebuild it by hand.",
        "Deleting a brand asks first. Jobs that used it lose their brand checks.",
        "Logo files can be SVG, PNG or JPG. For **On dark** logos, a PNG or SVG with a transparent background shows best.",
      ] },
    ],
  },

  // ─── Guideline builder ──────────────────────────────────────────
  {
    slug: 'brand-guidelines',
    title: 'Build a brand guideline with locks and new takes',
    summary: "The brand guideline builder turns a brand colour, a logo and a personality into a full system: colour ramps, contrast pairings, a type scale, logo rules and a paged guideline. Lock what you have decided, and New take explores everything else.",
    category: 'studio',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['brand-guideline-exports', 'brands-library', 'colour-that-works', 'workflow-client-brand-guideline'],
    keywords: 'brand guidelines brand book style guide identity guidelines design system colour ramps oklch wcag contrast type scale modular scale logo clear space minimum size generator',
    body: [
      { t: 'p', text: "A brand guideline tells everyone who touches a brand how to use it. The builder makes one from a few decisions and fills in the rest as a working system, then checks it: every text pairing against WCAG contrast, the logo against every background. Use it for a new identity, or to document one a client already has." },
      { t: 'try', label: 'Open Studio', href: '/studio' },
      { t: 'p', text: "Open it from the Studio home screen with **Brand guideline builder**. The controls are on the left in four tabs (Identity, Colour, Type, Export), the page list is in the middle and the page preview on the right." },

      { t: 'h', text: 'Locks and New take' },
      { t: 'p', text: "Every value in the system is either locked, because you set it, or free, generated for you. **New take** regenerates everything free and leaves everything locked alone. It is how you explore: lock the parts the client has agreed, and keep pressing New take until the rest clicks." },
      { t: 'list', items: [
        "**Choosing a value locks it.** Pick a harmony, a font or a radius and its padlock closes.",
        "**The padlock beside a field** toggles it. Locking a free value keeps what is showing now; unlocking lets New take change it.",
        "Page order, which pages are included, and their layouts are always kept.",
      ] },
      { t: 'warn', text: "Free values are generated from the brand colour, the brand name and the personality. Changing any of those three gives the free values a fresh set, just like New take. Lock what you like before you rename the brand or try another brand colour." },

      { t: 'h', text: 'Identity' },
      { t: 'table', head: ['Control', 'What it does'], rows: [
        ['Brand name, Tagline', 'Shown on the cover and throughout'],
        ['Logo', 'SVG, PNG or JPG. The logo is trimmed to its visible edges; a flat background (a JPG on white) is removed so the mark sits on any colour. If the logo has a clear colour, it becomes the brand colour'],
        ['Clear space', '¼ H, ½ H or 1 H: the margin around the logo, measured from the height of the mark'],
        ['Minimum width', '16px, 24px, 32px or 48px on screen'],
        ['Logo contrast', 'For the light surface, brand colour, dark surface and secondary colour: which version of the logo to use there and its contrast ratio'],
        ['Personality', 'Bold, Refined, Playful, Minimal, Warm or Technical. Steers the fonts, scale and corners the generator reaches for, and writes the voice'],
        ['Art direction', 'Editorial, Graphic or Systematic. Sets the three design principles'],
        ['Corner radius', '0, 4, 8, 12 or Pill'],
        ['Spacing unit, Grid', '4px or 8px; 6, 8 or 12 columns'],
      ] },
      { t: 'p', text: "The logo check keeps the logo in full colour wherever its outer edge reaches 3:1 against the background, the WCAG minimum for graphics. Where it does not, it recommends the **Reversed** (white) or **Dark mono** version, whichever reads better. Details enclosed inside the mark do not count, only the colours that meet the background." },

      { t: 'h', text: 'Colour' },
      { t: 'list', items: [
        "**Brand colour** is the source. Type a hex or use the picker.",
        "**Harmony**: Analogous, Complementary, Triadic or Split complement. Decides where the secondary and accent sit around the colour wheel.",
        "**Secondary** and **Accent** are built from the brand colour and harmony, then darkened or lightened until white or dark text reads on them. Set either by hand to lock it.",
        "**Neutral warmth**: how much of the brand hue shows in the greys, from 0% (pure grey) to 100%.",
      ] },
      { t: 'p', text: "Each colour gets a ramp from 50 to 900, ten steps. The ramps are built in OKLCH, a colour space where equal steps look equally different, so step 500 of a yellow and step 500 of a blue look equally light. Colour eases off at the lightest and darkest steps, so tints stay clean. The system also adds success, warning and error colours. See [Colour that works](/learn/colour-that-works)." },
      { t: 'p', text: "**Contrast** lists the pairings the guideline recommends, such as body text on the light surface, button labels on the accent, and secondary text, each with its ratio and grade: AAA (7:1), AA (4.5:1), AA large (3:1) or Fail. Brand colour used as text or an icon needs 3:1; the rest need 4.5:1." },

      { t: 'h', text: 'Type' },
      { t: 'list', items: [
        "**Headings**, **Body**, and **Data and code** fonts. Type any Google Fonts family name, or press the upload button to use a font file from this device (.woff2, .woff, .ttf or .otf). Uploaded fonts never leave the browser.",
        "**Scale**: Minor third (1.2), Major third (1.25), Perfect fourth (1.333), Aug. fourth (1.414), Perfect fifth (1.5) or Golden ratio (1.618). Each size is the one below it times this number.",
        "**Base size**: 14 to 18 px for body text.",
      ] },
      { t: 'p', text: "The preview shows the full scale, Display, H1 to H4, Body, Small and Caption, with sizes. Line height and letter spacing are set per size: big headings get tighter leading and tracking, small text a little more room. Small and Caption never go below 13 and 12 px, so a steep scale cannot produce unreadable captions. See [Typography fundamentals](/learn/typography-fundamentals)." },

      { t: 'h', text: 'Checks' },
      { t: 'p', text: "The button at the top right reads **All N checks pass** or **N issues**. Open it for the list: every contrast pairing, whether body text is at least 16 px (smaller is hard to read on screen), whether the accent reads as distinct from the brand colour, and the logo on each background. Fix issues by locking a different colour or font, or with New take." },

      { t: 'h', text: 'Pages' },
      { t: 'p', text: "The guideline has 13 pages: Cover, Principles, Logo, Clear space, Colour, Tints, Contrast, Typography, Type scale, In use, Voice, Tokens and Close. Choose **Deck** for landscape slides (1600 × 900) or **Document** for portrait pages (1240 × 1754)." },
      { t: 'list', items: [
        "**Reorder** by dragging a thumbnail, or with the up and down arrows that show when you hover it.",
        "**Leave a page out** of every export with its eye button. It stays in the list, faded.",
        "**Change a layout** where a page has more than one: press the layout chip (such as 1/3), or Alt-click the thumbnail. Shift+Alt-click goes back. The Cover has Art direction, Monolith and Centred; Colour, Logo, Principles, Voice and Close have two each.",
        "**Reset pages** (the circular arrow above the list) restores the default order and layouts.",
      ] },
      { t: 'keys', rows: [
        ['→ or ↓ or Page Down', 'Next page in the preview'],
        ['← or ↑ or Page Up', 'Previous page'],
      ] },

      { t: 'h', text: 'Your work is saved as you go' },
      { t: 'p', text: "The builder saves your brand, locks, page list and logo in this browser a moment after each change. Come back later and it says **Picked up where you left off**. **Start over**, then **Clear and start over**, clears it for a new brand; **Keep it** cancels. In a private session nothing is written to disk, so the browser warns you before you leave the page. See [Private session](/learn/private-session)." },
      { t: 'note', text: "The builder holds one brand at a time. To keep a finished brand while you start another, press **Save as a client brand in Studio** on the Export tab first, and export the files you need." },

      { t: 'h', text: 'On a phone' },
      { t: 'p', text: "On a narrow screen the preview comes first, the page list scrolls sideways under it, and the controls follow below. Everything works; it is just a longer scroll." },
    ],
  },

  // ─── Guideline exports ──────────────────────────────────────────
  {
    slug: 'brand-guideline-exports',
    title: 'Export a brand guideline for clients, printers and developers',
    summary: "Every export from the brand guideline builder: a screen PDF, a print PDF with bleed and crop marks, a single-file HTML handoff, editable Editor layers, CSS, Tailwind, design tokens JSON and Adobe .ase swatches.",
    category: 'studio',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['brand-guidelines', 'brands-library', 'export-for-print', 'workflow-client-brand-guideline'],
    keywords: 'export brand guidelines pdf print pdf html handoff design tokens json css variables tailwind config ase adobe swatch exchange illustrator swatches developer handoff',
    body: [
      { t: 'p', text: "One brand, different readers. The client wants something to scroll through, the printer wants bleed and crop marks, the developer wants tokens, and the next designer wants swatches in Illustrator. All of these come from the **Export** tab of the brand guideline builder, and all are made on your device." },
      { t: 'p', text: "Exports include only the pages switched on in the page list, in the order shown, in the orientation you chose (Deck or Document). See [Build a brand guideline](/learn/brand-guidelines)." },

      { t: 'h', text: 'Which export to send' },
      { t: 'table', head: ['Export', 'Who it is for', 'File'], rows: [
        ['Screen PDF', 'Clients and teams reading on screen or in email', '`name-guidelines-landscape.pdf` or `-portrait.pdf`'],
        ['Print PDF', 'A printer, for a bound book or handout', '`name-guidelines-print-landscape.pdf` or `-portrait.pdf`'],
        ['HTML handoff', 'Anyone who needs to copy colours or download logos', '`name-brand.html`'],
        ['Editor', 'You, to adjust a page by hand', 'Opens in the Editor'],
        ['CSS, Tailwind, JSON', 'Developers', '`name-tokens.css`, `tailwind.name.js`, `name.tokens.json`'],
        ['.ase', 'Designers in Illustrator, Photoshop or InDesign', '`name.ase`'],
      ] },

      { t: 'h', text: 'Screen PDF' },
      { t: 'p', text: "One page per slide at the slide's own shape, rendered at twice the page's pixel size so text stays sharp when zoomed. Good for email and for presenting." },

      { t: 'h', text: 'Print PDF' },
      { t: 'list', items: [
        "Trim size: A4 portrait (210 × 297 mm) for Document, or 297 × 167 mm (16:9) for Deck.",
        "300 dpi, 3 mm bleed on every side, and crop marks outside the bleed.",
        "TrimBox and BleedBox set for the printer's imposition software.",
        "A slug line on each page with the brand name, page number and title, trim size and bleed.",
      ] },
      { t: 'note', text: "Pages are RGB images. Ask the printer to convert with their profile, and ask for a proof. The Colour page (in its Specs layout) gives approximate CMYK values as a starting point; confirm them against a printed proof. See [Export for print](/learn/export-for-print)." },

      { t: 'h', text: 'HTML handoff' },
      { t: 'p', text: "One self-contained file the client opens in any browser, with no hosting and no account. It has:" },
      { t: 'list', items: [
        "The guideline pages as slides, moved with the left and right arrow keys.",
        "Logo downloads: **Full colour PNG**, **Reversed white PNG**, **Dark mono PNG**, and **Original SVG** when you added an SVG.",
        "Every colour, click to copy as HEX, RGB or OKLCH, and every ramp step, click to copy its hex.",
        "Type, contrast pairings, and the CSS, Tailwind and JSON tokens with a **Copy** button.",
      ] },
      { t: 'p', text: "Google fonts are embedded in the file (the Latin character sets), so it looks right offline. Fonts you uploaded are embedded too. If a Google font cannot be fetched while exporting, the file still saves and says which font it will load from Google when online." },

      { t: 'h', text: 'Open in the Editor' },
      { t: 'p', text: "**Editor** sends every included page to the Editor as its own board, with real layers: text stays text, shapes stay shapes, and the logo stays an image. Drawing that has no Editor equivalent, such as hatching or dashed guides, comes across as an image layer in the right place in the stack. Use this to add a page the builder does not make, or to adjust one layout by hand. See [Artboards](/learn/artboards)." },
      { t: 'warn', text: "Changes made in the Editor do not flow back to the builder. Settle the system first, then open it in the Editor for final touches." },

      { t: 'h', text: 'Save as a client brand in Studio' },
      { t: 'p', text: "Saves the resolved system as a brand in **Client brands**: brand, secondary and accent colours, the light surface as background, the ink colour as text, a mid neutral, the heading and body fonts, the type scale, the logo with its minimum size and clear space, and the voice with its do and don't lists. Pick it on a job and the Editor checks every design against it. See [Save client brands and reuse them](/learn/brands-library)." },

      { t: 'h', text: 'Tokens for developers' },
      { t: 'p', text: "Switch between **CSS**, **Tailwind** and **JSON** to see the code, then **Copy** it or **Save file**." },
      { t: 'table', head: ['Format', 'What is in it'], rows: [
        ['CSS', 'Custom properties on :root: every colour and ramp step (such as --color-brand-500), neutral ramp, surfaces and ink, font stacks with fallbacks, size, leading, tracking and weight for each type step, spacing steps in rem, and the radius'],
        ['Tailwind', 'A tailwind.config.js theme extension: colours with DEFAULT and 50 to 900, font families, font sizes with line height, letter spacing and weight, and a brand border radius'],
        ['JSON', 'Design Tokens Community Group format: colours, typography, spacing and radius, each with $type and $value, for tools such as Style Dictionary'],
      ] },

      { t: 'h', text: 'Adobe swatches (.ase)' },
      { t: 'p', text: "**Download .ase** gives an Adobe Swatch Exchange file grouped by role: brand, secondary and accent, each with its 50 to 900 ramp, then neutral, then semantic (success, warning, error). Load it from the Swatches panel in Illustrator, Photoshop or InDesign. The swatches are RGB." },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**The PDF, HTML and Editor buttons are greyed out.** Every page is left out. Switch at least one page back on in the page list.",
        "**The export failed.** The message says which export and why. Print PDFs are the heaviest: on a phone, try the screen PDF, or leave some pages out and export in two parts.",
        "**A font looks different in the HTML file.** It could not be embedded, so it loads from Google when online. The message after saving names it.",
      ] },
    ],
  },
]
