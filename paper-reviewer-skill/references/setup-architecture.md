# Setup Architecture: Transparent Root Skill

## Philosophy

**The skill lives in the project root (`skill/`) for transparency and accessibility.**

Traditional approach: Skills hidden in `.claude/` or `.antigravity/` (agent-specific, not visible)

**Our approach**: Skill in project root, symlinked by all agents (transparent, accessible, shared)

## Directory Structure

```
paper-reviews/                         # Project root
├── skill/                                # ⭐ SKILL LIVES HERE (visible, transparent)
│   ├── SKILL.md                          # Main skill file
│   ├── references/                       # This folder! Workflow documentation
│   │   ├── setup-architecture.md         # This file
│   │   ├── workflow-import.md
│   │   ├── workflow-review.md
│   │   ├── workflow-extract.md
│   │   ├── workflow-notes.md
│   │   ├── workflow-writing.md
│   │   ├── directory-structure.md
│   │   ├── yaml-schemas.md
│   │   ├── templates-guide.md
│   │   └── best-practices.md
│   ├── scripts@ → ../scripts/            # Symlink to root scripts
│   └── templates@ → ../templates/        # Symlink to root templates
│
├── .claude/
│   └── skills/
│       └── academic-paper-review@ → ../../skill/      # Claude Code discovery
│
├── .antigravity/
│   └── skills/
│       └── academic-paper-review@ → ../../skill/      # Antigravity discovery
│
├── .gemini/
│   └── skills/
│       └── academic-paper-review@ → ../../skill/      # Gemini discovery
│
├── .codex/
│   └── skills/
│       └── academic-paper-review@ → ../../skill/      # Codex discovery
│
├── scripts/                              # Actual extraction scripts (single source)
├── templates/                            # Actual templates (single source)
├── source-files/                         # Research data
├── papers/                       # Analysis workspace
├── data/                                 # Cross-cutting notes
└── writing/                              # Writing projects
```

## Why This Architecture?

### 1. **Transparency**
- Anyone browsing the repo sees `skill/` immediately
- No hidden configuration in dot-folders
- Clear that project uses skill-based workflows
- Skill is part of visible project structure

### 2. **Accessibility**
- Other agents can access skill without `.claude/`-specific paths
- Custom scripts can reference skill documentation
- Not dependent on any single agent's directory conventions

### 3. **Multi-Agent Compatibility**
- Same skill works with Claude, Antigravity, Gemini, Codex
- Each agent discovers via its own symlink
- No duplication - single source of truth in `skill/`

### 4. **Single Source of Truth**
- Scripts and templates in project root
- Symlinked from `skill/` to avoid duplication
- Update once, available everywhere

### 5. **Version Control**
- Skill evolution visible in git history
- Symlinks committed to git (documents architecture)
- Clear what changes over time

### 6. **Self-Documenting**
- New collaborators see `skill/` and understand approach
- README can point to skill as project documentation
- Skill becomes "project memory"

## Setup Instructions

### For This Project (Already Done)

```bash
# 1. Create skill folder in project root
mkdir -p skill/references

# 2. Create SKILL.md and references/
#    (populated with project-specific workflows)

# 3. Symlink scripts and templates from root
cd skill/
ln -s ../scripts scripts
ln -s ../templates templates
cd ..

# 4. Create agent discovery symlinks
mkdir -p .claude/skills .antigravity/skills .gemini/skills .codex/skills

cd .claude/skills && ln -s ../../skill academic-paper-review && cd ../..
cd .antigravity/skills && ln -s ../../skill academic-paper-review && cd ../..
cd .gemini/skills && ln -s ../../skill academic-paper-review && cd ../..
cd .codex/skills && ln -s ../../skill academic-paper-review && cd ../..

# 5. Commit symlinks to git
git add skill/ .claude/skills/ .antigravity/skills/ .gemini/skills/ .codex/skills/
git commit -m "Create transparent root skill with multi-agent symlinks"
```

### For New Projects (Using Generic Skill)

See the generic [`academic-paper-review`](https://github.com/techczech/academic-paper-review) skill for:
- Step-by-step setup guide
- Template SKILL.md
- Generic reference files
- Customization instructions

## Verification

Check that the architecture is set up correctly:

```bash
# 1. Verify skill folder exists in root
ls -la skill/
# Should show: SKILL.md, references/, scripts@, templates@

# 2. Verify symlinks within skill/
ls -la skill/scripts/
# Should show extraction scripts from ../scripts/

ls -la skill/templates/
# Should show templates from ../templates/

# 3. Verify agent discovery symlinks
ls -la .claude/skills/academic-paper-review
# Should show: → ../../skill

ls -la .antigravity/skills/academic-paper-review
# Should show: → ../../skill

ls -la .gemini/skills/academic-paper-review
# Should show: → ../../skill

ls -la .codex/skills/academic-paper-review
# Should show: → ../../skill

# 4. Test that scripts are accessible
ls skill/scripts/
# Should show: extract-paper.sh, pdf-to-markdown.sh, extract-figures.sh, extract-tables.sh
```

## Benefits in Practice

### For the AI Agent
- Discovers skill via symlink in its own directory (`.claude/skills/`, etc.)
- Reads `skill/SKILL.md` for instructions
- Accesses references/ for detailed workflows
- Executes scripts via `skill/scripts/` symlink
- Uses templates via `skill/templates/` symlink

### For the Human
- Sees `skill/` in repo root - clear documentation
- Can read `skill/SKILL.md` directly in editor
- Can edit workflows in `skill/references/`
- Git history shows skill evolution
- No hidden configuration

### For Collaborators
- Clone repo, see `skill/` folder immediately
- Understand project uses skill-based workflow
- Can fork/customize skill for their own projects
- Multi-agent setup is clear from directory structure

## Evolution

This architecture enables the skill to evolve with the project:

1. **Discovery**: New pattern emerges during research
2. **Documentation**: Update `skill/references/` with new workflow
3. **Version Control**: Commit changes to git
4. **Sharing**: Can backport improvements to generic skill

The skill becomes "project memory" - capturing institutional knowledge as it develops.

## Comparison to Traditional Approach

### Traditional (Hidden)
```
.claude/
└── skills/
    └── my-skill/
        ├── SKILL.md
        ├── scripts/
        └── templates/
```
❌ Hidden from casual repo browsing
❌ Agent-specific (not accessible to other tools)
❌ Duplicated if multiple agents used

### Our Approach (Transparent)
```
skill/                  # ⭐ Visible in root
├── SKILL.md
├── references/
├── scripts@ → ../scripts/
└── templates@ → ../templates/

.claude/skills/academic-paper-review@ → ../../skill/
.antigravity/skills/academic-paper-review@ → ../../skill/
# (etc. for other agents)
```
✅ Visible and transparent
✅ Multi-agent compatible
✅ Single source of truth
✅ Self-documenting

## Recommended VS Code Extensions

**These extensions work across multiple editors**: VS Code, Cursor, Windsurf, and Antigravity.

### Essential Extensions

1. **Foam** (foam.foam-vscode)
   - **Purpose**: Wikilink support and knowledge graph visualization
   - **Why**: Enables `[[wikilink]]` syntax and graph view of note connections
   - **Install**: `ext install foam.foam-vscode`
   - **Usage**: Open Foam graph (Ctrl+Shift+P → "Foam: Show Graph") to visualize paper connections

2. **Markdown All in One** (yzhang.markdown-all-in-one)
   - **Purpose**: Enhanced markdown editing
   - **Why**: Table of contents, keyboard shortcuts, auto-preview
   - **Install**: `ext install yzhang.markdown-all-in-one`

3. **YAML** (redhat.vscode-yaml)
   - **Purpose**: YAML syntax highlighting and validation
   - **Why**: All files use YAML frontmatter - this validates schema
   - **Install**: `ext install redhat.vscode-yaml`

### Highly Recommended

4. **Markdown Preview Enhanced** (shd101wyy.markdown-preview-enhanced)
   - **Purpose**: Advanced markdown preview with mermaid, charts
   - **Why**: Better visualization of complex documents
   - **Install**: `ext install shd101wyy.markdown-preview-enhanced`

5. **Git Graph** (mhutchie.git-graph)
   - **Purpose**: Visualize git history
   - **Why**: Track skill evolution and research progress over time
   - **Install**: `ext install mhutchie.git-graph`

6. **Path Intellisense** (christian-kohler.path-intellisense)
   - **Purpose**: Autocomplete file paths
   - **Why**: Helps with wikilinks and file references
   - **Install**: `ext install christian-kohler.path-intellisense`

### Optional (Productivity)

7. **Todo Tree** (gruntfuggly.todo-tree)
   - **Purpose**: Highlight TODO/FIXME comments
   - **Why**: Track incomplete reviews and extraction tasks
   - **Install**: `ext install gruntfuggly.todo-tree`

8. **Markdown PDF** (yzane.markdown-pdf)
   - **Purpose**: Export markdown to PDF
   - **Why**: Share reviews and notes as PDFs
   - **Install**: `ext install yzane.markdown-pdf`

### Installation Script

Install all essential extensions at once:

```bash
# Essential extensions
code --install-extension foam.foam-vscode
code --install-extension yzhang.markdown-all-in-one
code --install-extension redhat.vscode-yaml

# Highly recommended
code --install-extension shd101wyy.markdown-preview-enhanced
code --install-extension mhutchie.git-graph
code --install-extension christian-kohler.path-intellisense

# Optional
code --install-extension gruntfuggly.todo-tree
code --install-extension yzane.markdown-pdf
```

**Note**: Replace `code` with `cursor`, `windsurf`, or `antigravity` depending on your editor.

### Editor Compatibility

These extensions work identically in:
- ✅ **VS Code** (Microsoft's editor)
- ✅ **Cursor** (AI-first code editor)
- ✅ **Windsurf** (AI pair programming)
- ✅ **Antigravity** (Claude-integrated editor)

All use the VS Code extension ecosystem, so installation is identical across editors.

### Foam Configuration

After installing Foam, create a `.vscode/foam.json` (works in all editors):

```json
{
  "foam.openDailyNote.directory": "papers",
  "foam.openDailyNote.titleFormat": "'daily-note'-yyyy-mm-dd",
  "foam.graph.style": {
    "node": {
      "note": { "color": "#4CAF50" },
      "source": { "color": "#2196F3" },
      "review": { "color": "#FF9800" },
      "data_note": { "color": "#9C27B0" }
    }
  }
}
```

This configures Foam to:
- Use papers/ for daily notes
- Color-code nodes by type in graph view
- Provide better visual navigation

---

## Further Reading

- [SKILL.md](../SKILL.md) - Main skill file
- [directory-structure.md](directory-structure.md) - Full project structure
- [best-practices.md](best-practices.md) - Quality standards and tips
