#!/bin/bash
# Main paper extraction script
# Orchestrates full text, figure, and table extraction from academic PDFs
# Usage: ./extract-paper.sh {zotero_key} {pdf_path}

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ "$#" -ne 2 ]; then
    echo -e "${RED}Usage: $0 {zotero_key} {pdf_path}${NC}"
    echo "Example: $0 JZUBTJM9 source-files/JZUBTJM9-paper.pdf"
    exit 1
fi

ZOTERO_KEY=$1
PDF_PATH=$2

# Validate inputs
if [ ! -f "$PDF_PATH" ]; then
    echo -e "${RED}Error: PDF file not found: $PDF_PATH${NC}"
    exit 1
fi

# Check for required tools
command -v pandoc >/dev/null 2>&1 || {
    echo -e "${RED}Error: pandoc is required but not installed.${NC}" >&2
    echo "Install: brew install pandoc (macOS) or apt-get install pandoc (Linux)"
    exit 1
}

echo -e "${GREEN}Starting extraction for ${ZOTERO_KEY}...${NC}"

# Get paper metadata from source-files
SOURCE_MD=$(find source-files -name "${ZOTERO_KEY}-*.md" -type f | head -1)
if [ -z "$SOURCE_MD" ]; then
    echo -e "${YELLOW}Warning: No source markdown found for ${ZOTERO_KEY}${NC}"
    PAPER_ID="${ZOTERO_KEY}"
else
    # Extract author-year-title from source markdown YAML
    # This is a simplified version - in practice, would parse YAML properly
    echo -e "${GREEN}Found source metadata: $SOURCE_MD${NC}"

    # For now, use a simplified paper ID
    # TODO: Extract from YAML: author, year, title
    PAPER_ID="${ZOTERO_KEY}"
fi

# Determine output folder
OUTPUT_DIR="paper-analysis"
# TODO: Create folder with proper naming: {author}-{year}-{title-short}-{zotero_key}
# For now, search for existing folder or create basic one
PAPER_FOLDER=$(find "$OUTPUT_DIR" -type d -name "*${ZOTERO_KEY}" | head -1)

if [ -z "$PAPER_FOLDER" ]; then
    echo -e "${YELLOW}No existing paper folder found. Creating temporary folder...${NC}"
    PAPER_FOLDER="${OUTPUT_DIR}/${PAPER_ID}"
    mkdir -p "$PAPER_FOLDER"/{highlights,figures,additional-sources,reviews,extracts,notes}
fi

echo -e "${GREEN}Output folder: $PAPER_FOLDER${NC}"

# Step 1: Extract full text
echo -e "\n${GREEN}=== Step 1: Extracting full text ===${NC}"
./scripts/pdf-to-markdown.sh "$PDF_PATH" "$PAPER_FOLDER" "$PAPER_ID"

# Step 2: Extract figures
echo -e "\n${GREEN}=== Step 2: Extracting figures ===${NC}"
./scripts/extract-figures.sh "$PDF_PATH" "$PAPER_FOLDER" "$PAPER_ID"

# Step 3: Extract tables
echo -e "\n${GREEN}=== Step 3: Extracting tables ===${NC}"
./scripts/extract-tables.sh "$PDF_PATH" "$PAPER_FOLDER" "$PAPER_ID"

echo -e "\n${GREEN}✓ Extraction complete for ${ZOTERO_KEY}${NC}"
echo -e "Full text: ${PAPER_FOLDER}/${PAPER_ID}.md"
echo -e "Figures: ${PAPER_FOLDER}/figures/"
echo -e "Tables: ${PAPER_FOLDER}/figures/"
