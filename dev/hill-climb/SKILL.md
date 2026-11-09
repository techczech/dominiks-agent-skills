---
name: hill-climb
description: Use to improve work against a score (rubric judges and/or a programmatic metric) in rounds until a target is met, or to score a set of options with independent rubric judges instead of a proposer's "recommended". Can be called by other skills or by hand; always ends in an HTML report of rubric, agents, per-criterion scores each round, what the implementer did, and time and cost.
---

# Hill Climb

Turn "make it better" into a hill: a score, a target, rounds. An implementer climbs; independent judges score; the owner sets the hill, supplies preference signal and gives the verdict.

Optional: if you keep your own panel defaults or report location in `references/local.md`, read it first; it overrides defaults here. Not shipped.

Terms: owner = the person the work is for, who gives the final verdict; implementer = the agent making changes; judge = a model call that scores; seat = one independent judge call (several seats can use the same model).

## Why (keep in mind when choosing anything below)

- Targets and feedback: models improve reliably when each round returns a score and reasons. "Get every judge to ≥9 on every criterion" beats a page of principles.
- Sutton's "bitter lesson": do not bottleneck quality on the owner's ability to articulate goals. Judges with broad taste score; the implementer searches; hand-written rules cap the result at what someone managed to write down.
- Human signal still counts: preferences, liked/disliked examples, reference products, corrections, decisions and vetoes enter as criteria, anchors, comparators, locked decisions and hard checks. The owner judges the result; model agreement is not the gate.
- Decisions: a proposer's "recommended" is one opinion from an interested party. Scores from fresh judges who did not write the options are a signal the owner can weigh.

## Modes

- Climb: one candidate improved over rounds (UI, prose, prompts, tool descriptions, performance, slides).
- Score: one round, no changes; options or drafts scored side by side. `references/decision-scoring.md`.
- Tournament (optional climb variant): two or three implementers, often cheaper models, each revise the same version; seats score the entries blind side by side plus pairwise; the winner carries forward and the losing entries are logged. Costs two to three times a round; use it to break a plateau or to compare implementer models. Do not merge entries: merged drafts come out incoherent.

Not prescriptive: fit judges, rubric size, rounds and budget to the stakes. The invariants are what make a score mean something.

## Invariants

Scores
- Programmatic score wherever one exists (tests, eval correct/total, tokens, layout violations, latency); judges for what code cannot measure. Run programmatic checks first: they are cheap and filter the round.
- Countable limits (word count, banned phrases, size) are hard checks or metrics, not judged criteria; judges score the quality behind them.
- Rubric before round 1, in the run log: criteria from human signal plus judge-derived ones; anchors for 3/6/9; optionally 2–4 yes/no checklist items per criterion answered with a quote or location. `references/rubric-design.md`.
- Every seat scores every criterion for every subject (candidate and comparators), plus overall, with a one-line reason each, every round. An overall alone is rejected.
- Pairwise next to absolute: each round one seat also compares current against previous version (random order, unlabelled) and says which is better and why. Use it for regression and plateau calls; absolute scores drift.

Judges
- Judges are not the implementer and did not write the options. Fresh context every round; same packet to every seat; subjects in a different order per seat; model, tool and author names masked.
- Never tell judges the target, the threshold, the round number or earlier scores.
- Comparators where possible (previous version, best-in-class, competitor). Isolation inflates scores. Comparator scores drift; report the gap, not only raw scores.
- Panel = seats; each seat one fresh call. Distinct models help but are not required: one model with two or more seats is a workable minimum; two models × two seats is a good default. Report spread between seats of one model as judge noise; same-model agreement is weaker evidence than cross-model agreement.
- Implementer family: seats from the implementer's model family (`same_family: true`) are scored and shown but never meet the stop rule alone; a seat from another family must also reach the threshold. With only one family available, add seats or a sister model and label the result weaker evidence.
- Outliers: a seat more than 1.5 from the panel median overall for two rounds running is flagged (`outliers`), kept visible and left out of the stop rule. One seat never steers the run.
- Cost staging allowed: cheapest judge until it reaches the threshold, then the rest.
- Ground judges in evidence: give measured facts (contrast, overflow, word counts, test results) in the packet; drop findings about things not in the evidence.

The ruler
- Freeze the ruler: the implementer never edits the scorer, rubric, checks or packet. Changes go through the orchestrator and are logged as rubric changes with reason; re-score round 0 after a change.
- Validate the ruler before round 1: the panel must rank a known-better version above a deliberately degraded copy. If it cannot, fix the rubric first.
- Hold-out: at least one check the implementer never sees, run at round 0 and at stop: a sealed judge seat, a reviewer outside the loop (code review, a different capture size, the owner's look) or a held-out programmatic check. A gap between visible and sealed scores signals Goodharting. Every miss it finds becomes a new check or measured case.
- Hard checks for what judges cannot see: preservation (owner's edits, approved text, figures and assets still present; diff against the owner's version), completeness against the source or evidence inventory, no regressions in tests. Judges score only what they are shown.
- Ground truth from the owner, not the agents: for factual work, give judges an owner-confirmed fact sheet (what actually happened, what was decided). Checking against the agents' own notes lets shared mistakes pass every round.

The owner
- Locked decisions: owner choices and cuts go in the packet as `rubric.locked`. Judges score around them, never deduct for them, and list any disagreement separately as "owner decisions to revisit".
- The implementer never makes an owner-level decision. It escalates it (`response.escalated`) and works around it.
- Owner verdict is recorded separately from judge verdict. Scores judge quality; "good enough" is the owner's call.

Rounds
- Each round changes only what the rubric covers; new ideas go to a later list.
- Act first on findings raised by two or more seats. A single-seat finding is acted on when it names a concrete defect with evidence (quote, location, measurement); otherwise log it as declined with the reason.
- Keep or revert: a change that does not beat noise (±0.5–1 on judged scores; repeated measurement for metrics) is reverted, not carried. Log rejected attempts.
- Plateau (two rounds without gain): offer one diversify round (different approach, or combine the best parts of two candidates per criterion) before stopping.
- Stop on: median seat ≥ threshold on every criterion and no counted seat more than 1 below (two seats: both within 0.5 and their mean ≥ threshold), at least one seat outside the implementer's family ≥ threshold, every hard check passes, hold-out agrees; or round cap; or budget cap; or plateau after the diversify round. Optional minimum-rounds floor so one lucky pass does not stop the run. Record which.
- Record each round in `run.json` as it happens: scores, reasons, pairwise result, implementer response (acted on, declined, escalated), before/after evidence, usage per call (start/end, tokens, cost and basis; unknown stays unknown).

## Dispatch

- If the harness can spawn inspectable child sessions (e.g. T3 Code delegates), use one per seat and one for the implementer, so each can be opened later; record its link, returned model and usage.
- Otherwise subagents (e.g. Claude Code `Agent`, Codex `spawn_agent`). Otherwise separate fresh API or CLI calls per seat, saving each JSON reply.
- Other providers' models through whatever API or CLI you have access to; e.g. a panel of one Claude model and one GPT model, two seats each.
- Judges that cannot write files return JSON as text; the orchestrator saves it raw before parsing.
- Seats in a round run in parallel; the implementer runs after all seats return.

## Procedure

1. Set the hill with the owner or caller: goal, candidate, comparators, metrics, threshold, caps. Ask only what is missing.
2. Collect human signal and locked decisions. Optional calibration: run the panel on 10–20 past items the owner already judged (earlier review answers count) and report agreement as hit rates on liked and disliked items; use the clearest as anchors.
3. Draft rubric and hard checks; validate the ruler (known-better vs degraded).
4. Name agents with requested models; record returned models from run metadata, not self-description.
5. Round 0: baseline and comparators, all seats plus hold-out.
6. Each round: implementer reads the per-criterion table and reasons, records its response, changes, captures before/after; programmatic checks; fresh seats score; pairwise; append to `run.json`.
7. Stop per invariants; hold-out at stop. Render the report and hand the owner the report and the verdict ask.

## Run log and report

- Home: the caller's project (e.g. `<project>/hill-climbs/YYYY-MM-DD-<slug>/` with `run.json`, `evidence/`, `report.html`). Never a temp folder.
- Format: `references/run-log.md`. Examples: `assets/example-run.json` (illustrative reconstruction of the source video's run from its narration; scores approximate; not affiliated with or checked by its author), `assets/demo-run.json` (synthetic: two models × two seats, comparator, responses, usage).
- Render: `python3 scripts/render_report.py <run.json> [-o report.html] [--no-embed]`. Stdlib only; images embedded by default.
- Report sections: rubric (human signal, locked decisions, checks, changes); agents and seats with requested/returned models and links; scores (chart, criterion × round, by-model mean and spread); per round the criterion × subject table, judge findings, pairwise, what the implementer did, decisions with text or screenshot evidence; time, tokens and cost; outcome with owner verdict.

## Pitfalls

- Goodhart: the implementer learns the judges, not the goal. Hold-out and owner's look are the defence; ensembles alone are not.
- Bland drift: everything sanded toward safe and grey. Owner preference becomes a criterion.
- Judges asking to undo owner decisions: that is what `locked` prevents.
- Locked decisions that give away the answer: in a before/after score, a locked list worded as the target design ("one Runs view", "Settings uses the writing style") tells judges which version is newer. Word locked items as what not to penalise ("the naming of deliveries is the owner's choice"), not as what the new version looks like. Found in a two-app panel where one judge said so outright.
- Revisions silently dropping approved text or assets: preservation checks, not judges, catch this.
- Measurement blind spots: states the scorer never captures (a panel open, a small window). Grow the measured set from every miss.
- Context inflation: a judge that saw earlier rounds or the implementer's notes.
- Weak or erratic judge: keep its scores visible, out of the stop rule, say so (the outlier rule).
- Self-preference: judges from the implementer's family may favour its style. In one paper run the same-family judge was in fact the harsher one; the family rule guards the general case.

## Credit

Method adapted from Theo (t3.gg), "Agents Sucked At UI (Until Today)", YouTube `xq0eB8vxeqk`, Nov 2026 (read from its transcript). Further sources and what each contributed: `references/prior-art.md`.
