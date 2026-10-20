# learn-from-dominiks-setup

An entry point to my skills collection. Your agent looks at how you have set it up, compares that with practices from my setup, and tells you which two or three are worth trying.

## The one thing to do

Copy this line into your agent:

```
Read https://raw.githubusercontent.com/techczech/dominiks-agent-skills/main/estate/learn-from-dominiks-setup/SKILL.md and follow it.
```

Nothing has to be installed first. If you would rather keep it, you can also install it as a normal skill, but that is optional.

## What happens

1. **The agent looks at your setup and changes nothing.** It works out which agent it is running in, then reads the setup you already have (see below).
2. **It compares what it found with the practices below.** Each one is scored as already doing it, partly, not yet or unknown.
3. **It reports.** You get two to four things you already do well and two or three changes most worth trying, each with one sentence on why it suits you. It does not list every skill, and it leaves out skills that need something you do not have (an app, an account or macOS).
4. **It asks which to try first and recommends one.** Only when you say yes does it fetch that skill. You choose between installing it, with the exact path shown and a question before anything is written, or running it once with nothing installed.
5. **It never edits your instruction files itself.** The skill you chose does that, with its own confirmation.

## What it reads

- Your global instruction files, such as `CLAUDE.md`, `AGENTS.md` or `GEMINI.md`, and the ones in the current directory. It notes which exist, how long they are, whether they share content and whether they are long prose or short triggers.
- The names of the skills you have installed. Names only.
- Roughly how many project directories you have and where they live. It counts them and does not open them.
- Signs of a hub, a backlog, handoff notes, a lessons log, a review inbox and rules for which model does what.

It never reads or prints secrets, environment files, token files or credentials, and reports only whether a practice is present, not what your files say. Anything outside your agent configuration and the current directory, it asks about first. Nothing about your setup is sent anywhere.

## Which agents

It works in agents with file access, such as Claude Code, Codex and Antigravity. In a chat app with no file access it skips the inspection and asks four to six questions instead: which agents you use, whether you keep a written instruction file, how many projects run at once, where sessions start, who reads what the agent writes and whether you use different models for planning, building and review.

## Or just ask

You can also ask it "which of Dominik's skills fits X". It then skips the inspection, matches your situation against the catalogue, reads the candidate's `SKILL.md` and tells you what it does.

## The practices it compares

| Practice | Skill |
|---|---|
| Same instructions in every agent | [global-agent-instructions](https://github.com/techczech/dominiks-agent-skills/tree/main/estate/global-agent-instructions) |
| Short, trigger-first instruction files | [agents-md-streamline](https://github.com/techczech/dominiks-agent-skills/tree/main/estate/agents-md-streamline) |
| An agent fitted to how you think and write | [ai-working-style-builder](https://github.com/techczech/dominiks-agent-skills/tree/main/estate/ai-working-style-builder) |
| One hub where every session starts | [coordination-hub](https://github.com/techczech/dominiks-agent-skills/tree/main/estate/coordination-hub) |
| Decide who a text is for before writing it | [writing-modes](https://github.com/techczech/dominiks-agent-skills/tree/main/philosophy-for-agents/writing-modes) |
| Plain, literal prose | [expository-writing](https://github.com/techczech/dominiks-agent-skills/tree/main/philosophy-for-agents/expository-writing) |
| A planner that hands building, fixing, review and testing to other models | [agent-roles](https://github.com/techczech/dominiks-agent-skills/tree/main/estate/agent-roles) |
| One place to answer review and test requests | [dev-traffic-control](https://github.com/techczech/dominiks-agent-skills/tree/main/dev/dev-traffic-control) (needs my DTC app) |

The full table, with what each practice looks like and how the agent recognises that you already do it, is in `references/practices.md`.

## Inspiration

Matt Pocock's [setup-matt-pocock-skills](https://github.com/mattpocock/skills) inspired this entry point.

## What is in this folder

- `SKILL.md`: the steps the agent follows.
- `references/practices.md`: the practices table.
