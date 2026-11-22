// Tela da Arena: ranking, desafios do dia, prêmio diário e recados dos rivais.

import { arte } from '../arte.js';
import { $, mostrarTela, avisar, preencher, curto } from './comum.js';
import * as jogo from '../estado.js';
import { batalhaArena } from '../arena.js';
import { poderLados } from '../batalha.js';
import { textoPremio } from './tela-eventos.js';
import * as som from '../som.js';

let dados;
let aoPreparar;
let aoMudar;

const t = () => dados.textos.arena;
const num = curto;

export function iniciarTelaArena(d, { voltar, preparar, mudou }) {
  dados = d;
  aoPreparar = preparar;
  aoMudar = mudou;
  $('arena-voltar').addEventListener('click', voltar);
  $('btn-arena').addEventListener('click', abrirArena);
}

export function abrirArena() {
  desenhar();
  mostrarTela('tela-arena');
}

const emojiPlanta = (id) => arte(dados.plantas.find((p) => p.id === id)) || '?';

function linhaDesafio(d, gratis) {
  const r = { ...d.rival, pontos: d.pontos };
  const batalha = batalhaArena(r, dados);
  const { planta: nosso, praga: deles } = poderLados(batalha, jogo.estado.time, dados, jogo.estado.colecao);
  const classe = !jogo.estado.time.length || nosso >= deles ? 'mais-forte' : 'mais-fraco';
  const botao = gratis > 0 ? t().desafiar : preencher(t().desafiarPago, { custo: dados.arena.custoDesafioExtra });
  return `<div class="cartao-atividade arena-rival">
    <div class="atividade-emoji">${r.emoji}</div>
    <div class="atividade-info">
      <b>${d.pos}º ${r.nome} <small class="nv">Nv ${r.nivel} · ${t().estilos[r.estilo]}</small></b>
      <span class="inimigos">${r.time.map((m) => emojiPlanta(m.planta)).join('')}</span>
      <small class="poder-comparar ${classe}">${num(nosso)} × ${num(deles)}</small>
      <small class="arena-pontos">${num(r.pontos)} pts · ${preencher(t().chance, { pct: d.chance })} · <b class="ganha">+${curto(d.ganha)}</b> / <b class="perde">${curto(d.perde)}</b></small>
    </div>
    <button class="btn btn-peq ${gratis > 0 ? 'btn-laranja' : 'btn-azul'}" data-rival="${r.id}">${botao}</button>
  </div>`;
}

function desenhar() {
  const area = $('arena-conteudo');
  const info = jogo.arenaInfo();
  const c = dados.arena;

  const mural = info.naoVistos
    ? `<div class="arena-mural"><b>${t().muralTitulo}</b>
        ${info.mural.slice(0, info.naoVistos).map((e) => `<p class="${e.venceu ? 'ganhou' : 'perdeu'}">${e.texto} <b>${e.pontos > 0 ? '+' : ''}${e.pontos} pts</b></p>`).join('')}
        <button id="arena-mural-ok" class="btn btn-peq">${t().muralOk}</button></div>`
    : '';

  const premio = info.premio.pego
    ? `<p class="dica-pequena">${t().premioPego}</p>`
    : `<p class="rotina-premio">${textoPremio(info.premio.premio)}</p>
       <button id="arena-premio" class="btn btn-laranja btn-largo">${t().premioPegar}</button>`;

  const desafios = info.desafiaveis.length
    ? info.desafiaveis.map((d) => linhaDesafio(d, info.gratis)).join('')
    : `<p class="dica-pequena">${t().desafiaveisVazio}</p>`;

  const ranking = info.ranking.map((l) => (l.voce
    ? `<li class="voce"><span class="pos">${l.pos}º</span><span>🌱 ${t().voce}</span><b>${num(l.pontos)} pts</b></li>`
    : `<li><span class="pos">${l.pos}º</span><span>${l.rival.emoji} ${l.rival.nome}</span><b>${num(l.pontos)} pts</b></li>`)).join('');

  area.innerHTML = `
    ${mural}
    <div class="arena-resumo">
      <div class="arena-posicao">🏆 ${preencher(t().posicao, { pos: info.posicao, total: info.total })}</div>
      <div class="arena-total">${num(info.pontos)} pts</div>
      <small>${preencher(t().melhor, { melhor: info.melhor })}</small>
      <small>${info.gratis > 0
    ? preencher(t().gratis, { n: info.gratis, max: c.desafiosPorDia })
    : preencher(t().gratisAcabou, { custo: c.custoDesafioExtra })}</small>
    </div>
    <h4>${t().premioTitulo}</h4>
    ${premio}
    <h4>${t().desafiaveisTitulo}</h4>
    <div class="atividades-lista">${desafios}</div>
    <p class="dica-pequena">${t().desafiaveisDica}</p>
    <h4>${t().rankingTitulo}</h4>
    <ol class="ranking-invasao">${ranking}</ol>`;

  const ok = $('arena-mural-ok');
  if (ok) ok.addEventListener('click', () => { jogo.limparMuralArena(); desenhar(); });
  const pegar = $('arena-premio');
  if (pegar) {
    pegar.addEventListener('click', () => {
      const r = jogo.resgatarPremioArena();
      if (r.ok) { som.tocarSom('vitoria'); avisar(preencher(t().pegou, { premio: textoPremio(r.premio) })); }
      aoMudar();
      desenhar();
    });
  }
  area.querySelectorAll('[data-rival]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const alvo = info.desafiaveis.find((d) => String(d.rival.id) === botao.dataset.rival);
      if (alvo) aoPreparar(batalhaArena(alvo.rival, dados));
    });
  });
}
