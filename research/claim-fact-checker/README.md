# claim-fact-checker

A fan-out fact-checking **dynamic workflow** for Claude Code — it needs an agent that can run a workflow script and spawn subagents; `SKILL.md` sketches the Codex equivalent. It verifies every non-obvious factual claim in a deliverable against its archived sources — **one isolated verifier subagent per claim**, plus a source-quality skeptic — and produces a *findings* + *fix-plan* pair. It never edits the deliverable.

Instead of one agent reading a whole report in a single context — where it tires, trusts its own earlier calls, and quits early on long documents — each claim is checked in a clean context, so quality does not decay with length.

## Targets (presets)

| Preset | Deliverable | Verified against |
|---|---|---|
| `research-report` | a report plus its README and atomic notes | archived primaries in `sources/` |
| `ai-paper-reviews` | reviews of one paper, `reviews/{folder}-review-*.md` | that paper's fulltext + figures + tables |
| `ai-news-tracking` | a collection's `items/*.md` and its chapters | the collection's archived `sources/` |

Each preset's globs describe one workspace layout. They are defaults to edit: point `targetGlob`, `sourcesGlob` and `outputDir` at wherever your deliverables, archived sources and audit output belong.

## Layout

- `SKILL.md` — the contract: when to trigger, how to run, token cost.
- `workflows/fact-check.workflow.js` — the harness (extract → per-claim verify+skeptic → synthesize).
- `presets/*.json` — per-deliverable-type target/source/strictness config.
- `references/verdicts.md` — the verdict rubric, shared by all presets.

## Use

Read `SKILL.md`. In short: resolve target + source paths, then
`Workflow({ scriptPath: "<this>/workflows/fact-check.workflow.js", args })`. The workflow returns the findings + fix-plan markdown; the caller writes them to the preset's output location.

## Wiring it into a workspace

Put the skill where your agent looks for skills (or symlink it there), then add one line to the workspace's `AGENTS.md` at the point where a deliverable is finished but not yet committed — naming the preset, the targets and the sources. The fact-check then happens because the workspace's own instructions ask for it, not because someone remembered.
