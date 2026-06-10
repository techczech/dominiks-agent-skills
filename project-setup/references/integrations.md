# Integrations with sibling skills and infrastructure

`project-setup` does not re-implement what other skills and tools already do. It delegates. This reference documents how.

## `project-changelog` (sibling skill)

Purpose: repo-local feature/change history with `changes/`, `decisions/`, optional `phases/`, `backlog/`, and `logs/worklog.jsonl`.

Folder rule: new or regularized projects use `_CHANGELOG/`. The sibling skill defaults to `changelog/`; pass `--changelog-dir _CHANGELOG` for helper scripts and update copied docs so they name `_CHANGELOG/`.

Task boundary: `_TASK-LOG/` is operational one-task-per-request state. `_CHANGELOG/` is meaningful feature/change history, decisions, backlog, phases, and pipeline worklog.

Integration:

1. Interview prompt: "Want `_CHANGELOG/` for coding-feature history, backlog, decisions, and meaningful changes?"
2. If yes, run:

   ```bash
   SKILL_DIR="$HOME/.claude/skills/project-changelog"
   SCRIPTS="$SKILL_DIR/scripts"
   CHANGELOG_DIR="_CHANGELOG"

   mkdir -p "$CHANGELOG_DIR"/{changes,decisions,backlog,logs}
   cp "$SKILL_DIR/assets/templates/changelog-README.md" "$CHANGELOG_DIR/README.md"
   cp "$SKILL_DIR/assets/templates/changelog-AGENTS.md" "$CHANGELOG_DIR/AGENTS.md"
   touch "$CHANGELOG_DIR/logs/worklog.jsonl"
   ```

3. Normalize copied docs:
   - folder label: `changelog/` -> `_CHANGELOG/`
   - script examples: add `--changelog-dir _CHANGELOG`
4. Optional phases: add `_CHANGELOG/phases/` only for confirmed staged milestones.
5. Validate: `python3 "$SCRIPTS/build_index.py" --changelog-dir "$CHANGELOG_DIR"`.
6. Root `AGENTS.md` pointer: `- Feature/change history: see \`_CHANGELOG/\` (project-changelog rules).`
7. Deeper work: create entries, close backlog, import ticket packs, and archive old work through `project-changelog`.

Skip: throwaway experiments in `x-experiments/`, Obsidian vaults, one-file utilities, and pure content archives with no coding-feature or implementation-decision history. Still create `_TASK-LOG/`.

## `grill-with-docs` (companion skill, not included in this repo)

Purpose: stress-tests plans against the project's domain language and grows the **direction layer**: `CONTEXT.md` (glossary only) and `docs/adr/` (architecture decision records).

Layer boundary: project-setup scaffolds the **execution layer** (`_TASK-LOG/`, `_CHANGELOG/`, `_AGENT-INSTRUCTIONS/`); grill-with-docs owns the direction layer. The two coexist in one repo.

Integration:

1. **Never scaffold direction-layer files at setup.** grill-with-docs creates `CONTEXT.md` and `docs/adr/` lazily, when the first term or decision actually crystallises. An empty glossary or ADR folder is noise.
2. **Ask the hard-to-reverse question in the interview** (see setup-workflow conditional questions). If yes, add ONE routing line to the generated `AGENTS.md`:

   ```markdown
   - Hard-to-reverse decisions → `docs/adr/` via `grill-with-docs` (three-part test); never silently contradict an existing ADR.
   ```

3. **Bridge rules when `_CHANGELOG/` is also enabled** — add to the generated `AGENTS.md`:

   ```markdown
   - Change entries tag the ADRs they touch (`adr-0002`); a new ADR gets a thin cross-link entry in `_CHANGELOG/decisions/` the same turn.
   ```

4. **Hand off, don't imitate.** When the user starts stress-testing a plan, sharpening terminology, or weighing a trade-off during setup, that is grill-with-docs territory — suggest it rather than grilling inside the setup flow (setup stays light; interview-bank says "Don't grill" deliberately).

The three-part ADR test (from grill-with-docs — an ADR needs all three):

1. **Hard to reverse** — changing your mind later costs something real.
2. **Surprising without context** — a future reader would ask "why this way?"
3. **A real trade-off** — genuine alternatives existed and one was picked for reasons.

## `_REPOLOG` registration

**What it is:** `_REPOLOG` is a registry repo at `~/gitrepos/_REPOLOG/` whose `repo-map.tsv` is the canonical registry of repos synced across machines (adapt the name and location to your own setup). Read the live header before editing; current installs may include `group_folder`, `local_name`, `clone_url`, `clone_policy`, and `lifecycle`.

**How to integrate:**

1. Read the current file header (`head -10 ~/gitrepos/_REPOLOG/repo-map.tsv`) to confirm the schema hasn't changed.
2. Read a few existing rows in the same group folder for convention (e.g., whether `clone_url` uses SSH or HTTPS).
3. For non-OneDrive `~/gitrepos/` projects, make sure the project has local git and a clone URL first unless the user explicitly wants local-only tracking. Prefer a private `<your-github-account>/<local-name>` GitHub repo for new personal/work repos.
4. Append a row like:

   ```
   10_webapps	my-new-project	https://github.com/<your-github-account>/my-new-project.git		active
   ```

   Use the live header order. Empty `clone_policy` = default clone policy. `no-clone` means register-only. Empty `clone_url` means local-only.

5. Commit and push `_REPOLOG` changes in the same turn when the user asked for git/registry setup. `_REPOLOG` is a shared logging/registry repo, so leaving it dirty makes future sync state ambiguous.

**When to register:** any non-OneDrive project under `~/gitrepos/`. If the project is outside `~/gitrepos/`, first decide whether it should be mirrored/promoted into `~/gitrepos/` before registering.

**When NOT to register:** OneDrive vibecoding folders unless the user explicitly wants a separate git mirror. Forks have separate conventions under `x-forks/`; still register them there when they are real tracked repos.

## Dev-log routing (companion skill, not included in this repo)

**What it does:** a dev-log skill routes logging across a triad of shared repos (global backlog / repo registry / dev log) with strict ownership rules.

**How to integrate:**

- For new-project onboarding, dev-log routing is usually *not* needed — it's for ongoing logging, not project setup.
- Mention it in the final summary if the project is non-trivial.

## `_TASK-LOG/` task logging

**What it does:** records the live operational state of work, one Markdown file per resumable request, plus a compact `actions.jsonl`.

**How to integrate:**

1. Always create `_TASK-LOG/` for new projects.
2. Copy `assets/templates/_TASK-LOG-README.md` to `_TASK-LOG/README.md`.
3. Copy `assets/templates/_TASK-LOG-TEMPLATE.md` to `_TASK-LOG/TEMPLATE.md`.
4. Create `_TASK-LOG/actions.jsonl` as an empty JSONL file.
5. Add a short task-log rule to root `AGENTS.md`: `Use _TASK-LOG/ for resumable multi-step requests.`

**When to use:** setup, migration, implementation, content capture, review, cleanup, and any multi-step request.

**When not to use:** a one-line answer that makes no project change and has no resumable state.

## `_AGENT-INSTRUCTIONS/lessons/` agent lessons

Purpose: durable lessons for future agents that are important but not needed in every context.

Use when:

- A project accumulates repeated agent mistakes or corrections.
- Prior investigation found a reusable pattern, pitfall, or tradeoff.
- Related-project knowledge matters sometimes, but would bloat root `AGENTS.md`.
- The lesson is too durable for `_TASK-LOG/` and not a formal decision/change for `_CHANGELOG/`.

Do not use for:

- Current status, blockers, or next action: `_TASK-LOG/`.
- Decisions, backlog, shipped changes: `_CHANGELOG/`.
- Human overview, related-project narrative, rationale: `README.md`.
- Rules needed during most work: root or nested `AGENTS.md`.

Bootstrap:

```bash
SKILL_DIR="$HOME/.claude/skills/project-setup"
mkdir -p _AGENT-INSTRUCTIONS/lessons
cp "$SKILL_DIR/assets/templates/_AGENT-INSTRUCTIONS-LESSONS-INDEX.md" _AGENT-INSTRUCTIONS/lessons/INDEX.md
cp "$SKILL_DIR/assets/templates/_AGENT-INSTRUCTIONS-LESSON.md" _AGENT-INSTRUCTIONS/lessons/TEMPLATE.md
```

Root `AGENTS.md` route, only when useful:

```markdown
- Lessons: search `_AGENT-INSTRUCTIONS/lessons/` before changing recurring setup policy.
```

## `_AGENT-INSTRUCTIONS/` administrative scaffold

**What it does:** stores agent-only procedure, templates, cache, and migration notes without burying the user's content.

**How to integrate:**

1. Always create `_AGENT-INSTRUCTIONS/` for new projects.
2. Copy `assets/templates/_AGENT-INSTRUCTIONS-README.md` to `_AGENT-INSTRUCTIONS/README.md`.
3. Create `_AGENT-INSTRUCTIONS/templates/`, `_AGENT-INSTRUCTIONS/scripts/`, and `_AGENT-INSTRUCTIONS/cache/`.
4. Copy `assets/templates/new-task.py` to `_AGENT-INSTRUCTIONS/scripts/new-task.py`.
5. If confirmed, create `_AGENT-INSTRUCTIONS/lessons/` from the lesson templates.
6. Put repeated workflow detail here and keep root `AGENTS.md` short.

## `claude-md-management` (plugin)

**When to route to it instead:**

- If the user lands in a folder that *already has* a meaningful AGENTS.md or CLAUDE.md, do not overwrite. Suggest `claude-md-improver` from `claude-md-management` for updates.
- project-setup is for bootstrap. claude-md-improver is for refinement.

## Global instructions

Global toolchain defaults, machine facts, and cross-project rules stay in the global instruction layer.

Do not add a generic `~/AGENTS.md` pointer or global-default summary to generated project `AGENTS.md`. Project `AGENTS.md` should list only project-specific commands, constraints, routing, ownership, and verification.

## `~/local-models/` cache

**What it is:** shared HuggingFace / MLX model cache (`HF_HUB_CACHE=~/local-models`).

**When to mention in AGENTS.md:** if the project uses local inference (speech-to-text, text-to-speech, embedding models, etc.). Add a Dependencies section:

```markdown
## Dependencies

- `~/local-models/` — shared HuggingFace cache (models downloaded here are reused across projects)
```

## Local secrets file

**What it is:** the user's private env file for API keys, kept outside any repo (e.g. a `~/.env.*` file).

**When to mention in AGENTS.md:** if the project needs API keys. Don't list the keys themselves — just point at the file.

## Scaffolding commands

Match archetype and toolchain:

| Archetype | Command |
|---|---|
| JS/TS webapp (new) | `bun create vite . --template react-ts` |
| Python (new) | `uv init` then `uv add` for deps |
| Rust CLI | `cargo init` |
| AI skill | Manual — write SKILL.md with YAML frontmatter |
| Content pipeline | Manual — keep canonical user-facing files or content folders at the top level; add rendering/tool folders only when needed |

**Always confirm before scaffolding.** Some scaffolds create files that clash with an AGENTS.md already being drafted.

## Git and GitHub

- Default branch `main`
- For non-OneDrive setup in `~/gitrepos/`, git init, first commit, private GitHub remote, push, and `_REPOLOG` row are part of done unless the user explicitly says local-only
- Use `gh repo create` rather than web UI for consistency
- The gitleaks pre-commit hook scans for secrets — if it fails, investigate, don't bypass with `--no-verify`
