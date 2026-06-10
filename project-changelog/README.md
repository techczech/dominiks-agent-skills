# project-changelog

## Scope

Maintain a repo-local `changelog/` folder as a structured narrative layer
alongside git, with deterministic routing rules, shared frontmatter, backlog
states, worklog conventions, and helper scripts to create, close, index, and
archive entries. Use when bootstrapping project history in a repo, writing
change notes, decisions, phase summaries, or backlog items, closing backlog
work with links to the resolving change, rebuilding `changelog/INDEX.md`,
repairing `logs/worklog.jsonl`, archiving old entries, or whenever a repo
already contains `changelog/changes`, `decisions`, `phases`, `backlog`, or
`logs/worklog.jsonl`. Also use when bridging external planning artefacts such
as PRDs, architecture docs, phased plans, or structured ticket backlogs into
changelog-owned `backlog/`, `phase`, and `decision` entries. Do not use for
release-notes-only `CHANGELOG.md` generation or git-derived changelog tools.

## Trigger

- Skill trigger: Maintain repo-local changelogs.
- Procedure: see `SKILL.md`.
