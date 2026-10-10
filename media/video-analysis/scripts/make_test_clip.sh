#!/usr/bin/env bash
# Generate a 10 s synthetic test clip (640x360, testsrc2 video + sine audio)
# with three labelled scenes, for exercising scene breakdown.
# Usage: scripts/make_test_clip.sh [output.mp4]
set -euo pipefail

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found; install it (e.g. brew install ffmpeg) to make the test clip." >&2
  exit 1
fi

here="$(cd "$(dirname "$0")/.." && pwd)"
out="${1:-$here/test-fixtures/synthetic-test-clip.mp4}"
mkdir -p "$(dirname "$out")"

if ffmpeg -hide_banner -filters 2>/dev/null | grep -q ' drawtext '; then
  # Labelled scenes: "Scene 1/2/3" drawn over testsrc2 every ~3.3 s.
  font=""
  for f in /System/Library/Fonts/Helvetica.ttc /Library/Fonts/Arial.ttf \
           /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf; do
    [ -f "$f" ] && { font="fontfile=$f:"; break; }
  done
  dt() { # label start end
    echo "drawtext=${font}text='$1':fontsize=64:fontcolor=white:box=1:boxcolor=black@0.6:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,$2,$3)'"
  }
  ffmpeg -y -loglevel error \
    -f lavfi -i "testsrc2=size=640x360:rate=25:duration=10" \
    -f lavfi -i "sine=frequency=440:sample_rate=44100:duration=10" \
    -vf "$(dt 'Scene 1' 0 3.33),$(dt 'Scene 2' 3.33 6.66),$(dt 'Scene 3' 6.66 10)" \
    -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "$out"
else
  # This ffmpeg build has no drawtext (no freetype): three different generated
  # scenes (testsrc2, smptebars, rgbtestsrc) give the same scene breaks, unlabelled.
  echo "note: ffmpeg lacks drawtext; making unlabelled scenes instead of 'Scene N' captions." >&2
  ffmpeg -y -loglevel error \
    -f lavfi -i "testsrc2=size=640x360:rate=25:duration=3.34" \
    -f lavfi -i "smptebars=size=640x360:rate=25:duration=3.33" \
    -f lavfi -i "rgbtestsrc=size=640x360:rate=25:duration=3.33" \
    -f lavfi -i "sine=frequency=440:sample_rate=44100:duration=10" \
    -filter_complex "[0:v][1:v][2:v]concat=n=3:v=1:a=0,format=yuv420p[v]" \
    -map "[v]" -map 3:a -c:v libx264 -c:a aac -shortest "$out"
fi

echo "wrote $out"
