# claim-fact-checker

A fan-out fact-checking **dynamic workflow** for Claude Code. It verifies every non-obvious factual claim in a deliverable against its archived sources — **one isolated verifier subagent per claim**, plus a source-quality skeptic — and produces a *findings* + *fix-plan* pair. It never edits the deliverable.

It is the dynamic-workflow generalisation of a single-context fact-checker subagent: instead of one agent reading a whole report in a single context (where it tires, trusts its own earlier calls, and quits early on long documents), each claim is checked in a clean context so quality does not decay with length.

## Targets (presets)

| Preset | Deliverable | Verified against |
|---|---|---|
| `research-report` | `_REPORT-*.md`, README, atomic notes | `sources/` archived primaries |
| `paper-reviews` | `reviews/{folder}-review-*.md` | the paper's fulltext + figures + tables |
| `news-tracking` | collection `items/*.md` + chapters | the collection's `sources/` |

## Layout

- `SKILL.md` — the contract: when to trigger, how to run, token cost.
- `workflows/fact-check.workflow.js` — the harness (extract → per-claim verify+skeptic → synthesize).
- `presets/*.json` — per-repo target/source/strictness config.
- `references/verdicts.md` — verdict rubric.

## Use

Read `SKILL.md`. In short: resolve target + source paths, then
`Workflow({ scriptPath: "<this>/workflows/fact-check.workflow.js", args })`. The workflow returns the findings + fix-plan markdown; the caller writes them to the preset's output location.

Wire it into a host repo via a skill-dir symlink plus an AGENTS.md reference at the repo's existing verification step.
