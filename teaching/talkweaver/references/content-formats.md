# TalkWeaver source formats

## Outline

Retain the existing frontmatter and conventions. A small source example:

```markdown
---
title: A clearer explanation
outline_version: 2
auto_title_slide: false
auto_thanks_slide: false
---

## The question
{id=question}

What needs explaining?

### One example
{id=example}

- The first observation.
- The second observation.

:::notes
Speaker-only explanation belongs here.
:::
```

In the inspected compiler, structural `##` through `######` headings each begin a slide block; `#` is a title boundary. Headings inside code fences or HTML comments are not slide boundaries. Do not split source with an unrestricted heading regex. A slide block includes its trigger line, notes and body until the next structural heading.

Preserve `{id=...}` identifiers and their references. On application save, TalkWeaver can stamp missing IDs, record ledger history and return stamped content. File edits alone do not perform that lifecycle. Keep existing IDs across title changes and moves; new/copied slides need distinct identities under the app's rules, not duplicates of the original IDs.

Use the existing trigger line immediately below its heading. Preserve existing layout options and registered fenced object syntax. Consult the app's installed reference or the user's working examples before adding unfamiliar charts, diagrams, tables or layout triggers. Do not convert an entire talk to an older presentation-skill dialect.

## Pathway

The inspected app stores Pathways in `<vault>/_PRESENTATIONS/<talk-slug>/manifest.json`, under a `pathways` array. Verify this against the actual vault/version before a write. Merge into the existing manifest; preserve all other fields.

```json
{
  "pathways": [
    {
      "id": "short-introduction",
      "name": "Short introduction",
      "note": "An introductory cut of the existing talk.",
      "slideIds": ["question", "example"]
    }
  ]
}
```

This is a minimal schema example, not a replacement for an existing manifest. Pathway IDs must be unique within the Talk; names and IDs must be non-empty. `slideIds` is ordered and must contain no duplicates or empty IDs. Verify every referenced slide against current compiled identity or established source IDs. Report missing slides; do not silently drop them or substitute headings.

Choosing a Pathway selects content; it does not rewrite the audience wording in the original. If both a shorter cut and changed wording are requested, explain their distinct effects and preserve the requested original.

## Runs, assets and outputs

A Run is a delivery record, not another source outline. Preserve existing Run records, dates, links and Pathway relationships; do not invent a historical delivery or edit run-state files from a guessed schema. Read the actual app contract when writing Run metadata.

Keep relative assets relocatable and preserve speaker notes in the source. Treat audience slides, speaker notes, handouts and recordings as different publication surfaces. Inspect the real exported artefact before sharing; do not assume notes are absent because the audience view hides them.
