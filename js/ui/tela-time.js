// Tela de preparar batalha: escolher a batalha e montar o time.

import { $, mostrarTela, avisar, preencher } from './comum.js';
import * as jogo from '../estado.js';

let dados;
let batalhaEscolhida = null;
let espacoEscolhido = null; // { col, linha } quando o jogador toca num espaço vazio

export function iniciarTelaTime(d, { lutar, voltar }) {
  dados = d;
  $('time-voltar').addEventListener('click', voltar);
  $('btn-lutar').addEventListener('click', () => {
    if (!jogo.estado.time.length) return avisar(dados.textos.timeVazio);
    lutar(batalhaEscolhida);
  });
}

export function abrirTelaTime() {
  if (!batalhaEscolhida) batalhaEscolhida = dados.batalhas[0];
  espacoEscolhido = null;
  desenhar();
  mostrarTela('tela-time');
}

function desenhar() {
  desenharBatalhas();
  desenharGrade();
  desenharPlantas();
  $('time-contagem').textContent = `${jogo.estado.time.length}/${dados.config.batalha.tamanhoTime}`;
}

function desenharBatalhas() {
  const lista = $('lista-batalhas');
  lista.innerHTML = '';
  for (const b of dados.batalhas) {
    const botao = document.createElement('button');
    botao.className = 'cartao-batalha' + (b === batalhaEscolhida ? ' escolhida' : '');
    const inimigos = b.inimigos.map((i) => dados.pragas.find((p) => p.id === i.praga)?.emoji || '?').join('');
    const vencida = jogo.estado.vencidas.includes(b.id) ? ' ✅' : '';
    botao.innerHTML = `
      <b>${b.nome}${vencida}</b>
      <span class="estrelas">${'⭐'.repeat(b.dificuldade)}</span>
      <span class="inimigos">${inimigos}</span>`;
    botao.addEventListener('click', () => { batalhaEscolhida = b; desenhar(); });
    lista.appendChild(botao);
  }
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
  const max = dados.config.batalha.tamanhoTime;
  for (const p of dados.plantas) {
    const noTime = jogo.estado.time.find((m) => m.planta === p.id);
    const cartao = document.createElement('button');
    cartao.className = 'cartao-planta' + (noTime ? ' no-time' : '');
    cartao.innerHTML = `
      <span class="planta-emoji">${p.emoji}</span>
      <b>${p.nome}</b>
      <small>${p.funcao}</small>
      <span class="atributos">❤️${p.vida} ⚔️${p.atq} 🛡️${p.def} 💨${p.vel}</span>`;
    cartao.addEventListener('click', () => {
      const time = jogo.estado.time;
      if (noTime) {
        jogo.definirTime(time.filter((m) => m !== noTime));
      } else if (time.length >= max) {
        return avisar(preencher(dados.textos.timeCheio, { max }));
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
