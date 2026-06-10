# Project Setup Workflow

Use this as the main execution checklist.

## Contents
- Intake routes
- Core workflow
- Interview
- Output contract

Bootstrap or regularize a project folder through one of two routes: existing-project review or new-project interview. Both routes produce an interview-based, streamlined top-level `AGENTS.md` and sibling `CLAUDE.md` loader; `_AGENT-INSTRUCTIONS/`; `_TASK-LOG/`; optional `_AGENT-INSTRUCTIONS/lessons/`; optional `_CHANGELOG/`; and optional git / `_REPOLOG` setup. The goal is that any future agent entering the folder immediately knows what the project is, what it isn't, who it's for, how to log work, and how it fits into the user's wider ecosystem.

## Intake routes

Choose the route before proposing files or scaffolds.

### Existing-project review

Use when the folder already contains meaningful files or the user asks to regularize, review, migrate, or improve an existing project.

- Inspect: `pwd`, `ls -la`, `rg --files`, existing `README`, `AGENTS.md`, `CLAUDE.md`, package/tool files, git status, and obvious source/content folders.
- Summarize: current shape, likely project mode, missing instructions, risks, and setup opportunities.
- Suggest: concrete AGENTS/task-log/changelog/layout changes.
- Ask: clarifying questions before editing; do not assume project purpose, owner, mode, status, stack, outputs, or logging needs from filenames alone.

### New-project interview

Use when the user says "I want to set up a project to..." or the folder is empty/new.

- Treat the opening prompt as a seed, not a full spec.
- Ask questions before choosing structure, stack, logging, repo home, or scaffolds.
- Confirm what "set up" means: instructions only, content/project plan, code scaffold, git/remote, registry, changelog, or all of these.
- Preserve uncertainty in the plan until the user answers.

### Required mode question

Always ask which mode best fits, even when the answer seems obvious:

- `development`: code, app, CLI, automation, tests, deploy, secrets.
- `research/content`: sources, evidence, citations, notes, writing, datasets, generated artefacts.
- `project management`: stakeholders, milestones, tasks, decisions, handoff, meeting/project records.
- `hybrid`: name the primary mode and the supporting mode(s).

Accommodate the answer in `AGENTS.md`, `_TASK-LOG/`, and optional `_CHANGELOG/`.

## Core workflow

Follow these steps in order. Stop and confirm with the user before any step marked **(confirm)**.

1. **Sense the request + folder**: read the opening prompt, run `pwd`, `ls -la`, and `rg --files` when files exist.
2. **Choose intake route**: existing-project review or new-project interview. Tell the user which route you are taking.
3. **Ask the required mode question**: development, research/content, project management, or hybrid. Do not infer this silently.
4. **Detect root + archetype** from the path and answers (see "Root detection" and "Archetype detection" below). If ambiguous, ask.
5. **Read context for the detected root**:
   - For `~/gitrepos/` projects: always read `~/gitrepos/_REPOLOG/README.md` (the current machine section) and grep `~/gitrepos/_REPOLOG/repo-map.tsv` for siblings in the same group folder. This grounds sibling-project suggestions in *current* state, not stale memory. Git plus `_REPOLOG` registration are default completion steps, not optional follow-ups.
   - For cloud-synced (e.g. OneDrive) vibecoding projects under `<cloud-storage>/_vibecoding/`: treat the path itself as the canonical cross-machine location. Do **not** insist on moving it into `~/gitrepos/`, and do **not** propose `_REPOLOG` registration unless the user explicitly wants a separate git mirror under `~/gitrepos/`.
   - For local demo projects under `~/agent-demos/`: treat this as a sanctioned lightweight workspace for local-first demos, experiments, and capability probes. Create local git by default. If the user wants cross-machine sync or durable registry visibility, mirror or promote the demo into `~/gitrepos/` and register it in `_REPOLOG`; otherwise keep the `_REPOLOG` row out because the registry is rooted in `~/gitrepos/`.
6. **Interview the user** (see "Interview" below). Ask the route and mode questions, then only the core questions still needed. The answers are the source for `AGENTS.md`; do not fill sections from generic template text alone.
7. **Propose a plan** summarizing what you'll create: AGENTS.md (yes), CLAUDE.md (yes), `_AGENT-INSTRUCTIONS/` (yes), `_TASK-LOG/` (yes), `_AGENT-INSTRUCTIONS/lessons/` for durable lessons (ask), `_CHANGELOG/` for coding-feature/change history (ask), git init and first commit (default for non-OneDrive), GitHub remote if needed for cloning (default for `~/gitrepos/` repos without a remote), `_REPOLOG` registration (default for `~/gitrepos/` repos), scaffold command (ask). **(confirm)** only when the user has not already approved setup or the plan includes a destructive move, public remote, or ambiguous placement.
8. **Write AGENTS.md** from the interview answers, then streamline it with `agents-md-streamline` principles: working context, commands, constraints, ownership, routing, and verification only. Use the matching `assets/templates/` file as a checklist, not as filler. Keep it short: a project router plus task-logging contract, not a procedural manual.
9. **Write a sibling CLAUDE.md loader** in the same directory. Its entire content is the single line `@./AGENTS.md` (no heading, no other text). If a `CLAUDE.md` already exists with other content, stop and ask before overwriting.
10. **Bootstrap `_AGENT-INSTRUCTIONS/`** with `README.md`, `templates/`, `scripts/`, and optional `cache/`. Reuse the templates in `assets/templates/`.
11. **Bootstrap `_TASK-LOG/`** with `README.md`, `TEMPLATE.md`, and `actions.jsonl`. This is not optional for new projects. Copy `assets/templates/new-task.py` to `_AGENT-INSTRUCTIONS/scripts/new-task.py` so task creation can fill audit metadata automatically.
12. **Optional: bootstrap `_AGENT-INSTRUCTIONS/lessons/`** for important agent lessons that should be durable but not loaded every time (see `references/integrations.md`). **(confirm)**
13. **Optional: bootstrap `_CHANGELOG/`** by invoking `project-changelog` for coding-feature/change history. Use `_CHANGELOG/` as the folder, normalize copied docs to that folder name, and pass `--changelog-dir _CHANGELOG` to helper scripts (see `references/integrations.md`). **(confirm)**
14. **Optional: scaffold** (`bun create vite`, `uv init`, `cargo init`, etc.) per `~/AGENTS.md` toolchain preferences. **(confirm)**
15. **Git init + first commit + GitHub remote for non-OneDrive projects** — default branch `main`; create a private `<your-github-account>/<local-name>` remote when a `~/gitrepos/` repo needs a clone URL for `_REPOLOG`; push the initial commit when the user has asked for git/registry setup or the project is meant to sync across machines. **(confirm)** only for public remotes or nonstandard destinations.
16. **Register in `_REPOLOG/repo-map.tsv` for `~/gitrepos/` projects** — see `references/integrations.md`. This is default for non-OneDrive `~/gitrepos/` projects; do not defer it as a follow-up unless blocked.
17. **Summarize** what was done and what's left for the user to decide.

## Interview

Keep the tone conversational. Don't ask all questions upfront; thread them naturally. Provide a recommended answer with every question (mark it "(Recommended)") — the user confirms or corrects faster than they compose from scratch. The *why* for each question matters more than the question itself — if the user volunteers answers, skip ahead.

If the user's opening brief already gives a usable project description, do not ask for a separate "project pitch". Reuse the supplied brief and only ask for the missing pieces.

**Core questions (ask all):**

1. **Route check** — are we reviewing an existing project or starting a new one from the opening prompt?
2. **Project mode** — primarily development, research/content, project management, or hybrid?
3. **What is this project?** One-sentence pitch — what it does, not how. Skip this only if the user already gave a clear description.
4. **Why now?** What triggered starting it? (New client ask? Idea that's been simmering? Teaching prep?)
5. **Immediate goal** — what does "usable" look like in the next 1-2 weeks?
6. **Long-term vision** — where could this be in 6 months if it works? (Or "throwaway, don't bother.")
7. **Related projects** — anything in `~/gitrepos/` or the OneDrive vibecoding workspace this depends on, borrows from, or replaces? (Use the `_REPOLOG` read from step 5 to suggest gitrepo candidates when relevant.)
8. **Audience** — who uses this? (Self, students, colleagues, teachers, consulting clients, general public.)
9. **Collaborators** — solo, or are specific people involved? Named clients?

**Conditional questions (ask when relevant):**

- **Tech stack** — only if not obvious from archetype. For webapps default to Vite+React+TS+Tailwind+shadcn; for Python default to uv; for Rust default to cargo. Confirm, don't dictate.
- **External dependencies** — APIs, local models (mention `~/local-models/` cache), paid services, hardware.
- **Content vs code split** — for content pipelines (curriculum, archive, writing), ask if the project follows a strict content/website separation.
- **Repetition / pipeline** — is there a batch workflow that will run repeatedly? If yes, use `_TASK-LOG/` for the operational tasks and ask whether coding features, implementation decisions, backlog, or shipped changes should also be tracked in `_CHANGELOG/`.
- **Agent lessons** — ask whether the project needs `_AGENT-INSTRUCTIONS/lessons/` for durable lessons that are important but not always needed in context.
- **Hard-to-reverse decisions** — will the project lock in choices that are costly to change (formats, schemas, core naming, architecture)? If yes, add the ADR routing line to `AGENTS.md` and the `_CHANGELOG/` bridge rules when the changelog is enabled — see the grill-with-docs section of `references/integrations.md` (a companion skill, not included in this repo). Do not create `CONTEXT.md`/`docs/adr/` at setup; they come lazily.
- **Deployment target** — Cloudflare Pages, Vercel, GitHub Pages, local-only, private?
- **Secrets** — any needed? Remind the user where their canonical local secrets file lives (e.g. a `~/.env.*` file outside the repo).

See `references/interview-bank.md` for extended probes organized by archetype.

## Output contract

At the end, report:

- Files created (absolute paths)
- Files the user should review/edit before committing
- Next suggested action (e.g., "Run `bun install` now", "Add `_CHANGELOG/` if this becomes implementation-heavy")
- Related skills the user may want next (`project-changelog` for `_CHANGELOG/` feature/change entries, a dev-log routing skill for the triad logging if you keep one)

Keep the summary under 15 lines. The AGENTS.md itself is the real deliverable.
