// Tela do Labirinto das Raízes: escolher o time, as portas de cada andar, bênçãos, recrutas e o prêmio final.

import { arte } from '../arte.js';
import { $, mostrarTela, avisar, preencher } from './comum.js';
import * as jogo from '../estado.js';
import { atributos, poder } from '../evolucao.js';
import { multPremio, premioFinal } from '../labirinto.js';

let dados;
let aoLutar;
let aoVoltar;
let escolhidas = []; // plantas marcadas antes de entrar

// Ordem da lista de plantas: a mesma (e lembrada junto) da tela de montar o time.
const ORDENS = ['padrao', 'poder', 'nivel', 'estrela', 'vida', 'atq', 'def', 'vel'];
const ICONE_ATRIBUTO = { vida: '❤️', atq: '⚔️', def: '🛡️', vel: '💨' };
let ordem = 'padrao';
try { ordem = localStorage.getItem('horta-ordem-time') || 'padrao'; } catch { /* sem storage */ }
if (!ORDENS.includes(ordem)) ordem = 'padrao';

export function iniciarTelaLabirinto(d, { lutar, voltar }) {
  dados = d;
  aoLutar = lutar;
  aoVoltar = voltar;
  $('lab-voltar').addEventListener('click', voltar);
}

export function abrirLabirinto() {
  desenhar();
  mostrarTela('tela-labirinto');
}

const T = () => dados.textos.labirinto;
const planta = (id) => dados.plantas.find((p) => p.id === id);
const item = (id) => [...dados.labirinto.bencaos, ...dados.labirinto.malditas].find((x) => x.id === id);

function botao(texto, classe, acao) {
  const b = document.createElement('button');
  b.className = `btn btn-largo ${classe}`;
  b.innerHTML = texto;
  b.addEventListener('click', acao);
  return b;
}

function bloco(titulo, ...filhos) {
  const div = document.createElement('div');
  div.className = 'bloco';
  if (titulo) div.innerHTML = `<h4>${titulo}</h4>`;
  filhos.forEach((f) => div.append(f));
  return div;
}

function texto(html, classe = 'dica-pequena') {
  const p = document.createElement('p');
  p.className = classe;
  p.innerHTML = html;
  return p;
}

// Barra com o time do caminho e a vida de cada planta
function resumoTime(run) {
  const div = document.createElement('div');
  div.className = 'lab-time';
  for (const m of run.time) {
    const p = planta(m.planta);
    const v = run.vidas[m.planta] ?? 1;
    const celula = document.createElement('div');
    celula.className = 'lab-planta' + (v <= 0 ? ' caida' : '');
    celula.innerHTML = `<span class="planta-emoji">${arte(p)}</span><span class="barra-xp"><span style="width:${Math.round(v * 100)}%"></span></span>`;
    div.append(celula);
  }
  return div;
}

function trilha(run) {
  const c = dados.labirinto;
  const div = document.createElement('div');
  div.className = 'lab-trilha';
  for (let i = 0; i < c.andares; i++) {
    const s = document.createElement('span');
    s.className = (i < run.andar ? 'feito' : i === run.andar && run.etapa !== 'fim' ? 'atual' : '') + (c.chefes.includes(i + 1) ? ' chefe' : '');
    div.append(s);
  }
  return div;
}

function bencaosDoRun(run) {
  if (!run.bencaos.length) return null;
  return texto(run.bencaos.map((id) => `<span title="${item(id).texto}">${item(id).emoji}</span>`).join(' '), 'lab-bencaos');
}

function desenhar() {
  const raiz = $('lab-conteudo');
  raiz.innerHTML = '';
  const run = jogo.labirinto().run;
  if (!run) return desenharInicio(raiz);
  raiz.append(trilha(run));
  raiz.append(resumoTime(run));
  const b = bencaosDoRun(run);
  if (b) raiz.append(b);
  ({ portas: desenharPortas, bencao: desenharBencao, recruta: desenharRecruta, evento: desenharEvento, fim: desenharFim })[run.etapa](raiz, run);
}

// ---------- Antes de entrar ----------

// Plantas da coleção na ordem escolhida; empate mantém a ordem original.
function plantasOrdenadas() {
  const col = jogo.estado.colecao;
  const itens = dados.plantas.filter((p) => col[p.id]).map((p, i) => {
    const s = atributos(p, col[p.id], dados);
    return { p, i, r: col[p.id], s, poder: poder(s, dados) };
  });
  const chave = ({ r, s, poder: pd }) => {
    if (ordem === 'nivel') return [r.nivel, r.estrelas];
    if (ordem === 'estrela') return [r.estrelas, r.nivel];
    if (ordem === 'padrao') return [0, 0];
    if (ordem === 'poder') return [pd, r.nivel];
    return [s[ordem], 0];
  };
  return itens.sort((a, b) => {
    const [a1, a2] = chave(a);
    const [b1, b2] = chave(b);
    return (b1 - a1) || (b2 - a2) || (a.i - b.i);
  });
}

function desenharInicio(raiz) {
  const t = T();
  const c = dados.labirinto;
  const lab = jogo.labirinto();
  raiz.append(bloco(t.titulo, texto(preencher(t.explicacao, { andares: c.andares, plantas: c.plantasInicio, max: c.plantasMax })), texto(preencher(t.recorde, { n: lab.melhor }))));

  const lista = document.createElement('div');
  lista.className = 'grade-plantas';
  const donas = plantasOrdenadas();
  escolhidas = escolhidas.filter((id) => jogo.estado.colecao[id] && !jogo.emExpedicao(id));
  for (const { p, r, s } of donas) {
    const viajando = jogo.emExpedicao(p.id);
    const marcada = escolhidas.includes(p.id);
    const cartao = document.createElement('button');
    cartao.className = 'cartao-planta' + (marcada ? ' no-time' : '') + (viajando ? ' fora-regra' : '');
    cartao.innerHTML = `<span class="planta-emoji">${arte(p)}</span><b>${p.nome}</b><small>Nv ${r.nivel} · ${'⭐'.repeat(r.estrelas)}</small><span class="poder">${ICONE_ATRIBUTO[ordem] ? `${ICONE_ATRIBUTO[ordem]} ${s[ordem]}` : `💪 ${poder(s, dados)}`}</span>`;
    cartao.addEventListener('click', () => {
      if (viajando) return avisar(dados.textos.rotina.plantaViajando);
      if (marcada) escolhidas = escolhidas.filter((id) => id !== p.id);
      else if (escolhidas.length >= c.plantasInicio) return avisar(preencher(t.timeCheio, { max: c.plantasInicio }));
      else escolhidas.push(p.id);
      desenhar();
    });
    lista.append(cartao);
  }
  const poderTime = escolhidas.reduce((soma, id) => soma + poder(atributos(planta(id), jogo.estado.colecao[id], dados), dados), 0);
  const mult = multPremio(poderTime, dados);
  const ordenar = botao(dados.textos.ordensTime[ordem], 'btn-azul', () => {
    ordem = ORDENS[(ORDENS.indexOf(ordem) + 1) % ORDENS.length];
    try { localStorage.setItem('horta-ordem-time', ordem); } catch { /* sem storage */ }
    desenhar();
  });
  ordenar.classList.remove('btn-largo');
  ordenar.classList.add('btn-peq');
  raiz.append(bloco(preencher(t.escolhaTitulo, { n: escolhidas.length, max: c.plantasInicio }), ordenar, lista));
  raiz.append(texto(preencher(t.premioMult, { mult: mult.toFixed(1) })));
  const entrar = botao(t.entrar, 'btn-laranja', () => {
    const r = jogo.iniciarLabirinto(escolhidas);
    if (!r.ok) return avisar(dados.textos.labirinto[r.erro] || t.erroTime);
    desenhar();
  });
  entrar.disabled = !escolhidas.length;
  raiz.append(entrar);
}

// ---------- Portas ----------

function desenharPortas(raiz, run) {
  const t = T();
  const c = dados.labirinto;
  const info = c.chefes.includes(run.andar + 1) ? t.andarChefe : t.escolhaPorta;
  const lista = document.createElement('div');
  lista.className = 'lab-portas';
  run.portas.forEach((porta, i) => {
    const sala = t.salas[porta.t];
    lista.append(botao(`${sala.emoji} <b>${sala.nome}</b><small>${sala.texto}</small>`, porta.t === 'chefe' ? 'btn-vermelho lab-porta' : 'btn-verde lab-porta', () => {
      const r = jogo.abrirPortaLabirinto(i);
      if (!r.ok) return;
      if (r.batalha) return aoLutar(r.batalha);
      if (porta.t === 'descanso') avisar(t.descansou);
      desenhar();
    }));
  });
  raiz.append(bloco(preencher(t.andar, { n: run.andar + 1, total: c.andares }), texto(info), lista));
  raiz.append(botao(t.desistir, 'btn-azul', () => {
    if (!confirm(t.desistirConfirma)) return;
    jogo.abandonarLabirinto();
    desenhar();
  }));
}

// ---------- Bênção (ou prêmio maldito do elite) ----------

function desenharBencao(raiz, run) {
  const t = T();
  const lista = document.createElement('div');
  lista.className = 'lab-portas';
  for (const id of run.opcoes) {
    const b = item(id);
    const maldita = dados.labirinto.malditas.some((m) => m.id === id);
    lista.append(botao(`${b.emoji} <b>${b.nome}</b>${maldita ? ' 💀' : ''}<small>${b.texto}</small>`, maldita ? 'btn-vermelho lab-porta' : 'btn-verde lab-porta', () => {
      jogo.escolherBencaoLabirinto(id);
      desenhar();
    }));
  }
  raiz.append(bloco(t.bencaoTitulo, texto(t.bencaoTexto), lista));
}

// ---------- Recruta ----------

function desenharRecruta(raiz, run) {
  const t = T();
  const lista = document.createElement('div');
  lista.className = 'grade-plantas';
  for (const id of run.opcoes) {
    const p = planta(id);
    const r = jogo.estado.colecao[id];
    const cartao = document.createElement('button');
    cartao.className = 'cartao-planta';
    cartao.innerHTML = `<span class="planta-emoji">${arte(p)}</span><b>${p.nome}</b><small>Nv ${r.nivel} · ${'⭐'.repeat(r.estrelas)}</small><small>${p.funcao}</small>`;
    cartao.addEventListener('click', () => {
      jogo.recrutarLabirinto(id);
      avisar(preencher(t.recrutou, { nome: p.nome }));
      desenhar();
    });
    lista.append(cartao);
  }
  raiz.append(bloco(t.recrutaTitulo, texto(t.recrutaTexto), lista));
  raiz.append(botao(t.seguirSemRecrutar, 'btn-azul', () => { jogo.recrutarLabirinto(null); desenhar(); }));
}

// ---------- Evento ----------

function desenharEvento(raiz, run) {
  const t = T();
  const ev = dados.labirinto.eventos.find((e) => e.id === run.evento);
  const caixa = bloco(`${ev.emoji} ${ev.titulo}`, texto(preencher(t.eventoTexto, { chance: Math.round(ev.chance * 100) })));
  caixa.append(botao(ev.opcao, 'btn-laranja', () => {
    const r = jogo.eventoLabirinto(true);
    avisar(r.texto);
    desenhar();
  }));
  caixa.append(botao(t.ignorar, 'btn-azul', () => { jogo.eventoLabirinto(false); desenhar(); }));
  raiz.append(caixa);
}

// ---------- Fim ----------

function desenharFim(raiz, run) {
  const t = T();
  const p = previaPremio(run);
  raiz.append(bloco(run.venceu ? t.fimVitoria : t.fimDerrota,
    texto(preencher(t.fimAndares, { n: run.andaresVencidos, total: dados.labirinto.andares })),
    texto(preencher(t.fimPremio, { sementes: p.sementes, pontos: p.pontos, moedas: p.moedas, mult: p.mult.toFixed(1) }), 'lab-premio')));
  raiz.append(botao(t.receber, 'btn-laranja', () => {
    const r = jogo.receberLabirinto();
    if (r.ok) avisar(preencher(t.recebeu, { sementes: r.sementes, pontos: r.pontos }));
    escolhidas = [];
    desenhar();
  }));
}

function previaPremio(run) {
  return premioFinal(run, dados, jogo.estado.colecao);
}
