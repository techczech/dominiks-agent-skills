---
name: project-setup
description: "Initialize project workspaces."
---

# Project Setup

## First Move

- Choose route before creating files: existing-project review or new-project interview.
- Ask project mode: development, research/content, project management, or hybrid.

## Use

- Existing project: inspect contents, suggest changes, then ask questions before editing.
- New project: interview from the user's opening prompt before choosing structure.
- Synthesize project-specific `AGENTS.md` contents from answers and repo evidence.
- Apply `agents-md-streamline` principles before writing `AGENTS.md`: short operational rules, right placement, no boilerplate.
- Keep user-facing content at the top level unless a build tool requires otherwise.
- Separate `_TASK-LOG/` operations from optional `_CHANGELOG/` feature/change history.
- Generate the self-healing scaffold: `## Self-Healing` block in `AGENTS.md` + `_AGENT-INSTRUCTIONS/self-healing.md` from template. Mandatory; not optional.
- Offer `_AGENT-INSTRUCTIONS/lessons/` only as the escape hatch when feedback doesn't compress into a rule edit.
- Delegate `_CHANGELOG/` buckets, frontmatter, scripts, and state transitions to `project-changelog`.
- Direction layer (`CONTEXT.md`, `docs/adr/`) belongs to `grill-with-docs` (a companion skill, not included in this repo): never scaffold it empty; add the AGENTS.md routing line + `_CHANGELOG` bridge rules per `references/integrations.md`.

## References

- `references/workflow.md`: choose which reference to load
- `references/project-shape.md`: detect root, workspace class, and archetype
- `references/setup-workflow.md`: run the main setup checklist and interview
- `references/agent-scaffolding.md`: synthesize AGENTS/CLAUDE and task-log scaffolding
- `references/bootstrap-options.md`: decide optional git, GitHub, _REPOLOG, changelog, and scaffold steps
- `references/archetypes.md`: read richer archetype rules
- `references/interview-bank.md`: ask archetype-specific follow-ups
- `references/integrations.md`: coordinate sibling skills and infrastructure

## Verification

- Confirm generated AGENTS/CLAUDE are short and project-specific.
- Run the `agents-md-streamline` audit on generated `AGENTS.md` when the audit script is available.
- If `_CHANGELOG/` was created, verify copied docs name `_CHANGELOG/` and helper examples use `--changelog-dir _CHANGELOG`.
- Check git status and registry actions before reporting done.
- Leave clear next action when setup is partial.
