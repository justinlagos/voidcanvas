# Writer brief for the Voidcanvas Learn library

Repo: /home/claude/vc (Next.js 14, TypeScript). Voidcanvas is a free design suite that runs entirely in the browser: Studio (jobs, briefs, brand guidelines), Editor (layered image editor), Effects (one-click image effects) and quick tools (/tools/halftone, /tools/dither, /tools/glitch). Nothing is uploaded; designs live in the browser (IndexedDB). Made by MotionPlay Labs.

## Your job
Write the articles assigned to you as a TypeScript file exporting `export const articles: Article[] = [...]`, importing the type with `import type { Article } from '../types'`. Schema and inline markup: src/content/types.ts. Full slug plan: src/content/learn/PLAN.md. Link only to slugs in PLAN.md, as `[label](/learn/<slug>)`.

## Accuracy is the whole point
- Read the code before you write. Every menu name, button label, panel name, shortcut, number, preset, format and setting you mention must exist in the code, spelled as the UI spells it. Grep for labels. Key sources: src/editor/actions.ts (every command, menu and shortcut), src/editor/components/*, src/editor/presets.ts, src/editor/io.ts, src/editor/import-formats.ts, src/studio/**, src/components/effect-list.ts, src/components/ParamControls.tsx, src/tools/defs.ts, README.md, docs/plans/editor-ux.md.
- If you cannot confirm something in the code, leave it out. Never invent features, numbers, testimonials or future plans.
- On shortcuts: the app uses Ctrl on Windows/Linux and Cmd on Mac (see prettyKey). Write "Ctrl+K" and note once per article where helpful that Mac uses Cmd.

## Voice
- Plain English, terse and direct, second person. Short sentences. Explain why as well as how.
- No em dashes (—) anywhere, and no en dashes as punctuation. Use commas, colons, full stops, or brackets.
- No marketing language or hype ("powerful", "seamless", "unleash", "effortless", "game-changer", "robust", "cutting-edge", "elevate", "supercharge"). No "In this article we will". No exclamation marks.
- British spelling in prose (colour, organise), but UI labels exactly as the code spells them.
- Sentence case titles.

## Shape of a good article
- First block: a `p` saying what the reader will be able to do and when it matters (2 to 3 sentences).
- Then `h` sections. Use `steps` for procedures, `keys` for shortcut tables, `table` for comparisons/settings, `tip`/`note`/`warn` sparingly, `try` once or twice to deep-link into the product (/editor, /studio, /effects, /tools/halftone ...).
- Include a "Common problems" or "Good to know" section where real pitfalls exist (read the code for limits: max sizes, undo depth, what PSD import drops, etc.).
- 400 to 1400 words per article depending on topic. Reference articles can be longer. Depth over breadth: settings explained with what they do visually, not just listed.
- Set `updated: '2026-09-25'`, a fitting `level`, 2 to 4 `related` slugs, and `keywords` with synonyms people search for (e.g. "cutout transparent png" for background removal).
- Mention phone/touch behaviour where the feature works differently on mobile (see src/editor/components/MobileEditor.tsx).

## Check before you finish
- `grep -n '—\|–' <yourfile>` returns nothing.
- `npx tsc --noEmit -p /home/claude/vc` shows no errors in your file (other files may still be in progress; ignore errors outside your file).
- Every slug you link exists in PLAN.md. Every slug you define matches PLAN.md for your file.
- Report back: list of slugs written, and any facts you were unsure about and left out.
