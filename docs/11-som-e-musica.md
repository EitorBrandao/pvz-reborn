# 11 · Som e música

[← Índice](README.md) · Arquivos: `js/som.js` · Dados: `config.json` → `som`

Tudo é gerado na hora pelo navegador (**Web Audio**): não existe arquivo de áudio. O navegador só libera som depois do **primeiro toque** (`som.acordar()`, ligado em `main.js → ligarSom`).

## Estrutura de `som.js`

| Parte | O que é |
| --- | --- |
| `nota()` / `chiado()` | Blocos básicos (tom e ruído) |
| `SONS` | Mapa `nome → função` com cada efeito |
| `tocarSom(nome)` | Toca um efeito (com limite de repetição por `INTERVALO`) |
| `tocarStatus(nome, rodada)` | Som de status: `status_<nome>` ao pegar, `tick_<nome>` a cada rodada |
| `MUSICAS` | Músicas: `passo`, `baixo` e `melodia` (listas de notas) |
| `tocarMusica`, `pararMusica`, `musicaDaTela` | Controle das músicas |
| `configurarSom`, `ligarSom` | Volume e liga/desliga (botão 🔊/🔇, `estado.somLigado`) |

## Efeitos de status

`SONS` tem `status_veneno`, `status_queimadura`, `status_regeneracao`, `status_fraqueza`, `status_casca`, `status_outro` (genérico) e `tick_veneno`, `tick_queimadura`, `tick_regeneracao`. Status sem som próprio cai em `status_outro` (ao pegar) ou `golpe` (tick). **Regra do projeto:** todo status/efeito novo ganha som próprio.

## Músicas

Existentes: `horta`, `batalha`, `desafios`, `invasao`, `feira`, `labirinto`, `pesadelo`, `herbario`.

Qual toca onde: `data/config.json → som.musicaPorTela` liga o **id da tela** à música (tela sem entrada toca `musicaPadrao`, a da horta):

```json
"musicaPorTela": { "tela-batalha": "batalha", "tela-atividades": "desafios",
  "tela-treino": "desafios", "tela-invasao": "invasao", "tela-feira": "feira",
  "tela-herbario": "herbario", "tela-labirinto": "labirinto" }
```

Quem chama: `mostrarTela()` (em `ui/comum.js`) toca `som.musicaDaTela(id)`. Em batalha, `tela-batalha.js` toca `batalha.musica` (ex.: `invasao`) ou, se a batalha não define, `batalha`. A música `pesadelo` toca no **mapa** quando o modo Pesadelo está aberto (`tela-mapa.js → musicaDoModo`); a `horta` toca no mapa normal.

> **Regra do projeto:** todo modo novo precisa de música própria, diferente das outras.
