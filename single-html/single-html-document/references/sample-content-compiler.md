# Sample Content Compiler

The sample compiler shows the minimum practical architecture for this skill:

1. Keep authored material in source folders.
2. Build a normal website with separate CSS and JavaScript.
3. Package the same rendered body, styles, scripts, images, and attachment records into one `.single.html` file.
4. Audit the packaged file.

Run:

```bash
node single-html-document/scripts/build-sample-websites.mjs
```

Verify:

```bash
node single-html-document/scripts/verify-sample-websites.mjs
```

## Source Layout

Each sample lives under `examples/sources/<slug>/`:

```text
site.json
pages/
  01-summary.md
  02-findings.md
artifacts/
  data.csv
```

`site.json` contains site-level data, design choice, metrics, timeline items, figure records, and attachment metadata.

Markdown pages use YAML front matter:

```markdown
---
title: Executive Summary
section: summary
kind: narrative
priority: high
---

Report text goes here.
```

The compiler validates:

- the source folder exists
- at least one Markdown page exists
- every Markdown page has a `title`
- generated page IDs are unique
- every declared attachment has an `id` and a readable file path
- attachment IDs are unique

## Generated Output

The builder writes to `examples/generated/<slug>/`:

```text
site/
  index.html
  styles.css
  app.js
<slug>.single.html
```

The `site/` version is the normal pre-package website. It deliberately keeps CSS and JavaScript separate.

The `.single.html` version inlines:

- CSS
- JavaScript
- generated visual assets as `data:image/svg+xml;base64,...`
- attachment payloads as Base64 records
- rendered Markdown page content
- full local Markdown source text in the source appendix
- a small search index

## Runtime Behaviour

The generated runtime has no network reads and no browser-time parsing of Markdown or JSON files.

It supports:

- internal anchor navigation
- search over rendered sections and source appendix entries
- gallery filtering
- attachment download through `Blob` URLs and `a.download`
- object URL cleanup on `pagehide`

The generated examples are intentionally dependency-free so they can run anywhere Node is available. For production projects, prefer the same content model with a stronger Markdown parser, schema validation, and a Vite/React or Astro rendering layer.
