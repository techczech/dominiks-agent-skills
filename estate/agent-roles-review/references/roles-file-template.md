# Roles file template

Copy into the operator's own roles file and fill in. Delete sections that do not apply. Worked example: `../examples/one-operator-2026-10/agent-roles-SKILL.md`.

```markdown
---
name: agent-roles
description: "Load before delegating work to any model or subagent, before routing tests, or when tempted to build inline."
---

# Agent roles

Default: <when the orchestrator does the work itself; when it delegates>.
Local layer: <path to machine-specific seats, meters, paths>, read before dispatching; it overrides this file.

## Current seats (pinned YYYY-MM-DD)

| Role | Seat | Why |
|---|---|---|
| Orchestrator | | |
| Implementer | <model, launch command or agent type, effort> | |
| Hard seat | | <named reasons only> |
| Reviewer | <never the builder> | |
| Fix lane, searches | | |
| Tester | | |
| Writer | | |
| On request only | | |

Availability: <who drops out when a provider is down, and who replaces them>.

## Budget

- <how to read each meter before a large spend; what reading goes to the operator>

## The loop

<one paragraph: who plans, builds, fixes, reviews, tests>

## Dispatch

- <agent type per seat; one parcel per agent; parcel classes (fix, implement, hard); who commits>

## Role briefs

<builder, reviewer, tester briefs: the text that opens every dispatch prompt>

## Review law

<when review is owed; round cap; exemptions>

## Fix lane

<what counts as a fix; what does not; how it is checked>

## Verification and test levels

<who checks what: operator, sweep, tester, end-to-end journey; test levels by care or risk>

## Exceptions

<stated in the turn when taken; what happens on outage or spent budget>
```

Decision log beside it, one entry per rule:

```markdown
## <Rule, short> (YYYY-MM-DD)

<What happened or what the operator said; the numbers if measured.> Rule: <the rule as it now stands>.
```
