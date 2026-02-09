#!/bin/bash
# Capture screenshots from the browser and stitch into video with ffmpeg
# Usage: bash capture.sh <output.mp4> <duration_seconds> <fps>

OUT="${1:-gameplay.mp4}"
DUR="${2:-10}"
FPS="${3:-10}"
FRAMES_DIR="/Users/igloo/.openclaw/workspace/snake_game/recording/frames"

rm -rf "$FRAMES_DIR"
mkdir -p "$FRAMES_DIR"

TOTAL=$((DUR * FPS))
DELAY=$(echo "scale=3; 1/$FPS" | bc)

echo "Capturing $TOTAL frames at ${FPS}fps for ${DUR}s..."

for i in $(seq -w 1 $TOTAL); do
  # Use CDP to screenshot - we'll pipe via the browser tool instead
  echo "Frame $i/$TOTAL"
  sleep "$DELAY"
done

echo "Stitching with ffmpeg..."
ffmpeg -y -framerate "$FPS" -i "$FRAMES_DIR/frame_%04d.png" \
  -c:v libx264 -pix_fmt yuv420p -crf 23 \
  "$OUT"

echo "Done: $OUT"
