# VoidCanvas Growth OS

Status: phases 1 to 7 on master; admin functions live in Supabase since 5 Oct 2026 (see `docs/plans/CURRENT-STATUS.md`)

## Goal

Build distribution into VoidCanvas so acquisition, activation, sharing, retention and learning compound with minimal founder intervention.

The system must automate repeatable work while keeping founder judgment for irreversible, legal, reputational or strategic decisions.

## Non-negotiables

1. One source of truth. Extend the existing anonymous first-party analytics pipeline instead of adding a second analytics stack.
2. Privacy stays product-level. Never collect image pixels, design text, filenames, layer names or private creative content for growth.
3. Product truth before marketing copy. Automated claims must come from a structured capability registry or verified external source.
4. No autonomous spam. Community participation, cold outreach, partnerships and sensitive public replies stay approval-gated until a channel earns higher autonomy.
5. Every autonomous publisher gets a kill switch, rate limit, duplicate guard and failure log.
6. Nothing is published from generation alone. Generated output must pass deterministic validation and, where relevant, browser checks.
7. Optimise for activated designers and retained designers, not impressions.
8. Growth experiments must be reversible.

## North-star model

A visitor becomes progressively more valuable when they:

1. discover VoidCanvas,
2. start a useful task,
3. perform meaningful creative work,
4. export/save/share,
5. return,
6. create an artefact that brings another person back.

The initial north-star metric is **Activated Designers per Week**.

An activated designer is an anonymous device/session that starts a design, records at least three meaningful editing steps and then saves, exports or continues meaningful work. The exact production definition should live in the analytics RPC so it can be changed without changing client instrumentation.

Secondary metrics:

- discovery to editor rate
- editor to meaningful-work rate
- meaningful-work to export/save rate
- 7-day return rate
- shared-project assisted acquisition
- activated designers per acquisition source
- activated designers per landing page
- activated designers per experiment

## Architecture

### 1. Knowledge registry

`src/growth/knowledge.ts`

Canonical, machine-readable product truths used by growth code. A statement that can change with the product should not be independently rewritten across generated pages.

### 2. Opportunity engine

`src/growth/opportunities.ts`

Each opportunity records:

- audience intent
- problem
- matching VoidCanvas capability
- demand estimate
- VoidCanvas advantage
- conversion potential
- shareability
- competition
- confidence
- risk
- recommended surface
- automation level

The ranking function is deterministic and tested.

### 3. Existing analytics

`src/lib/analytics.ts` already provides anonymous sessions, campaign tags, referrers, meaningful actions, exports, retention signals, errors, friction and privacy controls. Growth work extends that event vocabulary instead of replacing it.

### 4. Growth control room

`/admin/growth`

The first version exposes the prioritised opportunity queue and autonomy boundaries. Later versions should combine it with live source/campaign/landing conversion data from the existing Supabase analytics RPCs.

### 5. Factories

Factories are introduced one by one after measurement is trustworthy:

- Tool Factory
- Learn Factory
- release distribution pack
- template pack
- visual/social pack
- comparison-page updater
- creator/partner queue

A factory is a renderer from structured, validated input. It is not an unconstrained prompt that directly publishes pages.

## Opportunity scoring

Scores are intentionally understandable rather than opaque.

Positive factors:

- demand
- product relevance
- VoidCanvas advantage
- conversion potential
- shareability
- confidence

Negative factors:

- competition
- execution risk

All factors are 0 to 10. The scorer returns 0 to 100 and is covered by unit tests.

The engine should prefer opportunities where VoidCanvas has a native advantage such as Cascade, browser-local editing, `.void` portability, `.void.png`, professional layers/masks, PSD workflows or interactive effect tools.

## Autonomy levels

### A0 — observe

The system measures and recommends only.

### A1 — prepare

The system researches, drafts and assembles assets. A person approves publication.

### A2 — publish low risk

Deterministic, reversible, low-risk outputs may publish after automated checks. Examples: internal links, sitemaps, metadata derived from approved structured content, validated tool pages built from an existing engine.

### A3 — optimise

The system can allocate production toward winning low-risk experiments and retire weak ones inside approved limits.

Never A3 by default:

- pricing or billing claims
- legal/compliance claims
- competitor claims not backed by current evidence
- partnership commitments
- cold outreach at scale
- community replies pretending to be a human
- public statements about incidents
- destructive data migrations

## Validation gates

A public growth artefact cannot move to A2 unless applicable checks pass:

- capability exists in knowledge registry
- route is unique
- search intent is not already satisfied by a canonical page
- title and description are within configured bounds
- no unsupported comparative claim
- CTA resolves
- editor handoff resolves where promised
- no console error in browser check
- desktop viewport passes
- mobile viewport passes
- structured data parses where present
- canonical and robots directives are correct
- attribution tags survive the handoff
- build and tests pass

## Channel policy

### Search / tools / Learn

Target A2/A3. These are owned, reversible surfaces and should become the most automated channel.

### Pinterest and owned social accounts

Target A2 after official API integration, rate limits, asset QA and duplicate detection.

### LinkedIn company presence

Target A1 initially, A2 for approved recurring formats only.

### Reddit, forums and communities

A0/A1. Detect relevant discussions and prepare useful responses. Do not build an autonomous link-dropping bot.

### Creator and agency outreach

A1. Rank prospects and prepare specific outreach. Human approval stays until deliverability, tone and response quality are proven.

### Partnerships

A0/A1 only.

## Build phases

### Foundation — now

- canonical growth knowledge
- opportunity model and scoring
- seeded opportunity queue
- growth admin route
- unit tests
- architecture document

### Measurement

- source + campaign + landing attribution views in admin
- activation definition in server analytics
- cohort/source conversion
- experiment IDs in client events
- shared-project/referral attribution

### Owned acquisition factories

- config-driven tool-page factory
- Learn-to-tool interactive handoffs
- automatic related-content graph
- sitemap and metadata validation
- release distribution pack generation

### Viral product loops

- share editable project
- Open in VoidCanvas deep-link contract
- `.void` and `.void.png` attribution without watermarks
- public template/recipe pages
- creator attribution

### External distribution

- Pinterest publisher
- company LinkedIn publisher
- creator/agency prospect queue
- education pack generator
- resource-site Open in VoidCanvas integration kit

### Optimisation

- experiment allocation
- automatic title/thumbnail iteration within bounds
- kill rules
- anomaly detection
- weekly executive summary
- product-priority recommendations from demand × failure × value

## Founder workload target

The end-state founder queue should contain only decisions that materially affect positioning, money, reputation or relationships.

Everything else should be represented as:

- automatically completed,
- automatically stopped with reason, or
- queued with one concise decision.

A healthy weekly founder dashboard should be understandable in under five minutes.
