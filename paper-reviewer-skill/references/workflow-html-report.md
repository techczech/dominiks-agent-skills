# Workflow: Single-HTML Report from a Review

Render a paper review as a polished, self-contained HTML file that bundles the review prose, the paper metadata, the abstract, the extracted fulltext (collapsible), and the source PDF (as an embedded download).

**Markdown remains the canonical source.** HTML is a delivery format — edit the `.md`, then re-run the builder.

**HTML is first-class content** — the built `.html` is committed alongside the `.md` so a fresh clone or a non-builder collaborator can open the review immediately. Don't `.gitignore` `papers/**/reviews/*.html`. After every review write or update, run the builder and commit `.md` + `.html` in the same operation.

The script: **`scripts/build-review-html.py`**.

---

## When to use

- Sharing a review with a non-technical collaborator who would not navigate the markdown repo.
- Producing a one-page briefing for a meeting where someone needs the review + the source paper + the underlying full text in one file.
- Archiving a review state as a self-contained artefact that opens offline from `file://` for years to come.
- Printing a clean reading copy (the stylesheet includes a print mode that drops the sidebar TOC and the action bar).

Don't use it for:

- Day-to-day reading or editing — the markdown is faster.
- Multi-paper synthesis — for that, build a separate report or use the dashboard.
- Pre-publication public posting — these reports embed paper PDFs as base64, which raises distribution concerns (see Privacy below).

---

## Usage

```bash
# Render the newest review for a paper (folder slug or substring)
scripts/build-review-html.py ibrahim-2026-warmth-accuracy-tradeoff-GVTV73KH
scripts/build-review-html.py ibrahim       # fuzzy folder match

# Or point directly at the review markdown
scripts/build-review-html.py papers/ibrahim-2026-warmth-accuracy-tradeoff-GVTV73KH/reviews/methods-and-relevance.md

# Choose a custom output path
scripts/build-review-html.py --out /tmp/ibrahim-review.html ibrahim

# Skip embedding the source PDF (much smaller file)
scripts/build-review-html.py --no-pdf ibrahim

# Skip embedding the extracted fulltext
scripts/build-review-html.py --no-fulltext ibrahim

# Don't auto-open in browser
scripts/build-review-html.py --no-open ibrahim
```

The script writes to `papers/{folder}/reviews/{review-name}.html` by default and opens it in the default browser (macOS).

The first run uses `uv` to install three Python dependencies on the fly (`markdown`, `pymdown-extensions`, `PyYAML`) — they are pinned in the script's PEP-723 inline-metadata block. Subsequent runs are fast.

---

## What the HTML contains

A two-column layout: sidebar TOC on the left, review body on the right.

**Header**:
- Eyebrow showing the review style (e.g. "Methods and Relevance · Paper review").
- Paper title, authors (formatted from `creators:` in 00-source.md), venue · volume(issue) · pages, DOI.
- Meta chips: style, reviewed date, reviewer, duration, and first six tags.
- Action bar: PDF download (Blob-decoded lazily on click), DOI link, publisher URL, print button.

**Abstract panel**: the paper's own abstract pulled from `00-source.md`.

**Drawers** (collapsible `<details>`):
- *Review metadata (YAML frontmatter)* — the review's own YAML, pretty-printed.
- *Source paper full text (pdftotext extract)* — the entire extracted fulltext, capped at 300 KB.

**Review body**: the markdown rendered with Python-Markdown + pymdown-extensions (tables, sane-lists, smarty quotes, TOC, magic-link, tasklist, smart-symbols, mark/caret/tilde).

**Footer**: provenance line (source markdown path, generation timestamp).

---

## Single-HTML patterns adopted

Inspired by the sibling `single-html` skill in this repository (`../single-html/single-html-document/` — see its `references/page-contract.md` for the full contract). The relevant rules this builder honours:

| Rule | Implementation |
|---|---|
| Sidebar TOC, sticky on wide, collapses on narrow | `aside.toc` with IntersectionObserver for active-section highlight |
| No horizontal page scroll, no overflow inside blocks | `overflow-x: clip` on body; `min-width:0` on grid children; tables wrap |
| Print-readable | `@media print` drops TOC and action bar, makes drawers static-friendly |
| Offline-safe — no external fetches | CSS and JS inlined, no fonts/CDN, no analytics, no images outside the embedded PDF |
| Attachments use Blob URLs, not multi-MB `data:` anchors | PDF payload is a `<script type="application/octet-stream">` element that JS decodes into a Blob on click |
| Source/provenance text incorporated, not linked | Fulltext is embedded in a drawer rather than as a download |
| Final file is valid `.html`, browser-openable from disk | Tested with `open file://...` |

This is a *delivery format*, not a *project*: there is no Vite build, no React, no asset pipeline. The script generates a single file directly from the markdown. For full multi-page deliverables or interactive workbooks, follow the actual single-html-document skill.

---

## Size and performance

- A review without the PDF embed is ~50–80 KB.
- The fulltext drawer adds the extracted text (typically 50–150 KB; truncated at 300 KB).
- The PDF embed adds ~1.33× the PDF size (base64 expansion). A 4 MB Nature PDF becomes ~5.3 MB.
- All payloads decode lazily — page render time stays fast even at 5 MB total.

If you plan to email the HTML or upload to a portal with file-size limits, use `--no-pdf` and rely on the DOI / publisher link in the action bar.

---

## Privacy / distribution caveats

The HTML embeds the source PDF and the extracted fulltext. Before sharing externally:

- Confirm the paper's licence permits redistribution (open-access papers under CC-BY are fine; many subscription-journal PDFs are not).
- For closed-access papers, generate with `--no-pdf --no-fulltext` to ship just the review.
- The review YAML frontmatter is also embedded in a drawer — strip any private notes from it first if relevant.

---

## Customisation

The script is intentionally simple and single-file. To change the look, edit the `CSS` and `JS` constants near the top of `scripts/build-review-html.py`. The current palette is warm/scholarly (Charter serif body, Inter UI, warm-amber accent) and is meant to differ visually from typical AI-generated dashboards. If you want a stricter institutional look, override the CSS variables in `:root`.

To add new sections (e.g. a "related papers" grid pulled from `papers.yaml`), edit `render_html()` — it is one straightforward Python function with f-strings, no templating engine.

---

## Related

- [workflow-zotero-direct.md](workflow-zotero-direct.md) — companion script for importing the paper itself
- [workflow-review.md](workflow-review.md) — writing the review markdown that this script renders
- [best-practices.md](best-practices.md) — what makes a review HTML-worthy
- External: `../single-html/single-html-document/SKILL.md` (sibling skill in this repository) — the full single-HTML-document skill, for projects beyond a single review
