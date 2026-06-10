# AgentsMDstreamline

This skill helps agents create and review `AGENTS.md` files as working-context files rather than project-memory files.

Use the skill when an agent is asked to create a global, project, or nested `AGENTS.md`; review an existing one for compliance; fix a `CLAUDE.md` bridge; or decide where instructions should live in the user's current project layout.

## Research Provenance

The skill was developed from a research pass over published guidance on agent instruction files. Key sources:

- `agents.md` public specification
- `github.com/agentsmd/agents.md` source repo
- GitHub blog analysis of 2,500 agent instruction files
- OpenAI Codex `AGENTS.md` guide
- OpenAI Codex best-practices guide
- Anthropic Claude Code memory docs
- 0xfauzi AGENTS.md community guide

The research supports the skill's main stance: `AGENTS.md` should be short, specific, command-aware, boundary-aware, and layered by scope. A 50-line file is a good lean target, but most repo-root files can reasonably sit in the 30-90 line range when the content is operational.

## Local Convention

The project setup this skill assumes (adapt to your own):

- `AGENTS.md` as the canonical cross-agent instruction file.
- `CLAUDE.md` as a one-line local loader: `@./AGENTS.md`.
- `_AGENT-INSTRUCTIONS/` for detailed agent-facing procedures, scripts, templates, and cache.
- `_TASK-LOG/` for per-request operational state and next actions.
- `_CHANGELOG/` for durable coding-feature history, decisions, and backlog when enabled.
- a global backlog repo for cross-project plans and priorities, if you keep one.
