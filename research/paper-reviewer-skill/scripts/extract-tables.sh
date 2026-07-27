#!/bin/bash
# Extract tables from PDF and create metadata files
# Usage: ./extract-tables.sh {pdf_path} {output_dir} {paper_id}

set -e

PDF_PATH=$1
OUTPUT_DIR=$2
PAPER_ID=$3

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Extracting tables from PDF...${NC}"

FIGURES_DIR="$OUTPUT_DIR/figures"
mkdir -p "$FIGURES_DIR"

# Use pdftotext to extract text, then look for table patterns
# Tables in PDFs are notoriously difficult to extract properly
TEMP_TXT="${FIGURES_DIR}/temp-tables.txt"

if command -v pdftotext >/dev/null 2>&1; then
    pdftotext -layout "$PDF_PATH" "$TEMP_TXT" 2>&1 || {
        echo -e "${YELLOW}Warning: Table extraction had issues${NC}"
    }
else
    echo -e "${YELLOW}pdftotext not available. Skipping table extraction.${NC}"
    echo -e "${GREEN}✓ Table extraction complete${NC}"
    return 0
fi

TEMP_MD="${TEMP_TXT}"

if [ -f "$TEMP_MD" ]; then
    # Look for markdown tables in the output
    table_count=0
    in_table=false
    current_table=""

    while IFS= read -r line; do
        # Simple table detection (lines with | characters)
        if [[ "$line" =~ \|.*\| ]]; then
            if [ "$in_table" = false ]; then
                in_table=true
                table_count=$((table_count + 1))
                current_table=""
            fi
            current_table+="$line"$'\n'
        else
            if [ "$in_table" = true ]; then
                # End of table - save it
                padded=$(printf "%02d" $table_count)

                # Save table content
                echo "$current_table" > "$FIGURES_DIR/${PAPER_ID}-table-${padded}-content.md"

                # Try to convert to CSV (basic approach)
                echo "$current_table" | \
                    sed 's/^|//; s/|$//' | \
                    tr '|' ',' > "$FIGURES_DIR/${PAPER_ID}-table-${padded}.csv" 2>/dev/null || true

                # Create metadata file
                cat > "$FIGURES_DIR/${PAPER_ID}-table-${padded}.md" << EOF
---
type: table
table_id: "${padded}"
paper_key: "$(basename $OUTPUT_DIR | grep -o '[A-Z0-9]\{8\}$' || echo 'UNKNOWN')"
data_file: "${PAPER_ID}-table-${padded}.csv"
source_page: null
title: "TODO: Add table title"
description: "TODO: Add description"
columns: []
key_findings: []
created: "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
tags: []
---

# Table ${padded}

## Structure
TODO: Describe table structure

## Data
See ${PAPER_ID}-table-${padded}.csv

## Key Findings
- TODO: Add key findings
EOF

                echo -e "${GREEN}✓ Extracted table ${padded}${NC}"
                in_table=false
                current_table=""
            fi
        fi
    done < "$TEMP_MD"

    rm "$TEMP_MD"

    if [ $table_count -eq 0 ]; then
        echo -e "${YELLOW}No tables detected in PDF${NC}"
    else
        echo -e "${GREEN}✓ Extracted $table_count tables${NC}"
    fi
else
    echo -e "${YELLOW}Warning: No markdown output for table extraction${NC}"
fi

echo -e "${GREEN}✓ Table extraction complete${NC}"
echo -e "${YELLOW}Note: Table extraction from PDFs is imperfect. Please review and edit extracted tables.${NC}"
