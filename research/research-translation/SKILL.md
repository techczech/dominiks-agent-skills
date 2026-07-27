---
name: research-translation
description: Guide Codex, Claude Code, or another Agent Skills-compatible coding agent through auditable translation workflows for participant-facing research documents such as consent forms, questionnaires, lay summaries, invitations, study information sheets, and debrief materials. Use when a researcher needs to set up a separate translation workspace, prepare language and terminology research, configure consent and provider keys, run agent-assisted or API-assisted translation and back-translation, record same-agent limitations, create fixed review packages for human reviewers, or generate HTML reports/sites from completed translation runs.
---

# Research Translation

## Boundary

This folder is the skill, not the translation project.

Do not put source documents, provider consent files, generated runs, reviewer feedback, or project-specific notes inside the skill folder. Create a separate workspace for every translation project and copy templates from `assets/project-template/` into that workspace.

If an existing translation project has its own `SKILL.md`, `AGENTS.md`, or `_AGENT-INSTRUCTIONS/`, read that project-local routing before using this generic skill.

## Start

1. Identify whether the user wants to set up a project, configure providers, plan translation, run translation, review outputs, package reviewer materials, or generate reports/sites from completed runs.
2. If they need a new workspace, run `scripts/init_translation_project.py` from the skill folder and create the workspace outside the skill.
3. Load only the reference file needed for the current stage.

New workspace example:

```bash
python3 /path/to/research-translation/scripts/init_translation_project.py \
  --project-dir /path/to/new-translation-project \
  --project-name "Study translation project" \
  --source-language English \
  --target-language Bengali \
  --target-language Urdu
```

## Reference Map

- `references/project-setup.md`: create and explain a new workspace.
- `references/providers-and-privacy.md`: keys, consent, agent-assisted mode, and safe provider use.
- `references/workflow.md`: intake, language research, segmentation, translation, critique, reconciliation, and back-translation.
- `references/process-guide-and-prompts.md`: shareable process guide, prompt transparency, dynamic insertion markers, and source contamination checks.
- `references/language-and-document-risks.md`: language research and document-type risks.
- `references/review-packages.md`: researcher review and external reviewer packages.
- `references/report-generation.md`: HTML reports/sites, dashboards, operator reports, cost reports, and project-local report builders.

Useful scripts:

- `scripts/init_translation_project.py`: copy the generic project template into a separate workspace.
- `scripts/prepare_feedback_request.py`: create a reviewer feedback request folder with package copies, manifest, and CSV form.
- `scripts/collate_feedback.py`: collate returned CSV/JSON feedback into summary CSV, JSON, and Markdown.
- Report/site builders are project-specific by default. Inventory the project workspace before assuming the generic skill contains them.

## Non-Negotiables

- Do not assume the researcher speaks the target language.
- Do not use web terminology lookup unless the project consent allows it.
- Do not send source text to OpenAI, Google, Claude, Codex, or another provider/agent service until consent is recorded in the project workspace.
- Do not put API keys in project files; use environment variables or the user's secret manager.
- Do not expose prompts, raw provider logs, unpublished variants, or internal audit notes to external reviewers by default.
- Never generate dummy, placeholder, illustrative, or fake translations/back-translations. Any shown translation must be produced by the active agent, by another named agent such as Claude Code, by an approved API call, or supplied by the user.
- If the same agent/model performs both forward translation and back-translation, label the back-translation as a same-agent check, not an independent back-translation.
- Preserve stable segment IDs across translation, critique, reconciliation, and back-translation.
- Keep researcher review and external reviewer feedback as separate packages.
- Before building a review package, check that the source text displayed to reviewers is the intended source for that target language and not a project placeholder, example insertion, or another target-language sentence.
- Before building HTML reports/sites, dashboards, cost reports, or operator reports, inventory the project workspace for local builders, manifests, generated-run folders, and task logs.
- Before segmenting questionnaires, forms, tables, response-option lists, matrix questions, or tick-box items, check whether the source contains structural questions. Preserve options, rows, columns, and free-text fields as structure. If structure is ambiguous, ask the user before translating; do not translate a flattened text extraction when the original structured source is available.
- When live API/provider calls are used, record provider-reported usage metadata and cost estimates for each run. Include provider, model, pricing mode, input tokens, cached input tokens where returned, uncached input tokens, output tokens, total tokens, thinking/reasoning tokens where returned, configured rates, and error metadata. Label token-derived costs as estimates unless they are reconciled against provider billing; do not present estimates as invoices or exact charged amounts.
