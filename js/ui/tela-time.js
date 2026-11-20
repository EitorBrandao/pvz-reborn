// Tela de preparar batalha: ver a fase escolhida e montar o time.

import { $, mostrarTela, avisar, preencher } from './comum.js';
import * as jogo from '../estado.js';
import { atributos } from '../evolucao.js';
import { bonusFaccoes } from '../batalha.js';

let dados;
let faseEscolhida = null;
let espacoEscolhido = null; // { col, linha } quando o jogador toca num espaço vazio

export function iniciarTelaTime(d, { lutar, voltar }) {
  dados = d;
  $('time-voltar').addEventListener('click', () => voltar(faseEscolhida));
  $('btn-lutar').addEventListener('click', () => {
    if (!jogo.estado.time.length) return avisar(dados.textos.timeVazio);
    lutar(faseEscolhida);
  });
}

export function abrirTelaTime(fase) {
  if (fase) faseEscolhida = fase;
  espacoEscolhido = null;
  desenhar();
  mostrarTela('tela-time');
}

function desenhar() {
  desenharFase();
  desenharGrade();
  desenharPlantas();
  desenharBonus();
  const proxima = faseEscolhida.timeMax ? null : jogo.proximaVaga();
  $('time-contagem').textContent = `${jogo.estado.time.length}/${tamanhoMax()}`
    + (proxima ? ` ${preencher(dados.textos.proximaVaga, { nivel: proxima })}` : '');
  $('btn-lutar').textContent = faseEscolhida.folego ? `Lutar! ⚡${faseEscolhida.folego}` : 'Lutar!';
}

// Limite de plantas: vagas liberadas pelo nível, ou menos se a batalha tiver regra própria (ex.: Desafio "Time de três")
function tamanhoMax() {
  return Math.min(faseEscolhida.timeMax || Infinity, jogo.vagasTime());
}

// Linha de cima do resumo: mapa e fase na campanha, nome da atividade fora dela
function rotuloFase(f) {
  if (f.tipo) return dados.textos.rotuloAtividade[f.tipo] + (f.chefe ? ' · CHEFE' : '');
  const mapa = dados.campanha.mapas[f.mapaIndice];
  return `${mapa.emoji} ${mapa.nome} · Fase ${f.indice + 1}${f.chefe ? ' · CHEFE' : ''}`;
}

function desenharFase() {
  const f = faseEscolhida;
  const inimigos = f.inimigos.map((i) => dados.pragas.find((p) => p.id === i.praga)?.emoji || '?').join('');
  const cats = [...new Set(f.inimigos.map((i) => dados.pragas.find((p) => p.id === i.praga)?.categoria))]
    .map((id) => dados.faccoes.categorias.find((c) => c.id === id)).filter(Boolean)
    .map((c) => `${c.emoji} ${c.nome}`).join(' · ');
  $('time-fase').innerHTML = `
    <small>${rotuloFase(f)}</small>
    <b>${f.nome}</b>
    <span class="inimigos">${inimigos} <small>Nv ${f.nivel}</small></span>
    <small class="categorias">${cats}</small>
    ${f.regra ? `<small class="regra-desafio">📜 ${f.regra.texto}</small>` : ''}`;
}

function desenharBonus() {
  const t = dados.textos;
  const lista = bonusFaccoes(jogo.estado.time, dados);
  $('time-bonus').innerHTML = lista.length
    ? lista.map(({ faccao: f, qtd, bonus }) => `<span class="selo-bonus">${preencher(t.bonusTime, {
      emoji: f.emoji, nome: f.nome, qtd, pct: Math.round(bonus * 100), atributo: t.atributos[f.atributo],
    })}</span>`).join('')
    : `<small>${t.bonusTimeVazio}</small>`;
}

function desenharGrade() {
  const grade = $('grade-time');
  grade.innerHTML = '';
  for (let linha = 0; linha < 3; linha++) {
    for (const col of [1, 0]) { // fundo à esquerda, frente à direita (perto das pragas)
      const membro = jogo.estado.time.find((m) => m.col === col && m.linha === linha);
      const planta = membro && dados.plantas.find((p) => p.id === membro.planta);
      const espaco = document.createElement('button');
      const marcado = espacoEscolhido && espacoEscolhido.col === col && espacoEscolhido.linha === linha;
      espaco.className = 'espaco' + (planta ? ' cheio' : '') + (marcado ? ' marcado' : '');
      espaco.textContent = planta ? planta.emoji : (marcado ? '➕' : '');
      espaco.addEventListener('click', () => {
        if (planta) {
          jogo.definirTime(jogo.estado.time.filter((m) => m !== membro));
        } else {
          espacoEscolhido = marcado ? null : { col, linha };
        }
        desenhar();
      });
      grade.appendChild(espaco);
    }
  }
}

function primeiroEspacoLivre() {
  for (const col of [0, 1]) {
    for (const linha of [1, 0, 2]) {
      if (!jogo.estado.time.some((m) => m.col === col && m.linha === linha)) return { col, linha };
    }
  }
  return null;
}

function desenharPlantas() {
  const lista = $('lista-plantas');
  lista.innerHTML = '';
  const max = tamanhoMax();
  for (const p of dados.plantas.filter((x) => jogo.estado.colecao[x.id])) {
    const registro = jogo.estado.colecao[p.id];
    const s = atributos(p, registro, dados);
    const noTime = jogo.estado.time.find((m) => m.planta === p.id);
    const cartao = document.createElement('button');
    const fora = faseEscolhida.faccao && p.faccao !== faseEscolhida.faccao;
    cartao.className = 'cartao-planta' + (noTime ? ' no-time' : '') + (fora ? ' fora-regra' : '');
    cartao.innerHTML = `
      <span class="planta-emoji">${p.emoji}</span>
      <b>${p.nome}</b>
      <small>${dados.faccoes.faccoes.find((f) => f.id === p.faccao)?.emoji || ''} Nv ${registro.nivel} · ${'⭐'.repeat(registro.estrelas)}</small>
      <span class="atributos">❤️${s.vida} ⚔️${s.atq} 🛡️${s.def} 💨${s.vel}</span>`;
    cartao.addEventListener('click', () => {
      const time = jogo.estado.time;
      if (noTime) {
        jogo.definirTime(time.filter((m) => m !== noTime));
      } else if (time.length >= max) {
        const nivel = faseEscolhida.timeMax ? null : jogo.proximaVaga();
        return avisar(preencher(nivel ? dados.textos.timeCheioProxima : dados.textos.timeCheio, { max, nivel }));
      } else {
        const lugar = espacoEscolhido || primeiroEspacoLivre();
        jogo.definirTime([...time, { planta: p.id, ...lugar }]);
        espacoEscolhido = null;
      }
      desenhar();
    });
    lista.appendChild(cartao);
  }
}
