# project-setup

## Scope

Initialize or regularize a project folder with tailored AGENTS.md/CLAUDE.md,
`_AGENT-INSTRUCTIONS/`, `_TASK-LOG/`, optional `_CHANGELOG/`, and default
git plus `_REPOLOG` registration for non-OneDrive projects. Use for new folders, empty repos,
folders that need the new top-level-content plus underscored admin layout,
or project briefs that need goals, dependencies, collaborators, and next
steps captured before coding. Trigger aggressively for fresh folders with no
AGENTS.md / CLAUDE.md / SKILL.md, and for requests to reset an older project
into the current layout.

## Trigger

- Skill trigger: Initialize project folders.
- Procedure: see `SKILL.md`.

## Portable Functionality

This skill can reference companion skills that are not included here, but
it should still be understandable and reproducible without them. Treat the
sections below as the public reconstruction map.

### AGENTS.md Streamlining

Equivalent of `agents-md-streamline`:

- Generate `AGENTS.md` from interview answers and repo evidence.
- Keep only working context needed during most work: commands, constraints,
  ownership, routing, and verification.
- Move human overview, rationale, and related-project narrative to `README.md`.
- Move procedure, templates, scripts, cache, and optional lessons to
  `_AGENT-INSTRUCTIONS/`.
- Move current status, blockers, and next action to `_TASK-LOG/`.
- Move decisions, backlog, and shipped-change history to `_CHANGELOG/`.
- Do not include generic global defaults or instructions to read/load the local
  `AGENTS.md`.
- Pair every generated `AGENTS.md` with a sibling `CLAUDE.md` whose only content
  is `@./AGENTS.md`.

### Project Changelog

Equivalent of `project-changelog`:

- Optional folder: `_CHANGELOG/`.
- Buckets:
  - `changes/` — meaningful shipped or executed changes.
  - `decisions/` — durable architecture or policy decisions.
  - `phases/` — optional milestones.
  - `backlog/` — proposed, active, deferred, or dropped future work.
  - `logs/worklog.jsonl` — compact pipeline/run summaries.
- Each entry uses YAML frontmatter with at least `title`, `id`, `date`, `type`,
  and `status`.
- Backlog closure should link both sides: backlog item -> resolving change, and
  change -> resolved backlog item.
- In this skill's layout, use `_CHANGELOG/` rather than a bare `changelog/`.

### Task Log

Project setup always creates `_TASK-LOG/` for resumable work:

- `README.md` — open-task inbox.
- `TEMPLATE.md` — task record skeleton.
- `actions.jsonl` — compact event log.
- One Markdown task per non-trivial request.
- Task records capture request, status, open questions, links, log, and audit
  metadata when available.

### Agent Instructions And Lessons

Project setup creates `_AGENT-INSTRUCTIONS/` for agent-only material:

- `README.md` — administrative guide.
- `scripts/` — helper scripts such as `new-task.py`.
- `templates/` — reusable skeletons.
- `cache/` — scratch space, never canonical source.
- optional `lessons/` — durable agent lessons that are important but not needed
  in every context.

The lessons lane uses:

- `lessons/INDEX.md` — short lesson map.
- `lessons/TEMPLATE.md` — copy for topic files.
- Topic files for repeated pitfalls, tradeoffs, or corrections.

Do not call this `MEMORY.md`; it is read on demand, not automatic startup
context.

### Repo Registry

Equivalent of `_REPOLOG` registration:

- Maintain a repo map with at least group/folder, local name, clone URL, clone
  policy, and lifecycle/status.
- Register durable non-OneDrive repos when they need cross-machine discovery.
- Do not register OneDrive-first folders unless the user wants a separate git
  mirror.
- Read the live schema before appending rows.

### Dev Logging

Equivalent of a dev-log routing skill:

- `_TASK-LOG/`: live per-request operational state.
- `_CHANGELOG/`: durable decisions, backlog, and shipped changes.
- external/global backlog: cross-project attention and follow-up tracking.

Use the narrowest lane that fits. Do not duplicate the same fact across all
three.
