# research-translation

An agent skill for auditable translation of participant-facing research documents such as consent forms, questionnaires and lay summaries. It covers workspace setup, translation and back-translation, review packages for reviewers, and reports. It is for researchers who do not necessarily speak the target language and need a record of how each translation was produced.

This folder is the skill, not a translation project. Each project gets its own separate workspace, created from the template in `assets/project-template/`.

## What you need

- An agent that can load skills and run shell commands (the skill is written for Codex and Claude Code).
- Python 3.10 or later for the helper scripts; they use only the standard library.
- A project mode, chosen with `--mode` in `init_translation_project.py`: `agent-assisted` (default), `api-assisted` or `manual-review`; `codex-assisted` is accepted as an older name for `agent-assisted`.
- For `api-assisted` runs only: API keys for your chosen providers, held in your own secret manager and handed only to the command that needs them, never in project files or shell profiles.

## What's in this folder

- `SKILL.md` - the entry point: boundary, start-up steps and non-negotiable rules.
- `references/` - one file per stage: `project-setup.md`, `providers-and-privacy.md`, `workflow.md`, `process-guide-and-prompts.md`, `language-and-document-risks.md`, `review-packages.md`, `report-generation.md`.
- `scripts/init_translation_project.py` - copies the project template into a new workspace.
- `scripts/prepare_feedback_request.py --internal-staging` - builds an internal feedback-request folder with package copies, a private manifest and a CSV form.
- `scripts/collate_feedback.py` - collates returned CSV or JSON feedback into summary CSV, JSON and Markdown.
- `scripts/verify_review_release.py` - checks a fixed comparison contract and lineage receipts, then builds and verifies a restricted JSON archive. See `references/release-contract.md` for the format and its limits.
- Report and site builders are project-specific and are not included; check the project workspace for any before assuming one exists.
- `assets/project-template/` - the workspace template: config files, folders for source documents, runs, review packages and feedback, a reviewer brief and run-notes template.
- `agents/openai.yaml` - interface metadata for OpenAI-style skill loaders.

## How to use it

Put the folder where your agent looks for skills and describe the stage you are at. The agent loads `SKILL.md` and then only the reference for that stage. To create a workspace:

```bash
python3 scripts/init_translation_project.py \
  --project-dir /path/to/new-translation-project \
  --project-name "Study translation project" \
  --source-language English \
  --target-language Bengali
```

## Rules the skill enforces

- No source text goes to any provider or agent service until consent is recorded in the project workspace.
- No dummy or placeholder translations. Every translation shown is produced by a named agent or approved API call, or supplied by you.
- If the same model does both the forward translation and the back-translation, the back-translation is labelled a same-agent check, not an independent one.
- Segment IDs stay stable across all stages.
- Researcher review and external reviewer feedback are separate packages, and prompts and internal audit notes are not shared with external reviewers by default.
- The audit trail is the workspace's `audit/` folder plus per-run notes, recorded consent, stable segment IDs and the provider, model and usage details logged for each run.
- Token-derived costs are reported as estimates, not invoices.

## Validate a portable copy

From this folder, run `python3 -m unittest discover -s tests -v`. The tests use explicitly labelled synthetic structural data, make no provider calls and do not produce study translations or reviewer findings.

The release helper covers question stems and option lists. It does not build HTML or spreadsheets, validate linguistic meaning, authenticate an origin receipt, or transform matrix and branching logic. Such formats need a project-specific adapter and separate checks.

## Version and research records

This folder is a maintained reusable workflow. Preserve the version and hashes used in each research project alongside that project’s run instructions and outputs. Updating the skill does not retrospectively change the instructions used in earlier research runs.

## Licence

No licence file is included in this snapshot. Redistribution permission must be established before public release; this README does not grant a licence.
