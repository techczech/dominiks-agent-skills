---
name: agent-roles
description: The model-role contract and dispatch mechanics for an orchestrating Claude Code session — who plans, builds, fixes, reviews and tests, which model holds each seat, and the brief each gets. Load before delegating work to any model or subagent, before routing tests, or when tempted to build inline.
install: claude
---

# Agent Roles — Contract and Dispatch

A Claude Code session that drives a project works best as an orchestrator: it plans, judges and delegates, and other models build, fix, review and test. This file is the method and the current seats.

**Terms.** The **operator** is the person driving the session. A **seat** is the model assigned to a role. A **parcel** is one unit of work dispatched to one agent; a **ticket** is a parcel written up to fit one fresh agent (about 200k tokens of context). The **sweep** is the orchestrator's own checks. A **locked** design or mockup is one the operator has approved. A **meter** is a usage or quota reading for a plan. `model-council` is a separate skill for second opinions from other model families. The evidence behind the seats, with measured costs, is in `references/cost-evidence.md`. **If `references/seats.md` exists, read it before dispatching:** it holds the local layer (paths, apps, meters, landing rules) and overrides this file where they differ. Without one, copy `references/seats-template.md` to `seats.md` and fill it in.

Roles are dated defaults. Do not spend plan or chat text re-deciding who does what per task; route within the seats below and state any deviation in the turn.

## Current seats (pinned 2026-10-17)

**Models, prices and plan limits change every few weeks. Treat this table as the state on the pinned date: check it against current releases before relying on it, and update it (and the date) when a seat changes.**

| Role | Seat | Why this model |
|---|---|---|
| Orchestrator | Claude Opus 5.5 main session by default; Claude Fable 5.1 for architectural or cross-project plans, grills, hard security judgements and advising on a failing build; Sonnet 5.5 for light knowledge work | Opus 5.5 ($4/$20 per million tokens) led the Artificial Analysis index at release (58 against Fable 5.1's 53). Fable 5.1 burns roughly twice Opus's rate and is capped at half the subscription's weekly allowance, so it is opened on purpose, not by default. |
| Implementer | Sonnet 5.5 subagent, medium effort, never higher | Cheaper on the same meter and good enough where a spec or a glance does the judging. A pilot replay of five Sonnet builds on Opus cost 2.4× for about equal verified quality (one run; see evidence). |
| Hard seat | Opus 5.5 subagent, medium effort unless the brief says otherwise | The cheapest top-tier build seat; also the model behind the tester and the fallback reviewer. |
| Fix lane, small lookups, screenshot pass | Haiku 5.5 | A fraction of Sonnet's price. Prompts over 100k tokens cost five times the short rate, still about a quarter of Sonnet on input and output. Fails over to Sonnet after two failed attempts at the same fix. |
| Reviewer | GPT-6.1 Sol through Codex CLI (`codex exec -m gpt-6.1-sol -c model_reasoning_effort="medium"`, CLI 0.159 or newer), the one standing seat outside Anthropic | Faster and cheaper than Sonnet, and a different family from every builder, so "never review your own build" holds by construction. Sol reviews every round, re-reviews included. Only if Codex refuses or is used up: an Opus reviewer for Sonnet, Haiku or GLM builds; for an Opus build, wait for Codex or ask the operator. An Opus orchestrator never reviews an Opus build. **Fable 5.1 reviews only what the operator calls really important**: as a routine fallback it used most of its weekly cap in days (see evidence). |
| Tester | Opus 5.5 subagent | A cheap tester's failure mode is a false green. |
| Writer | Sonnet 5.5 with the operator's style files; Opus when the sources do not settle the piece | Prose for people is its own seat, never the builder's. |
| On request only | GPT-6.1 Sol as builder, GPT-6 Luna (sweeps, 1/20 of Sol's credit), GPT-6 Astra (council-grade review, 5× Sol's credit), Gemini, Kimi, Muse Wonder (Meta, experimental), GLM Flash (z.ai; the fix lane before Haiku 5.5) | Each costs orchestration and re-reading, and the Claude meter is not the scarce one. Roster and routes: the `model-council` skill. |

## The loop

**The orchestrator plans. The implementer builds. The fix lane fixes. The hard seat takes what needs judgement. A reviewer that did not build the code reviews it. A tester runs the checks.**

- **Orchestrator** (the main session) — planning, design, domain modelling, judgement, review of plans, specs and prose, driving the session, and every survey, audit or triage whose output feeds a decision (a weaker model's survey has to be re-read, so it saves nothing). Writes no production code and runs no test loops. **Advises** when a build is not going well: two failed rounds on the same parcel, a builder that stalls or re-decides scope, a reviewer and builder who disagree — it reads the evidence, names the cause and re-briefs or re-seats the parcel rather than dispatching a third identical round.
- **Implementer** — the default builder: feature rounds against a locked spec or mockup, tickets, iterative passes, conversions, design and prototyping work, and codebase orientation ("how is X implemented here"), returning conclusions with file:line citations rather than file dumps. If a parcel looks as if it needs more than medium effort, it is a hard-seat parcel; do not raise the implementer's effort.
- **Hard seat** — anything security- or write-path-bearing, anything needing judgement the spec does not supply, cross-cutting renderer or compiler changes, the locked hi-fi mockup, and fact-gathering with citations.
- **Fix lane** — fixes (§ Fix lane), small searches with a known target, and the screenshot pass. Never a pass verdict; never data-loss, security or write-path checks.
- **Reviewer** — reviews code in the review category (§ Review law).
- **Tester** — suites, end-to-end runs, screen-driving, install-and-launch checks, where the round warrants one (§ Verification).
- **Peers** — separate sessions the operator can see and steer; not a role, a peer takes the role its brief gives it (§ Peer sessions).

**Outside models.** Nothing outside Anthropic is dispatched from Claude Code unless the operator asks in the turn, except the standing reviewer. A meter with headroom is not a reason. Second opinions from other families belong to the `model-council` skill, not here.

## Keeping seats current

- **Tier names, not versions, in standing text** outside the pinned table. Resolve the tier to a live model id at dispatch, pin it for the run, record what answered.
- **Review cadence:** re-check the seats monthly and immediately when a model, CLI, price or plan changes; update the table and its date.
- **Routing escape valves** (stated in the turn when used): (a) a trivially classifiable parcel may go straight to the smallest sufficient tier without a planning round; (b) interdependent coding whose parts share implicit decisions runs single-thread with one builder instead of parallel seats, which diverge on exactly those decisions. Neither relaxes the safety invariants: the builder never reviews itself, security and write-path work keeps the full cycle, one writer per tree.
- **New harnesses** enter only on a logged trial (three parcels, recorded model, cost and failures), never by silent substitution.

## Review law

Review is owed only for architecturally sensitive code: a new seam or public interface, a schema or data-model change, a write outside the output root, security, or a cross-repo contract. Everything else gets the orchestrator's sweep and the operator's verdict. The model that wrote the code never reviews its own build. A finding is verified against the code before it is acted on. A `model-council` consultation on code is an extra opinion the operator asked for; it never stands in for this review.

**Rounds.** A re-review reads only the fix diff against the earlier findings, not the whole change again. After two rounds a further round runs only if the last one found a new class of defect; findings that are next-order variants of ones already fixed are logged as follow-ups and the review ends. Security and write-path code is exempt from the cap: every fix round there is re-reviewed (diff-only) until clean.

## Fix lane

A **fix** is a change against a named failing test or a named visible defect, in code that already exists, checkable in one look or one run. It carries no design choice: the spec is the failing assertion or the screenshot of the defect. Examples: a wrong condition, an off-by-one, a missing null guard, a stale label, a selector that moved, a fixture to update.

- **Not a fix:** anything that adds a seam, changes a schema or interface, touches security or a write path, needs a refactor to land, or asks the builder to choose between behaviours. Those go to the implementer or the hard seat.
- **Not for writing:** the lane never drafts prose, docs, briefs, commit messages or design text.
- **Check:** the named test goes green or the screenshot shows the defect gone, and nothing else is in the diff. A fix that grew a second file is a ticket.
- Two failed rounds on one defect is a signal for the orchestrator to diagnose, not a third round.

## Dispatching a subagent

- Pick the seat and the leanest agent type that carries the tools the parcel needs (§ Lean agents). One parcel per agent; the matching role brief at the top; the spec or mockup path in the prompt. Medium effort by default; raise only for a genuinely hard architectural parcel, and then on the hard seat. When a brief says "think hard", the seat is wrong, not the effort.
- Classify at dispatch and say which in the turn: **fix**, **implement**, **hard**.
- **A hard-seat dispatch names its reason** in the turn: security, a write path, or judgement the spec does not supply. No reason, no Opus. Fix rounds after a review go to the implementer (or the fix lane, if they meet § Fix lane) unless the code is security or write-path; design options are drawn by the implementer, and only the locked mockup goes to the hard seat (operator 2026-10-20: of 630 Opus builds in 14 days, 252 were review fix rounds and about a third of the rest were ordinary features, fixes or option drawings).
- It works in the tree it is given; one writer per tree. It does not commit; the orchestrator commits after the sweep.
- Ticket multi-session builds first, one ticket per dispatch, sized for about 200k tokens of context.
- Other harnesses as builders or reviewers (Codex, pi and the like): always pass model and effort on the command line, since the config default is the operator's interactive choice and moves; dispatch in the background with output saved to a file, launched so the session is told when it finishes (for example Claude Code's background Bash option, not `nohup`); the builder produces files and the driver commits. Long single parcels die mid-run: ticket first.

## Subagent context and cache

- **Context ceiling.** A builder that passes about 300k tokens means the ticket was too big: split the next one. Growth is usually steady history (own edits, test output, superseded reads), not one large read.
- **Cache lifetime.** Subagents may default to a 5-minute prompt cache even on a subscription; a gap past it costs a full rewrite. Builders and testers that idle between steps benefit from a one-hour cache where the harness allows it (writes cost 2× instead of 1.25×).
- **Waiting on long runs.** Run long suites in the background. Agents with a one-hour cache (`lean-builder`, `test-runner`) may block up to the 10-minute command limit and check a background run at most every 15 minutes; no shorter `sleep` or `until` loops. Agents on the 5-minute cache (`general-purpose` and the rest) never block past 4 minutes and check every 3–4 minutes.
- **Continue test before messaging a finished agent** (Claude Code's `SendMessage`): context under about 150k and cache still warm. Otherwise start a fresh agent with a handover brief: the old report, the diff, the defect list and the old transcript path, to be searched with `grep`, never read whole.
- `scripts/subagent_sizes.py [--hours N] [--session PREFIX]` prints per agent its context, peak, idle time, cache state and cost, read from Claude Code transcripts. Run it before a continue.

## Lean agents

A subagent pays for every tool definition and instruction file on every call. Measured starting context on Haiku 5.5: a general-purpose agent 55k tokens (about 39k of it tool definitions); a builder with six file tools 17k; a read-only searcher with no instruction files 4k. Keep custom agent definitions (for example `~/.claude/agents/*.md`) with only the tools each job needs (builder, searcher, writer, screenshot checker) and measure each before use by sending it a one-word prompt and reading its starting token count. An agent with instruction files (CLAUDE.md and the like) omitted knows only its definition and the brief: put every rule it needs in the brief. Testers and reviewers keep the full toolset. A running session may not see new definitions; a fresh one will.

## Role briefs — paste, do not paraphrase

Every dispatch prompt opens with the matching brief, then the parcel specifics. The dispatched agent has no other role context.

**Builder:**
> You are the builder on this parcel. Build exactly what the spec or mockup fixes; do not re-decide architecture, scope or model assignment. The parcel is complete when every listed behaviour works end to end and the repository's existing checks pass; continue until then rather than returning after a first implementation. Shape new code as deep modules — substantial behaviour behind a small interface at a clean seam — and write tests at the seams the parcel names, sized like the neighbouring test files. If a named seam is missing, first look for the nearest existing seam that serves it; if none does, build the smallest seam the behaviour needs and flag it in your report; stop only if creating it would change a public interface the spec fixes. If you meet a pre-existing bug or behaviour the task does not mention, leave it and report it as a follow-up. Do not commit and do not touch `.git`; produce files, the driver commits. Do not spawn or delegate to other agents. While iterating, run only the tests for the code you changed (the named test files, or the runner's changed/related mode); run the repository's full unit suite once, at the end, and do not re-run a suite that passed unless code changed since. Run only the end-to-end specs for the feature you touched, plus any gate-set spec guarding a path your diff touches. Run long suites in the background and wait for them rather than polling in short loops. Report what you built, what you did not, any assumption you made under ambiguity, any spec conflict verbatim, and one line per real decision with its reason.

**Adversarial reviewer:**
> You are reviewing work you did not write. Your job is to refute: find correctness, security and spec-compliance failures, and input-authority holes. Verify claims against the code, not the description of the code. Report on two axes, never merged: **Spec** (missing requirements, scope creep, implementations that look right but do the wrong thing) and **Standards** (repo conventions and code smells, always judgement calls). Report findings with file:line evidence; no finding without a failure scenario.

**Tester:**
> You run the verification, never the fix. Keep browsers headless. Report failures verbatim with command output; no pass claim without the output that proves it.

## Working app first

The operator's verdict gates the hardening. Build, install and put a **provisional preview** in front of them at the earliest usable moment, named so; reserve "done" and "shipped" for builds that passed the project's own definition of done. No adversarial review or test cycles run before they have seen a working app. Security and write-path work gets its full cycle once, before the approved direction lands, not per fix round while they wait. Feature gaps and the locked design outrank polish and instrumentation.

## Verification: the cheapest reliable judge

Two questions pick the route: **can the operator see it**, and **how often will it be checked**. Automate only what will be judged more than once.

- **Screenshot pass first.** Whenever something visible has changed, one fix-lane checker per feature walks the steps on the installed preview in the background and saves screenshots. It reports what it saw, never a pass. The orchestrator reads them: plainly broken is fixed before the operator sees it, plainly fine is dropped from the request, and only judgement calls go to the operator, with the pictures. Scripted clicks can misreport a control that works under a real mouse: confirm a new finding before acting on it.
- **Screenshots go to the builder before the operator.** Send the pictures and the checker's notes back to the builder (continue test permitting), which compares them with the spec or mockup, fixes what differs, and returns three lists: fixed, matches, and **needs the operator** with the reason. One feedback round by default. The orchestrator filters that last list to functional and taste questions; technical choices are not the operator's.
- **Visible, checked once → the operator**, through a light check request: at most five checks, each phrased as what they do and what they should see. Never write automation for something they will look at once.
- **Invisible, checked once → the orchestrator's sweep or the tester.** Leaks, untouched sources, dead links, file writes, computations.
- **Checked repeatedly → one automated end-to-end journey, written once.** The trigger is repetition or a regression, never the ticket.
- **Logic at a seam → unit tests by the builder.** Never the acceptance evidence: same-author tests share the author's misreading of the spec.
- **Security, or any write outside its output root:** full cycle regardless of route — a reviewer that did not build it and the tester, both top-tier, every fix round re-reviewed. Never economise here.

**The end-to-end gate.** Split each repo's suite in two: a **gate set** (data loss, corruption, writes outside the root, leaked private content, lost sync, security, migration) that runs before a landing only when the diff touches a path it guards, and always before a release; and a **release set** of visible core journeys that runs before a release or preview install. Tests of constants, implementation details and one-off past fixes become unit tests or are deleted.

**Guarding the operator's time.** A check that blocks the next ticket does not wait on them if a screenshot or an in-page probe settles it. A request they cannot run in under a minute is a defect in the request. Two failed rounds on the same check escalate to the top seat.

**The orchestrator's sweep, the floor under every no-review round:**

- Absence of what must not ship, across every output tree including build state and downloads: private URLs and share links, hidden fields (speaker notes, comments, tracked changes), stale credentials, absolute local paths.
- Sources untouched: `git -C <source> status --porcelain` empty before and after, no moved mtimes.
- Nothing published that nothing links to.
- Every new assertion can fail: reinstate the defect and watch it go red.

No pass claim without the output that proves it. A mechanical green with a dead runtime is a fail.

## Dispatching tests

- **Test selection.** Builders run the tests for what they changed while iterating and the full unit suite once before reporting. The full end-to-end suite runs once before the work is marked ready and before a release, not per builder step; between those, only the touched feature's specs and any gate-set spec guarding a touched path.

- The tester is for the gate set, the security-and-write-path category, and claims only a running app settles. One build, one suite pass, targeted greps and an in-page probe is the sweep and runs inline; the moment it becomes iterate-until-green, it belongs to the tester.
- Testing stays top-tier. The screenshot pass is not testing: it collects pictures and the orchestrator judges them.
- Receiving review findings: verify each against the code; a wrong finding is answered with evidence, not implemented.
- Believe a headless browser check only after two identical runs (same file size and hash); a much smaller file is the partial-render tell. Kill orphaned headless processes between rounds. Run Electron end-to-end suites one at a time.

## Peer sessions

Peers are separate sessions that message each other and that the operator can watch, steer and stop; a subagent is invisible and returns one result. Use them for visibility, not speed: every peer spends independently, so a fleet is the most expensive parallelism there is. Allowed for three or more independent parts, when the operator asks, or for work they want to steer mid-flight. A fleet parallelises the work, never the safety rules: one writer per tree, and tester and reviewer stay subagents. A peer's brief opens with what the app or feature is and why the work exists, and says how to talk to the operator, because they may open that session cold.

## Exceptions

- The orchestrator may write code directly when a subagent dies mid-write, or for a single small edit inside a live design round with the operator.
- A provider outage or a spent budget: the work waits or shrinks, and the turn says which; rerouting building to another provider is the operator's call, asked with the meter reading.
- Any exception is stated in the turn it is taken, not assumed.
