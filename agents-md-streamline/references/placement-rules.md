# Placement Rules

Use when `SKILL.md` is not enough.

## Keep Test

For each line, ask:

1. Needed during most work here?
2. True for this folder scope?
3. Omission likely to cause a real mistake?
4. Closest correct layer?
5. Too long to be a pointer?
6. Operational, not explanatory?

Keep only when mostly yes.

## Destinations

- Always-needed agent rule: `AGENTS.md`.
- First command: `AGENTS.md`.
- Skill trigger: `AGENTS.md`.
- Human overview, rationale, history: `README.md` (reader register; see `SKILL.md` `## Human-Facing Output`).
- Text sent out as the author: author-faithful register; see `SKILL.md` `## Author-Faithful Output`.
- Procedure, template, script, cache: `_AGENT-INSTRUCTIONS/`.
- Status, blocker, next action: `_TASK-LOG/`.
- Decision, change history, backlog: `_CHANGELOG/`.
- Repeated cross-project procedure: skill.
- Cross-project plan: a global backlog repo, if you keep one.
- Source notes, examples, schemas: referenced docs.
- Self-loading instruction: delete.
- Tool-loading semantics: skill/reference docs.
- Claude duplicate: `CLAUDE.md` bridge only.

## Sections

### Use:

- First move
- Commands
- Routing
- Ownership
- Constraints
- Do not do
- Verification

### Avoid in agent-facing files:

- Background
- Purpose
- Why this exists
- History
- Provenance
- Related projects
- Research takeaways

These sections belong in `README.md` when they are valuable to humans.

## Order

Top: first moves, safety, routing, verification.

Middle: commands and scoped detail.

End: final hard constraints only.

Do not bury rules that must never be missed.

## Size

- Under 50 lines: best for global files, simple repos, and narrow subfolders.
- 30-90 lines: normal repo-root range.
- 90-120 lines: review for compression.
- Over 120 lines: split detail elsewhere.
- Over 150 lines: exceptional; justify the load or split by directory.

Line count is a proxy. Instruction load is the real target.

## Research Takeaways

Kept here only as decisions:

- AGENTS.md is agent-facing; README is human-facing.
- Closer nested files override broader files.
- Short, accurate files work better than broad manuals.
- Claude imports organize text; they do not reduce context load.
- One canonical AGENTS.md beats duplicated tool-specific bodies.

Sources live in `../README.md`.
