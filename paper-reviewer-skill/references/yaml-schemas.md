# YAML Schemas

Complete specifications for YAML frontmatter in all file types.

## Overview

Every markdown file in this repository MUST have YAML frontmatter. This enables:
- Structured metadata for processing
- Type identification for tooling
- Search and filtering
- Knowledge graph construction
- Foam wikilink visualization

## Schema Categories

1. [Source Papers](#source-papers) - Original Zotero imports
2. [Highlights](#highlights) - Extracted highlights as atomic files
3. [Figures](#figures) - Figure metadata (JSON format)
4. [Tables](#tables) - Table metadata (JSON format)
5. [Reviews](#reviews) - Paper reviews (multiple styles)
6. [Extracts](#extracts) - Direct content from papers
7. [Atomic Notes](#atomic-notes) - Paper-specific insights
8. [Data Notes](#data-notes) - Cross-cutting knowledge
9. [Writing Projects](#writing-projects) - Synthesis projects

---

## Source Papers

**Location**: `papers/{folder-name}/00-source.md`

**Purpose**: Metadata + abstract for each paper (NO embedded highlights, NO PDF)

### Required Fields

```yaml
---
type: source
zotero_key: "JZUBTJM9"                    # Unique Zotero identifier
title: "Full paper title"
creators:                                  # Authors (last, first format)
  - "Bean, Andrew M."
  - "Smith, John"
year: 2026
doi: "10.1000/example.doi"
url: "https://doi.org/10.1000/example.doi"
tags:
  - "RCT"
  - "LLM-evaluation"
  - "medical-AI"
abstract: |
  Full abstract text here.
  Can span multiple lines.
---
```

### Optional Fields

```yaml
highlights_extracted: true                 # Highlights moved to highlights/ folder
highlights_folder: "highlights/"
figures_extracted: false                   # Figures extracted to figures/ folder
figures_folder: "figures/"
supplementary_materials:                   # Additional files
  - "00-supplementary.pdf"
  - "00-supplementary-data.csv"
collections:                               # Zotero collections
  - "AI-Disciplinary-Use-Evaluations"
status: "imported"                         # imported | in_progress | completed
```

### Example

```yaml
---
type: source
zotero_key: "JZUBTJM9"
title: "Reliability of LLMs as medical assistants for the general public: a randomized preliminary evaluation"
creators:
  - "Bean, Andrew M."
  - "Seifert, Collin"
  - "Lakkaraju, Kiran"
  - "Stites, Molly"
year: 2026
doi: "10.1016/j.artmed.2025.103073"
url: "https://doi.org/10.1016/j.artmed.2025.103073"
tags:
  - "RCT"
  - "LLM-evaluation"
  - "medical-AI"
  - "human-AI-interaction"
abstract: |
  Large language models (LLMs) are being explored as assistants for general-population users...
highlights_extracted: true
highlights_folder: "highlights/"
figures_extracted: false
supplementary_materials:
  - "00-supplementary.pdf"
collections:
  - "AI-Disciplinary-Use-Evaluations"
status: "in_progress"
---
```

---

## Highlights

**Location**: `papers/{folder-name}/highlights/{NNN}-{color}-{slug}.md`

**Naming**: `{number:003}-{color}-{slug}.md`
- Example: `001-yellow-main-finding.md`

**Purpose**: Each highlight as a separate atomic file with YAML frontmatter

### Required Fields

```yaml
---
type: highlight
highlight_id: "001"                        # Sequential number
page: 5                                    # Page number (or null if unknown)
color: "yellow"                            # yellow | red | green | blue
color_code: "#ffd400"                      # Hex code for color
significance: "main-finding"               # main-finding | critical-result | method | discussion | limitation
text: |                                    # Full highlighted text
  Text from the paper that was highlighted.
  Can span multiple lines.
created: "2026-02-11T14:30:00Z"           # ISO 8601 timestamp
paper_key: "JZUBTJM9"                     # Zotero key of source paper
tags:
  - "RCT"
  - "performance-degradation"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
---
```

### Optional Fields

```yaml
context: "Optional surrounding context"    # Additional context if needed
notes: "Personal annotations"              # Your thoughts about this highlight
related:                                   # Links to related highlights/notes
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/highlights/002-red-result]]"
```

### Color Coding

| Color | Code | Significance | Use For |
|-------|------|--------------|---------|
| Yellow | #ffd400 | main-finding | Key findings, important points |
| Red | #ff6666 | critical-result | Critical results, main arguments |
| Green | #5fb236 | method | Methods, procedures, data collection |
| Blue | #2ea8e5 | discussion | Discussion, limitations, future work |

### Example

```yaml
---
type: highlight
highlight_id: "002"
page: 5
color: "red"
color_code: "#ff6666"
significance: "critical-result"
text: |
  Tested alone, LLMs complete the scenarios accurately, correctly identifying conditions in 94.9% of cases and disposition in 56.3% on average. However, participants using the same LLMs identified relevant conditions in fewer than 34.5% of cases and disposition in fewer than 44.2%, both no better than the control group.
context: "Main results comparing LLM-alone vs. human-with-LLM performance"
created: "2026-02-11T16:30:00Z"
paper_key: "JZUBTJM9"
tags:
  - "performance-gap"
  - "human-LLM-interaction"
  - "main-finding"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
---

# Performance Gap Between LLM-Alone and Human-with-LLM

[Highlight text repeated]

## Notes

This is the central paradox of the paper - LLMs perform well in isolation but fail to help humans.

## Related

- [[bean-2026-llm-medical-assistants-JZUBTJM9/notes/20260211-130500-llm-human-interaction-paradox]]
```

---

## Figures

**Location**: `papers/{folder-name}/figures/figure-{NN}.json`

**Format**: JSON (not YAML) for structured data

**Purpose**: Semantic description of figures with metadata

### Required Fields

```json
{
  "type": "figure",
  "figure_id": "01",
  "figure_type": "bar_chart",
  "title": "Performance comparison across LLM conditions",
  "description": "Semantic description of what the figure shows",
  "key_findings": [
    "Finding 1",
    "Finding 2"
  ],
  "source_page": 5,
  "image_file": "figure-01.png",
  "created": "2026-02-11T14:30:00Z",
  "paper_key": "JZUBTJM9",
  "tags": ["performance", "comparison"]
}
```

### Figure Types

- `bar_chart` - Bar charts
- `line_graph` - Line graphs
- `scatter_plot` - Scatter plots
- `diagram` - Conceptual diagrams
- `flowchart` - Process flowcharts
- `heatmap` - Heat maps
- `table` - Visual tables (use table schema for data tables)
- `other` - Other figure types

### Optional Fields

```json
{
  "caption": "Figure caption from paper",
  "variables": {
    "x_axis": "Variable name",
    "y_axis": "Variable name",
    "grouping": "Grouping variable"
  },
  "statistical_tests": "Description of tests shown",
  "notes": "Additional notes about the figure"
}
```

### Example

```json
{
  "type": "figure",
  "figure_id": "01",
  "figure_type": "bar_chart",
  "title": "Performance comparison across LLM conditions",
  "caption": "Accuracy rates for condition identification and disposition recommendation",
  "description": "Bar chart comparing accuracy rates for condition identification and disposition recommendation across three LLM models (GPT-4o, Llama 3, Command R+) when used by human participants versus tested alone.",
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

---

## Tables

**Location**: `papers/{folder-name}/figures/table-{NN}.json`

**Format**: JSON (not YAML) for structured data

**Companion file**: `table-{NN}.csv` (actual data)

### Required Fields

```json
{
  "type": "table",
  "table_id": "01",
  "title": "Table title",
  "description": "Semantic description of table contents",
  "columns": [
    {"name": "column1", "type": "categorical"},
    {"name": "column2", "type": "integer"}
  ],
  "key_findings": [
    "Key finding 1",
    "Key finding 2"
  ],
  "source_page": 4,
  "data_file": "table-01.csv",
  "created": "2026-02-11T14:30:00Z",
  "paper_key": "JZUBTJM9",
  "tags": ["demographics"]
}
```

### Column Types

- `categorical` - Categorical data
- `integer` - Integer numbers
- `float` - Floating-point numbers
- `boolean` - True/false
- `text` - Free text
- `date` - Dates
- `percentage` - Percentages

### Example

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

---

## Reviews

**Location**: `papers/{folder-name}/reviews/{review-style}.md`

**Purpose**: Multi-style reviews of papers

### Required Fields

```yaml
---
type: review
review_style: "gelman-review"             # gelman-review | quick-read | methods-deep-dive | critical-review
paper_key: "JZUBTJM9"
paper_title: "Full paper title"
reviewed_date: "2026-02-11"
reviewer: "Claude Sonnet 4.5"
status: "completed"                        # draft | in_progress | completed
rating: 7                                  # 1-10 scale (optional)
tags:
  - "RCT"
  - "methodological-critique"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
---
```

### Review Styles

| Style | Purpose | Length | When to Use |
|-------|---------|--------|-------------|
| gelman-review | Critical statistical/methodological analysis | 2000-4000 words | RCTs, complex statistics |
| quick-read | Fast triage overview | 300-500 words | Initial assessment |
| methods-deep-dive | Detailed methodological analysis | 1500-3000 words | Novel methods, replication |
| critical-review | Peer-review style assessment | 2000-3000 words | Controversial claims, high-impact papers |

### Example

```yaml
---
type: review
review_style: "gelman-review"
paper_key: "JZUBTJM9"
paper_title: "Reliability of LLMs as medical assistants for the general public"
reviewed_date: "2026-02-11"
reviewer: "Claude Sonnet 4.5"
status: "completed"
rating: 7
strengths:
  - "Rigorous RCT design with preregistration"
  - "Large sample size (N=1,298)"
  - "Clear paradoxical finding"
weaknesses:
  - "Limited ecological validity"
  - "Interface not representative of typical LLM use"
  - "No qualitative data on participant strategies"
tags:
  - "RCT"
  - "methodological-critique"
  - "LLM-evaluation"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/extracts/methods]]"
---
```

---

## Extracts

**Location**: `papers/{folder-name}/extracts/{extract-type}.md`

**Purpose**: Direct content extracted from papers

### Required Fields

```yaml
---
type: extract
extract_type: "methods"                    # methods | conclusions | summary-card | full-text
paper_key: "JZUBTJM9"
paper_title: "Full paper title"
extracted_date: "2026-02-11"
source_section: "Methods"                  # Section name from paper
tags:
  - "RCT"
  - "n=1298"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
---
```

### Extract Types

| Type | Purpose | Content |
|------|---------|---------|
| methods | Methodological details | Study design, procedures, analysis |
| conclusions | Main conclusions | Conclusion section or summary of findings |
| summary-card | Shareable summary | TL;DR style overview |
| full-text | Complete paper text | PDF → markdown conversion |

### Example

```yaml
---
type: extract
extract_type: "methods"
paper_key: "JZUBTJM9"
paper_title: "Reliability of LLMs as medical assistants"
extracted_date: "2026-02-11"
source_section: "Methods"
tags:
  - "RCT"
  - "n=1298"
  - "preregistered"
  - "medical-scenarios"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
---

# Methods Extract

## Study Design

Randomized controlled trial with N=1,298 participants...
```

---

## Atomic Notes

**Location**: `papers/{folder-name}/notes/{timestamp}-{slug}.md`

**Purpose**: Paper-specific insights and observations

### Required Fields

```yaml
---
type: note
id: "20260211-143000"                      # YYYYMMDD-HHMMSS timestamp
title: "Note title (single idea)"
created: "2026-02-11T14:30:00Z"           # ISO 8601
tags:
  - "paradox"
  - "human-AI-interaction"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/reviews/gelman-review]]"
related_papers:
  - "JZUBTJM9"
---
```

### Optional Fields

```yaml
status: "draft"                            # draft | in_progress | completed
related_notes:                             # Links to other notes
  - "[[20260210-120000-benchmark-reliability]]"
questions:                                 # Open questions
  - "Why does the interface matter so much?"
```

### Example

```yaml
---
type: note
id: "20260211-143000"
title: "LLM-Human Interaction Paradox"
created: "2026-02-11T14:30:00Z"
tags:
  - "paradox"
  - "human-AI-interaction"
  - "performance-degradation"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/reviews/gelman-review]]"
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/highlights/002-red-performance-gap]]"
related_papers:
  - "JZUBTJM9"
related_notes:
  - "[[20260210-120000-benchmark-vs-reality]]"
status: "completed"
---

# LLM-Human Interaction Paradox

LLMs perform well in isolation (94.9% accuracy) but fail to help humans (34.5% accuracy)...
```

---

## Data Notes

**Location**: `data/{category}-{timestamp}-{slug}.md`

**Naming**: `{category}-{YYYYMMDD-HHMMSS}-{slug}.md`

**Purpose**: Cross-cutting knowledge that spans multiple papers

### Required Fields

```yaml
---
type: data_note
data_category: "method"                    # method | dataset | analytical-approach | result-pattern
id: "20260211-143000"                      # YYYYMMDD-HHMMSS timestamp
title: "Note title"
created: "2026-02-11T14:30:00Z"
tags:
  - "experimental-design"
  - "causal-inference"
related_papers:
  - "JZUBTJM9"
  - "ABC123"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
---
```

### Data Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| method | Methodological approaches | RCT design, qualitative analysis, survey methods |
| dataset | Datasets used across papers | Benchmarks, evaluation sets, corpora |
| analytical-approach | Analysis techniques | Statistical tests, ML models, coding schemes |
| result-pattern | Recurring patterns in findings | Performance gaps, replication failures, trends |

### Example

```yaml
---
type: data_note
data_category: "method"
id: "20260211-143000"
title: "Randomized Controlled Trial (RCT) Design"
created: "2026-02-11T14:30:00Z"
tags:
  - "experimental-design"
  - "causal-inference"
  - "gold-standard"
related_papers:
  - "JZUBTJM9"
  - "ABC123"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
  - "[[data/method-20260211-144500-preregistration-protocol]]"
---

# Randomized Controlled Trial (RCT) Design

## Definition

Experimental design where participants are randomly assigned to treatment and control conditions...

## Examples in Papers

### Bean et al. (2026) - JZUBTJM9
- N=1,298 participants
- Random assignment to LLM vs. control
- Preregistered protocol
```

---

## Writing Projects

**Location**: `writing/{project-name}/README.md`

**Purpose**: Synthesis projects that combine insights from multiple papers

### Required Fields

```yaml
---
type: writing_project
project_id: "20260211-153000"              # YYYYMMDD-HHMMSS timestamp
title: "Project title"
created: "2026-02-11T15:30:00Z"
status: "in_progress"                      # planning | drafting | revising | final
target_venue: "Conference paper"           # Target publication venue
target_length: "5000 words"
deadline: "2026-03-15"
tags:
  - "LLM-evaluation"
  - "synthesis"
source_papers:
  - "JZUBTJM9"
  - "ABC123"
related_notes:
  - "[[20260211-130500-llm-human-paradox]]"
  - "[[data/result-pattern-20260211-152000-benchmark-vs-reality-gap]]"
---
```

### Example

```yaml
---
type: writing_project
project_id: "20260211-153000"
title: "LLM Reliability in High-Stakes Domains"
created: "2026-02-11T15:30:00Z"
status: "drafting"
target_venue: "Conference paper"
target_length: "5000 words"
deadline: "2026-03-15"
tags:
  - "LLM-evaluation"
  - "human-AI-interaction"
  - "medical-AI"
source_papers:
  - "JZUBTJM9"
  - "ABC123"
related_notes:
  - "[[20260211-130500-llm-human-paradox]]"
  - "[[data/result-pattern-20260211-152000-benchmark-vs-reality-gap]]"
progress:
  - "[x] Collect source papers"
  - "[x] Review and extract key findings"
  - "[ ] Draft outline"
  - "[ ] Write first draft"
---

# LLM Reliability in High-Stakes Domains

## Project Overview

Synthesize findings from papers on LLM evaluation in medical and legal domains...
```

---

## Validation Tips

### YAML Syntax Rules

1. **Strings with special characters**: Use quotes
   ```yaml
   title: "Title: with colon"  # ✅ Correct
   title: Title: with colon    # ❌ Wrong
   ```

2. **Multi-line strings**: Use pipe `|`
   ```yaml
   abstract: |
     First line
     Second line
   ```

3. **Arrays**: Use `-` prefix
   ```yaml
   tags:
     - "tag1"
     - "tag2"
   ```

4. **Dates**: Use ISO 8601 format
   ```yaml
   created: "2026-02-11T14:30:00Z"  # ✅ Correct
   created: "2/11/2026"              # ❌ Wrong
   ```

5. **Booleans**: Use true/false (unquoted)
   ```yaml
   highlights_extracted: true  # ✅ Correct
   highlights_extracted: "true" # ❌ Wrong (string, not boolean)
   ```

### Common Errors

| Error | Fix |
|-------|-----|
| `mapping values are not allowed here` | Quote strings with colons |
| `could not find expected ':'` | Check indentation |
| `did not find expected key` | Use quotes for special characters |
| `expected <block end>` | Check multi-line string syntax |

### Validation Tools

- **VS Code YAML extension** (redhat.vscode-yaml): Real-time validation
- **yamllint**: Command-line YAML linter
- **Online validators**: https://www.yamllint.com/

---

## Related Documentation

- [directory-structure.md](directory-structure.md) - Where these files live
- [workflow-import.md](workflow-import.md) - Creating source files
- [workflow-extract.md](workflow-extract.md) - Creating highlights, figures, tables
- [workflow-notes.md](workflow-notes.md) - Creating atomic notes and data notes
- [templates-guide.md](templates-guide.md) - Using templates with these schemas
