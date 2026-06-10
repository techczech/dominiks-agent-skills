#!/bin/bash
# Math-heavy PDF extraction via MinerU.
#
# Usage: ./scripts/mineru-extract.sh <pdf_path> <output_dir> <paper_id>
#
# MinerU is installed in the venv: `pip install 'mineru[all]'`.
# Licence is Apache-2.0 with usage thresholds (>100M MAU or >$20M monthly rev).

set -euo pipefail

if [ $# -lt 3 ]; then
    echo "Usage: $0 <pdf_path> <output_dir> <paper_id>" >&2
    exit 1
fi

PDF_PATH="$1"
OUTPUT_DIR="$2"
PAPER_ID="$3"

if ! command -v mineru >/dev/null 2>&1; then
    echo "Error: mineru not on PATH. Install with: pip install 'mineru[all]'" >&2
    exit 1
fi

# Model-cache pre-flight: MinerU's models (~4.5 GB) are NOT bundled. On first run
# `mineru` silently downloads opendatalab/PDF-Extract-Kit-1.0 + MinerU2.5-Pro from
# Hugging Face. Warn before that happens so a math-engine run isn't an accidental
# multi-GB fetch. Set MINERU_ALLOW_DOWNLOAD=1 to proceed; otherwise prefer the
# lighter `docling` engine (~506 MB, default for most papers).
HF_HUB="${HF_HOME:-$HOME/.cache/huggingface}/hub"
if ! ls -d "$HF_HUB"/models--opendatalab--* >/dev/null 2>&1; then
    if [ "${MINERU_ALLOW_DOWNLOAD:-0}" != "1" ]; then
        echo "MinerU models are not cached. The math engine will download ~4.5 GB" >&2
        echo "(opendatalab/PDF-Extract-Kit-1.0 + MinerU2.5-Pro) from Hugging Face." >&2
        echo "Re-run with MINERU_ALLOW_DOWNLOAD=1 to allow the download, or use" >&2
        echo "--engine docling (default, ~506 MB) if this paper isn't math-heavy." >&2
        exit 2
    fi
    echo "MinerU models not cached — downloading ~4.5 GB (MINERU_ALLOW_DOWNLOAD=1 set)." >&2
fi

WORK_DIR="$OUTPUT_DIR/_mineru"
mkdir -p "$WORK_DIR" "$OUTPUT_DIR/figures" "$OUTPUT_DIR/tables"

# MinerU writes to <output>/<pdf_stem>/auto/{pdf_stem}.md and assets alongside.
mineru -p "$PDF_PATH" -o "$WORK_DIR" -m auto

PDF_STEM="$(basename "${PDF_PATH%.pdf}")"
MINERU_OUT="$WORK_DIR/$PDF_STEM/auto"

if [ ! -d "$MINERU_OUT" ]; then
    echo "Error: MinerU output not found at $MINERU_OUT" >&2
    exit 1
fi

MD_SOURCE="$MINERU_OUT/$PDF_STEM.md"
MD_DEST="$OUTPUT_DIR/${PAPER_ID}-fulltext.md"

{
    printf -- "---\ntitle: \"%s\"\ntype: \"paper-fulltext\"\nengine: \"mineru\"\n---\n\n" "$PAPER_ID"
    cat "$MD_SOURCE"
} > "$MD_DEST"

# Copy images (figures + table images) to the standard figures/ dir.
if [ -d "$MINERU_OUT/images" ]; then
    idx=1
    for img in "$MINERU_OUT/images"/*; do
        [ -f "$img" ] || continue
        ext="${img##*.}"
        padded=$(printf "%02d" "$idx")
        cp "$img" "$OUTPUT_DIR/figures/${PAPER_ID}-figure-${padded}.${ext}"
        cat > "$OUTPUT_DIR/figures/${PAPER_ID}-figure-${padded}.md" <<EOF
---
type: figure
figure_id: "${padded}"
paper_key: "${PAPER_ID}"
image_file: "${PAPER_ID}-figure-${padded}.${ext}"
caption: ""
engine: "mineru"
---

# Figure ${padded}

## Caption
(captions inline in fulltext markdown — MinerU does not separate them)

## Description
TODO: Describe figure
EOF
        idx=$((idx + 1))
    done
fi

echo "mineru: wrote fulltext to $MD_DEST"
