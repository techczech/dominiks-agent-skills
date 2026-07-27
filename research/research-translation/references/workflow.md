# Translation Workflow

Use this reference when the task moves beyond workspace setup into translation planning, live translation, back-translation, or review packaging.

## Stages

1. Intake: identify source documents, document type, audience, purpose, target languages, and consent boundaries.
2. Language research: record terminology, register, script, cultural, readability, and reviewer risks for each target language.
3. Segmentation: split by document structure. Preserve headings, item numbers, table cells, consent clauses, and source locations.
   For questionnaires, forms, tick-box items, matrix questions, and response-option lists, first check with the user that the detected structure matches the intended review unit when it is not obvious. Preserve question stems, instructions, free-text fields, answer options, matrix columns, and matrix rows as structure; do not flatten them into prose.
4. Preparation: create a whole-document brief before translating individual segments.
5. Forward translation: translate segment by segment with context and stable IDs.
6. Critique: inspect the draft against concrete risks, avoiding broad stylistic commentary.
7. Reconciliation: produce the fixed candidate translation from source, draft, and critique notes.
8. Back-translation: translate the reconciled target-language text back into the source language without exposing the original source to that stage.
9. Comparison: compare source, final translation, back-translation, and risk notes.
10. Packaging: create separate researcher and external-review artefacts.
11. Cost and usage reporting: compile per-run, per-document, and per-provider usage and estimated cost records from provider-reported metadata.

## Fast Evidence Gathering

At the start of a project or resumed run, gather enough evidence quickly to know what can be built and what is blocked. Do this before translating or packaging.

Minimum fast pass:

- inventory source files by document type
- inventory existing professional or user-supplied translations
- inventory existing generated runs and their model/agent provenance
- count segments per material and target language
- identify missing arms for any A/B or A/B/C comparison
- check whether each run is complete, partial, or failed
- check whether source text contains placeholders, another target language, comments, or examples
- check whether the source contains structural questions, response options, matrix rows/columns, tables, or form fields that need structure-preserving segmentation
- record which artefacts are researcher-facing and which are external-reviewer-facing

Use structured files and manifests where available. Do not infer readiness from filenames alone; inspect package contents, segment counts, provider/model metadata, and the actual text shown to reviewers.

If a comparison has fewer than two real arms, do not create a blind comparison package. Mark it as blocked or readiness-only.

## Output Authenticity

Never generate dummy translations, dummy back-translations, or dummy reviewer feedback. A translation artefact must be one of:

- produced by the active agent, such as Codex
- produced by another named agent, such as Claude Code
- produced by an approved API call
- supplied by the user

If no real output exists yet, mark the field as `not generated yet`, `blocked pending consent`, or `waiting for user-supplied translation`.

Never duplicate one translation across multiple blind arms to test a layout. Use a layout prototype only if it is clearly labelled as a prototype and cannot be mistaken for a real review package.

## Provider Separation

When live providers or multiple agents are available, prefer a different provider, model, or agent for critique and back-translation than the one that produced the forward translation. If the same agent/model is used for both forward translation and back-translation, record that limitation instead of claiming independent back-translation.

Allowed back-translation labels:

- `independent-provider`: back-translation used a different approved provider/model from the forward translation.
- `independent-agent`: back-translation used a different agent tool or thread, such as Claude Code after Codex produced the translation, with the source text hidden from the back-translation agent.
- `same-agent-check`: the same agent/model produced the forward translation and the back-translation. Use only as a simple check and label it as not independent.
- `blocked`: back-translation was not run because consent, tooling, source separation, or model separation was not available.

## Cost And Usage Reporting

When live provider calls are used, build cost records from provider-reported usage metadata rather than from rough document length estimates.

Record at least:

- project, material, target language, run ID, stage, provider, and model
- call count and provider result ID where available
- input tokens, cached input tokens where returned, uncached input tokens, output tokens, total tokens, and thinking/reasoning tokens where returned
- configured pricing rates, pricing source/date, currency, and whether cached-token pricing was applied
- estimated cost by run, document/material, language, provider, and model
- provider errors, retries, failed calls, and skipped/blocked calls

Include all saved provider calls that contribute to the workflow: forward translation, critique, reconciliation, and back-translation. If a package stores the same provider result in more than one field, such as both `forward` and `reconciled_forward`, de-duplicate it before aggregating cost.

Keep exact data in CSV/JSON where possible. If creating a human-facing HTML report, use a rounded display for readability but preserve the exact numbers in the machine-readable export.

Do not call token-derived costs exact charges. Most generation APIs return token usage rather than the actual billed dollar amount for that request. Label reports as estimates unless reconciled with the provider billing system.

## Minimum Records

Every run should preserve:

- source document inventory
- target language and audience
- consent record
- segmentation manifest
- preparation brief
- prompt and response records
- provider/model metadata where available
- timing, usage, estimated cost, pricing metadata, cached-token metadata, and errors where available
- critique and reconciliation records
- compiled translation
- back-translation label and output, or blocked-back-translation note
- reviewer package contents

## Completion Check

Before calling a run complete, confirm:

- every source segment appears in the final compiled translation
- headings and numbering are not invented unless present in the source
- reviewer packages do not expose internal prompts or unpublished variants
- provider use matches the consent record
- same-agent back-translation is labelled as not independent
- unresolved risks are visible to the researcher
- the source column shown to reviewers is the intended source text, not a language-specific placeholder, inserted example, or contaminated source extract
- questionnaire/form options, rows, columns, and free-text fields have not been flattened into running prose
- every comparison arm is a distinct real source: user-supplied, professional, agent-produced, or provider-produced
- provider usage and estimated cost records have been produced for live API runs, broken down by document/material, language, provider, and model
- token-derived costs are labelled as estimates unless reconciled against provider billing data
