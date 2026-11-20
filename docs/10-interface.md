# 10 · Interface (telas)

[← Índice](README.md) · Arquivos: `index.html`, `css/estilo.css`, `js/main.js`, `js/ui/*.js`

## Como as telas funcionam

- `index.html` tem **uma `<section class="tela">` por tela**; só uma tem a classe `ativa`. `ui/comum.js → mostrarTela(id)` troca a ativa.
- Cada arquivo de `js/ui/` tem `iniciarTela...(dados, callbacks)` (liga botões, uma vez, chamado em `main.js → comecar`) e `abrirTela...()` (desenha e mostra).
- Telas **leem** o estado (`jogo.estado`) e **pedem** mudanças por funções do `estado.js`. Mostram erros com `avisar(textos[res.erro])`.
- Textos vêm de `data/mensagens.json` (`dados.textos`), com `preencher(texto, {valor})` trocando `{valor}`.

## Mapa das telas

| Tela (`id` em `index.html`) | Arquivo | Abre por | Observação |
| --- | --- | --- | --- |
| `tela-inicio` | `main.js` | ao abrir | Botão **Jogar** |
| `tela-base` (horta) | `main.js`, `painel-rotina.js`, `painel-missoes.js`, `tela-eventos.js` | Jogar / voltar | HUD (moedas, 💧, nível, fôlego), broto, atalhos, missões, rotina |
| `tela-mapa` | `tela-mapa.js` | Campanha | Abas de mapas, trilha de fases, painel da fase, modo Pesadelo |
| `tela-time` | `tela-time.js` | Escolher uma fase/desafio | Monta o time (grade 2×3), mostra poder e bônus de facção |
| `tela-batalha` | `tela-batalha.js` | `lutar()` | Canvas + resultado |
| `tela-plantas` | `tela-plantas.js` | Plantas | Coleção, cartas, pacote, evolução |
| `tela-atividades` | `tela-atividades.js` | Desafios | Torre, Desafio do Dia, Treino, Invasão, Labirinto |
| `tela-treino` | `tela-atividades.js` | Treino | Escolher pragas e nível |
| `tela-invasao` / `tela-feira` / `tela-herbario` | `tela-eventos.js` | Desafios / 🛒 / 📖 | Veja [08](08-eventos.md) |
| `tela-labirinto` | `tela-labirinto.js` | Desafios | Veja [09](09-labirinto.md) |
| `tela-opcoes` | `main.js` | Opções | Exportar/importar/apagar save, som, novidades (changelog) |

## Arquivos de `js/ui/`

| Arquivo | Faz |
| --- | --- |
| `comum.js` | `$`, `mostrarTela`, `avisar` (aviso rápido), `sortear`, `preencher`, `selosPlanta`, `textoHabilidade` |
| `tela-batalha.js` | Animação e resultado ([03](03-batalha.md)) |
| `tela-time.js` | Montar time, ordens (poder, nome…), segurar o cartão pra ver detalhes |
| `tela-plantas.js` | Tudo da evolução ([04](04-evolucao.md)) |
| `tela-mapa.js` | Mapa e fases ([05](05-campanha-e-missoes.md)); troca a música pelo modo (`musicaDoModo`) |
| `tela-atividades.js` | Cartões de atividades ([06](06-atividades.md)) |
| `tela-eventos.js` | Invasão, Feira, Herbário ([08](08-eventos.md)) |
| `tela-labirinto.js` | Labirinto ([09](09-labirinto.md)) |
| `painel-rotina.js` | Canteiro, expedição, calendário ([07](07-rotina.md)) |
| `painel-missoes.js` | Ícones e ficha das missões |

## O que o `main.js` coordena

- `lutar(fase)`: **toda batalha passa por aqui** — confere regras do time (`checarTime`), trata a Invasão (ataque + vida atual), gasta fôlego e chama `comecarBatalha`.
- `mapaDaFase(fase)`: pra onde voltar ao sair de uma batalha (invasão, labirinto, atividades ou mapa da campanha).
- `proxima(fase)`: próxima fase/andar pra o botão "Próxima" no resultado.
- `atualizarTela()`: atualiza HUD, missões, rotina, atalhos e broto; `atualizarFolego()` roda a cada segundo.
- Botão **Instalar** (`beforeinstallprompt`) e aviso de **versão nova** (service worker) — veja [13](13-pwa-e-publicacao.md).

## Visual (`css/estilo.css`)

Arquivo único, pensado pra celular em pé (sem rolagem horizontal em 360 px). Telas ficam escondidas até receberem `.ativa`; janelas e avisos usam `.escondido`.
