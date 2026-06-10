# Project Bootstrap Options

Use this for optional changelog, _REPOLOG, git, GitHub, and scaffold commands.

## Contents
- Optional components
  - Changelog bootstrap
  - Direction layer (CONTEXT.md + ADRs)
  - _REPOLOG registration
  - Git init and GitHub
  - Project scaffolding
- References

## Optional components

### Changelog bootstrap

If the user wants coding-feature history, backlog, implementation decisions, or durable change narrative, invoke `project-changelog`; do not re-implement its routing, schema, scripts, or state machine here.

Project-setup convention: target folder is `_CHANGELOG/`, not the sibling skill's default `changelog/`.

Minimal bootstrap:

```bash
SKILL_DIR="$HOME/.claude/skills/project-changelog"
SCRIPTS="$SKILL_DIR/scripts"
CHANGELOG_DIR="_CHANGELOG"

mkdir -p "$CHANGELOG_DIR"/{changes,decisions,backlog,logs}
cp "$SKILL_DIR/assets/templates/changelog-README.md" "$CHANGELOG_DIR/README.md"
cp "$SKILL_DIR/assets/templates/changelog-AGENTS.md" "$CHANGELOG_DIR/AGENTS.md"
touch "$CHANGELOG_DIR/logs/worklog.jsonl"
```

After copying templates:

- Replace folder labels in copied docs from `changelog/` to `_CHANGELOG/`.
- Add `--changelog-dir _CHANGELOG` to helper examples in copied docs.
- Run `python3 "$SCRIPTS/build_index.py" --changelog-dir "$CHANGELOG_DIR"`.
- Skip `phases/` unless the user explicitly plans staged milestones.

Deeper work: invoke `project-changelog` directly.

### Direction layer (CONTEXT.md + ADRs)

If the interview surfaces hard-to-reverse decisions ahead (formats, schemas, core naming, architecture), the lane is `grill-with-docs`, not setup. Do NOT create `CONTEXT.md` or `docs/adr/` — they are created lazily when the first term or decision crystallises. Setup's whole contribution is the `AGENTS.md` routing line (plus the `_CHANGELOG/` bridge rules when the changelog is enabled); both are spelled out in `references/integrations.md`.

### `_REPOLOG` registration

For non-OneDrive projects under `~/gitrepos/`, add a row to the repo registry's `repo-map.tsv` during the same setup turn. Format and options are in `references/integrations.md` — but always read the current `repo-map.tsv` header and existing rows first, because column order or conventions may have evolved.

If the project has no remote yet and should sync across machines, create a private GitHub repo under your account, add it as `origin`, push `main`, then register the HTTPS clone URL. If the user explicitly wants local-only tracking, register an empty `clone_url` row with the correct lifecycle convention.

Do not propose `_REPOLOG` registration for OneDrive vibecoding folders unless the user explicitly wants the project mirrored into `~/gitrepos/` as a proper repo. OneDrive already provides the cross-machine substrate for that workspace.

### Git init and GitHub

For non-OneDrive projects, create git by default. Default branch `main`. Prefer private GitHub repos under your account when a clone URL is needed for `_REPOLOG`; use `gh repo create` rather than web UI. Do not create public repos without explicit confirmation.

### Project scaffolding

Per `~/AGENTS.md`:

- JS/TS webapp → `bun create vite . --template react-ts` (current directory, not subfolder)
- Python → `uv init` then add deps with `uv add`
- Rust → `cargo init`
- AI skill → create `SKILL.md` with YAML frontmatter; see `references/archetypes.md` for the pattern

Confirm before running scaffolds — some create files that interact with an existing AGENTS.md draft.

## References

- `references/archetypes.md` — richer notes on each archetype, tech stacks, content-vs-code patterns, cross-reference conventions
- `references/interview-bank.md` — extended question bank organized by archetype
- `references/integrations.md` — how to integrate with the repo registry, `project-changelog`, and companion skills
