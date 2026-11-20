# 12 · Arquivos de dados (`data/`)

[← Índice](README.md)

Todos são carregados em `main.js → comecar()` e entram no objeto `dados` (o nome na tabela é a chave usada no código, ex.: `dados.plantas`). **Mudar número ou texto aqui muda o jogo sem mexer no código.** Cuidado com a vírgula do JSON (uma vírgula errada derruba o carregamento do jogo).

| Arquivo | `dados.` | Conteúdo | Quem usa |
| --- | --- | --- | --- |
| `config.json` | `config` | **versão do jogo**, início (moedas/nível), broto, save, plantas e time iniciais, batalha, evolução, pacote, troca, fôlego, nível do jogador, som, poder, estrelas de fase | quase tudo |
| `plantas.json` | `plantas` | Lista de plantas: `id`, `faccao`, `nome`, `emoji`, `projetil`, `funcao`, `alvo`, `alcance`, stats, `habilidade` | batalha, evolução, telas |
| `pragas.json` | `pragas` | Lista de pragas: igual às plantas + `categoria` e `chefe` | batalha, torre, invasão |
| `faccoes.json` | `faccoes` | 4 facções, 4 categorias, vantagens e bônus de time | batalha, herbário, desafio |
| `cartas.json` | `cartas` | Cartas/materiais (`uso`, `xp`, raridade) | evolução, telas |
| `equipamentos.json` | `equipamentos` | 3 espaços e 3 níveis (bônus e custo) | evolução |
| `ascensao.json` | `ascensao` | `rankMax`, selos, custos por rank | evolução |
| `talentos.json` | `talentos` | Pontos, reset, `funcoes→classes`, ramos e nós | evolução, batalha |
| `campanha.json` | `campanha` | 6 mapas × 10 fases | campanha, herbário, invasão |
| `pesadelo.json` | `pesadelo` | Multiplicadores do modo Pesadelo | `campanha.js` |
| `missoes.json` | `missoes` | Personagem, `ativasMax`, fila de missões | missões |
| `atividades.json` | `atividades` | `torre`, `desafio` (regras), `treino` | `atividades.js` |
| `rotina.json` | `rotina` | `canteiro`, `expedicao`, `presenca` | estado, painel-rotina |
| `invasao.json` | `invasao` | Ciclo, bots, prêmios por posição | `eventos.js`, estado |
| `feira.json` | `feira` | Ofertas e trocas | `eventos.js`, estado |
| `herbario.json` | `herbario` | Títulos, prêmios, receitas de fusão (informativas) | `eventos.js` |
| `labirinto.json` | `labirinto` | Andares, portas, bênçãos, eventos, prêmios | `labirinto.js`, estado |
| `mensagens.json` | `textos` | **Todos os textos** da interface (agrupados) | telas |
| `changelog.json` | (só `main.js`) | Novidades por versão (tela de Opções) | `main.js` |

## Esqueletos úteis

**Planta** (`plantas.json`):

```json
{ "id": "cacto", "faccao": "sertao", "nome": "Cacto Espeto", "emoji": "🌵", "projetil": "✴️",
  "funcao": "Tanque", "alvo": "frente"?, "alcance": "perto"?,
  "vida": 420, "atq": 24, "def": 40, "vel": 7,
  "habilidade": { "tipo": "espinhos", "nome": "...", "mult": 1.0, "reflete": 0.4, "turnos": 2,
                  "aplica": { "status": "...", "valor": 0.2, "turnos": 2 }?,
                  "porEstrela": { "reflete": 0.1 } } }
```

- `funcao` precisa existir em `talentos.funcoes` (senão cai na classe `dano`).
- `faccao` precisa ser uma de `faccoes.faccoes[].id`.
- Pra entrar no pacote, a planta precisa de peso em `config.pacote.pesos`.

**Praga**: igual, com `"categoria": "rastejante|voador|blindado|saltador"` e `"chefe": true` se for chefe.

**Carta** (`cartas.json`): `{ id, nome, emoji, raridade, uso: xp|equip|pacote|troca|fusao, xp?, descricao }`. Prêmios sempre referenciam o `id`.

## `mensagens.json` (textos)

Chaves de topo de **erros e avisos** usadas por `res.erro` (`semMoedas`, `semMaterial`, `nivelMaximo`, `semFolego`…), mais grupos por assunto: `status`, `atividades`, `rotina`, `invasao`, `feira`, `herbario`, `labirinto`. Textos com `{valor}` são preenchidos por `preencher()`.

## Regra de ouro

Id **nunca** muda depois de publicado (está no save do jogador: `colecao`, `inventario`, `vencidas`…). Se renomear um id, saves antigos quebram. Mudou só o `nome` de exibição? Sem problema.
