---
name: learn-from-dominiks-setup
description: Use to learn from Dominik's setup, get started with Dominik's skills collection, or ask which of Dominik's skills fits a situation. Inspects the user's own agent setup read-only, compares it with Dominik's practices, recommends 2-3 skills. Works pasted by URL or installed.
---

# Learn from Dominik's setup

Entry point to https://github.com/techczech/dominiks-agent-skills. No install needed: user pastes "Read https://raw.githubusercontent.com/techczech/dominiks-agent-skills/main/estate/learn-from-dominiks-setup/SKILL.md and follow it." Also works as an installed skill.

Rule: explore, present what you found, confirm with the user, then write. Read-only until a yes. British spelling. One question at a time, each with a recommended answer. Never send the user's files anywhere.

## Mode

- User asks "which of Dominik's skills fits X": router mode. Skip step 1. Fetch catalogue, match `when` lines, check `needs`, read the candidate's SKILL.md before claiming what it does. Answer; name the runner-up if two match; offer step 4.
- Otherwise: run steps 1-4.

## 1. Look, change nothing

1. Detect the agent you run in (Claude Code, Codex, Antigravity, pi, other).
2. No file access (chat app): ask 4-6 of the questions below instead.
3. Read only this allowlist; skip silently what does not exist:
   - Instruction files: `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.gemini/GEMINI.md` (Antigravity global).
   - Skills dirs, names only (list, never open): `~/.claude/skills`, `~/.agents/skills`, `~/.codex/skills`.
   - cwd: its `AGENTS.md`/`CLAUDE.md`, plus top-level file and directory names.
   - Repo layout: where repos live and how many (count directories; do not open them).
4. Never open auth or credential files in `~/.codex`, `~/.claude`, `~/.gemini` etc.: login or sign-in files, credential files, environment files, tokens, keys, anything with auth, credentials or token in its name. Report practices present, never contents.
5. Anything else: ask first.
6. Note: which instruction files exist, size, trigger-first or long prose; signs of hub or registry, backlog, handoff notes, lessons log, review inbox, model-role rules.
7. Sharing check: `ls -l` for symlinks; `@path` or include lines inside the files; else `diff` two files and compare the result (report only "same", "similar", "different").

### Questions (no file access)

- Which agents do you use; do they share instructions?
- Do you keep a written instruction file? How long?
- How many projects run at once; can you say where each stands?
- Do sessions start from a known place, or from scratch?
- Can you steer how the agent writes to you?
- Do you use different models for planning, building and review?

## 2. Compare

1. Catalogue: https://dominiklukes.net/agents/skills/skills-catalogue.json. JSON object; skills are in the `skills` array; each has `name`, `summary`, `when`, `jobs`, `needs`, `link`. Unreachable: use the README at https://github.com/techczech/dominiks-agent-skills.
2. Practices table: installed: read `references/practices.md` next to this file. Pasted by URL: fetch https://raw.githubusercontent.com/techczech/dominiks-agent-skills/main/estate/learn-from-dominiks-setup/references/practices.md. Neither works: use this list.
   - same instructions in every agent: `global-agent-instructions`
   - short trigger-first instruction files: `agents-md-streamline`
   - agent fitted to how you think and write: `ai-working-style-builder`
   - one hub where sessions start (registry, backlog, handoffs): `coordination-hub`
   - decide who a text is for: `writing-modes`
   - plain literal prose: `expository-writing`
   - planner hands work to other models: `agent-roles`
   - one inbox for review and test requests: `dev-traffic-control` (needs Dominik's DTC app)
3. Score each practice from step 1 evidence: already, partly, not yet, unknown.
4. Other needs: route by catalogue `when` lines.
5. Check `needs`: `app` (user must have the app), `mac-local` (macOS only), `account`. Drop or flag failures.
6. `needs` may understate setup cost. Read the skill's SKILL.md for install steps and downloads before recommending; mention big ones.

## 3. Report

Plain language, for the user, at most ~150 words.

- What they already do well: 2-4 items from the evidence.
- 2-3 changes most worth trying. Each: skill, one sentence why for this user, how to get it.
- Do not list every skill or recommend one whose needs fail.
- Ask one question: which first. Recommend one.

## 4. Only on their yes

1. Choose route; recommend by comfort:
   - Run once: read the skill's SKILL.md and follow it. Nothing installed.
   - Install: ask before writing; show the exact path.
2. Install method. Raw files: `https://raw.githubusercontent.com/techczech/dominiks-agent-skills/main/<category>/<skill>/<file>`.
   - List files: fetch `"https://api.github.com/repos/techczech/dominiks-agent-skills/git/trees/main?recursive=1"` (quote URLs in shells); keep paths with prefix `<category>/<skill>/`; fetch each from raw.
   - Or: `git clone --depth 1 --filter=blob:none --sparse https://github.com/techczech/dominiks-agent-skills.git`, then `git sparse-checkout set <category>/<skill>`; copy that folder.
3. Target dir: Claude Code `~/.claude/skills/<skill>/`. Codex `~/.codex/skills/<skill>/` or `~/.agents/skills/<skill>/` (use the one that exists). Antigravity `~/.gemini/antigravity/skills/<skill>/` (global) or `.agent/skills/<skill>/` in the workspace. Other agents: run once instead.
4. Never edit the user's instruction files directly. The chosen skill does that, with its own confirmation.
5. Afterwards offer the next skill from the report; stop when they decline.

## Rules

- Absolute https URLs when pointing to skills.
- Recommend only skills in the live catalogue.
- Never claim what a skill does without reading its SKILL.md.
- Findings stay local.
