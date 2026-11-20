# 01 · Visão geral e arquitetura

[← Índice](README.md)

## O que é

Jogo de navegador (PWA) em **HTML, CSS e JavaScript puro, sem build**. Roda no celular, funciona offline e guarda tudo no aparelho (`localStorage`). Sem login, anúncio ou compra com dinheiro real.

## Pastas e arquivos

```
index.html              estrutura de todas as telas (uma <section> por tela)
manifest.webmanifest    dados do app instalável (nome, ícones, cores)
service-worker.js       cache pra funcionar offline + versão do app
css/estilo.css          todo o visual
js/
  main.js               ponto de partida: carrega os dados, liga botões e telas
  estado.js             TODO o estado do jogo; único que mexe no save
  save.js               ler/gravar localStorage, exportar/importar arquivo
  batalha.js            regras da batalha (monta unidades e simula)
  evolucao.js           contas de nível, estrelas, ascensão, talentos, equipamentos
  campanha.js           mapas, fases liberadas, Pesadelo, estrelas
  missoes.js            progresso das missões da Dona Flora
  atividades.js         Torre, Desafio do Dia, Treino, regras de time
  eventos.js            Invasão de Chefe, Feira, Herbário
  labirinto.js          regras do Labirinto das Raízes
  som.js                efeitos e músicas (Web Audio, sem arquivos de áudio)
  ui/                   as telas (veja 10-interface.md)
data/                   números e textos do jogo em .json (veja 12-dados.md)
art/icones/             ícones do app
docs/                   esta wiki
PLANO.md                plano e fases do projeto
CLAUDE.md               regras de trabalho do projeto
```

## Quatro camadas

| Camada | Arquivos | Faz | Não faz |
| --- | --- | --- | --- |
| **Dados** | `data/*.json` | Guarda números, textos, listas | Nenhuma lógica |
| **Regras** | `batalha.js`, `evolucao.js`, `campanha.js`, `missoes.js`, `atividades.js`, `eventos.js`, `labirinto.js` | Só contas e montagem de coisas | Não desenham, **não mexem no save** |
| **Estado** | `estado.js` (+ `save.js`) | Muda o jogo (moedas, cartas, plantas) e salva | Não desenha |
| **Telas** | `js/ui/*.js`, `main.js` | Desenham e recebem toques; chamam o estado | Não alteram o `estado` direto |

Por isso, quando algo "não salvou" ou "ganhou moeda errada", o lugar de olhar é quase sempre `estado.js`.

## O que acontece ao abrir o jogo

1. `index.html` carrega `js/main.js` (módulo ES).
2. `main.js → comecar()` lê os 19 arquivos `data/*.json` em paralelo e monta o objeto **`dados`** (config, plantas, pragas, cartas, campanha, etc.). A campanha passa por `prepararCampanha()`, que marca o mapa/posição de cada fase e cria as fases de Pesadelo.
3. `jogo.iniciar(dados)` (`estado.js`): carrega o save (`save.carregar()`), completa campos que faltam (`completar()`), preenche as missões ativas e liga o salvamento automático (a cada 10 s, ao esconder a aba e ao sair).
4. `main.js` liga botões, som e cada tela (`iniciarTela...(dados, {callbacks})`), registra o service worker e mostra "versão nova" se mudou.
5. Na tela inicial, **Jogar** abre a horta (`tela-base`), chama o calendário de presença (`mostrarPresenca`).

> As telas recebem `dados` e callbacks (como `lutar`, `voltar`, `preparar`) em vez de importar umas às outras. Quem decide pra onde ir é o `main.js`.

## Caminho de uma batalha (visão rápida)

```
Mapa/Desafios → tela-time (monta o time) → main.js:lutar() → tela-batalha:comecarBatalha()
   → batalha.js:prepararBatalha()  (monta unidades)
   → batalha.js:simular()          (calcula TUDO de uma vez, com semente)
   → tela-batalha:tocar()          (anima os eventos calculados)
   → tela-batalha:terminar() → estado.js:registrarBatalha()  (prêmios, XP, progresso)
```

Detalhes em [03 · Batalha](03-batalha.md).

## Regras que valem pra todo o código

(Resumo do [`CLAUDE.md`](../CLAUDE.md))

- Números e textos do jogo ficam em `data/*.json`, **nunca espalhados no código**.
- `estado.js` é o único que mexe no save. Campo novo no save precisa funcionar com save antigo (o `completar()` preenche).
- Efeito novo na batalha precisa de som próprio; modo novo precisa de música própria ([11](11-som-e-musica.md)).
- Arquivo novo entra na lista `ARQUIVOS` do `service-worker.js` ([13](13-pwa-e-publicacao.md)).
- Nomes e arte originais. Sem Plants vs. Zombies/PopCap/EA/Youkia. Os inimigos são **pragas**, não zumbis.
- Cada mudança que vai pra `main` sobe a versão em dois lugares ([13](13-pwa-e-publicacao.md)).

## Padrão de retorno das ações

Quase toda função de ação do `estado.js` devolve:

- `{ ok: true, ... }` — deu certo, com dados extras do que aconteceu;
- `{ ok: false, erro: 'chave' }` — falhou; `chave` é um texto em `data/mensagens.json` (ex.: `semMoedas`, `semMaterial`, `nivelMaximo`). A tela mostra esse texto.
