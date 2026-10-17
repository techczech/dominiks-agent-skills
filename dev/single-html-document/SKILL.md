---
name: single-html-document
description: "Builds a document as a normal website from Markdown/YAML source, then packages it as one offline HTML file and delivers the editable source with it. Use for a single-file HTML report, handout, slide deck or review workbook that opens from disk."
---

# Single-File HTML Documents

Build the website first. Package it second. Deliver the editable source with it.

Treat single-file HTML as a delivery format, not an authoring format. Keep content, styling, scripts, media, interaction state, and export contracts separate while building the project, then collapse the finished document into one browser-openable file only after the normal website works. The canonical authored source for every user-facing string is Markdown with YAML front matter; the HTML is generated output. Read [references/editable-source.md](references/editable-source.md) before authoring or revising a deliverable.

## Non-Negotiable Principle

The delivered document is one modern, polished HTML file that contains the full reading or working experience.

- Do not make the Markdown source available only as a detached export, download, or provenance appendix. It must be the editable source that drives the build.
- Keep every authored user-facing string in Markdown with YAML front matter, including prose, guides, prompts, headings, navigation, labels, placeholders, help, errors, status messages, accessibility labels, and calendar/export copy. Inline HTML markup is allowed in Markdown where needed for rendering.
- Any local source text needed for understanding the document must be incorporated into the page as rendered content, searchable content, an appendix, source drawer, or embedded provenance section.
- Downloads are reserved for files that genuinely need separate distribution, especially PDFs, CSVs, spreadsheets, slide decks, or other binary/tabular attachments.
- External links are acceptable as citations or live service embeds, but they are not a substitute for incorporating the local source text needed by the document.
- If the document collects notes, annotations, edits, ratings, screenshots, or audio, those are runtime user-entered or imported data, distinct from authored copy, with a versioned export contract.
- The final file should feel like a designed product, not a plain generated dump.

## Start Here

- Reuse an existing project if the user already has one. Otherwise default to Vite + React + TypeScript for new work.
- Keep all authored content and UI copy in Markdown with YAML front matter, then compile it into generated JSON or TypeScript before rendering. Do not maintain a second authored copy in HTML, JavaScript, JSON, or TypeScript.
- Keep author-time CSS and JavaScript in separate files. Inline only at the packaging stage.
- For interactive feedback, annotation, or edit-diff documents, keep the reviewed data, commented client JavaScript, and generated HTML separate. Strip comments and package the distribution script only in the build step.
- Build a normal multi-file site first. Do not try to design directly inside one giant HTML file.
- Keep the final deliverable valid `.html`.
- When the user asks for a visual, interactive, reviewable, editor-like, or "not boring" document, read `references/html-effectiveness-patterns.md` before UI code.
- Choose a source pattern and preserve its interaction contract, not just its general vibe.
- Invent a new interaction pattern only when existing patterns are unsuitable.
- New pattern path: propose to user -> build small test implementation -> ask approval -> update skill after approval.

## Precedent Patterns

These four shapes recur and are worth reaching for before designing a new one:

- Rich presentation handouts with extracted media, typed data, and presentation-oriented navigation.
- Browser-native slide decks with keyboard navigation, presenter notes, overview/search drawers, printable handout mode, and packaged screenshot/media assets.
- Markdown + YAML front matter compiled into generated JSON before rendering.
- Small-scale self-contained HTML export where all text, CSS, JavaScript, icons, and media are incorporated at package time.

Prefer reusing a proven content-build pattern over inventing a new schema from scratch. If the user points at an existing project of their own as the precedent, read that project before proposing a schema — but do not go looking for local precedents unprompted.

## Use This Workflow

1. Inspect the source material, existing project, and delivery goal.
   Identify whether the user is starting from Markdown content, a PPT-derived site, a research document, an explainer, a review workbook, an editable draft, or an already-built website that now needs a single-file export.
2. Establish the editable source contract before touching UI code.
   Create or identify the source folder containing Markdown files with YAML front matter. Inventory all authored copy, including interface, accessibility, fallback, error, status, and export/calendar strings. If an existing HTML deliverable has hardcoded copy, extract and reconcile it into Markdown without silently overwriting user edits.
3. Choose the content model before touching UI code.
   Read [references/content-model.md](references/content-model.md) when designing or normalizing the schema.
4. Choose the visual/interaction contract before touching UI code.
   If the document is meant to be interactive or reviewable, read [references/html-effectiveness-patterns.md](references/html-effectiveness-patterns.md), name the closest source pattern, and list the pattern behaviours that must survive adaptation.
   If no source pattern fits, stop and suggest a new pattern contract to the user instead of silently inventing one.
   Build a narrow prototype only after the user accepts the proposal; update the pattern reference only after the prototype is approved.
5. Build the normal website first.
   Make sure it works as a regular multi-file site with separated JS, CSS, and assets before collapsing it.
6. Choose the packaging mode.
   Read [references/architecture.md](references/architecture.md) for the decision table and implementation patterns.
7. Package the site into a single deliverable and deliver the source folder alongside it.
   Keep the output browser-openable from disk. Avoid leaving external assets, split bundles, or runtime fetches. Document the exact rebuild command in the source folder README or build notes.
8. Verify the packaged file and source contract under realistic conditions.
   Open it from `file://`, test navigation, media, search, downloads, and attachment export. Run `scripts/audit-single-html.mjs` on the final file.
   Make one representative edit to a Markdown source file, rebuild with the documented command, and verify that the changed text reaches the generated HTML. Check that authored strings in templates and generated output have a Markdown source reference; treat reader-entered notes and imported live data separately.

## Choose The Packaging Mode

Use these as project heuristics, not hard browser limits:

| Mode | Use when | Packaging rule |
| --- | --- | --- |
| Direct inline | Small to medium deliverable, modest media, no heavy attachments | Inline app JS/CSS and imported assets directly into the final HTML |
| Blob-backed payload | Rich document with larger images, PDFs, spreadsheets, or media downloads | Embed attachment/media payloads as Base64 or gzip+Base64 data records, then materialize `Blob` URLs lazily in the browser |
| Compressed bootstrap | Large deliverable where raw inline HTML becomes unwieldy | Ship a small HTML bootstrap plus compressed embedded payload that is decompressed on load in a modern browser |

Do not use Web Bundles as the primary plan. They remain experimental and were removed from Chrome's normal implementation path. Do not use MHTML as the primary plan either unless the user explicitly asks for that format.

## Content Rules

- Separate content, presentation, and packaging concerns.
- Deliver a source folder containing Markdown/YAML, the compiler/build entry point, and a README or build note with the rebuild command. Prefer `content/` plus a compile step over fetching raw Markdown at runtime.
- Use Markdown as the canonical editable source for every authored string. Generated JSON/TypeScript is an intermediate; HTML and JavaScript must not become the only editable home of copy.
- Keep theme tokens separate from narrative content.
- Store complex blocks as structured fields in Markdown front matter or Markdown body, not as ad-hoc HTML fragments. Sidecar JSON/YAML may carry generated or non-authored machine metadata, but must not become the canonical home for authored text.
- Treat attachments as manifest entries with metadata and payload, not as giant literal `href="data:..."` links sprinkled through templates.
- Precompute navigation, search indexes, figure metadata, and attachment metadata at build time.

## Packaging Rules

- Prefer imported assets over `public/` assets for anything that must end up inside the final file.
- Prefer hash routing or a single-page structure for packaged deliverables. Avoid history-based routing for `file://` usage.
- Avoid runtime network fetches in the final file.
- Avoid external fonts, CDNs, analytics, and third-party scripts.
- Avoid leaving root-absolute URLs such as `/assets/...` in the final file.
- Avoid external module scripts or leftover split chunks in the final file.
- Materialize downloadable attachments with `Blob` URLs and `a.download`, not with multi-megabyte `data:` anchors.
- Keep the final output valid as ordinary HTML.

## Default Tooling

When starting from scratch in a new project:

```bash
bun create vite document-site --template react-ts
bun add gray-matter fast-glob
bun add -d vite-plugin-singlefile
```

If the repo already uses another package manager, stay with that package manager.

## Helper Scripts

All script paths below are relative to this skill's folder, and every `node …`
command in this skill assumes you run it from there. Node 18 or newer, no
dependencies to install.

- `scripts/make-attachment-manifest.mjs`
  Turn files or folders into an attachment manifest with MIME type, size, checksum, and Base64 or gzip+Base64 payloads.
- `scripts/audit-single-html.mjs`
  Inspect a packaged HTML file for leftover local/remote dependencies, unsafe routing assumptions, split-bundle hints, and size guidance.
- `scripts/build-sample-websites.mjs`
  Build sample source folders into normal websites plus packaged `.single.html` files. It reads `examples/sources/<slug>/` inside the skill folder and writes to `examples/generated/<slug>/`. No sample corpus ships with the skill — author your own following the layout in `references/sample-content-compiler.md`, and this becomes a working end-to-end reference build.
- `scripts/verify-sample-websites.mjs`
  Rebuild whatever is under `examples/sources/`, run static checks, and strict-audit every packaged sample.
- `scripts/build-design-option-previews.mjs`
  Build packaging-safe single-file samples for the reusable design option catalogue. Canonical generated assets live in `assets/design-samples/`.
- `scripts/build-block-sample.mjs`
  Generate a single-file HTML deliverable from a block manifest under `scripts/manifests/`. Used to produce the composed-blocks handbook and walkthrough samples; reusable for any composition of blocks.
- `scripts/build-qa-workbook.mjs`
  Compile a QA plan under `examples/sources/qa-workbook/` into a review workbook, as a normal site plus a packaged single file. A worked reference for `references/interactive-feedback-workbooks.md`; needs a source folder you supply.
- `scripts/feedback-media-runtime.js`
  Browser-side helper for standalone feedback documents that collect screenshots, pasted images, uploaded audio, recorded voice notes, selected-text annotations, and versioned JSON exports.
- `scripts/extract-feedback-media.mjs`
  Extract Base64 screenshot and audio attachments from returned feedback workbook JSON files.

## References

Architecture and packaging:

- [references/architecture.md](references/architecture.md) — the canonical pipeline, packaging modes, attachment pattern, offline-safe rules, and sourced rationale. Read before scaffolding or packaging a project.
- [references/packaging-examples.md](references/packaging-examples.md) — concrete direct-inline, Blob-manifest, compressed-bootstrap, and Vite packaging examples.
- [references/attachment-runtime-helpers.md](references/attachment-runtime-helpers.md) — when embedding downloadable PDF, CSV, spreadsheet, slide deck, ZIP, or media artifacts.

Content model and authoring:

- [references/content-model.md](references/content-model.md) — Markdown/YAML schema layers (document, page, blocks, theme, interaction modes).
- [references/editable-source.md](references/editable-source.md) — canonical Markdown source contract, source-folder delivery, rebuild documentation, and source-to-output verification.
- [references/page-contract.md](references/page-contract.md) — page-level invariants every deliverable honours: sidebar TOC by default, no horizontal page scroll, no overflow inside blocks, predictable diagram-edge routing, print and offline safety. Required reading before designing a new shell or archetype.
- [references/icons.md](references/icons.md) — Lucide-by-name icon system. Authors reference icons by name (`icon: "shield-alert"`); the build tree-shakes so only used icons land in the output. Catalogue and how to add icons live here.
- [references/patterns/_protocol.md](references/patterns/_protocol.md) — page-pattern layer (parallel to blocks). Patterns are reusable page features (TOC, global search, keyboard help, future patterns) that manifests opt into and the build tree-shakes. Per-pattern docs in `references/patterns/<name>.md`; renderers in `scripts/patterns/<name>.js`.
- [references/blocks/_protocol.md](references/blocks/_protocol.md) — the contract every reusable content block follows (renderer signature, packaging modes, custom escape hatch). Read this before composing pages out of structured blocks.
- [references/blocks/_index.md](references/blocks/_index.md) — catalogue of every defined block (scaffolding, diagram, comparison, interactive). Each block has a colocated spec in `references/blocks/<name>.md`, renderer in `scripts/blocks/<name>.js`, and example in `assets/blocks/<name>.example.yml`.
- [references/sample-content-compiler.md](references/sample-content-compiler.md) — dependency-free sample compiler and expected source folder layout.

Design and delivery shape:

- [references/html-effectiveness-patterns.md](references/html-effectiveness-patterns.md) — fidelity map for the public [`html-effectiveness` examples](https://thariqs.github.io/html-effectiveness/). Required for visual, interactive, reviewable, editor-like, or "not boring" deliverables.
- [references/archetype-recipes.md](references/archetype-recipes.md) — choosing a structure for dashboards, briefings, galleries, courses, research syntheses, decks, and review workbooks.
- [references/design-options.md](references/design-options.md) — visual direction for analytics, record catalogue, committee briefing, protocol dossier, tabbed workshop, browser slide deck, inspection gallery, and workshop report designs.
- [references/reader-annotation-and-editing.md](references/reader-annotation-and-editing.md) — highlight-and-note mode, editable draft mode, annotation export, and edit-diff export contracts.
- [references/interactive-feedback-workbooks.md](references/interactive-feedback-workbooks.md) — standalone review forms that collect ratings, screenshots, voice notes, annotations, and returned JSON feedback.

Verification:

- [references/test-plan.md](references/test-plan.md) — reusable build, browser, content, and privacy checks.
- [references/privacy-and-payload-review.md](references/privacy-and-payload-review.md) — before distributing documents that embed source notes, private data, or downloadable artifacts.

Historical research lives under `references/_archive/` (raw findings that informed `architecture.md`); reach for it only when you need to defend or extend a packaging decision.

## Reusable Blocks

Pages compose out of typed blocks rather than ad-hoc HTML. The block layer keeps presentation in renderers (vanilla JS, packaging-safe) while authors stay in YAML/JSON.

- Each block lives as three colocated files: `references/blocks/<name>.md` (schema and when-to-use), `scripts/blocks/<name>.js` (renderer), `assets/blocks/<name>.example.yml` (canonical example).
- The contract is in `references/blocks/_protocol.md`; the catalogue is in `references/blocks/_index.md`.
- Available groups: scaffolding (tldr, callout, faq, before-after, glossary), diagram (timeline, flowchart, module-map, inline-svg), comparison and tokens (side-by-side, contact-sheet, swatches, severity-tag, tabbed-code), interactive (slider, toggle-deps, drag-reorder, live-template, annotated-diff).
- Interactive blocks hydrate from the shared bootstrap at `scripts/blocks/_bootstrap.js`; static blocks are rendered at compile time with no JS shipped.
- Use the `custom` escape hatch sparingly for one-offs that don't merit a permanent block type.

## Design Sample Assets

Use these local single-file samples as visual and structural references:

- `assets/design-samples/institutional-analytics.single.html`
- `assets/design-samples/record-catalogue.single.html`
- `assets/design-samples/committee-briefing.single.html`
- `assets/design-samples/protocol-dossier.single.html`
- `assets/design-samples/tabbed-workshop.single.html`
- `assets/design-samples/inspection-gallery.single.html`
- `assets/design-samples/workshop-report.single.html`
- `assets/design-samples/composed-blocks-handbook.single.html`
- `assets/design-samples/composed-blocks-walkthrough.single.html`

Regenerate the composed-blocks samples after editing any block:

```bash
node scripts/build-block-sample.mjs scripts/manifests/composed-blocks-handbook.mjs
node scripts/build-block-sample.mjs scripts/manifests/composed-blocks-walkthrough.mjs
```

`assets/design-samples/index.html` is a single-file inspection gallery of the
whole set — open that first to compare directions before picking one. The
lighter dashboard, event-briefing, and gallery shapes described in
`references/design-options.md` remain valid for short deliverables.

For slide-deck deliverables, prefer the browser slide deck pattern in
`references/design-options.md` and `references/archetype-recipes.md` over
repurposing dossier, briefing, or tabbed-workshop layouts. Institutional
styling should be expressed as a theme layer on the deck; it should not change
the artifact into a report. For institution-styled slide decks, default to clean
sans-serif typography and an unruled background; use colour, spacing, captions,
and a textual masthead for institutional identity.

## Validation

- Make the site work normally before packaging it.
- Build the final output and open it from disk in a modern browser.
- Confirm the delivered source folder contains the canonical Markdown/YAML files and a documented rebuild command.
- Edit a representative Markdown string, rebuild, and verify the changed string appears in the generated HTML; revert or preserve the edit according to the user's requested change.
- Audit authored copy across templates, fallback/error/status/accessibility paths, and export/calendar text for a Markdown source reference. Runtime user-entered or imported data is not authored copy.
- Run:

```bash
node scripts/audit-single-html.mjs dist/document.html --strict
```

- Test at least:
  - internal navigation
  - images and media rendering
  - attachment downloads
  - search and client-side filters
  - annotation export or edit-diff export when enabled
  - the named `html-effectiveness` interaction contract when one was selected
  - print styling if the document is meant to print well
