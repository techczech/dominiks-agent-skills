#!/usr/bin/env python3
"""Video analysis via LM Studio local server: 1-FPS frames + prompt.

Gemma 4 sees video natively as 1 frame/second + audio, so sending extracted
frames through the image API is the same representation, minus audio.

Usage:
  python3 scripts/lmstudio_video.py VIDEO "PROMPT" [--model google/gemma-4-12b]
      [--fps 1] [--max-frames 60] [--max-tokens 1500] [--width 512]
"""

import argparse
import base64
import json
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

API = "http://localhost:1234/v1/chat/completions"


def extract_frames(video: str, fps: float, width: int, max_frames: int, outdir: str) -> list[Path]:
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", video,
         "-vf", f"fps={fps},scale={width}:-2", "-frames:v", str(max_frames),
         f"{outdir}/f_%03d.jpg"],
        check=True,
    )
    return sorted(Path(outdir).glob("f_*.jpg"))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("prompt")
    ap.add_argument("--model", default="google/gemma-4-12b")
    ap.add_argument("--fps", type=float, default=1.0)
    ap.add_argument("--max-frames", type=int, default=60)
    ap.add_argument("--max-tokens", type=int, default=1500)
    ap.add_argument("--width", type=int, default=512)
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        frames = extract_frames(args.video, args.fps, args.width, args.max_frames, tmp)
        if not frames:
            sys.exit("no frames extracted")
        print(f"[{len(frames)} frames @ {args.fps} fps]", file=sys.stderr)

        content = [
            {"type": "image_url",
             "image_url": {"url": "data:image/jpeg;base64,"
                           + base64.b64encode(f.read_bytes()).decode()}}
            for f in frames
        ]
        content.append({
            "type": "text",
            "text": f"These are frames from a video at {args.fps} frame(s) per second, "
                    f"in order. {args.prompt}",
        })

        req = urllib.request.Request(
            API,
            data=json.dumps({
                "model": args.model,
                "messages": [{"role": "user", "content": content}],
                "max_tokens": args.max_tokens,  # reasoning tokens count too; budget 3-4x visible output
            }).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=600) as resp:
            r = json.load(resp)

    msg = r["choices"][0]["message"]
    print(msg.get("content") or "")
    usage = r.get("usage", {})
    print(f"\n[tokens: {usage.get('total_tokens')} total, "
          f"{usage.get('completion_tokens')} completion]", file=sys.stderr)


if __name__ == "__main__":
    main()
