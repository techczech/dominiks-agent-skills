# Init Workflow

Guided walkthrough for setting up an editorial workspace in a new project. Walk through each file one at a time, explain what it's for, ask what the user wants, and generate it.

## Core Interaction Pattern

For each file:
1. **Explain** — What this file is and why it's useful
2. **Ask** — What the user wants (or if they want to skip it)
3. **Generate** — Create the file based on their answers
4. **Confirm** — Show what was created, move to the next file

## Prerequisites

- A project with markdown documentation (or plans to create some)
- A local copy of this skill, to link or copy in as `core/`

## Walkthrough Steps

### Step 1: Explain the Editorial Workspace

Explain what the editorial workspace provides:
- A structured place for editorial rules, glossary, and quality checks
- Slash commands for auditing, reviewing, and maintaining docs
- A changelog for tracking editorial work over time

Ask: Does this sound useful for your project? (If not, stop.)

### Step 2: Project Basics

Ask about the project:
- What is the project about?
- Where are the markdown docs? (default: `docs/`)
- Who is the target audience?
- What's their technical level?

### Step 3: Create Directory Structure

Create the editorial workspace:
```
editorial-workspace/
  core/              → this skill's files (symlink or copy)
  rules/
  guides/
  audit-reports/     (gitignored)
  research/          (gitignored)
  skills/
  agents/
```

Point `editorial-workspace/core` at this skill: symlink it if the skill lives elsewhere on the machine, or copy the files in if the project should be self-contained.

### Step 4: Generate editorial-config.json

Walk through each setting:
- `project`: Project name
- `docs_dir`: Where docs live
- `frontmatter.required_fields`: Which YAML fields every doc must have (suggest: title, status, updated)
- `frontmatter.allowed_status`: Valid status values (suggest: draft, review, published)
- `paths`: Where each file lives (glossary, changelog, rules, voice guide, etc.)

Generate the config based on answers.

### Step 5: Generate Structural Rules

Ask about the project's conventions:
- Do docs have a specific heading format? (e.g., emoji in H1?)
- Are there required sections? (e.g., Next Steps, footer?)
- Are there section separators? (e.g., `---` between H2s?)
- What link format do you use for cross-references?

Generate `rules/structural-rules.md` in plain English based on answers.

### Step 6: Generate Voice Guide

Ask about tone and style:
- How would you describe the voice? (e.g., "friendly expert", "casual teacher")
- Any words or phrases to avoid?
- Any words or phrases to prefer?
- How should jargon be handled?
- Any recurring metaphors or framing?

If existing docs are available, scan a few to suggest voice characteristics.

Generate `guides/voice-and-tone.md` based on answers.

### Step 7: Scan for Initial Glossary

If docs already exist:
1. Scan them for candidate terms (using the terms-workflow discovery approach)
2. Present candidates to the user
3. Generate `glossary.json` with approved terms

If no docs yet:
- Create an empty `glossary.json` (`[]`)
- Explain that `/doc-terms` will help discover terms as docs are written

### Step 8: Create Changelog

Create `changelog.jsonl` with a system entry:
```json
{"date":"YYYY-MM-DD","type":"system","description":"Editorial workspace initialized","files":[],"agent":"doc-init"}
```

### Step 9: Generate Skill Files

Create skill files in `editorial-workspace/skills/` for each command:
- `doc-audit.md`, `doc-terms.md`, `doc-review.md`, `doc-research.md`
- `doc-changelog.md`, `doc-capture.md`, `doc-learning-paths.md`

Each skill file should reference the generic workflow in `core/references/` and include project-specific context from the config and rules generated above.

### Step 10: Wire Into Agent

Depending on the agent platform:
- **Claude Code**: Copy skill files to `.claude/skills/`
- **Other agents**: Append references to their instruction files

### Step 11: Summary

Present what was created:
- List all generated files
- Show available commands
- Suggest running `/doc-audit` as a first check
