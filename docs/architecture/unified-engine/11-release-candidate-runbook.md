# Release-Candidate Runbook (authorised environment only)
Integration path: `master (8d423b5)` → Sprint A (`c7f8fb7`, branch `docs/unified-engine-sprint-a`)
→ Sprint B/B.1 (`3627d98`, `98c3f8a`, `ac6d6ab`, branch `feat/unified-sprint-b`).
Sprint B was cherry-picked onto Sprint A so spec + implementation travel together.
Do NOT push directly to `master` (that triggers the Netlify production deploy).

## 1. Push + PRs (needs GitHub credentials; impossible from the agent sandbox)
git push origin docs/unified-engine-sprint-a
git push origin feat/unified-sprint-b
# Open two PRs against master: Sprint A docs first, then Sprint B feature.
# Existing ci.yml already runs on pull_request: npm ci, growth:discovery-test,
# tsc --noEmit, vitest, brand baselines, and `next build`.

## 2. CI gate (7GB GitHub runner — sandbox OOM does not apply)
Required green: Types, Unit tests, Brand baselines, Build.
Then download the CI build artifact or deploy the PR preview.

## 3. Browser gate (real production build, BASE=<preview-url>)
node e2e/unified-slice.mjs  # flag-on selection/inspector/edit/undo + flag-off inertness
# Expected: mixed doc shape+text+raster; per-kind unified-context; unified slider
# commits opacity 0.4; undo/redo cross object types; zoom stable; no page errors;
# flag-off renders no unified UI and existing transactions intact.
# Screenshots land in e2e/evidence/. Pixel tolerances (ratify on first run):
# antialias edges ±2/255 per channel, flat fills exact, export dims exact,
# mask-feather zone excluded from comparison.

## 4. Merge order
Merge Sprint A PR first, rebase/merge Sprint B PR onto new master, keep flags off
by default. No cloud providers, no API charges at any step (mock-test-provider only).
