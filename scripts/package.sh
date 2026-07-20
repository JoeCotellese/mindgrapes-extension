#!/usr/bin/env bash
# ABOUTME: Packs the shipping extension sources into dist/mindgrapes-extension-<version>.zip.
# ABOUTME: Prints the archive path; the zip is what gets uploaded to the Chrome Web Store.
set -euo pipefail
cd "$(dirname "$0")/.."

# Explicit include list rather than exclusions: a new test/doc file should never
# silently end up in the upload, and zip fails loudly if a shipping file is gone.
files=(
  manifest.json
  background.js
  pkce.js
  readability.js
  popup.html
  popup.js
  options.html
  options.js
)

# zip only warns on a missing input, which would ship a quietly incomplete bundle.
for f in "${files[@]}"; do
  [[ -f "$f" ]] || { echo "package.sh: missing shipping file: $f" >&2; exit 1; }
done

version=$(node -p "require('./manifest.json').version")
out="dist/mindgrapes-extension-${version}.zip"

mkdir -p dist
rm -f "$out"
zip -q -X "$out" "${files[@]}"
echo "$out"
