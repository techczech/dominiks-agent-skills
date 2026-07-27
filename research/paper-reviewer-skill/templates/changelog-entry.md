---
type: changelog
session_id: "YYYYMMDD-HHMMSS"  # Timestamp-based unique ID
session_date: "YYYY-MM-DDTHH:MM:SSZ"  # ISO 8601 timestamp
session_number: null  # Optional session number (1, 2, 3...)
description: "Brief session description"
papers_processed:
  - zotero_key: "JZUBTJM9"
    title: "Paper title"
    folder_name: "author-year-title-short-KEY"
    action: "imported"  # or reviewed, extracted, noted
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
  - type: "workflow_addition"
    workflow: "Workflow 1a"
    description: "New workflow added"
decisions:
  - decision: "Using Gelman-style reviews for RCTs"
    rationale: "Deep methodological critique needed"
  - decision: "Immediate commits after each review"
    rationale: "Clear tracking and versioning"
related_commits:
  - "b7838c1"
  - "89a2f39"
  - "cf9df2d"
tags:
  - "initial-setup"
  - "bean-2026"
  - "methodology-focus"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/reviews/gelman-review]]"
---

# Session: [Brief Description]

## Overview

[1-2 paragraph summary of what was accomplished in this session]

## Papers Processed

### Paper 1: [Title]
- **Action**: Imported/Reviewed/Extracted/Noted
- **Folder**: `author-year-title-KEY`
- **Context**: Why this paper, what makes it interesting

## Reviews Written

### [Review Style] for [Paper]
- **File**: [path]
- **Key insights**: [bullet points]
- **Time spent**: [duration]

## Extracts Created

### [Extract Type] from [Paper]
- **File**: [path]
- **Purpose**: Why this was extracted

## Notes Created

### [Note Title] (ID: [timestamp])
- **File**: [path]
- **Connection**: How this note relates to papers/other notes
- **Insight**: What was learned

## Repository Improvements

### CLAUDE.md Updates
- **Version**: [version number]
- **Changes**: [what was updated]
- **Reason**: [why it was needed]

### New Workflows
- **Workflow**: [name]
- **Purpose**: [what it enables]

### Template Updates
- **Template**: [name]
- **Changes**: [what was improved]

## Decisions Made

1. **Decision**: [what was decided]
   - **Rationale**: [why this approach]
   - **Impact**: [how this affects future work]

2. **Decision**: [another decision]
   - **Rationale**: [reasoning]

## Session Context

### What Led to This Session
[What prompted this work - new papers imported, continuation of previous work, etc.]

### Challenges Encountered
[Any problems solved, ambiguities resolved]

### Patterns Discovered
[Any new patterns or insights about the research process itself]

### Next Steps
[What should be tackled next, what questions remain]

## Related Links

- Source papers: [[link-to-papers]]
- Reviews: [[link-to-reviews]]
- Notes: [[link-to-notes]]
- Related sessions: [[link-to-other-changelog-entries]]

---

**Duration**: [total time spent]
**Commits**: [list of git commit hashes]
**Session ended**: [ISO timestamp]
