# Workflow: Rich Extraction (Figures + Tables + Layout-Aware Fulltext)

`pdftotext -layout` is acceptable for arXiv preprints but unacceptable for
layout-heavy journals (*Nature*, *PNAS*, *Science*, *PLOS*, *Cell*, *JAMA*).
For anything other than a single-column preprint, use the rich-extraction
pipeline.

The script: **`scripts/extract-paper-rich.py`**.

It wraps the `academic-pdf-to-mkd` skill (a sibling skill in this
repository), which
auto-selects between **Docling** (layout-aware, default), **pymupdf4llm**
(fast for small docs), and **MinerU** (math-heavy). The wrapper then renames
and routes the outputs into our canonical paper folder structure.

---

## What you get

```
papers/{folder}/{folder}-fulltext.md                # Clean Markdown body with headings preserved
papers/{folder}/figures/{folder}-figure-NN.png
papers/{folder}/figures/{folder}-figure-NN.md   # YAML frontmatter + caption + description placeholder
papers/{folder}/tables/{folder}-table-NN.csv    # Raw table data (Docling only)
papers/{folder}/tables/{folder}-table-NN.md     # YAML + caption + Markdown body
papers/{folder}/pages/{folder}-page-NNN.png     # Page thumbnails
```

Filenames are fully qualified — they carry the paper folder name as a prefix
so they remain self-identifying when displayed outside the folder.

The wrapper also enriches figure / table caption metadata by scanning the
fulltext for `Fig. N |` and `Table N.` markers (Docling sometimes returns
empty captions; this fills them in).

It also updates `index/papers.yaml` with a `rich_extraction:` block recording
figure / table / page counts and the engine used.

---

## Prerequisites

```bash
# One-time skill setup
cd ../academic-pdf-to-mkd   # sibling skill in this repository
uv sync                # installs docling, pymupdf4llm, mineru[all] into a venv
brew install poppler ocrmypdf    # for OCR preflight + fallbacks
```

The first Docling run downloads ~15 MB of OCR models.

---

## Usage

```bash
# Default: auto-detect engine (docling for almost everything)
scripts/extract-paper-rich.py {folder-slug-or-substring}

# Pin an engine
scripts/extract-paper-rich.py --engine docling  ibrahim-2026
scripts/extract-paper-rich.py --engine fast     hagendorff-2024   # arXiv preprint
scripts/extract-paper-rich.py --engine math     {slug}            # heavy math
scripts/extract-paper-rich.py --engine poppler  {slug}            # fallback only

# Debug: keep the temp extract dir
scripts/extract-paper-rich.py --keep-temp ibrahim-2026
```

Also accessible through `zotero-import.py --rich`, which chains rich
extraction immediately after import.

---

## When to use which engine

| Engine | Use for | Notes |
|---|---|---|
| `docling` (default) | Nature / PNAS / Science / PLOS / Cell / JAMA — anything with two-column layout, journal typesetting, or figures with structured data tables | Layout-aware. ~30 s per paper. Best figure/table separation. |
| `fast` (pymupdf4llm) | Short, dense, single-column arXiv preprints | Sub-second; no model load. AGPL. |
| `math` (MinerU) | Math-heavy papers (≥4 % math-symbol density) | Strong on formulas. Slower. |
| `poppler` | Fallback when the Python venv isn't available | Same as the legacy `pdf-to-markdown.sh` — weak on layout. |

Auto-detection picks the right one based on page count, words-per-page, and
math-symbol density. Override with `--engine` if it picks wrong (re-run is
cheap).

---

## Caveats

- **Captions may be empty** when Docling's caption-reference resolution fails;
  the wrapper's fulltext-scan fallback usually recovers them, but check the
  generated `*-figure-NN.md` files — the YAML `caption` field tells you
  whether the caption survived.
- **Tables** are emitted as separate CSVs only by the Docling engine. `fast`
  and `math` keep tables inline in the fulltext markdown. Check the
  `extracted_by:` line in the fulltext frontmatter to know which.
- **Multi-panel figures** are typically extracted as a single PNG, not split
  per panel. Use the `## Description` placeholder in each figure's `.md` file
  to spell out what each panel shows if needed for cross-paper linking.
- **Page thumbnails** are useful for previews / spot-checks but are large; if
  you do not need them, delete `papers/{folder}/pages/` after
  extraction.

---

## Comparison to the legacy `pdftotext` workflow

| Aspect | `pdftotext -layout` (legacy) | `extract-paper-rich.py` (rich) |
|---|---|---|
| Single-column arXiv body text | ✅ Good | ✅ Good |
| Two-column journal body text | ❌ Column interleave | ✅ Reading-order preserved |
| Figure extraction | ❌ None (only `pdfimages` raw dump) | ✅ Per-figure PNG + metadata + caption |
| Table extraction | ❌ Scrambled text | ✅ CSV + Markdown rendering |
| Section headings | ❌ Lost | ✅ Preserved as Markdown headings |
| Page thumbnails | ❌ None | ✅ One PNG per page |
| Speed | <1 s | ~30 s (Docling) |
| First-run cost | None | ~15 MB OCR model download |

Use `pdftotext` only for arXiv-style preprints where layout is trivial. Use
the rich pipeline for everything else.

---

## Related

- [workflow-zotero-direct.md](workflow-zotero-direct.md) — has a `--rich` flag
  that chains this script after import.
- [workflow-extract.md](workflow-extract.md) — the broader content-extraction
  workflow (highlights, atomic notes).
- [workflow-html-report.md](workflow-html-report.md) — the HTML report
  generator embeds extracted figures inline (collapsible gallery).
- External: `../academic-pdf-to-mkd/SKILL.md` (sibling skill in this repository)
