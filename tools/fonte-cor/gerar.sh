#!/usr/bin/env bash
# Gera art/teste-cor.woff2 (fonte colorida COLRv1) a partir de js/arte.js. Uso: bash tools/fonte-cor/gerar.sh
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
T="${TMPDIR:-/tmp}/fonte-cor"; rm -rf "$T"; mkdir -p "$T/src" "$T/raw" "$T/prep"
python3 -m venv "$T/venv"; "$T/venv/bin/pip" install -q nanoemoji picosvg brotli
export PATH="$T/venv/bin:$PATH"
cp "$RAIZ/js/arte.js" "$T/arte.mjs"
node "$RAIZ/tools/fonte-cor/exportar.mjs" "$T" "$T/raw"
n=0; for id in pimentao cacto milho; do
  python3 "$RAIZ/tools/fonte-cor/preparar.py" "$T/raw/$id.svg" "$T/prep/$id.svg"
  cp "$T/prep/$id.svg" "$T/src/emoji_ue00$n.svg"; n=$((n+1))   # U+E000, E001, E002
done
(cd "$T" && nanoemoji --family HortaArteTeste --color_format glyf_colr_1 --output_file HortaArteTeste.ttf --build_dir build src/*.svg)
python3 -c "
from fontTools.ttLib import TTFont
f=TTFont('$T/build/HortaArteTeste.ttf'); f.flavor='woff2'; f.save('$RAIZ/art/teste-cor.woff2')"
ls -l "$RAIZ/art/teste-cor.woff2"
