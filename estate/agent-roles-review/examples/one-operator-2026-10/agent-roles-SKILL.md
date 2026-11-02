---
name: agent-roles
description: "Load before delegating work to any model or subagent, before routing tests, or when tempted to build inline."
install: claude
---

# Agent Roles — Contract and Dispatch

Default: do small jobs in the working session; handoffs lose context. Delegate for parallel independent work, noisy searches, isolation or restricted tools, cross-family review of sensitive code, or when budget calls for it (for example a cheaper model for a large build). Opus spend is scarce, so large builds still go to Sonnet or Sol.

**Terms.** **Operator**: the person driving the session. **Seat**: the model for a role. **Parcel**: one unit of work for one agent; a **ticket** fits one fresh agent (about 200k tokens). **Sweep**: the orchestrator's own checks. `model-council` gives second opinions from other families. Costs: `references/cost-evidence.md`. **If `references/seats.md` exists, read it before dispatching:** it holds the local layer (paths, apps, meters) and overrides this file. Without one, copy `references/seats-template.md` to `seats.md`.

**When X, read Y.** Long builder brief, waiting and cache mechanics, verification routes, test runs, escape valves, exceptions: `references/dispatch-detail.md`.

## Current seats (pinned 2026-10-24)

Models and limits change every few weeks: check this table before relying on it. Claude spend is scarce. No Fable 5.1 or Astra unless the operator asks in the turn.

| Role | Seat | Why |
|---|---|---|
| Orchestrator | Opus 5.5 main session; Sol 6.1 when the operator opens the thread on Sol (dispatch through the T3 Code app's `delegate_task` tool); Sonnet 5.5 for light knowledge work | Fable burns about twice the rate. |
| Implementers | Sol 6.1 (`codex exec --ephemeral -m gpt-6.1-sol -c model_reasoning_effort="medium" -o <file> < /dev/null`), Sonnet 5.5 subagent (medium effort, never higher), Muse Wonder Full (`muse exec`, `--model muse-wonder-full-1.0`, `--contributor-mode off`; never plain Muse Wonder) | Three meters; state the pick. |
| Hard seat | Opus 5.5 subagent | Security- and write-path-bearing builds; review of difficult choices. Name the reason in the turn. |
| Reviewer | An implementer that did not build the code | Different family preferred; never the builder. |
| Fix lane, searches | Haiku 5.5 or Luna | Small fixes (§ Fix lane), lookups with a known target, screenshot pass (`ui-checker-*`). |
| Computer use, long tasks | Terra 6.1 (`codex exec --ephemeral --skip-git-repo-check -m gpt-6.1-terra -o <file> < /dev/null`) | Many-step flows when Codex allows; Haiku is the default. Never a pass verdict or security, write-path or data-loss check. |
| Tester | Sonnet 5.5; Opus `test-runner` only for security, write-path or data-loss checks | A cheap tester's failure mode is a false green. |
| Writer | `dominik-writer` (Sonnet 5.5) | Prose for people is never the builder's. |
| On request only | Fable 5.1, Astra, Gemini, Kimi, GLM | `model-council` skill. |

**Availability:** if Codex is out, Sol and Luna drop out: Sonnet or Muse build and cross-review, Haiku fixes.

## Budget

- **Codex pace test (Sol, Luna):** read `codexbar usage --provider codex --format text` before a large Codex spend. A `Pace: … in deficit` reading is put to the operator.
- **Muse Wonder Full** spends a separate Meta plan: no pace test; state every dispatch with requested and returned model.
- Nothing outside Anthropic is dispatched from Claude Code unless asked, except the seats above.

## The loop

The orchestrator plans, judges, and does small jobs itself. The implementer builds large parcels. The fix lane fixes. The hard seat takes what needs judgement. A reviewer that did not build the code reviews it. A tester runs the checks.

- **Orchestrator:** planning, design, judgement, review of plans, specs and prose, surveys feeding a decision. **Advises** when a build goes badly (two failed rounds, a stalled builder, builder and reviewer disagreeing): read the evidence, name the cause, re-brief or re-seat rather than send a third identical round.
- **Implementer:** feature rounds against a locked spec, tickets, conversions, prototypes, codebase orientation (conclusions with file:line citations). A parcel needing more than medium effort is a hard-seat parcel.
- **Hard seat:** security- or write-path-bearing work, judgement the spec does not supply, cross-cutting changes, the locked hi-fi mockup.

**Claude Code agent types.** Sonnet builds as `lean-builder` (medium effort); Opus sensitive builds as `lean-builder` with `model: opus`; Haiku fixes and lookups as `lean-builder` or `lean-searcher` with `model: haiku`; Haiku `ui-checker-*` for computer use; Opus `test-runner` for security, write-path or data-loss checks; Sol and Luna through `codex exec --ephemeral … < /dev/null`; Muse through `muse exec`.

Keep the main loop light: small lookups go to Haiku `lean-searcher` or Luna; no parallel Claude fleets to go faster (exceptions: one `ui-checker` per feature, peer sessions).

## Dispatch

- Pick the seat and the leanest agent type with the tools the parcel needs (a general-purpose agent starts at about 55k tokens, a builder at 17k, a searcher at 4k). One parcel per agent; the matching role brief at the top; the spec path in the prompt.
- Say in the turn whether it is a **fix**, **implement** or **hard** parcel. A hard-seat dispatch names its reason: security, a write path, or judgement the spec does not supply.
- One writer per tree. Builders do not commit; the driver commits after the sweep.
- Ticket multi-session builds first. Other harnesses: pass model and effort on the command line; run in the background.
- Run long suites in the background. Agents with a one-hour cache may block up to the 10-minute limit and check at most every 15 minutes; no short poll loops. Full rules: `references/dispatch-detail.md`.

## Role briefs

Open every dispatch prompt with the matching brief; the agent has no other role context. Full builder brief: `references/dispatch-detail.md`.

**Builder (short):**
> You are the builder on this parcel. Build exactly what the spec fixes; do not re-decide architecture, scope or model. Continue until every listed behaviour works and the tests for the code you changed pass. Shape new code as deep modules; add a test only where a failure would be costly or hard to see in use. Leave unrelated bugs and report them. Do not commit, touch `.git` or spawn agents; produce files, the driver commits. Run heavy tests and builds through `agent-run`; if it prints `NOT RUN: machine busy`, report the check as not run. Run only tests for the code you changed plus any gate-set spec guarding a path you touched; recommend a full run in your report if needed. Delete every file and process you created that is not a deliverable. Report what you built, what you did not, assumptions, spec conflicts verbatim, and one line per real decision with its reason.

**Adversarial reviewer:**
> You are reviewing work you did not write. Find correctness, security and spec-compliance failures and input-authority holes. Verify against the code, not its description. Report on two axes, never merged: **Spec** (missing requirements, scope creep, right-looking but wrong) and **Standards** (conventions, smells; judgement calls). Findings carry file:line evidence and a failure scenario.

**Tester:**
> You run the verification, never the fix. Keep browsers headless. Report failures verbatim with command output.

## Review law

Review is owed only for architecturally sensitive code: a new seam or public interface, a schema or data-model change, a write outside the output root, security, or a cross-repo contract. Everything else gets the orchestrator's sweep and the operator's verdict. The model that wrote the code never reviews its own build. Verify a finding against the code before acting on it. A `model-council` consultation is an extra opinion, never a substitute for this review.

**Rounds.** A re-review reads only the fix diff against the earlier findings. After two rounds a further round runs only if the last one found a new class of defect; next-order variants of fixed findings are logged as follow-ups and the review ends. Security and write-path code is exempt from the cap: every fix round there is re-reviewed (diff-only) until clean.

## Fix lane

A **fix** is a change against a named failing test or visible defect, in existing code, checkable in one look or run, with no design choice.

- **Not a fix:** anything that adds a seam, changes a schema or interface, touches security or a write path, needs a refactor, or asks the builder to choose between behaviours.
- **Not for writing** prose, docs or briefs.
- **Check:** the named test goes green or the defect is gone, and nothing else is in the diff. A fix that grew a second file is a ticket. Two failed rounds: the orchestrator diagnoses.

## Working app first

Put a **provisional preview** in front of the operator at the earliest usable moment, named so; reserve "done" for builds that passed the project's definition of done. No adversarial review or test cycles before they have seen a working app. Security and write-path work gets its full cycle once, before the approved direction lands. 

## Verification

Two questions pick the route: can the operator see it, and how often will it be checked. Automate only what will be judged more than once.

- **Screenshot pass first** when something visible changed: one Haiku `ui-checker` per feature (Terra for long ones) saves screenshots and reports what it saw, never a pass. Only judgement calls go to the operator.
- **Visible, checked once:** the operator, through a light check request (at most five checks, each as what to do and what to see).
- **Invisible, checked once:** the sweep or the tester. **Checked repeatedly:** one end-to-end journey written once.
- **Unit tests by the builder** are never acceptance evidence.
- **Security, or any write outside its output root:** full cycle at any care level: a reviewer that did not build it and the tester, every fix round re-reviewed. Never economise here.
- **Sweep:** nothing private ships (URLs, hidden fields, credentials, absolute paths); sources untouched; every new assertion can fail. No pass claim without the output that proves it.

## Test levels

The operator's machine is also their working machine; a faster app outranks exhaustive testing. Keep existing suites; add a test only where a failure would be costly or hard to see in use. Level follows the app's care level (Light, Normal or Careful, set per app):

| Level | When | Who decides |
|---|---|---|
| **Changed** | Tests for the code changed, once per build round (Light, Normal) | Agent |
| **Risk** | Gate set, when the diff touches data loss, overwriting files, security, private data, migration or publishing; before releases of Careful apps | Automatic; never skipped |
| **Full** | Full unit suite or end-to-end run (Careful apps, releases) | The agent, by judgement; long runs overnight or on a second machine |

Heavy suites and app builds go through `agent-run`; the end-to-end gate, second-machine runs, overnight scheduling, test review and tester routing are in `references/dispatch-detail.md`.

## Peer sessions

Separate visible sessions, for visibility not speed: three or more independent parts, when asked, or work to steer mid-flight. One writer per tree; tester and reviewer stay subagents.

## Exceptions

Stated in the turn when taken. Outage or spent budget: the work waits or shrinks; rerouting providers is the operator's call. More in `references/dispatch-detail.md`.
