// Tela "Desafios": Torre das Pragas, Desafio do Dia e Horta de Treino.

import { $, mostrarTela, avisar, preencher } from './comum.js';
import * as jogo from '../estado.js';
import { gerarAndar, desafioDoDia, batalhaTreino, pragasConhecidas } from '../atividades.js';

let dados;
let aoPreparar;
let treino = { inimigos: [], nivel: 1 };

export function iniciarTelaAtividades(d, { voltar, preparar }) {
  dados = d;
  aoPreparar = preparar;
  $('atividades-voltar').addEventListener('click', voltar);
  $('treino-voltar').addEventListener('click', abrirTelaAtividades);
  $('treino-menos').addEventListener('click', () => mudarNivel(-1));
  $('treino-mais').addEventListener('click', () => mudarNivel(1));
  $('treino-menos5').addEventListener('click', () => mudarNivel(-5));
  $('treino-mais5').addEventListener('click', () => mudarNivel(5));
  $('treino-preparar').addEventListener('click', () => {
    if (!treino.inimigos.length) return avisar(dados.textos.treinoSemInimigos);
    aoPreparar(batalhaTreino(treino.inimigos, treino.nivel));
  });
}

export function abrirTelaAtividades() {
  desenhar();
  mostrarTela('tela-atividades');
}

const emojiPraga = (id) => dados.pragas.find((p) => p.id === id)?.emoji || '?';
const emojis = (batalha) => batalha.inimigos.map((i) => emojiPraga(i.praga)).join('');

function textoPremio(r) {
  const partes = [`🪙 ${r.moedas}`, `✨ ${r.xp} XP`];
  if (r.orvalho) partes.push(`💧 ${r.orvalho}`);
  return partes.join(' · ');
}

function cartao({ emoji, titulo, linhas, botao, cor, acao }) {
  const div = document.createElement('div');
  div.className = 'cartao-atividade';
  div.innerHTML = `
    <div class="atividade-emoji">${emoji}</div>
    <div class="atividade-info">
      <b>${titulo}</b>
      ${linhas.map((l) => `<small>${l}</small>`).join('')}
    </div>
    <button class="btn btn-peq ${cor}">${botao}</button>`;
  div.querySelector('button').addEventListener('click', acao);
  return div;
}

function desenhar() {
  const t = dados.textos.atividades;
  const lista = $('atividades-lista');
  lista.innerHTML = '';

  // Torre
  const torre = jogo.estado.torre;
  const andar = gerarAndar(torre.andar, dados);
  lista.appendChild(cartao({
    emoji: '🗼',
    titulo: t.torreTitulo,
    linhas: [
      preencher(t.torreAndar, { andar: torre.andar, melhor: torre.melhor }),
      `${emojis(andar)} <span class="nv">Nv ${andar.nivel}</span>${andar.chefe ? ' · CHEFE' : ''}`,
      textoPremio(andar.recompensa),
    ],
    botao: t.torreBotao,
    cor: 'btn-laranja',
    acao: () => aoPreparar(gerarAndar(jogo.estado.torre.andar, dados)),
  }));

  // Desafio do Dia
  const desafio = desafioDoDia(dados, jogo.estado);
  lista.appendChild(cartao({
    emoji: '📅',
    titulo: t.desafioTitulo,
    linhas: [
      `<b class="regra-desafio">📜 ${desafio.regra.nome}</b>`,
      desafio.regra.texto,
      `${emojis(desafio)} <span class="nv">Nv ${desafio.nivel}</span>`,
      desafio.feito ? t.desafioFeito : textoPremio(desafio.recompensa),
    ],
    botao: desafio.feito ? t.desafioBotaoFeito : t.desafioBotao,
    cor: desafio.feito ? 'btn-azul' : 'btn-laranja',
    acao: () => aoPreparar(desafioDoDia(dados, jogo.estado)),
  }));

  // Treino
  lista.appendChild(cartao({
    emoji: '🎯',
    titulo: t.treinoTitulo,
    linhas: [t.treinoTexto],
    botao: t.treinoBotao,
    cor: 'btn-verde',
    acao: abrirTreino,
  }));
}

// ---------- Horta de Treino ----------

function abrirTreino() {
  if (!treino.inimigos.length) treino.nivel = maiorNivel();
  desenharTreino();
  mostrarTela('tela-treino');
}

function maiorNivel() {
  return Math.max(1, ...Object.values(jogo.estado.colecao).map((r) => r.nivel));
}

function mudarNivel(n) {
  treino.nivel = Math.max(1, Math.min(dados.atividades.treino.nivelMax, treino.nivel + n));
  desenharTreino();
}

function desenharTreino() {
  const max = dados.atividades.treino.maxInimigos;
  $('treino-nivel').textContent = `Nv ${treino.nivel}`;
  $('treino-contagem').textContent = `${treino.inimigos.length}/${max}`;

  const escolhidos = $('treino-escolhidos');
  escolhidos.innerHTML = '';
  for (let i = 0; i < max; i++) {
    const id = treino.inimigos[i];
    const espaco = document.createElement('button');
    espaco.className = 'espaco' + (id ? ' cheio' : '');
    espaco.textContent = id ? emojiPraga(id) : '';
    if (id) {
      espaco.addEventListener('click', () => {
        treino.inimigos.splice(i, 1);
        desenharTreino();
      });
    }
    escolhidos.appendChild(espaco);
  }

  const lista = $('treino-pragas');
  lista.innerHTML = '';
  for (const p of pragasConhecidas(dados, jogo.estado)) {
    const botao = document.createElement('button');
    botao.className = 'cartao-planta' + (p.chefe ? ' chefe' : '');
    botao.innerHTML = `<span class="planta-emoji">${p.emoji}</span><b>${p.nome}</b>${p.chefe ? '<small>CHEFE</small>' : ''}`;
    botao.addEventListener('click', () => {
      if (treino.inimigos.length >= max) return avisar(preencher(dados.textos.treinoCheio, { max }));
      treino.inimigos.push(p.id);
      desenharTreino();
    });
    lista.appendChild(botao);
  }
}
