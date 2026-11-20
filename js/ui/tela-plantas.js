// Tela de plantas: coleção, cartas, pacote de sementes e evolução de cada planta.

import { $, mostrarTela, avisar, preencher } from './comum.js';
import * as jogo from '../estado.js';
import { atributos, xpParaProximo, nivelMaximo, custoEstrela, custoEquip, temCartas, habilidadeComEstrelas } from '../evolucao.js';

let dados;
let aberta = null;      // id da planta aberta no detalhe
let mudanca = null;     // { antes, depois } pra mostrar o quanto ficou mais forte

const ATRIBUTOS = ['vida', 'atq', 'def', 'vel'];

// Ordenação da coleção (lembrada só neste aparelho)
const ORDENS = [
  { id: 'padrao', rotulo: '↕️ Padrão' },
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
  $('detalhe-fechar').addEventListener('click', fecharDetalhe);
  $('detalhe').addEventListener('click', (e) => { if (e.target.id === 'detalhe') fecharDetalhe(); });
  $('detalhe-fechar-baixo').addEventListener('click', fecharDetalhe);
  // Fecha o resultado do pacote tocando em qualquer lugar
  $('pacote-resultado').addEventListener('click', () => { $('pacote-resultado').classList.add('escondido'); desenhar(); });
  $('detalhe-conteudo').addEventListener('click', acaoDetalhe);
  $('btn-ordenar').addEventListener('click', trocarOrdem);

  const { pacote } = dados.config;
  $('btn-pacote-moedas').textContent = `🌱 Pacote 🪙${pacote.moedas}`;
  $('btn-pacote-orvalho').textContent = `🌱 Pacote 💧${pacote.orvalho}`;
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
  const partes = [];
  if (custo.moedas) partes.push(`🪙${custo.moedas}`);
  for (const [id, qtd] of Object.entries(custo.cartas || {})) {
    const tem = jogo.estado.inventario[id] || 0;
    partes.push(`${carta(id).emoji}${tem}/${qtd}`);
  }
  return partes.join(' ');
}

function erro(resultado) {
  avisar(dados.textos[resultado.erro] || dados.textos.semMaterial);
}

// O que dá pra melhorar agora nessa planta, com o que o jogador tem.
function melhorias(r) {
  const e = jogo.estado;
  const cfg = dados.config.evolucao;
  const treinar = r.nivel < nivelMaximo(r.estrelas, cfg)
    && dados.cartas.some((c) => c.uso === 'xp' && (e.inventario[c.id] || 0) > 0);
  const ce = custoEstrela(r, cfg);
  const estrela = !!ce && r.copias >= ce.copias && e.moedas >= ce.moedas;
  const equip = {};
  for (const esp of dados.equipamentos.espacos) {
    const c = custoEquip(r, esp.id, dados);
    equip[esp.id] = !!c && e.moedas >= (c.moedas || 0) && temCartas(e.inventario, c.cartas || {});
  }
  const algumEquip = Object.values(equip).some(Boolean);
  return { treinar, estrela, equip, algumEquip, alguma: treinar || estrela || algumEquip };
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
      if (c.uso === 'pacote') mostrarPacote(jogo.plantarSemente());
      else avisar(`${c.nome}: ${c.descricao}`);
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
      const max = nivelMaximo(r.estrelas, cfg);
      const pxp = r.nivel >= max ? 1 : r.xp / xpParaProximo(r.nivel, cfg);
      const m = melhorias(r);
      const icones = [m.estrela && '⭐', m.algumEquip && '🛠️', m.treinar && '📈'].filter(Boolean).join('');
      botao.className = 'cartao-planta' + (m.alguma ? ' pode-evoluir' : '');
      botao.innerHTML = `
        ${m.alguma ? `<span class="aviso-melhorar" title="Dá pra melhorar">⬆️ ${icones}</span>` : ''}
        <span class="planta-emoji">${p.emoji}</span>
        <b>${p.nome}</b>
        <small class="estrelas-peq">${estrelasTexto(r.estrelas)}</small>
        <small>Nv ${r.nivel}/${max}</small>
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
  const max = nivelMaximo(r.estrelas, cfg);
  const noMax = r.nivel >= max;
  const precisa = xpParaProximo(r.nivel, cfg);
  const m = melhorias(r);

  // Atributos (com o ganho da última evolução, se teve)
  const linhas = ATRIBUTOS.map((a) => {
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
  const textoHab = (hab) => preencher(t.habilidades[hab.tipo] || '', {
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
      <p>Cópias: <b>${r.copias}/${custo.copias}</b> · 🪙${custo.moedas}</p>
      <p class="previa">Nv máx ${max} → ${max + cfg.niveisPorEstrela} · ⚔️ ${stats.atq} → ${prev.atq} · ❤️ ${stats.vida} → ${prev.vida}</p>
      <button class="btn btn-laranja" data-acao="estrela" ${r.copias >= custo.copias ? '' : 'disabled'}>Evoluir pra ${r.estrelas + 1} ⭐</button>`;
  }

  // Equipamentos
  const equips = dados.equipamentos.espacos.map((esp) => {
    const n = r.equip[esp.id] || 0;
    const nomeNivel = n ? dados.equipamentos.niveis[n - 1].nome : 'Vazio';
    const bonus = n ? `+${Math.round(dados.equipamentos.niveis[n - 1].bonus * 100)}%` : '';
    const c = custoEquip(r, esp.id, dados);
    let botao = '<small>Máximo!</small>';
    const pronto = m.equip[esp.id] ? ' pronto' : '';
    if (c) {
      const prev = atributos(p, r, dados, { equip: { [esp.id]: n + 1 } });
      botao = `<button class="btn btn-verde btn-peq${pronto}" data-acao="equip" data-espaco="${esp.id}">
        Melhorar <small>${custoTexto(c)}</small><br><small>${t.atributos[esp.atributo].split(' ')[0]} ${stats[esp.atributo]} → ${prev[esp.atributo]}</small></button>`;
    }
    return `<div class="linha-equip nivel-${n}">
      <span class="equip-emoji">${esp.emoji}</span>
      <div><b>${esp.nome}</b><br><small>${nomeNivel} ${bonus} ${t.atributos[esp.atributo]}</small></div>
      ${botao}</div>`;
  }).join('');

  $('detalhe-conteudo').innerHTML = `
    <div class="detalhe-topo ${mudanca ? 'evoluiu' : ''}">
      <span class="detalhe-emoji">${p.emoji}</span>
      <h3>${p.nome}</h3>
      <small>${p.funcao}</small>
      ${infoFaccao ? `<small class="info-faccao">${infoFaccao}</small>` : ''}
      <div class="estrelas">${estrelasTexto(r.estrelas)}</div>
    </div>
    <div class="bloco">
      <p><b>Nv ${r.nivel}</b> / ${max} ${noMax ? '' : `· XP ${r.xp}/${precisa}`}</p>
      <div class="barra-xp grande"><span style="width:${noMax ? 100 : (r.xp / precisa) * 100}%"></span></div>
    </div>
    <div class="bloco">${linhas}</div>
    <div class="bloco"><b>✨ ${h.nome}</b><p class="dica-pequena">${descHab}</p>${proxEstrela ? `<p class="previa">${proxEstrela}</p>` : ''}</div>
    <div class="bloco"><h4>Treinar${selo(m.treinar)}</h4><div class="botoes-linha">${treinos}</div></div>
    <div class="bloco"><h4>Estrela${selo(m.estrela)}</h4>${blocoEstrela}</div>
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
      if (res.ok && res.subiu) avisar(preencher(t.subiuNivel, { emoji: p.emoji, nome: p.nome, nivel: r.nivel }));
      break;
    case 'estrela':
      res = jogo.evoluirEstrela(aberta);
      if (res.ok) avisar(preencher(t.estrelaSubiu, { nome: p.nome, estrelas: r.estrelas }));
      break;
    case 'equip': {
      const esp = dados.equipamentos.espacos.find((x) => x.id === botao.dataset.espaco);
      res = jogo.melhorarEquip(aberta, esp.id);
      if (res.ok) avisar(preencher(t.equipSubiu, { espaco: esp.nome, nivel: dados.equipamentos.niveis[r.equip[esp.id] - 1].nome }));
      break;
    }
  }
  if (!res.ok) return erro(res);
  mudanca = { antes, depois: atributos(p, r, dados) };
  desenhar();
}

// ---------- Pacote de Sementes ----------

function mostrarPacote(res) {
  if (!res.ok) return erro(res);
  const p = base(res.id);
  const t = dados.textos;
  $('pacote-emoji').textContent = p.emoji;
  $('pacote-titulo').textContent = res.nova ? preencher(t.plantaNova, { nome: p.nome }) : preencher(t.copiaNova, { nome: p.nome });
  $('pacote-resultado').classList.toggle('nova', res.nova);
  $('pacote-resultado').classList.remove('escondido');
  // reinicia a animação
  const caixa = $('pacote-resultado').firstElementChild;
  caixa.style.animation = 'none';
  void caixa.offsetWidth;
  caixa.style.animation = '';
  desenhar();
}
