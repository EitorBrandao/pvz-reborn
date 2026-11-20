# Fonte colorida da arte (ArteHorta)
Gera `art/arte.woff2` (fonte COLRv1 com todos os desenhos de `js/arte.js`) e `js/arte-fonte.js` (código de cada desenho).
Por que fonte: o modo escuro do Samsung Internet desbota imagens e canvas, mas não mexe em letras coloridas (como emoji).
Sempre que mudar ou criar um desenho em `js/arte.js`, rode `bash tools/fonte-cor/gerar.sh` (precisa de Node, Python 3 e internet pro pip).
Passos: exporta os SVG, ajusta opacity/rgba (`preparar.py`), converte com nanoemoji e salva em woff2.
