---
title: Inputs the scripts read
register: FOR AGENTS
---

# Inputs

`scripts/plan-from-timings.mjs` reads the outline (all routes), optionally slide timings (route B), word timings and hand cues, and writes `plan.json`. Run `node tools/plan-from-timings.mjs` with no arguments for the option list.

The outline's `# ` heading is only the plan's title: no title scene unless `--title-scene` (route A) or a timing row named `title` (route B). `--profile silent` writes `"profile": "silent"` (also read from `look.json`): step cards and short textblock statements get a 1.2 s read floor instead of 2 s, and a statement may open the film (D16). A scene's `"readFloor": <s>` in plan.json overrides either.

## Outline format (`outline.md`)

Markdown. Frontmatter carries `mode: explain | navigate` (N45). One slide = one `###` heading (a `####` also counts as a slide). A `##` heading is a section divider and becomes its own title card (no builds); give it a layout (`## Part {illustration frame=frames/card.json}`) to make it an illustrated section card (N47), which still starts a chapter. One `#` heading is the video title; with no timings it also becomes an opening title card.

```markdown
# Video title

## Section title

### Slide title {layout-tag id=abc accent=blue motion=calm}
{iconrow}                         (tags may also sit on their own line directly under the heading)
- Top-level point {icon=lucide:brain}
  - Nested point
> Narration: what is said while this slide is up (route A; also the source of draft timings and captions).
```

### Tags (in `{...}`, space-separated)

| Tag | Effect |
| --- | --- |
| a bare word (`iconrow`, `equation=circle`) | layout; first bare word wins; none = `list`; `##` = section card |
| `id=abc` | slide id used by timings and cues; without it the slide is `s<N>`, N = its position among all `##`/`###` headings (the plan shows each id) |
| `accent=blue` | accent colour name from the look (`green`, `blue`, `orange`, `red`); default cycles by section |
| `motion=calm\|standard` | overrides `suggestMotion` |
| `transition=push-left` | per scene; `cut`, `crossfade`, or a name in `kit/templates/transitions.mjs` |
| `titlemode=none` | per scene title mode |
| `variant=title\|closing\|numbers\|stairs\|...` | template variant |
| `dense`, `continues` | `dense` forces calm; `continues` = same idea as the previous slide, cut instead of push |
| `heads=Before\|After`, `head=A\|B\|C` | headings of `compare`/`contrast`, columns of `table` (use `_` for a space) |
| `focus=1-2,4` | line ranges highlighted on a `code` slide, one per build |

Per-bullet tags: `{icon=lucide:name}`, `{color=blue}` (equation terms), `{tone=warn}`, `{spin}`. A trailing `:` on a bullet is dropped.

### Layouts (templates in `kit/templates/`)

Tag(s) -> template: `statement`; `quote` (last bullet `— Source` is the source); `list`, `numbered`, `iconlist`; `iconrow` (top bullets = columns, children = boxes); `equation`, `equation=circle`; `cycle` (top bullet = node label, child = body); `timeline` (`Label: text`); `process`, `steps`, `agenda`, `stairs`; `compare` (two top bullets with children), `contrast` (rows `Left / Right`); `cards`; `stats` (`75%: of teams`); `code` (a fenced block; `terminal`, `trace` variants); `media`, `image-claim`, `image-grid` (`![alt](assets/x.png)` lines); `illustration` (`{illustration frame=frames/x.json}`, see Frame JSON); `widget` (`{widget src=widgets/x.html steps=2}`, see Widget scenes); `table`; `chart`, `barchart`, `linechart` (`Alpha: 40`); `chat` (bullets `user: text`, roles `user reasoning context tool result assistant`); `section`, `title`, `closing`. `analogy` is not an outline layout: it is inserted by hand (see agent-brief section 3). Header comment of each template file has its exact slide shape. `resolveLayout()` reports `exact:false` for tags with no template of their own (`pyramid`, `mindmap`, `orgchart`, pie charts): they are drawn as a list or cards, and `build-video.mjs` prints a `fallback` line. Do not pretend they are exact.

Icons: `{icon=lucide:name}` is read from `kit/icons/` (41 shipped; more: `node kit/tools/vendor-icons.mjs <lucide-name> ...`, pinned lucide-static 1.21.0, ISC). `tabler:name` is drawn from TalkWeaver's `tabler.json` (a few names also have a lucide stand-in). Brand logos (`svgl:openai`, `si:github`) are read at build time from TalkWeaver's icon sets (`compiler/assets/icons/`: `svgl.json`, `extra.json`, `simple-icons.json`), never copied into the skill. The folder: `look.json` `"iconSets"`, else env `ANIMATED_TALK_ICON_SETS` or `TALKWEAVER_ICONS`, else Dominik's TalkWeaver checkout if present. A white dark-mode mark is recoloured to ink; a missing mark gives the name only and a build warning. Markdown `**bold**` in titles, bullets and narration is stripped (regular weight, N22).

Units: 9 words or fewer per bullet; the build warns above that. Do not paraphrase to shorten: delete words from the author's own text, or leave it and report it.

Images: relative paths from the project folder (`assets/...`).

## Narration (route A)

`>` lines under a slide are the narration for that slide. Write them as spoken prose: one paragraph per slide, full sentences, numbers as they are said. They do three jobs: the TTS script, the estimate of scene length (2.6 words/s plus lead-in), and draft captions. Without audio, builds are timed by matching each bullet to where its words fall in the narration at that pace (`source: narration-estimate`).

After TTS: one clip per slide in `audio/clips/<NN>-<slideId>.wav`; `node tools/join-clips.mjs audio/clips audio/voice.m4a` normalises loudness, joins with 0.2 s gaps and writes `durations.json`; transcribe `audio/voice.m4a` for word times (below); then `plan-from-timings.mjs --outline outline.md --durations durations.json --words words.json --audio audio/voice.m4a`.

## Slide timings (route B)

Any of these, passed as `--timings`. Times are on the recording clock. Slides are named by id, by `s<N>`, by exact title (case-insensitive) or by number.

**1. TalkWeaver run JSON** (the `session.json` / `sess-*.json` of a recorded run): an object with `slideTimeIndex`, a list of `{ "event", "slideId", "tMs" }`:
- `enter`: the slide is shown from `tMs` (run clock, milliseconds). One scene per `enter`; a slide entered twice is shown twice.
- `reveal`: one build step revealed at `tMs` on `slideId`. Used as logged when there are at least as many as the slide has build units; otherwise ignored with a warning.
- `pause` / `resume`: bracket gaps in the recording. The script warns; confirm whether the audio omits the gap and shift times yourself if it does.
- Slide ids in the log must match `{id=...}` in the outline (TalkWeaver writes both).

**2. JSON array written by hand:**

```json
[ { "slide": "intro", "t": "0:00" },
  { "slide": "why-bread-rises", "t": "0:12.5", "reveals": [14.2] },
  { "slide": 3, "t": 41 } ]
```

`t` / `start` / `at` = seconds or `m:ss(.f)` or `h:mm:ss`; `reveals` (or `builds`) optional.

**3. CSV** (header optional; `reveals` separated by `;`):

```csv
slide,start,reveals
intro,0:00
why-bread-rises,0:12.5,14.2
s3,41
```

Options with timings: `--from S --to S` cut a stretch out of a longer recording (timings on the recording clock; words and audio on the cut clock; the cut audio file is yours to make with ffmpeg: `ffmpeg -ss S -to S -i full.m4a -c:a aac cut.m4a`); `--end S` ends the last scene when `--to` is not given (else last word + 1.5 s, with a warning). The first scene is always moved back to 0.

## Word timings (`--words`)

Seconds on the clock of the audio file the video plays. Accepted: `[{ "w": "word", "s": 1.2, "e": 1.5 }]`; the same grouped as `[{ "words": [...] }]` (what `scripts/transcribe-words.py` writes); Whisper-style `{ "segments": [{ "words": [{ "word", "start", "end" }] }] }`. Local transcription on Apple Silicon: `uv run scripts/transcribe-words.py audio/voice.m4a words.json` (Parakeet via MLX). Elsewhere: any engine that gives word times (Whisper with `--word_timestamps True`). With these, builds start at the first word of each bullet's phrase (never earlier) and captions are cut from the real words.

Read the cleaned captions against the outline's vocabulary and fix recogniser slips in `plan.json` `captionFixes`: `[["hard computer", "the computer"]]`, or `["/regex/", "text"]`; case-insensitive. List every fix in the report.

## Hand cues (`--cues cues.json`)

`{ "slide-id": [seconds, seconds, ...] }`, one time per build unit in outline order, on the output clock. Use where the speech match is wrong (the plan marks a build `fallback` or `speech-match` with a low `score`). An out-of-order cue is allowed when the speaker said things out of order; the script warns and keeps it.

Highlight cues (optional, same file): key `_highlights`: `{ "slide-id": [{ "item": 0, "at": 12.4 }, { "item": null, "at": 20 }] }`. `item` = build-unit index (outline order), `at` = seconds, output clock, where the speaker names or returns to that item; `item: null` clears the focus. Copied to `plan.json` `scenes[].highlights`; `build-video.mjs` passes them to `compose()`.
Used by list, iconrow, compare only (`kit.focus`): named item tinted, other built items dim to 62 %, 0.45 s. Without cues the per-build marker stays. A focus starts >= 0.5 s after its item's build. Only cue words the speaker actually says.

## plan.json (what the scripts exchange)

`{ title, duration, audio, titleMode, captionFixes, scenes:[{ slideId, start, end, slide, units:[{ text, t, source }], highlights?, motion?, transition?, narration? }], words, wordsEstimated?, buildSources, warnings }`. `source` = `reveal-event` | `hand-cue` | `speech-match` | `narration-estimate` | `fallback`. Edit it directly to fix a time, insert an `analogy` scene (set `slide.inserted: true`, nodes with `t` and `said`; shorten the previous scene's `end` and make the next `start` match), or change a transition. `node tools/build-video.mjs .` regenerates `index.html`, `scenes.json`, `captions.vtt`, `transcript.md`, `chapters.txt` from it. Do not hand-edit `index.html`.

`look.json` overrides the kit look (paper, ink, muted, hairline, accents, tints, sans, mono, fonts). Use only tokens from the deck's own look if the talk has one.


## Frame JSON (illustrated scenes, N33-N38)

One file per illustrated scene, referenced by `{illustration frame=frames/x.json}` (or an image line `![](frames/x.json)`). The kit draws it as SVG at build time (cast, props, palette from `look.json`). `node tools/storyboard.mjs .` shows every frame as a still first.

```json
{ "id": "search", "scene": "Search", "key": "A person types a query",
  "narration": "...", "motion": "what moves, for the storyboard page",
  "elements": [ { "type": "floor" }, { "type": "person", "id": "me", "who": "main", "pose": "think", "mood": "think", "x": 300, "y": 936 } ],
  "builds": [ { "cue": "search box", "at": 3.2, "motion": "pop", "elements": [ { "type": "searchBox", "x": 600, "y": 300, "w": 1200, "query": "evaluation figures" } ],
                "hide": ["old-id"], "dim": { "other-id": 0.45 } } ] }
```

- `key`: the one key phrase, at most 9 words, drawn top-left (default: the slide title). Labels are 26 px or larger; the caption zone below y 990 stays empty; the floor line is y 940.
- `elements` are drawn from the start. `builds` arrive one by one: `cue` = the words that trigger it (matched to the speech like an outline bullet; hand cues in `cues.json` win), `at` = seconds from the scene start (a hand time, optional), `elements` = what arrives, `hide` = ids that fade out (a swapped state), `dim` = ids to fade to an opacity. A build never starts before the scene's push has finished.
- `motion` per build or element: `rise` (default), `fade`, `pop`, `slide:dx,dy[,s]`, `move:dx,dy`, `wipe:r|l|d|u[,s]`. Calm motion turns all into fades.
- Element types (coordinates on the 1920x1080 frame; every element may carry `id`): scenery `floor plant window clock picture desk table keyboard monitor headset stress`; people `person` (`who`: main, approver, newbie, alerted, xa, xb, xc; `mood`: neutral think worried frown smile surprised; `pose`: stand think point pointLeft open wave talk hold reach typing seated; `x`,`y` floor point, `s` scale, `look` -1..1, `flip`, `desk` for seated typing, or explicit `L`/`R` hand targets) and `crowd`; speech `bubble thought message`; agent system `agent` (green "Agent" tab; `tray` = height of the "Model's context" tray; `chatbot:true` for a plain tab), `tray`, `tool` (`from`,`to`,`label`,`icon`,`labelAt`: dashed arrow with a chip); documents `page slip filename stack folder envelope receipt sheet cabinets` (cabinets: `opened`, `hl`, `tabs`) `inbox searchBox ladder` (`labels` bottom to top, `at` = rung lit; climbed upwards) `chart` (`data` [[x,y]] in 0..1, `kind` line|bars, or `image` = the talk's chart PNG); marks `logo` (`logo:"svgl:openai"`, `size`, `name`), `logoCard`, `logoRow`, `icon`, `lens pen book badge agentMark`; text and shapes `text lines chip tag rect circle line arrow image` (`image src` = a project-relative picture such as a screenshot).
- Relationships (N87, N88): when a sentence links things, draw the link, never cards side by side. Choose by meaning, in this order:
  - `transform` (something acts on, makes, turns, summarises, sorts, checks or changes something): `actor` `{mark, name, caption}` top-left (optional), `input` and `output` `{look, label, ...}` with `look` = `reviews` (`n`) `stack` `receipts` `page` (`title`) `message` (`text`) `summary` (`title`) `list` (`rows`) `app` (`title`, `spark: true`) `mark` or `card` (`mark`, `label`, `caption`), `verb` `{text, mark, note}` (node: an AI spark, a lucide icon, or the actor's logo in a ring). Parts: `actor caption input node verb note output`.
  - `relate` ("X does Y", nothing visibly changes): `rows: [{ subject: {mark, name, caption}, verb, result: {mark, label, caption} or {look, ...} }]`, one row per subject (two fit; `rowH`). Parts per row i: `subject:i scap:i verb:i result:i rcap:i` (`rcap` = the result's caption, for a card or any `look`).
  - `tagged` ("X is Y" / "X has Y"; with no tags, a peer row): `cards: [{ mark, name, caption, badge: {text | mark}, tags: [{ text, mark, no }], no }]`; up to 4 cards in a row, two rows for 5-8 (`perRow`); tags hang in one row joined by a bus, or either side of a spine when they do not fit; `join: "+"` puts a plus between cards; `no: true` crosses a card or tag out in red. Tags stay inside the room their card owns: one row on a bus when they fit, else two columns on a spine with the size shrunk to the column, else one column; a tag that cannot fit at 26 px is cut with an ellipsis and the build warns. Options `tagSize`, `captionSize`, `cardW`, `markSize`. Parts: `card:i caption:i badge:i no:i tag:i.j`.
  - All three: box `x y w h` (default 160, 170, 1600, 720, laid out and centred inside it), colours `accent tint hair`. A mark is `svgl:x` / `si:x`, a lucide name, a picture path (`aspect` for a wide wordmark), or a list of these; `plate` puts a colour behind a white mark. `parts` names what this element draws (a prefix such as `tag:0` or `tag` matches all below it); repeat the same spec with different `parts` and ids to make the pieces arrive on separate cues (`splitRelation()` and `relationParts()` in `_frame.mjs`). `splitRelation()` warns when a part is drawn twice or never. Text that cannot fit at 26 px is not wrapped: the build warns with the frame and element id. A frame with duplicate SVG ids fails the build. Light-mode logo recolouring: `node kit/tools/test-light-mode.mjs [iconSets]`. Write the chosen form and the reason per screen in the design file; never derive it from counts or keywords.
- House elements (D1-D13; drawn by the kit, so a video composes a screen from them and never from raw rects, lines and text). None draws a title, kicker or footer. Each composite takes `parts` (a prefix matches all below it) so one element can arrive over several cues: repeat the spec with different `parts` and ids. Text is 34 px or more; labels in boxes 40 px or more; 28 px between text and border.
  - `box` `{x, y, w, h, text, icon?, tone?}`: a labelled box; the label is centred both ways and auto-fitted 40-56 px (wraps on spaces and `\n`); `icon` goes above the label (left of it in a box under 190 px tall); `tone` = `ink` (default) `accent` `muted` `orange`. Use it for Question / Answer style boxes, never `rect` + `text`.
  - `quote` `{text, source, date?, figure?, x?, y?, w?}`: no box; words 64-80 px regular, at most 1380 px wide, a pale oversized quotation mark hanging left, the source line in the mono face, capitals, accent, led by an em dash; `figure` = a project-relative picture left of the words. Parts: `mark text source figure`.
  - `stat` `{value, label, x, y}` (`x` = centre, `y` = top): a big bold number in the accent (about 150 px) over a 48 px label, no box. `stats` `{items: [{value, label}] (up to four), x?, y?, w?}`: a row; parts `value:i label:i`.
  - `step` `{n?, of?, text, accent?, sub?, picture?, color?}`: a full-screen step card for a sequence (D6): the number (200 px) in the display face and the accent with a small "of N" on its baseline, the sentence below in the display face (96-104 px) on the same left axis, `accent` = a second clause in the accent (or `true` with a `\n` in `text`), `picture` = image src or icon name on the right (640 px wide, rounded). No kicker, no title bar. Parts `num` (with "of N") `text sub picture`. `color` sets the accent colour (an `accent` starting with `#` still works as a colour).
  - `steps` `{lead?, items: [{label, thumb? (image src) | icon?}], size?, split?}`: a numbered list of up to six items; with a lead, two columns by default (lead left at 78 px, rows right; `split: false` puts the lead above), numbers in the display face and accent, labels 44-48 px in the text face (D16). Allowed as the only content of a frame, lead included (D4). Parts `lead` `item:i`.
  - `textblock` `{lines: [{text, size?, color?}], align?, x?, y?, picture?, measure?}`: plain text lines for a screen that states a name, a date or a claim (D5: facts about who, when and where are text, not a relationship drawing). `align` `middle` (default) or `start`; sizes 44 px or more unless set (56 default); lines of 64 px or more use the display face. Lines wrap to about 30 em (at most 1320 px) and the block is centred (D19). `picture` (image src or icon name) sits centred above the lines: opening cards. Parts `text picture`.
  - `section` / `title` template cards (outline `##` and the opening) take a slide field `picture` (image src or icon name): drawn right of the title, 640 x 360, vertically centred; the title is in the display face (D6, D18).
  - `cycle` `{nodes: [{label, icon}], returnLabel?, x?, y?, w?}`: nodes in a row, forward arrows that meet the box edges square, one curved return path beneath from the last node to the first, the label under the curve's lowest point (D7). Parts `node:i` `step:i` (the arrow after node i) `return` `label`. Never draw a loop as lines and arrows.
  - `focus` `{target, pad?}`: the one highlight (D9): a soft orange wash and a 4 px orange outline, radius 24, 24 px clear of the target on every side (`pad` can only add). `target` = the id of another element in the same frame, or `id/part` for one part of a composite (`loop/node:1`, `row/value:0`) (its box comes from `_geom.mjs`) or `[x, y, w, h]`. Fades in by default. To move it, put the new `focus` in the next build and name the old one in `hide`; at most one change every 2 s, never the target already highlighted, never the only thing on screen.
  - `pointer` `{from: [x, y], to: id | [x, y], label?, color?}`: a thin (4 px) arrow, ink (default) or `"accent"`, never red, a small head, curved when diagonal, ending 16 px short of its target; `label` sits at the tail. Use it for any arrow that points at a thing; no thick or dashed arrows (only `tool` is dashed).
  - `chat` `{messages: [{who: "user" | "agent", text, kind?}], title?, y?, w?, h?}` (default 120, 800; the window is at most 1320 px wide and centred, D19; `x` only places a narrower window): TalkWeaver's chat design (D11): the user's words in a grey bubble on the right, the agent's words as plain text on the left beside a small round avatar, and a step as a coloured chip by `kind` (`thought` violet, `search` olive, `tool` orange, `result` magenta). Parts `frame msg:i`. When the source has a working widget or mock chat, show that through a `widget` scene instead.
  - `message` is now a chat bubble or a short label at 34 px or more with 28 px padding; a single short label is centred. A box with a label is `box`. The `agent` window draws its "Agent" / "Chatbot" tab inside the title bar (it can no longer cover a label above the window); its `title` sits at the bar's right end, or just under the bar when the bar has no room.
  - `node tools/lint-frames.mjs .` checks the frames (text floor, padding, overlaps, headings, raw compositions, arrows, highlights, screen load); it exits 1 on any error. See `kit/tools/lint-frames.mjs --rules`.
- The agent is always a chat window (no robots, no faces); the main character keeps one face; red only for errors; named products carry their official mark (N38).
- Samples: `kit/samples/frames/*.json` (search by a person, agent with two tool calls into the tray, a logo row, `relation-transform`, `relation-relate`, `relation-tagged`; and one per house element: `box quote quote-figure stat stats step textblock cycle focus pointer chat agent-window`, plus `step-card` (with picture), `steps-list`, `chat-narrow`, `title-picture`, `title-card` (the house title page and cover, N65)), their stills in `kit/samples/stills/` (made with `node kit/tools/frame-still.mjs <frame.json> <out.png> [--type geist]`, which loads the real faces), and deliberately bad frames for the lint in `kit/samples/lint-bad/`. The first three older samples keep a key phrase and small text and are listed as legacy in `samples/frames/_lint-skip.json`.
- Review stills with the faces loaded: `node kit/tools/frame-still.mjs frames/<id>.json <out.png>`; pictures resolve against the project (the folder above `frames/`, or `--base`), as in the build, and the project's `look.json` is used.

## Widget scenes (N39)

`{widget src=widgets/x.html steps=2 stepmode=key wait=900}` shows a self-contained HTML widget, captured at 1320x900 and centred (D19; `fullWidth` in the outline tag, e.g. `{widget src=… fullWidth}`, or on the plan slide or scene gives the old 1920x1080 at 0.9 scale). One bullet per step is the words that trigger it (speech match or hand cue, like any build); with `steps=N` and no bullets the planner spreads them.

- Chosen route: stills, not a live embed. `build-video.mjs` opens the widget once in chrome-headless-shell, steps it, saves one PNG per state into `assets/widget-stills/` (name carries a hash of the file, so an edited widget re-captures) and the scene cross-fades state k over state k-1 at build k. A live iframe has its own clock, fonts and network and drifts under HyperFrames' frame seeking.
- `stepmode`: `key` (default; ArrowRight once per step, which the Mapping the Landscape widgets accept with Space and Enter), `click` (click mid-page), `param` (loads `x.html?step=N`), `attr` (sets `data-step` on `<html>`, fires `stepchange`, calls `window.setStep(N)` if defined). `wait` = ms to let the widget settle. `stepmap=2,3,5` (with `stepmode=param`) picks which widget steps the builds show: build k shows step map[k-1], state 0 is step 0; use it to skip steps or to split one widget across two scenes.
- Open the stills in `assets/widget-stills/` and check each state differs. A widget whose bottom 90 px carry labels will sit under the captions: tell the author.

## Empty-frame check (N32)

`build-video.mjs` flags a scene whose settled state is only a title plus at most two short text lines, with no image, icon, illustration, widget, chart or table, while at least 6 words are spoken over it for 3 s or more. It prints `EMPTY FRAME`, writes `sparse` into `scenes.json`, and `node tools/hf.mjs check` repeats it (warning, never an error). Fix it: illustrate it or merge it into its neighbour.


## Journey and gallery input

Run `node scripts/build-journey.mjs journey.json --videos /path/to/video --out site`. The builder reads real `journey.json` whenever present; otherwise it uses or generates `journey.placeholder.json` from the ordered video script title hooks. Placeholder builds are for local development only.

Input is a JSON object with `mode` (`journey`, the default, or `gallery`), `title` and a non-empty `stops` array. Optional top-level fields: `subtitle`, `promise`, `intro` (paragraph array), `meta` (`date`, `place`, `speaker`, `slides`, `activities`), `closing` (`text` paragraph array, `next`, `feedback`) and `footer` (line array).

Each stop requires `title` and a local `video` MP4 path, or an `id` matching a folder under `--videos` containing `<id>-web.mp4`. Optional fields: `id` (otherwise a two-digit position), `thumbnail` (1280×720 JPEG path), `date`, `length` (seconds or a display string; otherwise measured with ffprobe), `page` (learning-page URL or relative link), `slides` (URL, or a section name with `meta.slides`), `question`, `why`, `bridge`, `tryIt` (`prompt`, `doneWhen`) and `activity`. The `video` and `thumbnail` filesystem paths resolve relative to the input JSON. The `page` and gallery `slides` links resolve from the built index, or can be absolute web URLs. Omitted optional content stays absent.

Journey mode supplies a connected path, continuous player, stop rail, pausable eight-second bridge cards and `#/play/03` links. Gallery mode supplies a card grid opening each `page`, or an independent `#/watch/03` player if no page is supplied; it has no playlist or bridges. With `--videos`, companions are generated in sibling `build/<id>/` folders using the unchanged companion build pipeline and the source outline, frames and measured timings; original video folders are never written.

By default MP4s and thumbnails are copied once into `site/media/`, so the output works from `file://` and a static host without fetching scripts or JSON. `--media-base ../videos` instead references an existing neighbouring `videos/<id>.mp4` and `<id>.jpg` tree (as in the workshop distribution); retain that tree beside the site for offline use. There are no CDN or external font dependencies. Node 22+ and ffprobe are build-time requirements.

```json
{
  "mode": "gallery",
  "title": "A series of research talks",
  "stops": [{"title": "First talk", "date": "3 November 2026",
    "video": "talks/first.mp4", "thumbnail": "talks/first.jpg",
    "page": "talks/first/index.html", "slides": "https://example.org/slides"}]
}
```


## Series input

A session with several videos uses `companion.mjs` series mode, selected by
`series` in `companion.json`. `build-journey.mjs` now accepts gallery mode only;
its filename and gallery CLI are retained.

Run `node scripts/companion.mjs <config-folder> --out site`.
`--config companion.test.json` selects an explicit fixture; the default remains
`companion.json`. Never publish a fixture (`placeholder: true`).

See `assets/sample-series-companion.json`. Each `series.videos` item has a unique
`id`, `dir` relative to the config folder, and optional `title`. The directory
contains the ordinary video inputs: outline, measured plan/scenes, frames, kit,
cues, captions, chapters, `<id>-web.mp4` and `thumbnail.jpg`. Existing per-video
`companion.json` input and screen overrides are honoured. Timing and staleness
checks are the single-video compiler's checks. Outlines with only screen headings
get sections from the measured chapter list; source files are untouched.

`argument.parts` determines the session order. Each part has `id`, `title`,
`summary`, optional `video` (each series video belongs to exactly one part),
`tryIt: {prompt, doneWhen}`, `slides` (section label) and `activity` (label).
Parts without a video work too. Terms use `parts: [partId]` and
`screens: ["videoId/screenId"]`. All participant prose stays in the config.
The other views use the same concepts, research, furtherStudy, skills and making
fields as single-video input. Only explicitly listed furtherStudy figures appear.

Without `--media-base`, media is copied to `media/` for offline file use.
With `--media-base ../videos`, references are `../videos/<id>.mp4` and
`../videos/<id>.jpg`; the hosting site must supply those files. Video routes are
`#/video/<id>?t=<seconds>`. Playback never automatically advances.

External resources can be listed as `links: [{title, url, summary, kind: "guide"}]`.
They render as plain external link cards in Reading; `furtherStudy` continues to
mean local files whose dependency graph is copied. `copy.furtherStudy` labels
that card area and `copy.furtherIntro` introduces it. Series interface overrides
also include `tryIt`, `doneWhen`, `copyPrompt`, `slidesLabel`, `activityLabel`
and `nextVideo`; `heroPrompt` (with `heroPromptHeading`) adds a copyable prompt under the hero text. `series.slidesUrl` is the slides link shown with each part's `slides` section name (no link without it). `agentGuide: {file, preamble, baseUrl, note}` writes a plain-text guide for agents beside the page: the `preamble` Markdown file (relative to the project), then every part's title, summary, video and page links (absolute from `baseUrl`), exercise and Try it. The page links to it with `<link rel="alternate" type="text/markdown">` and a hidden note carrying `note`. Empty chapter files do not invent ticks: authored section scenes
retain the single compiler's timings; an outline without sections gets no ticks.
