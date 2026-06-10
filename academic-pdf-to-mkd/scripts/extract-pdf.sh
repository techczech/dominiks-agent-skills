#!/bin/bash
# Academic PDF to Markdown — Main Orchestrator
#
# Usage: ./scripts/extract-pdf.sh <pdf_path> [output_dir] [--engine auto|docling|fast|math|poppler]
#
# Pipeline:
#   0. ocr-preflight.sh   — OCR the PDF if its text layer is sparse
#   1. detect-engine.py   — choose engine when --engine=auto (default)
#   2. dispatch:
#        docling  -> docling-extract.py        (MIT, layout model, balanced default)
#        fast     -> pymupdf4llm-extract.py    (AGPL, rule-based, no model load)
#        math     -> mineru-extract.sh         (Apache+thresholds, formula-strong)
#        poppler  -> extract-{text,pages,figures,tables}.sh  (GPL, no model fallback)
#
# See README.md for licence and capability details on each engine.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Arguments
# ---------------------------------------------------------------------------

ENGINE="auto"
PDF_PATH=""
OUTPUT_DIR=""

while [ $# -gt 0 ]; do
    case "$1" in
        --engine)
            ENGINE="$2"
            shift 2
            ;;
        --engine=*)
            ENGINE="${1#--engine=}"
            shift
            ;;
        -h|--help)
            sed -n '2,18p' "$0"
            exit 0
            ;;
        *)
            if [ -z "$PDF_PATH" ]; then
                PDF_PATH="$1"
            elif [ -z "$OUTPUT_DIR" ]; then
                OUTPUT_DIR="$1"
            else
                echo -e "${RED}Unexpected argument: $1${NC}" >&2
                exit 1
            fi
            shift
            ;;
    esac
done

if [ -z "$PDF_PATH" ]; then
    echo -e "${RED}Usage: $0 <pdf_path> [output_dir] [--engine auto|docling|fast|math|poppler]${NC}" >&2
    exit 1
fi

if [ ! -f "$PDF_PATH" ]; then
    echo -e "${RED}Error: PDF file not found: $PDF_PATH${NC}" >&2
    exit 1
fi

PDF_BASENAME="$(basename "$PDF_PATH" .pdf)"
PAPER_ID="$(echo "$PDF_BASENAME" | tr '[:upper:]' '[:lower:]' | sed 's/[[:space:]]/-/g' | sed 's/[^a-z0-9_-]//g')"
OUTPUT_DIR="${OUTPUT_DIR:-./output/$PAPER_ID}"

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Academic PDF to Markdown${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  PDF:       $PDF_PATH"
echo -e "  Paper ID:  $PAPER_ID"
echo -e "  Output:    $OUTPUT_DIR"
echo -e "  Engine:    $ENGINE (requested)"
echo ""

mkdir -p "$OUTPUT_DIR"

# ---------------------------------------------------------------------------
# Stage 0: OCR preflight (always runs — cheap when not needed)
# ---------------------------------------------------------------------------

echo -e "${BOLD}[Stage 0] OCR Preflight${NC}"
PDF_PATH="$(bash "$SCRIPT_DIR/ocr-preflight.sh" "$PDF_PATH" "$OUTPUT_DIR")"
echo -e "  Using PDF: $PDF_PATH"
echo ""

# ---------------------------------------------------------------------------
# Stage 1: Engine selection
# ---------------------------------------------------------------------------

if [ "$ENGINE" = "auto" ]; then
    echo -e "${BOLD}[Stage 1] Engine Detection${NC}"
    PY="python3"
    if [ -d "$SCRIPT_DIR/../.venv" ]; then PY="$SCRIPT_DIR/../.venv/bin/python"; fi
    ENGINE="$("$PY" "$SCRIPT_DIR/detect-engine.py" "$PDF_PATH")"
    echo -e "  Chosen engine: ${GREEN}$ENGINE${NC}"
    echo ""
fi

# ---------------------------------------------------------------------------
# Stage 2: Dispatch
# ---------------------------------------------------------------------------

run_in_venv() {
    if [ -d "$SCRIPT_DIR/../.venv" ]; then
        "$SCRIPT_DIR/../.venv/bin/python" "$@"
    else
        python3 "$@"
    fi
}

case "$ENGINE" in
    docling)
        echo -e "${BOLD}[Stage 2] Docling Extraction${NC}"
        run_in_venv "$SCRIPT_DIR/docling-extract.py" "$PDF_PATH" "$OUTPUT_DIR" "$PAPER_ID"
        ;;
    fast)
        echo -e "${BOLD}[Stage 2] pymupdf4llm Extraction (fast)${NC}"
        run_in_venv "$SCRIPT_DIR/pymupdf4llm-extract.py" "$PDF_PATH" "$OUTPUT_DIR" "$PAPER_ID"
        ;;
    math)
        echo -e "${BOLD}[Stage 2] MinerU Extraction (math-heavy)${NC}"
        bash "$SCRIPT_DIR/mineru-extract.sh" "$PDF_PATH" "$OUTPUT_DIR" "$PAPER_ID"
        ;;
    poppler)
        echo -e "${BOLD}[Stage 2] Poppler Fallback Pipeline${NC}"
        echo -e "${BOLD}  [1/4] Text${NC}"
        bash "$SCRIPT_DIR/extract-text.sh" "$PDF_PATH" "$OUTPUT_DIR" "$PAPER_ID"
        echo -e "${BOLD}  [2/4] Pages${NC}"
        bash "$SCRIPT_DIR/extract-pages.sh" "$PDF_PATH" "$OUTPUT_DIR" "$PAPER_ID"
        echo -e "${BOLD}  [3/4] Figures${NC}"
        bash "$SCRIPT_DIR/extract-figures.sh" "$PDF_PATH" "$OUTPUT_DIR" "$PAPER_ID"
        echo -e "${BOLD}  [4/4] Tables${NC}"
        bash "$SCRIPT_DIR/extract-tables.sh" "$PDF_PATH" "$OUTPUT_DIR" "$PAPER_ID"
        ;;
    *)
        echo -e "${RED}Unknown engine: $ENGINE${NC}" >&2
        echo -e "${RED}Valid: auto, docling, fast, math, poppler${NC}" >&2
        exit 1
        ;;
esac
echo ""

# Page thumbnails — only docling generates them natively; supply via pdftoppm
# for fast/math/poppler engines so the output tree is consistent.
if [ "$ENGINE" != "docling" ] && [ "$ENGINE" != "poppler" ]; then
    if command -v pdftoppm >/dev/null 2>&1; then
        echo -e "${BOLD}[Stage 3] Page Thumbnails (pdftoppm)${NC}"
        bash "$SCRIPT_DIR/extract-pages.sh" "$PDF_PATH" "$OUTPUT_DIR" "$PAPER_ID"
        echo ""
    fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Extraction complete${NC} (engine: ${BOLD}$ENGINE${NC})"
echo ""
echo -e "Output directory: ${BOLD}$OUTPUT_DIR${NC}"
echo ""

FULLTEXT="$OUTPUT_DIR/${PAPER_ID}-fulltext.md"
PAGE_COUNT=$(find "$OUTPUT_DIR/pages" -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
FIG_COUNT=$(find "$OUTPUT_DIR/figures" -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
TABLE_COUNT=$(find "$OUTPUT_DIR/tables" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

echo -e "  Fulltext:  $([ -f "$FULLTEXT" ] && echo "✓" || echo "✗") $FULLTEXT"
echo -e "  Pages:     $PAGE_COUNT images"
echo -e "  Figures:   $FIG_COUNT images"
echo -e "  Tables:    $TABLE_COUNT tables"
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
