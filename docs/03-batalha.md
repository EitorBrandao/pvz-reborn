# 03 · Batalha

[← Índice](README.md) · Arquivos: `js/batalha.js` (regras), `js/ui/tela-batalha.js` (desenho), `data/config.json` → `batalha`

## Princípio

`batalha.js` **não desenha nada**. Ele calcula a batalha inteira de uma vez e devolve uma **lista de eventos**; a tela só toca essa lista como um filme. Com a mesma **semente** (`criarRng(semente)`), a batalha sai igual.

## Fluxo

```
prepararBatalha(batalha, time, dados, colecao)  →  lista de unidades (plantas + pragas)
simular(unidades, cfg, semente)                 →  { vitoria, rodadas, eventos[], plantasVivas, plantasTotal }
rolarCartas(batalha, rng)                       →  cartas sorteadas (só se venceu)
tela-batalha.tocar(eventos)                     →  animação
estado.registrarBatalha(...)                    →  prêmios e progresso
```

`tela-batalha.comecarBatalha()` faz: prepara → simula uma cópia (`structuredClone`) → anima → `terminar()`.

## O objeto "batalha" (uma fase, andar, desafio...)

Todas as batalhas do jogo têm o mesmo formato:

```js
{ id, tipo?, nome, nivel, folego, chefe?,
  inimigos: [{ praga, col, linha, nivel?, vida?, vidaMax?, mult? }],
  recompensa: { moedas, xp, orvalho },
  cartas: [{ carta, chance }],
  // opcionais: multPragas, podePular, musica, time, maxRodadas, labirinto, pesadelo, timeMax, faccao... }
```

Quem gera: campanha (`data/campanha.json` + `campanha.js`), `atividades.js` (torre, desafio, treino), `eventos.js` (invasão), `labirinto.js`.

## Campo e posições

- Cada lado tem **2 colunas × 3 linhas** (`col` 0 = frente, 1 = fundo; `linha` 0 a 2). Plantas à esquerda, pragas à direita.
- Limite do time: `vagasTime` (começa em 3; níveis 20, 30 e 40 do jogador liberam mais).
- Máximo de rodadas: `maxRodadas` (15). Estourou → derrota.

## Montagem de uma unidade (`montarUnidade` / `prepararBatalha`)

- Fator de nível: `1 + crescimentoPorNivel × (nível − 1)` (0,15 por nível). Multiplica vida e ataque base e defesa.
- **Plantas** usam `evolucao.atributos()` (nível, estrelas, rank, talentos, equipamentos — [04](04-evolucao.md)) e `habilidadeComEstrelas()`. Talentos adicionam crítico, dano crítico, seiva inicial/por turno e `potencia` (aumenta `mult`, `seiva`, `reflete`, `pctVida` da habilidade).
- **Facções:** `bonusFaccoes()` dá +10% (2 plantas da mesma facção) ou +20% (3) no atributo da facção (`data/faccoes.json`).
- **Vantagem:** `marcarVantagem()` — planta bate +30% numa categoria de praga; praga bate +25% numa facção (campo `forteContra`).
- **Pragas** têm ajustes extras: `batalha.multPragas` (regras de Desafio/Pesadelo) e `inimigo.mult`, `inimigo.vida` (chefe da Invasão guarda a vida).
- **Labirinto:** aplica bênçãos (`labirinto.mods`) e a vida que sobrou entre salas.

## A simulação (`simular`)

Em cada **rodada**:

1. Ordem de ação: `VEL × (1 − lento)` + um pouquinho de sorte, do maior pro menor.
2. Cada unidade viva age (`agir`):
   - **Dormindo** (`sono`): perde a vez.
   - **Seiva ≥ 100**: usa a **habilidade** (`usarHabilidade`) e zera a seiva.
   - Senão: ataque normal e ganha `seivaPorTurno` (25) + bônus de talento.
3. Fim da rodada (`passarTurno`): `tickStatus` (veneno, queimadura, regeneração) e contagem regressiva de escudo, espinhos, lentidão e status.

### Seiva

Cada unidade tem **seiva de 0 a 100**. Sobe `seivaPorTurno` ao atacar e `seivaAoApanhar` (10) ao tomar golpe. Chegou a 100 → próxima ação é a habilidade.

### Escolha do alvo (`alvoPadrao`)

Campo `alvo` da planta/praga: `frente` (padrão), `fraco` (menor % de vida), `forte` (maior vida), `tras` (coluna de trás), `aleatorio`. Quem tem `alcance: "perto"` só alcança a frente (e ganha `multPerto` ×1,25 de dano). Empate de distância: sorteia.

### Dano (`bater`)

```
dano = ATQ × (1 − fraqueza) × mult × multDano × 100/(100 + DEF × (1 − casca))
       × (1 + vantagem se eficaz)  × multPerto(se perto)  × variação(±10%)
       × multCritico(se crítico: chance 15% + talentos)
```

Mínimo 1. O **escudo** absorve primeiro; o que sobra tira vida. Quem apanha ganha seiva. **Reflexo** (espinhos) devolve parte do dano ao atacante.

### Tipos de habilidade (`habilidade.tipo`)

| Tipo | Efeito | Campos |
| --- | --- | --- |
| `area_coluna` | Bate em toda a coluna do alvo | `mult` |
| `espinhos` | Reflete dano por alguns turnos + golpe | `mult`, `reflete`, `turnos` |
| `rajada` | N golpes em alvos aleatórios | `golpes`, `mult` |
| `cura` | Cura os aliados mais feridos | `alvos`, `mult` (× ATQ) |
| `escudo` | Escudo em todo o time | `mult` (× ATQ), `turnos` |
| `perfurar` | Golpe no alvo + quem está atrás | `mult` |
| `sono` | Golpe e faz dormir | `mult`, `turnos` |
| `lentidao` | Golpe e reduz VEL | `mult`, `reducao`, `turnos` |
| `golpe` | Golpe forte | `mult` |
| `energia` | Golpe e dá seiva aos aliados | `mult`, `seiva` |
| `protecao` | Golpe e escudo (% da vida) na frente | `mult`, `pctVida`, `turnos` |
| `devorar` | Ataca o mais ferido; bônus se vida baixa | `mult`, `limite`, `bonus` |

- **`porEstrela`**: quanto cada estrela acima da 1ª soma em cada campo (veja `habilidadeComEstrelas`).
- **`aplica`** (opcional): status extra ao acertar — `{ status, valor, turnos }`.

### Status (`aplicarStatus`, `tickStatus`)

| Status | Tipo | Efeito |
| --- | --- | --- |
| `veneno` 🧪 | ruim | Perde vida por rodada (valor = % do ATQ de quem aplicou) |
| `queimadura` 🔥 | ruim | Igual ao veneno |
| `regeneracao` 💚 | bom | Recupera vida por rodada (aplica em aliado curado/protegido) |
| `fraqueza` 🔻 | ruim | Alvo causa % menos dano |
| `casca` 💢 | ruim | Alvo perde % da defesa |

Textos em `data/mensagens.json` → `status`. **Status novo precisa de som** ([11](11-som-e-musica.md)) e de texto.

### Eventos que a simulação devolve

`rodada` (início), `acao` (quem agiu, se foi especial, `efeitos[]` e um `snap` com vida/seiva de todos), `status` (ticks do fim da rodada) e `fim`. Cada efeito tem `tipo`: `dano`, `cura`, `escudo`, `espinhos`, `sono`, `lento`, `seiva`, `status`. A tela anima olhando esses campos.

### Resultado

`vitoria` = todas as pragas mortas e pelo menos uma planta viva. **Campanha:** 3 estrelas se todas as plantas sobrevivem, 2 se metade ou mais, 1 se só venceu (`campanha.calcularEstrelas`, valores em `config.estrelasFase`).

## Poder

`evolucao.poder(stats, dados)` = soma dos atributos com pesos (`config.poder.pesos`: vida 0,2; atq 2; def 1; vel 1). Serve pra comparar times e calibrar dificuldade (Labirinto) — **habilidades não entram na conta**.

## Tela de batalha (`tela-batalha.js`)

Canvas 2D. Anima cada evento (`tocar` → `animarAcao`/`animarStatus` → `mostrarEfeito`): projéteis, números de dano flutuantes, partículas, tremor e clarão no crítico, banner. Botões: velocidade (1x/2x/3x, salva em `velocidadeBatalha`) e **Pular** (`podePular`: só depois de vencer a fase uma vez, ou sempre em treino/invasão/labirinto). Ao terminar chama `registrarBatalha` e mostra o resumo (XP, cartas voando, dano causado/recebido, próxima fase).
