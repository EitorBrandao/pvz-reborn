# 07 · Rotina diária da horta

[← Índice](README.md) · Arquivos: `js/estado.js` (regras), `js/ui/painel-rotina.js` (telas), `main.js` (broto, fôlego) · Dados: `rotina.json`, `config.json` (`broto`, `folego`)

Tudo usa a **hora do relógio** (`Date.now()`), então continua andando com o jogo fechado.

## Broto

Na horta, tocar no broto chama `regarBroto()`: soma 1 em `broto.regas`, conta `regarBroto` e, a cada `regasPorEstagio` (5) regas, paga `moedasPorEstagio` (25). O emoji muda entre 🌱🌿🪴🌻 (`estagioBroto`).

## Fôlego

- Máximo 30 (`folego.max`); volta **1 ponto a cada 4 minutos** (`minutosPorPonto`), inclusive offline.
- `folego()` recalcula na hora (usa `estado.folego = {valor, desde}`) e devolve `{valor, max, falta}`.
- `gastarFolego(n)` é chamado por `main.js → lutar()` antes das fases da campanha.
- `recarregarFolego()` enche o fôlego por 💧 `recargaOrvalho` (3).
- Subir de nível do jogador também enche o fôlego.
- Só a **campanha** gasta fôlego (atividades, invasão e labirinto têm `folego: 0`).

## Canteiro (3 vasos)

`rotina.canteiro.mudas[]`: cenoura (5 min), tomate (30 min), morango (2 h), abóbora (8 h)…, cada uma com `custo`, `moedas` de retorno, `nivelMin` do jogador e `cartas` (chance).

- `plantarMuda(vaso, idMuda)`: confere nível mínimo e moedas, guarda `{muda, desde}`.
- `vasoInfo(i)`: `{vazio}` ou `{muda, pronto, falta, progresso}`.
- `colherVaso(i)`: se pronto, paga moedas e sorteia cartas.

## Expedição

`rotina.expedicao.destinos[]` (1 h, 4 h, 8 h). Só **uma** expedição por vez, até `maxPlantas` plantas **fora do time**.

- `previaExpedicao(destino, plantas)`: moedas = por planta + por nível; XP idem; **cada estrela acima de 1** encurta a viagem em `reducaoPorEstrela` (5%), até `reducaoMax` (30%).
- `enviarExpedicao`, `expedicaoInfo`, `receberExpedicao`. Estrelas também aumentam a chance de cartas (`bonusCartaPorEstrela`).
- Planta em viagem não pode entrar no time nem no Labirinto (`emExpedicao`).

## Calendário de presença

`rotina.presenca.premios[]` (7 prêmios; o 7º é o maior). `presencaPendente()` diz se já pegou hoje; `resgatarPresenca()` paga e soma `presenca.dias`. Não precisa ser em dias seguidos; depois do 7º recomeça. A janela abre sozinha em `main.js` ao clicar **Jogar** (`mostrarPresenca`).

## Tela

`painel-rotina.js` desenha os vasos, o botão de expedição e as janelas (`abrirJanela`/`fechar`), formatando tempos (`formatar`, `formatarDuracao`). `desenharRotina()` é chamado em `atualizarTela()` do `main.js`.
