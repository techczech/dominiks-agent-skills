---
name: video-analysis
description: "Analyse video locally with Gemma 4 12B via LM Studio on Apple Silicon. Use whenever the user wants to describe, summarise, or ask questions about a video file, get a timestamped scene breakdown, or combine what is said with what is shown — even if they don't say 'video analysis' explicitly (e.g. 'what happens in this recording', 'summarise this screen capture', 'check what this demo shows')."
---

# Video Analysis

## First Move

- Confirm video path and duration; model sees max 60s at 1 FPS. Longer video: segment first (`references/commands.md`).
- Ensure LM Studio server up with model loaded (`references/setup.md`).

## Use

- Local video understanding with Gemma 4 12B (GGUF Q4_K_M + vision mmproj in LM Studio).
- `scripts/lmstudio_video.py` extracts 1-FPS frames and posts to the local server — same representation the model uses natively for video.
- Limits: video ≤ 60s @ 1 FPS (max 60 frames), ~70 visual tokens per frame — favour temporal questions over fine in-frame detail.
- No audio on this path: pair with any speech-to-text tool for said+shown analysis (Recipe 4).
- Reasoning mode on by default: budget `max_tokens` 3-4× desired visible output.

## Scripts

- `scripts/lmstudio_video.py`: 1-FPS frame extraction → LM Studio chat completion; the verified video path.

## References

- `references/setup.md`: LM Studio install, model download, server start
- `references/commands.md`: the four analysis recipes + segmentation for long video
- `references/troubleshooting.md`: server, model-loading, output-quality issues

## Verification

- Check video path, duration (`ffprobe`), server (`curl -s localhost:1234/v1/models`).
- Recipe 1 against `test-fixtures/ForBiggerBlazes.mp4`; expect coherent Chromecast-ad description.
- Spot-check output against a frame or two from the video.
