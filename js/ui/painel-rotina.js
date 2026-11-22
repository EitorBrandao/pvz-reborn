// Rotina diária na tela da horta: Canteiro (3 vasos), Expedição e Calendário de presença.

import { arte } from '../arte.js';
import { $, mostrarCartasAgrupadas, avisar, preencher, curto } from './comum.js';
import * as jogo from '../estado.js';
import * as som from '../som.js';

let dados;
let aoMudar;
let aberto = null;         // o que está aberto na janela: 'vaso', 'expedicao', 'presenca', 'ronda' ou 'resultado'
let vasoAberto = 0;
let destinoEscolhido = null;
let escolhidas = [];

export function iniciarRotina(d, mudou) {
  dados = d;
  aoMudar = mudou;
  $('btn-ronda').addEventListener('click', abrirRonda);
  $('rotina-modal').addEventListener('click', (e) => {
    if (e.target.id === 'rotina-modal' || e.target.closest('.rotina-fechar')) fechar();
  });
  setInterval(() => {
    if ($('tela-base').classList.contains('ativa')) desenharRotina();
  }, 1000);
}

const t = () => dados.textos.rotina;

function formatar(ms) {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${seg}` : `${m}:${seg}`;
}

// 3h24 / 45min
function formatarDuracao(ms) {
  const min = Math.round(ms / 60000);
  const h = Math.floor(min / 60);
  return h ? `${h}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}` : `${min}min`;
}

function nomesCartas(cartas) {
  return cartas.map((id) => dados.cartas.find((c) => c.id === id)?.emoji || '').join(' ');
}

function textoPremio(p) {
  const partes = [];
  if (p.moedas) partes.push(`🪙 ${curto(p.moedas)}`);
  if (p.orvalho) partes.push(`💧 ${curto(p.orvalho)}`);
  for (const [id, qtd] of Object.entries(p.cartas || {})) {
    const c = dados.cartas.find((x) => x.id === id);
    if (c) partes.push(`${c.emoji}${qtd > 1 ? `×${qtd}` : ''}`);
  }
  return partes.join(' ');
}

// ---------- Fileira da horta ----------

export function desenharRotina() {
  const area = $('rotina');
  if (!area.childElementCount) {
    for (let i = 0; i < dados.rotina.canteiro.vasos; i++) {
      const b = document.createElement('button');
      b.className = 'vaso';
      b.addEventListener('click', () => tocarVaso(i));
      area.appendChild(b);
    }
    const b = document.createElement('button');
    b.className = 'vaso vaso-expedicao';
    b.addEventListener('click', abrirExpedicao);
    area.appendChild(b);
  }
  const botoes = area.children;
  const estagios = dados.rotina.canteiro.estagios;
  for (let i = 0; i < dados.rotina.canteiro.vasos; i++) {
    const info = jogo.vasoInfo(i);
    let emoji = '🟫';
    let texto = t().plantar;
    if (!info.vazio) {
      emoji = info.pronto ? info.muda.emoji : estagios[Math.min(estagios.length - 1, Math.floor(info.progresso * estagios.length))];
      texto = info.pronto ? t().colher : formatar(info.falta);
    }
    botoes[i].className = 'vaso' + (info.pronto ? ' pronto' : '') + (info.vazio ? ' vazio' : '');
    botoes[i].innerHTML = `<span>${emoji}</span><small>${texto}</small>`;
  }
  const exp = jogo.expedicaoInfo();
  const b = botoes[dados.rotina.canteiro.vasos];
  b.className = 'vaso vaso-expedicao' + (exp && exp.pronta ? ' pronto' : '');
  b.innerHTML = `<span>${exp ? exp.destino.emoji : '🧭'}</span><small>${
    !exp ? t().expedicao : exp.pronta ? t().receber : formatar(exp.falta)}</small>`;
  if (aberto === 'expedicao' && exp) desenharExpedicao();
  desenharBotaoRonda();
}

// ---------- Janela ----------

function abrirJanela(qual, html) {
  aberto = qual;
  $('rotina-conteudo').innerHTML = `<button class="fechar rotina-fechar" aria-label="Fechar">✖</button>${html}`;
  $('rotina-modal').classList.remove('escondido');
}

function fechar() {
  aberto = null;
  $('rotina-modal').classList.add('escondido');
}

// ---------- Canteiro ----------

function tocarVaso(i) {
  const info = jogo.vasoInfo(i);
  if (info.pronto) {
    const r = jogo.colherVaso(i);
    if (r.ok) avisar(preencher(t().colheu, { emoji: r.muda.emoji, moedas: r.moedas, cartas: nomesCartas(r.cartas) }).trim());
    aoMudar();
    return;
  }
  if (!info.vazio) return avisar(preencher(t().crescendo, { nome: info.muda.nome, tempo: formatar(info.falta) }));
  vasoAberto = i;
  const lista = dados.rotina.canteiro.mudas.map((m) => {
    const bloqueada = jogo.estado.nivel < m.nivelMin;
    const tempo = m.minutos >= 60 ? `${m.minutos / 60}h` : `${m.minutos}min`;
    const cartas = m.cartas.map((c) => dados.cartas.find((x) => x.id === c.carta)?.emoji).join('');
    return `<button class="linha-escolha${bloqueada ? ' bloqueada' : ''}" data-muda="${m.id}">
      <span class="escolha-emoji">${bloqueada ? '🔒' : m.emoji}</span>
      <span class="escolha-info"><b>${m.nome} · ⏱️ ${tempo}</b>
        <small>${bloqueada ? preencher(t().nivelMin, { nivel: m.nivelMin }) : `${t().colhe} 🪙 ${curto(m.moedas)} ${cartas}`}</small></span>
      <span class="escolha-preco">🪙 ${m.custo}</span>
    </button>`;
  }).join('');
  abrirJanela('vaso', `<h3>${t().escolherMuda}</h3><p class="dica-pequena">${t().mudaDica}</p><div class="lista-escolha">${lista}</div>`);
  $('rotina-conteudo').querySelectorAll('[data-muda]').forEach((b) => b.addEventListener('click', () => {
    const r = jogo.plantarMuda(vasoAberto, b.dataset.muda);
    if (!r.ok) return avisar(dados.textos[r.erro] || t()[r.erro]);
    fechar();
    aoMudar();
  }));
}

// ---------- Expedição ----------

function abrirExpedicao() {
  const exp = jogo.expedicaoInfo();
  if (exp && exp.pronta) {
    const r = jogo.receberExpedicao();
    if (r.ok) {
      const subiram = r.subiram.map((s) => arte(dados.plantas.find((p) => p.id === s.id))).join('');
      abrirJanela('resultado', `<h3>${t().voltaram}</h3>
        <p class="rotina-premio">🪙 ${curto(r.moedas)} · ✨ ${curto(r.xp)} XP ${nomesCartas(r.cartas)}</p>
        ${subiram ? `<p>${preencher(t().subiramNivel, { plantas: subiram })}</p>` : ''}
        <button class="btn btn-laranja rotina-fechar">${t().oba}</button>`);
    }
    aoMudar();
    return;
  }
  if (!exp) {
    destinoEscolhido = destinoEscolhido || dados.rotina.expedicao.destinos[0].id;
    escolhidas = escolhidas.filter((id) => podeIr(id));
  }
  aberto = 'expedicao';
  desenharExpedicao();
  $('rotina-modal').classList.remove('escondido');
}

function podeIr(id) {
  return jogo.estado.colecao[id] && !jogo.estado.time.some((m) => m.planta === id);
}

function desenharExpedicao() {
  const exp = jogo.expedicaoInfo();
  const caixa = $('rotina-conteudo');
  const botaoFechar = '<button class="fechar rotina-fechar" aria-label="Fechar">✖</button>';
  if (exp) {
    const plantas = exp.plantas.map((id) => arte(dados.plantas.find((p) => p.id === id))).join(' ');
    caixa.innerHTML = `${botaoFechar}<h3>${exp.destino.emoji} ${exp.destino.nome}</h3>
      <p class="rotina-plantas">${plantas}</p>
      <div class="barra-xp grande"><span style="width:${exp.progresso * 100}%"></span></div>
      <p>${preencher(t().voltaEm, { tempo: formatar(exp.falta) })}</p>
      <p class="dica-pequena">${t().viajandoDica}</p>`;
    return;
  }
  const max = dados.rotina.expedicao.maxPlantas;
  // Com plantas escolhidas, cada destino mostra o prêmio e o tempo de verdade
  const destinos = dados.rotina.expedicao.destinos.map((d) => {
    const cartas = d.cartas.map((c) => dados.cartas.find((x) => x.id === c.carta)?.emoji).join('');
    const p = escolhidas.length ? jogo.previaExpedicao(d.id, escolhidas) : null;
    const tempo = p ? formatarDuracao(p.duracao) : `${d.horas}h`;
    const corte = p && p.reducao ? ` <span class="reducao">-${Math.round(p.reducao * 100)}%</span>` : '';
    const premio = p
      ? preencher(t().previa, { moedas: p.moedas, xp: p.xpTotal })
      : preencher(t().porPlanta, { moedas: d.moedasPorPlanta, xp: d.xpPorPlanta });
    return `<button class="linha-escolha${d.id === destinoEscolhido ? ' marcada' : ''}" data-destino="${d.id}">
      <span class="escolha-emoji">${d.emoji}</span>
      <span class="escolha-info"><b>${d.nome} · ⏱️ ${tempo}${corte}</b>
        <small>${premio} ${cartas}</small></span>
    </button>`;
  }).join('');
  const livres = dados.plantas.filter((p) => podeIr(p.id));
  const plantas = livres.length
    ? livres.map((p) => `<button class="escolha-planta${escolhidas.includes(p.id) ? ' marcada' : ''}" data-planta="${p.id}">
        <span>${arte(p)}</span><small>Nv ${jogo.estado.colecao[p.id].nivel}</small>
        <small class="estrelas-mini">${'⭐'.repeat(jogo.estado.colecao[p.id].estrelas)}</small></button>`).join('')
    : `<p class="dica-pequena">${t().semPlantasLivres}</p>`;
  caixa.innerHTML = `${botaoFechar}<h3>🧭 ${t().expedicao}</h3>
    <p class="dica-pequena">${t().expedicaoDica}</p>
    <div class="lista-escolha">${destinos}</div>
    <h4>${preencher(t().quemVai, { qtd: escolhidas.length, max })}</h4>
    <p class="dica-pequena">${t().forcaDica}</p>
    <div class="grade-escolha">${plantas}</div>
    <button id="expedicao-enviar" class="btn btn-laranja btn-largo">${t().enviar}</button>`;
  caixa.querySelectorAll('[data-destino]').forEach((b) => b.addEventListener('click', () => {
    destinoEscolhido = b.dataset.destino;
    desenharExpedicao();
  }));
  caixa.querySelectorAll('[data-planta]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.planta;
    if (escolhidas.includes(id)) escolhidas = escolhidas.filter((x) => x !== id);
    else if (escolhidas.length >= max) return avisar(preencher(t().expedicaoCheia, { max }));
    else escolhidas.push(id);
    desenharExpedicao();
  }));
  $('expedicao-enviar').addEventListener('click', () => {
    const r = jogo.enviarExpedicao(destinoEscolhido, escolhidas);
    if (!r.ok) return avisar(t()[r.erro] || dados.textos[r.erro]);
    escolhidas = [];
    avisar(t().enviou);
    fechar();
    aoMudar();
  });
}

// ---------- Calendário de presença ----------

// Abre sozinho quando ainda não pegou o prêmio de hoje
export function mostrarPresenca() {
  const hojeIndice = jogo.presencaPendente();
  if (hojeIndice < 0) return;
  const dias = dados.rotina.presenca.premios.map((p, i) => `
    <div class="dia-presenca${i < hojeIndice ? ' pego' : ''}${i === hojeIndice ? ' hoje' : ''}${i === 6 ? ' grande' : ''}">
      <small>${preencher(t().dia, { n: i + 1 })}</small>
      <span>${i < hojeIndice ? '✅' : textoPremio(p)}</span>
    </div>`).join('');
  abrirJanela('presenca', `<h3>📅 ${t().presencaTitulo}</h3>
    <p class="dica-pequena">${t().presencaDica}</p>
    <div class="grade-presenca">${dias}</div>
    <button id="presenca-pegar" class="btn btn-laranja btn-largo">${t().pegar}</button>`);
  $('presenca-pegar').addEventListener('click', () => {
    const r = jogo.resgatarPresenca();
    if (r.ok) avisar(preencher(t().pegou, { premio: textoPremio(r.premio) }));
    fechar();
    aoMudar();
  });
}

// ---------- Ronda da Horta ----------

function desenharBotaoRonda() {
  const b = $('btn-ronda');
  if (!jogo.rondaLiberada()) {
    b.className = 'botao-ronda bloqueada';
    b.innerHTML = `🔒 🧺 ${t().ronda} <small>${preencher(t().nivelMin, { nivel: dados.rotina.ronda.nivelMin })}</small>`;
    return;
  }
  const n = jogo.rondaProntos();
  b.className = 'botao-ronda' + (n ? ' pronto' : ' vazio');
  b.innerHTML = n ? `🧺 ${t().ronda} <span class="selo-ronda">${n}</span>` : `🧺 ${t().ronda} <small>${t().rondaNada}</small>`;
}

const emojiPlanta = (id) => arte(dados.plantas.find((p) => p.id === id));

function linhaRonda(item) {
  const tx = t();
  let emoji;
  let titulo;
  let detalhe = '';
  let valor = tx.gratis;
  if (item.tipo === 'vaso') {
    emoji = item.muda.emoji;
    titulo = preencher(tx.rondaVaso, { n: item.i + 1, nome: item.muda.nome });
    detalhe = `${tx.colhe} 🪙 ${curto(item.muda.moedas)}`;
    if (item.replanta) {
      titulo += ` ${preencher(tx.rondaVasoReplanta, { nome: item.replanta.nome })}`;
      valor = `-🪙 ${item.replanta.custo}`;
    } else {
      const motivo = item.motivo === 'semMoedas' ? tx.rondaSemMoedas : item.motivo === 'mudaBloqueada' ? tx.rondaMudaBloqueada : tx.rondaVasoSoColhe;
      titulo += ` (${motivo})`;
    }
  } else if (item.tipo === 'expedicao') {
    emoji = item.destino.emoji;
    titulo = item.vao.length ? preencher(tx.rondaExpedicao, { destino: item.destino.nome }) : tx.rondaExpedicaoSoReceber;
    detalhe = [item.vao.map(emojiPlanta).join(' '), item.ficam.length ? preencher(tx.rondaFicam, { plantas: item.ficam.map(emojiPlanta).join(' ') }) : '']
      .filter(Boolean).join(' · ');
  } else {
    emoji = { presenca: '📅', arena: '🏆', invasao: '👾' }[item.tipo];
    titulo = item.tipo === 'presenca' ? preencher(tx.rondaPresenca, { n: item.dia + 1 })
      : preencher(item.tipo === 'arena' ? tx.rondaArena : tx.rondaInvasao, { pos: item.posicao });
    detalhe = textoPremio(item.premio);
  }
  return `<div class="linha-ronda"><span class="escolha-emoji">${emoji}</span>
    <span class="escolha-info"><b>${titulo}</b>${detalhe ? `<small>${detalhe}</small>` : ''}</span>
    <span class="escolha-preco">${valor}</span></div>`;
}

function abrirRonda() {
  if (!jogo.rondaLiberada()) return avisar(preencher(t().rondaBloqueada, { nivel: dados.rotina.ronda.nivelMin }));
  const replantar = jogo.estado.ronda.replantar;
  const p = jogo.previaRonda(replantar);
  if (p.vazio) return avisar(t().rondaVazia);
  abrirJanela('ronda', `<h3>🧺 ${t().rondaTitulo}</h3>
    <p class="dica-pequena">${t().rondaDica}</p>
    <div class="lista-escolha">${p.itens.map(linhaRonda).join('')}</div>
    <label class="chave-ronda"><input id="ronda-replantar" type="checkbox"${replantar ? ' checked' : ''}> ${t().rondaReplantar}</label>
    <p class="total-ronda"><span>${t().rondaCusto}</span><b>${p.custo ? `🪙 ${p.custo}` : t().gratis}</b></p>
    <div class="botoes-ronda">
      <button class="btn rotina-fechar">${t().agoraNao}</button>
      <button id="ronda-fazer" class="btn btn-laranja">${t().fazerRonda}</button>
    </div>`);
  $('ronda-replantar').addEventListener('change', (e) => {
    jogo.definirReplantar(e.target.checked);
    abrirRonda();
  });
  $('ronda-fazer').addEventListener('click', () => {
    const r = jogo.fazerRonda(jogo.estado.ronda.replantar);
    if (!r.ok) { avisar(t()[r.erro]); fechar(); aoMudar(); return; }
    mostrarResumoRonda(r);
    aoMudar();
  });
}

function mostrarResumoRonda(r) {
  const tx = t();
  const partes = [`🪙 +${curto(r.moedas)}`];
  if (r.orvalho) partes.push(`💧 +${curto(r.orvalho)}`);
  if (r.xp) partes.push(`✨ ${r.xp} XP`);
  const linhas = [];
  if (r.replantados.length) {
    linhas.push(`<div class="linha-ronda"><span class="escolha-emoji">🌱</span><span class="escolha-info"><b>${preencher(tx.rondaReplantados, { n: r.replantados.length })}</b></span><span class="escolha-preco">-🪙 ${r.custo}</span></div>`);
  }
  if (r.expedicao) {
    linhas.push(`<div class="linha-ronda"><span class="escolha-emoji">${r.expedicao.destino.emoji}</span><span class="escolha-info"><b>${tx.rondaVoltouSaiu}</b><small>${r.expedicao.plantas.map(emojiPlanta).join(' ')}</small></span><span class="escolha-preco">${preencher(tx.rondaVoltaEm, { tempo: formatarDuracao(r.expedicao.falta) })}</span></div>`);
  }
  if (r.subiram.length) linhas.push(`<p>${preencher(tx.subiramNivel, { plantas: r.subiram.map((s) => emojiPlanta(s.id)).join('') })}</p>`);
  abrirJanela('resultado', `<h3>${tx.rondaFeita}</h3>
    <p class="rotina-premio">${partes.join(' · ')}</p>
    <div id="ronda-cartas" class="cartas"></div>
    ${linhas.join('')}
    <button class="btn btn-laranja btn-largo rotina-fechar">${tx.oba}</button>`);
  mostrarCartasAgrupadas($('ronda-cartas'), r.cartas, dados);
  som.tocarSom('ronda');
}
