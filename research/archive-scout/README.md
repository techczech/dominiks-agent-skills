# Archive Scout

Instructions for agents that search, quote and analyse a personal text archive with the `scout` command-line tool, and write cited reports with a JSON sidecar. The package contains instructions only: no app, scripts or credentials.

## Install

1. Install the engine: `cargo install --git https://github.com/techczech/scout-core scout-cli` (provides `scout`).
2. Register your corpora in `~/.config/scout/corpora.toml` (`scout corpora init-defaults` writes a starter file to edit), then `scout index build`.
3. Copy this skill directory into your agent's skill location: `.claude/skills/archive-scout/` for Claude Code, `.agents/skills/archive-scout/` for Codex, or the host's user-wide skill folder.

Use `/archive-scout` in Claude Code or `$archive-scout` in Codex, or ask a question about your archive.

## Scope

Read [the skill](SKILL.md) for the rules (every quote verified; full-title citations; describe what texts say per period, never narrate change), the commands, the report recipe and the sidecar schema.
