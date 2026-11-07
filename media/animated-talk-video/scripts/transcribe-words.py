# /// script
# requires-python = ">=3.10"
# dependencies = ["parakeet-mlx"]
# ///
"""Word-level timings for a narration file, local, Apple Silicon (Parakeet via MLX). Writes the format plan-from-timings.mjs reads.
usage: uv run scripts/transcribe-words.py audio/voice.m4a words.json

Not on Apple Silicon, or want another engine? Any word-timed transcript works: plan-from-timings.mjs also reads
Whisper-style JSON ({segments:[{words:[{word,start,end}]}]}) and flat [{w,s,e}] lists (seconds on the audio file's clock).
See ../references/inputs.md. The speech-to-text skill compares engines.
"""
import sys, json
from parakeet_mlx import from_pretrained

if len(sys.argv) != 3:
    sys.exit(__doc__)
m = from_pretrained("mlx-community/parakeet-tdt-0.6b-v3")
r = m.transcribe(sys.argv[1])
out = []
for s in r.sentences:
    words, cur = [], None
    for t in s.tokens:
        txt = t.text
        if cur is None or txt.startswith(" "):
            if cur:
                words.append(cur)
            cur = {"w": txt.strip(), "s": round(t.start, 2), "e": round(t.end, 2)}
        else:
            cur["w"] += txt
            cur["e"] = round(t.end, 2)
    if cur:
        words.append(cur)
    out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(), "words": words})
json.dump(out, open(sys.argv[2], "w"), indent=1)
print(len(out), "sentences", sum(len(x["words"]) for x in out), "words")
