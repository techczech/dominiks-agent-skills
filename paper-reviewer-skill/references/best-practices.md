# Best Practices

Quality standards, tips, and troubleshooting for the academic paper review workflow.

## Overview

This guide covers:

1. **Quality standards** - What makes a good review, extract, or note
2. **Git workflow** - Commit strategy and messages
3. **Linking conventions** - Building knowledge graphs
4. **Common pitfalls** - Mistakes to avoid
5. **Troubleshooting** - Solutions to common problems

---

## Quality Standards

### Source Papers (00-source.md)

✅ **Must have**:
- Complete YAML frontmatter with all Zotero metadata
- Full abstract
- Reference to PDF location in `source-files/`
- Status field (imported, in_progress, completed)
- Links to highlights folder (if extracted)

❌ **Should NOT have**:
- Embedded PDF (PDFs stay in `source-files/` only)
- Embedded highlights (extract to `highlights/` folder)
- Personal notes (use `notes/` folder instead)

### Reviews

✅ **Must have**:
- Complete YAML frontmatter matching review style
- All template sections filled in
- Critical analysis (not just summary)
- Wikilinks to source paper
- Descriptive tags
- Clear writing and organization

❌ **Should NOT**:
- Skip template sections without good reason
- Be purely descriptive (reviews should analyze)
- Omit limitations or weaknesses
- Lack personal evaluation

### Atomic Notes

✅ **Must have**:
- One idea per file (atomicity)
- Self-contained content (readable without context)
- Clear, descriptive title
- Timestamp-based ID (YYYYMMDD-HHMMSS)
- Links to source papers
- Descriptive tags (3-5 max)

❌ **Should NOT**:
- Combine multiple unrelated ideas
- Be just a quote (use highlights for quotes)
- Be overly long (300-800 words max)
- Lack links to sources

### Data Notes

✅ **Must have**:
- Span multiple papers
- Identify patterns or approaches
- Link to all relevant papers
- Provide examples from each paper
- Include implications section
- Raise open questions

❌ **Should NOT**:
- Be paper-specific (use paper notes instead)
- Lack examples
- Be too narrow (should be cross-cutting)
- Mix categories (method vs. result-pattern)

### Highlights

✅ **Must have**:
- Complete YAML with page number, color, significance
- Full highlighted text
- Link to source paper
- Descriptive title and slug
- One highlight per file

❌ **Should NOT**:
- Combine multiple highlights
- Omit color coding
- Lack context if needed
- Be too short (< 1 sentence)

---

## Git Workflow

### Commit Strategy

**Golden rule**: One operation = One commit

**Commit after**:
- ✅ Importing a paper
- ✅ Completing a review
- ✅ Creating an extraction
- ✅ Creating a note
- ✅ Updating CLAUDE.md or skill files
- ✅ Batch metadata updates

**EXCEPTION**: Collections can be batch-committed after importing all papers.

### Commit Message Format

**Format**:
```
{Action} {what} for/from {paper-short-title} ({author} et al., {year})
```

**Good examples**:
```
Import paper: Reliability of LLMs as medical assistants (Bean et al., 2026)
Add gelman-review for LLM medical assistants (Bean et al., 2026)
Extract 9 highlights from Bean et al. (2026)
Add note: LLM-Human Interaction Paradox (bean-2026)
Create data note: Benchmark vs. Reality Gap (cross-paper pattern)
Update CLAUDE.md: Add collection processing workflow
Import collection: AI-Disciplinary-Use-Evaluations (27 papers)
```

**Bad examples**:
```
Add review
Updated files
Bean paper
Work in progress
Fix
```

### What to Commit

✅ **Always commit**:
- Markdown files (.md)
- **Built single-HTML review reports** (`papers/{folder}/reviews/*.html`) — first-class artefacts, stored next to their source Markdown. Markdown is canonical; HTML is the shareable / openable deliverable. A fresh clone should be able to read a review without a build step.
- YAML/JSON metadata
- Scripts and templates
- Index files (papers.yaml, note-graph.yaml)
- CSV data files
- Images (figures, if not too large)

⚠️ **Optional** (configure in .gitignore):
- PDFs (large files, may want to exclude)
- Temporary files
- Intermediate build artifacts (not the final HTML report — that *is* a deliverable)

❌ **Never commit**:
- System files (.DS_Store, Thumbs.db)
- IDE files (.vscode/, .idea/)
- Backup files (*~, *.bak)
- Log files

### Commit Frequency

**Immediate commit after**:
- Completing any review (don't batch) — and rebuild + commit the matching HTML in the same operation
- Updating an existing review — rebuild its HTML in the same commit
- Creating any extraction (don't batch)
- Creating any note (don't batch)

**Batch commit for**:
- Multiple files in a collection import (ONLY exception)
- Multiple index updates (if done together)

---

## Linking Conventions

### Use Full Paths

✅ **Good**:
```markdown
[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]
[[bean-2026-llm-medical-assistants-JZUBTJM9/reviews/gelman-review]]
[[data/result-pattern-20260211-152000-benchmark-vs-reality-gap]]
```

❌ **Bad**:
```markdown
[[00-source]]  # Ambiguous
[[gelman-review]]  # Missing folder
[[benchmark-gap]]  # Incomplete path
```

### Link Types

**Source links** (note → paper):
```markdown
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]"
```

**Review links** (note → review):
```markdown
links:
  - "[[bean-2026-llm-medical-assistants-JZUBTJM9/reviews/gelman-review]]"
```

**Note-to-note links**:
```markdown
related_notes:
  - "[[20260211-143000-llm-human-paradox]]"
```

**Data note links**:
```markdown
links:
  - "[[data/result-pattern-20260211-152000-benchmark-vs-reality-gap]]"
```

### Bidirectional Linking

When creating links, consider bidirectional connections:

**Example**:
1. Note A links to Note B
2. Update Note B to link back to Note A

This strengthens the knowledge graph.

### Context for Links

Provide context, not just bare links:

✅ **Good**:
```markdown
This paradox is an instance of the broader [[data/result-pattern-20260211-152000-benchmark-vs-reality-gap]] pattern observed across multiple domains.
```

❌ **Bad**:
```markdown
Related: [[data/result-pattern-20260211-152000-benchmark-vs-reality-gap]]
```

---

## Naming Conventions

### Folder Names

**Format**: `{author}-{year}-{title-short}-{zotero_key}`

✅ **Good**:
- `bean-2026-llm-medical-assistants-JZUBTJM9`
- `smith-2025-rct-design-evaluation-ABC123`

❌ **Bad**:
- `bean-2026-reliability-of-llms-medical-assistants-general-public-JZUBTJM9` (too long)
- `JZUBTJM9` (not human-readable)
- `paper-2026` (not descriptive)

### Note IDs

**Format**: YYYYMMDD-HHMMSS

✅ **Good**:
- `20260211-143000`
- `20260212-100530`

❌ **Bad**:
- `2026-02-11` (no time)
- `001` (not timestamp)
- `note1` (not unique)

### Slugs

**Format**: kebab-case, 2-4 words

✅ **Good**:
- `llm-human-paradox`
- `benchmark-vs-reality`
- `rct-design`

❌ **Bad**:
- `llm_human_paradox` (use hyphens, not underscores)
- `LLMHumanParadox` (use lowercase)
- `paradox` (too vague)
- `llm-performance-gap-between-isolated-testing-and-human-collaboration` (too long)

---

## Common Pitfalls

### Pitfall 1: Embedding PDFs in papers/

**Problem**: PDFs stored in both `source-files/` and `papers/`.

**Solution**: PDFs ONLY in `source-files/`. Reference via YAML:
```yaml
pdf_location: "source-files/JZUBTJM9-*.pdf"
```

### Pitfall 2: Skipping YAML Frontmatter

**Problem**: Files without YAML frontmatter.

**Solution**: EVERY markdown file MUST have YAML frontmatter. Use templates.

### Pitfall 3: Breaking Atomicity

**Problem**: Notes combining multiple unrelated ideas.

**Solution**: One idea per note. Split into multiple notes if needed.

### Pitfall 4: Not Committing After Reviews

**Problem**: Batch-committing multiple reviews at once.

**Solution**: Commit IMMEDIATELY after each review. Each review = one commit.

### Pitfall 5: Poor Folder Naming

**Problem**: Folders named `JZUBTJM9` or `bean-paper`.

**Solution**: Use human-readable format: `bean-2026-llm-medical-assistants-JZUBTJM9`.

### Pitfall 6: Relative Wikilinks

**Problem**: Using relative links like `[[00-source]]`.

**Solution**: Use full paths: `[[bean-2026-llm-medical-assistants-JZUBTJM9/00-source]]`.

### Pitfall 7: Too Many Tags

**Problem**: 15 tags on a single note.

**Solution**: Use 3-5 descriptive tags max. More tags = harder to find.

### Pitfall 8: Ignoring Templates

**Problem**: Inventing custom review structures.

**Solution**: Use provided templates. They're battle-tested and ensure consistency.

---

## Troubleshooting

### Problem: YAML validation errors

**Solution**:
- Check for unquoted strings with colons (use `"Title: subtitle"`)
- Verify array syntax (`- item1`)
- Ensure dates are ISO 8601 format
- Check indentation (use spaces, not tabs)
- Reference [yaml-schemas.md](yaml-schemas.md) for examples

### Problem: Can't find paper

**Solution**:
1. Check `index/papers.yaml` for `folder_name`
2. Search by zotero_key: `grep "JZUBTJM9" index/papers.yaml`
3. List folders: `ls papers/`

### Problem: Wikilinks not resolving

**Solution**:
- Use full paths: `[[folder/file]]`
- Check spelling and case (links are case-sensitive)
- Verify file exists: `ls papers/{folder-name}/`

### Problem: Git merge conflicts

**Solution**:
- Avoid concurrent edits to same files
- If conflict occurs, manually resolve in index files
- Commit frequently to minimize conflicts

### Problem: Duplicate reviews

**Solution**:
- ALWAYS check `ls papers/{folder-name}/reviews/` before writing
- Read existing review before creating new version
- Ask user if update vs. new version

### Problem: Lost track of work

**Solution**:
- Read CHANGELOG.md for session history
- Check git log: `git log --oneline -20`
- Check index/papers.yaml for paper status

### Problem: Can't decide paper note vs. data note

**Solution**:
- Start with paper note
- If you reference it from 2+ papers, promote to data note
- Data notes should be cross-cutting, not paper-specific

### Problem: Extraction scripts failing

**Solution**:
- Verify dependencies installed (poppler-utils, pandoc)
- Check file paths (use absolute paths)
- Check script permissions: `chmod +x scripts/*.sh`
- Try manual extraction if automatic fails

---

## Performance Tips

### Use Foam Graph for Discovery

**Ctrl+Shift+P** → "Foam: Show Graph"

Visualize:
- Paper connections
- Note clusters
- Hub nodes (highly connected)
- Knowledge gaps

### Use Grep for Search

```bash
# Find all notes about "paradox"
Grep pattern="tags:.*paradox" path="papers/" output_mode="files_with_matches"

# Find all Gelman reviews
Grep pattern="review_style: gelman-review" path="papers/"
```

### Organize by Collection

Use `index/collections/{name}.md` to create hub nodes for related papers.

### Update index/ Files Regularly

Keep `papers.yaml` and `note-graph.yaml` synchronized after every operation.

---

## Migration Guide

### From Old Structure to New

If you have existing `papers/` or `articles/` folders:

1. **Backup**:
   ```bash
   cp -r papers papers.backup
   cp -r articles articles.backup
   ```

2. **Rename source files**:
   ```bash
   mv articles source-files
   ```

3. **Create new structure**:
   ```bash
   mkdir -p papers data writing index/collections
   ```

4. **For each paper**:
   - Create `papers/{folder-name}/` with subfolders
   - Copy `00-source.md` (without PDF)
   - Extract highlights to separate files
   - Move reviews, extracts, notes to new locations
   - Update index/papers.yaml

5. **Verify**:
   - All PDFs in `source-files/` only
   - All analysis in `papers/`
   - No PDFs in `papers/`
   - All wikilinks resolve

6. **Archive old folders**:
   ```bash
   mv papers.backup papers.old
   echo "papers.old/" >> .gitignore
   ```

---

## Skill Improvement

### When to Update skill/SKILL.md

Update when:
- ✅ You discover a better workflow
- ✅ You encounter an edge case
- ✅ Instructions are unclear or ambiguous
- ✅ You receive user feedback
- ✅ A script or template needs improvement

### How to Update

1. **Identify improvement**
2. **Update appropriate reference file** in `skill/references/`
3. **Update SKILL.md** if main instructions changed
4. **Commit with clear message**:
   ```
   Update skill: [improvement description]

   - What was unclear: [description]
   - What changed: [changes]
   - Why it's better: [rationale]
   ```

### Learning Loop

After each session:
1. ✅ Did workflows work smoothly?
2. ✅ What could be improved?
3. ✅ Update skill files with improvements
4. ✅ Commit changes

This creates continuous improvement.

---

## Quality Checklist

Use this before committing:

### For Reviews

- [ ] Complete YAML frontmatter
- [ ] All template sections filled in
- [ ] Critical analysis (not just summary)
- [ ] Wikilinks to source paper
- [ ] 3-5 descriptive tags
- [ ] Rating if applicable
- [ ] index/papers.yaml updated
- [ ] Committed with clear message

### For Notes

- [ ] Complete YAML frontmatter
- [ ] Timestamp-based ID
- [ ] One idea per file
- [ ] Self-contained content
- [ ] Links to sources
- [ ] 3-5 descriptive tags
- [ ] index/note-graph.yaml updated
- [ ] index/papers.yaml updated

### For Extractions

- [ ] Complete YAML frontmatter
- [ ] Clean, well-formatted markdown
- [ ] Proper attribution
- [ ] Self-contained
- [ ] Link to source paper
- [ ] index/papers.yaml updated
- [ ] Quality verified

---

## Further Resources

### Documentation

- [SKILL.md](../SKILL.md) - Main skill file
- [setup-architecture.md](setup-architecture.md) - Architecture explanation
- [directory-structure.md](directory-structure.md) - Folder organization
- [yaml-schemas.md](yaml-schemas.md) - Complete YAML specifications
- [workflow-import.md](workflow-import.md) - Paper import
- [workflow-review.md](workflow-review.md) - Conducting reviews
- [workflow-extract.md](workflow-extract.md) - Content extraction
- [workflow-notes.md](workflow-notes.md) - Creating notes
- [workflow-writing.md](workflow-writing.md) - Writing projects
- [templates-guide.md](templates-guide.md) - Template usage

### External Resources

- **Zettelkasten Method**: https://zettelkasten.de/
- **Foam Documentation**: https://foambubble.github.io/foam/
- **YAML Validator**: https://www.yamllint.com/
- **Markdown Guide**: https://www.markdownguide.org/

---

## Project Philosophy

This workflow is based on:

1. **Atomic notes** - One idea per file, fully linked
2. **Zettelkasten methodology** - Building knowledge through connections
3. **Foam wikilinks** - Visualizing knowledge graphs
4. **Git version control** - Tracking evolution
5. **Self-improving system** - Skill evolves with project

The goal: Create a growing, interconnected knowledge base that gets smarter over time.

---

**Remember**: Quality over quantity. Better to have 10 well-written, well-linked notes than 100 poorly organized ones.
