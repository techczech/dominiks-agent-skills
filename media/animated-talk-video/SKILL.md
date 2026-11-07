---
name: animated-talk-video
description: "Use to turn a talk outline, slides or a recorded talk into an animated explainer video (MP4, captions) with HyperFrames."
---

# Animated talk video

Talk or script -> narrative -> illustrated storyboard -> timed scenes -> MP4. The slides are the key points, not the video: every spoken idea is shown as a picture of the thing itself (motion-principles sections 11-14). Kit of plain-JS templates (20 templates, ~75 layout tags, incl. `illustration` and `widget`), planner, builder, review page. HyperFrames pinned 0.8.214 renders. Node >= 22, ffmpeg, chrome-headless-shell. No TalkWeaver needed.

## Load order

1. `references/motion-principles.md` (rules; overrides taste; sections 11-14 are the current house style) and `references/agent-brief.md` (steps, report format).
2. `references/inputs.md` (outline tags, timings, words, cues) before writing an outline or running the planner.
3. `references/hyperframes-setup.md` before installing or rendering.
4. `designing-instructional-videos` (narrative planning, voice-image roles) and, for narration, `expository-writing` then `unslop`.
5. Charts, logos and widgets: `talkweaver-visuals` and `ai-model-benchmarks`; reuse the talk's own widgets as scenes (N39).

## Routes

- **A. Outline only.** Outline + narration (`>` lines) -> draft plan with estimated timings -> optional synthetic narration -> real timings -> video. Voice cloning only from audio the user is authorised to use; label the narration synthetic.
- **B. Recording + slide timings.** Real voice, the default for Dominik's recorded talks. Timings: TalkWeaver run JSON (`slideTimeIndex`), or CSV/JSON the user writes by hand (`inputs.md`). A short video is a cut of in-order excerpts chosen for the talk's through-line; each excerpt gets illustrated frames (N33), not its slide's bullets.
- **C. TalkWeaver package** (exporter not built yet). Expected inputs: `audio/voice.m4a`, `session.json`, `transcript.words.json`, `outline.md`, `look.json`, `fonts/`, `images/`, optional `cues.json` (layout in `agent-brief.md` Step 1C). Same planner as B.

## Steps

0. Genre, mode and audience (N31, N45: `explain` for beginners and hard ideas, `navigate` for paper, report or talk tours; paper explainers default to `navigate`), then narrative (N40, N50: an introduction, a bridge sentence into every section, difficult ideas split over screens with concrete examples): save the audience's starting knowledge, the claims and the narrative outline (or the chosen excerpts) as files and review them. Then storyboard: write frame JSON per scene (`references/inputs.md`), run `node tools/storyboard.mjs .` (every frame as a still with its key phrase, narration and movement, N44). **Dominik approves the storyboard before any voice or render.**
1. Scaffold: `node scripts/new-video.mjs <dir> [--outline file] [--install]`. Work inside `<dir>` (`tools/`, `kit/`, `look.json`).
2. Route-specific plan (`agent-brief.md` Step 1A/1B/1C): `node tools/plan-from-timings.mjs --outline outline.md [--timings f] [--words f] [--durations f] [--cues f] [--audio audio/voice.m4a] --out plan.json`.
3. Read `plan.json` sources and every warning; fix timings (cues, or edit `units[].t`), caption fixes, motion level.
4. `node tools/build-video.mjs .` -> `index.html`, `scenes.json`, `captions.vtt`, `transcript.md`, `chapters.txt`. Never hand-edit `index.html`.
5. `node tools/hf.mjs check` (0 errors, contrast AA), then `node tools/hf.mjs snapshot --scenes --moves`. **Open every still and look**, including for empty or text-only frames while the voice runs (N32). Fix, rebuild, re-snap.
6. `node tools/hf.mjs render` (detached; poll `node tools/hf.mjs status`). No command blocks longer than 4 minutes.
7. Review loop: `node kit/tools/review-page.mjs .`, `... serve .` (127.0.0.1:4777), read `review/feedback/*.json`, one reply per note, rebuild. Stop the server after.
8. Companion page (N63, N71): `node tools/companion.mjs . --out companion` builds the self-study app from the same outline, frames, `plan.json`/`scenes.json`, `cues.json`, `captions.vtt`, `chapters.txt` and the MP4. Views: home hub with progress; video with chapter timeline and synced transcript; Argument (the paper's case one chapter at a time: table of contents, an "In short" answer, numbered steps with thumbnails that open the build in a viewer); the widgets in self-study mode; a key-terms map; Apply (how researchers can apply the source, marked as our translation); Making (purpose, how an agent made it, the skills used with links). An optional Reading view (reading routes, read critically) exists but is off by default. Every view appears only when `companion.json` has its data (`argument`, `concepts`, `research`, `making`, `skills`, `reading`; example: `assets/sample-companion.json`). Section cards are left out unless listed in `keepChapterScreens`. The video is embedded only when its timings match the outline. Screenshot every view at desktop and phone width, light and dark, before handing it over.
   Publishing (Cloudflare Pages): files are capped at 25 MB, so point `video.file` at a web encode (`-preset slow -tune animation -crf 30 -c:a aac -b:a 96k -movflags +faststart` took 6 minutes of 1080p from 55 MB to 16 MB with no visible loss). Pages static assets ignore Range requests, so Safari will not play the video and chapter seeks fail: deploy with a Pages Function at `functions/media/[[path]].js` that answers Range with 206 (template: `assets/pages-range-function.js`). New projects need `wrangler pages project create --force` once (wrangler 4.15x delegates to Workers otherwise). Replace draft and copyright notices in `footer` before going public; publishing third-party figure redraws is the owner's decision.
9. Report in the `agent-brief.md` section 5 format.

## Defaults (house style, Dominik Lukes)

- No titles on explainer screens (N54): title mode `none`, frame `key` empty. Section cards carry the progress strip and a lead-in title built on a verb or a question; those titles are the chapters (N55-N57). (`kicker`, `tab`, `intro-then-none`, `full` remain on request.)
- Deliverable = MP4 + self-study companion page: the video embedded, chapters as a clickable table of contents, a step-through per section, and widgets in self-study mode (N63; rule in `designing-visuals-for-learning`). Widget scenes use `?video=1` (N60); screenshots are large and zoomed (N61).
- Transition `push-left` 1.2 s between slides; no shaders; interludes crossfade; no transition over a build.
- `navigate` density (N65-N70): open on a title card; screenshots for one sentence only; narration at about 150 words a minute; a visual event every 2-3 s, never more than 4 s without one; problems shown failing; the storyboard shows every state on a timeline, and a draft render goes with it.
- Every point punctuated by a visual arriving at its word; a new screen for each elaboration, about five elements at most (N48, N49); section cards with one big picture and the bridge spoken over them (N47); voice continuous across moves, never a silent gap at a scene change (N46); a paper explainer opens on the paper's title page and shows its figures and tables (N52).
- Every frame illustrated; one key phrase (<= 9 words) per frame; something arrives as each scene lands; line-art cast and agent-as-chat-window system (N36); official logos from TalkWeaver's icon sets for named products (N38).
- Rules: every movement has a job; two motion levels (`calm`, `standard`); builds start at the spoken word, never before; short changing phrases (<= 9 words), regular weight, not bold; boxes subtle; connectors touch boxes; content vertically centred; lucide concept icons, never emoji; captions cleaned, word-timed, below y 990; chapters from sections.
- Dense or beginner content: `calm`. Audience unknown: `standard`, and say so.
- Look: paper/ink/accents in `kit/templates/index.mjs`; font Inter unless the user supplies one (`hyperframes-setup.md`).

## Never

- Leave a mostly empty frame or a slide-bullet scene on screen while the voice explains something that could be shown.
- Narrate numbered steps, hedges or "what it does not mean" (N41, N42).
- Write narration as slogans or clipped fragments; it is one person explaining in linked sentences (N64).
- Leave silence at a scene change, open a section on a text-only card, or keep adding panels to one screen when the narration has moved to a new element (N46, N47, N49).
- Add facts, numbers, names, redrawn logos, music, sound effects, lower-thirds, slogans or calls to action the speaker or outline did not give.
- Reorder content to fit speech; correct the outline or the speaker silently (show the outline, report the difference).
- Invent build times without flagging them `fallback`.
- Use `hyperframes@latest`, `init`, `add`, `skills update`, a shader transition, or real Chrome.
- Ship or bundle a font you are not licensed to redistribute; clone a voice without authorisation; present a synthetic voice as a person.
- Leave a render or review server running; run verbose package-manager output.
- Skip the stills.

## Files

- `scripts/`: `new-video.mjs`, `plan-from-timings.mjs`, `build-video.mjs`, `hf.mjs` (`check` also warns on empty frames, N32), `join-clips.mjs`, `review.mjs`, `build-gallery.mjs` (every layout once, incl. illustration and widget), `storyboard.mjs <dir> [--png]` (the approval page, N44), `companion.mjs <dir> [--out companion]` (self-study page, N63), `transcribe-words.py`, `align-words.mjs`.
- `assets/kit/`: `templates/` (`illustration.mjs` + `_frame.mjs`, `_draw.mjs`, `_cast.mjs` = the line-art generator; `widget.mjs`; `_icons.mjs` = lucide / tabler / brand-logo resolver), `icons/` (41 lucide), `tools/` (review page, feedback server, vendor-icons, `shoot.mjs` headless stills), `samples/` (images, `frames/*.json` sample frames, `sample-widget.html`). `assets/sample-outline.md`: three-slide outline.
- Illustrated scenes: `{illustration frame=frames/x.json}`; frame JSON format and element types in `references/inputs.md`. Widget scenes: `{widget src=widgets/x.html steps=N}` (stills per state). Logos: `{icon=svgl:openai}` or a `logo` element, read from TalkWeaver's icon sets (`look.json` `iconSets` or env `TALKWEAVER_ICONS`), never shipped.
- `PROVENANCE.md`: origin and licences. `README.md`: for colleagues.
