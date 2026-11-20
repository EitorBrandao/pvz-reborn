# 14 · Receitas: como faço pra…

[← Índice](README.md)

Passo a passo das tarefas mais comuns. Depois de mexer: aumente a versão ([13](13-pwa-e-publicacao.md)) e teste abrindo o jogo.

## Mudar um número de balanceamento

| Quero mudar… | Onde |
| --- | --- |
| Vida/ataque/defesa/velocidade de uma planta ou praga | `plantas.json` / `pragas.json` |
| Dano geral, crítico, seiva, rodadas | `config.json` → `batalha` |
| Quanto o nível/estrela/rank fortalece | `config.json` → `batalha.crescimentoPorNivel`, `evolucao.bonusEstrela`, `bonusRank` |
| Custo de estrela | `config.json` → `evolucao.copiasPorEstrela`, `moedasPorEstrela` |
| Fôlego (máximo, tempo de recarga) | `config.json` → `folego` |
| Preço do pacote | `config.json` → `pacote` |
| Prêmios de uma fase | `campanha.json` → fase → `recompensa`/`cartas` |
| Dificuldade do Pesadelo | `pesadelo.json` |
| Torre, Desafio do Dia | `atividades.json` |
| Canteiro, expedição, calendário | `rotina.json` |
| Invasão (bots, prêmios) | `invasao.json` |
| Labirinto | `labirinto.json` |
| Bônus de facção | `faccoes.json` |

## Criar uma planta nova

1. Adicione o objeto em `data/plantas.json` (veja o esqueleto em [12](12-dados.md)). Use `id` único, sem acento.
2. Escolha `faccao` existente e `funcao` existente em `talentos.funcoes` (ex.: `Tanque`, `Cura`, `Controle`…).
3. Escolha `habilidade.tipo` de [03](03-batalha.md#tipos-de-habilidade-habilidadetipo) e preencha os campos desse tipo (+ `porEstrela`).
4. Coloque peso em `config.json → pacote.pesos` pra poder cair no pacote.
5. Herbário e coleção pegam sozinhos (leem `plantas.json`).

## Criar uma praga nova

1. Adicione em `data/pragas.json` com `categoria` (`rastejante`, `voador`, `blindado`, `saltador`) e, se for chefe, `"chefe": true`.
2. Pra aparecer: use o `id` nos `inimigos` de uma fase em `campanha.json`. Chefes novos entram sozinhos no rodízio da Torre, Invasão e Labirinto (ordem do arquivo).
3. Ordem das pragas comuns importa: a Torre e o Labirinto liberam as pragas na ordem em que aparecem no arquivo.

## Criar uma fase na campanha

Em `campanha.json → mapas[].fases[]`, copie uma fase e ajuste `id` (único), `nome`, `nivel`, `folego`, `inimigos` (`col` 0/1, `linha` 0–2), `recompensa`, `cartas`. O Pesadelo dessa fase nasce sozinho.

## Criar um tipo de habilidade novo

1. Em `js/batalha.js → usarHabilidade`, adicione um `case 'seu_tipo'` com a lógica (use `bater`, `inimigos(u)`, `aliados(u)` e coloque o que aconteceu em `efeitos`).
2. Se o efeito é novo (um `tipo` de efeito diferente de `dano`, `cura`, `escudo`…), ensine a tela em `js/ui/tela-batalha.js → mostrarEfeito`.
3. Som próprio em `js/som.js` ([11](11-som-e-musica.md)).
4. Texto da habilidade: confira `textoHabilidade` em `ui/comum.js` e `textos.habilidades` em `mensagens.json`.
5. Use o tipo em `plantas.json`/`pragas.json`.

## Criar um status novo (ex.: congelar)

1. Dados: ponha `"aplica": { "status": "nome", "valor": ..., "turnos": ... }` na habilidade.
2. `batalha.js → aplicarStatus` e `tickStatus`: defina se é ruim/bom e o que faz a cada rodada (se age no `tick`).
3. Textos em `mensagens.json → status` (`icone`, `nome`, `texto`).
4. Sons `status_<nome>` e `tick_<nome>` em `som.js`.

## Criar uma missão

Em `data/missoes.json → missoes`, no fim da fila, adicione `{ id, icone, titulo, fala, tarefas: [...], premio }`. Tipos de tarefa em [05](05-campanha-e-missoes.md). Pra contar uma ação nova, crie o contador: em `estado.js`, chame `contar('nomeNovo')` dentro da ação.

## Adicionar um campo novo no save

1. Ponha o valor padrão em `estado.js → novoEstado()`.
2. Se precisar arrumar saves antigos além de preencher o padrão, ajuste `completar()`.
3. Nunca renomeie/remova um campo sem tratar o save antigo.

## Adicionar uma carta nova

1. `data/cartas.json` com `id` único, `uso` e descrição.
2. Use o `id` em prêmios/lojas/trocas (`feira.json`, `campanha.json`, `rotina.json`…).

## Criar um modo/tela nova

1. `<section id="tela-xxx" class="tela">` em `index.html`.
2. `js/ui/tela-xxx.js` com `iniciarTelaXxx(dados, callbacks)` e `abrirXxx()`; ligue em `main.js` (importe e chame em `comecar()`).
3. Regras em arquivo próprio (`js/xxx.js`) e ações no `estado.js` (campo novo no save: veja acima).
4. Dados em `data/xxx.json`; carregue em `main.js → comecar` e coloque no objeto `dados`.
5. **Música própria** em `som.js → MUSICAS` e ligação em `config.json → som.musicaPorTela` ([11](11-som-e-musica.md)).
6. **Todos os arquivos novos** na lista `ARQUIVOS` do `service-worker.js`.
7. Se tem batalha: gere um objeto de batalha no formato de [03](03-batalha.md) com `tipo` próprio; trate o `tipo` em `estado.registrarBatalha` e em `main.js → mapaDaFase`.

## Achar a causa de um problema

| Sintoma | Olhe primeiro |
| --- | --- |
| Moeda/carta/XP errados | `estado.js` (função da ação) |
| Não salvou / save antigo quebrou | `estado.js → novoEstado/completar`, `save.js` |
| Tela em branco ao abrir | Console do navegador: JSON inválido em `data/` ou arquivo faltando no `service-worker` |
| Número estranho na batalha | `batalha.js → bater`, `evolucao.js → atributos` |
| Fase não libera | `campanha.js → faseLiberada`, `estado.vencidas` |
| Missão não conta | contador ausente em `estado.js` ou `base` da missão |
| Funciona online, não offline | arquivo faltando em `ARQUIVOS` do `service-worker.js` |
| Atualização não chega | versões diferentes entre `config.json` e `service-worker.js` |
