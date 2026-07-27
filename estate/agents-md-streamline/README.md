# AgentsMDstreamline

Create and review `AGENTS.md` files as **working-context files** rather than project-memory files. An `AGENTS.md` should tell an agent what to do here; it should not explain how the project came to be.

Use the skill when an agent is asked to write a global, repo-root, or nested `AGENTS.md`; review an existing one; fix a `CLAUDE.md` bridge; or decide where a given instruction should live.

## What is in the skill

- `SKILL.md` — registers, size bands, keep/move rules, and the streamline workflow.
- `references/placement-rules.md` — the stricter keep test, the section lists, and ordering.
- `references/tool-loading.md` — how coding agents actually load instruction files, and the folder pattern that follows.
- `references/related-skills.md` — when to hand the work to an adjacent skill instead.
- `scripts/agents_md_audit.py` — a static audit of size, bloat, and wordiness.

## Running the audit

```sh
python3 scripts/agents_md_audit.py path/to/repo path/to/AGENTS.md
```

Arguments may be files or directories; a directory is expanded to the `AGENTS.md`, `CLAUDE.md`, and `SKILL.md` it contains. The script needs Python 3.9 or later and has no dependencies. It exits `0` when a file is clean, `1` when something is worth reviewing, and `2` when a file is past its split threshold.

The audit is a proxy, not a judge. It counts lines, flags long bullets and prose paragraphs, and greps for the headings that usually signal background material sitting in an operational file. Read its output as a prompt to look, not as a verdict.

## The three registers

The skill's central claim is that content changes register when it moves between files, and that agents routinely forget this:

- **For agents** (`AGENTS.md`, `CLAUDE.md`, `SKILL.md`, task logs) — telegraph style, imperatives, no throat-clearing.
- **For the reader** (`README.md`, reports, explainers) — ordinary readable prose, important information first.
- **As the author** — anything that will go out under a human's name, where the content must be theirs and gaps are questions to ask rather than blanks to fill.

Moving a paragraph from `AGENTS.md` into a `README.md` is therefore not a copy-paste. It is a rewrite.

## The folder convention

The placement rules assume one canonical instruction file per scope, with everything else given its own home:

- `AGENTS.md` — the canonical cross-agent instruction file.
- `CLAUDE.md` — a bridge whose only content is the line `@./AGENTS.md`.
- `_AGENT-INSTRUCTIONS/` — detailed agent-facing procedures, scripts, templates, cache.
- `_TASK-LOG/` — per-request operational state, blockers, and next actions.
- `_CHANGELOG/` — durable decisions and change history, where a project wants one.

Those directory names are a convention, not a requirement, and the skill will use whatever names a project already has. What matters is that each kind of content has exactly one home, and that the instruction file points at it instead of repeating it.

## Research provenance

The skill's stance was developed from the public material on agent instruction files:

- the `agents.md` specification and the `agentsmd/agents.md` repository
- GitHub's published analysis of roughly 2,500 agent instruction files
- OpenAI's Codex `AGENTS.md` guide and its Codex best-practices guide
- Anthropic's Claude Code memory documentation
- 0xfauzi's community `AGENTS.md` guide

Those sources agree on the main point: an `AGENTS.md` works better when it is short, specific, command-aware, boundary-aware, and layered by scope. Fifty lines is a good lean target, and most repo-root files sit comfortably between 30 and 90 lines once the content is genuinely operational.
