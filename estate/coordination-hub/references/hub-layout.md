# Hub layout

## Tree

```
<hub>/
  AGENTS.md              first move, routing, constraints
  CONTEXT.md             glossary
  COORDINATION-MAP.md    generated: domain list
  domains.json           machine-readable domain list
  repo-registry.md       see repo-registry-and-sync.md
  _ADR/                  numbered cross-domain decisions
  .remember/             handoff notes (handoff-notes.md)
  <domain>/
    AGENTS.md            scope, routes, rules for that domain
    _TASK-LOG/           one file per task
```

Templates: `assets/templates/hub-AGENTS.md`, `domain-AGENTS.md`, `task-log-entry.md`, `adr.md`.

## Rules

- Hub is governance only: no application code, no content corpus.
- One folder per area of work (domain). Start with 3-6; split when a domain's AGENTS.md exceeds one screen.
- Domain AGENTS.md names where the work actually lives (project repos, folders) and what a session must read first.
- Project repos keep their own AGENTS.md for repo rules; the domain routes to them.
- Hub AGENTS.md first move: read `.remember/now.md`, read the map, enter the domain, read its AGENTS.md.
- Keep AGENTS.md files telegraphic (skill `agents-md-streamline`).

## Task log

One file per task, `_TASK-LOG/<yyyy-mm-dd>-<slug>.md`. Header fields: status (`open`, `blocked`, `done`), owner session or agent, project path, next step. Body: what changed, evidence, open questions. Done tasks stay as history; checks ignore them.

## ADRs

Write one only when all three hold: hard to reverse; surprising without context; a real trade-off between options. Otherwise put the rule in an AGENTS.md.
Name `_ADR/NNNN-short-title.md`, four digits, never renumber. Format: title as the decision; context in one paragraph; considered options with why each lost; consequences. Supersede with a new ADR; mark the old one `Superseded by NNNN`.

## Glossary

`CONTEXT.md`: term, one-line meaning, where it is used. Add a term when two sessions used different words for one thing. Do not define code words that exist only inside one project.

## Map and doctor

- `scripts/scaffold_hub.py` generates `COORDINATION-MAP.md` from the `--domains` list it is given and writes the same list to `domains.json` (name, path) at the same time. It never overwrites either file. When domains change, update both together (add a `purpose` field to `domains.json` if useful) so the map never drifts.
- Doctor check, run after changing any router, domain or path. It verifies: each domain folder has AGENTS.md and `_TASK-LOG/`; the map lists every domain; paths named in routers exist; no router points at a retired path; open tasks carry a status.
- `scripts/scaffold_hub.py --check` covers the first two. Extend it for the rest as the hub grows; keep it one script.

## Failure modes

- Domain AGENTS.md duplicates repo AGENTS.md: they diverge. Route, do not copy.
- Map edited by hand: drifts. Generate it.
- ADR for a small rule: ADR folder becomes noise. Apply the three-part test.
- Hub accumulates content: move it to a project repo.
