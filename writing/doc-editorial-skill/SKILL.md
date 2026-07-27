---
name: doc-editorial
description: "Edit documents for clarity and structure."
---

# Doc Editorial Skill

Interactive editorial workflows for markdown documentation. Every workflow follows the same pattern: **propose → ask → act → learn**.

Always confirm with the user before making changes. Never auto-fix without approval.

## Project Setup

For new projects, use `/doc-init` for a guided walkthrough. See `references/init-workflow.md`.

For existing projects, the expected structure is:

```
your-project/
  editorial-workspace/
    core/                          → this skill's files (symlink or copy)
    editorial-config.json          # project settings and paths
    glossary.json                  # canonical terms
    changelog.jsonl                # append-only change log
    rules/structural-rules.md     # conventions in plain English
    guides/                        # voice guide, templates, lessons learned
    skills/                        # project-specific skill files
    agents/                        # specialist reviewer instructions
    audit-reports/                 # output (gitignored)
    research/                      # fact-check workspace (gitignored)
  docs/                            # markdown docs with YAML frontmatter
```

## Frontmatter

Every doc should have YAML frontmatter. See `references/frontmatter-schema.md` for the full schema.

Minimal:
```yaml
---
title: "Doc Title"
status: published
updated: 2026-03-01
---
```

## Workflow Decision Tree

**Auditing docs?** (structure, completeness, consistency, navigation, audience fit)
→ Read `references/audit-workflow.md`

**Reviewing voice and tone?** (style, evolving the voice guide from feedback)
→ Read `references/review-workflow.md`

**Discovering or checking terminology?** (find candidate terms, propose glossary entries)
→ Read `references/terms-workflow.md`

**Verifying factual accuracy?** (two-step: identify candidates, then verify selected)
→ Read `references/research-workflow.md`

**End of editorial session?** (capture decisions, update logs, preserve learnings)
→ Read `references/capture-workflow.md`

**Generating reading paths?** (interactive persona-based learning sequences)
→ Read `references/learning-paths-workflow.md`

**Setting up a new project?** (guided walkthrough to create editorial workspace)
→ Read `references/init-workflow.md`

## Data Formats

**Glossary** (`glossary.json`): Array of term objects. See `references/glossary-schema.md`.

**Changelog** (`changelog.jsonl`): Append-only JSONL. Each line: `{"date", "type", "description", "files", "agent"}`. See `references/changelog-schema.md`.

**Config** (`editorial-config.json`): Project name, docs directory, frontmatter rules, and paths to editorial files.
