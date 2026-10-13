# Zero-cost release feasibility — 2026-10-13

## Verified repository properties

- The live release at baseline is `36b180e8fed7a618501aaa6bee7cc4efd91c0d27` (C1/C1.1).
- Netlify's October free-tier **build-minute allowance is exhausted**; the existing published site remains online, but new Netlify builds are paused.
- `next.config.js` builds a regular Next.js 14 application for the web. `DESKTOP=1` invokes a separate static export for the desktop app; that output must **not** be substituted for the web app.
- `src/app/api/brand/[slug]/route.web.tsx` provides a server route. Brand publishing uses `@netlify/blobs` and a Netlify runtime. A move requires a storage and route compatibility design.
- `netlify.toml` already skips Netlify Deploy Preview and branch builds; production builds are unchanged. Build configuration is in Netlify UI.
- Image assets, `.void` persistence, and many editor operations execute in the browser; that does **not** make the entire web application static.

## What has actually been implemented

`.github/workflows/release-readiness.yml` runs only by manual dispatch with a **full exact commit SHA**. It checks out that commit with non-persistent credentials, runs TypeScript and unit tests, builds and starts the *real* Next.js web application, smokes key routes, and executes the native asset Playwright gate. No production publishing, Netlify build trigger, hosting secrets, or DNS mutation occurs. Workflow execution and outcomes still require a GitHub Actions run.

## Hosting decisions / open questions

1. **Netlify external build + prebuilt deploy: UNVERIFIED.** Verify using a non-production site with Next.js runtime assets and matching Netlify plugin version. Netlify CLI manual deploy support does **not** prove that paused free teams accept uploads. Do not try this against production or trigger repeated paid/blocked builds.
2. **Cloudflare Workers/OpenNext: UNVERIFIED.** Build and check worker bundle size, routes, render behavior and all quotas. Netlify Blobs cannot simply be assumed compatible; the brand persistence adapter requires work. Use a temporary domain and no paid plan.
3. **Other hosts: UNVERIFIED.** Evaluate actual Next.js and backend compatibility, free quotas and commercial terms before recommending migration.
4. **Release control.** A green Actions run means *candidate verified*, not deployed. Keep an explicit human approval step for merge and production rollout. A production merge may still activate Netlify's Git integration when allowance resets. A tested production publishing path and rollback procedure must be approved separately.

## Required evidence before claiming continuous zero-cost releases

- Real successful deployment to a non-production test site, complete server-function and storage validation.
- Compatibility tests for Editor, Effects, Cascade, Studio, Brand, `.void` v6 reopen, PNG/PDF and mobile.
- Usage/quotas report with explicit limits, account-specific plan details and failure behavior.
- Measured CI runtime, per-deploy frequency policy, security review, exact-commit rollback.
- No domain switch, plan upgrade or production deploy until written approval.

## Safe interim process

Implement and test on feature branches; run CI and the manual readiness workflow; merge only with approval. The old Netlify production deployment continues serving traffic while builds are paused. Do not promise that any particular hosting provider can remain permanently free under growth.
