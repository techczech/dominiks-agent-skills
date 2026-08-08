---
name: global-agent-instructions
description: Create, streamline, share, install or repair one canonical global instruction payload across multiple agent tools. Use when setting up global AGENTS.md or CLAUDE.md behaviour, adopting trigger-first progressive disclosure, moving detailed rules into one-hop references, or wiring Codex, Claude Code, OpenCode, Gemini CLI, Antigravity or pi to the same source with symlinks and imports.
---

# Global Agent Instructions

## First Move

- Inspect existing global instruction targets and preserve any user-managed content.
- Choose one stable canonical directory available to every tool on the machine.
- Read `references/setup-and-installation.md` before changing tool configuration.

## Build the Instruction Set

1. Copy `assets/trigger-first-global-instructions.template.md` into the canonical directory as `AGENTS-global.md`.
2. Add only routes whose destination files already exist; remove sections the user does not need.
3. Keep the payload trigger-first: `when X, read Y`. Put detailed procedure one hop away in `refs/`.
4. Keep only immediate-harm boundaries inline. Do not copy histories, incidents, examples or current task state into the payload.
5. Use descriptive reference names and stable absolute paths.

## Install Across Tools

1. Preview detected targets:

   ```bash
   python3 scripts/install_global_instructions.py \
     --source /absolute/path/AGENTS-global.md --install --tools detected --dry-run
   ```

2. Inspect every existing target. Re-run without `--dry-run`; add `--replace` only after approving the reported replacement. The installer backs up replaced files.
3. Verify:

   ```bash
   python3 scripts/install_global_instructions.py \
     --source /absolute/path/AGENTS-global.md --check --tools detected
   ```

4. Report the canonical payload, tools wired, tools skipped, backups created and any manual action still required.

## Rules

- Never overwrite an existing global instruction file silently.
- Symlink tools that read `AGENTS.md` directly. Add one exact `@` import for Claude Code instead of replacing unrelated Claude instructions.
- Treat the canonical payload as the only maintained copy; references are separate canonical files, not pasted duplicates.
- Re-run installation on each machine. Synchronise the canonical directory through version control or another user-approved mechanism; never put secrets in it.
- Test trigger-only routing against missed reference loads and behavioural compliance. Fewer tokens alone do not prove the design works.

## Resources

- `references/setup-and-installation.md`: tool mapping, safe installation, multi-machine setup and troubleshooting.
- `assets/trigger-first-global-instructions.template.md`: scrubbed starting payload.
- `scripts/install_global_instructions.py`: install, check, uninstall and dry-run support.
