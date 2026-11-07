---
title: HyperFrames setup, render recipe and known traps
register: FOR AGENTS
---

# HyperFrames setup

HyperFrames (HeyGen, Apache-2.0) renders an HTML + GSAP composition to MP4 in headless Chrome. This kit emits one `index.html`; HyperFrames checks, snapshots and renders it. Facts below are from a spike on 2026-10-15 (macOS, Node 24, 0.8.214) and the kit's own builds.

## Requirements

- Node >= 22, ffmpeg and ffprobe on PATH (`brew install ffmpeg`).
- A headless Chrome. `chrome-headless-shell` (puppeteer's) is what the kit is tested with; never drive the user's real Chrome. If HyperFrames finds none it downloads one. To force one: `HYPERFRAMES_BROWSER_PATH=/path/to/chrome-headless-shell`; `tools/hf.mjs` passes `$CHROME_HEADLESS_SHELL` through.
- Network at first render: GSAP 3.14.2 loads from jsdelivr, the fallback fonts from Google Fonts (cached in `~/.cache/hyperframes/fonts`). Both must be reachable once. Offline renders need the files vendored (not done by the kit).
- Disk: `node_modules` 131 MB (75 packages) if installed locally; Chrome ~250 MB; HyperFrames cache ~195 MB under `~/.cache/hyperframes`.

## Version pin

- Pin **0.8.214**. The project shipped 7 releases in ~31 hours; `latest` moves hourly and the kit is not tested against it.
- Pin history: 0.8.141 (spike, 2026-10-15) -> 0.8.214 (2026-11-04: the 27 Oct talk video renders pixel-identical in 1 min 50 s against 2 min 40 s; 0.9.13 also identical, 1 min 31 s, but younger than this machine's 7-day npm min-release-age). Move to 0.9.x once it is 7 days old: re-render one finished video, compare stills, then change the pin in every file `grep -rl 0.8.214` finds. Release notes: github.com/heygen-com/hyperframes/releases (no CHANGELOG in the package).
- `check` from 0.8.2xx adds warnings the kit does not fix yet: `line_unread` (real-voice caption lines change faster than reading time), `text_below_floor` (illustration labels under 28 px), `negative_z_index` (`.hl`), `composition_file_too_large`. Treat them as known; 0 errors is the gate.
- Local pin: `npm install --save-exact --no-fund --no-audit hyperframes@0.8.214` in the project (scaffold with `--install`). Never add `--verbose`: verbose package-manager output has leaked auth tokens.
- No local install: `tools/hf.mjs` falls back to `npx --yes hyperframes@0.8.214 ...`.
- If npm refuses the pin with `ETARGET ... no matching version with a date before ...`, the machine has an npm `before` policy (min-release-age). Do not override it; ask the user, or use the newest version the policy allows and say so in the report.

## Telemetry and side effects

- Telemetry is on by default. `tools/hf.mjs` sets `HYPERFRAMES_NO_TELEMETRY=1`, `DO_NOT_TRACK=1`, `HYPERFRAMES_SKIP_SKILLS=1` (stops `init` checking GitHub for skills) and `HYPERFRAMES_NO_UPDATE_CHECK=1`. Also run once: `node tools/hf.mjs telemetry-off`.
- Do not run `hyperframes skills update` (it writes into the user's AI-tool skill folders) or `hyperframes init` (it writes 8.6 KB `AGENTS.md`/`CLAUDE.md` into the project that tell agents to load HyperFrames skills). `scripts/new-video.mjs` writes the project files itself.
- `hyperframes add <block>` adds a 384-line demo reel to `compositions/`, and `check` then lints it. Registry blocks are demos, not parts. Do not use them; the kit's transitions are GSAP (`kit/templates/transitions.mjs`), no shader package.
- `hyperframes doctor` reports optional tools (whisper-cpp, Kokoro TTS) as missing; ignore unless you want HyperFrames' own transcription.

## Commands (from the project folder)

```
node tools/hf.mjs check                    lint + runtime + layout + motion + contrast
node tools/hf.mjs snapshot --scenes        one PNG per scene at its settled time, into snaps/ (+ contact sheet)
node tools/hf.mjs snapshot --scenes --moves   also one per scene change, mid-move
node tools/hf.mjs snapshot --at 4,17,36    exact times
node tools/hf.mjs render                   detached render to renders/<folder>.mp4, log in render.log
node tools/hf.mjs status                   tail of render.log
```

Expected `check` output on a kit video: 0 errors; warnings `nested_structure_needs_subcomposition` (each scene is inline, not a sub-composition; render works) and `container_overflow ... overflowed top Npx` on `.tbody` (the body is lifted for the small title modes; harmless); contrast "N/N pass WCAG AA". Anything else is real: read it.

## Render recipe

- 1920x1080, 30 fps, H.264, default quality `looks` (CRF 16). About 0.85x of video length on an Apple M4 Max (82 s video: 70 s); the CLI drops to 2 workers on its own. Expect 1-3x video length on a slower laptop.
- **Detach it.** A render launched from a backgrounded subshell that then exits dies with `render_cancelled_parent_exited`. `hf.mjs render` spawns it detached (`HYPERFRAMES_RENDER_DETACHED=1`, new session, output to `render.log`) and returns. Poll `status` every minute or two; never block one command for more than 4 minutes. By hand: `HYPERFRAMES_RENDER_DETACHED=1 nohup npx --yes hyperframes@0.8.214 render -o renders/x.mp4 </dev/null >render.log 2>&1 & disown`. Never `set -m`: it fails in a non-interactive shell and the render is silently skipped. Wait with short polls (`tail -c 300 render.log`, `ls -l renders/`); done when the log says `Render complete`; confirm with `ffprobe`.
- Local renders may differ slightly from the preview; `--docker` gives determinism if Docker is available.
- Leave nothing running afterwards: no render, no review server.

## Fonts

- The renderer ignores system fonts. `Trebuchet MS`, `system-ui`, `sans-serif`, monospace names are mapped to bundled or Google fonts (Inter, Roboto, JetBrains Mono) fetched at render time. A page set in a system font comes out in Inter. A still in Inter when you expected another font means the `@font-face` path is wrong.
- The kit's default look uses Inter (open licence, mapped automatically): nothing to supply. For another typeface put the `.ttf` files in `fonts/` and declare them in `look.json`:

```json
{ "sans": "\"My Font\", Inter, sans-serif",
  "fonts": [ { "family": "My Font", "weight": 400, "src": "fonts/my-font-regular.ttf" },
             { "family": "My Font", "weight": 700, "src": "fonts/my-font-bold.ttf" } ] }
```

- **No font is included in this skill.** Dominik's talks use Microsoft Trebuchet MS, which is not redistributable; the skill does not ship it. Supply your own licensed font or a free one (Inter, Source Sans 3, Open Sans, Lato: SIL OFL or Apache). `fonts/` is gitignored in scaffolded projects.
- A monospace stack falls back to JetBrains Mono unless a mono file is bundled. Say which you used in the report.

## Composition rules the renderer enforces

- A composition is plain HTML with absolutely positioned 1920x1080 scenes and one paused GSAP timeline registered as `window.__timelines["main"]`. Seeking is deterministic: only `tl.to/fromTo/set`, no `Date.now()`, no `Math.random()`, no fetches except the GSAP and font CDNs.
- Captions live outside the scene elements (scene DOM is captured during transitions) and below y = 990. `compose()` does this.
- Audio is an `<audio data-start data-duration data-volume>` element on the timeline; the renderer mixes it. Composition duration must equal audio duration to 0.1 s.
- `data-volume` is not linear in the render. Measure the MP4: `ffmpeg -hide_banner -nostats -i renders/x.mp4 -af ebur128 -f null - 2>&1 | grep -A1 Integrated`, and tune the volume to -16 LUFS. Measured: 1.0 -> -13.9, 0.794 -> -15.0, 0.7 -> -16.1 (narration normalised to about -16 LUFS).
- `snapshot` is the feedback loop: PNGs at exact timestamps. Snapshot "end of timeline" can read ~2 s short; harmless.
- Shader transitions on near-white slides smear text and produce a blank frame. The kit uses GSAP moves; do not add `whip-pan` or other shaders.
