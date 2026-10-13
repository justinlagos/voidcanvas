# Sprint B.1 fixes (Issues A/B/C) — implemented, unit-verified, browser-gated
Commit scope: `flags.ts` rollout gate, `e2e/unified-slice.mjs` rewrite, `flags.test.ts`.

## A. Flag persistence fixed
Old behaviour: `?unified=1` wrote `localStorage`, permanently enabling the slice.
New: sessionStorage only (tab lifetime); `?unified=1` honoured solely on
non-production hosts (`voidcanvas.app`/`www` excluded); `?unified=0` or
`revokeUnifiedOptIn()` revokes; `requestUnifiedOptIn()` is the deliberate
programmatic path and grants no permissions itself (future cloud ops still
require server-side auth). Disabled = UI returns null, no document contact.
7 unit tests: SSR-off, prod query ignored, dev/preview enable, revocation,
session scope, host classification. `panel-integration.test.ts` mocks the
gate module and is unaffected.

## B. Undo/redo assertions verify real state
Sequence per edit: initial value (opacity 1) → number-field fill + Tab
(blur commits via shared transaction) → assert 0.4 + exactly one new history
step + selection preserved + siblings untouched → Ctrl+Z (documented
`edit.undo`) → assert 1 + index step back → Ctrl+Shift+Z (documented
`edit.redo`) → assert 0.4 + index restored.

## C. E2E infra hardened
Auto-creates `e2e/evidence/`; missing `__vcCheck` now FAILS (was tolerated);
captures pageerror/console-error/failed-requests (status ≥ 400 included);
screenshots the real editor per object kind + flag-off; writes
`unified-slice-report.json`; flag-off uses `?unified=0` revocation. No
unexecuted test reports pass.

## Status
tsc clean, 358/358 unit green. Browser execution still requires a provisioned
runner (no OS libs/sudo and no build memory in the agent sandbox) — run
`BASE=<exact-commit-preview> node e2e/unified-slice.mjs` in CI/authorised env.
No pushes made from the sandbox (no credentials); no merges; no AI costs.
