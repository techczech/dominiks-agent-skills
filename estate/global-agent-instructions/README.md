# global-agent-instructions

An agent skill for creating one canonical global instruction file (an `AGENTS.md`-style payload) and wiring it into the coding agents you use. The installer supports Codex, Claude Code, Gemini CLI (Antigravity reads the same Gemini location), OpenCode and pi. It is for people who run several agent tools on one or more machines and want a single maintained copy of their standing instructions instead of one drifting file per tool.

The skill favours a "trigger-first" payload: short lines of the form "when X, read Y", with detailed procedure kept in separate reference files one hop away.

## What you need

- An agent that can load skills and run shell commands.
- Python 3 (standard library only) for the installer script.
- At least one of the supported tools installed. With `--tools detected` the installer selects only tools whose configuration directory already exists.
- macOS or Linux.

## What's in this folder

- `SKILL.md` - the procedure: inspect existing targets, build the payload, install, verify.
- `assets/trigger-first-global-instructions.template.md` - a scrubbed starting payload to copy and trim.
- `references/setup-and-installation.md` - tool-by-tool mapping, safe installation, multi-machine setup and troubleshooting. It also shows the canonical layout: a directory such as `~/agent-instructions/` (a stable path without spaces) holding `AGENTS-global.md` and a `refs/` folder of reference files that the payload's triggers point to.
- `scripts/install_global_instructions.py` - install, check, uninstall and dry-run support.
- `agents/openai.yaml` - interface metadata for OpenAI-style skill loaders.

## How to use it

Put the folder where your agent looks for skills (or symlink it there) and ask for global `AGENTS.md` or `CLAUDE.md` work. The agent follows `SKILL.md`. In outline:

1. Copy the template into a canonical directory (by default `~/agent-instructions/`) as `AGENTS-global.md` and remove sections you do not need.
2. Preview the installation with `--dry-run`, then run it. These targets are written under your home directory: `~/.codex/AGENTS.md`, `~/.config/opencode/AGENTS.md`, `~/.gemini/GEMINI.md` (Gemini CLI and Antigravity) and `~/.pi/agent/AGENTS.md` are symlinks to the payload. Claude Code's `~/.claude/CLAUDE.md` gets one `@` import line added, and its other content is left in place.
3. Run the installer with `--check` to verify.

## Caveats

- The installer never silently overwrites an existing global instruction file. Replacing one needs `--replace`, and replaced files are backed up.
- Run the installation on each machine. Keep the canonical directory in sync with version control or another mechanism you approve.
- Do not put secrets in the canonical directory.
- Fewer tokens do not prove a routing design works. Test for missed reference loads and for compliance.

## Licence

MIT, as for the rest of this repository (see the LICENSE file at the repository root).
