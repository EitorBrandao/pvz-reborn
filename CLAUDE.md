# Horta Selvagem: regras pro Claude

Jogo de navegador (PWA) em HTML, CSS e JavaScript puro, sem build. O plano completo está em `PLANO.md`.

## Publicação (importante)

- O jogo é publicado pelo GitHub Pages a partir da branch **`main`**. Só aparece pro jogador o que estiver na `main`.
- Toda mudança pronta e testada vai pra `main`. Se a sessão trabalhar numa branch própria, junte com a `main` no final (`git fetch origin main && git merge origin/main`), resolva os conflitos e mande pra `main`.
- Antes de mandar, sempre puxe a `main` mais recente: outra sessão pode ter mexido ao mesmo tempo. Nunca sobrescreva mudanças de outra sessão: junte as duas.

## Versão (obrigatório a cada mudança)

A cada mudança que vai pra `main`, aumente a versão nos **dois** lugares, com o mesmo número:

1. `data/config.json` → `"versaoJogo"`
2. `service-worker.js` → `const VERSAO = 'horta-vX.Y.Z'`

Regra do número: fase nova sobe o do meio (0.4.0 → 0.5.0); ajuste ou correção sobe o último (0.4.1 → 0.4.2). Antes de escolher, confira a versão atual da `main` pra não repetir número.

Arquivo novo (js, json, imagem) também precisa entrar na lista `ARQUIVOS` do `service-worker.js`, senão não funciona offline.

## Código

- Números e textos do jogo ficam em `data/*.json`, nunca espalhados pelo código.
- `js/estado.js` é o único que mexe no save. Campos novos no save precisam funcionar com saves antigos (o `completar()` preenche o que faltar).
- Nada de internet, login, anúncio ou compra com dinheiro real.
- Som: todo efeito novo da batalha (status, habilidade, efeito) precisa de som próprio em `js/som.js` (`status_<nome>` quando pega e `tick_<nome>` se age a cada rodada).
- Música: cada modo novo do jogo precisa de música própria, diferente das outras. Crie em `MUSICAS` no `js/som.js` e ligue as telas do modo em `data/config.json` → `som.musicaPorTela` (tela sem entrada toca a música da horta).
- Arte: os desenhos ficam em `js/arte.js` (SVG), mas o jogo mostra eles pela fonte colorida `art/arte.woff2` (o modo escuro do Samsung desbota imagens, não letras). Mudou ou criou desenho? Rode `bash tools/fonte-cor/gerar.sh` pra refazer a fonte e `js/arte-fonte.js`.
- Nomes, personagens e arte originais. Nada de Plants vs. Zombies, PopCap, EA ou Youkia.

## Ajustes visuais (procedimento padrão)

1. Antes de mexer no jogo, faça um artefato HTML (página no claude.ai) mostrando **antes e depois** de cada alteração, animado quando for animação.
2. Mande o link e espere o dono aprovar ou pedir ajustes (atualize o mesmo artefato).
3. Só depois de aprovado, aplique no código, teste e publique na `main`.

## Testes

- Não rode código nem testes com o modelo Opus: passe os testes pra um subagente com modelo menor (Sonnet ou Haiku, conforme a complexidade).
- Chromium e Playwright já vêm instalados. Teste em viewport de celular (ex.: Pixel 7) e confira que não tem rolagem horizontal em 360px.

## Comunicação

- **Sempre responda em português**, inclusive no resumo final e nas explicações.
- O dono do jogo não é programador: explique em português simples, diga o que ele deve ver na tela e onde clicar.
- Seja conciso e pergunte quando algo não estiver claro.
- Ao terminar uma fase, marque o "Pronto quando" no `PLANO.md`.
