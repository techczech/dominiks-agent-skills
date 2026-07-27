# Changelog Schema

The changelog is an append-only JSONL file at `editorial-workspace/changelog.jsonl`. Each line is a JSON object recording one editorial action.

## Entry Format

```json
{"date": "2026-02-28", "type": "audit", "description": "Structural audit of all docs", "files": ["setup.md", "workflow.md"], "agent": "doc-audit"}
```

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | yes | ISO date (YYYY-MM-DD) |
| `type` | enum | yes | `audit` \| `edit` \| `structure` \| `terms` \| `style` \| `research` \| `system` |
| `description` | string | yes | Brief summary of what was done |
| `files` | array | yes | List of affected filenames (empty array if system-level) |
| `agent` | string | yes | Who did it: `human`, skill name, or agent name |

## Rules

1. Always append, never edit or delete existing entries
2. One entry per action (not per file — a single audit sweeping the whole doc set is one entry)
3. `description` should be specific enough to understand months later
4. `files` contains just filenames (e.g. `setup.md`), not full paths
