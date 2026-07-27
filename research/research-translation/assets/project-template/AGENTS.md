# Translation Project Instructions

Use the `research-translation` skill for this workspace.

## Local Rules

- Source documents live in `source-documents/`.
- Do not send source text to external providers, Codex, Claude Code, or another agent tool until `config/provider-consent.yaml` exists and permits it.
- Never generate dummy translations, dummy back-translations, or fabricated feedback.
- If the same agent/model does forward translation and back-translation, label it as `same-agent-check` and not independent.
- Agent-only translation is allowed only when the project consent record permits the active agent to see the source text. Label it as `api-not-used`, not as an independent provider workflow.
- Before packaging, check for placeholders, comments, examples, or another target language embedded in the source text.
- Keep language research in `language-research/`.
- Keep generated runs in `runs/`.
- Keep reviewer-facing exports in `review-packages/`.
- Keep outgoing feedback requests in `feedback/outgoing/`.
- Keep returned feedback in `feedback/returned/`.
- Keep collated feedback outputs in `feedback/collated/`.
- Keep audit records in `audit/`.

## Current Project

- Source language: {{SOURCE_LANGUAGE}}
- Target languages: {{TARGET_LANGUAGES}}
- Mode: {{MODE}}
