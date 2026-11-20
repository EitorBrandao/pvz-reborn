# 05 · Campanha, Pesadelo e missões

[← Índice](README.md) · Arquivos: `js/campanha.js`, `js/missoes.js`, `js/ui/tela-mapa.js`, `js/ui/painel-missoes.js` · Dados: `campanha.json`, `pesadelo.json`, `missoes.json`

## Campanha

`data/campanha.json` → `mapas[]` (Quintal, Pomar, Pântano, Estufa, Deserto, Telhado), cada um com **10 fases** (a 10ª é chefe). Uma fase:

```json
{ "id": "quintal-1", "nome": "...", "nivel": 1, "folego": 3, "chefe": true?,
  "inimigos": [{ "praga": "lagarta", "col": 0, "linha": 0, "nivel": 5? }],
  "recompensa": { "moedas": 30, "xp": 20, "orvalho": 3? },
  "cartas": [{ "carta": "adubo", "chance": 0.8 }] }
```

### Liberação (`campanha.js`)

- `prepararCampanha(campanha, pesadelo)` (chamado no `main.js`): grava `mapa`, `mapaIndice`, `indice` em cada fase e **gera o Pesadelo**.
- `mapaLiberado`: o mapa N abre quando a última fase do mapa N−1 foi vencida.
- `faseLiberada`: fase abre quando a anterior foi vencida. `concluida` olha `estado.vencidas`.
- `proximaFase`, `faseAtual` (primeira ainda não vencida).
- **Fôlego:** cada fase gasta `fase.folego` ao começar (`main.js → lutar` → `estado.gastarFolego`). Ver [07](07-rotina.md).

### Estrelas

`calcularEstrelas(vivas, total, cfg)`: 3★ se ninguém morreu, 2★ se ≥ 50% sobreviveu, 1★ se só venceu. Guarda o máximo em `estado.estrelasFases`.

## Modo Pesadelo

Cada mapa ganha uma versão difícil das mesmas 10 fases, **gerada na hora** por `fasePesadelo()` a partir de `data/pesadelo.json` (nada fica gravado em `campanha.json`):

- id `<fase>-p`, nome "(Pesadelo)", `pesadelo: true`;
- nível = `nivelBase + nivelPorMapa × mapa + fase` (passa de 50);
- `multPragas` fortalece vida/ataque/defesa (mais brando em chefes: `multChefe`);
- prêmio melhor (`recompensa`), mais chance de carta, mais fôlego.
- **Abre** quando todas as fases do mapa têm 3★ (`pesadeloLiberado`, `estrelasParaAbrir`).
- Música própria (`pesadelo`, em `som.js`).

## Missões da Dona Flora

`missoes.json`: `ativasMax` (3 ao mesmo tempo) e lista `missoes[]` numa **fila**. Cada missão:

```json
{ "id": "m1", "icone": "⚔️", "titulo": "...", "fala": "...",
  "tarefas": [{ "tipo": "contador", "contador": "vencerFase", "meta": 1, "texto": "..." }],
  "premio": { "moedas": 50, "orvalho": 0, "xp": 20, "cartas": { "adubo": 2 } } }
```

### Tipos de tarefa (`missoes.js → progressoTarefa`)

| `tipo` | Como conta | Campos |
| --- | --- | --- |
| `contador` | Quanto o contador subiu **desde que a missão ativou** | `contador`, `meta` |
| `estado` | Valor atual do jogo (`valorEstado`) | `chave`, `meta` |
| `fase` | 1 se a fase foi vencida | `fase` |

`chave` aceitas: `tamanhoTime`, `nivelMaxPlanta`, `plantasNaColecao`, `fasesTresEstrelas`. Contadores: veja [02](02-estado-e-save.md#contadores-ligação-com-missões).

### Fluxo

`estado.preencherMissoes()` mantém até 3 ativas, puxando da fila (`missoes.proxima`) e guardando `base` (cópia dos contadores). `missaoCompleta` confere todas as tarefas. `resgatarMissao(id)` paga o prêmio, dá XP ao jogador, remove a missão e puxa a próxima. A tela (`painel-missoes.js`) mostra ícones na lateral da horta com o progresso (`resumoProgresso`, ex.: "2/3") e a ficha com a fala da Dona Flora.

> Pra criar missão: veja [14 · Receitas](14-receitas.md).
