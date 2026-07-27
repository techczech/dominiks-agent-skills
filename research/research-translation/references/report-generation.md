# Report Generation

Use this reference when creating HTML reports, report sites, dashboards, operator reports, cost reports, review indexes, or other generated views from completed translation runs.

Do not use this reference to create new translations. Use `workflow.md` for generation and `review-packages.md` for reviewer package boundaries.

## First Pass

Before building anything, inventory the project workspace:

- local instructions: `SKILL.md`, `AGENTS.md`, `_AGENT-INSTRUCTIONS/`, `README.md`
- project scripts: `scripts/`, `_AGENT-INSTRUCTIONS/scripts/`, app or report folders
- run data: `runs/`, `sample-runs/`, `outputs/`, `packages/`, `review/`
- manifests: run manifests, package manifests, feedback schemas, cost CSV/JSON
- task logs or changelogs that identify current package names and known blockers

Do not infer report builders from filenames alone. Read the relevant script constants, expected inputs, and output paths before running.

## Common Outputs

Report-generation work may produce:

- researcher-facing review pages
- external reviewer package indexes
- operator/process audit reports
- source/back-translation comparison reports
- cost and token-usage reports
- readiness reports when a blind comparison is not valid
- feedback collation summaries
- single-file HTML pages or static report folders

If a project has local builders, prefer those over inventing a generic report from scratch. If no builder exists, create a small project-local script or documented command in the project workspace, not in the generic skill.

## Input Checks

Confirm before rendering:

- each translation arm is real and has provenance
- segment IDs are stable across source, translation, back-translation, and feedback
- the source text shown in reports is the approved source for that material
- reviewer-facing pages exclude raw prompts, private audit notes, unpublished variants, and provider errors unless explicitly approved
- cost reports use provider-reported usage metadata where available
- token-derived costs are labelled as estimates unless reconciled against billing data

If required data is missing, build a readiness or blocked report instead of a polished review page.

## Privacy Gate

Public or reusable report templates must stay generic:

- no private project names
- no client names
- no local private paths
- no real source-document titles unless approved for the report audience
- no provider consent records or secret names
- no sample runs containing real study material

Project-specific labels, paths, and examples belong in the project workspace only.

## Verification

After generation:

- confirm the expected files exist
- open or inspect at least one generated HTML file
- check that visible labels match the intended audience
- grep the generated output for project-internal notes before sharing externally
- record generated paths and limitations in the project task log or changelog
