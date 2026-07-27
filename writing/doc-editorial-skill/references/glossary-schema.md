# Glossary Schema

The glossary is a JSON array in `editorial-workspace/glossary.json`. Each entry defines a canonical term.

## Entry Format

```json
{
  "term": "npm",
  "definition": "The default package manager for Node.js, used to install and publish JavaScript packages",
  "variants_ok": ["the npm registry", "npm CLI"],
  "variants_bad": ["NPM", "Npm", "node package manager"],
  "first_defined_in": "setup.md",
  "category": "tool"
}
```

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `term` | string | yes | Canonical spelling |
| `definition` | string | yes | One-sentence definition suitable for non-technical readers |
| `variants_ok` | array | yes | Acceptable alternative spellings/phrasings |
| `variants_bad` | array | yes | Incorrect or deprecated spellings to flag |
| `first_defined_in` | string | yes | Filename where this term is first explained |
| `category` | string | yes | One of: `tool`, `concept`, `platform`, `workflow`, `format` |

## Usage Rules

1. Every doc should use the canonical `term` spelling on first mention
2. `variants_ok` are acceptable in context (e.g. after first canonical mention)
3. `variants_bad` should be flagged by the terms checker and corrected
4. `first_defined_in` is the single source of truth — other docs should link to it, not re-explain
5. New terms discovered during editing should be added to the glossary
