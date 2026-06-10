# Workflow: Conducting Paper Reviews

Complete guide to reviewing academic papers using multiple analytical styles.

## Overview

This repository supports four review styles:

1. **Gelman Review** - Critical statistical/methodological analysis
2. **Quick Read** - Fast triage overview
3. **Methods Deep Dive** - Detailed methodological analysis
4. **Critical Review** - Peer-review style assessment

Each style serves different purposes and contexts.

---

## Review Workflow

### Trigger

User requests a review (e.g., "Review this paper with Gelman-style critique").

### Steps

#### 1. Identify the Paper

User may provide:
- Title
- Author name
- Zotero key
- "This paper" (if context is clear)

Look up in `index/papers.yaml` to get `folder_name`:

```yaml
papers:
  JZUBTJM9:
    folder_name: "bean-2026-llm-medical-assistants-JZUBTJM9"
```

#### 2. Read Source Material

```bash
# Read metadata and abstract
Read papers/bean-2026-llm-medical-assistants-JZUBTJM9/00-source.md

# Read PDF if needed for figures/tables/full text
Read source-files/JZUBTJM9-*.pdf

# Check for existing extracts
ls papers/bean-2026-llm-medical-assistants-JZUBTJM9/extracts/

# Check highlights if extracted
ls papers/bean-2026-llm-medical-assistants-JZUBTJM9/highlights/
```

#### 3. Check Existing Reviews

```bash
ls papers/bean-2026-llm-medical-assistants-JZUBTJM9/reviews/
```

**If review exists**:
- Read existing review
- Ask user if they want to:
  - Update existing review
  - Create new version (append `-v2`, `-v3`)
  - Create different style

**Avoid duplicating** the same review style.

#### 4. Load Appropriate Template

```bash
Read templates/{review-style}.md
```

Available templates:
- `gelman-review.md` - Critical methodological analysis
- `quick-read.md` - Fast triage
- `methods-deep-dive.md` - Detailed methods analysis
- `critical-review.md` - Peer-review style

#### 5. Conduct Review

Follow template structure:

**Use YAML header from template**:
```yaml
---
type: review
review_style: "gelman-review"
paper_key: "JZUBTJM9"
paper_title: "Full paper title"
reviewed_date: "2026-02-11"
reviewer: "Claude Sonnet 4.5"
status: "completed"
rating: 7
strengths:
  - "Strength 1"
  - "Strength 2"
weaknesses:
  - "Weakness 1"
  - "Weakness 2"
tags:
  - "RCT"
  - "methodological-critique"
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
---
```

**Fill in all required fields**:
- `paper_key` - Zotero key
- `reviewed_date` - ISO date (YYYY-MM-DD)
- `reviewer` - Your name or "Claude Sonnet 4.5"
- `status` - draft | in_progress | completed
- `rating` - Optional 1-10 scale

**Add appropriate tags**:
- Research design (RCT, observational, qualitative, etc.)
- Domain (medical-AI, legal-AI, education, etc.)
- Critique type (methodological-critique, statistical-issues, etc.)

**Link to source paper**:
```markdown
- "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
```

**Follow section structure from template** - Don't skip sections, adapt them to the paper.

#### 6. Write Review File

```bash
Write papers/bean-2026-llm-medical-assistants-JZUBTJM9/reviews/gelman-review.md
```

**Naming convention**:
- `gelman-review.md` - Gelman-style critique
- `quick-read.md` - Quick triage
- `methods-deep-dive.md` - Detailed methods
- `critical-review.md` - Peer-review style
- `{style}-v2.md` - Second version of same style

#### 7. Update Tracking

Update `index/papers.yaml`:

```yaml
papers:
  JZUBTJM9:
    # ... other fields ...
    reviews:
      - type: "gelman-review"
        file: "papers/bean-2026-llm-medical-assistants-JZUBTJM9/reviews/gelman-review.md"
        date: "2026-02-11"
        rating: 7
        status: "completed"
```

#### 8. Git Commit (REQUIRED)

```bash
git add papers/bean-2026-llm-medical-assistants-JZUBTJM9/reviews/gelman-review.md
git add index/papers.yaml
git commit -m "Add gelman-review for Reliability of LLMs as medical assistants (Bean et al., 2026)"
```

**IMPORTANT**: ALWAYS commit immediately after completing a review. Each review should be its own commit.

---

## Review Style Selection Guide

### When to Use Gelman Review

**Best for**:
- ✅ RCTs and experimental studies
- ✅ Papers with complex statistical analyses
- ✅ Claims requiring methodological scrutiny
- ✅ When deep design critique is needed

**Characteristics**:
- Skeptical, constructive tone
- Focus on experimental design and statistics
- "What I Would Have Done" section
- 2000-4000 words

**Example papers**:
- RCTs with causal claims
- Papers using advanced statistical methods
- Studies with design limitations

### When to Use Quick Read

**Best for**:
- ✅ Initial paper triage
- ✅ Building reading queue priorities
- ✅ Quick context before deep review
- ✅ Time-constrained overviews

**Characteristics**:
- Fast, decisive assessment
- Informal, personal tone
- Bullet points and brevity
- 300-500 words

**Example papers**:
- Any paper for initial assessment
- Papers you may not read deeply

### When to Use Methods Deep Dive

**Best for**:
- ✅ Novel methodologies
- ✅ Replication planning
- ✅ Methods learning
- ✅ Reproducibility assessment

**Characteristics**:
- Technical, thorough
- Focus on reproducibility
- Detailed procedures
- 1500-3000 words

**Example papers**:
- Papers introducing new methods
- Studies you want to replicate
- Methods you want to learn

### When to Use Critical Review

**Best for**:
- ✅ Formal review practice
- ✅ Controversial claims
- ✅ High-impact papers
- ✅ Contribution assessment

**Characteristics**:
- Professional, balanced tone
- Claim-evidence evaluation
- Rating/verdict
- 2000-3000 words

**Example papers**:
- High-profile publications
- Papers with bold claims
- Work you're considering citing

---

## Review Quality Standards

### All Reviews Must Include

1. ✅ Complete YAML frontmatter with all required fields
2. ✅ Clear summary of what the paper did
3. ✅ Assessment of key findings
4. ✅ Critical analysis appropriate to review style
5. ✅ Personal evaluation/take
6. ✅ Proper citations and wikilinks
7. ✅ Descriptive tags for categorization

### Gelman Review Specifics

- ✅ Must include "What I Would Have Done Differently" section
- ✅ Must question assumptions explicitly
- ✅ Must suggest concrete alternatives
- ✅ Must be skeptical but constructive
- ✅ Must acknowledge genuine strengths

### Quick Read Specifics

- ✅ Must be under 500 words
- ✅ Must include "Should I Read More Deeply?" decision
- ✅ Must use bullet points for findings
- ✅ Must be decisive, not hedging

### Methods Deep Dive Specifics

- ✅ Must assess reproducibility explicitly
- ✅ Must include specific technical details
- ✅ Must note materials/code availability
- ✅ Must describe replication challenges

### Critical Review Specifics

- ✅ Must evaluate claims vs. evidence
- ✅ Must consider alternative interpretations
- ✅ Must provide rating/verdict
- ✅ Must be balanced and professional

---

## Multiple Review Strategy

You can conduct multiple reviews of the same paper:

### Sequential Approach

1. **Start with Quick Read** (triage)
2. **Follow with Gelman Review** (if worth deep dive)
3. **Add Methods Deep Dive** (if methods are novel)

### Parallel Approach

- **Quick Read** + **Gelman Review** (common combination)
- **Methods Deep Dive** + **Critical Review** (for method papers)

### Version Control

If updating an existing review:
- **Minor updates**: Edit existing file, commit with "Update..." message
- **Major revisions**: Create new version (`gelman-review-v2.md`)

---

## Linking Reviews to Notes

After creating a review, consider creating atomic notes for key insights:

```markdown
## Example Flow

1. Conduct Gelman review
2. Identify key insight: "LLM-human interaction paradox"
3. Create atomic note: `20260211-143000-llm-human-paradox.md`
4. Link note to review:
   ```yaml
   links:
     - "[[bean-2026-llm-medical-assistants-JZUBTJM9/reviews/gelman-review]]"
   ```
```

See [workflow-notes.md](workflow-notes.md) for note creation workflow.

---

## Troubleshooting

### Problem: Can't decide which review style to use

**Solution**: Start with **Quick Read** for triage. If paper is interesting, follow with **Gelman Review** or **Critical Review**.

### Problem: Review is too long

**Solution**:
- Quick Read: Cut to 500 words max. Be decisive.
- Gelman Review: 4000 words is the MAX. Focus on most critical issues.
- Consider splitting into review + separate atomic notes.

### Problem: Don't have expertise for technical review

**Solution**:
- Be honest about limitations in review
- Focus on what you CAN assess (clarity, logic, presentation)
- Use Methods Deep Dive to document what you don't understand

### Problem: Duplicate reviews exist

**Solution**:
- Check `ls papers/{folder-name}/reviews/` BEFORE writing
- If same style exists, read it first
- Ask user if update vs. new version

---

## Review Commit Messages

Use clear, descriptive commit messages:

### Format

```
Add {review-style} for {short-title} ({author} et al., {year})
```

### Examples

```bash
# Good
"Add gelman-review for LLM medical assistants (Bean et al., 2026)"
"Add quick-read for AI education outcomes (Smith et al., 2025)"

# Bad
"Add review"
"Gelman review"
"Bean paper review"
```

---

## Related Documentation

- [templates-guide.md](templates-guide.md) - Detailed template documentation
- [workflow-notes.md](workflow-notes.md) - Creating atomic notes from reviews
- [yaml-schemas.md](yaml-schemas.md#reviews) - Review YAML schema
- [best-practices.md](best-practices.md) - Quality standards
- `templates/` - Review templates (via symlink)
