#!/bin/bash
# PDF extraction via MinerU.
#
# Usage: ./scripts/mineru-extract.sh <pdf_path> <output_dir> <paper_id>
#
# MinerU comes from the project's own venv (`uv sync`, or `pip install 'mineru[all]'`).
# Licence is Apache-2.0 with usage thresholds (>100M MAU or >$20M monthly rev).
# See SKILL.md for the full licence and model-footprint notes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HF_HUB="${HF_HUB_CACHE:-${HUGGINGFACE_HUB_CACHE:-${HF_HOME:-${XDG_CACHE_HOME:-$HOME/.cache}/huggingface}/hub}}"

models_cached() {
    local repo snapshot pattern
    for repo in PDF-Extract-Kit-1.0 MinerU2.5-Pro-2604-1.2B; do
        local cache="$HF_HUB/models--opendatalab--$repo"
        [ -s "$cache/refs/main" ] || return 1
        snapshot="$cache/snapshots/$(cat "$cache/refs/main")"
        [ -d "$snapshot" ] || return 1
        pattern='*.safetensors'
        if [ "$repo" = "PDF-Extract-Kit-1.0" ]; then pattern='*.pt'; fi
        [ -n "$(find -L "$snapshot" -type f -name "$pattern" -print -quit)" ] || return 1
    done
}

if [ "${1:-}" = "--models-cached" ]; then
    models_cached
    exit $?
fi

if [ $# -lt 3 ]; then
    echo "Usage: $0 <pdf_path> <output_dir> <paper_id>" >&2
    exit 1
fi

PDF_PATH="$1"
OUTPUT_DIR="$2"
PAPER_ID="$3"

export PATH="$SCRIPT_DIR/../.venv/bin:$PATH"
if ! command -v mineru >/dev/null 2>&1; then
    echo "Error: mineru not on PATH. Install with: pip install 'mineru[all]'" >&2
    exit 1
fi

# Model-cache pre-flight: MinerU's models (~4.5 GB) are NOT bundled. On first run
# `mineru` silently downloads opendatalab/PDF-Extract-Kit-1.0 + MinerU2.5-Pro from
# Hugging Face. Warn before that happens so a math-engine run isn't an accidental
# multi-GB fetch. Set MINERU_ALLOW_DOWNLOAD=1 to proceed; otherwise prefer the
# lighter `docling` engine (~506 MB, default for most papers).
if ! models_cached; then
    if [ "${MINERU_ALLOW_DOWNLOAD:-0}" != "1" ]; then
        echo "MinerU models are not cached. The math engine will download ~4.5 GB" >&2
        echo "(opendatalab/PDF-Extract-Kit-1.0 + MinerU2.5-Pro) from Hugging Face." >&2
        echo "Re-run with MINERU_ALLOW_DOWNLOAD=1 to allow the download, or use" >&2
        echo "--engine docling (default, ~506 MB) if this paper isn't math-heavy." >&2
        exit 2
    fi
    echo "MinerU models not cached — downloading ~4.5 GB (MINERU_ALLOW_DOWNLOAD=1 set)." >&2
fi

if [ "${MINERU_ALLOW_DOWNLOAD:-0}" != "1" ]; then
    # Prevent a partial cache from triggering a download.
    export HF_HUB_OFFLINE=1 MINERU_MODEL_SOURCE=huggingface
fi

WORK_DIR="$OUTPUT_DIR/_mineru"
mkdir -p "$WORK_DIR" "$OUTPUT_DIR/figures" "$OUTPUT_DIR/tables"

# MinerU 3.1.9 uses hybrid_auto for its default backend.
mineru -p "$PDF_PATH" -o "$WORK_DIR" -m auto

PDF_STEM="$(basename "${PDF_PATH%.pdf}")"
MINERU_OUT="$WORK_DIR/$PDF_STEM/hybrid_auto"
if [ ! -d "$MINERU_OUT" ]; then
    MINERU_OUT="$WORK_DIR/$PDF_STEM/auto"
fi

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
