---
name: coordination-hub
description: Set up or repair a personal coordination system for many projects and parallel AI agent sessions. Use for "where are my projects", "set up a hub", "session handoffs", "backlog capture", "agents lose context between sessions", or when a user runs many agent sessions and cannot track their state.
---

# Coordination Hub

One hub repo where every agent session starts. Hub routes to domains; domains route to project repos. User never has to remember where projects live or what state they are in.

## Sets up

- Hub repo: AGENTS.md, domains, ADRs, glossary, generated map, doctor check.
- Backlog: capture every session, promote real work to tasks.
- Handoff notes in the hub, readable cold.
- Self-healing: user corrections become rules, gated.
- Lessons log: reusable facts with evidence.
- Talking rules: how agents report to the user.
- Repo registry and sync: one table of repos, the routine repo state check, moving work between machines, the session-end checkpoint.

## Set-up order

1. Ask user: hub path (default `~/projects/hub/`), backlog path (default `~/projects/backlog/`), 3-6 domains.
2. Scaffold: `python3 scripts/scaffold_hub.py ~/projects/hub --domains writing,teaching,apps,admin` (add `--dry-run` first). Never overwrites.
3. Fill hub `AGENTS.md` and each domain `AGENTS.md`; list every repo in `repo-registry.md` (`references/repo-registry-and-sync.md`).
4. Create the backlog (`references/backlog.md`).
5. Put the first-move rule in the global instruction file every agent loads (skill `global-agent-instructions`).
6. Add the talking rules there too (`references/talking-to-the-user.md`).
7. Run `python3 scripts/scaffold_hub.py <hub> --check`.

## Daily loop

1. Session start: capture one line in the backlog.
2. Read hub `AGENTS.md`, then `.remember/now.md`. Pull repos you will touch; run `--status`.
3. Pick domain; read its `AGENTS.md` and newest `_TASK-LOG/` entry.
4. Work in the project repo.
5. Decisions that need the user go to the review queue (skill `dev-traffic-control`), not chat.
6. End: commit and push authorised work (sync reference), update `now.md`, add receipt/checkpoint to the backlog task, log task state in `_TASK-LOG/`.
7. Correction from user: run self-healing. Reusable finding: write a lesson.

## References

| Need | File |
|---|---|
| Hub layout, templates, ADRs, map, doctor | `references/hub-layout.md` |
| Capture, receipts, promotion, checkpoints | `references/backlog.md` |
| now/today/recent/archive buffer | `references/handoff-notes.md` |
| Correction protocol | `references/self-healing.md` |
| Lesson entries | `references/lessons-log.md` |
| Message rules for agents | `references/talking-to-the-user.md` |
| Repo registry, state check, moving between machines, session-end commit | `references/repo-registry-and-sync.md` |

Templates: `assets/templates/`. Scaffold, `--check`, `--status`: `scripts/scaffold_hub.py`.

## Related public skills

- `global-agent-instructions`: one canonical global instruction file across agent tools; hosts the first-move rule.
- `agent-roles`: who plans, builds, reviews.
- `dev-traffic-control`: review queue for decisions and checks.
- `writing-modes`: register for agent-facing vs user-facing text.
- `expository-writing`: plain, literal prose for reports.
- `agents-md-streamline`: keep AGENTS.md files short.
- `ai-working-style-builder`: capture the user's working preferences for agents.
