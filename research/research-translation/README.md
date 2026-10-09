# research-translation

An agent skill for auditable translation of participant-facing research documents such as consent forms, questionnaires and lay summaries. It covers workspace setup, translation and back-translation, review packages for reviewers, and reports. It is for researchers who do not necessarily speak the target language and need a record of how each translation was produced.

This folder is the skill, not a translation project. Each project gets its own separate workspace, created from the template in `assets/project-template/`.

## What you need

- An agent that can load skills and run shell commands (the skill is written for Codex and Claude Code).
- Python 3 for the three helper scripts.
- A project mode, chosen with `--mode` in `init_translation_project.py`: `agent-assisted` (default), `api-assisted` or `manual-review`; `codex-assisted` is accepted as an older name for `agent-assisted`.
- For `api-assisted` runs only: API keys for your chosen providers, held in environment variables or your own secret manager, never in project files.

## What's in this folder

- `SKILL.md` - the entry point: boundary, start-up steps and non-negotiable rules.
- `references/` - one file per stage: `project-setup.md`, `providers-and-privacy.md`, `workflow.md`, `process-guide-and-prompts.md`, `language-and-document-risks.md`, `review-packages.md`, `report-generation.md`.
- `scripts/init_translation_project.py` - copies the project template into a new workspace.
- `scripts/prepare_feedback_request.py` - builds a reviewer feedback folder with package copies, a manifest and a CSV form.
- `scripts/collate_feedback.py` - collates returned CSV or JSON feedback into summary CSV, JSON and Markdown.
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

## Licence

MIT, as for the rest of this repository (see the LICENSE file at the repository root).
