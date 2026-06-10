# Directory Structure

Complete organization of the academic paper review repository.

## Overview

```
paper-reviews/
├── skill/                           # ⭐ SKILL LIVES HERE (transparent, visible)
│   ├── SKILL.md                     # Main skill file
│   ├── references/                  # Workflow documentation (this folder)
│   ├── scripts@ → ../scripts/       # Symlink to extraction scripts
│   └── templates@ → ../templates/   # Symlink to templates
│
├── .claude/skills/academic-paper-review@ → ../../skill/      # Claude Code discovery
├── .antigravity/skills/academic-paper-review@ → ../../skill/ # Antigravity discovery
├── .gemini/skills/academic-paper-review@ → ../../skill/      # Gemini discovery
├── .codex/skills/academic-paper-review@ → ../../skill/       # Codex discovery
│
├── source-files/                    # Pristine Zotero imports
│   ├── {collection-name}/           # Papers organized by collection
│   │   ├── {zotero_key}-*.md       # Paper metadata + abstract
│   │   └── {zotero_key}-*.pdf      # PDF files
│   └── {zotero_key}-*.md            # Individual imports
│   └── {zotero_key}-*.pdf
│
├── papers/                  # Analysis workspace
│   └── {author}-{year}-{title-short}-{zotero_key}/
│       ├── 00-source.md            # Metadata + abstract (NO PDF)
│       ├── highlights/             # Each highlight as atomic file
│       │   ├── 001-yellow-main-finding.md
│       │   ├── 002-red-critical-result.md
│       │   └── ...
│       ├── figures/                # Figures and tables with metadata
│       │   ├── figure-01.json      # Semantic description
│       │   ├── figure-01.png       # Image file
│       │   ├── table-01.json       # Table metadata
│       │   ├── table-01.csv        # Data file
│       │   └── ...
│       ├── additional-sources/     # Datasets, code, supplements
│       │   ├── dataset-01.csv
│       │   ├── methods-code.py
│       │   └── ...
│       ├── reviews/                # Multi-style reviews
│       │   ├── quick-read.md
│       │   ├── gelman-review.md
│       │   ├── methods-deep-dive.md
│       │   └── ...
│       ├── extracts/               # Direct content from paper
│       │   ├── methods.md
│       │   ├── summary-card.md
│       │   └── ...
│       └── notes/                  # Paper-specific atomic notes
│           ├── 20260211-130500-llm-human-paradox.md
│           └── ...
│
├── data/                            # Cross-cutting atomic notes
│   ├── method-20260211-143000-randomized-controlled-trial.md
│   ├── dataset-20260211-150000-medical-scenarios-benchmark.md
│   ├── analytical-approach-20260211-151000-precision-recall.md
│   ├── result-pattern-20260211-152000-benchmark-vs-reality-gap.md
│   └── ...
│   # Flat structure with category prefix in filename
│
├── writing/                         # Writing projects
│   └── {project-name}/
│       ├── README.md               # Project overview + metadata
│       ├── drafts/
│       │   ├── outline-v1.md
│       │   ├── draft-v1.md
│       │   └── ...
│       ├── sources/                # Links to papers
│       │   └── paper-links.md
│       └── final/
│           └── final-version.md
│
├── index/                           # Tracking and metadata
│   ├── papers.yaml                 # Master list of all papers
│   ├── note-graph.yaml             # Note connections
│   ├── by-topic.md                 # Papers by topic/tags
│   ├── by-review-type.md           # Papers by review type
│   ├── reading-queue.md            # Reading priorities
│   └── collections/                # Collection-level indexes
│
├── scripts/                         # Extraction automation
│   ├── extract-paper.sh            # Main orchestrator
│   ├── pdf-to-markdown.sh          # Full text extraction
│   ├── extract-figures.sh          # Figure extraction
│   ├── extract-tables.sh           # Table extraction
│   └── ...
│
├── templates/                       # File templates
│   ├── _yaml-schema.md             # YAML specifications
│   ├── gelman-review.md            # Review templates
│   ├── quick-read.md
│   ├── methods-deep-dive.md
│   ├── critical-review.md
│   ├── summary-card.md
│   ├── highlight.md                # Content templates
│   ├── figure.md
│   ├── table.md
│   ├── data-note.md
│   └── writing-project.md
│
├── changelog/                       # Session history entries
├── CHANGELOG.md                     # Master changelog
├── CLAUDE.md                        # Points to skill/SKILL.md
└── README.md                        # Project overview
```

## Key Organizational Principles

### 1. Separation of Concerns

- **source-files/**: Pristine Zotero imports, never modified
- **papers/**: Working space for analysis, reviews, notes
- **data/**: Cross-cutting knowledge that spans papers
- **writing/**: Synthesis projects
- **index/**: Metadata and tracking
- **skill/**: Workflow documentation and tools (transparent!)

### 2. Semantic Naming

All folders use human-readable names:
- `{author}-{year}-{title-short}-{zotero_key}`
- Example: `bean-2026-llm-medical-assistants-JZUBTJM9`

This enables:
- Context-free file identification
- Easy browsing and discovery
- Clear wikilinks: `[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]`

### 3. Atomic Elements

Each element gets its own file:
- **Highlights**: One file per highlight (e.g., `001-yellow-main-finding.md`)
- **Figures**: Image + JSON metadata (e.g., `figure-01.png` + `figure-01.json`)
- **Tables**: CSV + JSON metadata (e.g., `table-01.csv` + `table-01.json`)
- **Notes**: One idea per file (e.g., `20260211-130500-insight-title.md`)

### 4. Single Source of Truth

- **PDFs**: Stored ONLY in `source-files/`, never duplicated
- **Scripts**: Single copy in `scripts/`, symlinked from `skill/scripts@`
- **Templates**: Single copy in `templates/`, symlinked from `skill/templates@`
- **Skill**: Single copy in `skill/`, discovered via agent symlinks

### 5. Git-Friendly

- Symlinks committed to document architecture
- Binary files (.pdf) in dedicated folder (optional .gitignore)
- Markdown everywhere for diff-friendly tracking
- Clear commit boundaries (one operation = one commit)

## Folder Details

### source-files/

**Purpose**: Pristine Zotero imports, never modified after import

**Contents**:
- Markdown files with YAML frontmatter (metadata + abstract + highlights)
- PDF attachments
- Supplementary materials
- Organized by collection or flat

**Rules**:
- ❌ Never edit files here
- ❌ Never delete files here
- ✅ Copy to papers/ for work
- ✅ Keep as reference source

### papers/

**Purpose**: Working space for analysis, reviews, notes

**Structure**: One folder per paper

**Contents**:
- `00-source.md`: Metadata + abstract (no highlights, no PDF)
- `highlights/`: Atomic highlight files with YAML
- `figures/`: Images + metadata (JSON)
- `additional-sources/`: Datasets, code, supplements
- `reviews/`: Multi-style review files
- `extracts/`: Direct content extractions
- `notes/`: Paper-specific atomic notes

**Rules**:
- ✅ Edit and refine freely
- ✅ Create new atomic elements
- ✅ Link to related papers and notes
- ❌ Don't store PDFs here (reference source-files/)

### data/

**Purpose**: Cross-cutting knowledge that spans multiple papers

**Structure**: Flat (no subfolders)

**Naming**: `{category}-{timestamp}-{slug}.md`
- Categories: method, dataset, analytical-approach, result-pattern
- Timestamp: YYYYMMDD-HHMMSS
- Example: `method-20260211-143000-randomized-controlled-trial.md`

**When to create data notes**:
- Methodological patterns across papers
- Datasets used by multiple studies
- Analytical approaches worth tracking
- Result patterns that recur

**Rules**:
- ✅ One concept per file
- ✅ Link to all related papers
- ✅ Self-contained and descriptive
- ✅ Tag with cross-cutting themes

### writing/

**Purpose**: Synthesis projects that combine insights from multiple papers

**Structure**: One folder per project

**Contents**:
- `README.md`: Project overview + metadata
- `drafts/`: Iterative drafts
- `sources/`: Links to source papers and notes
- `final/`: Final versions

**Rules**:
- ✅ Link generously to source papers and notes
- ✅ Track status (planning, drafting, revising, final)
- ✅ Include target venue and deadline
- ✅ Commit iteratively as drafts evolve

### index/

**Purpose**: Global tracking and metadata

**Files**:
- `papers.yaml`: Master list (single source of truth)
- `note-graph.yaml`: Note connections for visualization
- `by-topic.md`: Papers organized by tags/topics
- `by-review-type.md`: Papers organized by review types
- `reading-queue.md`: Reading priorities
- `collections/`: Collection-level overviews

**Rules**:
- ✅ Update after every paper operation
- ✅ Keep papers.yaml synchronized
- ✅ Use wikilinks for Foam graph visualization
- ✅ Commit with related operations

### skill/

**Purpose**: Workflow documentation and tools (transparent!)

**Why in root**:
- ✅ Visible to anyone browsing repo
- ✅ Accessible to all agents/tools
- ✅ Self-documenting project architecture
- ✅ Evolves with project as "project memory"

**Contents**:
- `SKILL.md`: Main skill file
- `references/`: Workflow documentation (this folder!)
- `scripts@`: Symlink to ../scripts/
- `templates@`: Symlink to ../templates/

**Discovery**: Agent-specific symlinks point here
- `.claude/skills/academic-paper-review@` → `../../skill/`
- `.antigravity/skills/academic-paper-review@` → `../../skill/`
- (etc.)

## Navigation Tips

### Finding a paper
```bash
# By folder name (human-readable browsing)
ls papers/

# By zotero_key (lookup)
grep "JZUBTJM9" index/papers.yaml

# By topic
Read index/by-topic.md
```

### Finding related content
```bash
# All highlights for a paper
ls papers/bean-2026-llm-medical-assistants-JZUBTJM9/highlights/

# All reviews for a paper
ls papers/bean-2026-llm-medical-assistants-JZUBTJM9/reviews/

# Cross-cutting method notes
ls data/method-*.md
```

### Following connections
```bash
# Check note graph
Read index/note-graph.yaml

# Use Foam graph visualization
# Ctrl+Shift+P → "Foam: Show Graph"
```

## Migration from Old Structure

If you have an existing `papers/` or `articles/` folder:

1. Rename `articles/` → `source-files/`
2. Create new `papers/` structure
3. Copy 00-source files (without PDFs)
4. Extract highlights to separate files
5. Move reviews, extracts, notes to new structure
6. Update index/papers.yaml
7. Archive old folders or delete after verification

See [best-practices.md](best-practices.md) for detailed migration guide.

---

## Related Documentation

- [setup-architecture.md](setup-architecture.md) - Why skill is in root folder
- [yaml-schemas.md](yaml-schemas.md) - Complete YAML specifications
- [workflow-import.md](workflow-import.md) - Paper import process
- [best-practices.md](best-practices.md) - Quality standards and tips
