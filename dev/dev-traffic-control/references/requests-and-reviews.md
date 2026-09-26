# DTC requests and document reviews

## Quick test request

Create `CONTROL_ROOT/<project>/YYYY-MM-DD-<subject>.md`. The project is the product's repository slug. One optional round directory is supported; do not nest further. All sidecars share the request's basename. Use a new descriptive basename when changing the questions; preserve the original request.

Example (replace build/version/date with observed values; omit unavailable optional facts rather than inventing them):

```markdown
---
id: export-image-check
title: Check exported images
app: Example Editor
version: 1.2.0
build: abc1234
date: 2026-09-10
intro: Please check that the exported document keeps its images.
mode: light
---

## The exported image is visible {#export-image}
Export a document with a picture and open the output; the **picture appears in place**.

## Also worth checking
- A second export uses the intended filename.
```

Ordinary testing does not need a guessed `kind: test`. Omit `kind` unless a supported kind is relevant. Each `##` check has a stable identity; use `{#id}` to keep it stable when wording might change in a future request.

Keep each light check to one paragraph, with no blank-line-separated body or nested checklist. Carry optional `**Steps**` and `**Expected**` only when useful, always with explicit `mode: light` so the app collapses them. Use `mode: detailed` only when a thorough pass was requested.

Keep the reserved `## Also worth checking` section last. Parked checks need no answer unless the reviewer chooses them. Do not begin an ordinary check heading with that reserved phrase. An `also-` ID alone is not proof of a parked origin; match it to the request.

## Document review

Write a new immutable review request with frontmatter `id`, `title`, `app`, `date`, `intro`, `kind: doc-review`, and provenance `source` plus `commit` when known. The full source remains at its home; the review carries a brief summary and only the sections needing a decision, not a verbatim copy of a long specification.

Use Markdown tables, images or small fenced HTML/SVG examples when they help the decision. Confirm support for relative images in the installed app. A decision block supplies clickable choices:

````markdown
```decision {#export-default}
Which export should be the default?
- HTML
- Word
```
````

With no options the documented defaults are Approve / Needs change / Reject. Retain explicit decision IDs. Answers return in `report.decisions[]`, separate from prose comments.

A revised source gets a new review snapshot if another review is needed. Apply feedback to the source document, never by rewriting the historical review request.
