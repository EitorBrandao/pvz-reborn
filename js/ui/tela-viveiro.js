// Viveiro de Pesquisa: árvore de melhorias que cresce com o relógio, mesmo com o jogo fechado.

import { $, mostrarTela, avisar, preencher, curto } from './comum.js';
import * as jogo from '../estado.js';
import * as som from '../som.js';

let dados;

const t = () => dados.textos.viveiro;

export function iniciarTelaViveiro(d, { voltar }) {
  dados = d;
  $('viveiro-voltar').addEventListener('click', voltar);
  $('btn-viveiro').addEventListener('click', abrirViveiro);
  setInterval(() => {
    if ($('tela-viveiro').classList.contains('ativa')) desenhar();
  }, 1000);
}

// Bolinha no botão da horta quando tem pesquisa pronta pra ver
export function desenharBotaoViveiro() {
  const info = jogo.viveiroInfo();
  $('btn-viveiro').classList.toggle('nova', info.avisos > 0);
}

export function abrirViveiro() {
  if (!jogo.viveiroLiberado()) return avisar(preencher(t().bloqueado, { nivel: dados.viveiro.nivelMin }));
  if (jogo.viveiroInfo().avisos) som.tocarSom('pesquisa');
  jogo.viveiroVisto();
  desenhar();
  mostrarTela('tela-viveiro');
  desenharBotaoViveiro();
}

function duracao(min) {
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  return [d ? `${d}d` : '', h ? `${h}h` : '', m ? `${m}min` : ''].filter(Boolean).join(' ');
}

function falta(ms) {
  const s = Math.ceil(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = String(s % 60).padStart(2, '0');
  return d ? `${d}d ${h}h ${String(m).padStart(2, '0')}min` : h ? `${h}:${String(m).padStart(2, '0')}:${seg}` : `${m}:${seg}`;
}

function custo(no) {
  const partes = [`🪙 ${curto(no.moedas)}`];
  for (const [id, qtd] of Object.entries(no.materiais)) {
    const c = dados.cartas.find((x) => x.id === id);
    const tem = (jogo.estado.inventario[id] || 0) >= qtd;
    partes.push(`<span class="${tem ? '' : 'falta-material'}">${c ? c.emoji : id}×${qtd}</span>`);
  }
  return partes.join(' ');
}

function linhaNo({ no, situacao, faltaRequer }, info) {
  const tx = t();
  let rodape = '';
  let acao = '';
  if (situacao === 'pronto') rodape = `<small>${no.texto}</small>`;
  else if (situacao === 'rodando') {
    rodape = `<div class="barra-xp grande"><span style="width:${info.atual.progresso * 100}%"></span></div><small>${preencher(tx.falta, { tempo: falta(info.atual.falta) })}</small>`;
  } else if (situacao === 'fila') rodape = `<small>${tx.naFila}</small>`;
  else if (situacao === 'trava') rodape = `<small>${preencher(tx.precisa, { nome: faltaRequer.map((n) => n.nome).join(', ') })}</small>`;
  else {
    const vaiFila = !!info.atual;
    rodape = `<small>${no.texto}</small><small class="viveiro-custo">${custo(no)}</small>`;
    acao = `<button class="btn btn-laranja viveiro-pesquisar" data-no="${no.id}">${vaiFila ? tx.enfileirar : tx.pesquisar}</button>`;
  }
  return `<div class="no-viveiro ${situacao}">
    <div class="no-viveiro-topo"><b>${situacao === 'pronto' ? '✔ ' : situacao === 'trava' ? '🔒 ' : ''}${no.nome}</b><span>⏱️ ${duracao(no.minutos)}</span></div>
    ${rodape}${acao}</div>`;
}

function desenhar() {
  const info = jogo.viveiroInfo();
  const tx = t();
  const ramos = dados.viveiro.ramos.map((r) => {
    const linhas = info.nos.filter((n) => n.no.ramo === r.id).map((n) => linhaNo(n, info)).join('');
    return linhas ? `<h3 class="ramo-viveiro">${r.emoji} ${r.nome}</h3>${linhas}` : '';
  }).join('');
  const resumo = info.atual
    ? preencher(tx.pesquisando, { nome: info.atual.no.nome, tempo: falta(info.atual.falta) })
    : tx.livre;
  const fila = info.vagasFila ? `<small>${preencher(tx.fila, { n: info.fila.length, max: info.vagasFila })}</small>` : '';
  const alvo = $('viveiro-conteudo');
  // Só refaz a tela quando algo muda, pra não perder o toque no meio de um clique
  const html = `<div class="viveiro-resumo"><b>${resumo}</b>${fila}<small>${preencher(tx.progresso, { n: info.prontos, total: info.total })}</small></div>${ramos}`;
  if (alvo.dataset.html === html) return;
  alvo.dataset.html = html;
  alvo.innerHTML = html;
  alvo.querySelectorAll('[data-no]').forEach((b) => b.addEventListener('click', () => {
    const r = jogo.iniciarPesquisa(b.dataset.no);
    if (!r.ok) return avisar(dados.textos[r.erro] || tx[r.erro]);
    som.tocarSom('ronda');
    avisar(r.enfileirada ? tx.enfileirou : tx.comecou);
    desenhar();
  }));
}
