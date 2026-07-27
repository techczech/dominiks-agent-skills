# Analysis Recipes

All commands from skill root; LM Studio server must be up (`references/setup.md`).

## Pre-flight

```bash
ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$VIDEO"
lms server start 2>/dev/null; lms load google/gemma-4-12b 2>/dev/null
```

Duration > 60s: segment first (below) or accept evenly-sampled gist via `--max-frames 60` (wrong for timestamps).
`max_tokens` note: reasoning mode eats tokens before visible output — script default 1500 is sized for that.

## Recipe 1: Describe video

```bash
python3 scripts/lmstudio_video.py "$VIDEO" \
  "Describe this video: setting, people or subjects, actions, and how the scene changes over time."
```

## Recipe 2: Timestamped scene breakdown

Frames arrive at 1 FPS, so frame N ≈ second N — the model can reason in seconds.

```bash
python3 scripts/lmstudio_video.py "$VIDEO" \
  "Break this video into scenes. For each scene give the approximate start time in seconds (frames are 1 per second), one line on what is visible, and one line on what changes." \
  --max-tokens 2500
```

## Recipe 3: Question about the video

```bash
python3 scripts/lmstudio_video.py "$VIDEO" \
  "$QUESTION Answer only from what is visible in the video; say so if the video does not show it."
```

## Recipe 4: Audio-aware summary (said + shown)

This path is vision-only. Transcribe the audio separately with whatever speech-to-text tool you have
(Whisper, Parakeet, or a hosted API), then combine:

```bash
ffmpeg -y -i "$VIDEO" -vn -ac 1 -ar 16000 /tmp/video-audio.wav
# transcribe /tmp/video-audio.wav with your speech-to-text tool of choice
python3 scripts/lmstudio_video.py "$VIDEO" \
  "Describe what is shown. Then relate it to this transcript of the audio: <TRANSCRIPT>"
```

One-pass audio+video is not available on this path; an `mlx-vlm` alternative is described in `references/setup.md`.

## Long video: segmentation

```bash
ffmpeg -y -i "$VIDEO" -c copy -map 0 -segment_time 55 -f segment -reset_timestamps 1 /tmp/seg_%03d.mp4
```

Run a recipe per segment; prepend segment offset to timestamps; synthesise across segments yourself.
