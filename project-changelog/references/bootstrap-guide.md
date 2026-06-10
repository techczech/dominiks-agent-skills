# Bootstrap Guide

How to initialize `changelog/` in a new repo. Five minutes, no external
dependencies.

## Minimal layout

```
changelog/
├── README.md         # copied from assets/templates/changelog-README.md
├── AGENTS.md         # copied from assets/templates/changelog-AGENTS.md
├── changes/          # one file per narrative change record
├── decisions/        # one file per ADR-style decision
├── phases/           # optional; only if you run staged milestones
├── backlog/          # one file per backlog item
└── logs/
    └── worklog.jsonl # append-only, created empty
```

Only the buckets you will actually use need to exist. A small project might
start with just `changes/`, `decisions/`, and `backlog/`.

## Setup script

From the project-changelog skill directory:

```bash
# assumes current working dir is the target repo root
SKILL_DIR="$HOME/.claude/skills/project-changelog"
mkdir -p changelog/{changes,decisions,backlog,logs}
cp "$SKILL_DIR/assets/templates/changelog-README.md" changelog/README.md
cp "$SKILL_DIR/assets/templates/changelog-AGENTS.md" changelog/AGENTS.md
touch changelog/logs/worklog.jsonl
```

Add `phases/` only if the project has staged milestones to group work
under.

## First entry checklist

After bootstrap, seed one of each type so the routing rules have something
to anchor on:

1. A first decision recording why `changelog/` exists at all and who owns it.
   This is a cheap way to validate the decision template.
2. A `0000-backlog-skeleton.md` backlog item listing the first few things to
   work on. Archive or remove it once real items exist.
3. A worklog entry for the bootstrap itself, if the bootstrap was scripted.

## Using the helper scripts

Put the skill scripts directory on your path or invoke directly:

```bash
SCRIPTS="$HOME/.claude/skills/project-changelog/scripts"

# create a new entry
python3 "$SCRIPTS/new_entry.py" --type decision --title "Changelog Folder Convention"

# close a backlog item with its resolving change
python3 "$SCRIPTS/close_backlog.py" 01-showcase-categories --resolved-by showcase-subunits

# regenerate the index
python3 "$SCRIPTS/build_index.py"

# import a structured ticket backlog into canonical backlog entries
python3 "$SCRIPTS/import_backlog.py" --source reports/backlog.md

# archive done items older than 90 days
python3 "$SCRIPTS/archive_done.py" --older-than 90d

# append a worklog entry
python3 "$SCRIPTS/append_worklog.py" --action export --status completed --run-id 20260417T104205Z-export
```

All scripts accept `--changelog-dir <path>` to point at a non-default
location. Defaults to `./changelog/` relative to cwd.

## Adopting external planning docs

Many repos already have planning docs in `reports/` or `docs/`. Keep them
there. Do not create a new changelog bucket for them.

Use this pattern instead:

1. Bootstrap `changelog/`
2. Create any durable `decision` entries that lock future constraints
3. Create one `phase` entry per active implementation phase
4. Import structured backlog markdown into `changelog/backlog/` with
   `import_backlog.py`
5. Link the source planning docs from backlog, phase, or decision entries via
   `artifacts`

This keeps `changelog/` as the canonical execution/history layer while letting
the richer planning bundle live elsewhere in the repo.

## Configuration

Create `changelog/.config.json` for per-project defaults. All fields
optional:

```json
{
  "phases_enabled": true,
  "backlog_naming": "numbered",
  "archive_threshold_days": 90,
  "worklog_max_line_bytes": 2048,
  "run_artifact_dir": "derived/run-logs"
}
```

Scripts read this file if present and fall back to documented defaults
otherwise.

## Git integration

`changelog/` is the narrative layer alongside git, not derived from it:

- Git records what bytes changed. `changes/` records what was accomplished
  and why.
- Git branches die; `decisions/` endures.
- A PR description that would otherwise vanish into GitHub UI belongs in
  `changes/` if it has durable value.

Commit `changelog/` with the code that implements it. A change entry and
its commit should usually land in the same PR.
