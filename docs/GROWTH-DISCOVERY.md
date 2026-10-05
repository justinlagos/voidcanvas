# Growth OS search discovery

Status: phase 7

Growth OS does not maintain a second keyword-research system. It consumes the existing Learn SEO research under `research/learn-seo/` and keeps that evidence distinct from the strategic opportunity queue in `src/growth/opportunities.ts`.

## Existing evidence

The current Learn research documents 161 opportunities across 16 clusters. Its sources are:

- Google autocomplete query evidence collected by the existing research scripts,
- the annotated autocomplete dataset,
- hand-reviewed SERP notes,
- the curated `research/learn-seo/opportunities.csv` database.

The research explicitly does **not** contain search-volume figures. Competition and opportunity are L/M/H assessments derived from SERP notes and query specificity. Growth OS must preserve that limitation.

It must not invent or present:

- search volume,
- CPC,
- keyword difficulty,
- traffic forecasts,
- statistical confidence that the source research does not contain.

## Two opportunity systems, two jobs

### Strategic opportunities

`src/growth/opportunities.ts`

These are product/distribution bets such as Cascade, quick tools, PSD workflows, editable project sharing, agency production and education. They include product advantage, conversion potential, risk and autonomy policy.

### Search evidence backlog

`research/learn-seo/opportunities.csv` → `scripts/growth-discovery.mjs`

These are query/problem opportunities supported by the existing search research. The generated artifact is `public/growth-discovery.json`.

The two systems should inform each other, but they are not merged into one fake precision score.

## Evidence score

`src/growth/discovery.ts` calculates a 0–100 evidence score from fields that really exist in the research:

- opportunity assessment: L/M/H,
- competition assessment: L/M/H,
- roadmap priority: 1–5,
- whether a clear product connection exists,
- whether a documented gap exists,
- a small intent weighting for commercial/workflow queries.

It does not use invented volume or difficulty.

## Actions

The search backlog produces four bounded recommendations:

- **Protect**: a live, high-evidence surface. Preserve intent and monitor activation before rewriting it.
- **Improve**: an existing/live surface with evidence but a weaker current fit or incomplete answer.
- **Build**: a planned opportunity with enough evidence to enter the owned-content build queue.
- **Hold**: insufficient evidence for autonomous work.

A Build recommendation is not permission to generate a thin SEO page. The normal Growth publication gates still apply: unique intent, product truth, real CTA/product connection, mobile/desktop validation and build/tests.

## Generation contract

`scripts/growth-discovery.mjs`:

1. reads `research/learn-seo/opportunities.csv`,
2. validates the exact expected schema,
3. rejects malformed evidence levels/status/priority,
4. rejects duplicate queries,
5. writes a deterministic JSON artifact to `public/growth-discovery.json`,
6. embeds the evidence disclaimer in the artifact itself.

The generator does not fetch the web and does not mutate the source research.

## Refreshing discovery

Fresh search research remains owned by the existing Learn research pipeline. When that pipeline updates the CSV, the Growth artifact should be regenerated and reviewed through normal CI.

Growth OS may later compare the search backlog against measured VoidCanvas activation. It should prefer measured product outcomes over raw search evidence once a page or tool is live.

## Concurrent-agent rule

Do not edit `package.json` or CI wiring while another active PR owns those files. Build the discovery model/parser in isolated files, then reconcile from the newest master and add generation wiring only after the concurrent workstream has landed or been explicitly coordinated.
