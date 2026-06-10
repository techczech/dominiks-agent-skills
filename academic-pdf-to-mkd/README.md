# Academic PDF to Markdown

Extract structured text, figures, and tables from academic PDFs into clean Markdown. Auto-picks the best engine per file (Docling / pymupdf4llm / MinerU) and OCRs scan-only inputs first.

## Quick start

```bash
./scripts/extract-pdf.sh path/to/paper.pdf [output_dir]
./scripts/extract-pdf.sh path/to/paper.pdf --engine docling
```

## Requirements

```bash
# system
brew install poppler ocrmypdf

# python (uv-managed .venv/ from pyproject.toml)
uv sync
```

## Pipeline

| Stage | Script | Purpose |
|---|---|---|
| 0 | `ocr-preflight.sh` | `ocrmypdf -l eng --deskew --rotate-pages` if text layer is sparse |
| 1 | `detect-engine.py` | Pick `docling` / `fast` / `math` from page count + math-symbol density |
| 2 | `<engine>-extract.*` | Produce fulltext + figures + (engine-dependent) tables |
| 3 | `extract-pages.sh` | Page PNG thumbnails via `pdftoppm` |

## Engines

- **docling** — default. MIT. Layout model, MPS-accelerated, best tables/figures.
- **fast** — `pymupdf4llm`. AGPL. No model load; sub-second on small clean docs.
- **math** — `MinerU`. Apache-2.0 with thresholds. Strongest formula handling.
- **poppler** — fallback. GPL. No models, weak structure recovery.

Engines were chosen after surveying eight extractors (Docling, Marker, MinerU, pymupdf4llm, markitdown, Nougat, olmOCR, Poppler) for licence terms and extraction quality.

## Output

```
output/<paper_id>/
├── <paper_id>-fulltext.md      # engine recorded in YAML frontmatter
├── pages/page-NNN.png
├── figures/<paper_id>-figure-NN.png + .md
└── tables/<paper_id>-table-NN.md + .csv   # docling only
```

See `SKILL.md` for full documentation, `examples/` for output templates.
