# video-analysis

An agent skill for analysing a video file locally with Gemma 4 12B running in LM Studio. You can ask it to describe or summarise a video or screen capture, answer questions about it, or produce a timestamped scene breakdown. Nothing is uploaded to a cloud service.

A bundled Python script extracts frames at 1 frame per second with `ffmpeg` and sends them to LM Studio's local server.

## Requirements

- An Apple Silicon Mac with at least 16 GB of unified memory (the model uses about 7 GB). `references/setup.md` lists this as the prerequisite; the skill documents no other platform.
- `ffmpeg` (`brew install ffmpeg`).
- LM Studio (`brew install --cask lm-studio` or from <https://lmstudio.ai>), with its server running and the model loaded. Gemma 4 12B was released in June 2026, so the LM Studio app and its runtimes must be newer than that release; if loading fails, update them under Settings, Runtimes.
- The `lms` command line tool that comes with LM Studio (run `lms bootstrap` once to put it on your `PATH`), used to start the server and load the model.
- The model `gemma-4-12B-it-GGUF` (Q4_K_M plus the vision mmproj file, about 7 GB), downloaded through LM Studio. Once loaded, it appears as `google/gemma-4-12b`, the id the script uses.
- Python 3. The script uses only the standard library.

## Limits

- Videos up to 60 seconds at 1 frame per second (at most 60 frames). Longer videos need to be split into segments first; `references/commands.md` shows how.
- About 70 visual tokens per frame, so questions about what happens over time work better than questions about fine detail inside one frame.
- No audio on this path. For "said and shown" analysis, pair it with a separate speech-to-text tool (Recipe 4 in `references/commands.md`).
- Reasoning mode is on by default, so set `max_tokens` to three to four times the visible output you want.

## What's in this folder

- `SKILL.md` - the procedure and limits.
- `scripts/lmstudio_video.py` - frame extraction and the request to LM Studio.
- `references/setup.md` - installing LM Studio, downloading the model, starting the server.
- `references/commands.md` - four analysis recipes and segmentation for long video.
- `references/troubleshooting.md` - server, model-loading and output-quality problems.
- `test-fixtures/ForBiggerBlazes.mp4` - a 15-second sample clip that `references/setup.md` identifies as the official Gemma documentation sample (the file gives its source URL), for checking the setup.

## How to use it

Put the folder where your agent looks for skills and ask it to analyse a video. The agent follows `SKILL.md`: it checks the path and duration, confirms the server is up, then runs the script. To check the setup yourself:

```bash
curl -s http://localhost:1234/v1/models | grep gemma-4-12b
python3 scripts/lmstudio_video.py test-fixtures/ForBiggerBlazes.mp4 "Describe this video."
```

The answer should describe the Chromecast "For Bigger Blazes" advert.

## Licence

MIT, as for the rest of this repository (see the LICENSE file at the repository root).
