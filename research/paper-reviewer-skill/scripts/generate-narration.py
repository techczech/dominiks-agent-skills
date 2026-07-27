#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["mlx-audio>=0.3", "soundfile", "numpy"]
#
# [tool.uv]
# prerelease = "allow"
# ///
"""generate-narration.py — Turn a narration script into a spoken audio file.

Reads a JSON narration script (a list of segments, each with the text to speak
and an instruction describing how to speak it), synthesises each segment with a
local MLX text-to-speech model, joins them with short pauses, and writes a WAV
plus an MP3.

This is deliberately a *template*. Writing the narration is the work; the script
only performs it. Draft the segments yourself — or have an agent draft them from
a paper's review or highlights — and save them as JSON.

Segment file format (JSON array):

  [
    {
      "text": "What the narrator says.",
      "instruct": "How to say it: pace, tone, emphasis."
    },
    ...
  ]

Usage:
  scripts/generate-narration.py papers/{folder}/narrations/{name}.json
  scripts/generate-narration.py {segments.json} --out-dir papers/{folder}/narrations
  scripts/generate-narration.py {segments.json} --speaker Ryan --pause 0.8
  scripts/generate-narration.py --write-example papers/{folder}/narrations/example.json

Conventions: keep narration scripts and their audio next to the paper they
describe, under `papers/{folder}/narrations/`.

Requirements: Apple silicon (mlx-audio), and `ffmpeg` on PATH for the MP3 step.
The first run downloads the TTS model.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

DEFAULT_MODEL = "mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-bf16"
DEFAULT_SPEAKER = "Ryan"
DEFAULT_LANGUAGE = "English"
DEFAULT_PAUSE_SECONDS = 0.6

EXAMPLE_SEGMENTS = [
    {
        "text": (
            "A narration of key findings from {AUTHOR} and colleagues, "
            "published in {VENUE}, {YEAR}."
        ),
        "instruct": "Professional, warm, clear podcast host voice. Measured pace.",
    },
    {
        "text": "{ONE_PARAGRAPH_SUMMARY_OF_WHAT_THE_STUDY_DID}",
        "instruct": "Informative, steady, clear academic narration.",
    },
    {
        "text": "{THE_HEADLINE_RESULT_WITH_ITS_NUMBERS}",
        "instruct": "Emphasising a surprising finding. Slight pause before the contrast.",
    },
    {
        "text": "{WHAT_THE_AUTHORS_CONCLUDE_AND_WHAT_THEY_RECOMMEND}",
        "instruct": "Conclusive, authoritative. Professional wrap-up.",
    },
]


def load_segments(path: Path) -> list[dict]:
    """Read and validate a narration script."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        sys.exit(f"error: no narration script at {path}")
    except json.JSONDecodeError as exc:
        sys.exit(f"error: {path} is not valid JSON: {exc}")

    if not isinstance(data, list) or not data:
        sys.exit(f"error: {path} must contain a non-empty JSON array of segments")
    for i, seg in enumerate(data, 1):
        if not isinstance(seg, dict) or not seg.get("text"):
            sys.exit(f"error: segment {i} in {path} has no 'text' field")
    return data


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("segments", nargs="?", type=Path,
                    help="JSON narration script (see the module docstring)")
    ap.add_argument("--write-example", type=Path, metavar="PATH",
                    help="write a skeleton narration script to PATH and exit")
    ap.add_argument("--out-dir", type=Path,
                    help="where to write the audio (default: alongside the script)")
    ap.add_argument("--basename",
                    help="output filename stem (default: the script's stem)")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--speaker", default=DEFAULT_SPEAKER)
    ap.add_argument("--language", default=DEFAULT_LANGUAGE)
    ap.add_argument("--pause", type=float, default=DEFAULT_PAUSE_SECONDS,
                    help="silence between segments, in seconds")
    ap.add_argument("--no-mp3", action="store_true",
                    help="write only the WAV; skip the ffmpeg step")
    args = ap.parse_args()

    if args.write_example:
        args.write_example.parent.mkdir(parents=True, exist_ok=True)
        args.write_example.write_text(
            json.dumps(EXAMPLE_SEGMENTS, indent=2) + "\n", encoding="utf-8")
        print(f"wrote example narration script to {args.write_example}")
        print("Replace every {PLACEHOLDER} with your own prose, then re-run "
              "this script on the file.")
        return

    if not args.segments:
        ap.error("give a narration script, or use --write-example to start one")

    segments = load_segments(args.segments)

    # Imported here so --write-example works without the audio stack installed.
    import numpy as np
    import soundfile as sf
    from mlx_audio.tts.utils import load_model

    out_dir = (args.out_dir or args.segments.parent).expanduser()
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = args.basename or args.segments.stem
    wav_path = out_dir / f"{stem}.wav"
    mp3_path = out_dir / f"{stem}.mp3"

    print(f"Loading TTS model {args.model}...")
    model = load_model(args.model)

    all_audio: list = []
    sample_rate = None

    for i, seg in enumerate(segments, 1):
        preview = seg["text"][:60].replace("\n", " ")
        print(f"Generating segment {i}/{len(segments)}: {preview}...")
        results = list(model.generate_custom_voice(
            text=seg["text"],
            speaker=args.speaker,
            language=args.language,
            instruct=seg.get("instruct", ""),
        ))
        all_audio.append(np.array(results[0].audio, dtype=np.float32))
        sample_rate = results[0].sample_rate
        if args.pause > 0:
            all_audio.append(np.zeros(int(sample_rate * args.pause), dtype=np.float32))

    full_audio = np.concatenate(all_audio)
    print(f"Writing WAV ({len(full_audio)/sample_rate:.1f}s at {sample_rate}Hz)...")
    sf.write(str(wav_path), full_audio, sample_rate)

    if args.no_mp3:
        print(f"Done. Output: {wav_path}")
        return

    print("Converting to MP3...")
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(wav_path),
         "-codec:a", "libmp3lame", "-qscale:a", "2", str(mp3_path)],
        check=True, capture_output=True,
    )
    print(f"Done. Output: {mp3_path}")


if __name__ == "__main__":
    main()
