# Frontmatter Schema

Every markdown doc should have YAML frontmatter between `---` delimiters at the top of the file.

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Document title as plain text (no emoji or markdown formatting) |
| `status` | enum | `draft` \| `review` \| `published` |
| `updated` | date | Last substantive edit (YYYY-MM-DD) |

## Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `template` | enum | Doc template type. Project-specific (e.g. `tutorial`, `reference`, `concept`) |
| `version` | number | Increment on substantive edits (start at 1.0) |
| `created` | date | Original creation date (YYYY-MM-DD) |
| `category` | string | Navigation category (project-specific) |
| `teaches` | array | Concepts this doc introduces (for learning paths) |
| `prerequisites` | array | Doc IDs that should be read first |

## Example

```yaml
---
title: "Getting Started"
template: A
status: published
version: 1.2
created: 2026-02-27
updated: 2026-02-28
category: start
teaches: [installation, first-project]
prerequisites: []
---
```

## Validation Rules

1. Frontmatter must be the first thing in the file (no blank lines before `---`)
2. `status` must be one of the allowed values
3. `updated` must be a valid ISO date
4. `teaches` entries should be lowercase, hyphenated terms
5. `prerequisites` entries should match existing doc IDs
