---
name: paper-reviewer-skill
description: |
  Systematic academic paper review pipeline. Import a paper from Zotero by
  title/author/DOI/URL/citekey, extract layout-aware fulltext + per-figure +
  per-table assets with caption metadata, write multi-style reviews
  (quick-read, gelman, methods, critical, methods-and-relevance,
  claims-audit-and-press), and render the result as a self-contained
  single-HTML report with embedded figures and PDF download.

  TRIGGERS: Use when:
  - User asks to review an academic paper
  - User points at a PDF and says "import this", "extract this", "review this"
  - User mentions a paper by title, author, DOI, or URL
  - User asks for figures/tables to be extracted from a paper
  - User wants an HTML report or shareable summary of a review
  - Used as the working skill in any "paper-reviews" host repo (papers/{folder}/ layout)
---

# Paper Reviewer Skill

A complete academic-paper-review pipeline as a reusable skill. Drop into any host repo that wants to do systematic paper reviews — it brings its own scripts, templates, and conventions.

## Architecture

The skill is host-repo-agnostic. It expects to operate on a repo that has (or will get) this layout:

```
{host-repo}/
├── papers/{folder}/                      # One folder per paper (only)
│   ├── 00-source-{folder}.{md,pdf}       # Zotero metadata + PDF
│   ├── {folder}-fulltext.md              # extracted body text
│   ├── figures/{folder}-figure-NN.{png,md}
│   ├── tables/{folder}-table-NN.{csv,md}
│   ├── pages/{folder}-page-NNN.png
│   ├── reviews/{folder}-review-{style}.{md,html}
│   ├── highlights/{folder}-highlight-NN.md
│   ├── extracts/
│   └── notes/
├── index/papers.yaml                     # master index
├── changelog/YYYYMMDD-HHMMSS-*.md        # atomic session log
├── data/                                 # cross-cutting notes
└── (optional) writing/, articles/        # synthesis outputs
```

`{folder}` is `{firstauthor}-{year}-{slug}-{zoteroKey}` (e.g. `ibrahim-2026-warmth-accuracy-tradeoff-GVTV73KH`). Every file inside that folder carries the full folder name as a prefix or suffix so they self-identify out of folder context (search, git log, agent windows, attachments).

The scripts in `scripts/` expect to be invoked from the host-repo root and treat `papers/`, `index/`, `templates/`, and `changelog/` as relative to that root.

## Install into a host repo

```bash
# 1. Clone (or have) this skill anywhere; set SKILL_DIR to its location
SKILL_DIR=/path/to/paper-reviewer-skill

# 2. From the host repo root, link the skill into agent discovery paths
cd /path/to/host-repo
for agent in claude codex gemini antigravity; do
  mkdir -p ".$agent/skills"
  ln -sf "$SKILL_DIR" ".$agent/skills/paper-reviewer-skill"
done

# 3. Link scripts/ and templates/ into the host repo so the existing CLI
#    workflow works without prefixing the skill path each time
ln -sf "$SKILL_DIR/scripts" ./scripts
ln -sf "$SKILL_DIR/templates" ./templates

# 4. Create the host-repo structure (one-time)
mkdir -p papers data index changelog
touch index/papers.yaml CHANGELOG.md
```

After step 4 the host repo can immediately use `scripts/zotero-import.py "<query>"`.

The skill is purely additive — it never edits the host repo's own files outside `papers/`, `index/papers.yaml`, and `changelog/`.

## Core workflows

### Import a paper (Zotero)

```bash
# By title / author / DOI / URL / citekey
scripts/zotero-import.py "Training language models to be warm"
scripts/zotero-import.py "10.1038/s41586-026-10410-0"
scripts/zotero-import.py --rich "<query>"            # chains rich extraction
scripts/zotero-import.py --print-only "<query>"      # dry-run
```

Talks to Better BibTeX's JSON-RPC on `http://localhost:23119`. Creates the paper folder, copies the PDF (as `00-source-{folder}.pdf`), writes metadata `00-source-{folder}.md` from the Zotero record, runs `pdftotext` for body text, appends to `index/papers.yaml`.

See [`references/workflow-zotero-direct.md`](references/workflow-zotero-direct.md).

### Rich extraction (figures + tables + layout-aware fulltext)

```bash
scripts/extract-paper-rich.py {folder-slug-or-substring}
```

Wraps the **`academic-pdf-to-mkd`** skill (Docling/MinerU/pymupdf4llm, auto-selected) and routes outputs into `papers/{folder}/{figures,tables,pages}/`. Filters formatting noise (publisher logos, CC-BY badges) using a min-dimension threshold. Caption fallback scans the fulltext for `Fig. N |` and `Table N.` markers when Docling returns empty captions.

Companion-skill dependency: install `academic-pdf-to-mkd` (a sibling skill in this repo) as a sibling folder of this skill and `uv sync` it, or point the `ACADEMIC_PDF_SKILL` env var at it.

See [`references/workflow-rich-extraction.md`](references/workflow-rich-extraction.md).

### Conduct a review

Pick one of six templates in `templates/` and write into `papers/{folder}/reviews/{folder}-review-{style}.md`:

- `quick-read.md` — triage (10–20 min)
- `methods-deep-dive.md` — reproducibility + rigour
- `gelman-review.md` — RCT / statistical critique
- `critical-review.md` — peer-review-style evaluation
- `methods-and-relevance.md` — methods deep-dive + explicit "Relevance for Today" section
- `claims-audit-and-press.md` — probity audit. Every load-bearing claim in title / abstract / discussion / conclusions checked verbatim against the actual evidence. Press releases / news / social media audited for representation accuracy. For papers whose policy or public footprint matters as much as their technical contribution.

See [`references/workflow-review.md`](references/workflow-review.md) and [`references/templates-guide.md`](references/templates-guide.md).

### Render single-HTML report from a review

```bash
scripts/build-review-html.py {folder-slug-or-substring}
scripts/build-review-html.py --no-pdf {folder}       # smaller file
scripts/build-review-html.py --no-figures {folder}
```

Self-contained HTML: sidebar TOC with active-section highlighting, embedded abstract, collapsible drawers for review YAML and extracted fulltext, click-to-zoom figure gallery, table grid, Blob-backed PDF download, print stylesheet. No external fetches.

See [`references/workflow-html-report.md`](references/workflow-html-report.md).

### Dashboard

```bash
scripts/generate-dashboard.py                # writes ./ai-paper-dashboard.html
scripts/generate-dashboard.py --out path.html
scripts/generate-dashboard.py --quiet        # no stdout
```

Single self-contained HTML file at the host repo root. Stats banner, client-side search, multi-dimensional filter chips (status / collection / year / review-style), sticky header, sortable table linking to every paper's source markdown, fulltext, PDF, and each individual review. No external fetches.

Regenerates **automatically** at the end of `zotero-import.py` and `extract-paper-rich.py` whenever they update `index/papers.yaml` (silent, best-effort — failure does not block the import). Invoke manually any time you edit `papers.yaml` by hand.

### Other scripts

- `migrate-filenames.py` — one-shot rename to the fully-qualified-filename convention (idempotent)
- `consolidate-paper-folders.py` — one-shot migration from a legacy split `papers/` + `paper-analysis/` layout into the single flat layout
- `pdf-to-markdown.sh` and `extract-paper.sh`, `extract-figures.sh`, `extract-tables.sh` — legacy `pdftotext`/`pdfimages` pipeline. Adequate for arXiv preprints; weak on two-column journals (prefer `extract-paper-rich.py`).
- `generate-narration.py` — generic TTS-narration template (per-paper narration scripts live alongside each paper under `papers/{folder}/narrations/`)

## References

| Topic | File |
|---|---|
| Setup & architecture | [`references/setup-architecture.md`](references/setup-architecture.md) |
| Directory structure | [`references/directory-structure.md`](references/directory-structure.md) |
| YAML schemas | [`references/yaml-schemas.md`](references/yaml-schemas.md) |
| Paper import (Zotero, standard) | [`references/workflow-import.md`](references/workflow-import.md) |
| Paper import (Zotero, direct by name/DOI/URL) | [`references/workflow-zotero-direct.md`](references/workflow-zotero-direct.md) |
| Conducting reviews | [`references/workflow-review.md`](references/workflow-review.md) |
| Content extraction (highlights, manual) | [`references/workflow-extract.md`](references/workflow-extract.md) |
| Rich extraction (figures + tables + layout-aware) | [`references/workflow-rich-extraction.md`](references/workflow-rich-extraction.md) |
| Atomic notes | [`references/workflow-notes.md`](references/workflow-notes.md) |
| Writing projects | [`references/workflow-writing.md`](references/workflow-writing.md) |
| Single-HTML report from a review | [`references/workflow-html-report.md`](references/workflow-html-report.md) |
| Templates guide | [`references/templates-guide.md`](references/templates-guide.md) |
| Best practices | [`references/best-practices.md`](references/best-practices.md) |

## Dependencies

- **System**: `pdftotext` (`brew install poppler`), `bash`, `python ≥3.11`
- **Python** (auto-installed by scripts via `uv run --script`): `markdown`, `pymdown-extensions`, `PyYAML`
- **Zotero with Better BibTeX** (running, exposing JSON-RPC on `localhost:23119`)
- **`academic-pdf-to-mkd` skill** (a sibling skill in this repo, for rich extraction)

## Compatibility

- All scripts that need extra Python packages declare them via PEP-723 inline metadata and run under `uv run --script`. No project-wide venv needed.
- Works on macOS (tested) and Linux. Auto-`open` of HTML reports is macOS-only.
- Multi-agent — symlinks the same skill folder into `.claude/`, `.codex/`, `.gemini/`, `.antigravity/` discovery paths.

## Origin

Extracted from a private paper-reviews host repo (2026-05-18). That repo is now a host of this skill; the skill is the durable, reusable layer.
