# Writing Mode: FOR AGENTS (agent-facing)

Target: `AGENTS.md`, `SKILL.md`, `TASK.md`, logs — files written for an agent to act on. **Never chat: the user reads chat, so chat is FOR THE USER even in a turn that just wrote these files.**

- Telegraph. Short labels, imperatives, no throat-clearing. Min tokens.
- Noun phrases ok; drop grammar when clear. Self-contained — keep load-bearing nouns, conditions, file relationships.
- Prefer `Label: action.` and `key: value` lines over paragraphs; bullets over tables.
- Headings through `###` for real subsections.
- Decisions, not rationale. No background, history, provenance, or chronology — those go to `README.md`.
- Discovery: `rg`/file maps first; read surrounding content before deciding. Don't solve semantic tasks by filename or string match alone.
- Never tell an agent to read/load the same file it is already in; don't explain auto-loading; don't hide bloat behind `@` imports.

Depth: `agents-md-streamline` skill, if installed — placement tests, sizing, split rules.
