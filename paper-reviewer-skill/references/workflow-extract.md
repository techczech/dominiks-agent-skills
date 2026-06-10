# Workflow: Extracting Content from Papers

Complete guide to extracting highlights, figures, tables, and full text from academic papers.

## Overview

This workflow covers:

1. **Full text extraction** - PDF → markdown using pdftotext
2. **Highlight extraction** - Color-coded highlights to atomic files
3. **Figure extraction** - Images + semantic metadata
4. **Table extraction** - Data + semantic metadata

All extraction uses scripts in `scripts/` (accessed via `skill/scripts@`).

---

## Workflow 1: Full Text Extraction

### Purpose

Convert PDF to markdown for full-text analysis and search.

### Prerequisites

- **pdftotext** (from poppler-utils)
  - macOS: `brew install poppler`
  - Linux: `apt-get install poppler-utils`

### Steps

#### 1. Locate PDF

```bash
# PDFs are stored in source-files/ only
ls source-files/JZUBTJM9-*.pdf
```

#### 2. Run Extraction Script

```bash
cd scripts/
./pdf-to-markdown.sh source-files/JZUBTJM9-*.pdf papers/bean-2026-llm-medical-assistants-JZUBTJM9 bean-2026-llm-medical-assistants-JZUBTJM9
```

**Parameters**:
1. `{pdf_path}` - Path to PDF in source-files/
2. `{output_dir}` - Paper analysis folder
3. `{paper_id}` - Paper folder name

#### 3. Review Output

Script creates: `papers/{folder-name}/{paper-id}.md`

```bash
Read papers/bean-2026-llm-medical-assistants-JZUBTJM9/bean-2026-llm-medical-assistants-JZUBTJM9.md
```

Preview first 20 lines to verify quality.

#### 4. Move to Extracts Folder

```bash
mv papers/{folder-name}/{paper-id}.md papers/{folder-name}/extracts/full-text.md
```

#### 5. Add YAML Frontmatter

Edit `extracts/full-text.md` to add frontmatter:

```yaml
---
type: extract
extract_type: "full-text"
paper_key: "JZUBTJM9"
paper_title: "Full paper title"
extracted_date: "2026-02-11"
extraction_method: "pdftotext"
source_file: "source-files/JZUBTJM9-*.pdf"
tags:
  - "full-text"
  - "extracted"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
notes: |
  Extracted using pdftotext with -layout flag.
  Quality: Good. Some formatting artifacts in tables.
---

# Extracted Full Text

[Full text content...]
```

#### 6. Update Tracking

```yaml
papers:
  JZUBTJM9:
    extracts:
      - type: "full-text"
        file: "papers/bean-2026-llm-medical-assistants-JZUBTJM9/extracts/full-text.md"
        date: "2026-02-11"
        word_count: 8560
```

#### 7. Git Commit

```bash
git add papers/bean-2026-llm-medical-assistants-JZUBTJM9/extracts/full-text.md
git add index/papers.yaml
git commit -m "Extract full text from Bean et al. (2026)"
```

---

## Workflow 2: Highlight Extraction

### When to Use

If Zotero import includes embedded highlights, extract to separate atomic files for better linking.

### Color Coding

| Color | Code | Significance | Use For |
|-------|------|--------------|---------|
| Yellow | #ffd400 | main-finding | Key findings, important points |
| Red | #ff6666 | critical-result | Critical results, main arguments |
| Green | #5fb236 | method | Methods, procedures, data collection |
| Blue | #2ea8e5 | discussion | Discussion, limitations, future work |

### Steps

#### 1. Read Highlights from Source

```bash
Read source-files/JZUBTJM9-*.md
# Check YAML frontmatter for highlights array
# Or check markdown content for highlight annotations
```

#### 2. For Each Highlight, Create Atomic File

**Naming**: `{number:003}-{color}-{slug}.md`

Example: `001-yellow-main-finding.md`

#### 3. Extract Highlight Metadata

From source file:
- Highlight text
- Page number (if available)
- Color annotation
- Surrounding context

#### 4. Generate Slug

From highlight content:
- Read first sentence
- Extract 2-4 keywords
- Create kebab-case slug

**Examples**:
- "main-finding" (from "LLMs achieve 94.9% accuracy")
- "performance-gap" (from "humans achieve only 34.5%")
- "study-design" (from "randomized controlled trial")

#### 5. Determine Significance

Map color to significance:
- Yellow → `main-finding`
- Red → `critical-result`
- Green → `method`
- Blue → `discussion` or `limitation`

#### 6. Write Highlight File

**Location**: `papers/{folder-name}/highlights/{NNN}-{color}-{slug}.md`

```yaml
---
type: highlight
highlight_id: "001"
page: 5
color: "yellow"
color_code: "#ffd400"
significance: "main-finding"
text: |
  Full highlighted text from the paper.
  Can span multiple lines.
context: "Optional surrounding context if needed for understanding"
created: "2026-02-11T14:30:00Z"
paper_key: "JZUBTJM9"
tags:
  - "RCT"
  - "performance"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
---

# Descriptive Title Based on Content

[Highlight text]

## Notes

[Optional: Your annotations, thoughts, questions about this highlight]

## Related

[Links to other highlights, notes, or papers that connect to this]
```

#### 7. Update 00-source.md

Remove embedded highlights and add reference:

```yaml
---
type: source
# ... other metadata ...
highlights_extracted: true
highlights_folder: "highlights/"
---

# Paper Title

## Abstract

[Abstract text]

## Highlights

See `highlights/` folder for extracted highlights (9 files).
```

#### 8. Update Tracking

```yaml
papers:
  JZUBTJM9:
    highlights_extracted: true
    highlights_count: 9

index/note-graph.yaml:
  nodes:
    - id: "bean-2026-llm-medical-assistants-JZUBTJM9/highlights/001"
      type: "highlight"
      title: "Main finding"
  edges:
    - from: "bean-2026-llm-medical-assistants-JZUBTJM9/highlights/001"
      to: "bean-2026-llm-medical-assistants-JZUBTJM9/00-source"
      type: "extracted_from"
```

#### 9. Git Commit

```bash
git add papers/bean-2026-llm-medical-assistants-JZUBTJM9/highlights/
git add papers/bean-2026-llm-medical-assistants-JZUBTJM9/00-source.md
git add index/papers.yaml
git add index/note-graph.yaml
git commit -m "Extract 9 highlights from Bean et al. (2026)"
```

---

## Workflow 3: Figure Extraction

### Purpose

Extract figures with semantic descriptions for better understanding and reference.

### Prerequisites

- **pdfimages** (from poppler-utils)
- Alternatively: Manual screenshot

### Steps

#### 1. Identify Figure to Extract

User requests: "Extract Figure 3 from bean paper"

#### 2. Locate Figure in PDF

```bash
Read source-files/JZUBTJM9-*.pdf
# Or specify page if known:
Read source-files/JZUBTJM9-*.pdf --pages "5"
```

#### 3. Extract Figure Image

**Option A: Use extraction script**:
```bash
cd scripts/
./extract-figures.sh source-files/JZUBTJM9-*.pdf papers/bean-2026-llm-medical-assistants-JZUBTJM9 bean-2026-llm-medical-assistants-JZUBTJM9
```

**Option B: Manual screenshot**:
- View PDF
- Screenshot figure
- Save as `figure-01.png` in `figures/` folder

#### 4. Analyze Figure Content

Identify:
- Figure type (bar_chart, line_graph, scatter_plot, diagram, etc.)
- Variables (x-axis, y-axis, grouping)
- Key findings visible in figure
- Statistical tests or annotations

#### 5. Create Semantic JSON Metadata

**Location**: `papers/{folder-name}/figures/figure-01.json`

```json
{
  "type": "figure",
  "figure_id": "01",
  "figure_type": "bar_chart",
  "title": "Performance comparison across LLM conditions",
  "caption": "Figure caption from paper (if available)",
  "description": "Semantic description: This bar chart compares accuracy rates for condition identification and disposition recommendation across three LLM models (GPT-4o, Llama 3, Command R+) when used by human participants versus tested alone.",
  "key_findings": [
    "LLMs alone achieve 94.9% accuracy for condition identification",
    "Humans with LLMs achieve only 34.5% accuracy",
    "Performance gap exists across all three models tested"
  ],
  "variables": {
    "x_axis": "Condition (LLM model + usage mode)",
    "y_axis": "Accuracy (%)",
    "grouping": "Task type (condition identification vs disposition)"
  },
  "source_page": 5,
  "image_file": "figure-01.png",
  "created": "2026-02-11T14:30:00Z",
  "paper_key": "JZUBTJM9",
  "tags": ["performance", "comparison", "human-LLM-interaction"]
}
```

#### 6. Update Tracking

```yaml
papers:
  JZUBTJM9:
    figures_extracted: true
    figures_count: 1
```

#### 7. Git Commit

```bash
git add papers/bean-2026-llm-medical-assistants-JZUBTJM9/figures/figure-01.png
git add papers/bean-2026-llm-medical-assistants-JZUBTJM9/figures/figure-01.json
git add index/papers.yaml
git commit -m "Extract Figure 1 from Bean et al. (2026): Performance comparison"
```

---

## Workflow 4: Table Extraction

### Purpose

Extract tables as structured data (CSV) with semantic metadata.

### Steps

#### 1. Identify Table to Extract

User requests: "Extract Table 1 from bean paper"

#### 2. Locate Table in PDF

```bash
Read source-files/JZUBTJM9-*.pdf --pages "4"
```

#### 3. Extract Table Data

**Option A: Use extraction script**:
```bash
cd scripts/
./extract-tables.sh source-files/JZUBTJM9-*.pdf papers/bean-2026-llm-medical-assistants-JZUBTJM9 bean-2026-llm-medical-assistants-JZUBTJM9
```

**Option B: Manual transcription**:
- Create CSV file manually
- Save as `table-01.csv`

**Note**: Table extraction from PDFs is imperfect. Always verify manually.

#### 4. Analyze Table Structure

Identify:
- Column names and types
- Row structure
- Key findings in data
- Statistical summaries

#### 5. Create Semantic JSON Metadata

**Location**: `papers/{folder-name}/figures/table-01.json`

```json
{
  "type": "table",
  "table_id": "01",
  "title": "Demographic characteristics of study participants",
  "description": "Breakdown of 1,298 participants by age group, gender, education level, and prior medical knowledge.",
  "columns": [
    {"name": "demographic_variable", "type": "categorical"},
    {"name": "n", "type": "integer"},
    {"name": "percentage", "type": "float"}
  ],
  "key_findings": [
    "Majority of participants (65%) had no prior medical training",
    "Age range: 18-75, median age 34",
    "Gender distribution: 52% female, 48% male"
  ],
  "source_page": 4,
  "data_file": "table-01.csv",
  "created": "2026-02-11T14:30:00Z",
  "paper_key": "JZUBTJM9",
  "tags": ["demographics", "participants", "sample-characteristics"]
}
```

#### 6. Update Tracking

```yaml
papers:
  JZUBTJM9:
    tables_extracted: true
    tables_count: 1
```

#### 7. Git Commit

```bash
git add papers/bean-2026-llm-medical-assistants-JZUBTJM9/figures/table-01.csv
git add papers/bean-2026-llm-medical-assistants-JZUBTJM9/figures/table-01.json
git add index/papers.yaml
git commit -m "Extract Table 1 from Bean et al. (2026): Demographics"
```

---

## Extraction Scripts Reference

All scripts available in `scripts/` (via `skill/scripts@`):

### extract-paper.sh

**Purpose**: Main orchestrator for full paper extraction

**Usage**:
```bash
./extract-paper.sh {pdf_path} {output_dir} {paper_id}
```

**What it does**:
- Runs pdf-to-markdown.sh
- Runs extract-figures.sh
- Runs extract-tables.sh
- Creates directory structure

### pdf-to-markdown.sh

**Purpose**: Convert PDF to markdown using pdftotext

**Usage**:
```bash
./pdf-to-markdown.sh {pdf_path} {output_dir} {paper_id}
```

**Output**: `{output_dir}/{paper_id}.md`

**Options**:
- Uses `-layout` flag to preserve formatting
- Handles multi-column layouts
- Extracts all text, including headers/footers

### extract-figures.sh

**Purpose**: Extract figures from PDF using pdfimages

**Usage**:
```bash
./extract-figures.sh {pdf_path} {output_dir} {paper_id}
```

**Output**: PNG files in `{output_dir}/figures/`

**Note**: May require manual cleanup and metadata creation.

### extract-tables.sh

**Purpose**: Attempt to extract tables from PDF

**Usage**:
```bash
./extract-tables.sh {pdf_path} {output_dir} {paper_id}
```

**Output**: CSV files in `{output_dir}/figures/`

**Note**: Table extraction is imperfect. Always verify manually.

---

## Quality Standards

### Full Text Extracts

- ✅ Complete text extracted (check page count)
- ✅ Formatting reasonably preserved
- ✅ YAML frontmatter added
- ✅ Extraction method documented
- ✅ Quality notes included (formatting issues, missing content)

### Highlights

- ✅ One file per highlight
- ✅ Color-coded appropriately
- ✅ Complete YAML frontmatter
- ✅ Descriptive title and slug
- ✅ Links to source paper

### Figures

- ✅ High-resolution image (PNG preferred)
- ✅ Semantic JSON metadata
- ✅ Key findings identified
- ✅ Variables described
- ✅ Source page noted

### Tables

- ✅ Structured CSV data
- ✅ Semantic JSON metadata
- ✅ Column types documented
- ✅ Key findings identified
- ✅ Data verified against original

---

## Troubleshooting

### Problem: pdftotext not found

**Solution**: Install poppler-utils
```bash
# macOS
brew install poppler

# Linux
apt-get install poppler-utils
```

### Problem: Table extraction fails

**Solution**: Tables in PDFs are notoriously difficult. Manual transcription is often faster and more reliable.

### Problem: Figure extraction produces many small images

**Solution**: Use manual screenshots for specific figures. Automatic extraction captures ALL images, including icons and decorations.

### Problem: Full text has formatting artifacts

**Solution**: This is expected. Use pdftotext `-layout` flag (already in script). Some manual cleanup may be needed for tables.

---

## Related Documentation

- [workflow-import.md](workflow-import.md) - Importing papers with highlights
- [workflow-notes.md](workflow-notes.md) - Creating notes from highlights
- [yaml-schemas.md](yaml-schemas.md) - Schemas for all extract types
- [best-practices.md](best-practices.md) - Quality standards
- `scripts/` - Extraction scripts (via symlink)
