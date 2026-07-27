# doc-editorial

## Scope

Interactive editorial workflows for markdown documentation projects. Discover issues, propose fixes, and learn from user feedback. Use when managing documentation quality, running editorial reviews, discovering and tracking terminology, verifying factual accuracy, or setting up an editorial workspace for a new project.

Every workflow follows the same pattern — propose, ask, act, learn — and nothing is changed without approval.

| Workflow | What it does |
|----------|--------------|
| `doc-init` | Guided walkthrough that creates the editorial workspace for a project |
| `doc-audit` | Audits docs across five dimensions: structure, completeness, consistency, navigation, audience fit |
| `doc-terms` | Discovers candidate terms and checks terminology consistency against the glossary |
| `doc-review` | Reviews voice and tone, and evolves the voice guide from your accept/reject decisions |
| `doc-research` | Two-step fact verification: identifies stale-prone claims, then verifies the ones you pick |
| `doc-changelog` | Appends what changed to the editorial changelog |
| `doc-capture` | Captures decisions and learnings at the end of a session |
| `doc-learning-paths` | Proposes reader personas and generates reading sequences through the docs |

## Getting started

Install the skill wherever your agent looks for skills, then ask it to run the init
walkthrough (`doc-init`). That creates an `editorial-workspace/` folder in your
project holding the config, glossary, changelog, structural rules and voice guide,
and — optionally — per-command skill files wired into your agent by
`scripts/setup-agents.sh` (Claude Code, Antigravity, Codex and OpenCode layouts are
supported). After that, ask for any workflow by name or describe what you want in
plain language.

The workflow names above are conventions, not built-in commands: they become slash
commands only if `doc-init` generates skill files for them in your project.

## Trigger

- Skill trigger: editing, auditing or reviewing a set of markdown documents — quality, structure, terminology, voice, or factual freshness.
- Procedure and workflow decision tree: see `SKILL.md`.
