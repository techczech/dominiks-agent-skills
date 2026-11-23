---
name: animated-talk-video
description: "Use for any request to make a video: an explainer, a video summary of a talk or workshop, short videos for participants, a paper explainer or an animated story. Builds the MP4, captions and companion page with HyperFrames from an outline, slides, transcript or recording."
---

# Animated talk video

The single entry point for every video. Source -> brief -> narrative -> script -> storyboard (approved) -> voice -> plan -> build -> pre-release check -> render -> companion. Every spoken idea is shown as a picture of the thing itself; the slides are the key points, not the video. Kit of plain-JS templates and frame elements, planner, builder, lint, pre-release gate, review page. HyperFrames pinned 0.8.214. Node >= 22, ffmpeg, chrome-headless-shell. No TalkWeaver needed. Setup: `references/hyperframes-setup.md`.

## Use when

Any request for a video: explainer, talk or workshop summary, participant videos, paper explainer, story, a silent explainer top (the `explainers` skill sends those here). Not for slides (`talkweaver`).

## Rules of the flow

- Rules are in `references/rules.md`, grouped by the steps below. Newest wins; no brief or earlier build overrides one (N75). If a skill will not load through the Skill tool, read its `SKILL.md` from the skills library.
- Every step ends with a one-line report of what was decided or produced. Hand Dominik only choices that are his (genre, look, which first, approval).
- Each comment he gives on a video goes into `feedback-ledger.md` (optional local log of the user's comments, kept beside the skill or in the project and created on first use; never part of the published skill) the same day, before the fix (D15); columns: date, video, his words, decision, where it now lives. Add a rule to `rules.md` only when it is general: a rule that held for one video goes in that video's notes.
- Work in the video's project folder (`new-video.mjs`), never a new Documents or chat folder.

## The flow

1. **Brief.** In: request, source. Rules: step 1 (N31, N45, N76, N81, D16). Skill: `designing-instructional-videos`. Write `brief.md`: genre, audience, `explain` or `navigate`, source type, length, voice, privacy cleared, approval state. Ask only what is his.
2. **Evidence and privacy.** In: the source. Rules: step 2 (N78-N80, N37-N39, N52, N62). Skills: `talkweaver` recording processing for transcripts, `talkweaver-visuals` for widgets and logos, `ai-model-benchmarks` for charts. Out: a source list, real captures masked, a privacy note.
3. **Narrative outline.** Rules: step 3 (N40, N50, N55-N57). Skill: `designing-instructional-videos`, "Plan the spoken story". Out: `outline.md` with `mode:` frontmatter, audience knowledge, claims, per part entry/question/exit, section card titles. Format: `references/inputs.md`.
4. **Narration script.** Rules: step 4 (N41, N42, N64, N74). Skills in order: `expository-writing`, `cohesion-review`, `unslop`. Out: `>` lines in the outline, read aloud in order.
5. **Storyboard.** Rules: step 5 (D1-D13, N33-N36, N47, N49, N54, N65, N73). Scaffold once: `node scripts/new-video.mjs <dir> [--outline file] [--install]`. Write frame JSON from kit elements only (`references/inputs.md`), then `node tools/storyboard.mjs .` and `node kit/tools/lint-frames.mjs .`. Out: `frames/`, the storyboard page.
6. **Approval.** Dominik approves the storyboard before any voice or render (N44). Record it in `brief.md`. Report: the storyboard path.
7. **Voice and word times.** Rules and commands: `references/voice.md` (house narrator, pace, takes, loudness). Silent videos skip this step.
8. **Plan.** Rules: step 8 (2.1-2.5, N46, N48, N69). Command: `node tools/plan-from-timings.mjs --outline outline.md [--timings f] [--words f] [--durations f] [--cues f] [--audio audio/voice.m4a] --out plan.json`. Read every `source` and warning. Route detail: `references/agent-brief.md`.
9. **Build.** Rules: step 9. `node tools/build-video.mjs .` (writes `index.html`, `scenes.json`, `captions.vtt`, `transcript.md`, `chapters.txt`; never hand-edit `index.html`), then `node tools/hf.mjs check`.
10. **Pre-release check.** `node tools/prerelease.mjs .` must pass, then `node tools/hf.mjs snapshot --scenes --moves` and open every still (list in `rules.md` step 10). Fix, rebuild, repeat. Nothing is sent or published before it passes. Warnings need a sentence in the report.
11. **Render and review.** `node tools/hf.mjs render` (detached; poll `node tools/hf.mjs status`; no command over 4 minutes), loudness (`voice.md`), then the review page (`references/agent-brief.md`). One reply per note; every note into the ledger. Stop servers afterwards.
12. **Companion and publish.** `references/companion.md`: `node tools/companion.mjs . --out companion`, screenshots of every view, web encode, deploy. Publishing needs his go-ahead; repeat the privacy pass first. Author example: on the author's own talks site the talk page is this companion, never the site's plain page. Report format: `references/agent-brief.md`.

## Branches by source

Only the differences; every other step is as above.

| Step | TalkWeaver deck | Transcript only | Paper | Other materials |
| --- | --- | --- | --- | --- |
| 1 Brief | Audience from the outline and Run notes | Ask audience; summary genre (N76) | `navigate` | Ask genre and audience |
| 2 Evidence | Deck, Run JSON, transcript, Notes; reuse widgets (`?video=1`) and logos | The transcript is the evidence, not the soundtrack | Title page, figures, tables, licence note (N52) | Evidence inventory first; real screenshots (N80) |
| 3-4 Script | Deck gives the order; new script (N76) unless he wants his voice | New connected script, 5-7 min per hour (N76) | Open on a claim about the subject, then the paper (N50, N65) | Script from the brief |
| 7 Voice | Route A house narrator; route B only if asked | Route A | Route A (house narrator, not `paper-reading.md`) | Route A, or none |
| 12 Companion | Notes link to the videos; a session gets one companion (N85) | Single or series | Argument view (N72) | Per video |

Route C (a TalkWeaver package exporter) is not built; use route B with the real TalkWeaver outputs.

## Where everything lives

- `references/`: `rules.md` rules by step with N and D ids; `voice.md`; `companion.md`; `agent-brief.md` routes, commands, report; `inputs.md` outline, plan and frame JSON formats; `hyperframes-setup.md` version pin, fonts, render traps; `feedback-ledger.md` running comments: an optional local log, created on first use, never published. History, not loaded per video and not in the published skill: `feedback-audit-*.md`, `consolidation-*.md`; `motion-principles.md` points to `rules.md`.
- `scripts/`: `new-video.mjs`, `plan-from-timings.mjs`, `build-video.mjs`, `hf.mjs`, `prerelease.mjs`, `make-covers.mjs`, `jump-scan.mjs`, `join-clips.mjs`, `storyboard.mjs`, `companion.mjs`, `embed-player.mjs`, `transcribe-words.py`, `align-words.mjs`, `build-gallery.mjs`. `build-journey.mjs` is only for an independent talk gallery.
- `assets/kit/`: `templates/` (slide templates, frame elements, line-art generator), `icons/` (lucide), `tools/` (`lint-frames.mjs`, review page, `shoot.mjs`), `samples/`. Samples: `assets/sample-outline.md`, `assets/sample-companion.json`.
- Sibling skills: `designing-instructional-videos` (genre, narrative, review gate), `designing-visuals-for-learning` (shared principles), `text-to-speech` and `speech-to-text` (engines), `talkweaver`, `talkweaver-visuals`, `explainers` (silent tops, shared player).
- `README.md` for colleagues, with the licence summary.

## Hard stops

- No `hyperframes@latest`, `init`, `add`, `skills update`, shader transitions or real Chrome; no verbose package-manager output.
- No bundled font you may not redistribute; no voice clone without authorisation; a synthetic voice is labelled synthetic.
- No render or review server left running. No skipping the stills. No release before step 10 passes.
