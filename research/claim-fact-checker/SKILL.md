---
name: claim-fact-checker
description: "Use to fact-check, claims-audit or source-check a research report, paper review or other deliverable, one verifier subagent per claim."
---

# Claim fact-checker

## What this is and why it exists

A deliverable that makes factual claims (a research report, a paper review, a news item) is only as trustworthy as the link from each claim to a real source. A single agent verifying a 50-claim document in one context window drifts: it tires, it starts trusting its own earlier judgements (self-preferential bias), and it declares the job done after the first 35 claims (agentic laziness).

This skill defeats that by **fanning out**: an extractor lists every claim, then **one verifier subagent checks exactly one claim in its own clean context**, and a **source-quality skeptic** re-checks the cited source. No single context holds the whole job, so quality does not decay with length. Three presets cover three kinds of deliverable; the checking machinery is the same in each.

**It does not edit the deliverable.** It produces a *findings* file and a *fix-plan* file. A separate, authorised step applies only the requested fixes. Findings and fix-plans do not authorise inserting qualifications, checks or elaboration into the deliverable. The audit trail must be independent of the author.

## When to use which preset

| Preset | Deliverable | Sources verified against |
|---|---|---|
| `research-report` | a report plus its README, atomic notes and evidence file | archived primary sources in `sources/` |
| `ai-paper-reviews` | reviews of one paper, `reviews/{folder}-review-*.md` | that paper's extracted `{folder}-fulltext.md` + figures + tables |
| `ai-news-tracking` | curated news items and the chapters built from them | the collection's archived full article text |

Presets live in `presets/*.json`. They differ in source-quality strictness (`primaryRule`), where to read targets and sources, and domain framing (paper reviews care about "does the review reflect the paper"; news items care about verbatim quotes).

The globs in each preset encode one workspace layout — a folder per entry with an adjacent `sources/` directory, a folder per paper with its extracted fulltext, a collection folder with `items/` and `sources/`. **Treat them as defaults to edit, not requirements.** If your deliverables and archived sources live elsewhere, change `targetGlob`, `sourcesGlob` and `outputDir` to match; nothing else in the workflow depends on those paths, because the caller resolves them before the run.

## How to run it

This is a **hybrid** flow: resolve paths inline first (the workflow has no filesystem access), then hand the resolved lists to the `Workflow` tool.

1. **Pick the preset** matching the deliverable in front of you and read it from `presets/`.
2. **Resolve paths.** Glob the preset's `targetGlob` and `sourcesGlob` into absolute file lists. For per-entity presets (paper folder, collection name), substitute `{folder}` / `{name}` first. If there are no archived sources, say so — the run will mark everything unsourced, which is itself a finding.
3. **Run the workflow** with `Workflow({ scriptPath: "<this skill>/workflows/fact-check.workflow.js", args })` where:

   ```json
   {
     "label": "paper review: warmth-2024, critical style",
     "domain": "paper-review",
     "targets": ["/abs/path/reviews/warmth-2024-review-critical.md"],
     "sources": ["/abs/path/warmth-2024-fulltext.md", "/abs/path/tables/warmth-2024-table-01.md"],
     "primaryRule": "moderate",
     "guidance": "<the preset's guidance string>"
   }
   ```

   Pass `args` as a real JSON object, not a stringified one.
4. **Write the outputs.** The workflow RETURNS `{ summary, counts, flaggedCount, factcheckMd, fixplanMd }` — it does not write files itself, so the run never depends on a subagent's write permissions. Write `factcheckMd` and `fixplanMd` to the preset's `outputDir`, named per the preset's `outputNames` (use a `YYYYMMDD-HHMMSS` timestamp for `{ts}`). Create `outputDir` if missing.
5. **Report** the summary and the flagged count; offer to apply the fix-plan.

## Token cost — read before running

Each claim spawns two subagents (verifier + skeptic). A 40-claim report is ~80 subagent calls. That is the right cost for a pre-publication audit of a high-value deliverable, and the wrong cost for a quick sanity check. Controls:

- **Scope down**: pass only the one review / one item / one section you actually changed, not the whole collection.
- **Budget**: prompt the workflow run with a token budget when invoking (e.g. add "use ~60k tokens" to the surrounding request) so it caps.
- **Skip the skeptic** for low-stakes runs by setting `primaryRule` framing accordingly — the verifier still records the cited source.

If the deliverable is short (a handful of claims), one agent reading it straight through against the sources is cheaper and just as good; reach for this fan-out when length is the risk.

## Verdicts

See `references/verdicts.md` for the full rubric (verified / verified-secondary / unsourced / contradicted / misattributed / quote-mismatch / prescription-detected, plus source tiers). Verdicts are reasoning, not keyword matches: **semantics over grep**.

## Codex equivalent

In Codex, define `claim_verifier` and `source_skeptic` custom agents (TOML, read-only sandbox) and drive the fan-out with `spawn_agents_on_csv` — one claim per CSV row, `output_schema` matching the verdict shape. The per-claim isolation is the same; the difference is Codex orchestrates predeclared agents over a CSV rather than running this generated JavaScript harness.
