# Horta Selvagem: regras pro Claude

Jogo de navegador (PWA) em HTML, CSS e JavaScript puro, sem build. O plano completo está em `PLANO.md`.

## Publicação (importante)

- O jogo é publicado pelo GitHub Pages a partir da branch **`main`**. Só aparece pro jogador o que estiver na `main`.
- Toda mudança pronta e testada vai pra `main`. Se a sessão trabalhar numa branch própria, junte com a `main` no final (`git fetch origin main && git merge origin/main`), resolva os conflitos e mande pra `main`.
- Antes de mandar, sempre puxe a `main` mais recente: outra sessão pode ter mexido ao mesmo tempo. Nunca sobrescreva mudanças de outra sessão: junte as duas.

## Versão (obrigatório a cada mudança)

A cada mudança no jogo que vai pra `main` (mudança só em `tools/`, `.claude/`, `CLAUDE.md`, `PLANO.md` ou `README.md` não precisa), aumente a versão nos **dois** lugares, com o mesmo número:

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

## Revisor antes da main (sempre ativo)

Todo `git push` que mexe na `main` passa pelo revisor `tools/revisor/revisar.mjs` (hook `tools/hooks/pre-push`, ligado sozinho ao abrir a sessão pelo `.claude/settings.json`). Se ele achar erro, o push é cancelado: corrija e mande de novo. Nunca use `--no-verify` nem mande pra main pela API do GitHub (o hook bloqueia).

Antes de subir, rode na mão (pelo subagente de testes): `node tools/revisor/revisar.mjs`. Ele confere:

- **Híbridas sempre superiores**: cada híbrida tem mais 💪 poder que as duas plantas da receita (nível 1, 25 e 50) e que a planta normal mais forte da mesma classe (tanque, dano, apoio, controle); efeito igual ao de uma planta da receita (mesmo status ou mesmo tipo de habilidade) nunca mais fraco em 5★; a fusão herda o maior nível e o maior rank e nasce 5★; híbrida vai até `rankMax`, planta normal para em `rankMaxSemFusao`.
- Versão igual nos dois lugares e maior que a da `main` quando o jogo muda; main mais nova já juntada.
- Arquivo novo na lista `ARQUIVOS`; nada listado que não exista.
- `js/arte.js` mudou → fonte refeita (`art/arte.woff2` e `js/arte-fonte.js`) no mesmo envio.
- JSON válido, JS sem erro de sintaxe, sem marca de conflito, sem endereço da internet, sem nomes proibidos.
- Todo status tem `status_<nome>` no `js/som.js`; toda tela de `musicaPorTela` aponta pra música que existe.
- Teste no navegador em 360px: sem erro de JavaScript e sem rolagem pro lado nas telas da horta.

Regra nova que dá pra conferir por código? Coloque no revisor, não só aqui.

Revisão que o robô não faz (leia o próprio diff antes de subir):

- Save: campo novo funciona com save antigo (`completar()`)?
- Número ou texto novo ficou no `data/*.json`, não no código?
- Híbrida nova ou mudada: a habilidade dela é claramente melhor que a das duas plantas da receita (não só os números)?

Lições do histórico (pra não encher a main de commits de ajuste):

- **Um envio = uma mudança completa.** Desenho + fonte refeita + versão + novidades no mesmo envio (ex.: a Couve Escudeira precisou de um segundo commit só pra fonte).
- **Uma versão por envio pra main**, não por commit. Confira a versão da main antes: já houve três `v0.14.1` e duas `v0.14.15`.
- **Nada de teste de tentativa e erro na main** (o caso do modo escuro do Samsung gerou 10 versões, v0.14.3 a v0.14.12). Experimento fica na branch da sessão; só a solução final vai pra main.
- **Regra de jogo decidida = regra escrita no revisor** (ex.: híbrida herda maior nível e maior rank veio em dois commits separados; a fraqueza do Coco Raizão foi corrigida depois por ser menor que a da Teia).
- Tela nova ou mudada: confira em 360px antes de subir (o detalhe da planta levou 4 commits de ajuste de espaço).

## Testes

- Não rode código nem testes com o modelo Opus: passe os testes pra um subagente com modelo menor (Sonnet ou Haiku, conforme a complexidade).
- Chromium e Playwright já vêm instalados. Teste em viewport de celular (ex.: Pixel 7) e confira que não tem rolagem horizontal em 360px.

## Comunicação

- **Sempre responda em português**, inclusive no resumo final e nas explicações.
- O dono do jogo não é programador: explique em português simples, diga o que ele deve ver na tela e onde clicar.
- Seja conciso e pergunte quando algo não estiver claro.
- Ao terminar uma fase, marque o "Pronto quando" no `PLANO.md`.

## Memória entre sessões (STATE.md)

- Mantenha um `STATE.md` na raiz com no máximo 40 linhas por tarefa: o que já foi aprovado, o que falta e as decisões tomadas. Atualize a cada marco.
- Quando um marco for aprovado ou o contexto passar de 200 mil tokens, avise o dono que é hora de trocar de chat e entregue o resumo pronto pra colar na nova sessão.
- Toda análise de imagem roda num subagente, que devolve só texto.
- Nada de fork pra continuar. Sessão nova começa do zero, lendo o `STATE.md`.
