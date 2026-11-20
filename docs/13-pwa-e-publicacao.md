# 13 · PWA, versão e publicação

[← Índice](README.md) · Arquivos: `service-worker.js`, `manifest.webmanifest`, `data/config.json`, `data/changelog.json`, `index.html`

## PWA (instalar e jogar offline)

- `manifest.webmanifest`: nome, ícones (`art/icones/`), cores, `display: standalone`, `orientation: portrait`.
- `service-worker.js` guarda os arquivos do jogo no cache do celular:
  - `ARQUIVOS`: **lista de tudo que precisa funcionar offline**. Arquivo novo (js, json, imagem) **tem que entrar aqui**, senão não funciona sem internet.
  - **Rede primeiro:** com internet, busca a versão nova (`cache: 'no-cache'`); se a rede demora mais de 4 s (`ESPERA_REDE_MS`), usa a cópia guardada.
  - `VERSAO` (`'horta-vX.Y.Z'`) é o nome do cache: mudar o número faz o celular baixar tudo de novo e apagar o cache antigo.
- `main.js → registrarServiceWorker()`: procura atualização ao abrir e sempre que o app volta pra tela. Versão nova: na tela inicial **recarrega sozinho** (salvando antes); no meio do jogo mostra o aviso "atualização disponível" (toque pra recarregar).
- `main.js → avisarVersaoNova()`: se `estado.versaoVista` for diferente da versão atual, mostra "atualizado pra versão X".
- Botão **Instalar** aparece quando o navegador oferece (Chrome/Android). No iPhone: Compartilhar → Adicionar à Tela de Início.

## Versão (obrigatório a cada mudança que vai pra `main`)

Aumente a versão nos **dois** lugares, com o **mesmo** número:

1. `data/config.json` → `"versaoJogo"`
2. `service-worker.js` → `const VERSAO = 'horta-vX.Y.Z'`

Regra do número: **fase nova** sobe o do meio (0.12.0 → 0.13.0); **ajuste/correção** sobe o último (0.12.0 → 0.12.1). Confira a versão atual da `main` antes, pra não repetir número. Alterações **só de documentação** (`docs/`, `README.md`, `PLANO.md`) não mudam o jogo e **não** precisam de versão nova.

Também registre a novidade em `data/changelog.json` (a lista aparece em Opções): `{ "versao": "0.12.1", "itens": ["texto curto"] }` no **topo**.

## Publicação

- O jogo é publicado pelo **GitHub Pages** a partir da branch **`main`** (arquivo `.nojekyll` na raiz). Só aparece pro jogador o que estiver na `main`.
- Link: https://eitorbrandao.github.io/pvz-reborn/
- Antes de mandar pra `main`: puxar a `main` mais recente (`git fetch origin main && git merge origin/main`), resolver conflitos **juntando** as mudanças (nunca sobrescrever o trabalho de outra sessão).

## Testes

Chromium e Playwright já vêm instalados no ambiente de desenvolvimento. Teste em viewport de celular (ex.: Pixel 7) e confira que não há rolagem horizontal em 360 px. Testes devem ser rodados com modelo menor (Sonnet ou Haiku), conforme o `CLAUDE.md`.
