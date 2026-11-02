---
name: agent-roles-review
description: "Use to set up, or periodically review, which models and agents plan, build, fix, review and test your work, worked out from how you actually work, what you pay for and what has gone wrong."
---

# Agent Roles Review

Help an operator (the person driving the agents) decide who does what: which model orchestrates, builds, fixes, reviews, tests and writes, how work is handed over, and what gets checked by whom. The result is the operator's own roles file, written so an orchestrating agent loads it before every delegation.

Two modes:

- **Setup:** no roles file yet. Build one from the operator's work, tools and budgets.
- **Review:** a roles file exists. Re-test each seat and rule against new models, prices, plans and recent incidents; propose dated changes.

If `references/local.md` exists, read it first: it names the live roles file, its decision log and local evidence sources, and overrides this file where they differ.

## Read first

- `references/principles.md`: the reasoning every role choice is tested against. Each principle says why it holds and how to tell whether it applies to this operator.
- `examples/one-operator-2026-10/`: one real roles file with its dispatch detail and cost evidence. Use it to show what a finished file looks like; never copy its seats, which are one operator's at one date.

## Setup

1. **Inventory.** List the harnesses, models, subscriptions and meters the operator actually has, and how each meter is read. Ask; check installed CLIs where you can. Note which models they want used only on request.
2. **How they work.** Run the interview in `references/interview.md`, at most four questions at a time, starting from what they already said. Establish: kinds of work, what they can see and judge themselves, what a failure costs where, how they review, how much time they will spend checking.
3. **Evidence.** Gather what exists (`references/evidence.md`): usage meters, past transcripts, failed builds, review rounds, bills. A new operator has little; say so and pick defaults to test, not conclusions.
4. **Draft the roles.** Apply `references/principles.md` to steps 1–3. Fill `references/roles-file-template.md`. For each seat write the role, the model, the command or agent type that launches it, and one line of why, tied to a principle or a piece of evidence.
5. **Decision log.** Start a dated log beside the roles file: one entry per rule, with the evidence or the operator's words that produced it. Rules without a reason get relaxed by the next agent that finds them inconvenient.
6. **Install.** Put the roles file where the orchestrator loads it before delegating (a skill, or a file the global instructions point to). Keep machine paths, accounts and private project names in a local layer, not the shareable file.
7. **Set the next review.** A date (about every six weeks) and triggers from `references/evidence.md` § Triggers.

## Review

1. Read the current roles file, its decision log and the pinned date on its seat table.
2. Collect what changed since that date: new models and prices, plan limits, meter readings, incidents, the operator's corrections in recent sessions (`references/evidence.md`).
3. For each seat and each rule, ask: does the reason in the log still hold? Is there evidence it is costing time, money or defects? Would a principle now pick differently?
4. Measure before proposing where you can: subagent starting context and cache waste (`scripts/subagent_sizes.py` for Claude Code transcripts), test-run counts and durations, review rounds per change. One measurement beats a remembered impression.
5. Present proposals to the operator, each as: current rule, proposed change, evidence, expected effect, what would show it was wrong. Seat changes and anything that spends money are the operator's decision.
6. Apply what they approve: update the seat table and its pinned date, add a dated log entry per change, refresh anything that copies the table (global instructions, example snapshots).
7. Record what was reviewed and left unchanged, so the next review does not repeat it.

## Rules for the process

- Decisions about what the operator values, spends or checks are theirs; technical routing within those limits is yours.
- Prefer one model per role over lists of alternatives; name the fallback when a provider is out.
- Pin a date on every model-specific table. Name models in standing text by tier (builder, fixer) so a release changes one table, not the whole file.
- Keep the roles file short enough to load before every dispatch; move long briefs, cache mechanics and evidence into references.
- A principle that does not fit this operator is dropped with a logged reason, not kept as decoration.
