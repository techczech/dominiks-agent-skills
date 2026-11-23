---
title: Routes, commands and report format for an animated talk video
register: FOR AGENTS
date: 2026-11-13
status: trimmed. Flow is in SKILL.md; rules in rules.md; voice in voice.md; companion in companion.md. Routes A and B are built; route C is not built.
---

# Brief: routes, commands, report

Tools: Node >= 22, ffmpeg, `chrome-headless-shell` (never real Chrome); `hyperframes@0.8.214` pinned, never `latest`. Setup, fonts and render traps: `hyperframes-setup.md`. Input formats: `inputs.md`. Scaffold: `node <skill>/scripts/new-video.mjs <dir>`; work inside `<dir>` with `tools/` and `kit/`. Where this file and a rule disagree, the rule wins (N75).

## Routes

| Route | You have | Voice | Slide times come from |
| --- | --- | --- | --- |
| A | an outline and a narration script you write | synthetic (`voice.md`), or none | the clip lengths (`durations.json`); before audio, estimates |
| B | a recording and slide timings | his recording, only when he asks (N76) | the timings (TalkWeaver run JSON, CSV or JSON by hand) |
| C | a TalkWeaver package | the recording | not built: no exporter exists; use B with the real TalkWeaver outputs |

Route C layout if an exporter is ever built: `audio/voice.m4a`, `session.json` (`slideTimeIndex[]` of `enter`/`reveal`/`pause`/`resume`, `slideId`, `tMs`), `transcript.words.json`, `outline.md`, `look.json`, `fonts/`, `images/`, optional `cues.json`. Do not assume it.

### Route A: outline only (step 8 commands)

1. Outline per `inputs.md`: one `###` per slide, layout tag, short bullets, narration as `>` lines. Frame JSON for illustrated scenes (`inputs.md`).
2. `node tools/plan-from-timings.mjs --outline outline.md --out plan.json` (estimates). Build and snapshot a draft only after the storyboard is approved (rules.md, N44).
3. After voice (`voice.md`): `node tools/join-clips.mjs audio/clips audio/voice.m4a` (writes `durations.json`), word times, then re-plan with `--durations durations.json --words words.json --audio audio/voice.m4a`.
4. No audio is a valid result (silent video, D16): keep the estimated plan, say timings are estimates, give the script as `transcript.md`.

### Route B: recording and timings

1. Recording at `audio/voice.m4a` (cut with ffmpeg; `inputs.md` for `--from/--to`). Word times: `uv run scripts/transcribe-words.py audio/voice.m4a words.json`.
2. Slide timings: TalkWeaver run JSON, or CSV/JSON by hand. With none, derive changes from the transcript against the outline and have him confirm every change time first.
3. `node tools/plan-from-timings.mjs --outline outline.md --timings <file> --words words.json --audio audio/voice.m4a [--cues cues.json] --out plan.json`. Audio length equals the last scene's end to 0.1 s (`--to` or `--end`).
4. A short video here is a cut of in-order excerpts chosen for the talk's through-line; each excerpt gets illustrated frames (N33).

## Steps 8-11 commands (all routes)

- Read `plan.json`: every `units[].source` and warning. `fallback` means no spoken match: fix with a cue (`--cues`) or by editing `t`, else report. Keep your own timing record in `cue-log.json` (`{ scene, unit, said, t, source }`); `cues.json` is reserved for hand cues.
- Template per slide: `resolveLayout(tags)` reports `exact:false` for layouts with no template (hierarchy layouts, pie charts); list the fallbacks. Motion: `suggestMotion(slide)`, then the audience (rules.md step 1); override with `motion=calm` or `scene.motion`.
- Interlude (`analogy`): between two scenes; shorten the earlier (`end`), move the later (`start`); `slide.inserted: true`; every node has `t` and a quoted `said`; edit `plan.json`.
- `node tools/build-video.mjs .` writes `index.html`, `scenes.json`, `captions.vtt`, `transcript.md`, `chapters.txt`. Never hand-edit `index.html`. Read every warning.
- `node tools/prerelease.mjs .` (step 10), then `node tools/hf.mjs snapshot --scenes --moves` and look at every still.
- `node tools/hf.mjs render` (detached; never `set -m`); poll `node tools/hf.mjs status` every minute or two; 1080p, 30 fps; output `renders/<folder>.mp4`. No command blocks longer than 4 minutes. Measure loudness (`voice.md`).
- Review: `node kit/tools/review-page.mjs .`, then `... serve .` (127.0.0.1:4777, page at `/review/review.html`). The page and files live in `review/`, never the project root (a second HTML file there fails `hyperframes check` with `multiple_root_compositions`). Notes land in `review/feedback/<YYYY-MM-DD-HHMMSS>-feedback.json` and `.md`, or arrive pasted in chat. Each note is a fix request at `scene.id` and `t`; reply per note and enter it in `feedback-ledger.md` (optional local log of the user's comments, kept beside the skill or in the project and created on first use; never part of the published skill) (D15). If a note's `compositionHash` differs from the current page's, map by `scene.id` and say so. Stop the server afterwards. Shape and limits: `kit/tools/README.md`.

## Report

Short, one line per item:
- Output paths (MP4, `captions.vtt`, `transcript.md`, `chapters.txt`, `plan.json`, `thumbnail.jpg`, companion), duration, render time.
- Pre-release result: each warning with its sentence; rules not checked automatically and what you saw in the stills.
- Per slide: layout tag, template, `exact` or fallback, motion level.
- Build timing sources (`plan.json` `buildSources`): counts of reveal-event, speech-match, hand-cue, narration-estimate, fallback; every fallback, clamped or inverted build.
- Additions: every `laps`, `crops`, INSERTED scene with quotes and times.
- Caption fixes (before, after); unsure words.
- Privacy: every redraw and mask (N78). Numbers changed to match pictures (N79).
- Voice: `voice.md` report line.
- Assumptions (audience, input layout, font used); long dwells over 25 s; anything in the rules you could not satisfy; decisions, one line each with its reason.

## Not covered

Hierarchy layouts (pyramid, orgchart, mindmap, conceptmap) and pie charts beyond fallbacks; a typing effect (deliberately not built). New house-style comments go to `feedback-ledger.md` (optional local log, created on first use) first, and into `rules.md` only if they are general.
