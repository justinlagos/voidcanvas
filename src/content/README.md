# Learn and Blog content

- Learn articles: `learn/*.ts`, one file per group, typed by `types.ts`. Plan of slugs in `learn/PLAN.md`, writing rules in `learn/BRIEF.md`.
- Blog posts: `blog/posts.ts`. One post a week, dated on a Friday. A post dated in the future is queued: it is hidden from /blog, the RSS feed, the sitemap and the landing page until its date (London time). Blog pages and the landing page revalidate hourly, so a queued post appears on its day without a redeploy.
- Keep the queue at least four weeks ahead. Every fact must be checked against the code (see BRIEF.md). No em dashes.
