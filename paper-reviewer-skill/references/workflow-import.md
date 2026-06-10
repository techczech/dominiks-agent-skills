# Workflow: Importing Papers from Zotero

Complete guide to importing academic papers from Zotero into the repository.

## Overview

Papers are imported from Zotero using the VSCodeZotero extension. This workflow covers:

1. Single paper import
2. Collection import (multiple papers)
3. Handling supplementary materials
4. Foam wikilink setup for knowledge graph
5. Git commit strategy

## Prerequisites

- **Zotero** with papers in your library
- **VSCodeZotero** extension configured
- **Working directory** set to repository root

---

## Workflow 1: Single Paper Import

### Trigger

New files appear in `source-files/` directory after Zotero export.

### Steps

#### 1. Detect New Paper

```bash
ls source-files/
# Look for new {zotero_key}-*.md files
```

Expected files:
- `{zotero_key}-*.md` - Markdown with metadata + abstract + highlights
- `{zotero_key}-*__*.pdf` - PDF attachment (double underscore separator)
- Optional: `{zotero_key}-*supplementary.pdf` - Supplementary materials

#### 2. Read the Markdown File

```bash
Read source-files/{zotero_key}-*.md
```

Extract metadata from YAML frontmatter:
- `zotero_key` - e.g., `JZUBTJM9`
- `creators` - e.g., `["Bean, Andrew M.", "Seifert, Collin", ...]`
- `year` - e.g., `2026`
- `title` - Full title
- `abstract` - Abstract text
- `highlights` - Color-coded highlights (if available)

#### 3. Generate Human-Readable Folder Name

**Format**: `{author}-{year}-{title-short}-{zotero_key}`

**Steps**:
1. Extract first author's last name:
   - From `creators[0]`: `"Bean, Andrew M."`
   - Extract: `Bean`
   - Lowercase: `bean`

2. Extract year:
   - From `year`: `2026`

3. Create short title (2-4 words, kebab-case):
   - Read full title: "Reliability of LLMs as medical assistants for the general public..."
   - Extract key concepts: "LLM", "medical", "assistants"
   - Create slug: `llm-medical-assistants`

4. Append zotero_key:
   - From `zotero_key`: `JZUBTJM9`

**Result**: `bean-2026-llm-medical-assistants-JZUBTJM9`

**Good vs Bad Short Titles**:

✅ **Good**:
- `llm-medical-assistants` (clear, concise)
- `chatbot-reliability-rct` (descriptive with method)
- `ai-education-outcomes` (clear domain and focus)

❌ **Bad**:
- `reliability-of-llms-as-medical-assistants-for-general-public` (too long)
- `paper` (too generic)
- `llm` (too vague)
- `study-2026` (not descriptive)

#### 4. Create Paper Directory Structure

```bash
mkdir -p papers/bean-2026-llm-medical-assistants-JZUBTJM9/{highlights,figures,additional-sources,reviews,extracts,notes}
```

Folder structure:
```
papers/bean-2026-llm-medical-assistants-JZUBTJM9/
├── 00-source.md              # Metadata + abstract (NO PDF, NO highlights)
├── highlights/               # Atomic highlight files (created later)
├── figures/                  # Figures and tables with metadata
├── additional-sources/       # Datasets, code, supplements
├── reviews/                  # Multi-style reviews
├── extracts/                 # Direct content extractions
└── notes/                    # Paper-specific atomic notes
```

#### 5. Create 00-source.md

**Important**: Do NOT copy the PDF here. PDFs stay in `source-files/` only.

```bash
# Option A: If highlights are NOT yet extracted to separate files
# Copy the markdown file as-is (includes embedded highlights)
cp source-files/JZUBTJM9-*.md papers/bean-2026-llm-medical-assistants-JZUBTJM9/00-source.md

# Option B: If highlights ARE extracted to separate files (Workflow 1b)
# Create 00-source.md WITHOUT embedded highlights (see Workflow 1b)
```

Update YAML frontmatter to note PDF location:
```yaml
---
type: source
zotero_key: "JZUBTJM9"
# ... other metadata ...
pdf_location: "source-files/JZUBTJM9-*.pdf"  # Reference to PDF
highlights_extracted: false                   # Will update after extraction
highlights_folder: "highlights/"
---
```

#### 6. Handle Supplementary Materials

Check for supplementary files:
- Supplementary PDFs
- Data files (.csv, .xlsx, .json)
- Code repositories (.zip, .tar.gz)
- Additional documents

Copy to paper folder with descriptive names:
```bash
# Supplementary PDF
cp source-files/{zotero_key}-*supplementary.pdf papers/{folder-name}/additional-sources/00-supplementary.pdf

# Data files
cp supplementary-data.csv papers/{folder-name}/additional-sources/00-supplementary-data.csv

# Code
cp supplementary-code.zip papers/{folder-name}/additional-sources/00-supplementary-code.zip
```

Use `00-supplementary-{type}` naming for easy identification.

Common types:
- `00-supplementary.pdf` - Supplementary methods/results
- `00-supplementary-data.csv` - Data files
- `00-supplementary-code.zip` - Code repositories
- `00-supplementary-tables.pdf` - Additional tables

#### 7. Update index/papers.yaml

Add entry for the new paper:

```yaml
papers:
  JZUBTJM9:
    title: "Reliability of LLMs as medical assistants for the general public: a randomized preliminary evaluation"
    authors: "Bean et al."
    year: 2026
    folder_name: "bean-2026-llm-medical-assistants-JZUBTJM9"
    path: "papers/bean-2026-llm-medical-assistants-JZUBTJM9/"
    source_path: "source-files/JZUBTJM9-*.pdf"
    status: imported
    reviews: []
    extracts: []
    notes: []
    highlights_extracted: false
    figures_extracted: false
    supplementary_materials:
      - "00-supplementary.pdf"
```

#### 8. Git Commit

```bash
git add source-files/JZUBTJM9-*
git add papers/bean-2026-llm-medical-assistants-JZUBTJM9/
git add index/papers.yaml
git commit -m "Import paper: Reliability of LLMs as medical assistants (Bean et al., 2026)"
```

---

## Workflow 1a: Processing Collections

### Trigger

Multiple papers from a Zotero collection appear in `source-files/{collection-name}/` subdirectory.

### Context

VSCodeZotero can organize papers by collection in subdirectories. When importing a collection, process all papers together.

### Steps

#### 1. Detect Collection

```bash
ls source-files/
# Look for subdirectories (e.g., AI-Disciplinary-Use-Evaluations/)
```

#### 2. List Papers in Collection

```bash
ls source-files/AI-Disciplinary-Use-Evaluations/*.md
```

#### 3. Process Each Paper

For each paper in the collection, follow **Workflow 1** (single paper import):

1. Read markdown file from `source-files/{collection-name}/{zotero_key}-*.md`
2. Extract metadata
3. Generate folder name
4. Create paper structure in `papers/{folder-name}/`
5. Create 00-source.md (no PDF)
6. Handle supplementary materials
7. Update `index/papers.yaml`

#### 4. Track Collection Membership

In `index/papers.yaml`, note collection membership:

```yaml
papers:
  JZUBTJM9:
    # ... other fields ...
    collections:
      - "AI-Disciplinary-Use-Evaluations"
    collection_source: "source-files/AI-Disciplinary-Use-Evaluations/"
```

#### 5. Create Collection Index (Optional but Recommended)

Create `index/collections/AI-Disciplinary-Use-Evaluations.md`:

```markdown
---
type: collection
collection_name: "AI-Disciplinary-Use-Evaluations"
paper_count: 27
created: "2026-02-11"
description: "Papers evaluating LLMs in disciplinary contexts"
tags:
  - "LLM-evaluation"
  - "disciplinary-use"
---

# AI Disciplinary Use Evaluations Collection

## Overview

27 papers examining how LLMs perform in disciplinary contexts (medical, legal, educational, etc.).

## Papers

- [[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]] - Medical domain
- [[smith-2025-legal-reasoning-ABC123/00-source]] - Legal domain
- ...

## Themes

- Human-AI interaction issues
- Benchmark vs. reality gaps
- Ecological validity concerns
```

This creates a "hub node" in the Foam knowledge graph.

#### 6. Batch Commit (Collections Only)

```bash
git add source-files/AI-Disciplinary-Use-Evaluations/
git add papers/
git add index/
git commit -m "Import collection: AI-Disciplinary-Use-Evaluations (27 papers)"
```

**Note**: Collections are the ONLY exception to the "immediate commit" rule. When processing a collection, import all papers first, then commit once at the end.

---

## Workflow 1b: Extracting Highlights to Separate Files

### When to Use

If the Zotero import includes embedded highlights in the markdown file, extract them to separate atomic files for better linking and annotation.

### Steps

#### 1. Read Highlights from Source

```bash
Read source-files/{zotero_key}-*.md
# Look for highlights section in YAML or markdown
```

Highlights may appear as:
- YAML array in frontmatter (`highlights: [...]`)
- Markdown blockquotes with color annotations
- Separate annotations section

#### 2. For Each Highlight, Create Atomic File

**Naming**: `{number:003}-{color}-{slug}.md`

Example: `001-yellow-main-finding.md`

**Colors**:
- `yellow` (#ffd400) - Important points, key findings
- `red` (#ff6666) - Critical results, main arguments
- `green` (#5fb236) - Methods, procedures, data collection
- `blue` (#2ea8e5) - Discussion, limitations, future work

#### 3. Create Highlight File

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
context: "Optional surrounding context"
created: "2026-02-11T14:30:00Z"
paper_key: "JZUBTJM9"
tags:
  - "RCT"
  - "performance-degradation"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
---

# Descriptive Title Based on Content

[Highlight text]

## Notes

[Optional annotations, thoughts, questions]

## Related

[Links to other highlights, notes, or papers]
```

Write to: `papers/{folder-name}/highlights/001-yellow-main-finding.md`

#### 4. Update 00-source.md

Remove embedded highlights from `00-source.md` and add reference:

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

#### 5. Update index/papers.yaml

```yaml
papers:
  JZUBTJM9:
    # ... other fields ...
    highlights_extracted: true
    highlights_count: 9
```

#### 6. Update index/note-graph.yaml

Add nodes for each highlight:

```yaml
nodes:
  - id: "bean-2026-llm-medical-assistants-JZUBTJM9/highlights/001"
    type: "highlight"
    title: "Main finding"
    color: "yellow"

edges:
  - from: "bean-2026-llm-medical-assistants-JZUBTJM9/highlights/001"
    to: "bean-2026-llm-medical-assistants-JZUBTJM9/00-source"
    type: "extracted_from"
```

#### 7. Git Commit

```bash
git add papers/{folder-name}/highlights/
git add papers/{folder-name}/00-source.md
git add index/papers.yaml
git add index/note-graph.yaml
git commit -m "Extract highlights from {paper-title} (9 highlights)"
```

---

## Foam Wikilink Integration

### What is Foam?

VS Code extension that visualizes markdown note connections via wikilinks.

### How to Use in This Repository

#### 1. Link Papers to Papers

```markdown
See also [[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]
Related work: [[smith-2025-ai-education-ABC123/00-source]]
```

#### 2. Link Reviews to Papers

```markdown
Reviewed paper: [[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]
Building on [[bean-2026-llm-medical-assistants-JZUBTJM9/reviews/quick-read]]
```

#### 3. Link Notes to Notes

```markdown
Related insight: [[20260211-130500-llm-human-interaction-paradox]]
Contradicts: [[20260210-120000-benchmark-reliability]]
```

#### 4. Collection Overviews Create Hub Nodes

```markdown
Papers in this collection:
- [[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]
- [[smith-2025-ai-education-ABC123/00-source]]
```

### Foam Visualization

Open Foam graph: **Ctrl+Shift+P** → "Foam: Show Graph"

Visualize:
- How papers connect
- Which notes reference multiple papers
- Collection structure
- Knowledge clusters

### Best Practices

- ✅ Always use wikilinks in YAML `links:` arrays AND in markdown content
- ✅ Use full paths for clarity: `[[folder/file]]`
- ✅ Create bidirectional links when concepts are related
- ✅ Collection overview files create hub nodes in the graph

---

## PDF Storage Policy

**CRITICAL**: PDFs are stored ONLY in `source-files/`, never in `papers/`.

### Why?

- **Single source of truth**: One copy, referenced everywhere
- **Git-friendly**: Large PDFs don't clutter paper analysis folders
- **Clean structure**: Working space stays focused on analysis
- **Optional .gitignore**: Can exclude PDFs from git if desired

### Referencing PDFs

In `00-source.md` YAML:
```yaml
pdf_location: "source-files/JZUBTJM9-*.pdf"
```

When reading PDFs:
```bash
Read source-files/JZUBTJM9-*.pdf
```

---

## Folder Naming Best Practices

### Good Examples

✅ `bean-2026-llm-medical-assistants-JZUBTJM9`
- Clear first author, year, descriptive title, unique key

✅ `smith-2025-rct-design-evaluation-ABC123`
- Includes method in title for quick identification

✅ `jones-2024-benchmark-performance-gap-XYZ789`
- Descriptive of main finding

### Bad Examples

❌ `bean-2026-reliability-of-large-language-models-as-medical-assistants-for-the-general-public-a-randomized-preliminary-evaluation-JZUBTJM9`
- Too long, hard to reference

❌ `JZUBTJM9`
- Not human-readable

❌ `paper-2026-JZUBTJM9`
- Not descriptive

❌ `llm-paper-JZUBTJM9`
- Too vague

---

## Troubleshooting

### Problem: Can't find zotero_key

**Solution**: Check YAML frontmatter in markdown file. Should be `zotero_key: "JZUBTJM9"`.

### Problem: Multiple PDFs for one paper

**Solution**:
- Main PDF: `{zotero_key}-*__*.pdf` (double underscore)
- Supplementary: `{zotero_key}-*supplementary.pdf`
- Keep all in `source-files/`, reference in YAML

### Problem: Highlights not in expected format

**Solution**: Zotero export format varies. Manually create highlight files following the schema in [yaml-schemas.md](yaml-schemas.md#highlights).

### Problem: Folder name too long

**Solution**: Use 2-3 word title slug. Example: `reliability-of-llms-medical-assistants` → `llm-medical-assistants`.

---

## Related Documentation

- [directory-structure.md](directory-structure.md) - Where files live
- [yaml-schemas.md](yaml-schemas.md) - YAML frontmatter specifications
- [workflow-extract.md](workflow-extract.md) - Extracting highlights, figures, tables
- [workflow-review.md](workflow-review.md) - Conducting reviews
- [best-practices.md](best-practices.md) - Quality standards and tips
