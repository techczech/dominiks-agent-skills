# Workflow: Managing Writing Projects

Complete guide to creating synthesis writing projects that combine insights from multiple papers.

## Overview

Writing projects synthesize findings from multiple papers into:
- Conference/journal papers
- Blog posts
- Reports
- Review articles
- Grant proposals

---

## Writing Project Structure

```
writing/{project-slug}/
├── README.md               # Project overview + metadata
├── drafts/                 # Iterative drafts
│   ├── outline-v1.md
│   ├── outline-v2.md
│   ├── draft-v1.md
│   ├── draft-v2.md
│   └── ...
├── sources/                # Links and references
│   ├── paper-links.md      # Wikilinks to source papers
│   ├── notes-links.md      # Wikilinks to relevant notes
│   └── data-links.md       # Wikilinks to data notes
└── final/
    └── final-version.md    # Final version
```

---

## Workflow: Creating a Writing Project

### Trigger

User requests: "Start a writing project on LLM reliability in medical domains"

### Steps

#### 1. Generate Project Slug

From title: "LLM Reliability in High-Stakes Domains"

**Steps**:
1. Extract keywords: "LLM", "reliability", "high-stakes"
2. Create kebab-case: `llm-reliability-high-stakes`
3. Keep it concise (2-5 words)

#### 2. Generate Project ID

**Format**: YYYYMMDD-HHMMSS

**Example**: `20260211-153000`

#### 3. Create Project Structure

```bash
mkdir -p writing/llm-reliability-high-stakes/{drafts,sources,final}
```

#### 4. Create Project README.md

**Location**: `writing/llm-reliability-high-stakes/README.md`

```yaml
---
type: writing_project
project_id: "20260211-153000"
title: "LLM Reliability in High-Stakes Domains"
created: "2026-02-11T15:30:00Z"
status: "planning"
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
  - "[ ] Revise based on feedback"
  - "[ ] Finalize"
---

# LLM Reliability in High-Stakes Domains

## Project Overview

Synthesize findings from papers on LLM evaluation in medical and legal domains to argue for human-in-the-loop evaluation benchmarks.

## Key Arguments

1. Benchmark-reality gap exists across domains
2. Human-LLM interaction is critical failure point
3. Need new evaluation frameworks that include human factors

## Source Papers

### Medical Domain
- [[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]] - Medical chatbot RCT
- Key finding: 94.9% LLM-alone accuracy vs. 34.5% human-with-LLM

### Legal Domain
- [[smith-2025-legal-reasoning-ABC123/00-source]] - Legal reasoning evaluation
- Key finding: Similar performance degradation pattern

## Relevant Notes

- [[20260211-130500-llm-human-paradox]] - Core paradox insight
- [[data/result-pattern-20260211-152000-benchmark-vs-reality-gap]] - Cross-paper pattern

## Status

**Current phase**: Planning

**Next steps**:
1. Draft outline with section structure
2. Map findings to arguments
3. Identify gaps in evidence

## Timeline

- **2026-02-15**: Outline complete
- **2026-02-28**: First draft complete
- **2026-03-10**: Revisions complete
- **2026-03-15**: Final version ready
```

#### 5. Create Source Links

**Location**: `writing/llm-reliability-high-stakes/sources/paper-links.md`

```markdown
# Source Papers

## Medical Domain

### Bean et al. (2026) - Medical Chatbots
- **Source**: [[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]
- **Review**: [[bean-2026-llm-medical-assistants-JZUBTJM9/reviews/gelman-review]]
- **Key findings**:
  - LLM-alone: 94.9% accuracy
  - Human-with-LLM: 34.5% accuracy
  - N=1,298 RCT
- **Use in paper**: Main example of medical domain performance gap

## Legal Domain

### Smith et al. (2025) - Legal Reasoning
- **Source**: [[smith-2025-legal-reasoning-ABC123/00-source]]
- **Review**: [[smith-2025-legal-reasoning-ABC123/reviews/critical-review]]
- **Key findings**:
  - Similar pattern in legal domain
- **Use in paper**: Cross-domain evidence

## Additional Sources

[More papers...]
```

**Location**: `writing/llm-reliability-high-stakes/sources/notes-links.md`

```markdown
# Relevant Notes

## Core Insights

- [[20260211-130500-llm-human-paradox]] - The central paradox
- [[20260212-100000-interface-design-failure]] - Interface as failure point

## Cross-Cutting Patterns

- [[data/result-pattern-20260211-152000-benchmark-vs-reality-gap]] - Benchmark vs. reality gap
- [[data/method-20260211-143000-randomized-controlled-trial]] - RCT methodology

## Questions

- [[20260213-120000-trust-calibration]] - How do users calibrate trust?
```

#### 6. Git Commit

```bash
git add writing/llm-reliability-high-stakes/
git commit -m "Start writing project: LLM Reliability in High-Stakes Domains"
```

---

## Workflow: Drafting and Iteration

### Phase 1: Outline

#### 1. Create Outline

**Location**: `writing/llm-reliability-high-stakes/drafts/outline-v1.md`

```markdown
# LLM Reliability in High-Stakes Domains - Outline v1

## 1. Introduction (500 words)
- Problem: LLMs being deployed in high-stakes domains
- Gap: Evaluation focuses on model performance, not human-AI interaction
- Thesis: Benchmark-reality gap requires new evaluation frameworks

## 2. Background (800 words)
### 2.1 LLM Evaluation Landscape
- Traditional benchmarks
- Focus on model capabilities

### 2.2 Human-AI Interaction
- History of automation issues
- Skill degradation literature

## 3. Evidence from Medical Domain (1200 words)
### 3.1 Bean et al. (2026) Study
- **Source**: [[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]
- Study design: RCT with N=1,298
- Finding: 94.9% LLM-alone vs. 34.5% human-with-LLM
- **Analysis**: [[20260211-130500-llm-human-paradox]]

### 3.2 Implications
- Interface design matters
- Trust calibration issues

## 4. Evidence from Legal Domain (1000 words)
[Similar structure...]

## 5. Cross-Domain Analysis (800 words)
### 5.1 Benchmark vs. Reality Gap Pattern
- **Source**: [[data/result-pattern-20260211-152000-benchmark-vs-reality-gap]]
- Consistency across domains
- Magnitude of gaps

### 5.2 Theoretical Explanation
[Synthesis...]

## 6. Proposed Framework (1200 words)
[New evaluation approach...]

## 7. Discussion (500 words)
[Limitations, future work...]

## 8. Conclusion (200 words)
[Summary and implications...]
```

#### 2. Update Progress

Edit `README.md`:
```yaml
progress:
  - "[x] Collect source papers"
  - "[x] Review and extract key findings"
  - "[x] Draft outline"
  - "[ ] Write first draft"
```

#### 3. Git Commit

```bash
git add writing/llm-reliability-high-stakes/drafts/outline-v1.md
git add writing/llm-reliability-high-stakes/README.md
git commit -m "Add outline v1 for LLM reliability project"
```

### Phase 2: First Draft

#### 1. Write Draft

**Location**: `writing/llm-reliability-high-stakes/drafts/draft-v1.md`

```markdown
---
type: writing_draft
project_id: "20260211-153000"
draft_version: "v1"
created: "2026-02-15T10:00:00Z"
word_count: 4850
status: "draft"
---

# LLM Reliability in High-Stakes Domains

## Introduction

[Draft content with inline wikilinks to source papers and notes...]

Recent advances in large language models (LLMs) have led to their deployment in high-stakes domains such as medicine [[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]] and law [[smith-2025-legal-reasoning-ABC123/00-source]]...
```

#### 2. Update Progress

```yaml
progress:
  - "[x] Collect source papers"
  - "[x] Review and extract key findings"
  - "[x] Draft outline"
  - "[x] Write first draft"
  - "[ ] Revise based on feedback"
```

#### 3. Git Commit

```bash
git add writing/llm-reliability-high-stakes/drafts/draft-v1.md
git add writing/llm-reliability-high-stakes/README.md
git commit -m "Complete first draft of LLM reliability project (4850 words)"
```

### Phase 3: Revision

#### 1. Create Revision

**Location**: `writing/llm-reliability-high-stakes/drafts/draft-v2.md`

Include revision notes:
```markdown
---
type: writing_draft
project_id: "20260211-153000"
draft_version: "v2"
created: "2026-02-20T14:00:00Z"
word_count: 5020
status: "revision"
changes_from_v1: |
  - Strengthened introduction with clearer thesis
  - Added more detail to legal domain section
  - Tightened discussion section
  - Fixed citation formatting
---

# LLM Reliability in High-Stakes Domains

[Revised content...]
```

#### 2. Git Commit

```bash
git add writing/llm-reliability-high-stakes/drafts/draft-v2.md
git commit -m "Revise draft: strengthen intro, expand legal section"
```

### Phase 4: Finalization

#### 1. Create Final Version

**Location**: `writing/llm-reliability-high-stakes/final/final-version.md`

```markdown
---
type: writing_final
project_id: "20260211-153000"
title: "LLM Reliability in High-Stakes Domains: Evidence for Human-in-the-Loop Evaluation"
completed: "2026-03-15T16:00:00Z"
word_count: 5000
target_venue: "CHI 2026"
status: "final"
---

# LLM Reliability in High-Stakes Domains: Evidence for Human-in-the-Loop Evaluation

[Final polished content...]
```

#### 2. Update Project Status

Edit `README.md`:
```yaml
status: "final"
progress:
  - "[x] Collect source papers"
  - "[x] Review and extract key findings"
  - "[x] Draft outline"
  - "[x] Write first draft"
  - "[x] Revise based on feedback"
  - "[x] Finalize"
completed: "2026-03-15"
```

#### 3. Git Commit

```bash
git add writing/llm-reliability-high-stakes/final/final-version.md
git add writing/llm-reliability-high-stakes/README.md
git commit -m "Finalize LLM reliability project (5000 words, ready for CHI 2026)"
```

---

## Project Status Values

| Status | Meaning | Typical Duration |
|--------|---------|------------------|
| `planning` | Collecting sources, initial thinking | 1-2 weeks |
| `outlining` | Drafting outline, organizing arguments | 3-5 days |
| `drafting` | Writing first draft | 1-2 weeks |
| `revising` | Revising based on feedback | 1 week |
| `final` | Completed, ready for submission | - |
| `on_hold` | Paused, not actively working | Variable |

---

## Best Practices

### Link Generously

```markdown
- Link to [[source papers]]
- Link to [[reviews]]
- Link to [[atomic notes]]
- Link to [[data notes]]
```

This creates a clear evidence trail.

### Track Progress

Update `progress:` checklist regularly in README.md.

### Version Control

- **Outline**: `outline-v1.md`, `outline-v2.md`
- **Drafts**: `draft-v1.md`, `draft-v2.md`, `draft-v3.md`
- **Final**: `final-version.md`

Git tracks all versions - commit after each significant revision.

### Include Metadata

Every draft should have:
- `draft_version`
- `word_count`
- `status`
- `changes_from_v*` (for revisions)

### Organize Sources

Separate files for:
- `sources/paper-links.md` - Source papers
- `sources/notes-links.md` - Atomic notes
- `sources/data-links.md` - Data notes

### Set Milestones

Include concrete dates in README.md:
```yaml
timeline:
  - "2026-02-15: Outline complete"
  - "2026-02-28: First draft"
  - "2026-03-15: Final version"
```

---

## Troubleshooting

### Problem: Too many source papers

**Solution**: Create `sources/paper-links.md` and organize by theme or argument. Don't list all papers in README.md.

### Problem: Draft getting too long

**Solution**: Check target length. Consider splitting into multiple papers or cutting tangential sections.

### Problem: Can't find relevant notes

**Solution**: Use Foam graph to discover connections. Or use Grep to search for keywords across notes.

### Problem: Lost track of revisions

**Solution**: Use git log to see revision history:
```bash
git log writing/llm-reliability-high-stakes/drafts/
```

---

## Related Documentation

- [workflow-notes.md](workflow-notes.md) - Creating notes to synthesize
- [directory-structure.md](directory-structure.md) - Writing project structure
- [yaml-schemas.md](yaml-schemas.md#writing-projects) - Writing project schema
- [best-practices.md](best-practices.md) - Quality standards
