# Learning Paths Workflow

Interactive generation of reading sequences from documentation. Propose personas based on the project's content, confirm with the user, then generate paths.

## Core Interaction Pattern

1. **Scan** — Read all docs, extract frontmatter and content structure
2. **Propose** — Suggest 3-5 reader personas based on what the docs cover
3. **Ask** — User approves, modifies, or adds personas
4. **Generate** — Create reading paths for approved personas
5. **Present** — Show paths, ask for adjustments

## Inputs

- **Docs**: All `.md` files in the docs directory
- **Frontmatter fields** (if available): `teaches`, `prerequisites`, `category`
- **Config**: `editorial-workspace/editorial-config.json` (audience context)

## Steps

### 1. Scan Documentation

Read frontmatter from every doc. Build a picture of:
- What topics are covered
- What concepts each doc teaches (from `teaches` field or inferred from content)
- What prerequisites exist (from `prerequisites` field or inferred from cross-references)
- Category groupings
- Which docs are introductory vs. advanced vs. reference

### 2. Build Dependency Graph

Map each doc to:
- What it teaches (explicit or inferred)
- What it requires the reader to know first
- What category it belongs to

Identify:
- Entry points (docs with no prerequisites)
- Terminal nodes (docs nothing else depends on)
- Clusters (groups of related docs)

### 3. Propose Personas

Based on the content analysis, propose 3-5 reader personas. Each persona should have:
- **Name**: A short descriptive label (e.g., "Complete Beginner", "Web Developer")
- **Goal**: What this reader wants to accomplish
- **Starting knowledge**: What they already know
- **Target docs**: Which docs are most relevant to them

Derive personas from the actual content — do not use hardcoded personas. Consider:
- The project's target audience (from config)
- Natural clusters in the dependency graph
- Different entry points into the documentation
- Different goals readers might have

Present personas to the user. Ask:
- Are these the right personas?
- Should any be added, removed, or modified?
- Are the goals accurate?

### 4. Generate Paths

For each approved persona:
1. Start from their entry point (lowest prerequisite docs matching their goal)
2. Follow the dependency graph toward their target docs
3. Include only docs relevant to their goal (skip tangential content)
4. Order by prerequisite chain

### 5. Present Paths

For each persona, show:

```markdown
## Path: [Persona Name]
Goal: [What this reader wants to accomplish]

1. **[Doc Title](filename.md)** — What you'll learn: [key concepts]
2. **[Doc Title](filename.md)** — What you'll learn: [key concepts]
   ↳ Builds on: [previous doc's concepts]
3. ...

Gaps: [Any missing docs that would help this path]
```

Ask the user:
- Does this reading order make sense?
- Should any docs be added or removed from a path?
- Are there gaps that need new docs?

## Output

Present the final paths. Optionally write to a file if the user wants to publish them (e.g., as a "Getting Started" guide or navigation aid).
