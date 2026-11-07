---
title: Inputs the scripts read
register: FOR AGENTS
---

# Inputs

`scripts/plan-from-timings.mjs` reads the outline (all routes), optionally slide timings (route B), word timings and hand cues, and writes `plan.json`. Run `node tools/plan-from-timings.mjs` with no arguments for the option list.

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
- The agent is always a chat window (no robots, no faces); the main character keeps one face; red only for errors; named products carry their official mark (N38).
- Samples: `kit/samples/frames/*.json` (search by a person, agent with two tool calls into the tray, a logo row).

## Widget scenes (N39)

`{widget src=widgets/x.html steps=2 stepmode=key wait=900}` shows a self-contained HTML widget at 1920x1080. One bullet per step is the words that trigger it (speech match or hand cue, like any build); with `steps=N` and no bullets the planner spreads them.

- Chosen route: stills, not a live embed. `build-video.mjs` opens the widget once in chrome-headless-shell, steps it, saves one PNG per state into `assets/widget-stills/` (name carries a hash of the file, so an edited widget re-captures) and the scene cross-fades state k over state k-1 at build k. A live iframe has its own clock, fonts and network and drifts under HyperFrames' frame seeking.
- `stepmode`: `key` (default; ArrowRight once per step, which the Mapping the Landscape widgets accept with Space and Enter), `click` (click mid-page), `param` (loads `x.html?step=N`), `attr` (sets `data-step` on `<html>`, fires `stepchange`, calls `window.setStep(N)` if defined). `wait` = ms to let the widget settle. `stepmap=2,3,5` (with `stepmode=param`) picks which widget steps the builds show: build k shows step map[k-1], state 0 is step 0; use it to skip steps or to split one widget across two scenes.
- Open the stills in `assets/widget-stills/` and check each state differs. A widget whose bottom 90 px carry labels will sit under the captions: tell the author.

## Empty-frame check (N32)

`build-video.mjs` flags a scene whose settled state is only a title plus at most two short text lines, with no image, icon, illustration, widget, chart or table, while at least 6 words are spoken over it for 3 s or more. It prints `EMPTY FRAME`, writes `sparse` into `scenes.json`, and `node tools/hf.mjs check` repeats it (warning, never an error). Fix it: illustrate it or merge it into its neighbour.
