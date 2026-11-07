# Animated talk video

## What it does

This skill lets a coding agent such as Claude Code turn a talk into an animated explainer video. You give it a talk outline with a narration script, or a recording of the talk with the times of the slide changes. The agent redraws each slide as a moving scene, builds each point when the voice says it, adds captions, and writes an MP4. Next to it you get `captions.vtt`, `transcript.md` and `chapters.txt`.

The style is a push-left transition between slides, a small title top-left and short regular-weight text. Motion comes in two levels: `calm` (fades only, for dense or beginner material) and `standard`.

The renderer is HyperFrames, an open-source tool from HeyGen that turns an HTML page into video. You do not need TalkWeaver.

## What you need

- Node 22 or later, and ffmpeg.
- A headless Chrome. The skill is tested with `chrome-headless-shell` and never uses your own Chrome. HyperFrames downloads one if it finds none.
- Disk space: about 130 MB for the HyperFrames packages in the project, 250 MB for the browser, and 195 MB of cache under `~/.cache/hyperframes`.
- Optional, for narration: a text-to-speech engine for a synthetic voice, and a speech-to-text engine that gives word times. On Apple Silicon the skill includes a script using Parakeet; elsewhere any engine with word timestamps, such as Whisper, will do. A captions-only video needs neither.

A render takes one to three times the video's length on a slower laptop.

## Install

The skill arrives as `animated-talk-video.skill`, which is a zip file, or as a folder. Unzip it, or copy the folder, into your agent's skills folder (for Claude Code, `~/.claude/skills`), then start a new session.

On first use the agent scaffolds a project folder and installs HyperFrames at a pinned version, 0.8.214. The pin is there because the project releases several times a day and the kit is tested against one version. The agent also turns HyperFrames telemetry off.

## Make a video from an outline

Write the outline in Markdown: `#` for the video title, `##` for a section, `###` for each slide. Add a layout tag in braces after the slide title, short bullets (nine words or fewer), and the spoken narration as `>` lines. `assets/sample-outline.md` is a three-slide example, and `references/inputs.md` lists the tags.

Then ask something like: "Use the animated-talk-video skill to make a video from outline.md. The audience is beginners." The agent will:

1. Ask about the audience if you have not said. If it is unknown, it uses `standard` motion and says so.
2. Draft a plan with estimated timings and show you stills, so you see the look before any audio exists.
3. Optionally generate synthetic narration, one clip per slide, and re-plan from the real clip lengths.
4. Check the build, look at a still of every scene, fix problems and render.

The first render needs a network connection for GSAP and the fonts.

## Illustrated scenes and widgets

Slides do not have to be bullet lists. An `illustration` slide is drawn from a small JSON file: a recurring line-art character, objects (documents, drawers, a search box, an agent chat window with tool calls, charts, logos) and build steps that arrive at the spoken words. `node tools/storyboard.mjs .` puts every frame on one page with its narration and movement: show that page to the author before any voice or render. A `widget` slide shows a self-contained HTML chart or diagram from the talk, stepped through its states (captured as stills with the headless browser). `references/inputs.md` has both formats; `assets/kit/samples/frames/` has three examples.

## Make a video from a recorded talk

Give the agent the recording, the outline and a file saying when each slide appeared, on the recording clock. A CSV works:

```csv
slide,start,reveals
intro,0:00
why-bread-rises,0:12.5,14.2
s3,41
```

A slide is named by its `id` tag, by `s<N>` (its position among the `##` and `###` headings), by its exact title or by its number. `reveals` are optional times when a build appeared. Without them, builds start at the first word of each phrase, found from word timings of the recording. A JSON list of `{ "slide", "t" }` objects also works. With no timings, the agent can propose slide changes from the transcript; you confirm each before it builds.

## Review and revise

After rendering, ask for the review page. The agent serves it at 127.0.0.1:4777: a video player and a rail of scenes you can jump between.

- Press **N** (or the Note button) to add a note at the current time. The video pauses.
- Click the picture to attach the note to a pin at that spot.
- Press ⌘Enter to save a note. You can also leave one general note.
- Click **Save feedback**. The page writes the notes to `review/feedback` in the project; the review page is at `/review/review.html`.

Tell the agent you have saved feedback. It reads the notes, treats each as a fix request at that scene and time, replies to each one and rebuilds. It stops the review server afterwards.

## Fonts, voices and licences

- **Fonts.** None are included. The default is Inter (open licence), which HyperFrames supplies. Dominik's talks use Microsoft Trebuchet MS, which cannot be redistributed, so it is not here. For your own typeface, put the `.ttf` files in `fonts/` and declare them in `look.json`. The renderer ignores system fonts.
- **Voices.** Clone a voice only from audio you are authorised to use: your own, recorded for this purpose, or a speaker who has agreed in writing. Label synthetic narration as synthetic in the video description.
- **Brand logos.** None are included, because they are trademarks. If a slide names an app, the build reads the official mark from an icon set you point it at (`iconSets` in `look.json`, or the `TALKWEAVER_ICONS` environment variable: TalkWeaver's `compiler/assets/icons` folder). Without such a folder the video shows the product name only and the build warns.
- **Licences.** HyperFrames is Apache-2.0 and installed from npm. The line-art characters and props are original drawings made for this kit (see `PROVENANCE.md`). The 41 icons are from lucide (ISC licence; notice in `assets/kit/icons/LICENSE.txt`). GSAP is loaded from a CDN under GreenSock's standard licence: check https://gsap.com/standard-license for your use. `PROVENANCE.md` has the full list.

## Troubleshooting

- **`render_cancelled_parent_exited`.** The render has to run detached. The skill's render command does this; the agent should poll its status, not wait on it.
- **Text comes out in Inter.** You asked for a system font, which the renderer ignores, or the `@font-face` path in `look.json` is wrong.
- **npm reports `ETARGET ... no matching version with a date before ...`.** Your machine has a minimum-release-age policy. The agent should ask you, not override it.
- **`check` warnings.** `nested_structure_needs_subcomposition` and `container_overflow` on `.tbody` are harmless. Anything else is real.
- **Do not** let the agent run `hyperframes@latest`, `init`, `add` or `skills update`, or use npm `--verbose` (verbose output has leaked auth tokens).
