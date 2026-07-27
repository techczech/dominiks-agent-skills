# Terms Workflow

Discovery-focused terminology workflow. Scan docs to find candidate terms, propose glossary entries, and check existing terms for consistent usage.

## Core Interaction Pattern

1. **Discover** — Scan docs for candidate terms across all categories
2. **Present** — Show candidates grouped by category with context
3. **Ask** — Confirm which terms to add/update in the glossary
4. **Check** — Also verify existing glossary terms are used consistently
5. **Update** — Write approved entries to glossary, log to changelog

## Inputs

- **Target**: Single doc path or "all"
- **Glossary**: `editorial-workspace/glossary.json` (existing terms)
- **Config**: `editorial-workspace/editorial-config.json` (audience context)

## Term Discovery

Scan docs for candidate terms across four categories:

### 1. Project-Specific Jargon

Words or phrases coined by or specific to this project. Look for:
- Capitalized compound phrases used repeatedly
- Terms in quotes or emphasized on first use
- Concepts explained as if introducing them

### 2. Technical Terms for the Target Audience

Terms the target audience wouldn't know. Consider the audience described in the config. Look for:
- Abbreviations and acronyms (API, CLI, DNS, SSH)
- Developer concepts (localhost, repository, deployment)
- Tool-specific vocabulary (commit, push, merge)

### 3. Tool & Product Names

Proper nouns that need specific capitalization. Look for:
- Software tools with non-obvious casing (GitHub, macOS, npm)
- Products mentioned across multiple docs
- Capitalization variants of the same name

### 4. Audience-Specific Phrases

Phrases from the audience's domain used in a specific or adapted way. Look for:
- Domain terms recontextualized for this project
- Metaphors used consistently to explain concepts
- Recurring phrases that carry project-specific meaning

## Discovery Process

1. **Frequency scan** — Find words/phrases appearing in 2+ docs
2. **Capitalization analysis** — Find terms with inconsistent casing across docs
3. **Context extraction** — For each candidate, show where it appears and how it's used
4. **Glossary comparison** — Flag candidates already partially covered by existing entries

## Presenting Candidates

Group candidates by category. For each, show:
- The candidate term
- Where it appears (doc names, approximate count)
- Current usage variations (if any)
- Proposed canonical form
- Whether it's already in the glossary (partial match)

Ask the user:
- Which candidates to add to the glossary?
- What should the canonical form be?
- What are acceptable and unacceptable variants?
- Where is the term first defined?

## Consistency Check (Secondary)

After discovery, also check existing glossary terms:
- **Bad variants**: Search for `variants_bad` entries in docs
- **First-mention linking**: Glossary terms should link to `first_defined_in` on first use
- **Definition drift**: Docs re-explaining terms defined elsewhere

## Output

- Write report to `editorial-workspace/audit-reports/terms-YYYY-MM-DD.md`
- Update `editorial-workspace/glossary.json` with approved entries
- Append entry to `editorial-workspace/changelog.jsonl`
- Present findings inline, ask for approval before any changes
