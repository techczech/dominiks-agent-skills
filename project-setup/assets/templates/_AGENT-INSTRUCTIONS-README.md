# Agent Instructions

This folder is the administrative layer for agents working in this project.

Keep the project root focused on user-facing files and content. Put reusable agent-only procedure, templates, migration notes, cache, and scratch artefacts here.

## Standard Layout

- `_AGENT-INSTRUCTIONS/README.md` — this guide.
- `_AGENT-INSTRUCTIONS/scripts/` — small helpers for repeatable agent/admin work.
- `_AGENT-INSTRUCTIONS/templates/` — reusable skeletons for project-specific files.
- `_AGENT-INSTRUCTIONS/lessons/` — optional durable agent lessons, indexed and read on demand.
- `_AGENT-INSTRUCTIONS/cache/` — scratch space for agents; never treat cached files as canonical source.
- `_TASK-LOG/` — one Markdown task per resumable request plus `actions.jsonl`.
- `_CHANGELOG/` — optional coding-feature history, backlog, implementation decisions, and durable change narrative.

## Rules

- Keep root `AGENTS.md` short. It should route agents to this folder when the procedure becomes detailed.
- Do not put user-facing source material here unless it is explicitly a template.
- Do not put current task state in `lessons/`; use `_TASK-LOG/`.
- Do not treat cache files as canonical evidence or project content.
- When adding a new repeated workflow, document the short routing note in root `AGENTS.md` and the detailed steps here.

## Task Helper

Use this helper when available:

```bash
python3 _AGENT-INSTRUCTIONS/scripts/new-task.py "Short task title"
```

In Codex Desktop it reads `CODEX_THREAD_ID` and writes `audit.thread_uri` as `codex://threads/<thread-id>`.
