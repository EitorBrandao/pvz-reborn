// Mapa da campanha: abas dos mapas, caminho de fases e painel da fase escolhida.

import { arte } from '../arte.js';
import { $, mostrarTela, avisar, preencher } from './comum.js';
import * as jogo from '../estado.js';
import * as som from '../som.js';
import { mapaLiberado, faseLiberada, concluida, faseAtual, pesadeloLiberado } from '../campanha.js';

let dados;
let aoPreparar;
let mapaAberto = 0;
let modoPesadelo = false;

export function iniciarTelaMapa(d, { voltar, preparar }) {
  dados = d;
  aoPreparar = preparar;
  $('mapa-voltar').addEventListener('click', voltar);
  $('fase-painel').addEventListener('click', (e) => {
    if (e.target.id === 'fase-painel' || e.target.closest('#fase-fechar')) $('fase-painel').classList.add('escondido');
  });
  window.addEventListener('resize', () => { if ($('tela-mapa').classList.contains('ativa')) desenharTrilha(); });
}

export function abrirTelaMapa(indiceMapa, pesadelo = false) {
  modoPesadelo = pesadelo;
  if (indiceMapa !== undefined) mapaAberto = indiceMapa;
  else {
    // abre no último mapa liberado
    const c = dados.campanha;
    mapaAberto = 0;
    c.mapas.forEach((_, i) => { if (mapaLiberado(c, jogo.estado, i)) mapaAberto = i; });
  }
  $('fase-painel').classList.add('escondido');
  mostrarTela('tela-mapa');
  desenhar();
}

function musicaDoModo() {
  som.tocarMusica(modoPesadelo ? 'pesadelo' : 'horta');
}

function estrelas(n) {
  return '⭐'.repeat(n) + '☆'.repeat(3 - n);
}

function emojiPraga(id) {
  return arte(dados.pragas.find((p) => p.id === id)) || '?';
}

function desenhar() {
  const c = dados.campanha;
  const mapa = c.mapas[mapaAberto];
  const cfgP = dados.pesadelo;
  const abertoP = pesadeloLiberado(c, jogo.estado, mapaAberto, cfgP);
  if (modoPesadelo && !abertoP) modoPesadelo = false;
  const fases = modoPesadelo ? mapa.pesadelo.fases : mapa.fases;
  $('tela-mapa').classList.toggle('modo-pesadelo', modoPesadelo);
  $('mapa-titulo').textContent = `${mapa.emoji} ${mapa.nome}${modoPesadelo ? ' 😈' : ''}`;
  musicaDoModo();

  // Normal / Pesadelo
  const modo = $('mapa-modo');
  modo.innerHTML = `<button class="aba${modoPesadelo ? '' : ' ativa'}" data-p="0">Normal</button>
    <button class="aba${modoPesadelo ? ' ativa' : ''}${abertoP ? '' : ' bloqueada'}" data-p="1">${abertoP ? '😈' : '🔒'} Pesadelo</button>`;
  modo.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.p === '1' && !abertoP) return avisar(dados.textos.pesadeloBloqueado);
    modoPesadelo = b.dataset.p === '1';
    desenhar();
  }));

  // Abas
  const abas = $('mapa-abas');
  abas.innerHTML = '';
  c.mapas.forEach((m, i) => {
    const liberado = mapaLiberado(c, jogo.estado, i);
    const aba = document.createElement('button');
    aba.className = 'aba' + (i === mapaAberto ? ' ativa' : '') + (liberado ? '' : ' bloqueada');
    aba.textContent = `${liberado ? m.emoji : '🔒'} ${m.nome}`;
    aba.addEventListener('click', () => {
      if (!liberado) return avisar(preencher(dados.textos.mapaBloqueado, { mapa: c.mapas[i - 1].nome }));
      mapaAberto = i;
      modoPesadelo = false;
      desenhar();
    });
    abas.appendChild(aba);
  });

  // Fases
  const trilha = $('mapa-trilha');
  trilha.style.setProperty('--cor-mapa', mapa.cor);
  trilha.querySelectorAll('.no-linha').forEach((n) => n.remove());
  const atual = faseAtual(c, jogo.estado, mapaAberto, modoPesadelo);
  const deslocamentos = [50, 25, 50, 75];
  fases.forEach((fase, i) => {
    const liberada = faseLiberada(c, jogo.estado, fase);
    const feita = concluida(jogo.estado, fase.id);
    const linha = document.createElement('div');
    linha.className = 'no-linha';
    linha.style.setProperty('--x', `${deslocamentos[i % deslocamentos.length]}%`);
    const no = document.createElement('button');
    no.className = 'no-fase' + (fase.chefe ? ' chefe' : '') + (feita ? ' feita' : '')
      + (!liberada ? ' bloqueada' : '') + (fase === atual && liberada && !feita ? ' atual' : '');
    const rosto = fase.chefe ? emojiPraga(fase.inimigos[0].praga) : `${i + 1}`;
    no.innerHTML = `<span class="no-rosto">${liberada ? rosto : '🔒'}</span>
      <span class="no-estrelas">${feita ? estrelas(jogo.estado.estrelasFases[fase.id] || 1) : ''}</span>`;
    no.addEventListener('click', () => {
      if (!liberada) return avisar(dados.textos.faseBloqueada);
      abrirPainel(fase);
    });
    linha.appendChild(no);
    trilha.appendChild(linha);
  });

  requestAnimationFrame(() => {
    desenharTrilha();
    const noAtual = trilha.querySelector('.no-fase.atual');
    if (noAtual) noAtual.scrollIntoView({ block: 'center' });
  });
}

// Linha tracejada ligando as fases
function desenharTrilha() {
  const trilha = $('mapa-trilha');
  const svg = $('mapa-svg');
  const caixa = trilha.getBoundingClientRect();
  const pontos = [...trilha.querySelectorAll('.no-fase')].map((n) => {
    const r = n.getBoundingClientRect();
    return `${r.left - caixa.left + r.width / 2},${r.top - caixa.top + r.height / 2}`;
  });
  svg.setAttribute('width', caixa.width);
  svg.setAttribute('height', trilha.scrollHeight);
  svg.innerHTML = `<polyline points="${pontos.join(' ')}" />`;
}

function abrirPainel(fase) {
  const r = fase.recompensa;
  const inimigos = fase.inimigos.map((i) => emojiPraga(i.praga)).join(' ');
  const cartas = fase.cartas
    .map((c) => dados.cartas.find((x) => x.id === c.carta))
    .filter(Boolean)
    .map((c) => `<span class="mini-carta ${c.raridade}" title="${c.nome}">${c.emoji}</span>`)
    .join('');
  const melhor = jogo.estado.estrelasFases[fase.id] || 0;
  const mapa = dados.campanha.mapas[fase.mapaIndice];

  $('fase-conteudo').innerHTML = `
    <button id="fase-fechar" class="fechar" aria-label="Fechar">✖</button>
    <p class="fase-numero">${mapa.nome}${fase.pesadelo ? ' 😈 Pesadelo' : ''} · Fase ${fase.indice + 1}${fase.chefe ? ' · CHEFE' : ''}</p>
    <h3>${fase.nome}</h3>
    ${fase.pesadelo ? `<p class="dica-pequena">${dados.textos.pesadeloAviso}</p>` : ''}
    <div class="fase-estrelas">${estrelas(melhor)}</div>
    <div class="bloco"><b>Inimigos</b> <small>(Nv ${fase.nivel})</small><div class="fase-inimigos">${inimigos}</div></div>
    <div class="bloco"><b>Prêmios</b>
      <p>🪙 ${r.moedas} · ✨ ${r.xp} XP${r.orvalho ? ` · 💧 ${r.orvalho}` : ''}</p>
      <div class="fase-cartas">${cartas}</div>
    </div>
    <p class="dica-pequena">3 estrelas: vencer sem perder nenhuma planta.</p>
    <button id="fase-preparar" class="btn btn-grande btn-laranja">Preparar time · ⚡${fase.folego}</button>`;
  $('fase-preparar').addEventListener('click', () => {
    $('fase-painel').classList.add('escondido');
    aoPreparar(fase);
  });
  $('fase-painel').classList.remove('escondido');
}
