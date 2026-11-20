// Tela de plantas: coleção, cartas, pacote de sementes e evolução de cada planta.

import { $, mostrarTela, avisar, preencher } from './comum.js';
import * as jogo from '../estado.js';
import { atributos, xpParaProximo, nivelMaximo, custoEstrela, custoEquip } from '../evolucao.js';

let dados;
let aberta = null;      // id da planta aberta no detalhe
let mudanca = null;     // { antes, depois } pra mostrar o quanto ficou mais forte

const ATRIBUTOS = ['vida', 'atq', 'def', 'vel'];

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

function desenharLista() {
  const lista = $('colecao');
  lista.innerHTML = '';
  for (const p of dados.plantas) {
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
      const custo = custoEstrela(r, cfg);
      const podeEstrela = custo && r.copias >= custo.copias;
      botao.className = 'cartao-planta' + (podeEstrela ? ' pode-evoluir' : '');
      botao.innerHTML = `
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

  // Atributos (com o ganho da última evolução, se teve)
  const linhas = ATRIBUTOS.map((a) => {
    const ganho = mudanca ? mudanca.depois[a] - mudanca.antes[a] : 0;
    return `<div class="linha-attr"><span>${t.atributos[a]}</span><b>${stats[a]}${ganho > 0 ? ` <em class="ganho">+${ganho}</em>` : ''}</b></div>`;
  }).join('');

  // Habilidade
  const h = p.habilidade;
  const descHab = preencher(t.habilidades[h.tipo] || '', {
    reflete: Math.round((h.reflete || 0) * 100), turnos: h.turnos, golpes: h.golpes,
    reducao: Math.round((h.reducao || 0) * 100),
  });

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
    if (c) {
      const prev = atributos(p, r, dados, { equip: { [esp.id]: n + 1 } });
      botao = `<button class="btn btn-verde btn-peq" data-acao="equip" data-espaco="${esp.id}">
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
      <div class="estrelas">${estrelasTexto(r.estrelas)}</div>
    </div>
    <div class="bloco">
      <p><b>Nv ${r.nivel}</b> / ${max} ${noMax ? '' : `· XP ${r.xp}/${precisa}`}</p>
      <div class="barra-xp grande"><span style="width:${noMax ? 100 : (r.xp / precisa) * 100}%"></span></div>
    </div>
    <div class="bloco">${linhas}</div>
    <div class="bloco"><b>✨ ${h.nome}</b><p class="dica-pequena">${descHab}</p></div>
    <div class="bloco"><h4>Treinar</h4><div class="botoes-linha">${treinos}</div></div>
    <div class="bloco"><h4>Estrela</h4>${blocoEstrela}</div>
    <div class="bloco"><h4>Equipamentos</h4>${equips}</div>`;
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
