# Tool Loading

Use when loader facts matter.

Keep this here. Do not copy loader explanations into generated `AGENTS.md`.

## Loading

- Codex: global, repo-root, then nested `AGENTS.md`; closer wins.
- Claude Code: `CLAUDE.md`; local file is only `@./AGENTS.md`.
- Claude global: absolute `@.../AGENTS.md` is acceptable.
- Other tools: prefer canonical `AGENTS.md` plus thin bridges.

## Folder Pattern

Default:

```text
AGENTS.md
CLAUDE.md
_AGENT-INSTRUCTIONS/
  README.md
  scripts/
  templates/
  cache/        # optional
_TASK-LOG/
_CHANGELOG/    # optional, for coding-feature/change history
```

Keep human project content visible.

## Bridge Rules

- Sibling `AGENTS.md` needs sibling `CLAUDE.md`.
- Local `CLAUDE.md`: exactly `@./AGENTS.md`.
- No heading. No explanation.
- Do not use `@` imports to hide bloat.
- Occasional procedures go in `_AGENT-INSTRUCTIONS/` or skills.
