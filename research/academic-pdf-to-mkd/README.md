# Academic PDF to Markdown

Extract structured text, figures, and tables from academic PDFs into clean Markdown. Auto-picks the best engine per file (Docling / pymupdf4llm / MinerU) and OCRs scan-only inputs first.

## Quick start

```bash
./scripts/extract-pdf.sh path/to/paper.pdf [output_dir]
./scripts/extract-pdf.sh path/to/paper.pdf --engine docling
```

Output lands in `output/<paper_id>/` by default.

There is a second entry point for scanned PDFs that should stay PDFs — it OCRs
them and rebuilds a copy-friendly text layer for a reference manager:

```bash
./scripts/ocr-pdf-for-zotero.sh path/to/chapter.pdf [output_pdf] [--split-spreads]
```

## Requirements

```bash
# system (macOS/Homebrew; use equivalent packages on Linux)
brew install poppler ocrmypdf ghostscript

# python, from this directory (uv-managed .venv/ from pyproject.toml + uv.lock)
uv sync
```

`poppler` is required. `ocrmypdf` enables the OCR preflight and the PDF-repair
branch; `ghostscript` only compresses repaired PDFs. Both are detected at
runtime and skipped when absent.

## Pipeline

| Stage | Script | Purpose |
|---|---|---|
| 0 | `ocr-preflight.sh` | `ocrmypdf -l eng --deskew --rotate-pages` if text layer is sparse |
| 1 | `detect-engine.py` | Pick `docling` / `fast` / `math` from page count + math-symbol density |
| 2 | `<engine>-extract.*` | Produce fulltext + figures + (engine-dependent) tables |
| 3 | `extract-pages.sh` | Page PNG thumbnails via `pdftoppm` |

## Engines

- **docling** — default. MIT. Layout model; uses whatever accelerator PyTorch finds (MPS on Apple Silicon, CUDA on Linux, otherwise CPU). Best tables/figures.
- **fast** — `pymupdf4llm`. AGPL. No model load; sub-second on small clean docs.
- **math** — `MinerU`. Apache-2.0 with thresholds. Strongest formula handling.
- **poppler** — fallback. GPL. No models, weak structure recovery.

Engine selection is automatic; `--engine` overrides it. MinerU's models are
~4.5 GB and are not downloaded unless you set `MINERU_ALLOW_DOWNLOAD=1`. Full
licence terms and model footprints: `SKILL.md`.

## Output

```
output/<paper_id>/
├── <paper_id>-fulltext.md      # engine recorded in YAML frontmatter
├── pages/page-NNN.png
├── figures/<paper_id>-figure-NN.png + .md
└── tables/<paper_id>-table-NN.md          # docling + poppler; .csv from docling only
```

The `fast` and `math` engines leave tables inline in the fulltext instead of
writing `tables/`. Read the `engine:` key in the fulltext frontmatter to know
which shape you got.

See `SKILL.md` for full documentation, `examples/` for output templates.
