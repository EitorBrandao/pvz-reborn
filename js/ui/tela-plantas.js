// Tela de plantas: coleção, cartas, pacote de sementes e evolução de cada planta.

import { $, mostrarTela, avisar, preencher } from './comum.js';
import * as jogo from '../estado.js';
import { atributos, poder, xpParaProximo, nivelMaximo, custoAscensao, podeAscender, custoEstrela, custoEquip, temCartas, habilidadeComEstrelas } from '../evolucao.js';
import * as som from '../som.js';

let dados;
let aberta = null;      // id da planta aberta no detalhe
let mudanca = null;     // { antes, depois } pra mostrar o quanto ficou mais forte

const ATRIBUTOS = ['vida', 'atq', 'def', 'vel'];

// Ordenação da coleção (lembrada só neste aparelho)
const ORDENS = [
  { id: 'padrao', rotulo: '↕️ Padrão' },
  { id: 'poder', rotulo: '↕️ 💪 Poder' },
  { id: 'nivel', rotulo: '↕️ Nível' },
  { id: 'estrela', rotulo: '↕️ Estrela' },
];
let ordem = 'padrao';
try { ordem = localStorage.getItem('horta-ordem-colecao') || 'padrao'; } catch { /* sem storage */ }
if (!ORDENS.some((o) => o.id === ordem)) ordem = 'padrao';

export function iniciarTelaPlantas(d, voltar) {
  dados = d;
  $('plantas-voltar').addEventListener('click', voltar);
  $('btn-pacote-moedas').addEventListener('click', () => mostrarPacote(jogo.comprarPacote('moedas')));
  $('btn-pacote-orvalho').addEventListener('click', () => mostrarPacote(jogo.comprarPacote('orvalho')));
  const lote = dados.config.pacote.lote;
  $('btn-pacote-moedas-lote').addEventListener('click', () => mostrarPacote(jogo.comprarPacotes('moedas', lote)));
  $('btn-pacote-orvalho-lote').addEventListener('click', () => mostrarPacote(jogo.comprarPacotes('orvalho', lote)));
  $('usar-quantos').addEventListener('click', (e) => { if (e.target.id === 'usar-quantos') $('usar-quantos').classList.add('escondido'); });
  $('usar-1').addEventListener('click', () => usarCarta(1));
  $('usar-lote').addEventListener('click', () => usarCarta(usarLote));
  $('detalhe-fechar').addEventListener('click', fecharDetalhe);
  $('detalhe').addEventListener('click', (e) => { if (e.target.id === 'detalhe') fecharDetalhe(); });
  $('detalhe-fechar-baixo').addEventListener('click', fecharDetalhe);
  // Fecha o resultado do pacote tocando em qualquer lugar
  $('pacote-resultado').addEventListener('click', () => { $('pacote-resultado').classList.add('escondido'); desenhar(); });
  $('detalhe-conteudo').addEventListener('click', acaoDetalhe);
  $('btn-ordenar').addEventListener('click', trocarOrdem);
  $('troca-fechar').addEventListener('click', fecharTroca);
  $('troca-mudas').addEventListener('click', (e) => { if (e.target.id === 'troca-mudas') fecharTroca(); });
  $('troca-planta').addEventListener('click', () => { fecharTroca(); usarComLote(carta(dados.config.troca.carta)); });
  $('troca-material').addEventListener('click', () => { fecharTroca(); mostrarMaterial(jogo.trocarMudasPorMaterial()); });

  const { pacote } = dados.config;
  $('btn-pacote-moedas').textContent = `🌱 Pacote 🪙${pacote.moedas}`;
  $('btn-pacote-orvalho').textContent = `🌱 Pacote 💧${pacote.orvalho}`;
  $('btn-pacote-moedas-lote').textContent = `🌱×${lote} 🪙${pacote.moedas * lote}`;
  $('btn-pacote-orvalho-lote').textContent = `🌱×${lote} 💧${pacote.orvalho * lote}`;
}

export function abrirTelaPlantas() {
  aberta = null;
  desenhar();
  mostrarTela('tela-plantas');
}

function base(id) {
  return dados.plantas.find((p) => p.id === id);
}

function carta(id) {
  return dados.cartas.find((c) => c.id === id);
}

function estrelasTexto(n) {
  const max = dados.config.evolucao.estrelasMax;
  return '⭐'.repeat(n) + '☆'.repeat(max - n);
}

function custoTexto(custo) {
  // Cada item vira uma "pílula" que nunca quebra no meio; vermelha se falta.
  const partes = [];
  if (custo.moedas) partes.push(`<span class="custo-item${jogo.estado.moedas < custo.moedas ? ' falta' : ''}">🪙${custo.moedas}</span>`);
  for (const [id, qtd] of Object.entries(custo.cartas || {})) {
    const tem = jogo.estado.inventario[id] || 0;
    partes.push(`<span class="custo-item${tem < qtd ? ' falta' : ''}">${carta(id).emoji}${tem}/${qtd}</span>`);
  }
  return `<span class="custo">${partes.join('')}</span>`;
}

function erro(resultado) {
  avisar(dados.textos[resultado.erro] || dados.textos.semMaterial);
}

// O que dá pra melhorar agora nessa planta, com o que o jogador tem.
function melhorias(r) {
  const e = jogo.estado;
  const cfg = dados.config.evolucao;
  const treinar = r.nivel < nivelMaximo(r.estrelas, cfg, r.ascensao)
    && dados.cartas.some((c) => c.uso === 'xp' && (e.inventario[c.id] || 0) > 0);
  const ce = custoEstrela(r, cfg);
  const estrela = !!ce && r.copias >= ce.copias && e.moedas >= ce.moedas;
  const equip = {};
  for (const esp of dados.equipamentos.espacos) {
    const c = custoEquip(r, esp.id, dados);
    equip[esp.id] = !!c && e.moedas >= (c.moedas || 0) && temCartas(e.inventario, c.cartas || {});
  }
  const algumEquip = Object.values(equip).some(Boolean);
  const ca = custoAscensao(r, dados);
  const ascender = !!ca && podeAscender(r, cfg) && e.moedas >= ca.moedas && temCartas(e.inventario, ca.cartas);
  return { treinar, estrela, equip, algumEquip, ascender, alguma: treinar || estrela || algumEquip || ascender };
}

function poderDe(p, r, mudancaReg) {
  return poder(atributos(p, r, dados, mudancaReg), dados);
}

function selo(ok) {
  return ok ? ' <span class="selo-melhorar">!</span>' : '';
}

// ---------- Lista ----------

function desenhar() {
  const e = jogo.estado;
  $('plantas-moedas').textContent = e.moedas;
  $('plantas-orvalho').textContent = e.orvalho;
  desenharInventario();
  desenharLista();
  if (aberta) desenharDetalhe();
}

function desenharInventario() {
  const area = $('inventario');
  area.innerHTML = '';
  let vazio = true;
  for (const c of dados.cartas) {
    const qtd = jogo.estado.inventario[c.id] || 0;
    if (!qtd) continue;
    vazio = false;
    const botao = document.createElement('button');
    botao.className = `item-inventario ${c.raridade}`;
    botao.innerHTML = `<span>${c.emoji}</span><b>${qtd}</b>`;
    botao.addEventListener('click', () => {
      if (c.uso === 'troca') return abrirTroca();
      if (c.uso !== 'pacote') return avisar(`${c.nome}: ${c.descricao}`);
      usarComLote(c);
    });
    area.appendChild(botao);
  }
  if (vazio) area.innerHTML = '<p class="dica-pequena">Vença batalhas pra ganhar cartas.</p>';
}

function trocarOrdem() {
  const i = ORDENS.findIndex((o) => o.id === ordem);
  ordem = ORDENS[(i + 1) % ORDENS.length].id;
  try { localStorage.setItem('horta-ordem-colecao', ordem); } catch { /* sem storage */ }
  desenharLista();
}

// Bloqueadas sempre por último; empate mantém a ordem original.
function plantasOrdenadas() {
  const col = jogo.estado.colecao;
  const chave = (p) => {
    const r = col[p.id];
    if (!r) return [-1, -1];
    if (ordem === 'poder') return [poderDe(p, r), r.nivel];
    return ordem === 'estrela' ? [r.estrelas, r.nivel] : [r.nivel, r.estrelas];
  };
  if (ordem === 'padrao') {
    return [...dados.plantas].sort((a, b) => Number(!col[a.id]) - Number(!col[b.id]));
  }
  return [...dados.plantas].sort((a, b) => {
    const [a1, a2] = chave(a);
    const [b1, b2] = chave(b);
    return b1 - a1 || b2 - a2;
  });
}

function desenharLista() {
  const lista = $('colecao');
  lista.innerHTML = '';
  $('btn-ordenar').textContent = ORDENS.find((o) => o.id === ordem).rotulo;
  for (const p of plantasOrdenadas()) {
    const r = jogo.estado.colecao[p.id];
    const botao = document.createElement('button');
    if (!r) {
      botao.className = 'cartao-planta bloqueada';
      botao.innerHTML = `
        <span class="planta-emoji">${p.emoji}</span>
        <b>${p.nome}</b>
        <small>🔒 ${dados.textos.bloqueada}</small>`;
      botao.addEventListener('click', () => avisar(dados.textos.bloqueada));
    } else {
      const cfg = dados.config.evolucao;
      const max = nivelMaximo(r.estrelas, cfg, r.ascensao);
      const pxp = r.nivel >= max ? 1 : r.xp / xpParaProximo(r.nivel, cfg);
      const m = melhorias(r);
      const icones = [m.ascender && '✦', m.estrela && '⭐', m.algumEquip && '🛠️', m.treinar && '📈'].filter(Boolean).join('');
      botao.className = 'cartao-planta' + (m.alguma ? ' pode-evoluir' : '');
      botao.innerHTML = `
        ${m.alguma ? `<span class="aviso-melhorar" title="Dá pra melhorar">⬆️ ${icones}</span>` : ''}
        <span class="planta-emoji">${p.emoji}</span>
        <b>${p.nome}</b>
        <small class="estrelas-peq">${estrelasTexto(r.estrelas)}${r.ascensao ? ` <span class="selo-rank">${dados.ascensao.selos[r.ascensao]}</span>` : ''}</small>
        <small>Nv ${r.nivel}/${max}</small>
        <span class="poder">💪 ${poderDe(p, r)}</span>
        <span class="barra-xp"><span style="width:${pxp * 100}%"></span></span>`;
      botao.addEventListener('click', () => { aberta = p.id; mudanca = null; desenharDetalhe(); });
    }
    lista.appendChild(botao);
  }
}

// ---------- Detalhe ----------

function fecharDetalhe() {
  aberta = null;
  mudanca = null;
  $('detalhe').classList.add('escondido');
  desenhar();
}

function desenharDetalhe() {
  const p = base(aberta);
  const r = jogo.estado.colecao[aberta];
  const cfg = dados.config.evolucao;
  const t = dados.textos;
  const stats = atributos(p, r, dados);
  const max = nivelMaximo(r.estrelas, cfg, r.ascensao);
  const noMax = r.nivel >= max;
  const precisa = xpParaProximo(r.nivel, cfg);
  const m = melhorias(r);

  // Atributos (com o ganho da última evolução, se teve)
  const poderAgora = poder(stats, dados);
  const ganhoPoder = mudanca ? poderAgora - poder(mudanca.antes, dados) : 0;
  const linhaPoder = `<div class="linha-attr linha-poder"><span>${t.poder}</span><b>${poderAgora}${ganhoPoder > 0 ? ` <em class="ganho">+${ganhoPoder}</em>` : ''}</b></div>`;
  const linhas = linhaPoder + ATRIBUTOS.map((a) => {
    const ganho = mudanca ? mudanca.depois[a] - mudanca.antes[a] : 0;
    return `<div class="linha-attr"><span>${t.atributos[a]}</span><b>${stats[a]}${ganho > 0 ? ` <em class="ganho">+${ganho}</em>` : ''}</b></div>`;
  }).join('');

  // Habilidade
  const h = habilidadeComEstrelas(p.habilidade, r.estrelas);
  const textoStatus = (hab) => {
    const a = hab.aplica;
    const st = a && t.status[a.status];
    return st ? ' ' + preencher(st.texto, { valor: Math.round(a.valor * 100), turnos: a.turnos }) : '';
  };
  // Plural: usa o texto "_varios" quando o número passa de 1 (ex.: cura 2 aliados).
  const chaveHab = (hab) => {
    const n = hab.tipo === 'cura' ? hab.alvos : hab.tipo === 'sono' ? hab.turnos : 1;
    return n > 1 && t.habilidades[`${hab.tipo}_varios`] ? `${hab.tipo}_varios` : hab.tipo;
  };
  const textoHab = (hab) => preencher(t.habilidades[chaveHab(hab)] || '', {
    reflete: Math.round((hab.reflete || 0) * 100), turnos: hab.turnos, golpes: hab.golpes,
    reducao: Math.round((hab.reducao || 0) * 100), forca: Math.round((hab.mult || 0) * 100),
    alvos: hab.alvos || 1, seiva: hab.seiva,
    pctVida: Math.round((hab.pctVida || 0) * 100), limite: Math.round((hab.limite || 0) * 100),
    bonus: Math.round((hab.mult || 0) * (hab.bonus || 0) * 100),
  }) + textoStatus(hab);
  const descHab = textoHab(h);
  const fx = dados.faccoes;
  const fac = fx.faccoes.find((f) => f.id === p.faccao);
  const forte = fac && fx.categorias.find((c) => c.id === fac.forteContra);
  const fraco = fac && fx.categorias.find((c) => c.forteContra === fac.id);
  const infoFaccao = fac && forte && fraco ? preencher(t.faccaoInfo, {
    emoji: fac.emoji, nome: fac.nome, forteEmoji: forte.emoji, forteNome: forte.nome, fracoEmoji: fraco.emoji, fracoNome: fraco.nome,
  }) : '';
  const proxEstrela = r.estrelas < cfg.estrelasMax
    ? preencher(t.habilidadeProxima, { estrelas: r.estrelas + 1, texto: textoHab(habilidadeComEstrelas(p.habilidade, r.estrelas + 1)) })
    : '';

  // Treinar com cartas de XP
  const cartasXp = dados.cartas.filter((c) => c.uso === 'xp');
  const treinos = cartasXp.map((c) => {
    const qtd = jogo.estado.inventario[c.id] || 0;
    return `<button class="btn btn-azul btn-peq" data-acao="treinar" data-carta="${c.id}" ${qtd && !noMax ? '' : 'disabled'}>
      ${c.emoji} +${c.xp} XP <small>(${qtd})</small></button>`;
  }).join('');

  // Estrela
  const custo = custoEstrela(r, cfg);
  let blocoEstrela = `<p class="dica-pequena">Estrelas no máximo!</p>`;
  if (custo) {
    const prev = atributos(p, r, dados, { estrelas: r.estrelas + 1 });
    blocoEstrela = `
      <div class="estrela-info">
        <span class="custo"><span class="custo-item${r.copias < custo.copias ? ' falta' : ''}">🃏 Cópias ${r.copias}/${custo.copias}</span><span class="custo-item${jogo.estado.moedas < custo.moedas ? ' falta' : ''}">🪙${custo.moedas}</span></span>
        <div class="previa-grade">
          <span>Nv máx</span><b>${max} → ${max + cfg.niveisPorEstrela}</b>
          <span>💪</span><b>${poderAgora} → ${poder(prev, dados)}</b>
          <span>⚔️</span><b>${stats.atq} → ${prev.atq}</b>
          <span>❤️</span><b>${stats.vida} → ${prev.vida}</b>
        </div>
      </div>
      <button class="btn btn-laranja btn-largo" data-acao="estrela" ${r.copias >= custo.copias ? '' : 'disabled'}>Evoluir pra ${r.estrelas + 1} ⭐</button>`;
  }

  // Ascensão
  const ca = custoAscensao(r, dados);
  let blocoAscensao = '';
  if (r.estrelas >= cfg.estrelasMax) {
    if (!ca) blocoAscensao = `<p class="dica-pequena">Rank máximo!</p>`;
    else {
      const prev = atributos(p, r, dados, { ascensao: (r.ascensao || 0) + 1, nivel: 1 });
      const pronto = podeAscender(r, cfg);
      const bonusRank = Math.round(cfg.bonusRank * 100);
      blocoAscensao = `
        <p class="dica-pequena">${pronto ? 'Volta pro nível 1, mas ' : 'No nível máximo, '}ganha +${bonusRank}% de atributos pra sempre e +${cfg.niveisPorRank} de nível máximo.</p>
        <div class="estrela-info">
          ${custoTexto(ca)}
          <div class="previa-grade"><span>Nv máx</span><b>${max} → ${max + cfg.niveisPorRank}</b></div>
        </div>
        <button class="btn btn-laranja btn-largo" data-acao="ascender" ${pronto ? '' : 'disabled'}>✦ Ascender (rank ${(r.ascensao || 0) + 1})</button>`;
    }
    blocoAscensao = `<div class="bloco"><h4>Ascensão${selo(m.ascender)}</h4>${blocoAscensao}</div>`;
  }

  // Equipamentos
  const equips = dados.equipamentos.espacos.map((esp) => {
    const n = r.equip[esp.id] || 0;
    const nomeNivel = n ? dados.equipamentos.niveis[n - 1].nome : 'Vazio';
    const bonus = n ? `+${Math.round(dados.equipamentos.niveis[n - 1].bonus * 100)}%` : '';
    const c = custoEquip(r, esp.id, dados);
    const emojiAttr = t.atributos[esp.atributo].split(' ')[0];
    let previa = `<b>${emojiAttr} ${stats[esp.atributo]}</b>`;
    let botao = '<span class="equip-max">Máximo!</span>';
    const pronto = m.equip[esp.id] ? ' pronto' : '';
    if (c) {
      const prev = atributos(p, r, dados, { equip: { [esp.id]: n + 1 } });
      previa = `<b>${emojiAttr} ${stats[esp.atributo]} → ${prev[esp.atributo]} <small class="poder-previa">💪+${poder(prev, dados) - poderAgora}</small></b>`;
      botao = `<button class="btn btn-verde btn-peq btn-equip${pronto}" data-acao="equip" data-espaco="${esp.id}">
        <span>Melhorar</span>${custoTexto(c)}</button>`;
    }
    return `<div class="linha-equip nivel-${n}">
      <span class="equip-emoji">${esp.emoji}</span>
      <div class="equip-info">
        <div class="equip-nome"><b>${esp.nome}</b><span class="equip-nivel">${nomeNivel}</span></div>
        <div class="equip-efeito"><small>${bonus || '—'} ${t.atributos[esp.atributo]}</small>${previa}</div>
      </div>
      ${botao}</div>`;
  }).join('');

  $('detalhe-conteudo').innerHTML = `
    <div class="detalhe-topo ${mudanca ? 'evoluiu' : ''}">
      <span class="detalhe-emoji">${p.emoji}</span>
      <h3>${p.nome}</h3>
      <small>${p.funcao}</small>
      ${infoFaccao ? `<small class="info-faccao">${infoFaccao}</small>` : ''}
      <div class="estrelas">${estrelasTexto(r.estrelas)}</div>
      ${r.ascensao ? `<div class="selo-rank">${dados.ascensao.selos[r.ascensao]} Rank ${r.ascensao}</div>` : ''}
    </div>
    <div class="bloco">
      <p><b>Nv ${r.nivel}</b> / ${max} ${noMax ? '' : `· XP ${r.xp}/${precisa}`}</p>
      <div class="barra-xp grande"><span style="width:${noMax ? 100 : (r.xp / precisa) * 100}%"></span></div>
    </div>
    <div class="bloco">${linhas}</div>
    <div class="bloco"><b>✨ ${h.nome}</b><p class="dica-pequena">${descHab}</p>${proxEstrela ? `<p class="previa">${proxEstrela}</p>` : ''}</div>
    <div class="bloco"><h4>Treinar${selo(m.treinar)}</h4><div class="botoes-grade">${treinos}</div></div>
    <div class="bloco"><h4>Estrela${selo(m.estrela)}</h4>${blocoEstrela}</div>
    ${blocoAscensao}
    <div class="bloco"><h4>Equipamentos${selo(m.algumEquip)}</h4>${equips}</div>`;
  $('detalhe').classList.remove('escondido');
}

function acaoDetalhe(evento) {
  const botao = evento.target.closest('[data-acao]');
  if (!botao || botao.disabled) return;
  const p = base(aberta);
  const r = jogo.estado.colecao[aberta];
  const antes = atributos(p, r, dados);
  const t = dados.textos;
  let res;

  switch (botao.dataset.acao) {
    case 'treinar':
      res = jogo.treinar(aberta, botao.dataset.carta);
      if (res.ok) som.tocarSom(res.subiu ? 'nivel' : 'treino');
      if (res.ok && res.subiu) avisar(preencher(t.subiuNivel, { emoji: p.emoji, nome: p.nome, nivel: r.nivel }));
      break;
    case 'estrela':
      res = jogo.evoluirEstrela(aberta);
      if (res.ok) som.tocarSom('estrela');
      if (res.ok) avisar(preencher(t.estrelaSubiu, { nome: p.nome, estrelas: r.estrelas }));
      break;
    case 'ascender':
      if (!confirm(preencher(t.ascensaoConfirma, { nome: p.nome, bonus: Math.round(dados.config.evolucao.bonusRank * 100) }))) return;
      res = jogo.ascender(aberta);
      if (res.ok) som.tocarSom('estrela');
      if (res.ok) avisar(preencher(t.ascensaoFeita, { nome: p.nome, rank: r.ascensao }));
      break;
    case 'equip': {
      const esp = dados.equipamentos.espacos.find((x) => x.id === botao.dataset.espaco);
      res = jogo.melhorarEquip(aberta, esp.id);
      if (res.ok) som.tocarSom('equip');
      if (res.ok) avisar(preencher(t.equipSubiu, { espaco: esp.nome, nivel: dados.equipamentos.niveis[r.equip[esp.id] - 1].nome }));
      break;
    }
  }
  if (!res.ok) return erro(res);
  mudanca = { antes, depois: atributos(p, r, dados) };
  desenhar();
}

// ---------- Troca de Mudas Repetidas ----------

function abrirTroca() {
  const t = dados.textos;
  const troca = dados.config.troca;
  const tem = jogo.estado.inventario[troca.carta] || 0;
  $('troca-titulo').textContent = t.trocaTitulo;
  $('troca-tem').textContent = preencher(t.trocaTem, { n: tem });
  $('troca-planta').innerHTML = `${t.trocaPlanta} <span class="custo-item${tem < troca.custo ? ' falta' : ''}">🧩${troca.custo}</span>`;
  $('troca-material').innerHTML = `${t.trocaMaterial} <span class="custo-item${tem < troca.custoMaterial ? ' falta' : ''}">🧩${troca.custoMaterial}</span>`;
  const total = troca.materiais.reduce((a, m) => a + m.peso, 0);
  $('troca-chances').textContent = troca.materiais
    .map((m) => `${carta(m.carta).emoji}×${m.qtd} ${Math.round((m.peso / total) * 100)}%`).join(' · ');
  $('troca-mudas').classList.remove('escondido');
}

function fecharTroca() {
  $('troca-mudas').classList.add('escondido');
}

function mostrarMaterial(res) {
  if (!res.ok) return erro(res);
  const c = carta(res.carta);
  som.tocarSom('pacote');
  $('pacote-resumo').innerHTML = '';
  abrirResultado(c.emoji, preencher(dados.textos.materialGanho, { qtd: res.qtd, nome: c.nome }), c.raridade !== 'comum');
}

// ---------- Pacote de Sementes ----------

// Com 10 itens ou mais, pergunta se usa 1 ou vários de uma vez
function usarComLote(c) {
  const qtd = jogo.estado.inventario[c.id] || 0;
  const porUso = c.uso === 'troca' ? dados.config.troca.custo : 1;
  const usos = Math.min(dados.config.pacote.lote, Math.floor(qtd / porUso));
  usando = c;
  if (qtd >= dados.config.pacote.lote && usos > 1) {
    usarLote = usos;
    $('usar-quantos-titulo').textContent = preencher(dados.textos.usarQuantos, { emoji: c.emoji, nome: c.nome });
    $('usar-lote').textContent = `×${usos}`;
    $('usar-quantos').classList.remove('escondido');
  } else usarCarta(1);
}

let usando = null;   // carta do inventário sendo usada
let usarLote = 1;

function usarCarta(n) {
  $('usar-quantos').classList.add('escondido');
  if (usando.uso === 'pacote') mostrarPacote(n > 1 ? jogo.plantarSementes(n) : jogo.plantarSemente());
  else mostrarPacote(n > 1 ? jogo.trocarMudasVarias(n) : jogo.trocarMudas());
}

function mostrarPacote(res) {
  if (!res.ok) return erro(res);
  som.tocarSom('pacote');
  if (res.nova || (res.resultados || []).some((r) => r.nova)) som.tocarSom('pacoteNovo');
  if (res.resultados) return mostrarResumo(res.resultados);
  $('pacote-resumo').innerHTML = '';
  const p = base(res.id);
  const t = dados.textos;
  const texto = res.nova ? t.plantaNova : (res.virouMuda ? t.copiaVirouMuda : t.copiaNova);
  abrirResultado(p.emoji, preencher(texto, { nome: p.nome }), res.nova);
}

function abrirResultado(emoji, titulo, destaque) {
  $('pacote-emoji').textContent = emoji;
  $('pacote-titulo').textContent = titulo;
  $('pacote-resultado').classList.toggle('nova', destaque);
  $('pacote-resultado').classList.remove('escondido');
  // reinicia a animação
  const caixa = $('pacote-resultado').firstElementChild;
  caixa.style.animation = 'none';
  void caixa.offsetWidth;
  caixa.style.animation = '';
  desenhar();
}

// Vários pacotes de uma vez: só os ícones e quantidades (plantas novas brilham)
function mostrarResumo(resultados) {
  const grupos = new Map();
  let mudas = 0;
  for (const r of resultados) {
    if (r.virouMuda) { mudas++; continue; }
    const g = grupos.get(r.id) || { qtd: 0, nova: false };
    g.qtd++;
    g.nova = g.nova || r.nova;
    grupos.set(r.id, g);
  }
  const itens = [...grupos].map(([id, g]) =>
    `<span class="resumo-item${g.nova ? ' nova' : ''}">${base(id).emoji}<b>×${g.qtd}</b></span>`);
  if (mudas) itens.push(`<span class="resumo-item">${carta(dados.config.troca.carta).emoji}<b>×${mudas}</b></span>`);
  const algumaNova = resultados.some((r) => r.nova);
  $('pacote-emoji').textContent = '🌱';
  $('pacote-titulo').textContent = preencher(dados.textos.resumoPacotes, { n: resultados.length });
  $('pacote-resumo').innerHTML = itens.join('');
  $('pacote-resultado').classList.toggle('nova', algumaNova);
  $('pacote-resultado').classList.remove('escondido');
  const caixa = $('pacote-resultado').firstElementChild;
  caixa.style.animation = 'none';
  void caixa.offsetWidth;
  caixa.style.animation = '';
  desenhar();
}
