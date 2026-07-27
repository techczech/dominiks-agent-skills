# Project Setup

Use this reference when creating a new translation workspace for a researcher.

The skill folder is not the workspace. The user should create or choose the workspace folder first, open that folder in Codex, Claude Code, or Gemini CLI, and then install or copy the skill from that project context.

Use the setup script to copy the project template into that folder.

## Skill Scope

- Codex: prefer `$skill-installer` from the project context; restart Codex after installation.
- Claude Code: project-local skills live at `.claude/skills/<skill-name>/SKILL.md` and apply only to that project.
- Gemini CLI: this skill is not yet packaged as a Gemini extension. Gemini extensions use `gemini extensions install` from a GitHub URL or local path and can be enabled per workspace.

## Recommended Setup

Run:

```bash
python3 research-translation/scripts/init_translation_project.py \
  --project-dir /path/to/project \
  --project-name "Project name" \
  --source-language English \
  --target-language Bengali \
  --target-language Urdu
```

The generated folder is deliberately local-first. It creates places for source documents, language research, provider consent, runs, review packages, feedback, and audit records.

## Explain This To Lay Users

Tell the user:

- The coding agent they are working in, such as Codex or Claude Code, will help set up and manage the translation project.
- Source documents stay out of model/API calls unless they explicitly approve agent or provider use.
- API keys are optional at setup time.
- They can begin with agent-assisted translation in the agent they already use, without separate API keys, and add live model providers later.
- Human reviewers should receive fixed review packages, not the whole internal workspace.

## After Setup

Ask the user to add source files to `source-documents/`.

Then update:

- `config/project.yaml`
- `config/provider-consent.yaml`, copied from `config/provider-consent.example.yaml` when real consent is recorded
- `config/languages.yaml`, copied from `config/languages.example.yaml` when language choices are confirmed
- one note per target language in `language-research/`

Do not run live translation until the consent file is explicit about provider use.
