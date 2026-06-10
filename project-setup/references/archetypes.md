# Project Archetypes

Reference notes on the project taxonomy this skill assumes. The taxonomy below is an **example** — adapt the group names and archetypes to your own layout. If you keep a repo registry (see `references/integrations.md`), always cross-check against it for the *current* description; the registry is the source of truth.

## Reading the group folder

This setup organizes `~/gitrepos/` into numbered group folders (`01_*`, `02_*`, ...) plus excluded groups (`x-*`). The number is not semantic beyond rough grouping, but the folder name *is* — it tells you what kind of project belongs there and what siblings it'll have.

Before writing AGENTS.md, grep the repo registry for existing rows in the target group folder. Use siblings as evidence for questions and operational routing, not as background filler.

## Archetypes

### AI Skills

Group folders for personal, work, and public-facing agent skills.

**Shape:** SKILL.md (YAML frontmatter + markdown body), `references/` for on-demand docs, `assets/templates/` for output files, `scripts/` for pure-stdlib helpers, `evals/` for test prompts.

**Triggering:** the skill description is the load-bearing part. Aim for pushy triggers (undertriggering is the failure mode).

**Installation:** symlink into `~/.claude/skills/`, `~/.cursor/skills/`, `~/.antigravity/skills/`, `~/.codex/skills/`.

**Typical dependencies:** a shared local model cache for HF/MLX models (shared via `HF_HUB_CACHE`).

### Presentation tools

Tools that consume/emit `.pptx` or build handouts from presentations.

**Shape:** either a skill (`SKILL.md`) or a Python/Node tool. Siblings often share output patterns. New projects should keep presentation source files and other user-facing material visible at the top level, with agent/admin material in `_AGENT-INSTRUCTIONS/` and `_TASK-LOG/`.

### Scaffolded webapps

React/TS webapps originally scaffolded via an app builder (e.g. Lovable).

**Shape:** Vite + React + TypeScript + Tailwind + shadcn/ui. Usually npm or pnpm (check lockfile). Default branch often `main`, sometimes `master` (builder default).

**Gotcha:** these projects sometimes inherit the builder's default structure with `src/pages/` + `react-router-dom`. Follow existing patterns.

### Consultancies

Client work.

**Shape:** highly project-specific. Often have `raw/`, `derived/`, `scripts/`, `documentation/`, `experiments/` split. Confidentiality matters — check `.gitignore` for which folders are committed.

**Often include:** YAML frontmatter for document metadata, batch processing pipelines, `_TASK-LOG/` for operational work, and `_CHANGELOG/` only when coding-feature or implementation-decision history matters.

### Institutional

Projects for an employer or institution.

**Shape:** varies. Many are webapps. Some live in institutional GitHub orgs. Institutional conventions apply.

### Language/pedagogy projects

Language learning / pedagogical content.

**Shape:** content-heavy. Strict source vs rendering separation pattern. New projects should prefer top-level content folders unless a build system requires `content/`. May mix target-language content with English explanatory prose.

### General webapps

The largest group — general-purpose webapps.

**Shape:** most are Vite+React+TS webapps. Variety in deployment targets.

### Obsidian vaults

Markdown vaults backed up via git.

**Shape:** not really code projects — markdown content with git history for versioning. Often synced via `gitwatch`.

### Skills forks

Forks of third-party skills repos.

**Shape:** upstream-tracking. Use `AGENTS-fork.md` template. Don't refactor.

### Apps & utilities

CLIs, VS Code extensions, Raycast extensions, small tools.

**Shape:** highly variable. Rust CLIs, Node extensions, Python utilities. Each has its own toolchain.

### Training presentations

Training material prep.

**Shape:** content-heavy. Presentation source + exported handouts. Often non-git or partially-git. New projects should keep presentation source files and other user-facing material visible at the top level, with agent/admin material in `_AGENT-INSTRUCTIONS/` and `_TASK-LOG/`.

### Writing & research

Ongoing writing/research projects (paper reviews, news tracking, research logs).

**Shape:** content pipelines. Often include source material + derived analysis + optional preview browser.

### Excluded groups

- `x-forks/` — third-party forks. Never modify unless the user is contributing upstream.
- `x-experiments/` — throwaway prototypes. Minimal AGENTS.md is fine. Maybe just status: experimental and one-line description.
- `x-archive/` — superseded. Refuse to set up a new project here; suggest a numbered group instead.
- `x-no-remote/` — local-only repos.
- `x-non-git/` — non-git data directories.

## Content-vs-code split patterns

Several project archetypes enforce a strict **content / rendering** separation. New projects should use the top-level content pattern unless a build tool requires `content/`. The pattern:

- top-level content files or content folders = canonical user-facing material (markdown + YAML frontmatter + JSON data)
- `schemas/` = structural definitions, never displayed
- `website/` = rendering layer, owns no prose
- `_AGENT-INSTRUCTIONS/` = agent-only procedure, templates, cache, and migration notes
- `_TASK-LOG/` = one Markdown task per resumable request
- `_CHANGELOG/` = optional coding-feature history, backlog, implementation decisions, and durable change narrative

Older projects may still use a literal `content/` directory. Keep it when a build system depends on that path or when it is already the user's chosen canonical source. For new projects and regularization work, prefer top-level content folders instead of burying the user's working material under `content/`.

Projects that typically use this pattern: language/pedagogy content, writing libraries, training presentations, writing & research pipelines, and consultancy archives.

## Cross-reference conventions

AGENTS.md files may include cross-references with absolute paths:

- Use `~/gitrepos/GROUP/name` only for operational paths needed to avoid mistakes.
- Do not include a generic `~/AGENTS.md` pointer in project-specific `AGENTS.md`.
- Point to skills by source path only when the project actually invokes that skill.

## Typical tech stacks by archetype

| Archetype | Default |
|---|---|
| AI skill | Python stdlib, SKILL.md |
| Scaffolded webapp | Vite + React + TS + Tailwind + shadcn + npm/pnpm |
| General webapp | Vite + React + TS + Tailwind + shadcn + bun (new) |
| Utility (CLI) | Rust (cargo) or Python (uv) |
| Utility (extension) | Node + TypeScript, pinned to host (VS Code, Raycast) |
| Content pipeline | Markdown + YAML + optional Vite/React website |
| Consultancy | Varies — often Python/Node batch + documentation |
| Obsidian vault | Markdown only, gitwatch-synced |

A global `~/AGENTS.md` overrides these defaults when present.
