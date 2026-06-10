# Dominik's Agent Skills

A public, shareable collection of agent skills by [Dominik Lukeš](https://github.com/techczech) for Claude Code, Codex, Gemini CLI, and similar agent harnesses.

These are **simplified, anonymized copies** of skills I use daily. The canonical versions live in private repositories because they are entangled with my personal machine setup, file layout, and other private skills. The copies here have been decontextualized so that anyone can read them, reuse them, and adapt them — paths are made relative or generic, references to private infrastructure are replaced with "adapt to your own setup" equivalents, and personal details are removed.

**Suggestions and changes are welcome.** Open an issue or a pull request if something is broken, unclear, or could work better.

## The skills

| Skill | What it does |
|---|---|
| [academic-pdf-to-mkd](academic-pdf-to-mkd/) | Convert academic PDFs to clean Markdown with auto-selected extraction engines (Docling / MinerU / pymupdf4llm / Poppler), including figures and tables. |
| [agents-md-streamline](agents-md-streamline/) | Create or tighten `AGENTS.md` / `CLAUDE.md` files as short working-context files rather than bloated project memory. |
| [claim-fact-checker](claim-fact-checker/) | Fan-out fact-checking workflow: one isolated verifier subagent per claim plus a source-quality skeptic, producing a findings + fix-plan pair. |
| [cognitive-walkthrough](cognitive-walkthrough/) | Run a structured Nielsen Norman cognitive walkthrough on any UI artefact (mockup, screenshot, URL, prototype) and write a pass/fail learnability report. |
| [codex-images-workflow](codex-images-workflow/) | Keep generated images reproducible: brief-first workflow, stable naming, per-image Markdown briefs, explicit versioning. |
| [corpus-tools-skill](corpus-tools-skill/) | **Link only** — lives in its own public repo. Local corpus-linguistics toolchain (NLTK, spaCy, Stanza, CWB, OPUS) on macOS. |
| [paper-reviewer-skill](paper-reviewer-skill/) | Systematic academic paper review pipeline: Zotero import, rich figure/table extraction, six review templates, single-HTML report builder. |
| [project-changelog](project-changelog/) | Maintain a repo-local `changelog/` folder as a structured narrative layer alongside git: changes, decisions, backlog, phases. |
| [project-setup](project-setup/) | Initialize or regularize a project workspace: interview-driven `AGENTS.md` + `CLAUDE.md`, task log, agent instructions, optional changelog and registry steps. |
| [single-html](single-html/) | Build self-contained single-file HTML deliverables (reports, handbooks, workbooks) — see the `single-html-document` sub-skill inside. |

## How to use them

Most agent harnesses discover skills from a skills directory. Symlink (or copy) a skill folder into the location your harness reads:

```bash
# Claude Code (global)
ln -s /path/to/dominiks-agent-skills/cognitive-walkthrough ~/.claude/skills/cognitive-walkthrough

# Or per project
mkdir -p .claude/skills
ln -s /path/to/dominiks-agent-skills/cognitive-walkthrough .claude/skills/cognitive-walkthrough
```

Each skill folder contains a `SKILL.md` (the file the agent reads), usually a `README.md` for humans, and supporting `references/`, `scripts/`, or `assets/` loaded on demand. Skills with extra install steps (Python dependencies, companion skills) document them in their own `SKILL.md`.

Two skills work as a pair: **paper-reviewer-skill** uses **academic-pdf-to-mkd** for its rich-extraction path and expects it as a sibling folder (or pointed to via the `ACADEMIC_PDF_SKILL` environment variable).

## Conventions you will see

Several skills reference a shared project layout I use across repositories. You can adopt it or adapt the skills to your own:

- `AGENTS.md` as the canonical cross-agent instruction file, with `CLAUDE.md` as a one-line `@./AGENTS.md` loader.
- `_AGENT-INSTRUCTIONS/`, `_TASK-LOG/`, and `_CHANGELOG/` as underscored admin folders for agent procedure, resumable task state, and durable change history.
- A personal repo registry and global backlog, referenced generically in these copies — substitute your own equivalents or ignore those steps.

## License

MIT — see [LICENSE](LICENSE).
