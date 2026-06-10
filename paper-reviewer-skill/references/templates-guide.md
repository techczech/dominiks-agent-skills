# Templates Guide

Complete guide to using review templates and file templates.

## Overview

This repository provides templates for:

1. **Review templates** - Multi-style paper reviews
2. **File templates** - YAML-based file creation
3. **Extraction templates** - Content extraction formats

All templates are available in `templates/` (accessed via `skill/templates@` symlink).

---

## Review Templates

### Available Styles

| Template | Purpose | Length | When to Use |
|----------|---------|--------|-------------|
| [gelman-review.md](#gelman-review) | Critical methodological analysis | 2000-4000 words | RCTs, complex statistics |
| [quick-read.md](#quick-read) | Fast triage overview | 300-500 words | Initial assessment |
| [methods-deep-dive.md](#methods-deep-dive) | Detailed methodological analysis | 1500-3000 words | Novel methods, replication |
| [critical-review.md](#critical-review) | Peer-review style assessment | 2000-3000 words | Controversial claims |
| [summary-card.md](#summary-card) | Shareable summary | 400-600 words | Public sharing |
| [claims-audit-and-press.md](#claims-audit-and-press) | Probity audit + press representation | 2500-4500 words | Papers with significant policy / public footprint; high-stakes citations |

---

## Gelman Review

**File**: `templates/gelman-review.md`

**Purpose**: Critical statistical and methodological review in the style of Andrew Gelman

**Approach**: Skeptical analysis with constructive criticism

**Focus**: Experimental design, statistical methods, interpretive issues

**Tone**: Direct, critical, constructive

**Length**: Comprehensive (2000-4000 words)

### When to Use

- ✅ RCTs and experimental studies
- ✅ Papers with complex statistical analyses
- ✅ Claims requiring methodological scrutiny
- ✅ When deep design critique is needed

### Structure

1. **Executive Summary** (2-3 paragraphs)
   - TL;DR of the paper
   - Main critique points
   - Overall assessment

2. **What They Did**
   - Study design
   - Methods overview
   - Sample and procedures

3. **What They Found**
   - Main results
   - Key statistics
   - Authors' interpretation

4. **What I Think**
   - **The Good**: Genuine strengths
   - **The Bad**: Significant issues
   - **The Ugly**: Critical flaws

5. **Statistical and Methodological Critique**
   - Statistical validity
   - Experimental design issues
   - Measurement concerns
   - Analysis choices

6. **What I Would Have Done Differently**
   - Concrete alternative approaches
   - Improved study design
   - Better analyses

7. **What This Means**
   - Implications if findings hold
   - Implications given limitations
   - Contribution to field

8. **Bottom Line**
   - Should you trust this?
   - Should you build on this?
   - What's the takeaway?

9. **Questions for the Authors**
   - Specific questions about methods
   - Requests for clarification
   - Alternative interpretations

### Style Notes

- ✅ Be skeptical but constructive
- ✅ Question assumptions explicitly
- ✅ Suggest concrete alternatives
- ✅ Use "What I Would Have Done" section
- ✅ Be direct about weaknesses
- ✅ Acknowledge genuine strengths
- ❌ Don't be dismissive or harsh
- ❌ Don't criticize without offering alternatives

### Example Usage

```bash
Read templates/gelman-review.md
# Adapt structure to paper
# Fill in sections based on paper content
Write papers/{folder-name}/reviews/gelman-review.md
```

---

## Quick Read

**File**: `templates/quick-read.md`

**Purpose**: Fast overview for triage and prioritization

**Approach**: Surface-level assessment

**Focus**: Main findings, significance, initial reactions

**Tone**: Informal, personal

**Length**: Brief (300-500 words)

### When to Use

- ✅ Initial paper triage
- ✅ Building reading queue priorities
- ✅ Quick context before deep review
- ✅ Time-constrained overviews

### Structure

1. **TL;DR** (1-2 sentences)
   - Paper in a nutshell

2. **Research Question**
   - What they're trying to answer

3. **Method** (1 paragraph)
   - High-level approach
   - Sample size and design

4. **Key Findings** (bullet list)
   - 3-5 main results

5. **Why It Matters**
   - Significance and contribution

6. **Red Flags / Interesting Points**
   - Issues noticed
   - Cool insights

7. **My Take**
   - Gut reaction
   - Initial assessment

8. **Should I Read More Deeply?**
   - Yes/No with brief rationale

### Style Notes

- ✅ Be fast and decisive
- ✅ Use bullet points
- ✅ Personal voice OK
- ✅ Gut reactions welcome
- ❌ Don't get bogged down in details
- ❌ Don't aim for completeness

---

## Methods Deep Dive

**File**: `templates/methods-deep-dive.md`

**Purpose**: Detailed methodological analysis for reproducibility

**Approach**: Systematic methods evaluation

**Focus**: Reproducibility, rigor, technical quality

**Tone**: Technical, thorough

**Length**: Comprehensive (1500-3000 words)

### When to Use

- ✅ Novel methodologies
- ✅ Replication planning
- ✅ Methods learning
- ✅ Reproducibility assessment

### Structure

1. **Study Design**
   - Overall approach
   - Research questions
   - Hypotheses

2. **Data Collection**
   - Sampling strategy
   - Measures and instruments
   - Procedures

3. **Analysis Plan**
   - Statistical tests
   - Software and tools
   - Analysis steps

4. **Reproducibility Assessment**
   - Preregistration status
   - Materials availability
   - Code availability
   - Data availability

5. **Methodological Strengths**
   - What they did well
   - Rigorous choices

6. **Methodological Weaknesses**
   - Gaps and issues
   - Validity threats

7. **Alternative Approaches**
   - Other methods that could work
   - Trade-offs

8. **Replication Notes**
   - What you'd need to replicate
   - Challenges to expect

### Style Notes

- ✅ Be thorough and technical
- ✅ Include specific details
- ✅ Reference methodology literature
- ✅ Assess reproducibility explicitly
- ❌ Don't skip technical details
- ❌ Don't assume methods are obvious

---

## Critical Review

**File**: `templates/critical-review.md`

**Purpose**: Academic peer-review style assessment

**Approach**: Claim-evidence evaluation

**Focus**: Validity, interpretation, contribution

**Tone**: Professional, balanced

**Length**: Comprehensive (2000-3000 words)

### When to Use

- ✅ Formal review practice
- ✅ Controversial claims
- ✅ High-impact papers
- ✅ Contribution assessment

### Structure

1. **Claims and Evidence**
   - Main claims
   - Evidence provided
   - Strength of evidence

2. **Theoretical Framework**
   - Theory used
   - Appropriateness
   - Gaps

3. **Methodological Critique**
   - Design validity
   - Measurement quality
   - Analysis appropriateness

4. **Interpretive Issues**
   - Over-claiming
   - Alternative interpretations
   - Causal vs. correlational

5. **Alternative Interpretations**
   - Other ways to read results
   - Confounds and limitations

6. **Contribution Assessment**
   - What's novel
   - What's incremental
   - Impact potential

7. **Rating and Verdict**
   - Accept/Revise/Reject
   - Major vs. minor revisions
   - Summary judgment

### Style Notes

- ✅ Be professional and balanced
- ✅ Acknowledge strengths
- ✅ Be specific about weaknesses
- ✅ Offer constructive feedback
- ❌ Don't be overly harsh
- ❌ Don't accept weak evidence

---

## Summary Card

**File**: `templates/summary-card.md`

**Purpose**: Shareable summary for public consumption

**Approach**: Accessible overview

**Focus**: Main findings and implications

**Tone**: Clear, accessible

**Length**: Medium (400-600 words)

### When to Use

- ✅ Sharing on social media
- ✅ Blog posts or newsletters
- ✅ Teaching materials
- ✅ Public communication

### Structure

1. **Title and Citation**
2. **One-Sentence Summary**
3. **Background** (1 paragraph)
4. **What They Did** (1 paragraph)
5. **Key Findings** (bullet list)
6. **Why It Matters** (1 paragraph)
7. **Limitations** (1 paragraph)
8. **Bottom Line** (1 paragraph)

### Style Notes

- ✅ Use accessible language
- ✅ Avoid jargon
- ✅ Be concise
- ✅ Highlight implications
- ❌ Don't oversimplify
- ❌ Don't omit limitations

---

## Claims Audit + Press Representation

**Template**: [`templates/claims-audit-and-press.md`](../../templates/claims-audit-and-press.md)

### When to Use

Use this template when:

- A paper has a significant public / policy / deployment footprint — citations are doing real work in the world.
- The headline result is being repeated by press, on social media, in podcasts, by policy briefs, or by other research that builds on it.
- You want to know whether — and how — the paper should be cited, before adding it to your own writing or recommendation chain.
- The paper is by a frontier-lab-affiliated group whose claims will reach a global audience regardless of merit.
- A press release or news article about the paper has caught your attention; you want to audit whether the press representation matches the actual evidence.

### What It Does

Two coupled audits:

1. **Internal probity audit** — every load-bearing claim in the title, abstract, discussion, and conclusions is checked against the paper's actual evidence base. Verdicts are recorded per claim (warranted / partially warranted / overreach / misleading) with the specific Figure / Table / Section the claim does or does not rest on.
2. **External representation audit** — press releases, news coverage, social-media threads, and other downstream summaries are checked for representation accuracy. Common failure modes (inflation, scope creep, causal slippage, phantom claims) are tracked explicitly.

The template ends with a **"citing this paper responsibly"** section that summarises what the paper can and cannot be cited for, and **"what an honest version of the paper would look like"** — a constructive counterfactual.

### Key Principle

Hold the paper to the highest standard of scientific probity. Be specific:
- Quote the claim verbatim.
- Point to the specific evidence (Figure N / Table N / Section).
- Say exactly where the gap is.

This is not an adversarial review. It is a probity review — and the standard is whether *a careful researcher reading the paper would come away with a correct understanding of the underlying evidence*. Press representations, separately, are judged by whether *a typical reader of the press piece would come away with an understanding consistent with the paper's actual evidence*.

### Sections

1. What the paper actually shows
2. Title — claim audit (per-claim table)
3. Abstract — claim audit (per-claim, verbatim quotes)
4. Discussion — claim audit (especially generalisation and causal claims)
5. Conclusions — claim audit (the take-home messages citations carry)
6. Press release — representation audit (headline, lede, quotes)
7. News coverage — representation audit (multiple outlets)
8. Social media / influencer representation (optional)
9. Phantom claims (claims the paper does *not* make but get attributed)
10. Summary scorecard (per-surface probity verdict)
11. Citing this paper responsibly
12. What an honest version of the paper would look like

### YAML Frontmatter Note

Record every press source you reviewed in the YAML `press_sources_reviewed` array — outlet, URL, date, type. This makes the review auditable and lets future readers retrace your analysis.

---

## File Templates

### Highlight Template

**File**: `templates/highlight.md`

**Purpose**: Create atomic highlight files with YAML frontmatter

See [yaml-schemas.md](yaml-schemas.md#highlights) for complete schema.

### Figure Template

**File**: `templates/figure.md`

**Purpose**: Create figure metadata files (JSON format)

See [yaml-schemas.md](yaml-schemas.md#figures) for complete schema.

### Table Template

**File**: `templates/table.md`

**Purpose**: Create table metadata files (JSON format)

See [yaml-schemas.md](yaml-schemas.md#tables) for complete schema.

### Data Note Template

**File**: `templates/data-note.md`

**Purpose**: Create cross-cutting data notes

See [yaml-schemas.md](yaml-schemas.md#data-notes) for complete schema.

### Writing Project Template

**File**: `templates/writing-project.md`

**Purpose**: Create writing project README files

See [yaml-schemas.md](yaml-schemas.md#writing-projects) for complete schema.

---

## Using Templates

### Step 1: Read Template

```bash
Read templates/{template-name}.md
```

### Step 2: Adapt to Paper

- Fill in YAML frontmatter with paper-specific metadata
- Replace placeholders with actual content
- Follow section structure from template

### Step 3: Write File

```bash
Write papers/{folder-name}/reviews/{review-style}.md
```

### Step 4: Update Tracking

```bash
# Update index/papers.yaml
# Commit changes
```

---

## Template Customization

### Project-Specific Adaptations

You can customize templates for your project:

1. **Copy template** to your project
2. **Modify structure** to fit your needs
3. **Add sections** relevant to your domain
4. **Remove sections** that don't apply

### Version Control

Templates are version-controlled in git:
- Track improvements over time
- Revert changes if needed
- Share across projects

### Creating New Templates

To create a new template:

1. **Identify pattern** in your reviews
2. **Extract structure** to template file
3. **Add to `templates/` folder**
4. **Document in this guide**
5. **Update SKILL.md** with new template

---

## Review Quality Standards

### All Reviews Must Include

1. ✅ Complete YAML frontmatter
2. ✅ Clear summary of paper
3. ✅ Assessment of findings
4. ✅ Critical analysis appropriate to style
5. ✅ Personal evaluation
6. ✅ Proper citations and wikilinks
7. ✅ Descriptive tags

### Review-Specific Standards

**Gelman Review**:
- Must include "What I Would Have Done" section
- Must question assumptions explicitly
- Must offer concrete alternatives

**Quick Read**:
- Must be under 500 words
- Must include "Should I Read More Deeply?" decision

**Methods Deep Dive**:
- Must assess reproducibility
- Must include specific technical details
- Must note materials/code availability

**Critical Review**:
- Must evaluate claims vs. evidence
- Must consider alternative interpretations
- Must provide rating/verdict

---

## Related Documentation

- [workflow-review.md](workflow-review.md) - Review workflow
- [yaml-schemas.md](yaml-schemas.md) - YAML specifications
- [best-practices.md](best-practices.md) - Quality standards
- `templates/` - Actual template files (via symlink)
