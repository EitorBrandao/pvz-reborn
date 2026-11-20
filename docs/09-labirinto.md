# 09 · Labirinto das Raízes

[← Índice](README.md) · Arquivos: `js/labirinto.js` (regras), `js/estado.js` (corrida e prêmio), `js/ui/tela-labirinto.js` (tela) · Dados: `labirinto.json`

Corrida de **8 andares** sem usar o time salvo: o jogador escolhe até `plantasInicio` plantas **da coleção** (qualquer uma). Perdeu → acabou. A vida **não volta sozinha**.

## Estado da corrida

`estado.labirinto.run` (some quando `receberLabirinto()` paga o prêmio):

```js
{ andar, andaresVencidos, time: [{planta,col,linha}], vidas: {planta: 0..1},
  bencaos: [ids], moedas, sementesExtra, poderMedio,
  etapa: 'portas' | 'bencao' | 'recruta' | 'evento' | 'fim',
  portas: [{t}], opcoes: [ids], evento, venceu }
```

## Fluxo de um andar

1. **Portas** (`gerarPortas`): 3 sortudas de `labirinto.portas` (pesos, `desdeAndar`). Nos andares de chefe (4 e 8) só aparece a porta do chefe. Sempre há ao menos uma de batalha ou elite; recruta só se há vaga e planta livre.
2. `abrirPortaLabirinto(i)`:
   - **batalha / elite / chefe** → `gerarBatalha()` devolve a batalha e a tela chama `lutar`.
   - **descanso** → cura `descansoCura` do time e avança.
   - **bênção** → etapa `bencao` com 3 opções (`opcoesBencao`).
   - **recruta** → etapa `recruta` com 3 plantas livres (`opcoesRecruta`).
   - **evento** → sorteia um evento de `labirinto.eventos` (fonte, baú…); `eventoLabirinto(arriscar)` resolve com chance de ok/falha.
3. Depois de qualquer sala resolvida: `avancarLabirinto()` (+1 andar; no último, `venceu = true`).
4. **Elite** vencida oferece bênção "maldita" (2 malditas + 1 normal). **Chefe** vencido cura `chefeCura`.

## Dificuldade ajustada ao time

`gerarBatalha(run, tipo, dados, colecao)`:

1. `poderDoTime` (só plantas vivas, via `evolucao.poder/atributos`);
2. alvo = `poder^expoentePoder` × `fator[andar]` (× `fatorElite`);
3. escolhe as pragas (`poolInicial + andar`, `inimigosPorAndar`) e calcula o **nível** pra que o poder delas chegue perto do alvo;
4. se até o nível 1 passa do alvo, as pragas ficam **mais fracas** (`multPragas`, mínimo `fraquezaMin`).

Resultado: time forte ou fraco encontra desafio parecido, mas o **prêmio** muda com o poder (`multPremio`, referência `referenciaPremio`).

## Batalha dentro do labirinto

`prepararBatalha` lê `batalha.labirinto = { vidas, mods }`: aplica bênçãos (vida, atq, def, vel, crítico, seiva), pula plantas caídas e começa cada planta com a vida que sobrou. No fim, `tela-batalha.terminar` calcula a fração de vida de cada planta e `registrarLabirinto` atualiza `run.vidas`. Rodadas: `labirinto.maxRodadas`.

## Prêmio (`premioFinal` → `receberLabirinto`)

- **Sementes do Labirinto** (`semente_labirinto`, material da futura Fusão): `sementesPorAndar` por andar vencido + `sementesVitoria`, × `multPremio` × (1 + bênção de sementes).
- **Pontos de talento** (`labirinto.coringa`): 1 a cada `andaresPorPonto` andares + `pontosVitoria`. Gastos em qualquer planta com `usarPontoLabirinto` (vira `talentosExtra`).
- **Moedas** acumuladas na corrida × `multPremio`.
- Guarda o recorde `labirinto.melhor`.

## Outros

- `abandonarLabirinto()` encerra como derrota (ainda dá o prêmio dos andares).
- Música própria `labirinto`.
- O fim da corrida volta pra tela do Labirinto (`main.js → mapaDaFase`).
