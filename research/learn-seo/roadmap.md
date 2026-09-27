# Learn content roadmap

Ranked from the research in this folder: `autocomplete-annotated.csv` (what people type), `serp-notes.md` (who answers it today and how), `opportunity-map.md` (161 specific ideas), `audit.md` (what already exists). Nothing here is ranked by a volume number, because none was collected. Ranking is by the six criteria the brief set, each scored 1 to 3 and shown in the tables:

- **Intent** (I): how clearly the query says what the person wants to do.
- **Severity** (S): how much it costs them not to have the answer (a reprint, a lost client, a wasted evening).
- **Relevance** (R): whether Voidcanvas does the thing, not just talks about it.
- **Better answer** (B): whether we can beat what ranks now (live example, honest limits, numbers).
- **SEO opportunity** (O): competition and the gap seen in the SERP.
- **Conversion** (C): how naturally the answer ends in the product.

## Tier 1: cornerstones (one per cluster, carry the topical authority)

| Page | Status | I | S | R | B | O | C | Why it leads |
|---|---|---|---|---|---|---|---|---|
| How to prepare a poster for print | live | 3 | 3 | 3 | 3 | 2 | 3 | The most complete print query; printers own the SERP with thin pages; interactive setup and calculator are unique. |
| How to edit a PSD without Photoshop | live | 3 | 3 | 3 | 3 | 2 | 3 | Every ranking page is a listicle; nobody walks a file through; the import report is a real differentiator. |
| How to make a halftone portrait | live | 3 | 2 | 3 | 3 | 2 | 3 | Photoshop tutorials everywhere; a working halftone on the page plus the tool beats them. |
| How to make a design look less generic | live | 3 | 2 | 2 | 3 | 3 | 2 | SERP has drifted to AI UI; the graphic-design intent is open; craft authority. |
| Why your printed design looks blurry | live | 3 | 3 | 3 | 3 | 3 | 2 | SERP is inkjet troubleshooting; the design-side answer is unserved; retitles the resolution guide. |
| How to run a client design project | live | 3 | 3 | 3 | 2 | 2 | 3 | Advice lists rank; a concrete four-stage process with a tool is the better answer; Studio is the product. |
| How to make a risograph effect | live | 3 | 1 | 3 | 3 | 2 | 3 | Photoshop plus paid texture packs rank; the workflow exists and needs the query-shaped front door and a demo. |
| Photo editors that do not upload your photos | live | 2 | 2 | 3 | 3 | 3 | 3 | Mixed SERP, nobody explains how to check; it is the product's core promise. |
| Brand consistency in practice | live | 2 | 2 | 3 | 2 | 2 | 3 | Marketing blogs rank; the mechanical answer (kit, master, formats) is ours. |

The existing guides already carrying cornerstone weight, now signposted as such: designing-for-print, image-resolution-explained, building-a-brand-identity, brand-guidelines, import-psd-and-pdf, remove-background, resize-to-every-format, studio-overview, effects-overview, typography-fundamentals, colour-that-works, layout-and-composition, designing-for-social, editor-tour, layers, masks, adjustment-layers, retouching, type, privacy-and-data, workflow-textured-print-look.

## Tier 2: supporting high-intent pages (41 in the map)

Live so far: what a print-ready PDF is, how much bleed, dithering explained, the glitch effect explained, how to make a duotone image, why a print looks different from the screen, a design brief example and template, get client feedback you can act on, social media sizes and safe zones (with a live view of every format), coming from Photoshop, a brand colour palette that passes contrast, what dpi a poster should be (with the table from A4 to A0), RGB or CMYK for print, poster design rules, design a poster with no photo, offline design software (including the browser apps that work offline), the leaving Creative Cloud checklist, the comic book effect (with a live Pop Art example), halftone for screen printing and DTF (the lpi and mesh numbers), and the short open-a-PSD front door. Tier 2 is complete apart from the Canva-limit pages already answered inside the technique guides. The Canva-arrival phrasings ("can I clipping mask in Canva", "can I change blend mode in Canva", "can I resize images in Canva") were added as answers on the technique guides rather than as new pages.

Build order, by cluster, each linking up to its cornerstone:

1. **Print**: what a print-ready PDF is · how much bleed (with the pixel maths) · why a print looks different from the screen · RGB or CMYK in an RGB-only tool · what dpi a poster should be.
2. **PSD**: open a PSD for free in the browser · is a PSD editable (quick answer, live in the guide).
3. **Canva limits** (the "can I … in Canva" pattern is the clearest low-competition seam in the data): clipping masks · blend modes explained with examples · resize free · risograph effect.
4. **Effects**: dithering explained · glitch explained · how to make a duotone · comic book effect · halftone for screen printing and DTF.
5. **Client work**: design brief example and template · get client feedback you can act on.
6. **Brand**: brand colour palette that passes contrast · brand consistency in practice.
7. **Social**: social media sizes and safe zones (2026) with a diagram.
8. **Photoshop switching**: coming from Photoshop, the migration guide.
9. **Private and offline**: how to check whether a web tool uploads your images · offline design software including browser apps.
10. **Craft**: poster design rules · design a poster with no photo.

## Tier 3: long-tail problem pages (73 in the map)

Short, answer-first pages, most under 600 words, each with one demo or one screenshot and one CTA. Live so far (in `src/content/learn/longtail.ts`): fix a blurry image · PSD will not open · convert PSD to PNG · missing fonts in a PSD · crop an image into a circle · make a transparent PNG · outline text · put text on a path · YouTube thumbnail size · file naming and versioning. Examples: PSD will not open · PSD to PNG · missing fonts in a PSD · fix a blurry image · resize without losing quality · crop into a circle · outline text · use your own font · text on a path · realistic drop shadows · halftone gradient background · newspaper effect · vintage photo effect · photo to sketch · film grain · CRT look · YouTube thumbnails without Photoshop · carousel with boards · adapt a poster for social · file naming and versioning · what files to deliver · design handoff · present directions · logo clear space · brand identity for a small business · Chromebook · Linux · iPad.

## Tier 4: reference (22 in the map)

Upgrade the existing reference pages rather than spawning per-size pages: size presets gains the calculator and a with-bleed column; poster sizes and A-series in pixels as one table; business card size and the 96 dpi trap; DPI and PPI defined once; PNG, JPG, WebP quick answer; vector and raster; SVG export scope; the shortcuts comparison table for Photoshop users.

## Tier 5: experimental and emerging (16 in the map)

Position pieces and edge queries: AI without losing control (on-device only) · why an AI poster generator gives a generic poster · brand identity generators and what to do after one · generative fill outside Photoshop · when cloud AI editing fails · Photopea compared · instead of Canva by need · templates, honestly · halftone for video (scope note) · vector halftone (scope note). Write these only when a Tier 1 to 3 page in the same cluster exists to link to.

## Clusters and their pages

| Cluster | Cornerstone | Supporting (tier 2 and 3) | Reference (tier 4) |
|---|---|---|---|
| Print preparation | prepare-a-poster-for-print, designing-for-print | print-ready PDF, bleed, crop marks, print looks different, RGB/CMYK, poster dpi, print checklist, export-for-print, workflow-print-flyer | poster sizes, A5, business card, calculator |
| Blurry and resolution | image-resolution-explained (retitle) | fix blurry image, resize without losing quality, check resolution, blurry after upload, pixelated vs blurry, upscaling honestly | DPI defined, pixel/file/print size, pixels to inches |
| PSD | edit-a-psd-without-photoshop, import-psd-and-pdf | open PSD free, PSD not opening, PSD to PNG, PSD on a phone, missing fonts, smart objects, workflow-psd-to-social | file-formats |
| Photoshop switching | editor-tour (migration guide) | no-subscription checklist, thumbnails, Linux, iPad, posterize | shortcuts comparison, keyboard-shortcuts |
| Canva limits | (feeds masks, blend modes, halftone, resize) | clipping mask, blend modes, newspaper effect, print from a web tool, share a brand kit, guidelines to kit | |
| Effects | make-a-halftone-portrait, effects-overview, workflow-textured-print-look | screen-print settings, comic, duotone, dither, glitch, riso, vintage, sketch, pixel sort, grain, CRT, halftone background, brushes not needed | artistic/stylise/colour/distortion/texture effects |
| Photo editing | remove-background, retouching, adjustment-layers | no-upload editors, professional in five moves, laptop, circle crop, refine edge, transparent PNG, workflow-portrait-retouch | export-for-screen |
| Brand | building-a-brand-identity, brand-guidelines | consistency in practice, palette with contrast, checklist, clear space, small business, online free, font pairing, tokens, brand-kit, brands-library | brand-guideline-exports |
| Social and formats | designing-for-social, resize-to-every-format | safe zones, templates system, thumbnails, carousel, adapt a poster, workflow-social-campaign | size-presets, Instagram/story/LinkedIn quick answers |
| Client work | studio-overview | brief example, feedback, handoff, versioning, presenting, review process, deliverables, references-and-palettes, review-and-delivery-links, delivering-files | |
| Editor techniques | layers, masks, type | outline text, own font, gradient, text on a path, drop shadows, groups-align-guides, layer-styles | artboards, glossary |
| Private and offline | privacy-and-data | offline software, browser-based explained, no account, how to check uploads, Chromebook, GDPR, ai-on-this-device, private-session, desktop-app, install-as-an-app | saving-and-your-files |
| Craft and learning | make-your-design-look-less-generic, typography-fundamentals, layout-and-composition, colour-that-works | poster rules, poster without a photo, flyer structure, white space | glossary |
| File formats and templates | file-formats | templates honestly, save as template, SVG scope, PDF pages | PNG/JPG/WebP, vector/raster, .void |
| AI | ai-on-this-device | expand with AI fill, select subject, private AI | (tier 5 position pieces) |

## What was deliberately not done

- No bulk retitling of the 74 existing guides. Their slugs are indexed and their titles are honest; each gained `answers` phrases, a role, a feature label and contextual links instead. Retitle one at a time when a supporting page is written for it.
- No programmatic size pages (A5 in pixels, A4 in pixels, …). One reference page with a calculator answers all of them; the small tool sites already saturate that pattern.
- No head-term comparison listicles (best Photoshop alternative, best Canva alternative). The long tail (offline, private, no upload, PSD support, the "can I … in Canva" questions) is where the honest answer wins.
- No video. Every demo is an interactive that runs the product's own code.
