# Workflow: Direct Zotero Import

Import a paper into the repo by name, author, DOI, URL, or citation key — without going through the `source-files/` / VSCodeZotero pipeline.

This is a companion to [workflow-import.md](workflow-import.md). Use it when:

- The paper is already in your Zotero library but has *not* been exported via VSCodeZotero into `source-files/`.
- You only have a title fragment, an author + year, a DOI, a URL, or a Better BibTeX citation key.
- You want a one-shot import that creates the folder, copies the PDF, writes the source metadata file, and runs the fulltext extract.

The script: **`scripts/zotero-import.py`**.

---

## Prerequisites

1. **Zotero is running** with the **Better BibTeX (BBT)** extension installed and enabled. BBT exposes a JSON-RPC endpoint at `http://localhost:23119/better-bibtex/json-rpc` — the script hits this directly.
2. **`pdftotext`** is installed (`brew install poppler` on macOS).
3. The paper has a local PDF attachment in Zotero (the script reads the attachment's `path` field and copies the file).

Quick check that BBT is reachable:

```bash
curl -s http://localhost:23119/better-bibtex/json-rpc \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"item.search","params":["query string"],"id":1}'
```

---

## Usage

```bash
# By title fragment
scripts/zotero-import.py "Training language models to be warm"

# By citation key
scripts/zotero-import.py "ibrahimTrainingLanguageModels2026"

# By DOI
scripts/zotero-import.py "10.1038/s41586-026-10410-0"

# By publisher URL
scripts/zotero-import.py "https://www.nature.com/articles/s41586-026-10410-0"

# Override the auto-generated slug
scripts/zotero-import.py --slug warmth-accuracy-tradeoff "Training language models to be warm"

# Dry-run (resolve match + show folder name; do nothing)
scripts/zotero-import.py --print-only "ibrahimTrainingLanguageModels2026"

# Rich extraction (figures + tables + layout-aware fulltext via docling)
scripts/zotero-import.py --rich "Training language models to be warm"

# Skip the pdftotext step (e.g. you plan to use academic-pdf-to-mkd for layout-heavy PDFs)
scripts/zotero-import.py --no-fulltext <query>

# Skip the papers.yaml update
scripts/zotero-import.py --no-yaml <query>
```

---

## What it does

For a matched item, the script:

1. Resolves the query against Zotero via `item.search` (BBT JSON-RPC). If multiple items match, the first is used and the rest are printed for verification.
2. Pulls the full BBT JSON record via `item.export` (Better CSL JSON), which gives the **Zotero item key**, full metadata, tags, collections, and attachment paths.
3. Computes the folder name as `{lastname}-{year}-{slug}-{itemKey}` (slug = first ~4 non-stopword title words, kebab-case, lowercased).
4. Creates `papers/{folder}/`.
5. Copies the first PDF attachment to `papers/{folder}/00-source.pdf` (preserves Zotero's storage location; does **not** alter the original).
6. Writes `papers/{folder}/00-source.md` with full YAML frontmatter (authors, year, venue, DOI, ISSN, URL, abstract, tags, attachment_storage_key, etc.).
7. Runs `pdftotext -layout` and writes `papers/{folder}/{folder}-fulltext.md`.
8. Appends an entry to `index/papers.yaml` (idempotent — refuses to overwrite an existing key) and bumps `meta.total_papers` / `meta.last_updated`.

After the script returns, write your review under `papers/{folder}/reviews/` using the appropriate template.

---

## Conventions used

| Field | Source | Example |
|---|---|---|
| `zotero_key` (in YAML) | Zotero **item** key | `GVTV73KH` |
| `attachment_storage_key` (in YAML) | Zotero **attachment storage** folder | `EBJLNXU5` |
| Folder name | `{lastname}-{year}-{slug}-{itemKey}` | `ibrahim-2026-warmth-accuracy-tradeoff-GVTV73KH` |
| Source PDF filename | `00-source-{folder}.pdf` | `00-source-ibrahim-2026-warmth-accuracy-tradeoff-GVTV73KH.pdf` |
| Source markdown | `00-source-{folder}.md` | (same shape) |
| Fulltext markdown | `{folder}-fulltext.md` | `ibrahim-2026-warmth-accuracy-tradeoff-GVTV73KH-fulltext.md` |
| Reviews | `{folder}-review-{style}.md` | `ibrahim-2026-warmth-accuracy-tradeoff-GVTV73KH-review-methods-and-relevance.md` |

The item key is the canonical identifier (matches existing repo convention). The attachment storage key is recorded separately for traceability — Zotero exposes attachments at `~/Zotero/storage/{attachment-key}/`.

All files inside a paper folder carry the full folder name as a prefix — they are self-identifying out of folder context (search, git log, attachments, agent windows). See `scripts/migrate-filenames.py` for the migration script used to bring existing papers into this convention.

---

## Extraction quality

`scripts/pdf-to-markdown.sh` and `scripts/zotero-import.py` both use `pdftotext -layout`. This works well for:

- arXiv preprints (single column, body text dominates)
- Most NeurIPS / ACL / CHI proceedings
- Working papers, technical reports, theses

It struggles with:

- Two-column journal typesetting (*Nature*, *PNAS*, *Science*, *PLOS*) — figure captions interleave with body text, and figures/tables themselves come out as scrambled ASCII grids.
- Scanned PDFs (use OCR first; see the `academic-pdf-to-mkd` skill).
- Documents with rich diagrams or complex math layout.

For layout-heavy PDFs, use **`scripts/extract-paper-rich.py`** (or pass `--rich` to this importer). It wraps the `academic-pdf-to-mkd` skill (Docling / MinerU / pymupdf4llm engines) and routes the output into the right places under our naming convention. See [workflow-rich-extraction.md](workflow-rich-extraction.md).

```bash
# All in one:
scripts/zotero-import.py --rich "Training language models to be warm"
```

---

## Troubleshooting

### `error: cannot reach Better BibTeX at http://localhost:23119/better-bibtex/json-rpc`

Zotero is not running, or BBT is not installed. Start Zotero. Verify BBT under *Tools → Better BibTeX → Preferences*.

### `error: no Zotero item matched query`

Try a different fragment. Title words work; DOIs and citation keys work. URLs sometimes fail if Zotero stored the URL slightly differently — use a title fragment instead.

### `warning: N items matched; using the first.`

The script prints all matches for verification. If the first is wrong, narrow the query (add an author surname, year, or use the exact citation key).

### `info: {KEY} already present in papers.yaml; not modifying.`

The script is idempotent. To re-run on a paper, manually remove its `index/papers.yaml` entry first.

### `warning: no PDF attachment found`

The Zotero item has no local PDF attached. Drag the PDF into Zotero and re-run.

---

## Related

- [workflow-import.md](workflow-import.md) — the standard VSCodeZotero-based import workflow
- [workflow-extract.md](workflow-extract.md) — extracting highlights / figures / tables after import
- [workflow-review.md](workflow-review.md) — writing reviews
- [workflow-html-report.md](workflow-html-report.md) — building a single-HTML report from a review
