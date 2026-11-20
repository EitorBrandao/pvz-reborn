// Desenha e anima a batalha no Canvas, tocando os eventos calculados em batalha.js.

import { $, mostrarTela, avisar, sortear, preencher } from './comum.js';
import * as jogo from '../estado.js';
import { prepararBatalha, simular, rolarCartas, criarRng } from '../batalha.js';
import { calcularEstrelas } from '../campanha.js';
import * as som from '../som.js';
import { arte, urlUnidade, imagemStatus, imagemHabilidade, infoTiro, corHabilidade, preCarregar } from '../arte.js';

let dados, acoes;
let missoesAntes = new Set();
let canvas, ctx, W = 0, H = 0, raio = 30;
// Três camadas: grama e sombras (fundo), plantas e pragas como <img> (camada), e o resto por cima (ctx).
// As unidades são <img> porque o modo escuro do Samsung Internet desbota desenhos feitos dentro do canvas.
let canvasFundo, fundo, camada;
let vis = {};            // aparência atual de cada unidade
let projeteis = [];
let flutuantes = [];
let particulas = [];
let ondas = [];
let selos = [];          // ícone de status que pula quando o efeito pega          // anéis que se expandem (habilidades, cura, escudo)
let clarao = 0;         // tela pisca branco em golpe crítico
let banner = null;
let tremor = 0;
let pular = false;
let loopId = null;
let partida = 0;         // muda a cada batalha nova, pra cancelar animações antigas
let batalhaAtual = null;
let unidadesAtuais = []; // unidades da batalha (o Labirinto lê a vida que sobrou)
let chefeInvasao = null; // { uid, vida } do chefe da Invasão, pra contar o dano

const agora = () => performance.now();
// Ritmo base: abaixo de 1 deixa o combate mais lento pra dar tempo de ver os ataques.
const RITMO = 0.6;
const velEscolhida = () => jogo.estado.velocidadeBatalha || 1;
const vel = () => velEscolhida() * RITMO;

// acoes: { sair(fase), lutar(fase), proxima(fase) -> fase seguinte liberada ou null, prepararProxima(fase) }
export function iniciarTelaBatalha(d, a) {
  dados = d;
  acoes = a;
  canvasFundo = $('campo');
  fundo = canvasFundo.getContext('2d');
  canvas = $('campo-topo');
  ctx = canvas.getContext('2d');
  camada = $('campo-unidades');
  window.addEventListener('resize', medir);

  $('btn-velocidade').addEventListener('click', () => {
    // passa pra próxima velocidade da lista (1x → 2x → 3x → 1x)
    const lista = dados.config.batalha.velocidades;
    const i = lista.indexOf(velEscolhida());
    jogo.definirVelocidade(lista[(i + 1) % lista.length]);
    atualizarBotoes();
  });
  $('btn-pular').addEventListener('click', () => {
    if (!podePular()) return avisar(batalhaAtual.tipo ? dados.textos.pularBloqueadoAtividade : dados.textos.pularBloqueado);
    pular = true;
    som.pararMusica();
  });
  $('btn-de-novo').addEventListener('click', () => acoes.lutar(batalhaAtual));
  $('btn-proxima').addEventListener('click', () => {
    const proxima = acoes.proxima(batalhaAtual);
    parar();
    if (proxima) acoes.prepararProxima(proxima);
  });
  $('btn-sair-batalha').addEventListener('click', () => {
    parar();
    acoes.sair(batalhaAtual);
  });
}

function podePular() {
  return !!batalhaAtual.podePular || jogo.estado.vencidas.includes(batalhaAtual.id);
}

function atualizarBotoes() {
  $('btn-velocidade').textContent = `${velEscolhida()}x`;
  $('btn-pular').classList.toggle('bloqueado', !podePular());
}

export function comecarBatalha(batalha) {
  batalhaAtual = batalha;
  const minhaPartida = ++partida;
  missoesAntes = new Set(jogo.idsMissoesCompletas());
  pular = false;
  projeteis = [];
  flutuantes = [];
  particulas = [];
  ondas = [];
  selos = [];
  clarao = 0;
  banner = null;
  tremor = 0;

  const unidades = prepararBatalha(batalha, jogo.estado.time, dados, jogo.estado.colecao);
  unidadesAtuais = unidades;
  const semente = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const resultado = simular(structuredClone(unidades), batalha.maxRodadas ? { ...dados.config.batalha, maxRodadas: batalha.maxRodadas } : dados.config.batalha, semente);
  const chefe = batalha.tipo === 'invasao' && unidades.find((u) => u.lado === 'praga' && u.id === batalha.idChefe);
  chefeInvasao = chefe ? { uid: chefe.uid, vida: chefe.vida } : null;

  vis = {};
  for (const u of unidades) vis[u.uid] = { ...u, ox: 0, oy: 0, dx: 0, dy: 0, kx: 0, alpha: 1, brilho: 0, flash: 0, estica: 0, fase: Math.random() * 6 };
  preCarregar(unidades.map((u) => u.id));
  montarSprites();

  $('resultado').classList.add('escondido');
  $('batalha-nome').textContent = batalha.nome;
  $('batalha-rodada').textContent = '1';
  atualizarBotoes();
  mostrarTela('tela-batalha');
  if (batalha.pesadelo) som.tocarMusica('pesadelo');
  if (batalha.tipo === 'labirinto') som.tocarMusica('labirinto');
  medir();
  if (!loopId) loopId = requestAnimationFrame(desenhar);
  som.acordar();
  som.pararMusica(false);
  som.tocarMusica(batalha.musica || 'batalha');

  tocar(resultado.eventos, minhaPartida).then(() => {
    if (minhaPartida === partida) terminar(resultado, semente);
  });
}

// Uma <img> por unidade (mais uma branca por cima, pro piscar de dano).
function montarSprites() {
  camada.innerHTML = '';
  for (const v of Object.values(vis)) {
    const url = urlUnidade(v.id);
    v.el = null;
    if (!url) continue;
    const el = document.createElement('div');
    el.className = 'sprite-batalha';
    el.innerHTML = `<img src="${url}" data-arte="u:${v.id}" alt="" draggable="false"><img class="branca" src="${url}" data-arte="u:${v.id}" alt="" draggable="false">`;
    camada.append(el);
    v.el = el;
    v.elBranca = el.lastChild;
    v.ladoEl = 0;
  }
}

function parar() {
  partida++;
  som.pararMusica();
  if (loopId) cancelAnimationFrame(loopId);
  loopId = null;
}

function medir() {
  if (!canvas || !canvas.parentElement) return;
  const r = canvas.parentElement.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const dpr = window.devicePixelRatio || 1;
  W = r.width;
  H = r.height;
  for (const c of [canvas, canvasFundo]) {
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    c.style.width = `${W}px`;
    c.style.height = `${H}px`;
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  raio = Math.min(W * 0.075, H * 0.085);
  for (const v of Object.values(vis)) {
    const xs = v.lado === 'planta' ? [0.34, 0.13] : [0.66, 0.87];
    v.x = W * xs[v.col];
    v.y = H * (0.2 + 0.3 * v.linha);
  }
}

// ---------- Tocar os eventos ----------

function espera(ms) {
  if (pular) return Promise.resolve();
  return new Promise((r) => setTimeout(r, ms / vel()));
}

async function tocar(eventos, minhaPartida) {
  for (const ev of eventos) {
    if (pular || minhaPartida !== partida) break;
    if (ev.tipo === 'rodada') $('batalha-rodada').textContent = ev.n;
    else if (ev.tipo === 'acao') await animarAcao(ev);
    else if (ev.tipo === 'status') await animarStatus(ev);
  }
  if (minhaPartida !== partida) return;
  const fim = eventos[eventos.length - 1];
  aplicarFoto(fim.snap);
  $('batalha-rodada').textContent = fim.rodadas;
  projeteis.forEach((p) => p.resolver());
  projeteis = [];
  await espera(400);
}

async function animarAcao(ev) {
  const a = vis[ev.de];
  const t = dados.textos.efeitos;
  if (ev.dormindo) {
    flutuar(a.x, a.y - raio, t.dormindo, '#ffffff', 18);
    await espera(500);
    aplicarFoto(ev.snap);
    return;
  }

  if (ev.especial) {
    banner = { texto: ev.nomeHab, hab: ev.habTipo, x: a.x, y: a.y - raio * 1.9, t0: agora(), dur: 1100 / vel() };
    anel(a.x, a.y, corHabilidade(ev.habTipo), raio * 0.6, raio * 2.2, 600);
    estourar(a.x, a.y, 12, [corHabilidade(ev.habTipo), '#fff'], 'estrela');
    a.brilho = 1;
    tremor += 3;
    if (!pular) som.tocarSom('especial');
    await espera(450);
  }

  const golpes = ev.efeitos.filter((e) => e.tipo === 'dano' && !e.reflexo);
  if (golpes.length) {
    const alvo = vis[golpes[0].alvo];
    const ang = Math.atan2(alvo.y - a.y, alvo.x - a.x);
    if (!ev.perto) {
      if (!pular) som.tocarSom('tiro');
      a.estica = 1;
      a.dx = Math.cos(ang) * raio * 0.7;
      a.dy = Math.sin(ang) * raio * 0.7;
      await espera(140);
      a.dx = 0;
      a.dy = 0;
    }
  }

  if (ev.perto) {
    // corpo a corpo: a planta corre até o alvo, bate e volta (sem projétil)
    for (const ef of golpes) {
      const alvo = vis[ef.alvo];
      const ang = Math.atan2(alvo.y - a.y, alvo.x - a.x);
      const dist = Math.max(0, Math.hypot(alvo.x - a.x, alvo.y - a.y) - raio * 1.6);
      a.dx = Math.cos(ang) * dist;
      a.dy = Math.sin(ang) * dist;
      a.estica = 1;
      await espera(200);
      mostrarEfeito(ef);
      if (ev.especial) impacto(ev.habTipo, vis[ef.alvo]);
      await espera(120);
    }
    a.dx = 0;
    a.dy = 0;
  } else {
    let atraso = 0;
    const chegadas = golpes.map((ef) => {
      const voo = lancar(a, vis[ef.alvo], a.projetil, atraso, ev.especial).then(() => {
        mostrarEfeito(ef);
        if (ev.especial) impacto(ev.habTipo, vis[ef.alvo]);
      });
      atraso += ev.habTipo === 'rajada' ? 130 : 50;
      return voo;
    });
    await Promise.all(chegadas);
  }

  for (const ef of ev.efeitos) {
    if (!(ef.tipo === 'dano' && !ef.reflexo)) mostrarEfeito(ef);
  }
  aplicarFoto(ev.snap);
  await espera(ev.especial ? 500 : 280);
  a.brilho = 0;
}

async function animarStatus(ev) {
  for (const ef of ev.efeitos) mostrarEfeito(ef);
  aplicarFoto(ev.snap);
  await espera(350);
}

function lancar(de, para, emoji, atraso, especial = false) {
  if (pular) return Promise.resolve();
  return new Promise((resolver) => {
    projeteis.push({
      x0: de.x, y0: de.y, x1: para.x, y1: para.y, emoji, tiro: infoTiro(emoji), especial,
      t0: agora() + atraso / vel(), dur: 320 / vel(), resolver,
    });
  });
}

function mostrarEfeito(ef) {
  const v = vis[ef.alvo];
  const t = dados.textos.efeitos;
  if (!v) return;
  if (!pular) {
    if (ef.morreu) som.tocarSom('morte');
    else if (ef.porStatus) som.tocarStatus(ef.porStatus, true);
    else if (ef.tipo === 'status') som.tocarStatus(ef.status);
    else if (ef.tipo === 'dano') som.tocarSom(ef.reflexo ? 'reflexo' : ef.critico ? 'critico' : 'golpe');
    else som.tocarSom(ef.tipo);
  }
  switch (ef.tipo) {
    case 'dano': {
      v.vida = ef.vidaDepois;
      v.flash = 1;
      // empurrão pra trás: quanto maior o golpe (em relação à vida), mais forte
      const peso = Math.min(1, ef.valor / v.vidaMax * 3);
      v.kx = (v.lado === 'planta' ? -1 : 1) * raio * (0.35 + peso * 0.6) * (ef.critico ? 1.6 : 1);
      const tam = 28 + peso * 22;
      if (ef.reflexo) flutuar(v.x, v.y - raio, `-${ef.valor}`, '#d08cff', 24);
      else if (ef.veneno) flutuar(v.x, v.y - raio, `-${ef.valor}`, '#8dff4a', 22);
      else if (ef.queimadura) flutuar(v.x, v.y - raio, `-${ef.valor}`, '#ff8a2f', 22);
      else if (ef.critico) {
        flutuar(v.x, v.y - raio * 1.2, `${ef.valor}!`, '#ff3b2f', tam + 16, true);
        tremor += 16;
        clarao = 0.35;
        estourar(v.x, v.y, 16, ['#fff', '#ffd23a', '#ff6a2f']);
      } else {
        flutuar(v.x, v.y - raio, `${ef.valor}`, '#ffe14d', tam);
        tremor += 4 + peso * 6;
        estourar(v.x, v.y, 7, ['#fff', '#ffe14d']);
      }
      if (ef.eficaz) flutuar(v.x, v.y - raio * 1.9, t.eficaz, '#ff9a2f', 16);
      if (ef.morreu) { estourar(v.x, v.y, 22, ['#8a5a2b', '#5cc23a', '#fff']); tremor += 8; }
      break;
    }
    case 'cura':
      v.vida = ef.vidaDepois;
      anel(v.x, v.y, '#7dff6a', raio * 0.5, raio * 1.5, 500);
      subir(v.x, v.y, 7, '#7dff6a', 'mais');
      flutuar(v.x, v.y - raio, `+${ef.valor}`, '#7dff6a', 26);
      break;
    case 'escudo':
      v.escudo = ef.valor;
      anel(v.x, v.y, '#7fe3ff', raio * 1.6, raio * 1.1, 450);
      flutuar(v.x, v.y - raio, preencher(t.escudo, { valor: ef.valor }), '#7fe3ff', 18);
      break;
    case 'espinhos':
      estourar(v.x, v.y, 10, ['#d7e8a8', '#4f9a3a'], 'espinho');
      flutuar(v.x, v.y - raio * 1.4, t.espinhos, '#b6ff5c', 18);
      break;
    case 'sono':
      v.sono = 1;
      anel(v.x, v.y, '#b388ff', raio * 0.4, raio * 1.4, 500);
      flutuar(v.x, v.y - raio * 1.4, t.sono, '#ffffff', 18);
      break;
    case 'status': {
      const st = dados.textos.status[ef.status];
      const lista = Array.isArray(v.status) ? v.status : [];
      if (!lista.includes(ef.status)) v.status = [...lista, ef.status];
      selos.push({ x: v.x, y: v.y - raio * 0.4, nome: ef.status, t0: agora(), dur: 900 / vel() });
      if (st) flutuar(v.x, v.y - raio * 1.4, st.nome, ef.status === 'regeneracao' ? '#7dff6a' : '#ffb0e0', 18);
      break;
    }
    case 'seiva':
      subir(v.x, v.y, 6, '#ffd23a', 'estrela');
      flutuar(v.x, v.y - raio * 1.4, preencher(t.seiva, { valor: ef.valor }), '#ffd23a', 18);
      break;
    case 'lento':
      v.lento = 1;
      selos.push({ x: v.x, y: v.y - raio * 0.4, nome: 'lento', t0: agora(), dur: 900 / vel() });
      flutuar(v.x, v.y - raio * 1.4, t.lento, '#9fd0ff', 18);
      break;
  }
}

function aplicarFoto(snap) {
  for (const uid in snap) if (vis[uid]) Object.assign(vis[uid], snap[uid]);
}

function flutuar(x, y, texto, cor, tam, grande = false) {
  if (pular) return;
  flutuantes.push({ x, y, texto, cor, tam, grande, t0: agora(), dur: (grande ? 1200 : 900) / vel() });
}

function estourar(x, y, quantidade, cores, forma = 'bola') {
  if (pular) return;
  for (let i = 0; i < quantidade; i++) {
    const ang = Math.random() * Math.PI * 2;
    const forca = raio * (0.08 + Math.random() * 0.12);
    particulas.push({
      x, y, vx: Math.cos(ang) * forca, vy: Math.sin(ang) * forca - raio * 0.05,
      cor: cores[i % cores.length], tam: 2 + Math.random() * 4, vida: 1, forma, ang,
    });
  }
}

// partículas que sobem devagar (cura, energia)
function subir(x, y, quantidade, cor, forma) {
  if (pular) return;
  for (let i = 0; i < quantidade; i++) {
    particulas.push({
      x: x + (Math.random() - 0.5) * raio * 1.4, y: y + (Math.random() - 0.2) * raio,
      vx: 0, vy: -raio * (0.03 + Math.random() * 0.03), leve: true,
      cor, tam: 4 + Math.random() * 3, vida: 1, forma, ang: 0,
    });
  }
}

function anel(x, y, cor, r0, r1, dur) {
  if (pular) return;
  ondas.push({ x, y, cor, r0, r1, t0: agora(), dur: dur / vel() });
}

// Impacto da habilidade especial no alvo: anel e faíscas da cor da habilidade.
function impacto(tipo, v) {
  if (!v || !tipo) return;
  const cor = corHabilidade(tipo);
  anel(v.x, v.y, cor, raio * 0.3, raio * (tipo === 'area_coluna' ? 2 : 1.4), 450);
  if (tipo === 'area_coluna') { estourar(v.x, v.y, 14, ['#ffd23a', '#ff6a2f', '#fff']); tremor += 6; }
  else estourar(v.x, v.y, 8, [cor, '#fff'], 'estrela');
}

// ---------- Resultado ----------

// Soma o dano de cada planta (causado e recebido) a partir dos eventos da batalha.
function somarDano(eventos) {
  const causado = {}, recebido = {};
  let status = 0;
  const soma = (m, k, v) => { m[k] = (m[k] || 0) + v; };
  for (const ev of eventos) {
    if (!ev.efeitos) continue;
    let anterior = null;
    for (const e of ev.efeitos) {
      if (e.tipo === 'dano') {
        const alvo = vis[e.alvo];
        if (alvo && alvo.lado === 'planta') soma(recebido, e.alvo, e.valor);
        if (e.porStatus) { if (alvo && alvo.lado === 'praga') status += e.valor; }
        else if (e.reflexo) { if (anterior) soma(causado, anterior.alvo, e.valor); }
        else if (ev.de && vis[ev.de] && vis[ev.de].lado === 'planta') soma(causado, ev.de, e.valor);
        if (!e.reflexo) anterior = e;
      }
    }
  }
  return { causado, recebido, status };
}

function mostrarDano(soma, aba) {
  const t = dados.textos.sumarioDano;
  $('aba-dano-causado').textContent = t.causado;
  $('aba-dano-recebido').textContent = t.recebido;
  $('aba-dano-causado').classList.toggle('ativa', aba === 'causado');
  $('aba-dano-recebido').classList.toggle('ativa', aba === 'recebido');
  const lista = $('resultado-dano');
  lista.innerHTML = '';
  const linhas = Object.entries(soma[aba]).map(([uid, v]) => ({ nome: `${arte(vis[uid])} ${vis[uid].nome}`, v }));
  if (aba === 'causado' && soma.status > 0) linhas.push({ nome: t.status, v: soma.status });
  linhas.sort((a, b) => b.v - a.v);
  const max = linhas.length ? linhas[0].v : 1;
  const total = linhas.reduce((s, l) => s + l.v, 0);
  if (!linhas.length) lista.innerHTML = `<li>${t.nada}</li>`;
  for (const l of linhas) {
    const li = document.createElement('li');
    const barra = document.createElement('i');
    barra.style.width = `${Math.round((l.v / max) * 100)}%`;
    const nome = document.createElement('span');
    nome.innerHTML = l.nome;
    const num = document.createElement('span');
    num.textContent = l.v.toLocaleString('pt-BR');
    li.append(barra, nome, num);
    lista.appendChild(li);
  }
  if (linhas.length > 1) {
    const li = document.createElement('li');
    li.className = 'total';
    li.innerHTML = `<span>${t.total}: ${total.toLocaleString('pt-BR')}</span>`;
    lista.appendChild(li);
  }
}

function terminar(resultado, semente) {
  const { textos } = dados;
  som.pararMusica();
  som.tocarSom(resultado.vitoria ? 'vitoria' : 'derrota');
  const sorteadas = resultado.vitoria ? rolarCartas(batalhaAtual, criarRng(semente ^ 0x9e3779b9)) : [];
  let dano = 0;
  if (chefeInvasao) {
    const fim = resultado.eventos[resultado.eventos.length - 1].snap[chefeInvasao.uid];
    dano = Math.max(0, chefeInvasao.vida - Math.max(0, fim ? fim.vida : 0));
  }
  const campanha = !batalhaAtual.tipo;
  const estrelas = resultado.vitoria && campanha
    ? calcularEstrelas(resultado.plantasVivas, resultado.plantasTotal, dados.config.estrelasFase)
    : 0;
  let vidas = {};
  if (batalhaAtual.tipo === 'labirinto') {
    // fração de vida de cada planta no fim da batalha (quem não aparece no último quadro caiu)
    const fim = resultado.eventos[resultado.eventos.length - 1]?.snap || {};
    for (const u of unidadesAtuais.filter((x) => x.lado === 'planta')) {
      const s = fim[u.uid];
      vidas[u.id] = s ? Math.max(0, s.vida) / u.vidaMax : 0;
    }
  }
  const { xp, moedas, orvalho, subiram, subiuJogador, cartas } = jogo.registrarBatalha(batalhaAtual, resultado.vitoria, sorteadas, estrelas, { dano, vidas });
  const invasao = batalhaAtual.tipo === 'invasao';
  atualizarBotoes();

  const caixa = $('resultado');
  caixa.classList.toggle('vitoria', resultado.vitoria);
  $('resultado-titulo').textContent = invasao
    ? preencher(textos.invasao.danoCausado, { dano: dano.toLocaleString('pt-BR') })
    : sortear(resultado.vitoria ? textos.vitoria : textos.derrota);
  let texto;
  if (invasao) texto = preencher(textos.vitoriaTexto, { moedas, xp });
  else if (batalhaAtual.tipo === 'treino') texto = textos.treinoTexto;
  else if (batalhaAtual.tipo === 'labirinto') texto = resultado.vitoria ? textos.labirinto.salaVencida : textos.labirinto.salaPerdida;
  else if (resultado.vitoria && !moedas && !xp) texto = textos.semPremioTexto;
  else if (resultado.vitoria) texto = preencher(textos.vitoriaTexto, { moedas, xp }) + (orvalho ? ` · +${orvalho} 💧` : '');
  else texto = preencher(textos.derrotaTexto, { xp });
  $('resultado-texto').textContent = texto;

  const somaDano = somarDano(resultado.eventos);
  mostrarDano(somaDano, 'causado');
  $('aba-dano-causado').onclick = () => mostrarDano(somaDano, 'causado');
  $('aba-dano-recebido').onclick = () => mostrarDano(somaDano, 'recebido');

  const niveis = $('resultado-niveis');
  niveis.innerHTML = '';
  for (const s of subiram) {
    const p = dados.plantas.find((x) => x.id === s.id);
    const li = document.createElement('li');
    li.textContent = preencher(textos.subiuNivel, { emoji: p.emoji, nome: p.nome, nivel: s.nivel });
    niveis.appendChild(li);
  }
  const extras = [];
  if (subiuJogador) {
    extras.push(preencher(textos.jogadorSubiu, { nivel: jogo.estado.nivel, orvalho: dados.config.jogador.orvalhoPorNivel * subiuJogador }));
    const vagas = jogo.vagasTime();
    if (vagas > jogo.vagasTime(jogo.estado.nivel - subiuJogador)) extras.push(preencher(textos.vagaLiberada, { vagas }));
  }
  for (const { missao } of jogo.missoesAtivas().filter((x) => x.completa && !missoesAntes.has(x.missao.id))) {
    extras.push(`📜 ${preencher(textos.missaoCompleta, { titulo: missao.titulo })}`);
  }
  for (const texto of extras) {
    const li = document.createElement('li');
    li.className = 'destaque';
    li.textContent = texto;
    niveis.appendChild(li);
  }

  $('resultado-estrelas').innerHTML = resultado.vitoria && campanha
    ? [1, 2, 3].map((n) => `<span class="${n <= estrelas ? 'ganha' : ''}" style="animation-delay:${0.2 + n * 0.25}s">⭐</span>`).join('')
    : '';
  $('btn-proxima').classList.toggle('escondido', !(resultado.vitoria && acoes.proxima(batalhaAtual)));
  $('btn-proxima').textContent = textos.botaoProxima[batalhaAtual.tipo || 'campanha'];
  $('btn-sair-batalha').textContent = textos.botaoSair[batalhaAtual.tipo || 'campanha'];
  // na torre, depois de vencer, o caminho é subir (repetir o andar não dá nada)
  $('btn-de-novo').classList.toggle('escondido', (resultado.vitoria && batalhaAtual.tipo === 'torre') || batalhaAtual.tipo === 'labirinto');

  const area = $('resultado-cartas');
  area.innerHTML = '';
  if ((resultado.vitoria || invasao) && !cartas.length && batalhaAtual.tipo !== 'labirinto') area.innerHTML = `<p>${textos.semCartas}</p>`;
  cartas.forEach((id, i) => {
    const c = dados.cartas.find((x) => x.id === id);
    if (!c) return;
    const div = document.createElement('div');
    div.className = `carta ${c.raridade}`;
    div.style.animationDelay = `${0.3 + i * 0.2}s`;
    div.innerHTML = `<span>${c.emoji}</span><small>${c.nome}</small>`;
    area.appendChild(div);
  });
  caixa.classList.remove('escondido');
}

// ---------- Desenho ----------

function desenhar() {
  loopId = requestAnimationFrame(desenhar);
  if (!W) { medir(); if (!W) return; }
  const t = agora();
  let tx = 0, ty = 0;
  if (tremor > 0.2) {
    tx = (Math.random() - 0.5) * tremor;
    ty = (Math.random() - 0.5) * tremor;
    tremor *= 0.86;
  } else tremor = 0;
  for (const c of [ctx, fundo]) {
    c.save();
    c.clearRect(0, 0, W, H);
    c.translate(tx, ty);
  }
  camada.style.transform = `translate(${tx}px, ${ty}px)`;

  desenharGrama();
  Object.values(vis).sort((a, b) => a.y - b.y).forEach(desenharUnidade);
  desenharOndas(t);
  desenharProjeteis(t);
  desenharParticulas();
  desenharSelos(t);
  desenharFlutuantes(t);
  desenharBanner(t);
  ctx.restore();
  fundo.restore();
  if (clarao > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${clarao})`;
    ctx.fillRect(0, 0, W, H);
    clarao *= 0.8;
  }
}

function desenharGrama() {
  // Quadrados de verdade: o lado vem da largura; as linhas preenchem a altura, centralizadas.
  const colunas = 8;
  const lado = W / colunas;
  const linhas = Math.ceil(H / lado);
  const topo = (H - linhas * lado) / 2;
  for (let i = 0; i < colunas; i++) {
    for (let j = 0; j < linhas; j++) {
      fundo.fillStyle = (i + j) % 2 ? '#4caf2e' : '#43a326';
      fundo.fillRect(i * lado, topo + j * lado, lado + 1, lado + 1);
    }
  }
  fundo.strokeStyle = 'rgba(255,255,255,.25)';
  fundo.setLineDash([8, 8]);
  fundo.lineWidth = 2;
  fundo.beginPath();
  fundo.moveTo(W / 2, 8);
  fundo.lineTo(W / 2, H - 8);
  fundo.stroke();
  fundo.setLineDash([]);
}

function desenharUnidade(v) {
  const r = raio * (v.chefe ? 1.35 : 1);
  v.ox += (v.dx - v.ox) * 0.35;
  v.oy += (v.dy - v.oy) * 0.35;
  v.alpha += ((v.vida > 0 ? 1 : 0.18) - v.alpha) * 0.12;
  v.flash *= 0.85;
  v.kx *= 0.82;
  v.estica *= 0.86;
  const x = v.x + v.ox + v.kx;
  const y = v.y + v.oy;
  const vivo = v.vida > 0;
  const t = agora() / 1000;

  // sombra e brilho ficam no fundo, embaixo da planta
  fundo.save();
  fundo.globalAlpha = v.alpha;
  fundo.fillStyle = 'rgba(0,0,0,.25)';
  fundo.beginPath();
  fundo.ellipse(x, y + r * 0.75, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
  fundo.fill();
  if (v.brilho > 0) {
    const g = fundo.createRadialGradient(x, y, r * 0.2, x, y, r * 1.4);
    g.addColorStop(0, 'rgba(255,240,140,.75)');
    g.addColorStop(1, 'rgba(255,210,60,0)');
    fundo.fillStyle = g;
    fundo.beginPath();
    fundo.arc(x, y, r * 1.4, 0, Math.PI * 2);
    fundo.fill();
  }
  fundo.restore();

  ctx.save();
  ctx.globalAlpha = v.alpha;

  // Corpo: respira parado, estica ao atacar, amassa ao levar golpe, tomba ao cair.
  const lento = v.sono > 0 ? 0.45 : 1;
  const resp = vivo ? Math.sin(t * 3.2 * lento + v.fase) * 0.045 : 0;
  const amassa = Math.min(0.25, Math.abs(v.kx) / r * 0.35);
  const sx = 1 - resp + v.estica * 0.22 + amassa;
  const sy = 1 + resp - v.estica * 0.12 - amassa;
  const lado = r * 2.15;
  const base = y + r * 0.82;
  let giro = 0;
  if (!vivo) giro = (v.lado === 'planta' ? -1 : 1) * 0.5;
  else if (v.sono > 0) giro = Math.sin(t * 1.5 + v.fase) * 0.06;
  if (v.el) {
    const st = v.el.style;
    if (v.ladoEl !== lado) { st.width = `${lado}px`; st.height = `${lado}px`; v.ladoEl = lado; }
    st.transform = `translate(${x - lado / 2}px, ${base - lado}px) rotate(${giro}rad) scale(${sx}, ${sy})`;
    st.opacity = v.alpha;
    st.zIndex = Math.round(y);
    v.elBranca.style.opacity = v.flash > 0.05 ? Math.min(1, v.flash * 0.9) : 0;
  } else {
    ctx.font = `${r * 1.5}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; // cor opaca, senão o emoji fica transparente no Chrome
    ctx.fillText(v.emoji, x, base - r * 0.82);
  }

  if (v.escudo > 0 && vivo) {
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r * 1.15);
    g.addColorStop(0, 'rgba(255,255,255,.45)');
    g.addColorStop(0.6, 'rgba(127,227,255,.12)');
    g.addColorStop(1, 'rgba(127,227,255,.4)');
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(160,236,255,.95)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (vivo) {
    const larg = r * 2;
    const bx = x - larg / 2;
    const by = y + r + 4;
    const pv = v.vida / v.vidaMax;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath();
    ctx.roundRect(bx - 1.5, by - 1.5, larg + 3, 13, 3);
    ctx.fill();
    ctx.fillStyle = pv > 0.5 ? '#5cc23a' : pv > 0.25 ? '#ffb020' : '#e5483a';
    ctx.fillRect(bx, by, larg * pv, 6);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(bx, by, larg * pv, 2);
    if (v.escudo > 0) {
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(bx - 1, by - 7, larg + 2, 6);
      ctx.fillStyle = '#7fe3ff';
      ctx.fillRect(bx, by - 6, larg * Math.min(1, Math.max(0.12, v.escudo / v.vidaMax)), 4);
    }
    ctx.fillStyle = v.seiva >= 100 ? '#ffd23a' : '#3a9ee6';
    ctx.fillRect(bx, by + 7, larg * (v.seiva / 100), 3);

    // ícones de status numa fileira em cima da cabeça
    const sts = Array.isArray(v.status) ? [...v.status] : [];
    if (v.sono > 0) sts.unshift('sono');
    if (v.lento > 0) sts.push('lento');
    if (sts.length) {
      const tam = Math.max(14, r * 0.5);
      const x0 = x - ((sts.length - 1) * tam * 0.9) / 2;
      sts.forEach((n, i) => {
        const ic = imagemStatus(n);
        const yy = y - r * 1.25 + Math.sin(t * 4 + i) * 1.5;
        if (ic.pronta) ctx.drawImage(ic.img, x0 + i * tam * 0.9 - tam / 2, yy - tam / 2, tam, tam);
      });
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.max(10, r * 0.32)}px "Trebuchet MS", sans-serif`;
    const rotulo = `Nv${v.nivel}${v.rank ? ` ✦${v.rank}` : ''}${v.fusao ? ' 🧬' : ''}`;
    ctx.fillStyle = v.rank ? '#ffd23a' : '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 3;
    ctx.strokeText(rotulo, x, by + 20);
    ctx.fillText(rotulo, x, by + 20);
  }
  ctx.restore();
}

function desenharProjeteis(t) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${raio * 0.8}px serif`;
  ctx.fillStyle = '#000';
  projeteis = projeteis.filter((p) => {
    const k = (t - p.t0) / p.dur;
    if (k < 0) return true;
    if (k >= 1) { p.resolver(); return false; }
    const x = p.x0 + (p.x1 - p.x0) * k;
    const y = p.y0 + (p.y1 - p.y0) * k - Math.sin(Math.PI * k) * raio;
    const tiro = p.tiro;
    if (!tiro || !tiro.pronta) { ctx.fillText(p.emoji, x, y); return true; }
    // rastro: faíscas que ficam pra trás
    if (Math.random() < 0.8) {
      particulas.push({ x, y, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, leve: true,
        cor: tiro.rastro, tam: (p.especial ? 3 : 2) + Math.random() * 2.5, vida: 0.7, forma: 'bola', ang: 0 });
    }
    // direção do voo (derivada da curva) ou giro
    const dx = p.x1 - p.x0;
    const dy = p.y1 - p.y0 - Math.cos(Math.PI * k) * Math.PI * raio;
    const ang = tiro.gira ? (t - p.t0) / 60 : Math.atan2(dy, dx);
    const tam = raio * (p.especial ? 1.15 : 0.9);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    if (p.especial) {
      ctx.shadowColor = tiro.rastro;
      ctx.shadowBlur = 12;
    }
    ctx.drawImage(tiro.img, -tam / 2, -tam / 2, tam, tam);
    ctx.restore();
    return true;
  });
}

function desenharParticulas() {
  particulas = particulas.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    if (!p.leve) p.vy += raio * 0.012;
    p.vida -= p.leve ? 0.025 : 0.035;
    if (p.vida <= 0) return false;
    ctx.globalAlpha = Math.min(1, p.vida);
    ctx.fillStyle = p.cor;
    ctx.strokeStyle = 'rgba(43,29,20,.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (p.forma === 'mais') {
      const s = p.tam;
      ctx.rect(p.x - s, p.y - s / 3, s * 2, s * 2 / 3);
      ctx.rect(p.x - s / 3, p.y - s, s * 2 / 3, s * 2);
      ctx.fill();
    } else if (p.forma === 'estrela') {
      const s = p.tam * 1.2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + p.vida * 3;
        const rr = i % 2 ? s * 0.4 : s;
        ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (p.forma === 'espinho') {
      const s = p.tam * 1.6;
      const c = Math.cos(p.ang), sn = Math.sin(p.ang);
      ctx.moveTo(p.x + c * s, p.y + sn * s);
      ctx.lineTo(p.x - sn * s * 0.3, p.y + c * s * 0.3);
      ctx.lineTo(p.x + sn * s * 0.3, p.y - c * s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.arc(p.x, p.y, p.tam, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return true;
  });
}

function desenharOndas(t) {
  ondas = ondas.filter((o) => {
    const k = (t - o.t0) / o.dur;
    if (k >= 1) return false;
    if (k < 0) return true;
    const e = 1 - (1 - k) * (1 - k);
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = o.cor;
    ctx.lineWidth = 2 + 5 * (1 - k);
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r0 + (o.r1 - o.r0) * e, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return true;
  });
}

// ícone do status que acabou de pegar: pula e some
function desenharSelos(t) {
  selos = selos.filter((s) => {
    const k = (t - s.t0) / s.dur;
    if (k >= 1) return false;
    const ic = imagemStatus(s.nome);
    if (!ic.pronta) return true;
    const tam = raio * (0.6 + Math.sin(Math.min(1, k * 3) * Math.PI) * 0.5);
    ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    ctx.drawImage(ic.img, s.x - tam / 2, s.y - raio * 0.5 * k - tam / 2, tam, tam);
    ctx.globalAlpha = 1;
    return true;
  });
}

function desenharFlutuantes(t) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  flutuantes = flutuantes.filter((f) => {
    const k = (t - f.t0) / f.dur;
    if (k >= 1) return false;
    const pico = f.grande ? 1.5 : 1.25;
    const escala = k < 0.12 ? 0.4 + (k / 0.12) * (pico - 0.4) : pico - Math.min(pico - 1, (k - 0.12) * 2);
    ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    ctx.font = `900 ${f.tam * escala}px "Trebuchet MS", sans-serif`;
    const y = f.y - 45 * k;
    ctx.strokeStyle = '#2a1600';
    ctx.lineWidth = f.grande ? 7 : 5;
    ctx.strokeText(f.texto, f.x, y);
    ctx.fillStyle = f.cor;
    ctx.fillText(f.texto, f.x, y);
    ctx.globalAlpha = 1;
    return true;
  });
}

function desenharBanner(t) {
  if (!banner) return;
  const k = (t - banner.t0) / banner.dur;
  if (k >= 1) { banner = null; return; }
  ctx.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
  ctx.font = '900 16px "Trebuchet MS", sans-serif';
  const ic = banner.hab ? imagemHabilidade(banner.hab) : null;
  const comIcone = ic && ic.pronta;
  const extra = comIcone ? 26 : 0;
  const larg = ctx.measureText(banner.texto).width + 20 + extra;
  const x = Math.min(Math.max(banner.x, larg / 2 + 4), W - larg / 2 - 4);
  const y = Math.max(banner.y, 18);
  const pop = k < 0.1 ? 0.6 + (k / 0.1) * 0.4 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  ctx.fillStyle = 'rgba(35,48,27,.92)';
  ctx.strokeStyle = banner.hab ? corHabilidade(banner.hab) : '#ffd23a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-larg / 2, -14, larg, 28, 14);
  ctx.fill();
  ctx.stroke();
  if (comIcone) ctx.drawImage(ic.img, -larg / 2 + 1, -16, 32, 32);
  ctx.fillStyle = '#ffd23a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(banner.texto, extra / 2 + 2, 1);
  ctx.restore();
  ctx.globalAlpha = 1;
}
