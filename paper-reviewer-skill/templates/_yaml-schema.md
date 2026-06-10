# YAML Frontmatter Schema

This document defines the YAML frontmatter structure for all markdown files in this repository. Every markdown file MUST have YAML frontmatter for processing and linking.

---

## Source Papers (`00-source.md`)

**Purpose**: Original paper import from Zotero, preserved in pristine format.

**Location**: `papers/{author}-{year}-{title-short}-{zotero_key}/00-source.md`

```yaml
---
type: source
zotero_key: JZUBTJM9
item_id: 9038
library_id: 1
library_name: "My Library"
item_type: journalArticle
title: "Paper title"
creators:
  - "Last Name, First Name"
  - "Author Two"
year: 2026
date: "2026-02-09"
publication_title: "Journal Name"
volume: null
issue: null
pages: "1-7"
publisher: "Publisher Name"
language: en
doi: "10.1038/..."
url: "https://..."
tags:
  - "Tag 1"
  - "Tag 2"
collections:
  - "Collection Name"
abstract: "Abstract text..."
date_added: "2026-02-10 16:55:03"
date_modified: "2026-02-10 16:55:03"
attachments:
  - "00-source.pdf"
exported_at: "2026-02-11T11:35:40.962Z"
---
```

**Required Fields**:
- `type`: Always "source"
- `zotero_key`: Unique Zotero identifier (used for lookups)
- `title`: Full paper title
- `creators`: Array of author names
- `year`: Publication year

**Optional Fields**: All other Zotero metadata

---

## Reviews (`reviews/*.md`)

**Purpose**: Review of a paper using a specific analytical style.

**Location**: `papers/{author}-{year}-{title-short}-{zotero_key}/reviews/{review-style}.md`

```yaml
---
type: review
review_style: gelman-review  # or quick-read, methods-deep-dive, critical-review
paper_key: JZUBTJM9
paper_title: "Paper title"
reviewed_date: "2026-02-11T14:30:00Z"
reviewer: "Claude Code (claude-sonnet-4-5)"
status: completed  # or in_progress, pending
duration_minutes: 45
tags:
  - "experimental-design-critique"
  - "statistical-issues"
  - "RCT"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
  - "[[20260211-143000-llm-human-paradox]]"
---
```

**Required Fields**:
- `type`: Always "review"
- `review_style`: One of: gelman-review, quick-read, methods-deep-dive, critical-review
- `paper_key`: Zotero key of the paper being reviewed
- `paper_title`: Title of the paper
- `reviewed_date`: ISO 8601 timestamp
- `reviewer`: Who conducted the review
- `status`: Current status (completed, in_progress, pending)

**Optional Fields**:
- `duration_minutes`: Time spent on review
- `tags`: Descriptive tags for categorization
- `links`: Wiki-style links to related content

**Valid Review Styles**:
- `gelman-review`: Andrew Gelman-style critical review
- `quick-read`: Fast overview for triage
- `methods-deep-dive`: Detailed methodological analysis
- `critical-review`: Academic peer-review style

---

## Extracts (`extracts/*.md`)

**Purpose**: Extracted content from a paper (methods, conclusions, etc.)

**Location**: `papers/{author}-{year}-{title-short}-{zotero_key}/extracts/{extract-type}.md`

```yaml
---
type: extract
extract_type: methods  # or conclusions, summary-card
paper_key: JZUBTJM9
paper_title: "Paper title"
extracted_date: "2026-02-11T14:30:00Z"
source_section: "Methods"  # Original section name from paper
tags:
  - "RCT"
  - "n=1298"
  - "LLM-evaluation"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/reviews/methods-deep-dive]]"
---
```

**Required Fields**:
- `type`: Always "extract"
- `extract_type`: Type of extraction (methods, conclusions, summary-card, etc.)
- `paper_key`: Zotero key of the source paper
- `paper_title`: Title of the paper
- `extracted_date`: ISO 8601 timestamp

**Optional Fields**:
- `source_section`: Original section name from paper
- `tags`: Descriptive tags
- `links`: Wiki-style links to related content

**Common Extract Types**:
- `methods`: Methodology section
- `conclusions`: Conclusions/discussion section
- `summary-card`: Shareable summary for external use
- `figures`: Extracted figures (stored in `figures/` subdirectory)

---

## Atomic Notes (`notes/*.md`)

**Purpose**: Single-idea notes following Zettelkasten principles.

**Location**: `papers/{author}-{year}-{title-short}-{zotero_key}/notes/{id}-{slug}.md`

```yaml
---
type: note
id: "20260211-143000"  # Timestamp-based unique ID: YYYYMMDD-HHMMSS
title: "LLM-Human Interaction Paradox"
created: "2026-02-11T14:30:00Z"
tags:
  - "paradox"
  - "human-AI-interaction"
  - "performance-degradation"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
  - "[[smith-2025-ai-education-ABC123/notes/similar-finding]]"
  - "[[20260210-120000-user-prompt-quality]]"
related_papers:
  - "JZUBTJM9"
  - "ABC123"
---
```

**Required Fields**:
- `type`: Always "note"
- `id`: Unique timestamp-based identifier (YYYYMMDD-HHMMSS)
- `title`: Clear, descriptive title for the note
- `created`: ISO 8601 timestamp

**Optional Fields**:
- `tags`: Descriptive tags for discovery
- `links`: Wiki-style links to related content (papers, reviews, other notes)
- `related_papers`: Array of zotero_keys for papers this note relates to

**Note ID Format**:
- Format: `YYYYMMDD-HHMMSS` (e.g., `20260211-143000`)
- Based on creation timestamp
- Ensures uniqueness and chronological ordering

**Atomic Note Principles**:
- **Single idea**: One concept per note
- **Self-contained**: Readable without external context
- **Linked**: Connected to sources and related notes
- **Tagged**: Descriptive tags for discovery
- **Titled**: Clear, descriptive title

---

## Linking Conventions

### Wiki-Style Links

Use double square brackets for internal links:

**Linking to Source Papers**:
```markdown
[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]
```

**Linking to Reviews**:
```markdown
[[bean-2026-llm-medical-assistants-JZUBTJM9/reviews/gelman-review]]
[[bean-2026-llm-medical-assistants-JZUBTJM9/reviews/quick-read]]
```

**Linking to Extracts**:
```markdown
[[bean-2026-llm-medical-assistants-JZUBTJM9/extracts/methods]]
[[bean-2026-llm-medical-assistants-JZUBTJM9/extracts/summary-card]]
```

**Linking to Notes (Same Paper)**:
```markdown
[[20260211-143000-llm-human-paradox]]
[[20260211-150000-benchmark-vs-reality]]
```

**Linking to Notes (Different Paper)**:
```markdown
[[smith-2025-ai-education-ABC123/notes/similar-finding]]
```

**Linking Across Papers**:
```markdown
[[smith-2025-ai-education-ABC123/00-source]]
```

### Link Format

- Links use the **full folder name** (human-readable)
- Folder names include: `{author}-{year}-{title-short}-{zotero_key}`
- The zotero_key at the end ensures uniqueness
- For notes, can use short form `[[note-id]]` if unambiguous

---

## Field Types and Formats

### Dates and Timestamps

**ISO 8601 Format**: `YYYY-MM-DDTHH:MM:SSZ`

Examples:
- `2026-02-11T14:30:00Z`
- `2026-02-10T16:55:03Z`

### Arrays

YAML arrays can be written in two ways:

**Block Style**:
```yaml
tags:
  - "tag1"
  - "tag2"
  - "tag3"
```

**Flow Style**:
```yaml
tags: ["tag1", "tag2", "tag3"]
```

### Strings

Use quotes for strings with special characters or colons:
```yaml
title: "Paper title: A comprehensive review"
```

### Status Values

**For Reviews**:
- `pending`: Review not started
- `in_progress`: Review in progress
- `completed`: Review finished

**For Papers** (in index/papers.yaml):
- `imported`: Paper imported, no reviews yet
- `in_progress`: Reviews in progress
- `completed`: All planned reviews complete
- `archived`: Paper archived

---

## Validation

Before committing any markdown file, verify:

1. ✅ YAML frontmatter exists and is valid
2. ✅ All required fields are present
3. ✅ Field values match expected types
4. ✅ Dates are in ISO 8601 format
5. ✅ Links use correct wiki-style format
6. ✅ Tags are descriptive and consistent
7. ✅ `type` field matches file location

---

## Examples

### Complete Review File

```markdown
---
type: review
review_style: gelman-review
paper_key: JZUBTJM9
paper_title: "Reliability of LLMs as medical assistants for the general public"
reviewed_date: "2026-02-11T14:30:00Z"
reviewer: "Claude Code (claude-sonnet-4-5)"
status: completed
duration_minutes: 45
tags:
  - "experimental-design"
  - "RCT"
  - "statistical-issues"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
---

# Gelman Review: Reliability of LLMs as Medical Assistants

## Executive Summary

This is a well-designed randomized controlled trial...

[Review content continues...]
```

### Complete Atomic Note

```markdown
---
type: note
id: "20260211-143000"
title: "LLM-Human Interaction Paradox"
created: "2026-02-11T14:30:00Z"
tags:
  - "paradox"
  - "human-AI-interaction"
  - "performance-degradation"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/reviews/gelman-review]]"
related_papers:
  - "JZUBTJM9"
---

# LLM-Human Interaction Paradox

A fascinating finding from Bean et al. (2026): LLMs tested alone achieved 94.9% accuracy on identifying conditions, but humans using the same LLMs achieved only 34.5% accuracy.

This suggests that the interface between human and LLM is a critical failure point, not just the LLM's capabilities.

## Implications

- Standard benchmarks test LLMs in isolation
- Real-world deployment requires human-LLM interaction
- User behavior significantly impacts outcomes
- Need new benchmarks that include human interaction

## Related Work

See [[smith-2025-ai-education-ABC123/notes/similar-finding]] for similar findings in education context.
```

---

## Changelog Entries (`changelog/*.md`)

**Purpose**: Session-to-session memory tracking for reproducible research.

**Location**: `changelog/{YYYYMMDD-HHMMSS}-{description}.md`

```yaml
---
type: changelog
session_id: "20260211-121949"  # Timestamp-based unique ID: YYYYMMDD-HHMMSS
session_date: "2026-02-11T12:19:49Z"  # ISO 8601 timestamp
session_number: 1  # Optional sequential session number
description: "Initial repository setup and first paper review"
papers_processed:
  - zotero_key: "JZUBTJM9"
    title: "Paper title"
    folder_name: "author-year-title-short-KEY"
    action: "imported and fully reviewed"
reviews:
  - paper_key: "JZUBTJM9"
    review_style: "gelman-review"
    file: "papers/folder-name/reviews/gelman-review.md"
extracts:
  - paper_key: "JZUBTJM9"
    extract_type: "methods"
    file: "papers/folder-name/extracts/methods.md"
notes:
  - note_id: "20260211-143000"
    title: "Note title"
    file: "papers/folder-name/notes/20260211-143000-slug.md"
repository_improvements:
  - type: "claude_md_update"
    version: "1.1"
    description: "What was improved"
  - type: "template_update"
    template: "gelman-review"
    description: "What was changed"
decisions:
  - decision: "Using Gelman-style reviews for RCTs"
    rationale: "Deep methodological critique needed"
related_commits:
  - "b7838c1"
  - "89a2f39"
tags:
  - "initial-setup"
  - "methodology-focus"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
  - "[[changelog/20260211-151212-collection-import]]"
---
```

**Required Fields**:
- `type`: Always "changelog"
- `session_id`: Unique timestamp-based identifier (YYYYMMDD-HHMMSS)
- `session_date`: ISO 8601 timestamp of session start
- `description`: Brief session description

**Optional Fields**:
- `session_number`: Sequential session number (1, 2, 3...)
- `papers_processed`: Array of papers imported/reviewed
- `reviews`: Array of reviews written
- `extracts`: Array of extracts created
- `notes`: Array of atomic notes created
- `repository_improvements`: Array of workflow/template changes
- `decisions`: Array of decisions made with rationale
- `related_commits`: Array of git commit hashes
- `tags`: Descriptive tags for categorization
- `links`: Wiki-style links to papers, notes, other sessions

**Atomic Changelog Principles**:
- **One session per file**: Each session independently documented
- **Timestamp-based ID**: Ensures uniqueness and chronological ordering
- **Self-contained**: Readable without external context
- **Linked**: Connected to papers, reviews, notes, other sessions
- **Tagged**: Descriptive tags for discovery
- **YAML frontmatter**: Enables programmatic querying

---

## Updates and Versioning

This schema may evolve over time. When adding new fields or file types:

1. Update this document
2. Add examples
3. Update CLAUDE.md with new workflows
4. Commit changes with clear message

**Current Version**: 1.0 (2026-02-11)
