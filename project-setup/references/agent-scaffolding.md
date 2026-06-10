# Agent Scaffolding

Use this when synthesizing AGENTS.md, CLAUDE.md, _TASK-LOG, or _AGENT-INSTRUCTIONS.

## Contents
- AGENTS.md synthesis
  - Interview-to-instructions
  - Streamline rules
  - Mandatory sections (every archetype)
  - Archetype-specific sections
  - The CLAUDE.md loader (always paired with AGENTS.md)
- Task logging scaffold
- Self-healing scaffold
- Agent lessons scaffold (escape hatch)
- Agent instruction scaffold
- Retrofitting older projects
- Hook companion (optional, for the user to configure)

## AGENTS.md synthesis

Generate `AGENTS.md` from interview answers plus observed repo evidence. Templates are checklists, not copy decks.

### Interview-to-instructions

- Source: user answers, repo tree, sibling projects, `_REPOLOG`, and real commands.
- Include: project purpose, status, ownership, paths, commands, constraints, task logging, verification.
- Include project mode: development, research/content, project management, or hybrid.
- Omit: invented policies, empty TODO sections, generic tool advice already covered by `~/AGENTS.md`.
- If an answer is missing, either ask or leave the section out; do not pad with boilerplate.
- Convert human context into operational rules future agents can act on.

### Streamline rules

Apply `agents-md-streamline` before writing:

- `AGENTS.md`: working context, not memory.
- Keep decisions; cut rationale, history, provenance, and chronology.
- Prefer short bullets or `Label: action.` lines.
- Aim for 30-90 lines and fewer than 20 atomic instructions.
- Move procedure, examples, templates, and cache to `_AGENT-INSTRUCTIONS/`.
- Move status/blockers/next actions to `_TASK-LOG/`.
- Move decisions/change history/backlog to `_CHANGELOG/`.
- Move important but not always-needed agent lessons to `_AGENT-INSTRUCTIONS/lessons/`.
- Do not tell agents to read/load/consult the same local `AGENTS.md`.
- Do not explain tool auto-loading or Claude bridge semantics in generated `AGENTS.md`.

When available, run:

```bash
python3 <path-to>/agents-md-streamline/scripts/agents_md_audit.py AGENTS.md   # sibling skill in this repo
```

### Assembly

Use the sections below only when they carry project-specific information.

### AGENTS sections

Use only sections that carry project-specific operational information.

- **Project** — mode, scope, owner/audience; one-line facts only.
- **First Move** — first command or question that changes most future work.
- **Commands** — real local commands only; omit if unknown.
- **Routing** — paths needed to avoid mistakes; omit general related-project background.
- **Project Layout** — only project-specific layout rules and admin-folder routing.
- **Constraints** — secrets, privacy, ownership, generated/source boundaries.
- **Self-Healing** — 2-line trigger pointing at `_AGENT-INSTRUCTIONS/self-healing.md`; included by default.
- **Decisions route** — when the interview flagged hard-to-reverse choices: `Hard-to-reverse decisions → docs/adr/ via grill-with-docs (three-part test).` Add the `_CHANGELOG/decisions/` cross-link rule when the changelog exists (see integrations).
- **Verification** — real checks or review steps.

Move elsewhere:

- Human overview, rationale, audience background, and related-project narrative -> `README.md`.
- Current status, blockers, and next action -> `_TASK-LOG/`.
- Long-term plans and priorities -> a global backlog repo (if you keep one) or `_CHANGELOG/backlog/`.
- Durable agent lessons not needed every session -> `_AGENT-INSTRUCTIONS/lessons/`.
- Global toolchain defaults -> leave in global instructions; do not echo in project `AGENTS.md`.

### Archetype-specific sections

Load the matching template from `assets/templates/` and use it as a checklist. Templates use `{{PLACEHOLDER}}` markers; replace with interview answers or remove the line/section. Do not leave TODO stubs in generated `AGENTS.md`.

Available templates:

- `AGENTS-core.md` — shared preamble (used by every archetype)
- `AGENTS-skill.md` — for AI skill projects
- `AGENTS-webapp.md` — for Vite/React webapps
- `AGENTS-utility.md` — for CLIs, extensions, small tools
- `AGENTS-content.md` — for content pipelines (curriculum, archive, writing)
- `AGENTS-consultancy.md` — for client work (adds stakeholder/client section)
- `AGENTS-fork.md` — for upstream forks (adds upstream-tracking rules)

**Keep it short.** The best AGENTS.md files in the user's repos are 30-90 lines. Resist the urge to pad. Put detailed workflow notes, examples, templates, and migration notes in `_AGENT-INSTRUCTIONS/`, not in the root AGENTS.md. If a section has nothing meaningful to say for this project, drop it.

**No boilerplate.** If the interview produced nothing concrete about testing, commits, commands, or related paths, omit those sections rather than writing filler.

### The CLAUDE.md loader (always paired with AGENTS.md)

Whenever you write an `AGENTS.md`, also write a `CLAUDE.md` in the same directory. Its entire content is:

```
@./AGENTS.md
```

That's it — one line, no heading, no explanation. `@./AGENTS.md` is Claude Code's file-reference syntax; it inlines the AGENTS.md into the session context. The user keeps all project conventions in AGENTS.md (cross-agent standard) and uses CLAUDE.md as a pure loader so Claude Code auto-picks it up without duplicating content.

This applies at every level — if a subdirectory gets its own AGENTS.md, give it a sibling CLAUDE.md too.

## Task logging scaffold

Every new project gets a lightweight task system separate from feature/change history:

```text
_TASK-LOG/
  README.md
  TEMPLATE.md
  actions.jsonl
```

Use it like this:

- Create or update one Markdown file per resumable request: `_TASK-LOG/<YYYY-MM-DD>-<short-slug>.md`.
- Treat "everything here is a task" as the default: setup, migrations, source capture, reviews, implementation, cleanup, and follow-up work all get task records when they take more than one obvious step.
- Reuse an existing task only when the new request clearly continues the same deliverable.
- Keep task files short: request, status, open questions, links, and log.
- Include `source_inputs` in frontmatter whenever the task derives from a dictation, prompt, imported note, or example folder.
- Include an `audit` block in frontmatter with `agent`, `thread_uri`, `machine`, and `cwd` when available.
- In Codex Desktop, build `thread_uri` from the `CODEX_THREAD_ID` environment variable: `codex://threads/$CODEX_THREAD_ID`. Also capture `machine` from the hostname and `cwd` from the project root.
- Update `status`, `updated_at`, `waiting_on`, `blocked_by`, and `next_action` whenever the state changes.
- Append one compact JSON object to `_TASK-LOG/actions.jsonl` when a task is created, blocked, unblocked, reviewed, or completed.
- Keep `_TASK-LOG/README.md` as the open-task inbox.
- Task files are not permission checkpoints. If the next step is obvious and safe, create or update the task, then continue.

Prefer the helper when available:

```bash
python3 _AGENT-INSTRUCTIONS/scripts/new-task.py "Short task title"
```

This is intentionally different from `_CHANGELOG/`: `_TASK-LOG/` is operational and per-request; `_CHANGELOG/` is optional and records coding-feature history, implementation decisions, backlog, and meaningful shipped changes.

## Self-healing scaffold

Every new project gets a self-healing protocol so user feedback mutates the rules rather than piling up as notes.

```text
AGENTS.md
  ## Self-Healing                          # 2-line trigger
_AGENT-INSTRUCTIONS/
  self-healing.md                          # full protocol
```

Generate from the template:

```bash
SKILL_DIR="$HOME/.claude/skills/project-setup"
cp "$SKILL_DIR/assets/templates/_AGENT-INSTRUCTIONS-SELF-HEALING.md" \
   _AGENT-INSTRUCTIONS/self-healing.md
```

The `## Self-Healing` block in `AGENTS.md` is a 2-line pointer (already in `AGENTS-core.md`):

```markdown
## Self-Healing

On user correction: classify, route, optionally promote.
Protocol: `_AGENT-INSTRUCTIONS/self-healing.md`.
```

The protocol defines:

- **Classify** the feedback (standing rule / project policy / task-local / not-yet-compressible).
- **Edit** the rule at the smallest scope that holds it. Telegraph per `agents-md-streamline`.
- **Propagate** upward to the source skill's own repo when the rule generalises; bootstrap that skill's `AGENTS.md` and `HISTORY.md` lazily if missing.
- **Verify** with the user before moving on.

This scaffold is mandatory, not optional. The protocol file is short and project-agnostic; copying it verbatim is the right move for most projects.

## Agent lessons scaffold (escape hatch)

Use only when the project is likely to accumulate experiential notes that do not compress into a single rule edit. Lessons are the escape hatch in the self-healing flow, not the default path.

```text
_AGENT-INSTRUCTIONS/
  lessons/
    INDEX.md
    TEMPLATE.md
```

Rules:

- `INDEX.md`: short map of available lessons.
- Topic files: one lesson or lesson cluster per file.
- Root `AGENTS.md`: add a route only if the lane exists and is useful.
- Do not call this `MEMORY.md`; avoid implying automatic loading.
- Do not store current task state here; use `_TASK-LOG/`.
- Do not store decisions/change history here; use `_CHANGELOG/`.
- Do not store human background here; use `README.md`.
- Revisit lessons periodically: promote into `AGENTS.md` rules when the pattern proves out, or delete when stale.

## Agent instruction scaffold

Every new project gets:

```text
_AGENT-INSTRUCTIONS/
  README.md
  scripts/
  templates/
  cache/
```

Use `_AGENT-INSTRUCTIONS/` for agent-only procedure, reusable skeletons, migration notes, optional lessons, and scratch/cache files. Keep user-facing content out of this folder unless it is explicitly a template for future content. Root `AGENTS.md` should point here when detailed procedure exists.

## Retrofitting older projects

Use this skill for older projects when the user asks to "reset", "regularize", "make consistent", or move to the new pattern:

1. Read the existing tree and identify user-facing content, build-required folders, agent scaffolding, task logs, feature/change history, and scratch/cache.
2. Propose a migration map before moving files. Do not flatten build-required paths such as a webapp `src/` or a generator-required `content/` directory unless the user explicitly wants the build changed.
3. Move agent-only scaffolding into `_AGENT-INSTRUCTIONS/`.
4. Move per-request task records into `_TASK-LOG/`.
5. Move or bootstrap coding-feature history into `_CHANGELOG/` only when the project needs backlog, implementation decisions, or change tracking.
6. Promote human-facing content files or content folders to the top level when no build contract requires them elsewhere.
7. Update path references in `AGENTS.md`, `CLAUDE.md`, README files, scripts, and task records.
8. If the project is a git repo, prefer `git mv` and leave a clean, reviewable diff.

## Hook companion (optional, for the user to configure)

This skill triggers on intent, not on folder state. If the user wants Claude to *automatically* consider this skill whenever CWD is empty, they can add a `UserPromptSubmit` hook in `~/.claude/settings.json` that detects empty CWDs and injects a reminder. Don't set this up unprompted — but if the user asks, point them at `update-config` or sketch the hook inline.
