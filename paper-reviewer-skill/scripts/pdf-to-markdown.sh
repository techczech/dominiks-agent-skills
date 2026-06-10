#!/bin/bash
# Convert PDF to markdown using pandoc
# Usage: ./pdf-to-markdown.sh {pdf_path} {output_dir} {paper_id}

set -e

PDF_PATH=$1
OUTPUT_DIR=$2
PAPER_ID=$3

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Converting PDF to markdown...${NC}"

# Create temporary directory for extraction
TEMP_DIR=$(mktemp -d)
echo -e "Temp directory: $TEMP_DIR"

# Try pdftotext first (most reliable for academic PDFs)
if command -v pdftotext >/dev/null 2>&1; then
    echo -e "${GREEN}Using pdftotext for text extraction...${NC}"
    pdftotext -layout "$PDF_PATH" "$TEMP_DIR/full-text.txt" 2>&1 || {
        echo -e "${YELLOW}Warning: pdftotext had issues${NC}"
    }

    # Convert txt to markdown format (basic)
    if [ -f "$TEMP_DIR/full-text.txt" ]; then
        # Add markdown header
        {
            echo "# Extracted Full Text"
            echo ""
            cat "$TEMP_DIR/full-text.txt"
        } > "$TEMP_DIR/full-text.md"
    fi
else
    echo -e "${YELLOW}pdftotext not found. Install poppler-utils:${NC}"
    echo -e "  macOS: brew install poppler"
    echo -e "  Linux: apt-get install poppler-utils"

    # Fallback: try pandoc (though it won't work for PDF input)
    echo -e "${YELLOW}Attempting pandoc fallback (may not work)...${NC}"
    pandoc "$PDF_PATH" \
      -f pdf \
      -t markdown \
      --extract-media="$TEMP_DIR/media" \
      --wrap=none \
      --reference-links \
      -o "$TEMP_DIR/full-text.md" 2>&1 || {
        echo -e "${YELLOW}Pandoc fallback failed (expected for PDF input)${NC}"
      }
fi

# Move output to final location
if [ -f "$TEMP_DIR/full-text.md" ]; then
    mv "$TEMP_DIR/full-text.md" "$OUTPUT_DIR/${PAPER_ID}.md"
    echo -e "${GREEN}✓ Full text saved: ${OUTPUT_DIR}/${PAPER_ID}.md${NC}"

    # Show first few lines as preview
    echo -e "\n${GREEN}Preview (first 20 lines):${NC}"
    head -20 "$OUTPUT_DIR/${PAPER_ID}.md"
else
    echo -e "${YELLOW}Warning: No markdown output generated${NC}"
fi

# Move any extracted media
if [ -d "$TEMP_DIR/media" ]; then
    echo -e "${GREEN}Media extracted to temp dir${NC}"
    # These will be processed by extract-figures.sh
    mkdir -p "$OUTPUT_DIR/figures/temp_media"
    cp -r "$TEMP_DIR/media/"* "$OUTPUT_DIR/figures/temp_media/" 2>/dev/null || true
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✓ PDF to markdown conversion complete${NC}"
