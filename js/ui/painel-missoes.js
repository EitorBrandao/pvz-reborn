// Ícones de missão na lateral da tela da horta e a ficha da missão.

import { $, avisar, preencher } from './comum.js';
import * as jogo from '../estado.js';
import { progressoTarefa, resumoProgresso } from '../missoes.js';

let dados;
let aoMudar;
let aberta = null;

export function iniciarMissoes(d, mudou) {
  dados = d;
  aoMudar = mudou;
  $('missao-ficha').addEventListener('click', (e) => {
    if (e.target.id === 'missao-ficha' || e.target.closest('#missao-fechar')) fechar();
  });
}

export function desenharMissoes() {
  const lado = $('missoes-lado');
  lado.innerHTML = '';
  for (const { ativa, missao, completa } of jogo.missoesAtivas()) {
    const botao = document.createElement('button');
    botao.className = 'missao-icone' + (completa ? ' completa' : '') + (ativa.nova ? ' nova' : '');
    botao.innerHTML = `<span>${missao.icone}</span><small>${completa ? '✔' : resumoProgresso(jogo.estado, ativa, missao)}</small>`;
    botao.setAttribute('aria-label', missao.titulo);
    botao.addEventListener('click', () => abrir(missao.id));
    lado.appendChild(botao);
  }
}

function premioTexto(p) {
  const partes = [];
  if (p.moedas) partes.push(`🪙 ${p.moedas}`);
  if (p.orvalho) partes.push(`💧 ${p.orvalho}`);
  if (p.xp) partes.push(`✨ ${p.xp} XP`);
  for (const [id, qtd] of Object.entries(p.cartas || {})) {
    const c = dados.cartas.find((x) => x.id === id);
    if (c) partes.push(`${c.emoji} ${qtd}`);
  }
  return partes.map((x) => `<span class="premio">${x}</span>`).join('');
}

function abrir(id) {
  aberta = id;
  jogo.marcarMissaoVista(id);
  const item = jogo.missoesAtivas().find((x) => x.missao.id === id);
  if (!item) return fechar();
  const { ativa, missao, completa } = item;
  const pers = dados.missoes.personagem;
  const tarefas = missao.tarefas.map((t) => {
    const p = progressoTarefa(jogo.estado, ativa, t);
    return `<div class="tarefa">
      <span>${p.atual >= p.meta ? '✅' : '▫️'} ${t.texto}</span>
      <div class="barra-xp grande"><span style="width:${(p.atual / p.meta) * 100}%"></span></div>
      <small>${p.atual}/${p.meta}</small></div>`;
  }).join('');

  $('missao-conteudo').innerHTML = `
    <button id="missao-fechar" class="fechar" aria-label="Fechar">✖</button>
    <div class="fala">
      <span class="fala-rosto">${pers.emoji}</span>
      <div class="fala-balao"><b>${pers.nome}</b><p>${missao.fala}</p></div>
    </div>
    <h3>${missao.icone} ${missao.titulo}</h3>
    <div class="bloco">${tarefas}</div>
    <div class="bloco"><b>Prêmio</b><div class="premios">${premioTexto(missao.premio)}</div></div>
    ${completa ? '<button id="missao-resgatar" class="btn btn-grande btn-laranja">Resgatar!</button>' : ''}`;
  const resgatar = $('missao-resgatar');
  if (resgatar) resgatar.addEventListener('click', () => resgatarAberta());
  $('missao-ficha').classList.remove('escondido');
  desenharMissoes();
}

function resgatarAberta() {
  const t = dados.textos;
  const res = jogo.resgatarMissao(aberta);
  if (!res.ok) return;
  fechar();
  if (res.subiuJogador) {
    const vagas = jogo.vagasTime();
    avisar(vagas > jogo.vagasTime(jogo.estado.nivel - res.subiuJogador)
      ? preencher(t.vagaLiberada, { vagas })
      : preencher(t.jogadorSubiu, { nivel: jogo.estado.nivel, orvalho: dados.config.jogador.orvalhoPorNivel * res.subiuJogador }));
  }
  else if (res.novas.length) avisar(preencher(t.missaoNova, { titulo: res.novas[0].titulo }));
  else if (!jogo.missoesAtivas().length) avisar(t.semMissoes);
  else avisar(t.missaoResgatada);
  aoMudar();
}

function fechar() {
  aberta = null;
  $('missao-ficha').classList.add('escondido');
  desenharMissoes();
}
