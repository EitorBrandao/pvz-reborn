# 15 · Glossário

[← Índice](README.md)

## Termos do jogo

| Termo | Significa | Onde no código |
| --- | --- | --- |
| **Horta** | Tela principal (`tela-base`) | `index.html`, `main.js` |
| **Planta** | Unidade do jogador | `plantas.json` |
| **Praga** | Inimigo (nunca "zumbi") | `pragas.json` |
| **Moedas** | Moeda comum, ganha jogando | `estado.moedas` |
| **Orvalho 💧** | Moeda rara (missões, nível, prêmios) | `estado.orvalho` |
| **Fôlego** | "Energia" que a campanha gasta; volta com o tempo | `estado.folego` |
| **Seiva** | Barra 0–100 que, cheia, dispara a habilidade | `batalha.js` |
| **Facção** | Origem da planta: Sertão, Mata, Brejo, Roça | `faccoes.json` |
| **Categoria** | Tipo da praga: rastejante, voador, blindado, saltador | `pragas.json` |
| **Estrelas (planta)** | 1 a 5 ★; dão força e nível máximo | `registro.estrelas` |
| **Estrelas (fase)** | 1 a 3 ★ pela quantidade de plantas vivas | `estado.estrelasFases` |
| **Cópias** | Repetidas da planta usadas pra subir de estrela | `registro.copias` |
| **Muda Repetida** | Carta das cópias que sobram; troca por planta/material | `muda_repetida` |
| **Cartas** | Materiais e itens (adubo, fibra…) | `cartas.json`, `estado.inventario` |
| **Pacote de Sementes** | Compra que sorteia uma planta | `config.pacote` |
| **Ascensão / Rank** | Reiniciar o nível de uma planta 5★ pra ficar mais forte | `ascensao.json` |
| **Talento** | Ponto gasto em ramos Raiz/Tronco/Folha | `talentos.json` |
| **Poder** | Número único que compara força | `evolucao.poder` |
| **Pesadelo** | Versão difícil de cada mapa | `pesadelo.json` |
| **Torre / Desafio / Treino** | Atividades da tela "Desafios" | `atividades.js` |
| **Canteiro** | 3 vasos que crescem em tempo real | `rotina.json` |
| **Expedição** | Plantas fora do time trazem prêmios | `rotina.json` |
| **Calendário (presença)** | Prêmio por dia de entrada | `rotina.json` |
| **Invasão** | Chefe gigante de vários dias com ranking de dano | `invasao.json` |
| **Feira** | Ofertas do dia e trocas de materiais | `feira.json` |
| **Herbário** | Álbum de plantas e pragas com prêmio por página | `herbario.json` |
| **Labirinto** | Corrida de 8 andares com portas | `labirinto.json` |
| **Bênção** | Bônus do Labirinto (maldita = com custo) | `labirinto.json` |
| **Dona Flora** | Personagem das missões | `missoes.json` |
| **Arena / bots** | Planejado, ainda **não existe** no código | `PLANO.md` fase 5 |
| **Fusão** | Planejada (fase 14), ainda não existe | `PLANO.md` |

## Termos do código

| Termo | Significa |
| --- | --- |
| `dados` | Objeto com todo o conteúdo de `data/*.json`, passado às telas |
| `estado` | Objeto do save; só `estado.js` altera |
| `registro` | Dados de uma planta em `estado.colecao[id]` |
| `base` | Dados de uma planta/praga em `plantas.json`/`pragas.json` |
| `col` / `linha` | Posição no campo: col 0 = frente, 1 = fundo; linha 0–2 |
| `uid` | Id de uma unidade **dentro de uma batalha** (`u0`, `u1`…) |
| `lado` | `'planta'` ou `'praga'` |
| `semente` / `rng` | Número que torna o sorteio repetível (`criarRng`) |
| `snap` / "foto" | Cópia de vida/seiva/escudo de todos num momento da batalha |
| `evento` | Item da lista que `simular` devolve (`rodada`, `acao`, `status`, `fim`) |
| `efeito` | Algo que aconteceu dentro de uma ação (dano, cura, escudo…) |
| `tipo` (batalha) | Origem da batalha: vazio = campanha, `torre`, `desafio`, `treino`, `invasao`, `labirinto` |
| `{ ok, erro }` | Retorno padrão das ações; `erro` é chave de `mensagens.json` |
| `contar()` | Soma num contador de `estado.contadores` (alimenta missões) |
| `callbacks` | Funções que o `main.js` entrega às telas (`lutar`, `voltar`, `preparar`) |
