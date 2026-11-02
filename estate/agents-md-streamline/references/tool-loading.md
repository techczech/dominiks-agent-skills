# Tool Loading

Read only when loader behaviour affects the edit.

## Repository Scope

- Keep `AGENTS.md` as the canonical cross-agent body where supported.
- Keep a sibling `CLAUDE.md` as `@./AGENTS.md` when using the bridge convention.
- Use nested instruction files only for a genuine change in commands, risk, ownership, or verification.
- Do not explain loader mechanics inside generated instruction files.

## Global Scope

- Use `global-agent-instructions` for current tool paths, symlinks, Claude imports, backups, checks, and uninstall.
- Do not assume every tool reads the same basename or location.
- Keep one canonical payload; use thin tool-specific wiring.
- Verify current tool documentation before adding a new target.

## Bridge Rules

- Keep bridges content-free except for the required import.
- Do not use imports to conceal an oversized always-loaded body.
- Verify that the imported or linked destination exists.
- Update the bridge and installer together when the canonical path moves.
