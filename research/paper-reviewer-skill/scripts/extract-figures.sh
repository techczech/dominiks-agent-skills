#!/bin/bash
# Extract figures from PDF and create metadata files
# Usage: ./extract-figures.sh {pdf_path} {output_dir} {paper_id}

set -e

PDF_PATH=$1
OUTPUT_DIR=$2
PAPER_ID=$3

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Extracting figures from PDF...${NC}"

FIGURES_DIR="$OUTPUT_DIR/figures"
mkdir -p "$FIGURES_DIR"

# Check if pdfimages is available (part of poppler-utils)
if command -v pdfimages >/dev/null 2>&1; then
    echo -e "${GREEN}Using pdfimages for figure extraction...${NC}"

    # Extract images with page numbers
    pdfimages -png "$PDF_PATH" "$FIGURES_DIR/temp-image" 2>&1 || {
        echo -e "${YELLOW}Warning: pdfimages had issues${NC}"
    }

    # Rename extracted images to proper format
    counter=1
    for img in "$FIGURES_DIR"/temp-image-*.png; do
        if [ -f "$img" ]; then
            padded=$(printf "%02d" $counter)
            mv "$img" "$FIGURES_DIR/${PAPER_ID}-figure-${padded}.png"
            echo -e "${GREEN}✓ Extracted: ${PAPER_ID}-figure-${padded}.png${NC}"

            # Create basic metadata file
            cat > "$FIGURES_DIR/${PAPER_ID}-figure-${padded}.md" << EOF
---
type: figure
figure_id: "${padded}"
paper_key: "$(basename $OUTPUT_DIR | grep -o '[A-Z0-9]\{8\}$' || echo 'UNKNOWN')"
image_file: "${PAPER_ID}-figure-${padded}.png"
source_page: null
caption: "TODO: Add caption from paper"
description: "TODO: Add semantic description"
key_findings: []
created: "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
tags: []
---

# Figure ${padded}

## Caption
TODO: Extract caption from paper text

## Description
TODO: Add semantic description of what this figure shows

## Key Findings
- TODO: Add key findings
EOF

            counter=$((counter + 1))
        fi
    done

    if [ $counter -eq 1 ]; then
        echo -e "${YELLOW}No figures extracted${NC}"
    else
        echo -e "${GREEN}✓ Extracted $((counter - 1)) figures${NC}"
    fi
else
    echo -e "${YELLOW}pdfimages not found. Install poppler-utils:${NC}"
    echo -e "  macOS: brew install poppler"
    echo -e "  Linux: apt-get install poppler-utils"
    echo -e "${YELLOW}Skipping figure extraction${NC}"
fi

# Check for media extracted by pandoc
if [ -d "$FIGURES_DIR/temp_media" ]; then
    echo -e "${GREEN}Processing pandoc-extracted media...${NC}"
    counter=1
    for img in "$FIGURES_DIR/temp_media"/*; do
        if [ -f "$img" ]; then
            ext="${img##*.}"
            padded=$(printf "%02d" $counter)

            # Only process if not already extracted
            if [ ! -f "$FIGURES_DIR/${PAPER_ID}-figure-${padded}.png" ]; then
                cp "$img" "$FIGURES_DIR/${PAPER_ID}-figure-${padded}.${ext}"
                echo -e "${GREEN}✓ Copied pandoc media: ${PAPER_ID}-figure-${padded}.${ext}${NC}"
            fi
            counter=$((counter + 1))
        fi
    done
    rm -rf "$FIGURES_DIR/temp_media"
fi

echo -e "${GREEN}✓ Figure extraction complete${NC}"
