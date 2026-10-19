# coordination-hub

An agent skill that sets up one hub repo where every agent session starts. The hub routes to your areas of work (domains), and the domains route to your project repos. Around the hub it sets up a backlog, handoff notes, a repo registry, a way to turn your corrections into standing rules, a lessons log, and rules for how agents report to you.

My key benefit is that I don't have to remember where the many projects I'm working on are.

## The problem

I run many projects and often several agent sessions at once. Each session starts with no memory of the others. Without something to hold the whole picture, I have to remember which repo a project lives in, what state it was left in, which machine has the uncommitted changes and what I told the last agent. When I forget, a new session works in the wrong clone, repeats research that was already done, or re-opens a decision that was already made.

## The key benefit: you don't have to remember where your projects are

Every session starts in the hub, whatever project I have in mind. The hub knows three things:

- **The domains.** Each domain is an area of work, such as writing, teaching or apps. Its `AGENTS.md` says what the domain covers, where its work lives and what a session must read first.
- **The repos.** `repo-registry.md` is one table with a row per repo: where it lives on disk, its remote, which domain it belongs to and what it is for. Agents read this table instead of searching the disk.
- **The latest handoff.** `.remember/now.md` says what is in flight in each project, what is blocked on me and which files another session is editing.

The routine repo state check runs over every row of the registry. It reports, for each repo on the machine in front of me, how many files are uncommitted, how many commits are unpushed or not yet pulled, and whether any extra worktrees exist. When a repo has diverged, the agent stops and asks. So the answer to "where is that project and what state is it in" is a question for the hub, and I don't have to hold it in my head.

## Other benefits

- **A new session picks up cold.** Handoff notes live in the hub, not in each project repo, because a fresh session cannot know which project repo to open but always opens the hub. Notes are written for a reader with no memory of the conversation and name the project path.
- **Nothing started is forgotten.** Every substantive session begins by capturing one line in the backlog. Captures that turn out to be real work are promoted to tasks with an owner, a status and a next step. A task is closed by a receipt (proof of what was merged, sent or decided), not by an agent saying "done".
- **Decisions are recorded once.** A decision that is hard to reverse, surprising without context and a real trade-off gets a numbered ADR (architecture decision record) that lists the options and why each lost. Later sessions read it instead of re-arguing it.
- **Corrections become standing rules.** When I correct an agent, the correction is captured with its evidence. A short gate decides whether to promote it to a rule: now if the failure was dangerous, destructive, privacy-sensitive or costly, after recurrence if it keeps happening, never if it was specific to one task. A promoted rule goes to the smallest scope that holds it: one repo, one domain, a skill, an ADR or the global instruction file.
- **Lessons are not re-researched.** A lesson entry records a reusable fact, process or failure mode, with the sources consulted archived verbatim. Agents search the lessons index before researching.
- **Agents report in a predictable way.** Every message stands alone and starts with `Action required: <verb + thing>` or `No action needed`. It ends with my next move. Questions carry their context and a recommendation, there are at most four per message, and decisions go to a review queue instead of chat.
- **Work moves safely between machines.** Before leaving a machine, authorised work is committed and pushed. Before starting, repos are pulled fast-forward only. One session writes in one working tree; a second session uses its own worktree. The session-end checkpoint stages files by name, never with `git add -A`, and reports anything left uncommitted and why.

## How a day works

1. I open a session. The agent captures one line in the backlog saying what the session is for.
2. The agent reads the hub's `AGENTS.md` and `.remember/now.md`, pulls the repos it will touch and runs `scaffold_hub.py --status` to see what is uncommitted or unpushed.
3. It picks the domain, then reads that domain's `AGENTS.md` and its newest `_TASK-LOG/` entry.
4. It works in the project repo, which has its own `AGENTS.md` for repo rules.
5. When it needs a decision from me, it puts the question in the review queue (skill `dev-traffic-control`).
6. At the end it commits and pushes the authorised work, rewrites `now.md`, adds a receipt or checkpoint to the backlog task and logs the task's state in `_TASK-LOG/`.
7. If I corrected something during the session, it runs the self-healing steps. If it found something reusable, it writes a lesson.

## What you set up

```
<hub>/
  AGENTS.md              first move, routing, constraints
  CONTEXT.md             glossary
  COORDINATION-MAP.md    generated: domain list
  domains.json           machine-readable domain list
  repo-registry.md       one row per repo
  _ADR/                  numbered cross-domain decisions
  .remember/             handoff notes: now, today, recent, archive
  <domain>/
    AGENTS.md            scope, routes, rules for that domain
    _TASK-LOG/           one file per task
```

Two more parts sit outside the hub:

- **A backlog** (default `~/projects/backlog/`): `events/` holds one never-edited file per capture, `tasks/` holds promoted work with checkpoints and receipts, and `views/` holds generated lists of the inbox and open tasks.
- **A lessons log**: `lessons.jsonl` is the index, and each entry has a short `README.md` and a `sources/` folder.

The hub holds governance only: no application code and no content corpus.

### The scaffold script

`scripts/scaffold_hub.py` uses only the Python standard library.

- `python3 scripts/scaffold_hub.py ~/projects/hub --domains writing,teaching,apps,admin` creates the hub files above from the templates in `assets/templates/`, one folder per domain. It never overwrites a file that already exists; it prints `skip (exists)` instead. Add `--dry-run` first to see what it would create.
- `--check` verifies that each domain folder has an `AGENTS.md` and a `_TASK-LOG/`, that the map lists every domain, and that the hub has `AGENTS.md`, `repo-registry.md` and `.remember/now.md`.
- `--status` reads `repo-registry.md` and prints, for each repo, the number of changed files, commits ahead of and behind its upstream, extra worktrees, and a divergence warning when it is both ahead and behind.

The script does not create the backlog or the lessons log. `references/backlog.md` and `references/lessons-log.md` describe their layouts.

## Related skills

All are in this collection.

- `global-agent-instructions`: one canonical global instruction file across agent tools; it hosts the first-move rule.
- `agent-roles`: who plans, builds and reviews.
- `dev-traffic-control`: the review queue for decisions and checks.
- `writing-modes`: the register for agent-facing and user-facing text.
- `expository-writing`: plain, literal prose for reports.
- `agents-md-streamline`: keeps `AGENTS.md` files short.
- `ai-working-style-builder`: captures your working preferences for agents.

## How to use it

Put the folder where your agent looks for skills (or symlink it there) and ask it to set up a coordination hub. The agent follows `SKILL.md`. In outline:

1. It asks you for a hub path, a backlog path and three to six domains.
2. It runs the scaffold script with `--dry-run`, then for real.
3. It fills in the hub and domain `AGENTS.md` files and lists every repo you use in `repo-registry.md`.
4. It creates the backlog.
5. It adds the first-move rule and the talking rules to your global instruction file (see `global-agent-instructions`).
6. It runs `--check`.

## What is in this folder

- `SKILL.md`: the set-up order and the daily loop.
- `references/`: hub layout, backlog, handoff notes, self-healing, lessons log, talking to the user, and repo registry and sync.
- `assets/templates/`: the hub and domain `AGENTS.md`, `now.md`, task log entry, ADR, lesson entry, `domains.json` and repo registry.
- `scripts/scaffold_hub.py`: scaffold, `--check` and `--status`.
