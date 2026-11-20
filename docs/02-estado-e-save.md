# 02 · Estado e save

[← Índice](README.md) · Arquivos: `js/estado.js`, `js/save.js`

## Como o save funciona

- Chave no `localStorage`: **`horta.save.v1`**. Formato JSON do objeto `estado`.
- `estado.js` guarda o objeto `estado` (exportado) e chama `save.salvar(estado)` em quase toda ação (`salvarAgora()`), a cada **10 s** (`config.save.intervaloSegundos`) e quando a aba some/fecha (`visibilitychange`, `pagehide`).
- `save.salvar` grava também `versao` (`VERSAO_SAVE = 1`) e `ultimaSessao` (hora do relógio).
- **Backup:** `save.exportar()` baixa `horta-selvagem-AAAA-MM-DD.json`; `save.importar(arquivo)` lê e valida (`jogo === 'horta-selvagem'`); `jogo.substituir(novo)` troca o estado. **Apagar tudo:** `jogo.recomecar()`.
- `save.pedirArmazenamentoPersistente()` pede ao navegador pra não apagar sozinho.
- `migrar()` em `save.js` é onde entrariam migrações quando a estrutura mudar. Hoje, saves antigos são ajustados pelo `completar()` do `estado.js`.

### `completar()` (saves antigos)

`estado.js → completar(salvo)` junta o save lido com um `novoEstado()` limpo (campos que faltam são preenchidos) e ainda: coloca no `colecao` plantas que estavam no time; garante `ascensao` e `talentos`; converte cópias que sobram em **Mudas Repetidas**; devolve talentos que não existem mais; completa os vasos do canteiro. **Campo novo no save = ponha um valor padrão em `novoEstado()`.**

## Campos do `estado`

| Campo | O que é | Usado por |
| --- | --- | --- |
| `jogo`, `versao`, `criadoEm`, `ultimaSessao` | Identificação e horários | `save.js` |
| `moedas`, `orvalho` | As duas moedas do jogo | quase tudo |
| `nivel`, `xpJogador` | Nível do jogador e XP dentro dele | `darXpJogador`, vagas do time |
| `broto` `{regas}` | Regadas no broto da horta | `regarBroto` |
| `time` `[{planta, col, linha}]` | Time atual e posições | batalha, expedição |
| `colecao` `{idPlanta: registro}` | Plantas que o jogador tem (veja abaixo) | evolução, batalha |
| `inventario` `{idCarta: qtd}` | Cartas/materiais | evolução, feira, prêmios |
| `vencidas` `[idFase]` | Fases da campanha já vencidas | liberação, missões, herbário |
| `estrelasFases` `{idFase: 1..3}` | Melhor nota de cada fase | Pesadelo |
| `folego` `{valor, desde}` | Fôlego e quando começou a recuperar | `folego()` |
| `contadores` `{nome: n}` | Contadores de ações (alimentam as missões) | missões |
| `missoes` `{ativas, proxima}` | Missões em andamento e a próxima da fila | `painel-missoes` |
| `torre` `{andar, melhor}` | Torre das Pragas | atividades |
| `desafio` `{dia, vencido, total}` | Desafio do Dia | atividades |
| `canteiro` `[vaso|null]` | Vasos: `{muda, desde}` | rotina |
| `expedicao` | `null` ou `{destino, plantas, desde, duracao}` | rotina |
| `presenca` `{dia, dias}` | Calendário diário | rotina |
| `invasao` | Ciclo atual da Invasão: `{ciclo, nivel, dano, dia, ataques, premioPego}` | eventos |
| `feira` `{dia, comprados}` | Ofertas já compradas hoje | feira |
| `herbario` `{pegas}` | Páginas cujo prêmio foi pego | herbário |
| `labirinto` `{melhor, coringa, run}` | Recorde, pontos de talento livres e corrida em andamento | labirinto |
| `velocidadeBatalha`, `somLigado`, `versaoVista` | Preferências | telas |

### Registro de uma planta (`colecao[id]`)

Criado por `evolucao.registroNovo()`:

```js
{ nivel: 1, xp: 0, estrelas: 1, ascensao: 0, talentos: {}, copias: 0,
  equip: { vaso: 0, adubo: 0, regador: 0 } }
// campo extra opcional: talentosExtra (pontos de talento vindos do Labirinto)
```

- `copias`: cópias extras guardadas para subir de estrela.
- `talentos`: `{ idDoNo: pontosGastos }`.
- `equip`: nível (0 a 3) de cada espaço de equipamento.

## Contadores (ligação com missões)

`contar('nome')` soma 1 em `estado.contadores`. As missões do tipo `contador` olham quanto aumentou **desde que a missão ficou ativa** (`base`). Contadores existentes:

`regarBroto`, `batalhar`, `coletarCarta`, `vencerFase`, `vencerChefe`, `subirTorre`, `vencerDesafio`, `atacarInvasao`, `fimInvasao`, `comprarFeira`, `trocarFeira`, `paginaHerbario`, `plantarMuda`, `colherCanteiro`, `enviarExpedicao`, `voltarExpedicao`, `presenca`, `treinar`, `evoluirEstrela`, `ascender`, `melhorarEquip`, `abrirPacote`, `labirinto`.

> Pra uma missão nova contar algo novo: crie o contador com `contar('nome')` no `estado.js` e use `"tipo": "contador"` em `data/missoes.json` ([05](05-campanha-e-missoes.md)).

## Funções do `estado.js` por área

| Área | Funções principais |
| --- | --- |
| Início/save | `iniciar`, `salvarAgora`, `substituir`, `recomecar` |
| Jogador | `xpJogadorInfo`, `vagasTime`, `proximaVaga` (privada: `darXpJogador`) |
| Fôlego | `folego`, `gastarFolego`, `recarregarFolego` |
| Missões | `missoesAtivas`, `idsMissoesCompletas`, `marcarMissaoVista`, `resgatarMissao` |
| Broto | `regarBroto`, `estagioBroto` |
| Batalha | `definirTime`, `definirSom`, `definirVelocidade`, **`registrarBatalha`** |
| Labirinto | `labirinto`, `iniciarLabirinto`, `abrirPortaLabirinto`, `escolherBencaoLabirinto`, `recrutarLabirinto`, `eventoLabirinto`, `receberLabirinto`, `abandonarLabirinto`, `usarPontoLabirinto` |
| Invasão | `invasaoAtual`, `invasaoPendente`, `gastarAtaqueInvasao`, `resgatarInvasao` |
| Feira | `feiraHoje`, `comprarOferta`, `fazerTroca` |
| Herbário | `herbario`, `fusoes`, `resgatarPagina` |
| Rotina | `vasoInfo`, `plantarMuda`, `colherVaso`, `emExpedicao`, `previaExpedicao`, `expedicaoInfo`, `enviarExpedicao`, `receberExpedicao`, `presencaPendente`, `resgatarPresenca` |
| Evolução | `treinar`, `evoluirEstrela`, `ascender`, `gastarTalento`, `resetarTalentos`, `melhorarEquip` |
| Pacote/mudas | `comprarPacote(s)`, `plantarSemente(s)`, `trocarMudas(Varias)`, `trocarMudasPorMaterial(Varias)` |

### `registrarBatalha(batalha, vitoria, cartas, estrelas, extra)`

Ponto único onde o resultado de qualquer batalha vira progresso. Resumo:

1. `batalha.tipo` define o caminho: `invasao` → `registrarInvasao`; `labirinto` → `registrarLabirinto`; os outros seguem abaixo (`campanha` quando não tem tipo; `torre`, `desafio`, `treino`).
2. `premioValido()` decide se a vitória ainda paga (treino nunca; torre só no andar atual; desafio só uma vez por dia).
3. XP: vitória com prêmio dá o XP cheio; derrota dá `xpDerrota` (30%) do XP.
4. Todas as plantas do **time** recebem o XP (`evo.darXp`).
5. Moedas, orvalho e cartas entram no inventário se a vitória vale prêmio.
6. Campanha: marca `vencidas`, `estrelasFases` (maior valor), contadores `vencerFase`/`vencerChefe`.
7. Torre/desafio atualizam `torre` e `desafio`.
8. XP do jogador (`darXpJogador`): ao subir de nível enche o fôlego e dá orvalho.
9. Salva e devolve `{xp, moedas, orvalho, subiram, subiuJogador, cartas}` para a tela mostrar.
