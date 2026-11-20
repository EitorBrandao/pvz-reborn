# 06 · Atividades (tela "Desafios")

[← Índice](README.md) · Arquivos: `js/atividades.js`, `js/ui/tela-atividades.js` · Dados: `atividades.json`

Tudo aqui **não gasta fôlego** (`folego: 0`). `atividades.js` só monta batalhas no mesmo formato das fases ([03](03-batalha.md)); o prêmio é pago por `estado.registrarBatalha`.

## Torre das Pragas

`gerarAndar(andar, dados)`. Cada andar é **sempre igual** (usa semente `torre-<andar>`).

- Nível das pragas: `1 + (andar−1) × nivelPorAndar`.
- Quantidade: `inimigosBase + (andar−1) ÷ andaresPorInimigo` (até `maxInimigos`).
- Pragas novas entram no sorteio com o tempo (`pragasIniciais`, `andaresPorPragaNova`).
- **Chefe** a cada `chefeACada` andares (dá orvalho e cartas melhores).
- Prêmio só na **primeira vitória** de cada andar (`premioValido`: andar === `estado.torre.andar`). Guarda `torre.melhor` (recorde) e `torre.andar` (próximo).

## Desafio do Dia

`desafioDoDia(dados, estado, data)`. Semente `desafio-<AAAA-MM-DD>`: **todo mundo tem o mesmo desafio no mesmo dia**.

- Sorteia uma **regra** de `atividades.desafio.regras`: só uma facção (só se o jogador tiver planta dela), time de 3, pragas parrudas (+vida), furiosas (+ataque) ou ligeiras (+vel).
- Pragas: só as que o jogador já enfrentou (`pragasConhecidas`), nível = `nivelDoJogador` (média das 5 melhores plantas) + `nivelExtra`.
- 1ª vitória do dia dá moedas, XP, orvalho e cartas; depois disso, prêmio zerado (`estado.desafio.{dia,vencido}`).
- `hoje()` devolve `AAAA-MM-DD` no horário do celular.

## Horta de Treino

`batalhaTreino(idsPragas, nivel)`: o jogador escolhe até 5 pragas que já venceu e o nível. **Não ganha nem perde nada** (`tipo: 'treino'`, prêmio zero, `podePular`).

## Regras do time

`checarTime(batalha, time, dados)` devolve `null` ou `{ erro }` (`regraTimeMax`, `regraFaccao`). É chamado em `main.js → lutar()` antes de qualquer batalha.

## Funções auxiliares usadas por outros módulos

| Função | Quem usa |
| --- | --- |
| `hoje()` | estado (feira, invasão), eventos |
| `criarRng` + `numeroDoTexto` | sorteios repetíveis por dia/andar |
| `pragasConhecidas` | desafio, treino, herbário, invasão |
| `nivelDoJogador` | desafio, invasão |

> `eventos.js` repete a função `numeroDoTexto` (mesma lógica). Se mexer numa, mexa na outra.
