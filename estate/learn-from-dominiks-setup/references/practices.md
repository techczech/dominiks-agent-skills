# Practices from Dominik's setup

Skills: https://github.com/techczech/dominiks-agent-skills. Raw base: `https://raw.githubusercontent.com/techczech/dominiks-agent-skills/main/`. Confirm each skill and its `needs` in the live catalogue before recommending.

| Practice | Looks like | Skill (path) | Already doing it if |
|---|---|---|---|
| Same instructions in every agent | One canonical payload; each tool's global file points to it | `global-agent-instructions` (estate/) | Claude, Codex, Antigravity files share content or import one file |
| Short trigger-first instruction files | "When X, read Y"; detail one hop away; immediate-harm rules inline | `agents-md-streamline` (estate/) | Instruction files are short, no history or examples, routes to files |
| Agent fitted to how you think and write | Written profile of preferences, writing style, how to report | `ai-working-style-builder` (estate/) | Instruction files state how you want answers, tone, report shape |
| One hub where every session starts | Hub repo with registry of projects, backlog, handoff notes, lessons log | `coordination-hub` (estate/) | A known first file or folder routes agents to projects; handoff notes exist |
| Decide who a text is for before writing | Name the reader (agent, user, you-as-author) and write to it | `writing-modes` (philosophy-for-agents/) | Agent files are terse; chat replies are plain; the two differ |
| Plain literal prose | Say what you mean; no mannered phrasing | `expository-writing` (philosophy-for-agents/) | Instructions forbid slogans, contrast-for-effect, filler |
| Planner hands building, fixing, review, testing to other models | Roles by task type; planner does not build | `agent-roles` (estate/) | Rules say which model or agent plans, builds, reviews, tests |
| One place to answer review and test requests | Agents file requests; you answer in one inbox | `dev-traffic-control` (dev/); needs Dominik's DTC app | You have a review or test inbox, not chat checklists |

Evidence cues: files named `AGENTS.md`, `CLAUDE.md`, `now.md`, `backlog`, `registry`, `lessons`, `handoff`; skills dir entries; symlinks between agents' instruction files.
