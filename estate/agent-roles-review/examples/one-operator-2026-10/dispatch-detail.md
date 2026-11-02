# Dispatch detail (on demand)

Moved out of `SKILL.md` to keep it short. Read the section you need.

## Routing escape valves

Stated in the turn when used: (a) a trivially classifiable parcel may go straight to the smallest sufficient tier without a planning round; (b) interdependent coding whose parts share implicit decisions runs single-thread with one builder instead of parallel seats, which diverge on exactly those decisions. Neither relaxes the safety invariants: the builder never reviews itself, security and write-path work keeps the full cycle, one writer per tree.

New harnesses enter only on a logged trial (three parcels, recorded model, cost and failures), never by silent substitution. Use tier names, not versions, in standing text outside the pinned table; resolve the tier to a live model id at dispatch, pin it for the run, record what answered.

## Dispatch rules in full

- Pick the seat and the leanest agent type that carries the tools the parcel needs (`SKILL.md` § Dispatch). One parcel per agent; the matching role brief at the top; the spec or mockup path in the prompt. Medium effort by default; raise only for a genuinely hard architectural parcel, and then on the hard seat. When a brief says "think hard", the seat is wrong, not the effort.
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

A subagent pays for every tool definition and instruction file on every call. Measured starting context on Haiku 5.5: a general-purpose agent 55k tokens (about 39k of it tool definitions); a builder with six file tools 17k; a read-only searcher with no instruction files 4k. Keep custom agent definitions (Claude Code custom agent definitions) with only the tools each job needs (builder, searcher, writer, screenshot checker) and measure each before use by sending it a one-word prompt and reading its starting token count. An agent with instruction files (CLAUDE.md and the like) omitted knows only its definition and the brief: put every rule it needs in the brief. Testers and reviewers keep the full toolset. A running session may not see new definitions; a fresh one will.

## Full builder brief

> You are the builder on this parcel. Build exactly what the spec or mockup fixes; do not re-decide architecture, scope or model assignment. The parcel is complete when every listed behaviour works and the tests for the code you changed pass; continue until then rather than returning after a first implementation. Shape new code as deep modules — substantial behaviour behind a small interface at a clean seam — and add a test only where a failure would be costly or hard to see in use (§ Tests: runs and review); prefer extending an existing test to adding a file. If a named seam is missing, first look for the nearest existing seam that serves it; if none does, build the smallest seam the behaviour needs and flag it in your report; stop only if creating it would change a public interface the spec fixes. If you meet a pre-existing bug or behaviour the task does not mention, leave it and report it as a follow-up. Do not commit and do not touch `.git`; produce files, the driver commits. Do not spawn or delegate to other agents. Run every test or packaging command through `agent-run` (one heavy job at a time across the machine; it cleans up after itself). If it prints `NOT RUN: machine busy`, do not retry: report the check as not run. Run only the tests for the code you changed (the named test files, or the runner's changed/related mode), plus any gate-set spec guarding a path your diff touches. You may pick additional related tests when your diff warrants them, and say which and why. Do not run a full suite or a full end-to-end run; if you believe the change needs one, recommend it in your report with the reason. Delete every file, folder and process your work created that is not a deliverable. Report what you built, what you did not, any assumption you made under ambiguity, any spec conflict verbatim, and one line per real decision with its reason.

## Verification routes in full

The operator's verdict gates the hardening. Build, install and put a **provisional preview** in front of them at the earliest usable moment, named so; reserve "done" and "shipped" for builds that passed the project's own definition of done. No adversarial review or test cycles run before they have seen a working app. Security and write-path work gets its full cycle once, before the approved direction lands, not per fix round while they wait. Feature gaps and the locked design outrank polish and instrumentation.

**Terra computer-use brief (template; long-task lane).** Dispatch: `codex exec --ephemeral --skip-git-repo-check -m gpt-6.1-terra -C <project> -o <report> < prompt`. Brief: ONE feature; app or URL and how to reach it; numbered steps each with "do" and "should see"; screenshot folder inside the project (`<step>-<slug>.png`); run hidden/background (`open -g`, headless or debugging port; nothing on the operator's screen, no real-account side effects); report what it saw per step, never a pass or fail verdict; stop at the first blocked step and say why; no code edits. Computer-use mechanism (verified 2026-10-27, browser only): Terra drives pages through a Playwright MCP server configured in Codex (no `-c` override needed; `cua_repl` failed first, Terra fell back on its own). Wrap the call in a timeout (for example `perl -e 'alarm 300; exec @ARGV' codex exec ...`). The Codex `playwright` MCP runs `--headless` since 2026-10-27. Electron screenshot passes (verified 2026-10-27 on an Electron app): the driver launches the installed app hidden (`env -u ELECTRON_RUN_AS_NODE <App> --remote-debugging-port=<p> --use-mock-keychain`, plus the app's own hidden/separate-data flags), confirms `curl http://127.0.0.1:<p>/json/version`, and gives Terra the endpoint and the `playwright-core` path; Terra writes a `connectOverCDP` script, screenshots, reports, and the driver quits the instance. Terra covers these; Haiku `ui-checker-electron` is the default for ordinary passes. Native-app GUI control is untested; the computer-use MCP entry stays disabled.

Two questions pick the route: **can the operator see it**, and **how often will it be checked**. Automate only what will be judged more than once.

- **Screenshot pass first.** Whenever something visible has changed, one Haiku `ui-checker` run per feature (Terra for long-running ones) walks the steps on the installed preview in the background and saves screenshots. It reports what it saw, never a pass. The orchestrator reads them: plainly broken is fixed before the operator sees it, plainly fine is dropped from the request, and only judgement calls go to the operator, with the pictures. Scripted clicks can misreport a control that works under a real mouse: confirm a new finding before acting on it.
- **Screenshots go to the builder before the operator.** Send the pictures and the checker's notes back to the builder (continue test permitting), which compares them with the spec or mockup, fixes what differs, and returns three lists: fixed, matches, and **needs the operator** with the reason. One feedback round by default. The orchestrator filters that last list to functional and taste questions; technical choices are not the operator's.
- **Visible, checked once → the operator**, through a light check request: at most five checks, each phrased as what they do and what they should see. Never write automation for something they will look at once.
- **Invisible, checked once → the orchestrator's sweep or the tester.** Leaks, untouched sources, dead links, file writes, computations.
- **Checked repeatedly → one automated end-to-end journey, written once.** The trigger is repetition or a regression, never the ticket.
- **Logic at a seam → unit tests by the builder.** Never the acceptance evidence: same-author tests share the author's misreading of the spec.
- **Security, or any write outside its output root:** full cycle regardless of route — a reviewer that did not build it and the tester, both top-tier, every fix round re-reviewed. Never economise here.

**The end-to-end gate.** Split each repo's suite in two: a **gate set** (data loss, corruption, writes outside the root, leaked private content, lost sync, security, migration) that runs before a landing only when the diff touches a path it guards, and always before a release; and a **release set** of visible core journeys that runs only when the operator asks to deliver the full thing end to end. Tests of constants, implementation details and one-off past fixes become unit tests or are deleted.

**Guarding the operator's time.** A check that blocks the next ticket does not wait on them if a screenshot or an in-page probe settles it. A request they cannot run in under a minute is a defect in the request. Two failed rounds on the same check escalate to the top seat.

**The orchestrator's sweep, the floor under every no-review round:**

- Absence of what must not ship, across every output tree including build state and downloads: private URLs and share links, hidden fields (speaker notes, comments, tracked changes), stale credentials, absolute local paths.
- Sources untouched: `git -C <source> status --porcelain` empty before and after, no moved mtimes.
- Nothing published that nothing links to.
- Every new assertion can fail: reinstate the defect and watch it go red.

No pass claim without the output that proves it. A mechanical green with a dead runtime is a fail.

## Tests: runs and review

The operator's machine is also their working machine, and a faster app outranks exhaustive testing. Testing stays: it has made the apps more reliable. The aim is payoff per test, not fewer tests for its own sake. Skip a test for anything the operator will find at once by using the app.

- **Heavy app test suites and app builds go through `agent-run`** (the operator's local wrapper that runs one heavy job at a time); websites, content builds, publishing scripts and small jobs do not: one at a time across the machine, low priority, time-limited, scratch removed. `agent-run -- <command>`; `--scope risk` for gate-set runs; `--scope full --approved "<their words>"` only after they said yes. Never quote approval they did not give.
- **Busy slot:** `NOT RUN: machine busy` means check actual machine load. If the job is light or the machine has room, run it directly; if the job is heavy and the machine is under real strain, wait or retry later rather than stopping the work.
- **Big runs go overnight.** Schedule a one-off with `schedule_task` or tell them it is ready to run; full end-to-end runs do not start while they are at the machine unless they say so. The machine must be awake and on power.
- **A second, more powerful machine takes heavy runs** through a remote-test wrapper that runs a pushed commit there with read-only access. Never on it: signing identities, notarisation credentials, personal data, real documents.

### Test review (operator, 2026-10-30)

A test count is a trigger for judgement, never a gate. `TEST REVIEW DUE` from `agent-run` (over 150 test files with no review on record, or 25% growth since the last one) never blocks work: tell the operator and offer the review; start it when they agree. A review reads the suite and asks of each group what failure it has caught or would catch: remove what never pays, merge duplicates, rewrite brittle ones. Never remove by count, age or filename. Report what went and why, keep the gate set, then record it with `agent-run --record-review <repo> <count>`.

### Routing tests

- The tester is for the gate set, the security-and-write-path category, and claims only a running app settles. One build, one suite pass, targeted greps and an in-page probe is the sweep and runs inline; the moment it becomes iterate-until-green, it belongs to the tester.
- Testing stays top-tier. The screenshot pass is not testing: it collects pictures and the orchestrator judges them.
- Receiving review findings: verify each against the code; a wrong finding is answered with evidence, not implemented.
- Believe a headless browser check only after two identical runs (same file size and hash); a much smaller file is the partial-render tell. Kill orphaned headless processes between rounds. Run Electron end-to-end suites one at a time.

## Exceptions

- The orchestrator may write code directly when a subagent dies mid-write, or for a single small edit inside a live design round with the operator.
- A provider outage or a spent budget: the work waits or shrinks, and the turn says which; rerouting building to another provider is the operator's call, asked with the meter reading.
- Any exception is stated in the turn it is taken, not assumed.
