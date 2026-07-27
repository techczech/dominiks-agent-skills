# Planning Bridge

How `project-changelog` should interact with richer planning bundles such as
PRDs, architecture docs, phased plans, and imported ticket packs.

## Core rule

`changelog/` is the canonical execution and history layer. Rich planning docs
can stay outside it.

Keep:

- PRDs in `reports/` or `docs/`
- architecture notes in `reports/` or `docs/`
- phased implementation plans in `reports/` or `docs/`
- source backlog markdown outside `changelog/`

Convert:

- durable constraints into `decisions/`
- current executable work into `backlog/`
- milestones into `phases/`

Link back:

- use `artifacts` to point at the source planning docs

## Recommended mapping

| Source artefact | Canonical changelog representation |
|---|---|
| PRD | external doc + optional `decision` if it locks future work |
| Architecture doc | external doc + optional `decision` if it constrains future work |
| Phased plan | one `phase` entry per phase |
| Ticket pack | one `backlog` entry per ticket |

## Import workflow

1. Create any needed `decision` entries first.
2. Create `phase` entries for the current phases.
3. Import the structured backlog markdown with `import_backlog.py`.
4. Rebuild `changelog/INDEX.md`.
5. Treat imported backlog entries as canonical for execution tracking.

## Ticket-grade backlog fields

Backlog entries can optionally use:

- `priority`
- `owner`
- `depends_on`
- `artifacts`

These are execution-oriented and should not replace `refs`:

- use `depends_on` for execution order
- use `refs.part_of` for phase grouping
- use `refs.resolves` / `refs.resolved_by` for closure history
- use `refs.implements` / `refs.implemented_by` for decision linkage
