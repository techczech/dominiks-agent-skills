# Example: one operator's roles, October 2026

A real roles file, pinned 2026-10-24, from an operator who runs Claude Code as the orchestrator and hands building, fixing, review and testing to cheaper Claude models and to other providers' CLIs (Codex, Muse). It was produced by the reasoning in `../../references/principles.md` over several months of incidents and measurements.

- `agent-roles-SKILL.md`: the roles file itself, loaded before every delegation.
- `dispatch-detail.md`: the long builder brief, waiting and cache mechanics, verification routes and escape valves, moved out to keep the main file short.
- `cost-evidence.md`: the measurements and observations behind the seats, with list prices at the pinned date.
- `seats-template.md`: the template for the local layer that holds machine paths, meters and review queues.

Paths inside `agent-roles-SKILL.md` keep the operator's original layout: its `references/dispatch-detail.md`, `references/cost-evidence.md` and `references/seats-template.md` are the files beside it here; `references/seats.md` (the private local layer) is not published.

Read it for shape and for the kind of reasoning each rule carries. Do not copy its seats: models, prices and limits change every few weeks, and its tool and agent names (`codexbar`, `agent-run`, `lean-builder`, `lean-searcher`, `test-runner`, `ui-checker-*`, `dominik-writer`, `model-council`) belong to that operator's setup. "Gate set" and "release set" are that operator's named groups of risk-bearing tests.
