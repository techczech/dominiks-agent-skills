# Editorial Workspace

This folder is your project's editorial quality system. Your AI agent uses it to check documentation for structural issues, discover terminology patterns, review voice and tone, and verify factual accuracy. Every workflow is interactive — it proposes findings and asks before acting.

The generic editorial patterns come from the [doc-editorial skill](core/SKILL.md), which sits in `core/`. Your project's specific rules, glossary, and conventions live here.

## Commands You Can Use

Tell your agent any of these, or describe what you want in plain language:

| Command | What it does |
|---------|-------------|
| `/doc-audit` | Audits docs across 5 dimensions: structure, completeness, consistency, navigation, audience fit |
| `/doc-terms` | Discovers candidate terms and checks terminology consistency |
| `/doc-review` | Reviews voice and tone — evolves the voice guide based on your feedback |
| `/doc-research` | Two-step fact verification: identifies claims, then verifies what you select |
| `/doc-changelog` | Logs what changed to the changelog |
| `/doc-capture` | Captures decisions and learnings at the end of a session |
| `/doc-learning-paths` | Proposes reader personas and generates reading sequences |
| `/doc-init` | Guided walkthrough for setting up a new editorial workspace |

## Your Files

| File / Folder | What it is | When to edit |
|--------------|-----------|-------------|
| `glossary.json` | Canonical terms with definitions and spelling rules | When adding concepts or changing terminology |
| `editorial-config.json` | Project settings and paths | When changing project structure |
| `rules/structural-rules.md` | Your conventions in plain English | When conventions change |
| `guides/` | Voice guide, templates, lessons learned | Updated during reviews and captures |
| `changelog.jsonl` | Log of all editorial actions | Don't edit — the agent appends to it |
| `skills/` | Skill files for each command | When customizing a workflow |
| `agents/` | Specialist reviewer instructions | When adding review specializations |
| `audit-reports/` | Output from audits and reviews | Read and delete as needed |
| `research/` | Working files from fact-checking | Same |
| `core/` | The shared doc-editorial skill files, linked or copied in | Don't edit through here |

## How It All Connects

Your local files (glossary, rules, config, voice guide) define **what** to check. The generic workflows in `core/references/` define **how** to check. Your skills in `skills/` combine both.
