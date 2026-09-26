import type { Article } from '../types'

// Getting started and help articles. Facts checked against src/editor/io.ts, src/lib/analytics.ts,
// src/editor/components/PrivacyPanel.tsx, MobileEditor.tsx, StartScreen.tsx, EditorShell.tsx, src/editor/ai.ts,
// src/editor/ai-tools.ts, public/sw.js, public/manifest.webmanifest and supabase/analytics.md.

export const articles: Article[] = [
  // ─── Start ──────────────────────────────────────────────────────────
  {
    slug: 'what-is-voidcanvas',
    title: 'What Voidcanvas is and how its parts fit together',
    summary: "Voidcanvas is a free design suite that runs in your browser. Studio holds the job, the Editor makes the design, Effects and the quick tools give you one-click looks, and work moves between them without leaving your device.",
    category: 'start',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['your-first-design', 'moving-work-between-tools', 'saving-and-your-files', 'privacy-and-data'],
    keywords: 'about overview introduction modules studio editor effects free online photoshop alternative no account browser design app',
    body: [
      { t: 'p', text: "This page explains what each part of Voidcanvas is for, so you know where to start a piece of work and where to take it next. Read it once before your first project and the rest of the library will make more sense." },

      { t: 'h', text: 'One app, three modules' },
      { t: 'p', text: "Voidcanvas is one web app made of three modules. Each one works on its own, and each can pass work to the others. You switch between them with the **Studio**, **Editor** and **Effects** switch at the top of Studio and Effects, or from the **V** menu at the top left of the Editor." },
      { t: 'table', head: ['Module', 'Address', 'What it is for'], rows: [
        ['Studio', '/studio', 'Every client job, from the brief to the files you hand over. Jobs move through Direction, Design, Review and Delivered. Studio also holds client brands and the brand guideline builder.'],
        ['Editor', '/editor', 'A layered image editor: image, text, shape and adjustment layers, masks, selections, retouching, 58 live filters, boards and export.'],
        ['Effects', '/effects', 'One-click image effects. Load a photo, pick an effect, tune it, download it or send it to the Editor.'],
      ] },
      { t: 'p', text: "Next to the modules sit three quick tools: **Halftone Generator** at /tools/halftone, **Dither Generator** at /tools/dither and **Glitch Image Generator** at /tools/glitch. Each is a single page that does one effect well, with an upload button, sliders, **Download PNG** and **Send to Layer Stack**." },

      { t: 'h', text: 'Which one to open first' },
      { t: 'list', items: [
        "**You have a client job with a brief.** Start in Studio with **Start a job**. Studio keeps the brief, references, directions and deliverables together, and opens the Editor when it is time to design. See [Studio overview](/learn/studio-overview).",
        "**You need one design: a post, a flyer, a slide.** Open the Editor and pick a size. See [Make your first design](/learn/your-first-design).",
        "**You want a look on a photo quickly.** Open Effects or a quick tool, then send the result to the Editor if you want to add type or layout. See [Using Effects](/learn/effects-overview).",
      ] },

      { t: 'h', text: 'How work moves between modules' },
      { t: 'p', text: "Every module can hand work to the Editor. Effects has **Open in Editor**, the quick tools have **Send to Layer Stack**, and Studio has buttons such as **Start key visual in the Editor** and **Open as a board**. The work arrives as real layers: a photo with the effect on its own live filter layer, a Studio palette in your swatches, a brand guideline as one board per page." },
      { t: 'p', text: "This handoff happens inside your browser. The sending module writes the images and settings to a local inbox, the Editor opens, takes them out and clears the inbox. Nothing goes over the network. [Moving work between tools](/learn/moving-work-between-tools) covers each route." },

      { t: 'h', text: 'Where your work lives' },
      { t: 'p', text: "There is no account and no cloud copy. Designs, templates, versions, Studio jobs, brands and your brand kit are all saved in one database inside this browser, on this device. The Editor autosaves as you work. The flip side is that clearing your browser data, or moving to another computer, leaves your work behind unless you exported it first. [Saving and your files](/learn/saving-and-your-files) explains how to keep a portable copy." },
      { t: 'note', text: "A few things do load from the internet: the app itself, web fonts from Google Fonts, and the on-device AI models the first time you use one. Anonymous usage counts are sent unless you turn them off. None of these include your images or designs. [Privacy and data](/learn/privacy-and-data) lists exactly what is sent." },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "Voidcanvas is free. The on-device AI tools are free too: there are no credits.",
        "It works on phones. Below tablet width the Editor switches to a phone layout built for thumbs. See [Designing on a phone](/learn/designing-on-a-phone).",
        "You can install it as an app and use it offline after the first visit. See [Install Voidcanvas as an app](/learn/install-as-an-app).",
        "Voidcanvas is made by MotionPlay Labs.",
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  {
    slug: 'your-first-design',
    title: 'Make and export your first design',
    summary: 'Pick a size, add a photo and a headline, and download a finished PNG. About five minutes, start to finish.',
    category: 'start',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['what-is-voidcanvas', 'editor-tour', 'export-for-screen', 'size-presets'],
    keywords: 'getting started tutorial beginner first project new design quick start make a poster instagram post',
    body: [
      { t: 'p', text: "By the end of this page you will have made a social post with a photo and a headline, and downloaded it as an image. The same steps work for a flyer, a slide or a thumbnail: only the size changes." },

      { t: 'h', text: '1. Pick a size' },
      { t: 'p', text: "Open the Editor. The start screen asks **What are you making?** and lists sizes in groups: Social, Screen and Print. Each one shows its pixel size, so you know what you are getting." },
      { t: 'steps', items: [
        "Go to /editor.",
        "Under **Social**, click **Instagram post** (1080 × 1350). A blank white design opens.",
        "If none of the sizes fit, use **Custom size** at the bottom: type a width and height in pixels (16 to 8000) and click **Create design**.",
      ] },
      { t: 'tip', text: "Starting from a photo instead? Click **Open a photo**, drop the file on it, or paste with {{Ctrl+V}}. The design takes the photo's size. PSD and .void files keep their layers; a PDF comes in with one layer per page." },

      { t: 'h', text: '2. Add a photo' },
      { t: 'steps', items: [
        "Click **Add** in the top bar, then **Photo**. Or use File, **Place image as layer…** ({{Ctrl+Shift+P}}). You can also drag a file from your desktop onto the canvas.",
        "The photo arrives as its own layer. With the Move tool (**V**) selected, drag it to position it and drag a corner handle to resize.",
        "Photos larger than 4096 pixels on the long side are scaled down to 4096 as they come in, which is plenty for screen work.",
      ] },

      { t: 'h', text: '3. Add a headline' },
      { t: 'steps', items: [
        "Press **T** for the Type tool, or click **Add**, then **Text**.",
        "Click on the canvas where the headline should start and type. Drag a box instead of clicking if you want a paragraph that wraps.",
        "Click outside the text, or press {{Escape}}, to finish. If you typed nothing, the empty layer is removed for you.",
        "With the text layer selected, the Properties panel shows **Font**, **Bold**, **Italic**, alignment and **Colour**. Click **More type options** for **Size** and **Line spacing**. Pick a font and make the size big enough to read on a phone.",
        "To edit the words later, double-click the text, or select it and press {{Enter}}.",
      ] },
      { t: 'p', text: "Every photo and piece of text is a separate layer in the Layers panel, so you can move, hide or delete each one without touching the others. [Layers](/learn/layers) covers them in depth." },

      { t: 'h', text: '4. Check it and export' },
      { t: 'steps', items: [
        "Press {{Ctrl+0}} to fit the whole design on screen and look at it as a whole.",
        "Click **Export** in the top bar, or press {{Ctrl+E}}.",
        "Leave **File type** on **PNG** for the best quality, or choose **JPG** for a smaller file.",
        "Under **Size**, 1× gives the design's own pixel size. 2× doubles it, which looks sharper on high-density screens.",
        "Click **Download**. Or click **Copy image** to paste it straight into a chat or document.",
      ] },
      { t: 'p', text: "On a Mac, use Cmd wherever this page says Ctrl." },

      { t: 'h', text: 'Your design is already saved' },
      { t: 'p', text: "You did not need to press Save. The Editor autosaves to this browser a couple of seconds after each change, and again when you switch away from the tab. The design appears under **Pick up where you left off** next time you open the Editor. Rename it with the name field at the top of the Editor." },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**Menus other than File, Window and Help are greyed out.** They need a design open. Pick a size or open a photo first.",
        "**The text looks blurry while zoomed in.** That is the zoom level, not the file. Press {{Ctrl+1}} for 100% to see real pixels.",
        "**A JPG came out with a white background where the design was transparent.** JPG cannot store transparency. Export PNG or WebP instead.",
      ] },
      { t: 'try', label: 'Start a design', href: '/editor' },
    ],
  },

  {
    slug: 'saving-and-your-files',
    title: 'Where your designs are saved and how to keep them safe',
    summary: 'Voidcanvas saves everything inside your browser on this device, and as a real file when you choose. Learn how autosave, Save to disk, templates and versions work, what clears your work, and how to keep a backup.',
    category: 'start',
    level: 'Beginner',
    updated: '2026-09-26',
    related: ['templates-and-versions', 'private-session', 'troubleshooting', 'file-formats'],
    keywords: 'save autosave indexeddb local storage backup lost work recover cloud sync where are my files delete clear storage full .void file save to disk save as folder dropbox google drive icloud protected storage',
    body: [
      { t: 'p', text: "This page explains where your work is stored, what saves it, what can wipe it, and how to keep a copy that survives. It matters most before you clear your browser, switch computers or hand a design to someone else." },

      { t: 'h', text: 'Everything lives in this browser' },
      { t: 'p', text: "Voidcanvas has no accounts and no cloud storage. Your work is kept in a database inside the browser (IndexedDB, named `voidcanvas`). That one database holds Editor designs, templates, versions, Studio jobs and their boards, client brands, the brand kit, and the inbox used to pass work between modules." },
      { t: 'p', text: "Two consequences follow. Your work never leaves your device unless you export it. And your work is tied to this browser on this device: open Voidcanvas in a different browser, a different computer, or a different browser profile and you will not see it there." },

      { t: 'h', text: 'Autosave' },
      { t: 'p', text: "The Editor saves the open design about two seconds after each change, and again whenever you switch away from the tab. You can still press {{Ctrl+S}} (File, **Save**) if you like; it shows **Saved to this device.** If the design is linked to a file (see Save to disk below), {{Ctrl+S}} updates that file too and says **Saved to this device and to** the file's name. Studio saves jobs as you edit them." },
      { t: 'p', text: "If the browser or tab closes unexpectedly, the Editor start screen says **Voidcanvas closed unexpectedly last time** and offers to reopen every design that was open." },

      { t: 'h', text: 'Finding and managing saved designs' },
      { t: 'p', text: "The Editor start screen lists your recent designs under **Pick up where you left off**. Hover a design (or focus it with the keyboard) and open its **…** menu for:" },
      { t: 'list', items: [
        "**Export PNG**: downloads the design at full size without opening it.",
        "**Download .void**: downloads the editable design as a .void file without opening it.",
        "**Duplicate**: makes an independent copy named with ' copy' on the end.",
        "**Delete**: removes it from this device. This cannot be undone.",
      ] },

      { t: 'h', text: 'Templates' },
      { t: 'p', text: "File, **Save as template** stores a copy of the design as a template. Templates appear on the start screen under **Your templates**. Opening one makes a fresh copy, so the template itself never changes. Templates are stored on this device like everything else. See [Templates and versions](/learn/templates-and-versions)." },

      { t: 'h', text: 'Versions' },
      { t: 'p', text: "Autosave keeps only the latest state. Versions are extra restore points. One is made automatically every 10 minutes while you work (change this in Preferences, **History and saving**, or set it to 0 to turn it off), and you can save one yourself with {{Ctrl+Alt+S}}. File, **Version history…** lists them with **Restore** and **As copy**. Up to 30 versions are kept per design; when there are more, the oldest automatic ones go first." },

      { t: 'h', text: 'What can wipe your work' },
      { t: 'warn', text: "Clearing your browser's site data, cookies or storage for this site deletes every design, job and brand in it. So does **Delete all my data** in Your privacy. Neither can be undone." },
      { t: 'list', items: [
        "Clearing browsing data in your browser settings, if it includes site data or cookies.",
        "Using a browser's own private or incognito window: that storage is thrown away when the window closes.",
        "Turning on a Voidcanvas [private session](/learn/private-session): nothing is written to the device while it is on.",
        "Deleting a design from its **…** menu, or the whole database with **Delete all my data**.",
        "Browsers can clear a site's storage when the device runs low on space, and Safari can clear it for sites you have not visited for a few weeks. Voidcanvas asks the browser to protect your designs the first time you save one. Your privacy shows whether that was granted, under **Storage on this device**. Keeping a file on disk protects you either way.",
      ] },

      { t: 'h', text: 'Save to disk' },
      { t: 'p', text: "File, **Save to disk…** ({{Ctrl+Shift+S}}) saves the design as a .void file in a folder you choose. In Chrome, Edge and other Chromium browsers on a computer, the design then stays linked to that file: every {{Ctrl+S}} writes the latest version to it, so the file on disk is always current. Designs you open with File, **Open…** or drop on the start screen stay linked to their file in the same way." },
      { t: 'p', text: "In Safari, Firefox and on phones, Save to disk downloads a .void file instead. It is a snapshot: save again when you want a newer copy." },
      { t: 'tip', text: "Save to a folder inside Dropbox, Google Drive, OneDrive or iCloud Drive and that service keeps the file backed up and on your other devices. Open it there with File, **Open…**." },
      { t: 'p', text: "If the file is moved, renamed or deleted, the next {{Ctrl+S}} still saves in the browser and tells you the file could not be updated. Use **Save to disk…** again to choose a new place. The browser may ask once per visit for permission to edit the file." },

      { t: 'h', text: 'Keeping a backup' },
      { t: 'p', text: "Because there is no cloud copy, the backup is a file you keep. There are two editable formats:" },
      { t: 'table', head: ['Where', 'File', 'What it is'], rows: [
        ['File, **Save to disk…** ({{Ctrl+Shift+S}})', 'name.void', 'The whole project in a folder you choose, kept up to date by Ctrl+S where the browser allows.'],
        ['Export dialog, **Save editable file (.void.png, previews as your design, keeps layers)**', 'name.void.png', 'A normal PNG preview of the design with the full editable project hidden inside. It shows as a picture in any file browser.'],
        ['File, **Download project file (.void)**', 'name.void', 'The whole project as one self-contained file.'],
      ] },
      { t: 'p', text: "Both keep every layer, mask, group, board and saved selection, and fonts you added from files travel inside the design. Files saved by older versions of Voidcanvas still open. To open one, drop it on the Editor start screen or use File, **Open…** ({{Ctrl+O}}). A .void.png file also opens this way; a plain PNG without a project inside shows **That PNG has no Voidcanvas project inside it.**" },
      { t: 'tip', text: "Download a .void or .void.png of anything you would hate to lose, and keep it with your other project files. It is also how you move a design to another computer." },

      { t: 'h', text: 'When storage is full' },
      { t: 'p', text: "Browsers give each site a limited amount of space. If a save fails because it is full, you will see **Browser storage is full. Clear old designs from the home screen and try again.** Delete designs or old versions you no longer need, then save again. Large photos and many versions take the most room." },
    ],
  },

  {
    slug: 'moving-work-between-tools',
    title: 'Move work from Effects, Studio and the quick tools into the Editor',
    summary: 'Every module can hand work to the Editor as real, editable layers. Learn what each button sends and what arrives on the other side.',
    category: 'start',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['what-is-voidcanvas', 'effects-overview', 'quick-tools', 'studio-overview'],
    keywords: 'handoff open in editor send to editor send to layer stack transfer import from effects studio live filter layer inbox',
    body: [
      { t: 'p', text: "Effects, the quick tools and Studio are good at one job each. When you want to add type, combine images or lay out a page, you take the work into the Editor. This page shows every route across and what you get when it lands." },

      { t: 'h', text: 'How the handoff works' },
      { t: 'p', text: "When you click a send button, the module writes the images, palette, size and settings to a small inbox inside this browser's storage, then opens the Editor. The Editor takes the work out of the inbox, removes it from the inbox, and builds the design. Nothing is uploaded, and it works offline." },
      { t: 'note', text: "Most routes open a new design rather than adding to the one you have open. Studio's **Open in the Editor** is the exception: it reopens the job's saved design. Your other designs stay saved either way." },

      { t: 'h', text: 'From Effects' },
      { t: 'p', text: "In Effects, load a photo and pick an effect, then use **Open in Editor** in the top bar. On a phone the button in the bottom bar is labelled **Editor**." },
      { t: 'list', items: [
        "**Click** sends the original photo plus the effect as a live filter layer on top. The Editor says **Added as a live filter layer. Adjust it any time in the layers panel.** You can change the effect's settings, mask it, lower its opacity or hide it later.",
        "**Shift-click** sends one flattened image with the effect baked in. Use this when you want pixels to paint on rather than a filter to tweak.",
        "If no effect is picked, the plain photo is sent.",
      ] },

      { t: 'h', text: 'From the quick tools' },
      { t: 'p', text: "The Halftone, Dither and Glitch pages have **Send to Layer Stack**. It sends the original image and adds the tool's effect as a live filter layer with the same settings you chose on the page, so you can keep adjusting it in the Editor." },

      { t: 'h', text: 'From Studio' },
      { t: 'p', text: "Studio sends more than images. Depending on where you start, the Editor receives the job's palette, fonts and the brief as well." },
      { t: 'table', head: ['Where in Studio', 'Button', 'What arrives in the Editor'], rows: [
        ['A job, Key visual tab', '**Start key visual in the Editor**', 'A design for the job, set up with its palette, type and brief. The brief shows as a checklist in the Brief panel.'],
        ['A job, Key visual tab', '**Open in the Editor**', 'The job’s saved key visual, reopened.'],
        ['A job, Directions tab', '**Open as a board**', 'The direction as an editable board of real text, shape and image layers, with the direction’s palette.'],
        ['A job, References tab', '**Apply the look to a photo**', 'Your photo with the reference’s colour look on its own layer (and a grain layer if the reference is grainy).'],
        ['Brand guideline builder', '**Editor**', 'The guideline as one board per page, with the brand colours in your swatches.'],
      ] },
      { t: 'p', text: "When a palette comes across, its colours are added to your swatches and the first one becomes your main colour, so the next shape or text uses it." },

      { t: 'h', text: 'From your computer' },
      { t: 'p', text: "Files from outside Voidcanvas do not need the inbox. Drop images, PSDs, PDFs or .void files on the Editor, use File, **Open…** ({{Ctrl+O}}), or paste an image with {{Ctrl+V}}. If you installed Voidcanvas as an app, your system may also offer it for opening image, PSD and .void files. See [Import PSD and PDF](/learn/import-psd-and-pdf)." },

      { t: 'h', text: 'Common problems' },
      { t: 'list', items: [
        "**The Editor opened empty.** The inbox item is removed once the Editor takes it, so reloading the Editor afterwards does not bring it back. Your design is saved though: look under **Pick up where you left off**.",
        "**That design is no longer on this device.** Studio tried to reopen a key visual that was deleted, or that was made in another browser. Start a new one from the job.",
        "**The effect looks different in the Editor.** Filter previews in the Editor are computed at 1200 pixels, the same as Effects. Exports run at full size with pixel settings scaled up, so they match, only sharper.",
      ] },
      { t: 'try', label: 'Open Effects', href: '/effects' },
    ],
  },

  {
    slug: 'install-as-an-app',
    title: 'Install Voidcanvas as an app and use it offline',
    summary: 'Add Voidcanvas to your dock, desktop or home screen so it opens in its own window and keeps working without a connection.',
    category: 'start',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['designing-on-a-phone', 'browser-support', 'saving-and-your-files', 'troubleshooting'],
    keywords: 'install pwa progressive web app add to home screen dock desktop app offline no internet standalone window',
    body: [
      { t: 'p', text: "Voidcanvas is a web app you can install. Once installed it opens in its own window without browser tabs and address bar, and after the first visit it works offline. It is the same app with the same saved work: installing does not copy or move anything." },

      { t: 'h', text: 'Install it' },
      { t: 'p', text: "Browsers offer installing in slightly different places. Visit Voidcanvas once first, then:" },
      { t: 'table', head: ['Browser', 'How to install'], rows: [
        ['Chrome or Edge on a computer', 'Click the install icon at the right of the address bar, or open the browser menu and look for the install option.'],
        ['Safari on a Mac', 'File menu, **Add to Dock**.'],
        ['Safari on iPhone or iPad', 'Tap the Share button, then **Add to Home Screen**.'],
        ['Chrome on Android', 'Open the browser menu and choose to install the app or add it to the home screen.'],
      ] },
      { t: 'p', text: "The installed app is called Voidcanvas and opens straight into the Editor." },

      { t: 'h', text: 'Using it offline' },
      { t: 'p', text: "After your first visit, the app keeps a copy of itself on your device. The home page, Editor, Studio and Effects are stored straight away; other pages, such as the quick tools, are stored once you have visited them. Pages still check for a newer version when you are online, so you get updates." },
      { t: 'p', text: "Offline you can open and edit saved designs, make new ones, import files and export. A few things need the internet the first time:" },
      { t: 'list', items: [
        "**Fonts.** Web fonts load from Google Fonts. A font you have used before is kept and works offline; a font you have never used will not load until you are back online.",
        "**AI tools.** Remove background, Select subject, Object select, Remove object and Expand with AI fill each download a model the first time. After that, they work offline. See [AI on this device](/learn/ai-on-this-device).",
        "**Usage counts and feedback** are simply not sent while you are offline.",
      ] },
      { t: 'tip', text: "Going somewhere without a connection? Open the Editor once, use the fonts you plan to use, and run each AI tool you need once before you leave." },

      { t: 'h', text: 'Opening files from your computer' },
      { t: 'p', text: "The installed app registers itself for PNG, JPG, WebP, PSD and .void files. On systems and browsers that support this, you can choose Voidcanvas from your file browser's **Open with** list, and the files open straight into the Editor." },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "The installed app and the browser tab share the same storage, so your designs appear in both.",
        "Uninstalling the app does not by itself delete your designs, but clearing the site's data does. Keep a .void backup of important work. See [Saving and your files](/learn/saving-and-your-files).",
        "Installing is counted once in the anonymous usage counts (unless you turned them off). Nothing else about the install is sent.",
      ] },
    ],
  },

  {
    slug: 'designing-on-a-phone',
    title: 'Design on a phone or tablet',
    summary: 'On a phone the Editor becomes a thumb-first layout with five modes and short sheets. Learn the layout, the touch gestures and what works differently.',
    category: 'start',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['your-first-design', 'install-as-an-app', 'retouching', 'export-for-screen'],
    keywords: 'mobile phone iphone android tablet ipad touch gestures pinch zoom apple pencil stylus pen pressure share camera',
    body: [
      { t: 'p', text: "You can make and export a full design on a phone. This page explains the phone layout, the gestures, and where the desktop tools went, so you are not hunting for them. It also covers tablets and pens." },

      { t: 'h', text: 'Phone, tablet or desktop layout' },
      { t: 'p', text: "The Editor picks its layout from the width of the window. Below 768 pixels wide (most phones held upright) you get the phone layout described here. Wider than that, including most tablets, you get the full desktop Editor with menus, tool rail and panels, and touch still works." },

      { t: 'h', text: 'The phone layout' },
      { t: 'list', items: [
        "**Top bar**: back to the start screen, the design name (tap to rename), **Undo**, **Redo** and **Share**.",
        "**Canvas** in the middle. A **Layers** button with the layer count sits at the top right.",
        "**Mode bar** along the bottom: **Select**, **Text**, **Image**, **Shape** and **Effects**. Each opens a short sheet with the controls that matter. Tap **Done** or tap the mode again to close it.",
      ] },
      { t: 'p', text: "Tapping a layer on the canvas opens the **Select** sheet for it, and tapping empty canvas closes that sheet again. While you type on the canvas the sheets and mode bar hide to make room for the keyboard." },

      { t: 'h', text: 'What each mode does' },
      { t: 'table', head: ['Mode', 'Controls'], rows: [
        ['Select', 'For the selected layer: **Edit text**, **Crop**, **Remove background**, **Filters**, fill or text colour, **Duplicate**, **Delete**, **Opacity**, and under Order: **Bring forward**, **Send back**, **Flip**, **Centre**. **More tools** shows the other desktop tools.'],
        ['Text', '**Add heading** or **Add paragraph**. With a text layer selected: font, **Size** (8 to 400), **Regular** or **Bold**, **Left**, **Center** or **Right**, and **Colour**.'],
        ['Image', '**Add photo** from your files, or **Camera** to take one. With a photo selected: **Crop**, **Remove background**, **Flip**.'],
        ['Shape', '**Rectangle**, **Circle**, **Line**, **Polygon**. With a shape selected: **Fill** and **Stroke** colours.'],
        ['Effects', '**Filters** opens the filter gallery; **Adjustments** adds an adjustment. Both go on as their own layers, so you can change or remove them later.'],
      ] },

      { t: 'h', text: 'Using the full tool set' },
      { t: 'p', text: "The desktop tools are still there, one step further away. Open **Select**, tap **More tools**, and pick one: brush, eraser, selections, heal, clone stamp, pen, gradient and the rest. A pill appears at the top of the canvas with the tool's name and a **Done** button. Tap **Done** to go back to moving and selecting." },

      { t: 'h', text: 'Gestures' },
      { t: 'keys', rows: [
        ['Pinch', 'Zoom in and out around your fingers'],
        ['Two-finger drag', 'Pan around the design'],
        ['Two-finger tap', 'Undo'],
        ['Three-finger tap', 'Redo'],
        ['Tap', 'Select a layer'],
        ['Drag a layer', 'Move it; drag a handle to resize'],
      ] },
      { t: 'p', text: "The two and three finger taps count only when they are quick and your fingers do not move. These gestures work in the desktop layout on a tablet too." },

      { t: 'h', text: 'Pens and pressure' },
      { t: 'p', text: "With a pen or stylus that reports pressure, pressing harder makes brush strokes bigger. In the desktop layout, the options bar for brush tools has **Pen size** (on by default) and, for Brush and Eraser, **Pen opacity**." },
      { t: 'p', text: "On a tablet, turn on **Touch mode** (View menu, **Touch mode (bigger controls)**, or Preferences, **Interface**). It makes controls bigger, and once you have used a pen, your fingers pan and zoom instead of painting, so resting your hand on the screen does not leave marks." },

      { t: 'h', text: 'Sharing and exporting' },
      { t: 'p', text: "Tap **Share** in the top bar. **Share PNG**, **JPG** and **PDF** open your phone's share sheet, so you can send the file to messages, mail or photos. If the phone cannot share files from the browser, the button reads **Save PNG** and downloads instead. Under **Size**, pick 1x or 2x. **More options** opens the full export dialog." },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "Photos, PSDs and PDFs open as layers on a phone too. Everything stays on the phone.",
        "Phones have less memory than computers. If the Editor slows down, work at a smaller size or with fewer large photos. See [Troubleshooting](/learn/troubleshooting).",
        "Installing Voidcanvas to your home screen gives you more room on screen. See [Install Voidcanvas as an app](/learn/install-as-an-app).",
      ] },
      { t: 'try', label: 'Open the Editor', href: '/editor' },
    ],
  },

  // ─── Help ───────────────────────────────────────────────────────────
  {
    slug: 'privacy-and-data',
    title: 'What Voidcanvas sends and what stays on your device',
    summary: 'Your images and designs never leave your browser. Here is the complete list of what does go over the network, including the anonymous usage counts, and how to turn them off.',
    category: 'help',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['private-session', 'saving-and-your-files', 'ai-on-this-device', 'report-a-bug-well'],
    keywords: 'privacy data gdpr tracking analytics telemetry cookies upload cloud what is sent do not track usage counts opt out',
    body: [
      { t: 'p', text: "This page lists exactly what Voidcanvas sends over the network and what never leaves your device. It is useful if you work with client material under an NDA, or if you just want to know." },

      { t: 'h', text: 'What never leaves your device' },
      { t: 'p', text: "Editing, effects, AI tools, Studio boards and exports all run inside your browser. These are never sent anywhere:" },
      { t: 'list', items: [
        "Your images, photos, PSDs and PDFs.",
        "Your designs, layers, text and anything you type into them.",
        "File names and design names.",
        "Studio jobs, briefs, references, brands and brand guidelines.",
        "Fonts you add from files on your computer. They are never requested from Google.",
      ] },
      { t: 'p', text: "There is no account, no login and no cloud copy. Your work is saved in this browser only. See [Saving and your files](/learn/saving-and-your-files)." },

      { t: 'h', text: 'What does go over the network' },
      { t: 'table', head: ['What', 'Why', 'What it contains'], rows: [
        ['The app itself', 'To load the pages and, once installed, update them.', 'Ordinary page requests.'],
        ['Web fonts from Google Fonts', 'So text layers can use fonts such as Inter, Poppins or Playfair Display.', 'A request for the font family by name. No text or design.'],
        ['AI model files, first use only', 'Remove background, Select subject, Object select, Remove object and Expand with AI fill run on your device and need their model downloaded once.', 'A download of the model and its library from public hosts (jsDelivr and Hugging Face). Your image is not sent.'],
        ['Anonymous usage counts', 'So we know which tools get used and what breaks.', 'See the next section.'],
        ['Feedback and bug reports, only when you send one', 'So you can tell us something.', 'What you type. Feedback also attaches the context listed below.'],
      ] },

      { t: 'h', text: 'Anonymous usage counts in detail' },
      { t: 'p', text: "Unless you turn them off, Voidcanvas records small events such as ‘a design was exported as PNG’. Each event contains:" },
      { t: 'list', items: [
        "The event name, for example a page view, a menu or shortcut command id, a tool picked, an export, an import, an effect applied, or an error.",
        "Small settings for that event: a file type, an export size in KB, a scale, a tool or effect id, a size preset name and its pixel size.",
        "The page you were on (for example /editor) and which area it belongs to.",
        "Device type (desktop, tablet or mobile), browser, operating system, time zone, language, screen size, and whether Voidcanvas is installed as an app.",
        "A random id for this browser and a random id for this visit. These are not linked to your name or email.",
        "For errors: the error message, with any web addresses removed, and at most 10 per tab.",
      ] },
      { t: 'p', text: "They never contain images, file names, text, layer content or anything you type. At most 600 events are sent in one visit." },

      { t: 'h', text: 'Turn usage counts off' },
      { t: 'steps', items: [
        "In the Editor, open Help, **Your privacy**. (Also in the **V** menu at the top left, and as **Your privacy** in the header of the home page.)",
        "Switch off **Share anonymous usage counts**.",
      ] },
      { t: 'p', text: "The setting is remembered in this browser. Usage counts are also off automatically when:" },
      { t: 'list', items: [
        "A [private session](/learn/private-session) is on.",
        "Your browser sends Do Not Track or Global Privacy Control.",
      ] },

      { t: 'h', text: 'Feedback and bug reports' },
      { t: 'p', text: "Nothing is sent from these until you press send. Help, **Send feedback…** sends your mood (Not good, It’s okay or Love it), your message, and an email address only if you give one for a reply. It also attaches the page area, device type, browser, operating system, screen size, time zone, whether the app is installed, and the ids of your last few commands, so a message like ‘it broke’ has some context. After your second export, Voidcanvas asks once **How did that go?**; you can ignore it." },
      { t: 'p', text: "Bug reports are covered in [Report a bug well](/learn/report-a-bug-well)." },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "Interface preferences, workspaces and the usage setting are kept in this browser, not in your designs.",
        "Downloaded AI models are cached in this browser. Help, **AI on this device** lists them and has **Remove downloaded models**.",
        "To remove your designs and everything else Voidcanvas stored in this browser, use **Delete all my data** in Your privacy.",
      ] },
    ],
  },

  {
    slug: 'private-session',
    title: 'Use a private session on a shared computer',
    summary: 'A private session keeps everything in memory and writes nothing to the device. Learn when to use it, what it changes, and how Delete all my data works.',
    category: 'help',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['privacy-and-data', 'saving-and-your-files', 'troubleshooting'],
    keywords: 'private session incognito shared computer public computer library school kiosk delete all my data wipe clear everything',
    body: [
      { t: 'p', text: "A private session is for computers you do not own: a library, a school lab, a client's laptop. While it is on, nothing you make is written to the device, and it all disappears when you close the tab. Use it whenever you would not want the next person to find your work." },

      { t: 'h', text: 'Turn it on' },
      { t: 'steps', items: [
        "Open **Your privacy**: in the Editor, Help, **Your privacy**, or the **V** menu at the top left. On the home page it is **Your privacy** in the header.",
        "Switch on **Private session**.",
        "Confirm the message: **Nothing you make will be saved to this device, and it clears when you close the tab.**",
      ] },
      { t: 'p', text: "A **Private** badge with a lock appears in the Editor's top bar while it is on, so you can always tell." },
      { t: 'tip', text: "Turn it on before you open or make anything, so nothing is saved before you switch." },

      { t: 'h', text: 'What changes while it is on' },
      { t: 'table', head: ['Normally', 'In a private session'], rows: [
        ['Designs, jobs and brands are saved in the browser database.', 'They are kept in memory only, for this tab.'],
        ['The Editor autosaves after each change.', 'Autosave is off. **Save** keeps the design in memory for this tab only.'],
        ['Versions are made every few minutes.', 'No versions are made.'],
        ['After a crash, the start screen offers to reopen your work.', 'Nothing is recorded, so there is nothing to reopen.'],
        ['Anonymous usage counts are sent unless turned off.', 'Usage counts are off.'],
      ] },
      { t: 'p', text: "The private session lasts for this tab. It survives moving between the Editor, Studio and Effects inside the tab, but closing the tab ends it and discards everything. Reloading the page also discards the work, because it only ever lived in memory." },
      { t: 'p', text: "Designs already saved on this device before you switched are not deleted. They are just not shown while the private session is on." },

      { t: 'h', text: 'Getting your work out' },
      { t: 'p', text: "Because nothing is kept, export before you close the tab:" },
      { t: 'list', items: [
        "Export the finished image with **Export** ({{Ctrl+E}}). On a phone, the Share sheet reminds you: **Private session: nothing is saved on this phone unless you export it.**",
        "To keep it editable, use **Save editable file (.void.png, previews as your design, keeps layers)** in the export dialog, or File, **Download project file (.void)**, and take the file with you.",
      ] },
      { t: 'warn', text: "Downloaded files land in the computer's Downloads folder like any other download. On a shared computer, move or delete them before you leave." },

      { t: 'h', text: 'Delete all my data' },
      { t: 'p', text: "**Delete all my data**, at the bottom of Your privacy, removes the whole Voidcanvas database from this browser: every saved design and template, all versions, Studio jobs and boards, client brands, the brand kit, and anything in memory. The panel tells you how many saved designs you have before you press it. It asks you to confirm, and it cannot be undone." },
      { t: 'p', text: "Use it on a computer you used without a private session, or before handing your own computer to someone else. It does not remove:" },
      { t: 'list', items: [
        "Files you already downloaded.",
        "Interface preferences and workspaces, and the usage counts setting.",
        "Downloaded AI models. Remove those with Help, **AI on this device**, **Remove downloaded models**.",
      ] },
      { t: 'p', text: "To remove every trace, including preferences and cached files, also clear this site's data in your browser settings." },

      { t: 'h', text: 'Private session or a browser private window?' },
      { t: 'p', text: "A browser's own private or incognito window also throws storage away when it closes, and works for the same purpose. A Voidcanvas private session adds the Private badge, turns off usage counts, and works in a normal window, including the installed app. Using both together is fine." },
    ],
  },

  {
    slug: 'troubleshooting',
    title: 'Fix common problems with fonts, exports, storage and speed',
    summary: 'What to try when fonts look wrong, an export fails, storage is full, the Editor is slow, or a file will not open.',
    category: 'help',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['browser-support', 'saving-and-your-files', 'report-a-bug-well', 'history-and-undo'],
    keywords: 'problem not working help error slow laggy crash fonts missing export failed storage full cannot open psd pdf blurry fix',
    body: [
      { t: 'p', text: "Most problems in Voidcanvas come from four places: fonts, the size of the design, browser storage, and the browser itself. Find your symptom below. If nothing here helps, [report a bug](/learn/report-a-bug-well)." },

      { t: 'h', text: 'First, try these' },
      { t: 'steps', items: [
        "Reload the page. Your designs are saved in the browser, and after a crash the start screen offers to reopen them.",
        "Make sure your browser is up to date. See [Browser support](/learn/browser-support).",
        "Close other heavy tabs. Image editing uses a lot of memory.",
        "If only one design misbehaves, try File, **Version history…** and restore an earlier version as a copy.",
      ] },

      { t: 'h', text: 'Fonts' },
      { t: 'list', items: [
        "**Some fonts are missing.** A design or PSD uses fonts that are not on this device or on Google Fonts. Pick a replacement for each and click **Replace**, or click **Add font file** and choose the font file from your computer. Fonts added from files are saved inside the design, so they travel with it.",
        "**Text shows in a plain stand-in font for a moment.** Web fonts load from Google Fonts the first time you use them. On a slow connection this takes a second; offline, a font you have never used cannot load.",
        "**Spacing shifted after opening a PSD.** The replacement font has different widths. Adjust size or tracking, or add the original font file.",
        "**That font file could not be read.** The file is damaged or not a font. Try another copy of it.",
      ] },

      { t: 'h', text: 'Exports' },
      { t: 'list', items: [
        "**Export failed. Try a smaller size.** The browser ran out of room for the canvas. Choose a smaller scale in **Size**. Scales that would go past 8192 pixels on the long side are not offered.",
        "**The JPG has a white background.** JPG has no transparency. Use PNG or WebP. For PNG and WebP with a background colour set, tick **Leave out the background colour**.",
        "**Copy image did nothing, or failed.** Some browsers do not allow copying images to the clipboard. Use **Download** instead.",
        "**The PDF looks soft.** PDF export is image based. Designs larger than 2000 pixels on the long side are treated as print work at 300 dpi; smaller ones are sized for screen. Start print work from a Print size. See [Export for print](/learn/export-for-print).",
        "**The download never appeared on a phone.** Use **Share** and pick where to send it, or check the browser's downloads list.",
      ] },

      { t: 'h', text: 'Storage' },
      { t: 'list', items: [
        "**Browser storage is full. Clear old designs from the home screen and try again.** Delete designs you no longer need from the Editor start screen, and old versions in File, **Version history…**. Download a .void copy of anything you want to keep first.",
        "**Could not save to browser storage.** Something blocked the save, for example a browser setting that blocks site data. Allow storage for this site, or export your work right away.",
        "**My designs have gone.** Check you are in the same browser and profile you used before, and that a [private session](/learn/private-session) is not on (the **Private** badge shows in the top bar). Clearing site data deletes designs for good.",
      ] },

      { t: 'h', text: 'Speed and big files' },
      { t: 'p', text: "The Editor draws with the browser's 2D canvas. It is comfortable up to about 4000 pixels on a side. Bigger designs and many large photo layers use more memory and slow things down, especially on phones." },
      { t: 'list', items: [
        "Photos over 4096 pixels on the long side are scaled down to 4096 when you add them.",
        "Custom sizes go up to 8000 pixels. If you do not need that, use a smaller size and export at 2× or 3×.",
        "Undo keeps 100 steps by default. On a machine short of memory, lower **Undo steps kept** or **Memory for undo** in Preferences, **History and saving**. The oldest steps are dropped first.",
        "Once layers and undo history pass 200 MB, the status bar shows how much memory is in use.",
        "Filter previews are computed at 1200 pixels, then exports run at full size, so an export can take a moment longer than the preview.",
      ] },

      { t: 'h', text: 'Files that will not open' },
      { t: 'list', items: [
        "**Only image files, PSD or PDF can be added.** The file type is not supported. Convert it to PNG or JPG first.",
        "**Could not read that PSD.** The file may be damaged or use a feature that cannot be read yet. Try saving it again from the original app, or flatten it.",
        "**That PSD has no layers we can read. Try flattening it first.**",
        "**Could not open that PDF. It may be password protected.** Remove the password in the original app and try again.",
        "**That PNG has no Voidcanvas project inside it.** It is a normal PNG. Only .void.png files saved from Voidcanvas carry a project.",
      ] },
      { t: 'p', text: "See [Import PSD and PDF](/learn/import-psd-and-pdf) for what each format keeps." },

      { t: 'h', text: 'AI tools' },
      { t: 'list', items: [
        "**Could not load the background remover. Check your connection and try again.** The model downloads the first time you use it. Connect to the internet and try again.",
        "**The AI remover could not start in this browser, so a simpler fill was used.** Remove object fell back to patch filling. See [Browser support](/learn/browser-support).",
      ] },
    ],
  },

  {
    slug: 'browser-support',
    title: 'Browsers, devices and what the AI tools need',
    summary: 'Voidcanvas runs in a modern browser on computers, tablets and phones. Here is what it relies on, and how the on-device AI tools use WebGPU and WebAssembly.',
    category: 'help',
    level: 'Intermediate',
    updated: '2026-09-25',
    related: ['troubleshooting', 'ai-on-this-device', 'remove-background', 'install-as-an-app'],
    keywords: 'browser support chrome safari firefox edge requirements webgpu wasm webassembly gpu device compatibility ipad android system requirements',
    body: [
      { t: 'p', text: "Voidcanvas needs no installation and no plug-ins: a current browser is enough. This page explains which browser features it uses, which parts need something extra, and what happens when a feature is missing. Read it if something works on one machine and not another." },

      { t: 'h', text: 'The short version' },
      { t: 'list', items: [
        "Use a current version of your browser and keep it updated.",
        "Everything except some AI tools works on any current desktop or mobile browser.",
        "The AI tools run everywhere, but the any-subject model needs WebGPU, and Remove object is faster with it.",
        "When a feature is missing, Voidcanvas falls back to a simpler route and tells you, rather than failing.",
      ] },

      { t: 'h', text: 'What the app relies on' },
      { t: 'table', head: ['Browser feature', 'Used for', 'If it is missing or blocked'], rows: [
        ['IndexedDB (site storage)', 'Saving designs, jobs, brands and passing work between modules.', 'Saves fail with **Could not save to browser storage**. Allow site data, or use a private session and export your work.'],
        ['Canvas', 'All drawing, effects and export.', 'The Editor cannot run.'],
        ['Service worker', 'Working offline and installing as an app.', 'Everything works online; offline use and install are not available.'],
        ['Clipboard images', '**Copy image** in export, and pasting images with Ctrl+V.', 'Use Download, and add images by dropping or opening files.'],
        ['Web Share with files', 'The **Share** button on phones.', 'The button becomes **Save PNG** and downloads instead.'],
        ['File handling', 'Opening files with the installed app from your file browser.', 'Open files from inside the Editor instead.'],
        ['Pointer events with pressure', 'Pen pressure for brush size and opacity.', 'Strokes use full size and opacity.'],
      ] },

      { t: 'h', text: 'Computers, tablets and phones' },
      { t: 'p', text: "On a computer you get the full Editor with menus, panels and keyboard shortcuts. Shortcuts use Ctrl on Windows, Linux and ChromeOS, and Cmd on a Mac. Tablets also get the full Editor, with pinch zoom, two-finger pan and **Touch mode** for bigger controls. Screens narrower than 768 pixels get the phone Editor. See [Designing on a phone](/learn/designing-on-a-phone)." },
      { t: 'p', text: "Phones and small tablets have less memory. Very large designs are more likely to hit memory limits there. See [Troubleshooting](/learn/troubleshooting)." },

      { t: 'h', text: 'The AI tools: WebGPU and WebAssembly' },
      { t: 'p', text: "The AI tools run the model inside your browser. Two browser technologies make that possible. WebAssembly (WASM) runs the model on the processor and works in every current browser. WebGPU runs it on the graphics chip, which is much faster, but not every browser or device offers it yet." },
      { t: 'table', head: ['Model', 'Size', 'Used by', 'Needs'], rows: [
        ['MODNet', '26 MB', 'Remove background, Select subject (strongest on people)', 'Runs anywhere.'],
        ['BiRefNet lite', '115 MB', 'Remove background and Object select for any subject', 'WebGPU. Without it, the standard MODNet model is used instead.'],
        ['LaMa', '208 MB', 'Remove object, Expand with AI fill', 'Uses WebGPU where available, otherwise WebAssembly.'],
      ] },
      { t: 'p', text: "What you will see without WebGPU:" },
      { t: 'list', items: [
        "Asking for the any-subject model shows **This browser cannot run the any-subject model. Using the standard one.** and continues with MODNet.",
        "Object select uses MODNet, which does best on people.",
        "Remove object runs on the processor, which is slower. If the model cannot start at all, you see **The AI remover could not start in this browser, so a simpler fill was used.**",
      ] },
      { t: 'p', text: "Help, **AI on this device** lists every model with its size and licence, marks the one that works best with WebGPU, and can remove downloaded models. See [AI on this device](/learn/ai-on-this-device)." },

      { t: 'h', text: 'Good to know' },
      { t: 'list', items: [
        "Each model downloads once, the first time you use it, after you confirm. After that it is cached and works offline.",
        "Browser extensions that block scripts or storage can stop saves or the AI downloads. Allow this site if something fails only in one browser.",
        "Your work is stored per browser. Designs made in one browser do not appear in another. Move them with a .void file. See [Saving and your files](/learn/saving-and-your-files).",
      ] },
    ],
  },

  {
    slug: 'report-a-bug-well',
    title: 'Report a bug so it can be fixed',
    summary: 'Where to report a bug from anywhere in Voidcanvas, what to write so it gets fixed quickly, and exactly what the report sends.',
    category: 'help',
    level: 'Beginner',
    updated: '2026-09-25',
    related: ['troubleshooting', 'privacy-and-data', 'browser-support'],
    keywords: 'report a bug problem issue broken not working contact support feedback crash error report help',
    body: [
      { t: 'p', text: "A good bug report lets someone else make the problem happen on their own screen. Once they can see it, they can fix it. This page shows what to write and where to send it." },

      { t: 'h', text: 'Where to report it' },
      { t: 'list', items: [
        "In the Editor: Help, **Report a bug…**. On a phone, tap the question mark at the top of the Editor.",
        "In Studio, Effects and the quick tools: the question mark next to the module switch, then **Report a bug**.",
        "Anywhere else: the [Report a bug](/report-a-bug) page, linked in the footer of every page.",
      ] },
      { t: 'p', text: "Inside the app the report opens in a box over your work, so nothing is closed or lost while you write it." },
      { t: 'p', text: "For ideas and general comments, Help, **Send feedback…** is quicker." },
      { t: 'try', label: 'Report a bug', href: '/report-a-bug' },

      { t: 'h', text: 'Before you report' },
      { t: 'steps', items: [
        "Try it again. If it happens every time, note the exact steps. If it happens only sometimes, say so.",
        "Reload the page and try once more. That rules out a one-off glitch.",
        "Check [Troubleshooting](/learn/troubleshooting). Some messages, such as storage being full, have a quick fix.",
      ] },

      { t: 'h', text: 'What to write' },
      { t: 'p', text: "Three things make a report useful: what you did, what you expected, and what happened instead." },
      { t: 'table', head: ['Part', 'Weak', 'Useful'], rows: [
        ['What you did', 'I was editing text.', 'Opened a PSD, double-clicked the headline text layer, changed the font to Bebas Neue.'],
        ['What you expected', 'It to work.', 'The headline to show in Bebas Neue.'],
        ['What happened', 'It broke.', 'The text disappeared from the canvas but is still listed in the Layers panel.'],
      ] },
      { t: 'list', items: [
        "**Number the steps**, starting from something anyone can do, such as ‘Pick Instagram post on the start screen’.",
        "**Copy any message word for word.** Messages such as **Export failed. Try a smaller size.** point straight at the cause.",
        "**Give sizes.** The design size, the size of the photo you added, the export scale. Many problems only appear with large files.",
        "**Say whether it used to work.** ‘This worked last week’ narrows the search a lot.",
        "**One problem per report.** Two bugs in one report often means one gets missed.",
      ] },
      { t: 'tip', text: "If it involves a particular file, describe it (a 40 layer PSD, a 12 page PDF) rather than attaching it. A description is usually enough." },

      { t: 'h', text: 'The form, field by field' },
      { t: 'table', head: ['Field', 'What to put'], rows: [
        ['What went wrong?', 'One line. The only required field.'],
        ['Where?', 'The part of Voidcanvas. It is filled in from the page you came from; change it if that is wrong.'],
        ['How can we make it happen?', 'Your numbered steps. The most useful part of any report.'],
        ['What did you expect instead?', 'What you thought would happen.'],
        ['How much does it get in the way?', '**Stops my work**, **Gets in the way** or **Looks wrong**.'],
        ['Does it happen every time?', '**Every time**, **Sometimes** or **Only once**.'],
        ['Email', 'Optional. Only if you want a reply.'],
      ] },

      { t: 'h', text: 'What is attached, and what is not' },
      { t: 'p', text: "**Include technical details** is ticked by default. Untick it and only what you typed is sent. With it on, the report also carries:" },
      { t: 'list', items: [
        "The page you were on, device type (desktop, tablet or phone), browser, operating system, screen and window size, language, time zone, and whether Voidcanvas is installed as an app.",
        "The ids of the last few commands you used, such as `layer.duplicate`. Never their content.",
        "Up to five recent error messages from this tab, with any web addresses removed.",
      ] },
      { t: 'p', text: "Press **See exactly what is sent** to read every value before you send. Your images, file names, text and layers are never included. Bug reports are sent even when anonymous usage counts are off, because you chose to send one. See [Privacy and data](/learn/privacy-and-data)." },

      { t: 'h', text: 'After you send it' },
      { t: 'p', text: "Your work stays safe on your device while you wait for a fix. If a problem is blocking you, export what you have and keep a .void copy. See [Saving and your files](/learn/saving-and-your-files)." },
    ],
  },
]
