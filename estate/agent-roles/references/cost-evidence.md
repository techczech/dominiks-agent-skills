# Cost and quality evidence behind the seats

Pinned 2026-10-17. These are measurements and observations from one operator's work with Claude Code, Codex CLI and pi over a few months: small samples, one portfolio of projects, list prices at the time. Prices, limits and models change every few weeks. Use these as reasons to check, not as standing facts, and add your own measurements when you change a seat.

## Prices and plan facts at the pinned date

- **Claude Opus 5.5:** $4 / $20 per million input / output tokens. First on the Artificial Analysis index at release (58), ahead of Claude Fable 5.1 (53). Its arrival came with a 20% rise in subscription limits, which made it the cheapest top-tier build seat available.
- **Claude Fable 5.1:** burns roughly twice Opus's rate on the subscription and is capped at half of the weekly allowance. Hence an orchestrator seat opened on purpose, not a default.
- **Claude Sonnet 5.5:** cheaper than Opus on the same meter; first-day results as implementer were good enough to make it the default builder.
- **Claude Haiku 5.5:** priced by prompt length. A call whose prompt exceeds 100k tokens costs five times the short rate, which is still about a quarter of Sonnet on input and output.
- **GPT-6.1 Sol** (Codex): faster and cheaper than Sonnet for code review. GPT-6 Sol listed at $2 / $10 and produces shorter deliverables than Astra.
- **GPT-6 Astra** burns Codex credit at five Sol-units per token; **GPT-6 Luna** at one-twentieth. Astra and Sol share one allowance.
- **GLM Flash** (z.ai coding plan through pi): about five points behind Sol on a coding benchmark, a third family on a third meter, with 5-hour and weekly caps and no local meter. A capped plan can fail as "Request timed out" with exit code 0.
- **Muse Wonder** (Meta, through Muse Code): used experimentally as a third-family reviewer; billing not yet verified.

## Fable as a routine reviewer is too expensive

When the Codex allowance ran low, review and re-review rounds fell back to Fable 5.1. Within a few days that had used about 60% of Fable's weekly allowance, which also has to cover the work only Fable should do. Sol does the same reviews for a fraction of the cost and, in the operator's judgement, as well. Rule: Sol reviews even when the Codex meter is behind pace; Fable reviews only what the operator calls really important.

## Builder choice: Opus against Sonnet

A pilot replayed five Sonnet 5.5 builds on Opus 5.5. Opus cost **2.4×** as much for about equal verified quality. One run, so not settled; Sonnet stays the default builder until a larger benchmark says otherwise. Side-by-side model judging needs both orderings: in that pilot, 7 of 10 judgements went to whichever build was shown first.

## Effort is not the lever

A six-feature build at the highest effort setting took 82 minutes and re-ran a 282-second test suite eight times. The defects that shipped were geometry mistakes that more reasoning would not have caught. Rule: medium effort, passed explicitly; scope, not effort, is the lever.

## Review where the operator cannot see

On the same build, four adversarial review rounds took 131 minutes against 244 minutes of building, a third of elapsed time. None of the six worst defects was visible from using the artefact: a privacy leak hidden by `display:none`, nine published pages nothing linked to, and two assertions that could not fail. On a settings-migration change in another project, seven review-and-test cycles cost about 1.2M tokens and were worth it: every round found a way user settings or history could be destroyed, and each of the four data-loss paths was found by only one of the two methods. In one case a review caught private share links in a published handout. Rule: the operator's eyes beat an agent's on what they can see; review and testing are kept for what they cannot see, and the scripted sweep is the floor under a no-review round.

## Working app first

On one desktop app, six review and test cycles ran for about 14 hours on quit behaviour and diagnostics before the app had its approved design and core UI. The first hands-on session superseded most of that work. Rule: put a working app in front of the operator as soon as possible.

## Testing stays top-tier

A cheap tester saves only by summarising, which is the judgement it is not trusted with. Its failure mode is a false green, and a false green ends the investigation.

## Headless checks run twice

Headless Chrome produced a partial render in roughly one run in three on a loaded machine; a single screenshot of one was reported as a defect that did not exist. Identical size and hash across two runs is the positive signal.

## Subagent spend

Measured over 65 subagents (about $170 at list prices):
- About **24%** of spend was cache rewrites after idle gaps longer than the 5-minute cache, mostly blocking waits on tests and continuations after a screenshot pass.
- Five Opus builders passed 300k tokens of context on steady history, not on content they needed. A cold continuation of a 300k Opus agent costs about $1.90.
- Starting context on Haiku 5.5: general-purpose agent 55k tokens (about 39k tool definitions, about 12k instruction files); six-tool builder 17k; read-only searcher without instruction files 4k. A full computer-use tool server added 27k.

## Screenshot pass

First trial: three checks on a desktop app preview cost 6 cents and took seven minutes with Haiku checkers. Cheap enough to run before every check request.

## Outside builders

- A write-capable one-shot GLM Flash run at medium thinking produced its file in 13 seconds; `--mode json` reports provider, model and usage for provenance.
- Long single `codex exec` parcels die mid-run (exit 144) with a clean `git status` that proves nothing. One ticket per dispatch.
- A Codex review launched with `nohup` sat unread for 17 hours because nothing notified on completion.
- Older Codex CLI versions reject newer model ids with a 400 error and exit code 0: check the version before blaming the model.

## Orchestration lessons

- A weaker model's survey has to be re-read by the orchestrator, so it saves nothing: surveys that feed a decision stay with the orchestrator.
- Outside models cost orchestration and re-reading. When the Claude meter is not the scarce one, dispatching elsewhere saves nothing.
- A builder brief with a hard stop rule ("if a seam is missing, report rather than invent") stalled parcels on ambiguity. Briefs give a ladder instead: nearest existing seam, then the smallest new seam (flagged), stop only for a public-interface change.
- Peer sessions (see SKILL.md § Peer sessions) are for visibility, not speed: without them, work gets split by hand because subagents cannot be watched.
