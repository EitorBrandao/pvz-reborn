# Horta Selvagem: plano de desenvolvimento

20/11/2026

## Visão geral

Horta Selvagem é um RPG de batalha automática com plantas, no estilo dos jogos de navegador do Facebook de 2013 (Plants Gone Wild, da Youkia). Roda no navegador do celular, pode ser instalado na tela inicial (PWA) e funciona offline. Os rivais da arena são bots que imitam jogadores de verdade.

O jogo original saiu do ar. Este projeto é um sucessor espiritual, não uma cópia.

**Regras que não mudam:**

- Arte, nomes e textos originais. Nada de assets, nomes ou personagens de Plants vs. Zombies, PopCap, EA ou Youkia. Nada de zumbis: os inimigos são **pragas**.
- Roda no navegador do celular (Chrome Android e Safari iOS), em tela de pé, com o polegar.
- Instalável como PWA e jogável sem internet depois do primeiro acesso.
- Save local no aparelho, automático. Nenhum login, servidor, anúncio ou compra com dinheiro real.
- Os rivais bots precisam parecer gente: rotina, personalidade e imperfeição (mesma receita do Cidade Feliz).

## Stack técnica

| Item | Escolha | Por quê |
| --- | --- | --- |
| Linguagem | HTML + CSS + JavaScript puro (módulos ES) | Sem etapa de build, é só abrir e editar |
| Batalha | Canvas 2D | Animações e números de dano fluidos no celular |
| Menus | HTML/CSS (DOM) | Mais fácil de fazer botões e listas |
| Dados | Arquivos `.json` em `data/` | Ajustar números sem mexer no código |
| Save | `localStorage` (chave `horta.save.v1`) + `navigator.storage.persist()` | Simples e offline |
| Backup | Exportar/Importar save como arquivo `.json` | Não perder o progresso ao trocar de celular |
| PWA | `manifest.webmanifest` + `service-worker.js` | Instalar e jogar offline |
| Hospedagem | GitHub Pages | Grátis, com HTTPS (obrigatório pra PWA) |
| Atualização | Service worker busca a versão nova ao abrir | Igual app de loja: abriu, atualizou |
| Arte provisória | Formas desenhadas no Canvas e emojis | Destrava o jogo antes da arte final |

**Estrutura de pastas:**

```
pvz-reborn/
  index.html
  manifest.webmanifest
  service-worker.js
  css/         (estilo.css)
  js/          (main.js, estado.js, save.js, batalha.js, evolucao.js, campanha.js, arena.js, bots.js, ui/)
  data/        (plantas.json, pragas.json, cartas.json, fases.json, bots.json, mensagens.json, missoes.json, atividades.json, rotina.json, invasao.json, feira.json, herbario.json)
  art/         (plantas/, pragas/, ui/, icones/)
  audio/
```

`estado.js` guarda todo o estado do jogo (moedas, plantas, time, progresso, ranking) e é o único que fala com o `save.js`.

## Save

- Salva a cada ação importante (fim de batalha, evolução, compra) e a cada 10 segundos.
- O save tem um campo `versao`; ao mudar a estrutura, uma função de migração atualiza os saves antigos.
- Guarda `ultimaSessao` (hora do relógio) pra calcular o que aconteceu com o jogo fechado: fôlego recuperado e atividade dos bots.
- Tela de opções: Exportar save (baixa um `.json`), Importar save, Apagar tudo (com confirmação).

## Sistemas do jogo

**Batalha automática (o coração do jogo):**

- Campo de grama. Seu time fica à esquerda, as pragas à direita, cada lado com até 5 unidades numa grade 2x3 (frente e fundo).
- Limite de 15 rodadas: se ninguém vencer, conta como derrota.
- Turnos por velocidade: quem tem mais VEL ataca primeiro. A frente apanha mais, o fundo fica mais protegido.
- Cada planta tem um ataque normal e uma habilidade especial que dispara quando a barra de seiva enche.
- Números de dano grandes saltando, críticos maiores, tremidinha de tela.
- Botões: velocidade 1x/2x e "Pular batalha" (liberado depois de vencer a fase uma vez).
- Ao vencer, caem **cartas** (sementes, materiais e itens) que voam pra tela, como no jogo original.
- O resultado é calculado com uma semente fixa, então dá pra repetir e conferir.

**Plantas (catálogo inicial, nomes originais):**

| Planta | Função | Habilidade |
| --- | --- | --- |
| Pimentão Pavio | Dano em área | Explosão ardida em uma coluna |
| Cacto Espeto | Tanque | Devolve parte do dano recebido |
| Milho Pipoqueiro | Dano rápido | Rajada de 3 pipocas |
| Babosa Curandeira | Cura | Cura o aliado mais ferido |
| Couve Couraça | Tanque | Escudo pro time por 2 turnos |
| Bambu Lanceiro | Dano único | Golpe perfurante (frente e fundo) |
| Cogumelo Esporento | Controle | Faz uma praga dormir 1 turno |
| Trepadeira Laço | Controle | Prende e reduz VEL |

**Pragas:** Lagarta Gulosa, Gafanhoto Saqueador, Besouro Blindado, Lesma Ácida, Toupeira Escavadora. Chefes: Rainha Formiga, Ervaninha Daninha Gigante e outros por mapa.

**Evolução das plantas:**

- **Nível:** XP ganha em batalha. Atributos: VIDA, ATQ, DEF, VEL.
- **Estrelas (1 a 5):** juntar cópias da mesma semente aumenta as estrelas e o nível máximo. Cada estrela também deixa a habilidade mais forte (ex.: Babosa cura mais plantas, Milho dispara mais vezes).
- **Facções (origem):** 🏜️ Sertão, 🌴 Mata, 🐸 Brejo e 🌽 Roça. 2 ou 3 plantas da mesma facção no time dão bônus de atributo (+10%/+20%). Cada facção bate 30% mais forte numa categoria de praga (Rastejantes, Voadores, Blindados, Saltadores), e cada categoria bate 25% mais forte numa facção. Números em `data/faccoes.json`.
- **Efeitos de status:** 🧪 Veneno e 🔥 Queimadura (perdem vida por rodada), 💚 Regeneração (recupera vida), 🔻 Fraqueza (causa menos dano) e 💢 Casca rachada (menos defesa). Plantas e algumas pragas aplicam (campo `aplica` na habilidade).
- **Equipamentos:** 3 espaços (Vaso, Adubo, Regador), com raridade comum, rara, épica.
- **Cartas de item:** materiais que caem nas batalhas e servem pra evoluir e fabricar equipamentos.
- **Sementes novas:** Pacote de Sementes comprado com moedas do jogo ou ganho em missões.

**Moedas:** Moedas (ganhas jogando) e Gotas de Orvalho (raras: missões, subir de nível, ranking). Sem dinheiro real.

**Fôlego:** cada fase da campanha gasta fôlego; ele volta com o tempo, inclusive com o jogo fechado.

**Campanha:**

- Mapas temáticos (Quintal, Pomar, Pântano, Estufa, Deserto, Telhado), cada um com 10 fases e um chefe.
- Até 3 estrelas por fase, conforme as plantas que sobreviveram.
- As fases ficam em `data/fases.json` (pragas, níveis, recompensas, chances de carta).

**Arena contra bots (PvP simulado):**

- Ranking com cerca de 30 rivais bots. Você desafia quem está perto da sua posição.
- 5 desafios por dia; ganhar troca de posição, prêmio diário pela posição.
- Cada bot tem time, nível e estilo próprios, que evoluem com o tempo (mesmo com o jogo fechado).
- Os bots também desafiam você: ao abrir, aparece "Enquanto você estava fora" com as batalhas que você ganhou ou perdeu na defesa.

**Atividades fora da campanha (tela "Desafios", sem gastar fôlego):**

- **Torre das Pragas:** andares cada vez mais difíceis, com mais pragas e de nível maior. Chefe a cada 5 andares (dá orvalho e cartas raras). Cada andar só dá prêmio na primeira vitória. Guarda o recorde.
- **Desafio do Dia:** uma batalha por dia com uma regra especial (só uma facção, time de três, pragas parrudas, furiosas ou ligeiras). O nível acompanha suas plantas. A primeira vitória do dia dá orvalho e cartas raras.
- **Horta de Treino:** monte até 5 pragas que você já venceu, escolha o nível e teste o time. Não ganha nem perde nada.
- Números e regras em `data/atividades.json`.

**Rotina diária (na tela da horta, abaixo do broto):**

- **Canteiro:** 3 vasos. Compra-se uma muda com moedas (Cenoura 5min, Tomate 30min, Morango 2h, Abóbora 8h; as maiores liberam por nível do jogador). Ela cresce com o jogo fechado; toque pra colher moedas e cartas.
- **Expedição:** até 3 plantas fora do time vão pra um destino de 1h, 4h ou 8h e voltam com moedas, XP e cartas. Nível maior rende mais moedas e XP; cada estrela acima de 1 aumenta a chance de cartas e encurta a viagem em 5% (até 30%). A janela mostra o prêmio e o tempo previstos. Enquanto viajam, não podem entrar no time.
- **Calendário da horta:** abre ao entrar no jogo, um prêmio por dia (não precisa ser seguido); o 7º dia é o maior e depois recomeça.
- Números em `data/rotina.json`.

**Eventos e coleção:**

- **Invasão de Chefe** (4º cartão em Desafios): um chefe gigante (12× a vida de um chefe normal, mas batendo mais fraco) fica 3 dias na horta. Você e 10 vizinhos bots batem no mesmo chefe; os bots batem sozinhos com o tempo (menos de madrugada), mesmo com o jogo fechado. 3 ataques grátis por dia, extra custa 💧2. Cada ataque dá moedas pelo dano, XP e cartas; no fim, prêmio pela posição no ranking (+💧3 se o chefe caiu). Quando a Arena chegar, os bots daqui viram os bots completos. Números em `data/invasao.json`.
- **Feira** (botão 🛒 à direita da horta): 4 ofertas por dia, cada uma comprável uma vez, só com moedas do jogo; e trocas de materiais (ex.: 6 Fibras → 1 Pétala). Números em `data/feira.json`.
- **Herbário** (botão 📖 à direita da horta): uma página por facção (plantas) e uma por mapa (pragas). Página completa dá prêmio uma vez. Números em `data/herbario.json`.
- Cada um tem música própria (`desafios`, `invasao`, `feira`, `herbario` no `js/som.js`).

**Missões:** guiam o jogador de nível em nível (vencer fase X, evoluir uma planta, chegar ao top 20 da arena). Ficam em `data/missoes.json`.

**Pós-nível 50 (fases 10 a 14, detalhadas em "Fases"):** Ascensão, Talentos, Pesadelo, Labirinto das Raízes e Fusão. Guilda com bots fica descartada por ora.

**Para depois:** eventos sazonais, loja de enfeites pra horta.

## Rivais bots

| Bot | Estilo | Comportamento |
| --- | --- | --- |
| Lavínia | Competitiva | Sobe no ranking rápido, te desafia muito |
| Seu Bento | Tranquilo | Joga pouco, time de tanques |
| Kauã | Agressivo | Time só de dano, ganha ou perde feio |
| Duda | Novata | Começa fraca e melhora rápido |
| Rodrigo | Sumido | Aparece raramente (peso 0,25) |

**O que faz parecer gente:** madrugada parada (1h às 7h), mais movimento à noite e no fim de semana; recados no mural ("perdi pra você de novo kkkk", "alguém tem adubo raro?"); sumiços de dias; erros de digitação ocasionais. Textos em `data/mensagens.json`.

## Fases

Cada fase termina com algo jogável no celular, testado antes de seguir.

1. **Fundação:** projeto, tela inicial, PWA instalável, save com exportar/importar, publicado no GitHub Pages.
   - [x] Pronto quando: abre pelo link no celular, instala na tela inicial e o save sobrevive a fechar e abrir.
2. **Batalha:** campo, time contra pragas, turnos, habilidades, números de dano, vitória e derrota, queda de cartas.
   - [x] Pronto quando: dá pra montar um time e vencer ou perder uma batalha de teste.
3. **Evolução:** nível, estrelas, equipamentos, cartas de item, Pacote de Sementes, tela de plantas.
   - [x] Pronto quando: uma planta fica visivelmente mais forte depois de evoluir.
4. **Campanha:** mapas, fases, chefes, estrelas, fôlego, missões.
   - [ ] Pronto quando: o primeiro mapa inteiro dá pra jogar do começo ao chefe.
5. **Arena e bots:** ranking, desafios, defesa offline, mural, recados.
   - [ ] Pronto quando: ao abrir depois de um dia, o ranking mudou e o mural tem novidades críveis.
6. **Capricho:** arte final, sons, animações, balanceamento.
   - [ ] Pronto quando: dá vontade de jogar todo dia.
7. **Atividades rápidas:** Torre das Pragas, Desafio do Dia e Horta de Treino (tela "Desafios").
   - [x] Pronto quando: dá pra subir andares da torre, vencer o desafio do dia uma vez com prêmio e treinar contra pragas escolhidas.
8. **Rotina diária:** Canteiro (plantas que crescem em tempo real e são colhidas), Expedição (plantas fora do time saem em missões de 1h/4h/8h e voltam com cartas) e Calendário de presença (prêmio por dia, 7º dia maior).
   - [x] Pronto quando: ao abrir depois de algumas horas, tem coisa pra colher, expedição pra receber e prêmio do dia.
9. **Eventos e coleção:** Invasão de Chefe (chefe gigante de vários dias com ranking de dano junto com os bots), Feira (troca de materiais e loja que muda todo dia, só com moedas do jogo) e Herbário (álbum de plantas e pragas encontradas, com prêmio por página).
   - [x] Pronto quando: tem um chefe de invasão rolando, a feira mudou de um dia pro outro e o herbário dá prêmio ao completar uma página.

10. **Ascensão:** planta no nível 50 e 5★ pode ascender (rank 1 a 5): volta ao nível 1, mantém estrelas e equipamento, e ganha bônus permanente de atributos (+25% por rank) e o nível máximo sobe 10 por rank. Custa Mudas Repetidas, Fibras e moedas (valores em `data/ascensao.json`). Selo do rank aparece na carta da planta.
   - [x] Pronto quando: uma planta 5★ nível 50 ascende, volta ao nível 1 e, ao treinar de novo, fica mais forte do que antes.
11. **Árvore de talentos:** cada planta ganha 1 ponto a cada 5 níveis (e pontos extras por rank de ascensão). Três ramos: 🌱 Raiz (defesa e vida), 🔥 Tronco (ataque e velocidade), 🌸 Folha (habilidade e status). Cada planta tem nós próprios, então dois cactos podem ficar bem diferentes. Resetar custa 💧 Orvalho. Números em `data/talentos.json`.
   - [x] Pronto quando: dá pra gastar pontos numa planta, ver o efeito na batalha e resetar a árvore.
12. **Pesadelo (mais dificuldade):** os 6 mapas ganham modo Pesadelo (pragas bem mais fortes, com novas habilidades e prêmio melhor, só abre depois das 3 estrelas do mapa). A Torre passa dos 75 andares com chefes novos, e a Invasão ganha nível extra. O nível das pragas passa do 50.
   - [ ] Pronto quando: um time todo 5★ nível 50 perde pelo menos uma vez no Pesadelo 1 e vence com talentos e ascensão.
13. **Labirinto das Raízes (modo novo):** corrida de 8 andares sem salvar o time. Você escolhe 3 plantas da coleção (nível 1 de força, sem equipamentos), e a cada andar escolhe uma porta: batalha, elite, descanso, bênção, recruta ou evento. A vida não volta sozinha. Chefes nos andares 4 e 8. Perdeu, acabou: o prêmio (Sementes do Labirinto) depende do andar. Música própria (`labirinto`). Números em `data/labirinto.json`.
   - [ ] Pronto quando: dá pra fazer uma corrida inteira, ganhar ou perder e receber o prêmio.
14. **Fusão de plantas:** na Estufa de Fusão, duas plantas 5★ de facções diferentes geram uma planta híbrida nova, com habilidade própria (ex.: Cacto + Babosa = Cacto-Babosa, que cura quem apanha). Custa 2 cópias extras, 💧 Orvalho, Pétalas Raras e Seiva Dourada; as duas plantas originais ficam com você. Começa com 6 híbridas, cada uma é um objetivo de colecionador e entra no Herbário. Receitas em `data/fusoes.json`.
   - [ ] Pronto quando: duas plantas 5★ viram uma híbrida jogável, que aparece na coleção e no Herbário.

**Ordem sugerida:** 10 → 11 → 12 (poder e dificuldade juntos) → 13 (modo novo) → 14.

## Regras de trabalho

- Passos pequenos que dão pra abrir no celular e ver funcionando.
- Números e textos do jogo ficam em `data/`, nunca espalhados pelo código.
- Ao terminar uma fase, atualizar este documento marcando o "Pronto quando".
