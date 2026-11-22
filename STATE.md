# STATE.md

Memória entre sessões. Máximo 40 linhas por tarefa. Sessão nova: leia isto primeiro.

## Tarefa atual: equilíbrio do dano das pragas (v0.15.8, publicada)

- Aprovado: defesa relativa `atq/(atq + kDef*def)` com kDef 0.25 e multDano 1.0; `pragaForte` (nível 40→70: vida ×4, atq ×7, não vale no Labirinto); chefe da Invasão multChefe.atq 2.5; Labirinto fator andar 6 = 0.740, andar 7 = 0.930.
- Falta: Desafio do dia continua fácil pro time forte (~94% de vida); andares 6-7 do Labirinto duros pra time médio (~30% vitória); Torre 140-160 ~10-15% de derrota pro time forte.
- Decisões: Arena usa a mesma fórmula (WO sumiu). Campanha normal (pragas ≤ nível 40) quase não muda. Scripts de simulação ficam no scratchpad da sessão (não versionados).
