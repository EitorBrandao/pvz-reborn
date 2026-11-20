# Fonte colorida de teste (HortaArteTeste)
Gera `art/teste-cor.woff2`: fonte COLRv1 com 3 desenhos (pimentão U+E000, cacto U+E001, milho U+E002).
Serve para testar se o modo escuro forçado do Samsung Internet mexe nas cores de glifos de fonte colorida.
Rode `bash tools/fonte-cor/gerar.sh` (precisa de Node, Python 3 e internet pro pip).
Passos: exporta os SVG do `js/arte.js`, ajusta opacity/rgba (`preparar.py`), converte com nanoemoji e salva em woff2.
Uso no CSS: `@font-face{font-family:HortaArteTeste;src:url(art/teste-cor.woff2)}` e texto `&#xE000;`.
