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
| Arte provisória | Formas desenhadas no Canvas e emojis | Destrava o jogo antes da arte final |

**Estrutura de pastas:**

```
pvz-reborn/
  index.html
  manifest.webmanifest
  service-worker.js
  css/         (estilo.css)
  js/          (main.js, estado.js, save.js, batalha.js, evolucao.js, campanha.js, arena.js, bots.js, ui/)
  data/        (plantas.json, pragas.json, cartas.json, fases.json, bots.json, mensagens.json, missoes.json)
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
- **Estrelas (1 a 5):** juntar cópias da mesma semente aumenta as estrelas e o nível máximo.
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

**Missões:** guiam o jogador de nível em nível (vencer fase X, evoluir uma planta, chegar ao top 20 da arena). Ficam em `data/missoes.json`.

**Para depois:** guilda com bots, eventos sazonais, sons e música, fusão de plantas raras.

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
   - [ ] Pronto quando: abre pelo link no celular, instala na tela inicial e o save sobrevive a fechar e abrir.
2. **Batalha:** campo, time contra pragas, turnos, habilidades, números de dano, vitória e derrota, queda de cartas.
   - [ ] Pronto quando: dá pra montar um time e vencer ou perder uma batalha de teste.
3. **Evolução:** nível, estrelas, equipamentos, cartas de item, Pacote de Sementes, tela de plantas.
   - [ ] Pronto quando: uma planta fica visivelmente mais forte depois de evoluir.
4. **Campanha:** mapas, fases, chefes, estrelas, fôlego, missões.
   - [ ] Pronto quando: o primeiro mapa inteiro dá pra jogar do começo ao chefe.
5. **Arena e bots:** ranking, desafios, defesa offline, mural, recados.
   - [ ] Pronto quando: ao abrir depois de um dia, o ranking mudou e o mural tem novidades críveis.
6. **Capricho:** arte final, sons, animações, balanceamento.
   - [ ] Pronto quando: dá vontade de jogar todo dia.

## Regras de trabalho

- Passos pequenos que dão pra abrir no celular e ver funcionando.
- Números e textos do jogo ficam em `data/`, nunca espalhados pelo código.
- Ao terminar uma fase, atualizar este documento marcando o "Pronto quando".
