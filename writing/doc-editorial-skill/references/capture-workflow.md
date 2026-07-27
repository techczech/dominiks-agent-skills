# Capture Workflow

End-of-session workflow for capturing editorial decisions, updating logs, and preserving learnings. Run at the end of any editorial work session.

## Core Interaction Pattern

1. **Review** — Summarize what happened in the session
2. **Update** — Ensure changelog, frontmatter, and glossary are current
3. **Learn** — Capture decisions and learnings for future sessions
4. **Present** — Show the user a session recap with open items

## Inputs

- **Session context**: What was done during this session (edits, reviews, decisions)
- **Changelog**: `editorial-workspace/changelog.jsonl`
- **Glossary**: `editorial-workspace/glossary.json`
- **Lessons learned**: Project's lessons-learned file (path from config or `editorial-workspace/guides/`)
- **Voice guide**: Project's voice guide (may have been updated during a review session)

## Steps

### 1. Summarize the Session

Review what was done:
- Which docs were edited?
- What editorial decisions were made?
- What patterns were discovered?
- Were any voice guide updates made (from doc-review feedback)?
- What issues remain open?

### 2. Ensure Changelog Is Complete

Check `changelog.jsonl` — every edit from this session should have an entry. If any are missing, draft and present them for approval before appending.

### 3. Update Frontmatter Dates

For every doc modified in this session, set `updated` to today's date in the YAML frontmatter.

### 4. Update Glossary

If new terms were introduced or existing definitions refined during the session, update `glossary.json`. Present proposed changes before writing.

### 5. Capture Learnings

Append to the lessons-learned file:
- Style decisions and their rationale
- Common issues discovered (for future audits to catch)
- Voice guide changes made and why
- Patterns that worked well
- Things to watch for next time

### 6. List Open Items

Note anything unfinished for the next session.

### 7. Present Summary

Show a concise session recap:

```markdown
## Editorial Session — YYYY-MM-DD

### What Was Done
- [List of edits, reviews, decisions]

### Decisions Made
- [Style decisions, term choices, structural changes with rationale]

### Voice Guide Updates
- [Any changes made to the voice guide during this session]

### Learnings
- [Patterns discovered, things that worked, things to avoid]

### Open Items
- [Unfinished work, things to revisit]

### Files Modified
- [List of docs with brief description of changes]
```
