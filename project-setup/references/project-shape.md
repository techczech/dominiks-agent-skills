# Project Shape and Detection

Use this to locate the real project root and classify the project.

## Contents
- Default project shape
- Root detection
- Archetype detection

## Default project shape

The current project-layout principle is:

- User-facing project content lives at the top level as files or clearly named content folders. Do not hide the material the user came to work on inside an administrative wrapper such as `content/` unless a build system specifically requires that path.
- Agent-facing scaffolding lives in `_AGENT-INSTRUCTIONS/`.
- Task logs live in `_TASK-LOG/`. This is the everyday operational record for all project tasks, including non-coding work.
- Coding-feature history, changelog, backlog, decisions, and durable change narrative live in `_CHANGELOG/` when that optional system is enabled.
- Keep `_TASK-LOG/` and `_CHANGELOG/` separate: task logs track the state of work; changelog entries track meaningful feature/change history.
- Administrative top-level folders use a single leading underscore, all caps, and hyphens between words: `_AGENT-INSTRUCTIONS/`, `_TASK-LOG/`, `_CHANGELOG/`.
- Top-level `AGENTS.md` and `CLAUDE.md` are the exception because agent tools discover them there. Keep them short and route detailed procedure into `_AGENT-INSTRUCTIONS/`.

## Root detection

First determine which project root model applies:

- `~/gitrepos/...` — standard numbered-group repo layout. Use `_REPOLOG` and the archetype table below.
- `<cloud-storage>/_vibecoding/...` — shared cloud-synced (e.g. OneDrive) vibecoding workspace. This path is intentionally the same on all machines. Treat it as a valid stable home for lightweight prototypes, analysis folders, and non-repo working directories that still benefit from local `AGENTS.md` instructions.
- `~/agent-demos/...` — local demos workspace for small experiments, proofs of concept, and model capability tests. Treat it as a valid home for lightweight projects with local git history; promote or mirror into `~/gitrepos/` before `_REPOLOG` registration if cross-machine sync becomes part of done.

If the CWD is under the OneDrive vibecoding root, do **not** tell the user it should move into `~/gitrepos/` by default. Instead, ask whether this folder is:

- a lightweight OneDrive-first working folder, or
- a real git repo that should eventually gain a mirrored home under `~/gitrepos/`

For OneDrive vibecoding folders, infer the archetype from the user interview and the contents rather than numbered group prefixes. Use the closest matching template:

- data analysis / reporting / scripts → `AGENTS-utility.md`
- dashboard / app / interface → `AGENTS-webapp.md`
- content-heavy research / notes / writing → `AGENTS-content.md`

If the CWD is under `~/agent-demos/`, treat it similarly to the vibecoding workspace for placement decisions:

- do not suggest relocation by default
- create lightweight local git by default
- infer the archetype from the user's brief and the contents
- prefer `AGENTS-utility.md` for script-driven demos and `AGENTS-webapp.md` for UI-heavy demos

## Archetype detection

Read the CWD path and match against the group folder prefix. Then read your repo registry's README for the *current* description of each group — that is the source of truth, not the names below.

The group names below are an example taxonomy — substitute your own:

- personal / work / public AI skill groups: default `AGENTS-skill.md`.
- personal config: default `AGENTS-utility.md`.
- presentation-tool group: default `AGENTS-content.md` or `AGENTS-utility.md`.
- scaffolded (e.g. Lovable) React/Vite webapps: default `AGENTS-webapp.md`.
- consulting/client work: default `AGENTS-consultancy.md`.
- institutional projects: default `AGENTS-consultancy.md` or `AGENTS-webapp.md`.
- language/pedagogy content: default `AGENTS-content.md`.
- general webapps: default `AGENTS-webapp.md`.
- Obsidian vaults: default `AGENTS-content.md`.
- upstream skill forks: default `AGENTS-fork.md`.
- writing archive: default `AGENTS-content.md`.
- CLIs, utilities, extensions: default `AGENTS-utility.md`.
- training materials: default `AGENTS-content.md`.
- writing and research: default `AGENTS-content.md`.
- `x-forks/`: third-party fork; default `AGENTS-fork.md`.
- `x-experiments/`: throwaway prototype; default minimal `AGENTS-utility.md`.
- `x-archive/`: superseded repo; refuse and suggest a different folder.

If the CWD is under neither `~/gitrepos/`, the cloud-synced vibecoding root, nor `~/agent-demos/`, ask where it *should* live before doing anything else. The numbered group system is load-bearing for git repos, but the OneDrive vibecoding root and the local demos workspace are also sanctioned work areas.

See `references/archetypes.md` for richer archetype notes, including content-vs-code distinctions, typical tech stacks, and cross-reference patterns.
