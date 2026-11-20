# 04 · Evolução das plantas

[← Índice](README.md) · Arquivos: `js/evolucao.js` (contas), `js/estado.js` (ações), `js/ui/tela-plantas.js` (tela) · Dados: `config.json` (`evolucao`, `pacote`, `troca`, `poder`), `plantas.json`, `cartas.json`, `equipamentos.json`, `ascensao.json`, `talentos.json`, `faccoes.json`

`evolucao.js` só faz **contas**. Quem muda o jogo é o `estado.js` (funções `treinar`, `evoluirEstrela`, `ascender`, `gastarTalento`, `resetarTalentos`, `melhorarEquip`).

## Atributos finais de uma planta

`evolucao.atributos(base, registro, dados)`:

```
atributo = base × fNível × fEstrela × fRank × (1 + bônus)
fNível   = 1 + 0,15 × (nível − 1)          (batalha.crescimentoPorNivel)
fEstrela = 1 + 0,20 × (estrelas − 1)       (evolucao.bonusEstrela)
fRank    = 1 + 0,25 × ascensão             (evolucao.bonusRank)
bônus    = talentos (vida/atq/def) + equipamentos
vel      = base.vel + talentos            (VEL não cresce por nível)
```

## Nível e XP

- XP pro próximo nível: `xpBase + (nível−1) × xpPorNivel` (40 + 25 por nível).
- **Nível máximo** = `estrelas × 10 + ascensão × 10` (`nivelMaximo`).
- Fontes de XP: batalhas (todo o time), cartas de treino (`adubo` +30, `seiva_dourada` +150), expedições.
- `darXp` sobe vários níveis de uma vez e zera o XP quando chega ao máximo.

## Estrelas (1 a 5)

- Pra subir: `copiasPorEstrela[estrela atual]` cópias da planta + `moedasPorEstrela` moedas. (`custoEstrela`, `evoluirEstrela`)
- Cada estrela: +20% nos atributos, +10 de nível máximo, e a **habilidade melhora** (`habilidadeComEstrelas` usa `porEstrela` da planta).
- **Cópias vêm de** Pacotes de Sementes, Sementes Misteriosas e trocas.
- **Cópias que sobram** (acima do que falta até 5★) viram **Muda Repetida** automaticamente (`guardarSobras`).

## Muda Repetida (troca)

Carta `muda_repetida` (config `troca`):

- 3 mudas → uma planta aleatória que ainda precisa de cópias (`trocarMudas`);
- 1 muda → um material sorteado (fibra ×2 70%, pétala rara 20%, seiva dourada 10%) (`trocarMudasPorMaterial`).

## Pacote de Sementes

`comprarPacote('moedas'|'orvalho')` (300 moedas ou 5 💧; lote de 10): `abrirPacote()` sorteia uma planta pelos **pesos** de `config.pacote.pesos` (`evolucao.sortearPlanta`). Planta nova entra na coleção; repetida vira cópia. A `semente_misteriosa` (carta) faz o mesmo (`plantarSemente`).

## Equipamentos

3 espaços (`equipamentos.json`): 🏺 Vaso (vida), 🧪 Adubo (ataque), 🚿 Regador (defesa). Níveis **Comum +10%**, **Raro +22%**, **Épico +40%**; cada um custa moedas + cartas (`fibra`, `petala_rara`, `seiva_dourada`). Função: `melhorarEquip(idPlanta, idEspaco)`.

## Ascensão

Planta com **5★ no nível máximo** pode ascender (`podeAscender`): volta ao nível 1, mantém estrelas e equipamento, ganha +1 de **rank** (até 5). Efeitos: +25% de atributos por rank, +10 de nível máximo por rank, +pontos de talento. Custo em `ascensao.json` (moedas + `muda_repetida` + `fibra`). Selo do rank: `✦` a `✦✦✦✦✦` (`ascensao.selos`, mostrado por `selosPlanta` em `ui/comum.js`).

## Talentos

- Pontos = `nível ÷ 5` (arredondado pra baixo) + `pontosPorRank` × rank + `talentosExtra` (do Labirinto). (`pontosTalento`, `pontosGastos`)
- A **classe** da planta vem do campo `funcao` → `talentos.funcoes` → `talentos.classes` (`tanque`, `dano`, `apoio`, `controle`). Cada classe tem 3 ramos: 🌱 Raiz, 🔥 Tronco, 🌸 Folha, com **nós** (`id`, `efeito`, `porPonto`, `max`).
- Efeitos possíveis (`bonusTalentos`): `vida`, `atq`, `def`, `vel`, `critico`, `critDano`, `potencia`, `seivaInicial`, `seivaTurno`.
- `gastarTalento(planta, no)` e `resetarTalentos(planta)` (custa 💧 `custoReset.orvalho`).
- Os bônus entram em `atributos()` (vida/atq/def/vel) e em `prepararBatalha` (o resto).

## Facções

`faccoes.json`: 🏜️ Sertão (def), 🌴 Mata (vel), 🐸 Brejo (vida), 🌽 Roça (atq). 2 plantas da mesma facção no time: +10% no atributo; 3: +20%. Cada facção bate +30% numa categoria de praga e cada categoria bate +25% numa facção (`forteContra`). Veja [03](03-batalha.md).

## Cartas (`cartas.json`)

| Carta | Uso (`uso`) | Pra que serve |
| --- | --- | --- |
| `adubo` Terra Fértil | `xp` | +30 XP numa planta |
| `seiva_dourada` | `xp` | +150 XP; também equipamento épico |
| `fibra` Fibra Verde | `equip` | Material de equipamento e ascensão |
| `petala_rara` | `equip` | Equipamento raro/épico |
| `semente_misteriosa` | `pacote` | Vira uma planta |
| `muda_repetida` | `troca` | Troca por planta/material; custo da ascensão |
| `semente_labirinto` | `fusao` | Prêmio do Labirinto; material da futura Fusão |

## Onde as contas aparecem na tela

`tela-plantas.js`: lista (coleção), detalhe de cada planta (nível, estrelas, ascensão, talentos, equipamentos), inventário de cartas, pacote/troca, **prévia** de quanto a planta fica mais forte (`atributos(..., mudanca)`).
