# {{PROJECT_NAME}}

## Project

- Mode: {{PROJECT_MODE}}
- Scope: {{PROJECT_SCOPE}}
- Owner/audience: {{OWNER_AUDIENCE}}

## First Move

{{FIRST_MOVE}}

## Commands

{{COMMANDS}}

## Routing

{{ROUTING_RULES}}

## Project Layout

- User-facing files and content folders live at the top level.
- `_AGENT-INSTRUCTIONS/` holds agent-facing procedure, templates, cache, and migration notes.
- `_TASK-LOG/` holds one Markdown task per resumable request plus `actions.jsonl`.
- `_CHANGELOG/` is optional and holds coding-feature history, backlog, implementation decisions, and durable change narrative.

## Self-Healing

On user correction: classify, route, optionally promote.
Protocol: `_AGENT-INSTRUCTIONS/self-healing.md`.

## Verification

{{VERIFICATION}}
