# <Hub name>

## First move

1. Capture one line in the backlog (`<backlog>/`).
2. Read `.remember/now.md`, then `COORDINATION-MAP.md`.
3. Enter the domain; read its `AGENTS.md` and newest `_TASK-LOG/` entry.

## Routing

- Active handoff: `.remember/now.md`
- Decisions: `_ADR/`
- Glossary: `CONTEXT.md`
- Repos: `repo-registry.md`
- Backlog: `<backlog>/`

## Constraints

- Governance only: no application code, no content corpus.
- Run `scripts/scaffold_hub.py <hub> --check` after changing a router, domain or path.
- Handoff notes must be readable cold.

## Self-healing

On user correction: classify, route, optionally promote (see skill `coordination-hub`).
