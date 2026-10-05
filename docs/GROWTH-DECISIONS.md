# Growth OS decision policy

Status: phase 6

The decision engine turns measured acquisition outcomes into recommendations. It is intentionally conservative. These thresholds are policy, not hidden implementation detail.

## Core rule

Optimise for **activated designers**, not visits, impressions or clicks.

Activation is defined by the Growth OS analytics layer as a session that:

1. starts, opens or imports a design,
2. records at least three meaningful editing steps,
3. then saves or exports.

## Minimum evidence

No source, landing page or campaign receives an action recommendation below 20 measured sessions.

A lack of evidence produces **Hold**, not a winner or loser.

## Sources

### Amplify — A2 candidate

A source may be recommended for bounded amplification when:

- at least 25 sessions,
- at least 8 activated designers,
- activation rate at least 30%.

Amplify means increase owned distribution in a capped step and re-measure. It does not mean unlimited spend or posting.

### Fix — A1

A source is sent for diagnosis when:

- at least 35 sessions,
- activation rate 7% or lower.

This is a founder/owner exception because the root cause may be positioning, intent mismatch, landing UX or product friction.

## Landing pages

### Amplify — A2 candidate

- at least 25 sessions,
- at least 8 activated designers,
- activation rate at least 32%.

### Fix — A1

- at least 35 sessions,
- activation rate 8% or lower.

The required response is diagnosis before traffic expansion: promise-to-product fit, first interaction, mobile UX, errors and CTA.

## Campaigns

### Repeat — A2 candidate

- at least 25 sessions,
- at least 8 activated designers,
- activation rate at least 30%.

Repeat means create another bounded variation around the same user job and destination. It does not mean duplicate-post spam.

### Pause candidate — A1

- at least 40 sessions,
- activation rate 5% or lower.

The system never automatically deletes, blacklists or permanently stops a campaign from this rule. A human reviews the mismatch first.

## Experiments

Experiment rules are stricter and live in `src/growth/experiments.ts`:

- under 25 exposed sessions per variant: collecting evidence only,
- 25+ per variant may show a directional lead,
- future A3 allocation eligibility requires at least 100 sessions per variant and a 10 percentage-point activation lead.

A directional lead is not described as statistical significance.

## Autonomy meanings

- **A0**: observe/hold.
- **A1**: human judgement required.
- **A2**: eligible for a future bounded executor on owned/reversible surfaces.
- **A3**: only after stronger evidence plus channel-specific rate, budget and rollback controls.

The phase-6 decision engine does not itself publish, spend money, delete content or change allocation. It produces the governed action queue that later executors must obey.

## Concurrent-agent discipline

When another agent or workstream is changing the repository at the same time:

1. inspect current master and open PRs before starting or resuming a slice,
2. compare changed filenames before writing or merging,
3. never merge a branch that has diverged from a newer production head without reconciling it,
4. rebuild or rebase the slice from current master when concurrent work has advanced production,
5. re-check master immediately before merge,
6. keep unrelated workstreams in separate PRs and let CI validate the combined production base.

If two active PRs touch the same production file, treat that as a coordination exception and reconcile before either merge. Do not rely on Git conflict detection alone to protect semantics.

## Changing thresholds

A threshold change must:

1. modify this document and the implementation together,
2. update or add unit tests,
3. pass repository CI,
4. avoid making a previously human-gated destructive action autonomous without an explicit policy review.
