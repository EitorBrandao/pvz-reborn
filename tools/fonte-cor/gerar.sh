#!/usr/bin/env bash
# Gera art/arte.woff2 (fonte colorida COLRv1 com toda a arte do jogo) e js/arte-fonte.js (código de cada desenho).
# Rode de novo sempre que mudar um desenho em js/arte.js. Uso: bash tools/fonte-cor/gerar.sh
# Por que fonte: o modo escuro do Samsung Internet desbota imagens, mas não mexe em letras coloridas (como emoji).
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
T="${TMPDIR:-/tmp}/fonte-cor"; rm -rf "$T"; mkdir -p "$T/raw" "$T/src"
python3 -m venv "$T/venv"; "$T/venv/bin/pip" install -q nanoemoji picosvg brotli
export PATH="$T/venv/bin:$PATH"
cp "$RAIZ/js/arte.js" "$T/arte.mjs"
# arte.js importa o mapa de letras; na primeira vez ele pode não existir
cp "$RAIZ/js/arte-fonte.js" "$T/arte-fonte.js" 2>/dev/null || echo "export const GLIFOS = {};" > "$T/arte-fonte.js"
node "$RAIZ/tools/fonte-cor/exportar.mjs" "$T" "$T/raw" "$RAIZ/js/arte-fonte.js"
for f in "$T"/raw/*.svg; do python3 "$RAIZ/tools/fonte-cor/preparar.py" "$f" "$T/src/$(basename "$f")"; done
(cd "$T" && nanoemoji --family ArteHorta --color_format glyf_colr_1 --output_file ArteHorta.ttf --build_dir build src/*.svg)
"$T/venv/bin/python" -c "
from fontTools.ttLib import TTFont
f=TTFont('$T/build/ArteHorta.ttf'); f.flavor='woff2'; f.save('$RAIZ/art/arte.woff2')"
ls -l "$RAIZ/art/arte.woff2" "$RAIZ/js/arte-fonte.js"
