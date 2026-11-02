---
name: agents-md-streamline
description: "Use to create, audit or shorten global, repo or nested agent instruction files."
---

# Streamline Agent Instructions

## First Move

- Classify the target: global payload, repository root, nested scope, bridge, or skill.
- For a global multi-tool payload or installation, use `global-agent-instructions`.
- If that skill is unavailable, revise content only; report installation or wiring as blocked instead of guessing paths.
- Inspect active instructions, bridges, referenced files, and nearby human documentation.
- Run `scripts/agents_md_audit.py` against every target.

- Run `python3 scripts/agents_md_audit.py PATH...`; directories are recursive and skip generated or dependency directories.
- Exit 0 means clear, 1 means review, and 2 means a strong split warning or invalid input.
- Treat findings as heuristics; never delete automatically from a keyword match.

## Core Test
Keep a rule only when it is:

- needed in this scope;
- likely to prevent a material mistake;
- operational rather than historical;
- short enough to load repeatedly; and
- at the closest correct layer.

## Editing Rule

When editing instructions or skills: change the fewest words that solve the problem.
Prefer deleting or replacing to adding. Keep what is there unless asked.
A one-off incident is an example in a lessons file, not a new rule.
A new hard rule needs the user's say. Anything temporary goes in Temporary rules with an expiry date.
Skill descriptions say when to use the skill, not what it contains.

Treat `AGENTS.md` as working context, not memory. Treat `SKILL.md` as trigger and procedure, not an essay.

## Progressive Disclosure

- Keep always-needed boundaries and first actions inline.
- Route situational detail as `when X, read Y`.
- Make every route one hop: instruction file or invoked skill → exact destination.
- Create and review the destination before adding its trigger.
- Use descriptive, searchable filenames; folder containment is not enough identity.
- Do not leave a live rule only in an ADR, handoff, task log, or changelog.
- Put evidence and decisions in records; expose the current operational rule through a skill, reference, or README.
- Keep lower-frequency corrections in a reviewable lessons space instead of the global payload.
- Never use imports to conceal content that still loads every session.

## Placement
- Global cross-project default: direct global reference.
- Repeated workflow: skill.
- Repository-wide command, constraint, ownership, or verification: root `AGENTS.md`.
- Different nested command, risk, or ownership: nested `AGENTS.md`.
- Detailed local procedure, template, or schema: one-hop reference.
- Human overview, rationale, or history: `README.md`.
- Current blocker or next action: task state.
- Decision evidence or chronology: decision or change record.
- Reusable correction: lessons or corrections space.
- Self-loading instruction or duplicate body: delete.

Read `references/placement-rules.md` when placement is disputed.
Read `references/related-skills.md` when the work crosses into setup, writing, machine configuration, or knowledge capture.

## Register Boundary

- Agent-facing file: telegraph style; short labels, imperatives, no throat-clearing.
- Human-facing destination: rewrite as natural prose; do not paste telegraph text.
- Text sent under a person's name: use their source and voice workflow; do not infer missing claims.
- Route longer prose to the installed writing or readability skill.

## Bridges
- Keep one canonical instruction body per scope.
- Repository Claude bridge: none. Claude Code 2.1.277+ reads `AGENTS.md` natively at the repo root and in subfolders on demand, provided no `CLAUDE.md` or `CLAUDE.local.md` exists there or in a parent. Add a `CLAUDE.md` only for genuinely Claude-only content; it then hides `AGENTS.md` unless the user setting `pluginConfigs."agents-md@builtin".options.instructionFiles` is `claude-md-and-agents-md`. The global payload still reaches Claude through `~/.claude/CLAUDE.md` imports (no user-level `AGENTS.md` exists).
- Global tool paths, imports, symlinks, checks, and uninstall: `global-agent-instructions`.
- Read `references/tool-loading.md` only when loader behaviour affects the edit.

## Workflow

1. Mark each line: keep, route, rewrite for humans, record as evidence, or delete.
2. Record the disposition of removed details before deleting them.
3. Rewrite retained rules as self-contained operations.
4. Add exact routes only after their destinations exist.
5. Update bridge files and inbound links.
6. Re-run the audit and verify referenced destinations.
7. Report final line count, routes added, material moved, and records retained.
