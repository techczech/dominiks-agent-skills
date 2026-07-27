# Routing Rules

Where does a new note belong? Walk this list top-to-bottom and stop at the
first match. If multiple apply, the earlier bucket wins.

## The decision tree

1. **Does the note lock a design or policy choice that should constrain future
   work?** → `decisions/`

   A decision is durable. It states "we chose X over Y and here is why." If
   you would cite this note in a later PR review to explain a constraint, it
   is a decision.

2. **Did something concrete happen — code shipped, data migrated, a rollout
   completed, a structural cleanup performed?** → `changes/`

   A change is a narrative record of executed work. If a colleague asked
   "what did we do about X?" and this note is the answer, it is a change.

3. **Is the note a grouping of multiple changes under a named milestone or
   initiative?** → `phases/`

   A phase is a container. It summarizes what was achieved in a bounded
   period or workstream. If the note reads like a table of contents for
   other entries, it is a phase.

4. **Is the note about work that is not yet done — proposed, planned,
   in-progress, or deliberately deferred?** → `backlog/`

   A backlog item is future- or present-tense. It describes an objective,
   acceptance criteria, and status. See `backlog-states.md`.

5. **Is the note a one-line summary of a repeatable pipeline run?**
   → append to `logs/worklog.jsonl`

   The worklog is for deterministic runs of scripts. Do not put prose or
   decisions here. See `worklog-conventions.md`.

## Tie-breakers

- A change that also locks a policy choice: write both. The decision cites
  the change as `implemented_by`; the change cites the decision as
  `implements`.
- A PRD, architecture doc, or phased plan that stays in `reports/` or `docs/`
  is not itself a changelog entry. Create or update a `decision`, `phase`, or
  `backlog` entry that points at it via `artifacts`.
- A backlog item that is actually already done: demote to `changes/` and
  delete the backlog stub, or — if the backlog item carries useful planning
  context — keep it with `status: done` and add `refs.resolved_by` pointing
  at the change.
- An ad-hoc debugging note with no durable value: do not add it. The commit
  message is enough.

## What does NOT go in `changelog/`

- Code. Keep code in its owning directories.
- Full PRDs, architecture docs, or planning packs. Keep them in `reports/`,
  `docs/`, or another repo-local planning folder and link them via
  `artifacts`.
- Generated reports. Put them in `derived/`, `build/`, or a run-artifact
  folder. The changelog can link to them.
- Long warning or error arrays. Reference a path instead.
- Agent transcripts, chat logs, or prompt histories. These belong in tool-
  specific folders, not in project history.
- Personal scratch notes. Use `scratch/` or your own notebook.

## What about `README.md` and `AGENTS.md`?

Two files stay at `changelog/` root. They describe the folder itself:

- `changelog/README.md`: human-facing description of the buckets
- `changelog/AGENTS.md`: agent-facing routing rules (a short pointer to this
  skill plus any project-specific overrides)

`build_index.py` writes `changelog/INDEX.md`, which lists every tracked entry.

## Planning-bridge routing

When a repo already has a planning bundle outside `changelog/`, use this
mapping:

- PRD or product spec → stays external; summarize durable constraints in
  `decisions/` only if they actually lock future work
- architecture doc → stays external unless it is itself the durable decision;
  if it is, write a `decision` entry that points at it
- phased implementation plan → one `phase` entry per phase
- ticket pack or structured backlog markdown → one backlog entry per ticket
  in `backlog/`

Use `artifacts` to link back to the source planning docs. The canonical
execution layer lives in `backlog/`, not in the external planning pack.
