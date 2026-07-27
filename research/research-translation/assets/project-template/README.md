# {{PROJECT_NAME}}

This folder is a local research translation workspace.

Source language: {{SOURCE_LANGUAGE}}

Target languages: {{TARGET_LANGUAGES}}

Mode: {{MODE}}

Created: {{CREATED_AT}}

## How To Use This Folder

1. Put source documents in `source-documents/`.
2. Copy `config/provider-consent.example.yaml` to `config/provider-consent.yaml` and record what may be sent to agent tools or model providers.
3. Copy `config/languages.example.yaml` to `config/languages.yaml` and confirm the target languages and locales.
4. Create one language research note per target language in `language-research/`.
5. Keep generated runs under `runs/`.
6. Put fixed review packages under `review-packages/`.
7. Put returned reviewer feedback under `feedback/`.

Never add dummy translations or dummy back-translations. If Codex, Claude Code, an approved API, or a user has not produced the text, mark it as not generated yet.

Do not share the whole workspace with reviewers. Reviewers should receive fixed review packages only.
