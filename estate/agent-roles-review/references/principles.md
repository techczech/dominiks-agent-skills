# Principles for agent roles

Each principle: the rule, why it holds, and how to tell whether it applies to this operator. Evidence behind most of them: `../examples/one-operator-2026-10/cost-evidence.md`. They came from one operator's months of work; test them, do not assume them.

## Who does the work

**Do small jobs where the context already is.** Every handoff loses context and costs a brief, a cold start and a re-read. Delegate only for a reason: parallel independent work, a noisy search whose output would flood the main session, isolation or restricted tools, review by a model that did not build the code, or budget (a cheaper model for a large build).
Applies when: always. The only question is where the threshold sits for this operator's tools.

**The orchestrator plans, judges and surveys; it does not build large parcels.** A weaker model's survey that feeds a decision has to be re-read by the orchestrator, so it saves nothing. A large build on the most expensive seat spends the budget that planning and judgement need.
Applies when: the operator has more than one model tier or more than one paid plan.

**Name a hard seat, and say why each time it is used.** Some work needs the strongest model: security, writes outside the output folder, judgement the spec does not supply. Requiring a stated reason stops the hard seat becoming the default for ordinary features and fix rounds.
Applies when: the strongest model is noticeably more expensive or rationed.

**A fix lane for the smallest, checkable changes.** A fix is a change against a named failing test or a visible defect, in existing code, checkable in one look, with no design choice. Anything that adds a seam, changes an interface or touches security is not a fix. A fix that grew a second file is a ticket.
Applies when: a cheap fast model is available and the operator fixes many small things.

**Prose for people is never the builder's.** Builders write code-shaped text. Anything a person will read under the operator's name goes to a writer seat that loads the operator's voice and writing rules.
Applies when: the operator publishes or sends text produced in agent sessions.

## Scope, effort and briefs

**Scope, not effort, is the lever.** Higher reasoning effort on a badly scoped parcel buys longer runs and the same defects. Default to medium effort, passed explicitly; when a brief needs "think hard", the seat is wrong, not the effort.
Applies when: the harness exposes an effort setting.

**One parcel per agent, sized for one fresh context.** Long single runs die mid-way or drift. Split multi-session work into tickets first, one per dispatch.
Applies when: builds regularly run longer than one context window.

**Give a ladder, not a stop rule.** "If X is missing, report rather than invent" stalls work on every ambiguity. Say what to try first, what is acceptable if flagged, and the one thing that must stop the work.
Applies when: builders come back blocked on small ambiguities.

**Every dispatch carries its role.** Agents have no standing role context; a role placed in shared instruction files leaks into harnesses where it does not apply. Open every dispatch prompt with the matching brief.
Applies when: the operator uses more than one harness or shares instruction files across them.

**Pass model and effort on the command line.** A harness's configured default is the operator's interactive choice and moves. Record which model actually answered.
Applies when: other CLIs are used as builders or reviewers.

**One writer per working tree; the driver commits.** Two writers in one tree overwrite each other; a builder that commits skips the orchestrator's check.

## Review and verification

**The model that wrote the code never reviews it,** preferably not the same family either. Self-review repeats the blind spots that produced the defect.

**Review where the operator cannot see.** The operator's eyes beat an agent's on anything visible in use. Spend review and testing on what they structurally cannot see: data loss, privacy leaks, security, writes outside the output folder, tests that cannot fail. Elsewhere a scripted sweep is the floor.
Applies when: the operator does use the things that get built.

**Review is owed only for sensitive changes,** such as a new interface or seam, a schema change, a write outside the output root, security or a cross-repo contract. Cap rounds: a re-review reads only the fix diff, and after two rounds a further round runs only if the last found a new class of defect. Security and write-path work is exempt from the cap.
Applies when: review rounds are a measurable share of elapsed time.

**Put a working version in front of the operator first.** Hours of hardening on a direction the operator has not seen are often thrown away by their first look. Label it provisional; reserve "done" for what passed the agreed check. Security and write-path work still gets its full cycle once, before it lands.
Applies when: the operator judges results by using them.

**Testing stays on a capable seat.** A cheap tester saves only by summarising, which is the judgement it is not trusted with; its failure mode is a false green, and a false green ends the investigation.

**Pick the check by who can see it and how often it is checked.** Visible and checked once: the operator, with a short list of what to do and what to see. Invisible and checked once: the orchestrator's sweep or the tester. Checked repeatedly: one end-to-end journey, written once. Unit tests written by the builder are never acceptance evidence.

**Run targeted tests while iterating, a full run before ready.** Full suites rerun on every round dominate elapsed time.
Applies when: the test suite takes minutes rather than seconds.

## Budget and capacity

**Know which meter is scarce this week.** Read the meter before a large spend; when one provider is behind pace, the cheaper or idle meter takes the work. Dispatching to outside models costs orchestration and re-reading, so it saves nothing when the main meter is not scarce.
Applies when: the operator pays for more than one plan.

**Models only on request are listed.** Expensive or experimental models are used when the operator asks in the turn, not because an agent judged them useful.

**Lean agent types.** An agent's starting context (tool definitions, instruction files) is paid on every call. Use the agent type with only the tools the parcel needs; avoid long blocking waits that let a short cache expire.
Applies when: the harness offers custom agent definitions or reports context sizes.

**Parallel sessions are for visibility, not speed.** Separate visible sessions let the operator watch and steer; they do not make the work cheaper.
Applies when: the operator wants to watch or steer several strands at once.

## Keeping the file alive

**Pin a date on the seat table; review on triggers.** Models, prices and limits change every few weeks. A seat table without a date is trusted long after it is wrong.

**Every rule carries its reason in a dated log.** The log is what lets a later review relax a rule safely, or keep it when a session argues it away.

**New models enter by trial, not substitution.** A few recorded parcels with model, cost and failures, then a decision.
