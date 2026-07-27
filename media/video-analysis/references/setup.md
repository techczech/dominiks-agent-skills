# Video Analysis Setup

Use when preparing the environment on a new machine or after a fresh install of this skill.

## Prerequisites

- Apple Silicon Mac, ≥16GB unified memory (~7GB resident for the model).
- `ffmpeg`: `brew install ffmpeg` (duration checks, frame extraction, segmentation).
- LM Studio: `brew install --cask lm-studio` or <https://lmstudio.ai>.

## Model

Search `gemma-4-12b` in LM Studio and download `gemma-4-12B-it-GGUF` (Q4_K_M + mmproj, ~7GB).
LM Studio stores it under its own models directory; nothing here depends on that path.
App + runtimes must postdate the Gemma 4 12B release (June 2026); update Settings → Runtimes if loading fails.

## Server

`lms` is LM Studio's CLI. Run `lms bootstrap` once from the app's install to put it on `PATH`; if it is not
on `PATH`, call it by its full path under the LM Studio install directory.

```bash
lms server start
lms load google/gemma-4-12b
```

No venv — `scripts/lmstudio_video.py` is stdlib-only Python 3.

## Verification

```bash
curl -s http://localhost:1234/v1/models | grep gemma-4-12b
python3 scripts/lmstudio_video.py test-fixtures/ForBiggerBlazes.mp4 "Describe this video."
```

Expect a coherent description of the Chromecast "For Bigger Blazes" HBO GO ad. If you get that, the path works
end to end: frame extraction, image encoding, server, and model.

## Test fixture

- `test-fixtures/ForBiggerBlazes.mp4`: official 15s Gemma docs sample.
  Source: `https://github.com/bebechien/gemma/raw/refs/heads/main/videos/ForBiggerBlazes.mp4`

## Alternative: native audio+video (not used by this skill)

One-pass audio+video is possible outside LM Studio with `mlx-vlm` (≥0.6.1, `gemma4_unified`) and
`mlx-community/gemma-4-12B-it-8bit` (~13GB). It needs a Python environment, a larger download and roughly
twice the memory, so this skill stays on the LM Studio path and pairs it with a separate transcription step
(see Recipe 4 in `references/commands.md`). Take the `mlx-vlm` route only if you need audio and vision in a
single pass and can afford the extra memory.
