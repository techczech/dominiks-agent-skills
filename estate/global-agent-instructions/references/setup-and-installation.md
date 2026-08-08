# Setup and Installation

## Canonical Layout

The installer supports macOS and Linux. Choose a stable path without spaces when Claude Code is among the targets:

```text
~/agent-instructions/
├── AGENTS-global.md
└── refs/
    ├── critical-operations.md
    ├── development.md
    ├── file-naming.md
    └── mac-apps.md
```

The global payload contains triggers. Each reference contains the rules for one recognisable situation. Do not create empty reference files merely to match the example. Add a trigger only after creating and reviewing its destination.

Useful trigger categories include writing for different audiences, file naming, development, browser delivery, project setup, macOS app builds and session completion. Add only the categories the user actually needs. A trigger can look like:

```markdown
- Before building, packaging, installing or testing a macOS app: read `~/agent-instructions/refs/mac-apps.md`.
```

## Tool Mapping

The installer supports these default user-level targets:

- Codex: `~/.codex/AGENTS.md` → symlink to the canonical payload.
- OpenCode: `~/.config/opencode/AGENTS.md` → symlink.
- Gemini CLI and Antigravity: `~/.gemini/GEMINI.md` → symlink. If the Gemini `context.fileName` setting has been customised, pass that relative path with `--gemini-target`.
- pi: `~/.pi/agent/AGENTS.md` → symlink.
- Claude Code: `~/.claude/CLAUDE.md` receives one exact `@/absolute/path/AGENTS-global.md` import line. Existing unrelated content remains in place.

Other tools may use project-local instructions or different global paths. Verify against current documentation before adding a target; do not guess:

- [Codex `AGENTS.md`](https://developers.openai.com/codex/guides/agents-md)
- [Claude Code memory and imports](https://code.claude.com/docs/en/memory)
- [Gemini CLI context files](https://geminicli.com/docs/cli/gemini-md/)
- [OpenCode rules](https://opencode.ai/docs/rules/)
- [pi context files](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/usage.md#context-files)

## Install

Use an absolute source path. `detected` selects only tools whose configuration directory already exists:

```bash
python3 <skill-directory>/scripts/install_global_instructions.py \
  --source /absolute/path/AGENTS-global.md \
  --install --tools detected --dry-run
```

After reviewing the plan:

```bash
python3 <skill-directory>/scripts/install_global_instructions.py \
  --source /absolute/path/AGENTS-global.md \
  --install --tools detected
```

If a target already contains user-managed content, the installer refuses to replace it. Inspect the file, then use `--replace` if replacement or Claude import insertion is correct. A uniquely named `.pre-global-agent-instructions.bak` backup is created first.

Use `--tools codex,claude` to select tools explicitly or `--tools all` to create every supported configuration directory.

The installer preflights every selected target before writing. Known conflicts therefore produce no changes. An unexpected filesystem failure can still leave a partial installation; run `--check` and then rerun installation after resolving the cause.

For a custom Gemini filename:

```bash
python3 <skill-directory>/scripts/install_global_instructions.py \
  --source /absolute/path/AGENTS-global.md \
  --install --tools gemini --gemini-target .gemini/CONTEXT.md
```

## Check and Uninstall

```bash
python3 <skill-directory>/scripts/install_global_instructions.py \
  --source /absolute/path/AGENTS-global.md --check --tools detected

python3 <skill-directory>/scripts/install_global_instructions.py \
  --source /absolute/path/AGENTS-global.md --uninstall --tools detected --dry-run
```

Uninstall removes only symlinks that point to the selected source and the exact Claude import line. It leaves unrelated files and links untouched.

On Windows, use the documented import or copy mechanisms for each tool unless symlink support is explicitly enabled. This installer does not manage Windows paths.

## Multiple Machines

- Keep the canonical directory in version control or another user-approved synchronisation system.
- Use the same stable logical path on each machine when practical. Run the installer separately on every machine because home-directory links are local state.
- Run `--check` after moving the canonical directory, restoring a machine or changing tools.
- A symlink to an unavailable volume or sync mount silently leaves the tool without global instructions. Prefer a path available at session start and check it after mount changes.
- Commit instruction files only after checking that they contain no credentials, private examples or machine-specific material that should remain local.

## Trigger-first Evaluation

Compare an inline-rule payload with a trigger-only payload on matched tasks. Use the same model and settings, fresh sessions, randomised order and repeated trials. Measure reference loading, rule compliance, irrelevant-rule leakage, conflicts, context use and completion quality. Treat token reduction as secondary evidence.
