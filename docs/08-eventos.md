# 08 · Eventos e coleção

[← Índice](README.md) · Arquivos: `js/eventos.js` (contas), `js/estado.js` (ações), `js/ui/tela-eventos.js` (telas) · Dados: `invasao.json`, `feira.json`, `herbario.json`

## Invasão de Chefe

Um chefe gigante fica na horta por vários dias; o jogador e **10 vizinhos bots** batem no mesmo chefe.

### Ciclo

- `cicloAtual(dados)`: número do ciclo = `dia ÷ diasPorChefe` (3 dias). O ciclo muda à **meia-noite local**.
- `chefeDoCiclo(ciclo)`: percorre as pragas com `chefe: true` em ordem.
- `estado.invasao` guarda o ciclo do jogador: `{ciclo, nivel, dano, dia, ataques, premioPego}`. `invasaoAtual()` cria um novo quando o ciclo muda.
- Vida do chefe = vida de um chefe normal no nível × `multVida` (30). Chefe bate mais fraco (`multChefe`).

### Bots (simulados, sem rede)

`danoDosBots()` calcula **por conta** quanto cada bot já bateu, a partir das horas ativas desde o início (`horasAtivas`: madrugada `madrugada: [1,7]` não conta) × `danoBotsPorHora` × peso do bot × um fator estável por bot (semente `invasao-<ciclo>-<i>`). Sem salvar nada: funciona offline e "com o jogo fechado".

`situacaoInvasao(inv, dados)` devolve chefe, vida total/restante, `derrotado`, `terminou`, **ranking** (bots + "Você") e `posicao`. Se o chefe cai, os bots param no momento da queda (busca binária).

### Ataques

- `gastarAtaqueInvasao()`: `ataquesGratis` (3) por dia; extra custa 💧 `custoAtaqueExtra` (2).
- `main.js → lutar()` monta a batalha com `montarBatalhaInvasao()` (→ `batalhaInvasao`: chefe com a **vida restante** + lacaios da mesma categoria) e chama `comecarBatalha`.
- Fim da batalha: `tela-batalha` mede o dano ao chefe e `registrarInvasao` paga **sempre** moedas pelo dano, XP e cartas (`cartasAtaque`).
- Fim do ciclo: `invasaoPendente()` / `resgatarInvasao()` pagam o prêmio por posição (`premiosRanking`) e um extra se o chefe caiu (`premioDerrotado`).

## Feira

- `ofertasDoDia(dados, dia)`: sorteia `ofertasPorDia` (4) ofertas com semente `feira-<dia>` (muda todo dia, igual pra todos).
- `estado.feiraHoje()` reinicia `feira.comprados` quando o dia muda; `comprarOferta(id)` (uma vez por oferta, só com **moedas**).
- **Trocas** (`feira.trocas[]`): `fazerTroca(id)` gasta cartas (`de`) e dá outras (`para`), ex.: 6 fibras → 1 pétala.

## Herbário

`paginasHerbario(dados, estado)`: uma página por **facção** (plantas que o jogador tem) e uma por **mapa** (pragas já vistas). Página completa → `resgatarPagina(id)` paga prêmio uma vez (`herbario.premioFaccao`, `premioMapa[]`). "Pragas vistas" = pragas das fases já vencidas (`pragasConhecidas`). Receitas de fusão (`herbario.fusoes`) aparecem só como informação (`fusoesHerbario`).

## Atalhos na horta

`tela-eventos.js → desenharAtalhos()` desenha os botões 🛒 Feira e 📖 Herbário (com bolinha se há novidade: `herbarioTemPremio`) e o cartão de Invasão em Desafios (`resumoInvasao`).
