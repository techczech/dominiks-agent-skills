#!/usr/bin/env bash
# setup-agents.sh — Wire doc-editorial skill into your agent
#
# Usage: Run from your PROJECT ROOT (not the skill directory)
#   bash editorial-workspace/core/scripts/setup-agents.sh [--agent claude-code|antigravity|codex]
#
# Default: claude-code

set -euo pipefail

AGENT="${1:---agent}"
AGENT_TYPE="${2:-claude-code}"

# Handle --agent flag
if [[ "$AGENT" == "--agent" ]]; then
    AGENT_TYPE="${2:-claude-code}"
elif [[ "$AGENT" != "--agent" ]]; then
    AGENT_TYPE="$AGENT"
fi

WORKSPACE="editorial-workspace"
SKILL_DIR="$WORKSPACE/skills"
AGENT_DIR="$WORKSPACE/agents"

if [[ ! -d "$WORKSPACE" ]]; then
    echo "Error: $WORKSPACE/ not found. Run from your project root."
    exit 1
fi

case "$AGENT_TYPE" in
    claude-code)
        echo "Setting up for Claude Code..."
        mkdir -p .claude/skills .claude/agents

        # Copy skills as directory/SKILL.md (Claude Code requires this structure)
        if [[ -d "$SKILL_DIR" ]]; then
            for skill in "$SKILL_DIR"/*.md; do
                [[ -e "$skill" ]] || continue
                name=$(basename "$skill" .md)
                mkdir -p ".claude/skills/$name"
                cp "$skill" ".claude/skills/$name/SKILL.md"
                echo "  Copied skill: $name/SKILL.md"
            done
        fi

        # Copy agents
        if [[ -d "$AGENT_DIR" ]]; then
            for agent in "$AGENT_DIR"/*.md; do
                [[ -e "$agent" ]] || continue
                name=$(basename "$agent")
                cp "$agent" ".claude/agents/$name"
                echo "  Copied agent: $name"
            done
        fi

        # Copy project README template if not already present
        CORE_DIR="$WORKSPACE/core"
        if [[ ! -f "$WORKSPACE/README.md" ]] && [[ -f "$CORE_DIR/assets/project-readme.md" ]]; then
            cp "$CORE_DIR/assets/project-readme.md" "$WORKSPACE/README.md"
            echo "  Created README: $WORKSPACE/README.md"
        fi

        echo "Done. Skills available via /doc-audit, /doc-review, etc."
        echo "Note: Re-run this script after editing skills in $SKILL_DIR to update .claude/skills/"
        ;;

    antigravity)
        echo "Setting up for Antigravity..."
        INSTRUCTIONS_DIR=".idx"
        mkdir -p "$INSTRUCTIONS_DIR"
        INSTRUCTIONS_FILE="$INSTRUCTIONS_DIR/instructions.md"

        # Append editorial system reference if not already present
        if [[ -f "$INSTRUCTIONS_FILE" ]] && grep -q "doc-editorial" "$INSTRUCTIONS_FILE"; then
            echo "  Editorial references already present in $INSTRUCTIONS_FILE"
        else
            cat >> "$INSTRUCTIONS_FILE" <<'HEREDOC'

## Editorial System

This project uses the doc-editorial skill for documentation quality management.
See `editorial-workspace/core/SKILL.md` for the full workflow decision tree.

Key files:
- `editorial-workspace/editorial-config.json` — project config
- `editorial-workspace/glossary.json` — canonical terms
- `editorial-workspace/changelog.jsonl` — editorial log (append-only)
- `editorial-workspace/rules/structural-rules.md` — structural conventions
- `editorial-workspace/guides/voice-and-tone.md` — voice guide
HEREDOC
            echo "  Appended editorial references to $INSTRUCTIONS_FILE"
        fi
        echo "Done."
        ;;

    codex|opencode)
        echo "Setting up for ${AGENT_TYPE}..."
        AGENTS_FILE="AGENTS.md"

        # Append editorial system reference if not already present
        if [[ -f "$AGENTS_FILE" ]] && grep -q "doc-editorial" "$AGENTS_FILE"; then
            echo "  Editorial references already present in $AGENTS_FILE"
        else
            cat >> "$AGENTS_FILE" <<'HEREDOC'

## Editorial System

This project uses the doc-editorial skill for documentation quality management.
See `editorial-workspace/core/SKILL.md` for the full workflow decision tree.

Key files:
- `editorial-workspace/editorial-config.json` — project config
- `editorial-workspace/glossary.json` — canonical terms
- `editorial-workspace/changelog.jsonl` — editorial log (append-only)
- `editorial-workspace/rules/structural-rules.md` — structural conventions
- `editorial-workspace/guides/voice-and-tone.md` — voice guide
HEREDOC
            echo "  Appended editorial references to $AGENTS_FILE"
        fi
        echo "Done."
        ;;

    *)
        echo "Unknown agent type: $AGENT_TYPE"
        echo "Supported: claude-code, antigravity, codex, opencode"
        exit 1
        ;;
esac
