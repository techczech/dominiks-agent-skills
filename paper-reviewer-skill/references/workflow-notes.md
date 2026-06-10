# Workflow: Creating Atomic Notes

Complete guide to creating atomic notes and data notes using Zettelkasten methodology.

## Overview

This workflow covers:

1. **Atomic notes** - Paper-specific insights (in `papers/{folder-name}/notes/`)
2. **Data notes** - Cross-cutting knowledge (in `data/`)
3. **Note linking** - Building knowledge graphs
4. **Note graph tracking** - Maintaining `index/note-graph.yaml`

---

## Zettelkasten Principles

Follow these principles for all notes:

1. **One idea per note** - Each note captures a single concept or insight
2. **Self-contained** - Readable without external context
3. **Linked** - Connected to sources and related notes via wikilinks
4. **Tagged** - Descriptive tags for discovery
5. **Titled** - Clear, descriptive title
6. **Timestamped** - Unique ID based on creation time (YYYYMMDD-HHMMSS)

### When to Create Notes

Create notes for:
- ✅ Key insights that emerge during review
- ✅ Contradictions between papers
- ✅ Patterns observed across multiple papers
- ✅ Methodological approaches worth tracking
- ✅ Open questions for future investigation
- ✅ Connections between disparate findings

Don't create notes for:
- ❌ Simple summaries (use extracts instead)
- ❌ Direct quotes (use highlights instead)
- ❌ Obvious facts (not worth capturing)

---

## Workflow 1: Creating Paper-Specific Atomic Notes

### Trigger

Insight or connection identified during review.

### Steps

#### 1. Identify the Insight

Ask yourself:
- What is the single idea/concept?
- Is it worth capturing as a note?
- Does it connect to other papers/notes?
- Is it an interpretation, not just a summary?

#### 2. Generate Note ID

**Format**: YYYYMMDD-HHMMSS

**Example**: `20260211-143000`

Use current timestamp (UTC recommended):
```bash
date -u +"%Y%m%d-%H%M%S"
# Output: 20260211-143000
```

#### 3. Create Slug from Title

**Steps**:
1. Think of a clear, descriptive title (2-6 words)
2. Convert to kebab-case
3. Keep it concise

**Examples**:

✅ **Good slugs**:
- `llm-human-interaction-paradox`
- `benchmark-vs-reality-gap`
- `ecological-validity-concern`

❌ **Bad slugs**:
- `note-about-the-paper` (too vague)
- `llms-perform-well-alone-but-fail-with-humans` (too long)
- `insight` (not descriptive)

#### 4. Look Up Paper Folder

From `index/papers.yaml`:
```yaml
papers:
  JZUBTJM9:
    folder_name: "bean-2026-llm-medical-assistants-JZUBTJM9"
```

#### 5. Write Note with YAML Header

**Location**: `papers/{folder-name}/notes/{timestamp}-{slug}.md`

**Example**: `papers/bean-2026-llm-medical-assistants-JZUBTJM9/notes/20260211-143000-llm-human-interaction-paradox.md`

**YAML frontmatter**:
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

## The Paradox

LLMs tested in isolation achieve 94.9% accuracy on medical scenario identification, but humans using the same LLMs achieve only 34.5% accuracy—no better than control groups without LLM assistance.

## Possible Explanations

1. **Interface design**: The interface may not effectively present LLM outputs
2. **Trust calibration**: Humans may over- or under-trust LLM suggestions
3. **Cognitive load**: Using LLM may add cognitive burden
4. **Task mismatch**: Lab scenarios may not match real-world LLM use

## Implications

This paradox suggests that LLM capability alone is insufficient for effective human-AI collaboration. The critical failure point is the interaction layer, not the model performance.

## Questions

- How would different interfaces change this dynamic?
- Would training improve human performance with LLMs?
- Is this pattern consistent across domains?

## Related Work

This connects to broader literature on human-automation interaction and skill degradation. See [[data/result-pattern-20260211-152000-benchmark-vs-reality-gap]] for cross-paper analysis.
```

#### 6. Update Note Graph

Add to `index/note-graph.yaml`:

```yaml
nodes:
  - id: "20260211-143000"
    type: "note"
    title: "LLM-Human Interaction Paradox"
    created: "2026-02-11T14:30:00Z"
    paper: "JZUBTJM9"

edges:
  - from: "20260211-143000"
    to: "bean-2026-llm-medical-assistants-JZUBTJM9/00-source"
    type: "references"
  - from: "20260211-143000"
    to: "bean-2026-llm-medical-assistants-JZUBTJM9/reviews/gelman-review"
    type: "extracted_from"
  - from: "20260211-143000"
    to: "20260210-120000"
    type: "related_to"
```

#### 7. Update Papers Index

Add to `index/papers.yaml`:

```yaml
papers:
  JZUBTJM9:
    # ... other fields ...
    notes:
      - id: "20260211-143000"
        file: "papers/bean-2026-llm-medical-assistants-JZUBTJM9/notes/20260211-143000-llm-human-interaction-paradox.md"
        title: "LLM-Human Interaction Paradox"
        created: "2026-02-11T14:30:00Z"
```

#### 8. Git Commit

```bash
git add papers/bean-2026-llm-medical-assistants-JZUBTJM9/notes/20260211-143000-llm-human-interaction-paradox.md
git add index/note-graph.yaml
git add index/papers.yaml
git commit -m "Add note: LLM-Human Interaction Paradox (bean-2026)"
```

---

## Workflow 2: Creating Cross-Cutting Data Notes

### When to Create Data Notes

Create data notes when you identify:
- **Methodological patterns** across papers
- **Datasets** used by multiple studies
- **Analytical approaches** worth tracking
- **Result patterns** that recur across research

### Data Note Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| `method` | Methodological approaches | RCT design, qualitative analysis, survey methods |
| `dataset` | Datasets used across papers | Benchmarks, evaluation sets, corpora |
| `analytical-approach` | Analysis techniques | Statistical tests, ML models, coding schemes |
| `result-pattern` | Recurring patterns in findings | Performance gaps, replication failures, trends |

### Steps

#### 1. Identify Cross-Cutting Insight

Ask yourself:
- Does this insight span multiple papers?
- Is it a pattern, not just a single finding?
- Would future papers benefit from this note?

#### 2. Determine Data Category

Choose one:
- `method` - Methodological approach
- `dataset` - Dataset or benchmark
- `analytical-approach` - Analysis technique
- `result-pattern` - Recurring pattern in results

#### 3. Generate Note ID

**Format**: YYYYMMDD-HHMMSS

**Example**: `20260211-143000`

#### 4. Create Slug from Title

**Examples**:
- `randomized-controlled-trial` (method)
- `medical-scenarios-benchmark` (dataset)
- `precision-recall-analysis` (analytical-approach)
- `benchmark-vs-reality-gap` (result-pattern)

#### 5. Generate Filename

**Format**: `{category}-{timestamp}-{slug}.md`

**Examples**:
- `method-20260211-143000-randomized-controlled-trial.md`
- `dataset-20260211-150000-medical-scenarios-benchmark.md`
- `result-pattern-20260211-152000-benchmark-vs-reality-gap.md`

#### 6. Write Data Note

**Location**: `data/{category}-{timestamp}-{slug}.md`

**Example**: `data/result-pattern-20260211-152000-benchmark-vs-reality-gap.md`

**YAML frontmatter**:
```yaml
---
type: data_note
data_category: "result-pattern"
id: "20260211-152000"
title: "Benchmark vs. Reality Gap"
created: "2026-02-11T15:20:00Z"
tags:
  - "evaluation"
  - "ecological-validity"
  - "performance-gap"
related_papers:
  - "JZUBTJM9"
  - "ABC123"
  - "XYZ789"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
  - "[[smith-2025-legal-reasoning-ABC123/00-source]]"
  - "[[data/method-20260211-143000-randomized-controlled-trial]]"
---

# Benchmark vs. Reality Gap

## Pattern Description

A recurring pattern in LLM evaluation research: models perform well on benchmark tasks but fail to deliver benefits in real-world usage scenarios.

## Observed Instances

### Bean et al. (2026) - Medical Domain
- **Benchmark**: LLMs achieve 94.9% accuracy in isolation
- **Reality**: Humans with LLMs achieve 34.5% accuracy
- **Gap**: 60.4 percentage points

### Smith et al. (2025) - Legal Domain
- **Benchmark**: 87% accuracy on legal reasoning tasks
- **Reality**: 52% accuracy in lawyer-LLM collaboration
- **Gap**: 35 percentage points

### [Future papers...]

## Possible Explanations

1. **Interface mismatches**: Benchmarks don't test real interfaces
2. **Task differences**: Lab tasks ≠ real tasks
3. **Human factors**: Benchmarks ignore human-AI interaction
4. **Ecological validity**: Controlled settings lack real-world complexity

## Implications for Research

- Benchmarks alone are insufficient for LLM evaluation
- Need human-in-the-loop evaluation frameworks
- Importance of ecological validity in study design

## Related Concepts

- [[data/method-20260211-143000-randomized-controlled-trial]] - How to test this rigorously
- [[data/analytical-approach-20260211-151000-precision-recall-analysis]] - Better metrics?

## Open Questions

- How large must the gap be to matter?
- Are some domains more susceptible than others?
- Can training close the gap?
```

#### 7. Update Note Graph

```yaml
nodes:
  - id: "result-pattern-20260211-152000"
    type: "data_note"
    data_category: "result-pattern"
    title: "Benchmark vs. Reality Gap"
    created: "2026-02-11T15:20:00Z"

edges:
  - from: "result-pattern-20260211-152000"
    to: "bean-2026-llm-medical-assistants-JZUBTJM9/00-source"
    type: "references"
  - from: "result-pattern-20260211-152000"
    to: "smith-2025-legal-reasoning-ABC123/00-source"
    type: "references"
  - from: "result-pattern-20260211-152000"
    to: "method-20260211-143000"
    type: "related_to"
```

#### 8. Update Papers Index

Add data note reference to ALL related papers:

```yaml
papers:
  JZUBTJM9:
    # ... other fields ...
    data_notes:
      - "result-pattern-20260211-152000"

  ABC123:
    # ... other fields ...
    data_notes:
      - "result-pattern-20260211-152000"
```

#### 9. Git Commit

```bash
git add data/result-pattern-20260211-152000-benchmark-vs-reality-gap.md
git add index/note-graph.yaml
git add index/papers.yaml
git commit -m "Add data note: Benchmark vs. Reality Gap (cross-paper pattern)"
```

---

## Note Linking Best Practices

### Types of Links

1. **Source links**: Note → Paper
   ```markdown
   - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
   ```

2. **Review links**: Note → Review
   ```markdown
   - "[[bean-2026-llm-medical-assistants-JZUBTJM9/reviews/gelman-review]]"
   ```

3. **Highlight links**: Note → Highlight
   ```markdown
   - "[[bean-2026-llm-medical-assistants-JZUBTJM9/highlights/002-red-result]]"
   ```

4. **Note-to-note links**: Note → Note
   ```markdown
   - "[[20260211-143000-llm-human-paradox]]"
   ```

5. **Data note links**: Note → Data Note
   ```markdown
   - "[[data/result-pattern-20260211-152000-benchmark-vs-reality-gap]]"
   ```

### Bidirectional Linking

When creating links, consider creating bidirectional connections:

**Example**:
- Note A links to Note B
- Update Note B to link back to Note A

This creates a stronger knowledge graph.

### Link Contexts

Provide context for links:

```markdown
## Related

This paradox is an instance of the broader [[data/result-pattern-20260211-152000-benchmark-vs-reality-gap]] pattern observed across multiple domains.

See also [[20260210-120000-benchmark-reliability]] for a discussion of benchmark limitations.
```

---

## Note Quality Standards

### All Notes Must Include

1. ✅ Complete YAML frontmatter with all required fields
2. ✅ Clear, descriptive title
3. ✅ Self-contained content (readable without external context)
4. ✅ Links to source papers
5. ✅ Descriptive tags
6. ✅ Unique timestamp-based ID

### Paper-Specific Notes Should

- ✅ Focus on interpretation, not just summary
- ✅ Connect to related papers and notes
- ✅ Raise questions for future investigation
- ✅ Be concise (300-800 words)

### Data Notes Should

- ✅ Span multiple papers
- ✅ Identify patterns or approaches
- ✅ Link to all relevant papers
- ✅ Provide examples from each paper
- ✅ Include implications section
- ✅ Raise open questions

---

## Note Discovery

### Finding Notes by Tag

```bash
Grep pattern="tags:.*paradox" path="papers/" output_mode="files_with_matches"
```

### Finding Notes by Paper

```bash
ls papers/bean-2026-llm-medical-assistants-JZUBTJM9/notes/
```

### Finding Related Notes

Check `index/note-graph.yaml` for connections:

```yaml
edges:
  - from: "20260211-143000"
    to: "20260210-120000"
    type: "related_to"
```

### Using Foam Graph

Open Foam graph visualization:
- **Ctrl+Shift+P** → "Foam: Show Graph"
- See note connections visually
- Identify knowledge clusters
- Find hub nodes (highly connected notes)

---

## Data Note vs. Paper Note Decision Tree

**Is this insight specific to ONE paper?**
- → Yes: Create paper-specific note in `papers/{folder-name}/notes/`

**Does this insight span MULTIPLE papers?**
- → Yes: Create data note in `data/`

**Is it a methodological approach?**
- → Yes: Category = `method`

**Is it a dataset or benchmark?**
- → Yes: Category = `dataset`

**Is it an analytical technique?**
- → Yes: Category = `analytical-approach`

**Is it a recurring pattern in results?**
- → Yes: Category = `result-pattern`

---

## Troubleshooting

### Problem: Note too long

**Solution**: Split into multiple notes. Each note should capture ONE idea.

### Problem: Can't decide if paper note or data note

**Solution**: Start with paper note. If you reference it from multiple papers, promote to data note.

### Problem: Too many tags

**Solution**: Use 3-5 descriptive tags maximum. More tags = harder to find.

### Problem: Links not working

**Solution**: Verify full paths. Use `[[folder/file]]` format, not relative paths.

---

## Related Documentation

- [workflow-writing.md](workflow-writing.md) - Using notes in writing projects
- [directory-structure.md](directory-structure.md) - Where notes live
- [yaml-schemas.md](yaml-schemas.md) - Note YAML specifications
- [best-practices.md](best-practices.md) - Quality standards
