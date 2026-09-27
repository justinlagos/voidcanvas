# Learn

Learn is the design knowledge layer of Voidcanvas: guides that answer real design questions, then show the steps in the product. Since September 2026 it is organised around what a person is trying to do, not around the software's modules.

## Architecture

```
SEARCH  ->  WHAT ARE YOU TRYING TO DO?  ->  ANSWER  ->  GUIDE  ->  DEEPER LEARNING  ->  TRY IT IN VOIDCANVAS
/learn      goal chips, /learn/do/<goal>    answer     body     before / next / if     product block, banner
```

- `/learn` the hub: search first, goals second, then problems, tools, craft, workflows, reference and the full topic index.
- `/learn/do/<goal>` a route: the short answer, the guides in order with a reason each, the honest product paragraph, questions people ask. Fourteen goals in `src/content/learn/goals.ts`.
- `/learn/topic/<category>` the eight topic pages (breadcrumb targets and complete lists).
- `/learn/<slug>` a guide. Cornerstones open with a quick answer and close with "How Voidcanvas handles this"; every guide ends with contextual links (Before you start, Next, If…) and a Try banner when it has no product block of its own.
- `/og/learn/<slug>`, `/og/learn/do/<goal>`, `/og/learn-hub` Open Graph images drawn with next/og as static route handlers, so the desktop export can prerender them.

## Content model

Articles are TypeScript data (`src/content/types.ts`). Blocks added for the problem-first layer:

| Block | Use |
|---|---|
| `answer` | The quick answer, one paragraph, first block of a cornerstone. Also the search result line and the OG image text. |
| `checklist` | A short list to tick through before exporting or sending. |
| `faq` | Real questions people search for. Emits FAQPage schema. Use only when the questions are genuine. |
| `product` | "How Voidcanvas handles this": one honest paragraph and one button. |
| `figure` | An image from /public with alt, width and height. |
| `demo` | An interactive example: `effect` (any effect on a sample image), `print-setup`, `size-calculator`, `type-scale`, `before-after`. Loaded only on pages that use it. |

Article fields added: `published`, `seoTitle`, `description`, `answers` (the searches it answers), `goals`, `feature`, `role` (cornerstone, supporting, reference), `guide` (before, next, also). For the 74 older guides these live in `src/content/learn/signposts.ts` and are merged in `index.ts`; new guides carry them directly (`src/content/learn/problems.ts`).

## Search

`src/content/learn/search.ts` is a pure function over the light index. Query words are stop-worded and lightly stemmed, then matched against the title, the `answers` phrases, the summary and the headings and keywords, with a concept map (`concepts.ts`) so "blurry" reaches the resolution guide and "photoshop masks" reaches masks. Goals are searched separately and shown as a route above the guides. Tests in `src/content/__tests__/learn.test.ts` pin the five persona searches.

## SEO

- Title tags: `pageTitle()` in `seo.ts` keeps the site name only while the whole title stays near 60 characters.
- Meta descriptions: `metaDescription()` cuts at a sentence end under 158 characters; use `description` on the article when the summary is too long.
- Schema: TechArticle (datePublished, dateModified, author, image, mainEntityOfPage, isPartOf), BreadcrumbList to the topic page, FAQPage when a `faq` block exists; CollectionPage plus ItemList on the hub, routes and topics.
- Sitemap: hub 0.9, routes 0.7, cornerstones 0.8, supporting 0.6, reference and topics 0.5.
- No em dashes anywhere; the content test fails on one.

## Editing rules

- Answer first. If a guide has a `answers` list, the first paragraph should answer the first of them.
- Every product claim is checked against the code. The writer brief is `src/content/learn/BRIEF.md`.
- Link only to slugs that exist; `danglingSlugs()` and the tests catch the rest.
- When a new guide answers a query better than an old one, add the old one to the new guide's `guide.next` or `also`, and point the old one's `guide.before` at the new one. Do not delete.
- Regenerate the linking map with `node research/learn-seo/linking-map.mjs` after changing goals, signposts or problems.

## Research

`research/learn-seo/` holds the audit, the raw Google Suggest data (3,900 requests, 32k rows, 26k unique suggestions, method in `collect-autocomplete.py`), the annotated dataset and clusters, the SERP notes, the 161-row opportunity database, the roadmap and the linking map. Rerun `collect-autocomplete.py`, `annotate.py`, `opportunities.py` and `linking-map.mjs` to refresh.

## Checks

`npx vitest run` (content and search tests), `e2e/learn.mjs` (hub, search, goals, article layer, demos, schema, sitemap, OG, phone), and the desktop export must still build (`DESKTOP=1 npx next build`).
