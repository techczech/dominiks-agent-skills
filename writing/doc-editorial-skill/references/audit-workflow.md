# Audit Workflow

Exploratory documentation audit across five dimensions. Discover issues, propose fixes, learn from user decisions.

## Core Interaction Pattern

1. **Scan** — Read docs and compile findings across all dimensions
2. **Present** — Show findings grouped by dimension, sorted by severity
3. **Ask** — Confirm which findings to address
4. **Act** — Execute only approved fixes
5. **Log** — Record changes to changelog

## Inputs

- **Target**: Single doc path or "all" (every `.md` in the docs directory)
- **Config**: `editorial-workspace/editorial-config.json` (paths, frontmatter rules)
- **Rules**: `editorial-workspace/rules/structural-rules.md` (project conventions in plain English)
- **Schema**: `references/frontmatter-schema.md` (frontmatter field definitions)

## Five Audit Dimensions

### 1. Structural Compliance

Check the mechanics of each document:
- Frontmatter present and valid (required fields, allowed values)
- Heading hierarchy (H1 → H2 → H3, no skips)
- Section separators, required sections (per project rules)
- Internal links resolve to existing files
- External links are well-formed URLs

### 2. Content Completeness

Identify thin or incomplete content:
- Sections with only 1-2 sentences (may need expansion)
- Placeholder text or TODO markers
- Sections promised in headings but not delivered
- Docs significantly shorter than peers in the same category

### 3. Cross-Doc Consistency

Find overlaps and contradictions across the doc set:
- Multiple docs explaining the same concept (single-source-of-truth violations)
- Contradictory instructions between docs
- Inconsistent terminology or naming between docs
- Broken narrative flow (doc A references concept X, but doc B that defines it uses different framing)

### 4. Navigation & Discoverability

Evaluate how well users can find and traverse content:
- Onward-link sections, where the project uses them (a "Next Steps" block or equivalent), form coherent paths with no dead ends and no circular loops
- Orphan docs not reachable from any other doc's links
- Cross-reference density (reference docs should be well-linked)
- Category groupings make sense

### 5. Audience Fit

Assess whether content matches the target audience:
- Assumed knowledge level (does the doc assume too much or too little?)
- Jargon density relative to audience
- Examples relevant to the audience's world
- Tone appropriate for the audience

## Report Format

```markdown
# Audit Report — YYYY-MM-DD

## Summary
- X docs scanned, Y findings across 5 dimensions

## Structural Compliance
- **file.md:12** — [finding] (severity)

## Content Completeness
- **file.md** — [finding] (severity)

## Cross-Doc Consistency
- **file-a.md ↔ file-b.md** — [finding] (severity)

## Navigation
- **file.md** — [finding] (severity)

## Audience Fit
- **file.md:34** — [finding] (severity)
```

Severity levels: Critical (must fix) → Warning (should fix) → Suggestion (consider).

## Output

- Write report to `editorial-workspace/audit-reports/audit-YYYY-MM-DD.md`
- Append entry to `editorial-workspace/changelog.jsonl`
- Present findings inline, ask user which to address
- For each approved fix: make the edit, update frontmatter `updated` date, log to changelog
