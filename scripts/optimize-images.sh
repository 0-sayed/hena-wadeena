#!/usr/bin/env bash
set -euo pipefail

command -v convert >/dev/null 2>&1 || { echo "Error: ImageMagick not found. Install with: apt install imagemagick"; exit 1; }

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SEED_DIR="$REPO_ROOT/apps/web/public/images/seed"
HERO_DIR="$REPO_ROOT/apps/web/src/assets"

echo "=== Compressing seed images (in-place JPEG) ==="
before=$(du -sh "$SEED_DIR" | cut -f1)

shopt -s nullglob
for f in "$SEED_DIR"/*.jpg; do
  tmp=$(mktemp "${f}.tmp.XXXXXX")
  convert "$f" -resize 1200x1200\> -quality 75 -strip "$tmp" && mv "$tmp" "$f" || { rm -f "$tmp"; exit 1; }
  echo "  compressed: $(basename "$f")"
done
shopt -u nullglob

after=$(du -sh "$SEED_DIR" | cut -f1)
echo "Seed: $before → $after"

echo ""
echo "=== Converting hero assets to WebP ==="
shopt -s nullglob
for f in "$HERO_DIR"/hero-*.jpg; do
  base="${f%.jpg}"
  convert "$f" -quality 82 "${base}.webp"
  [[ -s "${base}.webp" ]] || { echo "Error: WebP output empty for $f"; exit 1; }
  rm "$f"
  echo "  converted: $(basename "$f") → $(basename "${base}.webp")"
done

echo ""
echo "Done."
