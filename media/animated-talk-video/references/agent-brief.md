---
title: Agent brief for an animated talk video (v1)
register: FOR AGENTS
date: 2026-10-16
status: v1. Routes A and B are built and tested; route C (TalkWeaver package) assumes an exporter that does not exist yet.
---

# Brief: turn a talk into an animated video

Produce an MP4 in which each slide is drawn as a moving scene and builds appear when the speaker says them. Read `motion-principles.md` first; it overrides taste. Use `kit/templates/` (plain ES modules). Install nothing beyond `hyperframes@0.8.214` (pin; never `latest`).

Tools: Node >= 22, ffmpeg, `chrome-headless-shell` (never real Chrome). Setup, fonts and render traps: `hyperframes-setup.md`. Input formats: `inputs.md`. Scaffold: `node <skill>/scripts/new-video.mjs <dir>`; then work inside `<dir>` with `tools/` and `kit/`.

## 1. Routes

| Route | You have | Voice | Slide times come from |
| --- | --- | --- | --- |
| A | an outline (and a narration script you write) | synthetic (TTS), or none | the generated clips' lengths (`durations.json`); before audio, estimates |
| B | a recording and slide timings | the real recording | the timings (TalkWeaver run JSON, CSV or JSON by hand) |
| C | a TalkWeaver package (future) | the recording | the run JSON inside it |

Steps 2-11 are the same for all three; steps 1 differ.

### Step 1A: outline only

1. Write or check the outline (`inputs.md`): one `###` per slide, layout tag, short bullets (<= 9 words), nested bullets for structure. Group content into coherent explanatory units; keep connected ideas together. Use learner knowledge and processing demand, not a fixed concept count, to decide where to split scenes.
2. Write the narration as `>` lines under each slide: spoken prose, one paragraph per slide. Do not read the bullets back; say what the bullets only point at. The narration is the learning content; the bullets are the changing phrases (rule 4.1).
3. Ask the user for the audience if not stated (beginners and dense content get `calm`; rule 8). Unknown audience: `standard`, and say so.
4. Draft plan: `node tools/plan-from-timings.mjs --outline outline.md --out plan.json`. Scene lengths and build times are estimates at this point. Build, check and snapshot a draft so the user can see the look before any audio is made.
5. Optional synthetic narration (section 6): one clip per slide into `audio/clips/<NN>-<slideId>.wav`. `node tools/join-clips.mjs audio/clips audio/voice.m4a` joins them and writes `durations.json`. Transcribe the result for word times (`scripts/transcribe-words.py` or any engine), and align the known script to it (section 6, Word times). Re-plan: `--durations durations.json --words words.json --audio audio/voice.m4a`.
6. No audio at all is a valid result (captions-only explainer): keep the estimated plan, say that timings are estimates, and give the narration script as `transcript.md`.

### Step 1B: recording + timings

1. Put the recording at `audio/voice.m4a` (cut to the stretch you want, with ffmpeg, if it is a long session; see `inputs.md` for `--from/--to`).
2. Get word timings: `uv run scripts/transcribe-words.py audio/voice.m4a words.json` (Apple Silicon) or another word-timed engine.
3. Get slide timings: TalkWeaver run JSON, or a CSV/JSON the user wrote by hand (`inputs.md`). If the user has no timings, scrub the recording with them or derive slide changes from the transcript against the outline and ask them to confirm every change time before you build.
4. Plan: `node tools/plan-from-timings.mjs --outline outline.md --timings <file> --words words.json --audio audio/voice.m4a [--cues cues.json] --out plan.json`.
5. Audio length must equal the last scene's end to 0.1 s (`--to` or `--end` when the recording has a tail).

### Step 1C: TalkWeaver package (assumed layout; rename in your plan if the package differs, and say so)

| Path | What | Fields to use |
| --- | --- | --- |
| `audio/voice.m4a` | the recorded narration | duration must match `recordingMs` minus paused time |
| `session.json` | the run record | `id`, `talkSlug`, `talkTitle`, `recordingMs`, `slideTimeIndex[]` (`enter` / `reveal` / `pause` / `resume`, `slideId`, `tMs`) |
| `transcript.json`, `transcript.words.json` | saved transcript, word timings | segments `{start,end,text}` in ms on the run clock; words `[{w,s,e}]` in seconds on the cut clock |
| `outline.md` | the talk outline | `##` section, `###` slide, `{id=...}` and layout tags, nested bullets, `{icon=lucide:name}` |
| `look.json` | the talk's look | paper, ink, muted, hairline, accents, tints, font families (shape of `defaultLook` in `kit/templates/index.mjs`) |
| `fonts/*.ttf` | the look's fonts | declare via `look.json` `fonts`; the renderer ignores system fonts |
| `images/` | slide images | referenced by slide id |
| `cues.json` (optional) | hand cues from the user, seconds from cut start (not your cue log) | `{ slideId: [t per unit] }` |

Copy `look.json`, `fonts/`, `images/` into the project; `--timings session.json --words transcript.words.json --outline outline.md`. Clocks: `tMs` is the run clock; a cut starts at `--from` seconds; the script converts to the output clock once. Slides entered twice are shown twice; slides never entered are dropped; the order of the log wins, not the outline.

## 2. Steps (all routes)

2. **Read the plan.** `plan.json`: one scene per slide change. Look at each `units[].source` and every warning. `fallback` = no spoken match: fix with a cue (`--cues`) or by editing `t` in the plan, else report it.
3. **Pick a template per slide.** `resolveLayout(tags)` reports `exact:false` for layouts with no template of their own (hierarchy layouts such as `pyramid`, `mindmap`; pie charts). Those fall back and `build-video.mjs` prints a `fallback` line. Untagged slides are lists. List the fallbacks in the report.
4. **Choose motion level** per slide: `suggestMotion(slide)`, then apply the audience (rules 1.2, 8.x). Override with `motion=calm` in the outline or `scene.motion` in the plan.
5. **Cue the builds.** Order of evidence (rule 2.1): logged `reveal` events; first word of the unit's phrase in the word timings; hand cue (`cues.json`, supplied by the user); evenly spread (flagged). The plan script does this; you correct it. Keep your own record of how each build was timed in `cue-log.json` (`{ scene, unit, said, t, source }`); never call it `cues.json`, which is reserved for hand cues.
6. **Add only what speech supports.** (a) `laps` on a cycle when the speaker says it goes round and round; (b) `crops` on a single image when they point at a part; (c) an inserted `analogy` interlude when they speak an analogy that the slide only gestures at (section 3). Every addition carries a quoted `said` and a time. Nothing else (rule 3.4).
7. **Captions.** `build-video.mjs` cleans the word timings (`cleanCaptions`) and writes `captions.vtt` and `transcript.md`. Read the cleaned lines against the outline vocabulary; add recogniser fixes to `plan.json` `captionFixes`; list each fix.
8. **Compose.** `node tools/build-video.mjs .` writes `index.html`, `scenes.json`, `captions.vtt`, `transcript.md`, `chapters.txt`. Read every warning it prints.
9. **Check.** `node tools/hf.mjs check` must report 0 errors and contrast 100% AA (known warnings: `hyperframes-setup.md`). Then the list in section 4.
10. **Snapshot.** `node tools/hf.mjs snapshot --scenes --moves`. Open **every** still and look: clipping, overlap, empty lower half, arrowheads, icons, captions colliding with content, wrong font. Fix and re-snap.
11. **Render.** `node tools/hf.mjs render` (detached; never `set -m`), poll `node tools/hf.mjs status` every minute or two. 1080p, 30 fps. Output `renders/<folder>.mp4`. Then measure loudness (section 6, Loudness).
12. **Review loop** (section 6a), then **report** (section 5).

Slide object per layout: see the header comment of each file in `kit/templates/`. Common keys: `layout` (the outline tag), `title`, `section`, `accent`, `items` (`{ text, icon?, children? }`).

### Title mode (rule N30)

Default is `kicker`: the slide title is a small sentence-case line top-left, no heading, no rule. Do not change `titleMode` unless the user asks. Options: `tab` (strip of the section's slide titles), `intro-then-none` (a section card introduces the topic, later scenes carry no title; `afterIntro: 'kicker'` keeps a kicker), `full` (the large title with rule), `none`. Per video: `plan.json` `titleMode` (or `build-video.mjs --title-mode`); per scene: `{titlemode=none}` in the outline or `slide.titleMode` (not `intro-then-none`). Section and title cards are unaffected.

## 3. Inserting scenes

You may insert an interlude when the transcript (or narration) supports it. Today only `analogy` exists: a chain of named nodes with an optional return arc, for things like "your brain, your hands, your computer, your eyes, and back to your brain". Rules: it is a new scene between two others; shorten the earlier scene (`end`) and move the later one (`start`) so the times do not overlap; `slide.inserted: true`; every node has `t` and a quoted `said`; it enters on a plain crossfade; report it. If the slide is dense and the analogy would have to sit under it, split rather than squeeze (rule N4). Edit `plan.json` for this; `units` of an analogy scene may be empty because its builds come from `node.t`.

## 4. Checks before render

- `hyperframes check`: no errors; contrast 100% AA.
- Every scene has a still, opened and looked at. Look for: text outside x 120-1800 / y 70-990; text under captions; content centred vertically under the title; every arrowhead fully visible and touching its box; icons present where the outline or meaning gives one and none hand-drawn; no "SECTION" kicker; no filler word in captions.
- No build starts before its unit is spoken (spot-check three per scene against the word timings).
- Default transition `push-left` (N11); no shader; no transition over a build.
- Audio duration equals composition duration (to 0.1 s; `build-video.mjs` warns).
- Fonts load from `fonts/` when a custom font is declared (a still in Inter means the `@font-face` path is wrong).
- Every warning from `plan-from-timings.mjs` and `build-video.mjs` is fixed or listed in the report.

## 5. Report

Short, per item one line:
- Output paths (MP4, `captions.vtt`, `transcript.md`, `chapters.txt`, `plan.json`), duration, render time.
- Per slide: layout tag, template used, `exact` or fallback, motion level.
- Build timing sources: counts of reveal-event / speech-match / hand-cue / narration-estimate / fallback (`plan.json` `buildSources`); list every fallback and every clamped or inverted build.
- Additions: every `laps`, `crops`, INSERTED scene with quotes and times.
- Caption fixes (before, after); words you were unsure about.
- Assumptions (audience, input layout, pause handling, font used).
- Long dwells (> 25 s, no builds): slide and length, for the user's review.
- Voice: engine, reference, settings, any join you could not make clean (section 6).
- Anything in the principles you could not satisfy.
- Decisions, one line each with its reason.

## 6. Voice (synthetic narration; route A and any re-voiced talk)

Dominik's review (2026-10-16): "we will need a better source for the cloned voice and make it less disjointed over the slides". Rules that follow:

- **Authorisation first.** Clone a voice only from audio the user is authorised to use: their own voice, recorded for this purpose, or a speaker who has agreed in writing. Never clone a colleague, a public speaker or a recording of unclear provenance. If unsure, use a stock synthetic voice.
- **Label it.** A synthetic or cloned narration is labelled as such in the video description and the report ("synthetic voice"); say whose voice it was cloned from when it is a person.
- **Reference source.** A longer, cleaner reference than a conference recording: ideally a dedicated sample recorded for this purpose (quiet room, one microphone, steady distance, natural pace, no music, no cuts). If the reference is poor, say so and use a plain synthetic draft voice; do not ship a cloned voice you judge to be disjointed.
- **Generate by section, not line by line.** One request per section (several scenes) or at least per scene so intonation and pace carry across sentences. Same voice settings throughout, previous text passed as context where the engine supports it, one loudness target for every clip.
- **Join without seams.** `join-clips.mjs` normalises each clip to one loudness (-16 LUFS) and joins with 200 ms of silence; replace the silence with room tone from the reference if you have it. Listen to every join; a join that sounds like a new recording is a defect to fix, not to list.
- **Scene length follows the voice.** Re-plan from `durations.json`, then cue builds from the new word timings.
- Engines and setup: the `text-to-speech` skill (local, Apple Silicon) if the user has it; any engine that writes one audio file per request works. Transcription for word times: the `speech-to-text` skill or `scripts/transcribe-words.py`.
- **Narration takes.** Generate one request per scene, the whole paragraph. Verify each take by transcribing it back and comparing it with the script letter for letter (spaces, case and punctuation ignored); on a difference, retake, up to 3 takes per scene, then report the scene as unresolved with the differing words. Speak over the moves (N46): generate one take per section, not per scene, trim clip silences so no gap exceeds about 0.35 s, and set scene starts from the word times (the scene's first word minus about 0.3 s) so the push into a new screen runs under the bridge sentence. Never leave a silent gap at a scene change. (The older rule, a silence at least as long as the transition before each scene, is withdrawn.)
- **Word times for synthetic narration.** The script is known but the times are not: transcribe the generated audio (Parakeet, `uv run scripts/transcribe-words.py`; it gives sub-word tokens), then align the script's letters to the transcript's letters with `align-words.mjs` (`node tools/align-words.mjs --script script.json --transcript words.json --out aligned.json`). Display words keep the script's spelling and punctuation, times come from the audio, so captions need no recogniser text and no filler cleaning. It stops at the first letter that differs (a numeral the voice spoke as words, an abbreviation, a mis-heard name): write the script as it is spoken, or retake.
- **Loudness.** `audio.volume` (`data-volume`) is not linear in the render. Measure the rendered MP4 (`ffmpeg -hide_banner -nostats -i renders/x.mp4 -af ebur128 -f null - 2>&1 | grep -A1 Integrated`) and tune `volume` until it reads -16 LUFS (+/- 0.5). Measured starting points for a narration track normalised to about -16 LUFS: volume 1.0 -> -13.9, 0.794 -> -15.0, 0.7 -> -16.1. Re-render (or re-mux) after each change.
- **Report** the reference file used (path and length), the engine and settings, takes needed per scene, the measured LUFS, and any join you could not make clean.

## 6a. Review feedback

After a render, write the review page (`node kit/tools/review-page.mjs .`) and, if the user will review now, serve it (`node kit/tools/review-page.mjs serve .`, 127.0.0.1:4777, page at `/review/review.html`; stop it afterwards, never leave it running). The page and its files live in `review/`, never the project root (a second HTML file there fails `hyperframes check` with `multiple_root_compositions`). Their notes land in `review/feedback/<YYYY-MM-DD-HHMMSS>-feedback.json` + `.md`, or arrive pasted in chat from the file version. Shape, hash rule and limits: `kit/tools/README.md`. Treat each note as a fix request at `scene.id` / `t`; reply per note. If a note's `compositionHash` differs from the current page's, the notes refer to an older cut: map them by `scene.id` and say so. The review page needs the pinned hyperframes package (local `node_modules` or `--player <file>`).

## 7. What this brief does not cover yet

Hierarchy layouts (pyramid, orgchart, mindmap, conceptmap) and pie charts beyond fallbacks; re-highlighting a unit when the speaker returns to it; a typing effect (deliberately not built). New house-style notes go into `motion-principles.md`; change this brief only for process steps.
