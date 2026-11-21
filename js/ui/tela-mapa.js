// Mapa da campanha: abas dos mapas, caminho de fases e painel da fase escolhida.

import { arte } from '../arte.js';
import { $, mostrarTela, avisar, preencher } from './comum.js';
import * as jogo from '../estado.js';
import * as som from '../som.js';
import { rolarCartas } from '../batalha.js';
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
  desenharTonico(fase);
  $('fase-painel').classList.remove('escondido');
}

// ---------- Seu Tonico: joga a fase várias vezes por você ----------

function desenharTonico(fase) {
  const cfg = dados.rotina.tonico;
  const tx = dados.textos.tonico;
  const caixa = document.createElement('div');
  caixa.className = 'tonico';
  if (!jogo.tonicoLiberado(fase)) {
    caixa.classList.add('bloqueado');
    caixa.innerHTML = `<span class="tonico-rosto">${cfg.emoji}</span><small>${preencher(tx.precisa3, { nome: cfg.nome })}</small>`;
    $('fase-conteudo').appendChild(caixa);
    return;
  }
  const fala = tx.falas[Math.floor(Math.random() * tx.falas.length)];
  const botoes = cfg.vezes.map((v) => {
    const p = jogo.previaTonico(fase, v);
    const pode = p.feitas >= v;
    return `<button class="btn tonico-vezes${pode ? ' btn-laranja' : ' apagado'}" data-vezes="${v}">${v}×<small>⚡${fase.folego * v}</small>${
      pode && p.encheu ? `<small class="tonico-enche">${tx.nivelEnche}</small>` : ''}</button>`;
  }).join('');
  caixa.innerHTML = `<div class="tonico-topo"><span class="tonico-rosto">${cfg.emoji}</span>
      <span class="escolha-info"><b>${cfg.nome}</b><small>“${fala}”</small></span></div>
    <div class="tonico-botoes">${botoes}</div>`;
  $('fase-conteudo').appendChild(caixa);
  caixa.querySelectorAll('[data-vezes]').forEach((b) => b.addEventListener('click', () => {
    const vezes = Number(b.dataset.vezes);
    const r = jogo.mandarTonico(fase, vezes, (f) => rolarCartas(f, Math.random));
    if (!r.ok) return avisar(preencher(tx[r.erro], { vezes, nome: cfg.nome }));
    mostrarResultadoTonico(fase, r);
  }));
}

function mostrarResultadoTonico(fase, r) {
  const cfg = dados.rotina.tonico;
  const tx = dados.textos.tonico;
  const partes = [`🪙 +${r.moedas}`];
  if (r.orvalho) partes.push(`💧 +${r.orvalho}`);
  partes.push(`✨ ${r.xp} XP`);
  const subiram = Object.keys(r.subiram).map((id) => arte(dados.plantas.find((p) => p.id === id))).join('');
  $('fase-conteudo').innerHTML = `
    <button id="fase-fechar" class="fechar" aria-label="Fechar">✖</button>
    <div class="tonico-rosto grande">${cfg.emoji}</div>
    <h3>${preencher(tx.voltou, { nome: cfg.nome, n: r.feitas })}</h3>
    <p class="rotina-premio">${partes.join(' · ')}</p>
    <div id="tonico-cartas" class="cartas"></div>
    ${subiram ? `<p>${preencher(dados.textos.rotina.subiramNivel, { plantas: subiram })}</p>` : ''}
    ${r.subiuJogador ? `<p><b>${preencher(tx.subiuJogador, { nivel: jogo.estado.nivel })}</b></p>` : ''}
    <button id="tonico-ok" class="btn btn-grande btn-laranja">${tx.valeu}</button>`;
  const area = $('tonico-cartas');
  r.cartas.forEach((id, i) => {
    const c = dados.cartas.find((x) => x.id === id);
    if (!c) return;
    const div = document.createElement('div');
    div.className = `carta ${c.raridade}`;
    div.style.animationDelay = `${0.2 + i * 0.1}s`;
    div.innerHTML = `<span>${c.emoji}</span><small>${c.nome}</small>`;
    area.appendChild(div);
  });
  $('tonico-ok').addEventListener('click', () => abrirPainel(fase));
  som.tocarSom('tonico');
  if (r.subiuJogador) som.tocarSom('nivel');
}
