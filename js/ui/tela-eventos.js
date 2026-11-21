// Telas da Invasão de Chefe, da Feira e do Herbário.

import { arte, iconeHabilidade } from '../arte.js';
import { $, mostrarTela, avisar, preencher, textoHabilidade } from './comum.js';
import { atributos, poder, registroNovo, habilidadeComEstrelas } from '../evolucao.js';
import * as jogo from '../estado.js';
import { batalhaInvasao } from '../eventos.js';
import { hoje as hojeTexto } from '../atividades.js';
import * as som from '../som.js';

let dados;
let aoPreparar;
let aoMudar;

const t = () => dados.textos.invasao;
const tf = () => dados.textos.feira;
const th = () => dados.textos.herbario;
const num = (n) => Math.round(n).toLocaleString('pt-BR');

export function iniciarTelasEventos(d, { voltarDesafios, voltarBase, preparar, mudou }) {
  dados = d;
  aoPreparar = preparar;
  aoMudar = mudou;
  $('invasao-voltar').addEventListener('click', voltarDesafios);
  $('feira-voltar').addEventListener('click', voltarBase);
  $('herbario-voltar').addEventListener('click', voltarBase);
  $('herbario-info').addEventListener('click', () => $('herbario-info').classList.add('escondido'));
  $('btn-feira').addEventListener('click', abrirFeira);
  $('btn-herbario').addEventListener('click', abrirHerbario);
  setInterval(() => {
    if ($('tela-invasao').classList.contains('ativa')) desenharInvasao();
  }, 1000);
}

function formatarFalta(ms) {
  const min = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}min` : `${m}min`;
}

export function textoPremio(p) {
  const partes = [];
  if (p.moedas) partes.push(`🪙 ${p.moedas}`);
  if (p.orvalho) partes.push(`💧 ${p.orvalho}`);
  for (const [id, qtd] of Object.entries(p.cartas || {})) {
    const c = dados.cartas.find((x) => x.id === id);
    if (c) partes.push(`${c.emoji}${qtd > 1 ? `×${qtd}` : ''}`);
  }
  return partes.join(' ');
}

// ---------- Invasão ----------

// Batalha nova com a vida atual do chefe (ou null se não dá pra atacar)
export function montarBatalhaInvasao() {
  const sit = jogo.invasaoAtual();
  if (!sit || sit.derrotado || sit.terminou) return null;
  return batalhaInvasao(sit, sit.ciclo, dados);
}

export function resumoInvasao() {
  const pendente = jogo.invasaoPendente();
  if (pendente) return { pendente };
  return { sit: jogo.invasaoAtual() };
}

export function abrirInvasao() {
  desenharInvasao();
  mostrarTela('tela-invasao');
}

function desenharInvasao() {
  const area = $('invasao-conteudo');
  const pendente = jogo.invasaoPendente();
  if (pendente) {
    area.innerHTML = `
      <div class="invasao-chefe">${arte(pendente.chefe)}</div>
      <h3>${pendente.derrotado ? t().foiDerrotado : t().fugiu}</h3>
      <p>${preencher(t().suaPosicao, { pos: pendente.posicao })}</p>
      ${desenharRanking(pendente.ranking)}
      <p class="rotina-premio">${textoPremio(pendente.premio)}</p>
      <button id="invasao-resgatar" class="btn btn-laranja btn-largo">${t().pegarPremio}</button>`;
    $('invasao-resgatar').addEventListener('click', () => {
      const r = jogo.resgatarInvasao();
      if (r.ok) { som.tocarSom('vitoria'); avisar(preencher(t().pegou, { premio: textoPremio(r.premio) })); }
      aoMudar();
      desenharInvasao();
    });
    return;
  }
  const sit = jogo.invasaoAtual();
  const pct = (sit.restante / sit.vidaTotal) * 100;
  let botao;
  if (sit.derrotado) botao = `<p class="invasao-fim">${preencher(t().derrotadoEspera, { tempo: formatarFalta(sit.fim - Date.now()) })}</p>`;
  else {
    const texto = sit.gratis > 0
      ? preencher(t().atacarGratis, { n: sit.gratis, max: dados.invasao.ataquesGratis })
      : preencher(t().atacarPago, { custo: dados.invasao.custoAtaqueExtra });
    botao = `<button id="invasao-atacar" class="btn btn-grande ${sit.gratis > 0 ? 'btn-laranja' : 'btn-azul'} btn-largo">${texto}</button>`;
  }
  const meu = sit.ranking.find((r) => r.voce);
  area.innerHTML = `
    <div class="invasao-chefe">${arte(sit.chefe)}</div>
    <h3>${sit.chefe.nome} <small>Nv ${sit.nivel}</small></h3>
    <div class="invasao-vida"><span style="width:${pct}%"></span></div>
    <p class="invasao-numeros">❤️ ${num(sit.restante)} / ${num(sit.vidaTotal)}</p>
    <p class="dica-pequena">${preencher(t().acabaEm, { tempo: formatarFalta(sit.fim - Date.now()) })}</p>
    ${botao}
    <p class="dica-pequena">${t().dica}</p>
    <h4>${preencher(t().ranking, { pos: sit.posicao, dano: num(meu.dano) })}</h4>
    ${desenharRanking(sit.ranking)}
    <p class="dica-pequena">${t().premiosDica}</p>`;
  const atacar = $('invasao-atacar');
  if (atacar) {
    atacar.addEventListener('click', () => {
      const batalha = montarBatalhaInvasao();
      if (!batalha) return avisar(t().invasaoAcabou);
      aoPreparar(batalha);
    });
  }
}

function desenharRanking(ranking) {
  return `<ol class="ranking-invasao">${ranking.map((r, i) => `
    <li class="${r.voce ? 'voce' : ''}"><span class="pos">${i + 1}º</span><span>${r.emoji} ${r.nome}</span><b>${num(r.dano)}</b></li>`).join('')}</ol>`;
}

// ---------- Feira ----------

function abrirFeira() {
  desenharFeira();
  mostrarTela('tela-feira');
}

function nomeCarta(id) {
  return dados.cartas.find((c) => c.id === id);
}

function desenharFeira() {
  $('feira-moedas').textContent = jogo.estado.moedas;
  const ofertas = jogo.feiraHoje().map((o) => {
    const c = o.carta && nomeCarta(o.carta);
    const emoji = c ? c.emoji : '💧';
    const nome = c ? `${c.nome} ×${o.qtd}` : `${o.orvalho} Gotas de Orvalho`;
    return `<button class="linha-escolha${o.comprado ? ' bloqueada' : ''}" data-oferta="${o.id}">
      <span class="escolha-emoji">${emoji}</span>
      <span class="escolha-info"><b>${nome}</b>${c ? `<small>${c.descricao}</small>` : ''}</span>
      <span class="escolha-preco">${o.comprado ? tf().vendido : `🪙 ${o.moedas}`}</span>
    </button>`;
  }).join('');
  const inv = jogo.estado.inventario;
  const trocas = dados.feira.trocas.map((tr) => {
    const de = Object.entries(tr.de).map(([id, q]) => `${nomeCarta(id).emoji}×${q}`).join(' + ');
    const para = Object.entries(tr.para).map(([id, q]) => `${nomeCarta(id).emoji}×${q}`).join(' ');
    const tem = Object.entries(tr.de).map(([id, q]) => `${nomeCarta(id).emoji} ${inv[id] || 0}/${q}`).join(' · ');
    const pode = Object.entries(tr.de).every(([id, q]) => (inv[id] || 0) >= q);
    return `<button class="linha-escolha${pode ? '' : ' bloqueada'}" data-troca="${tr.id}">
      <span class="escolha-info"><b>${de} ➡️ ${para}</b><small>${preencher(tf().voceTem, { tem })}</small></span>
      <span class="escolha-preco">${tf().trocar}</span>
    </button>`;
  }).join('');
  $('feira-conteudo').innerHTML = `
    <h3 class="titulo-secao">${tf().ofertas}</h3>
    <p class="dica-pequena">${tf().ofertasDica}</p>
    <div class="lista-escolha">${ofertas}</div>
    <h3 class="titulo-secao">${tf().trocas}</h3>
    <p class="dica-pequena">${tf().trocasDica}</p>
    <div class="lista-escolha">${trocas}</div>`;
  $('feira-conteudo').querySelectorAll('[data-oferta]').forEach((b) => b.addEventListener('click', () => {
    const r = jogo.comprarOferta(b.dataset.oferta);
    if (!r.ok) return avisar(tf()[r.erro] || dados.textos[r.erro]);
    som.tocarSom('vitoria');
    avisar(tf().comprou);
    aoMudar();
    desenharFeira();
  }));
  $('feira-conteudo').querySelectorAll('[data-troca]').forEach((b) => b.addEventListener('click', () => {
    const r = jogo.fazerTroca(b.dataset.troca);
    if (!r.ok) return avisar(dados.textos[r.erro]);
    som.tocarSom('vitoria');
    avisar(tf().trocou);
    aoMudar();
    desenharFeira();
  }));
}

// ---------- Herbário ----------

function abrirHerbario() {
  desenharHerbario();
  mostrarTela('tela-herbario');
}

// Status de uma planta no nível 1 (1⭐, sem rank, equipamento ou talento).
function verPlanta(id) {
  const p = dados.plantas.find((x) => x.id === id);
  if (!p) return;
  const t = dados.textos;
  const stats = atributos(p, registroNovo(), dados);
  const h = habilidadeComEstrelas(p.habilidade, 1);
  const fac = dados.faccoes.faccoes.find((f) => f.id === p.faccao);
  const rec = dados.fusoes.receitas.find((r) => r.id === id);
  const nome = (x) => dados.plantas.find((q) => q.id === x)?.nome || x;
  const linhas = ['vida', 'atq', 'def', 'vel'].map((a) => `<div class="linha-attr"><span>${t.atributos[a]}</span><b>${stats[a]}</b></div>`).join('');
  $('herbario-info-conteudo').innerHTML = `
    <div class="detalhe-topo">
      <span class="detalhe-emoji">${arte(p)}</span>
      <div class="detalhe-texto">
        <h3>${p.nome}</h3>
        <small>${p.funcao}${fac ? ` · ${fac.emoji} ${fac.nome}` : ''}</small>
        ${rec ? `<small>${preencher(th().infoReceita, { a: nome(rec.a), b: nome(rec.b) })}</small>` : ''}
      </div>
    </div>
    <p class="dica-pequena">${th().infoNivel1}</p>
    <div class="bloco"><div class="linha-attr linha-poder"><span>${t.poder}</span><b>${poder(stats, dados)}</b></div>${linhas}</div>
    <div class="bloco"><b>🗡️ Ataque</b><p class="dica-pequena">${preencher(t.alcance[p.alcance || 'longe'], { bonus: Math.round((dados.config.batalha.multPerto - 1) * 100) })}<br>${t.padraoAtaque[p.alvo || 'frente']}</p></div>
    <div class="bloco"><b class="nome-hab">${iconeHabilidade(h.tipo)} ${h.nome}</b><p class="dica-pequena">${textoHabilidade(h, dados)}</p></div>
    <p class="dica-pequena">${t.infoPlantaFechar}</p>`;
  $('herbario-info').classList.remove('escondido');
}

// Tem página completa esperando o prêmio?
export function herbarioTemPremio() {
  return jogo.herbario().some((p) => p.completa && !p.pega);
}

function desenharHerbario() {
  const paginas = jogo.herbario();
  const total = paginas.reduce((s, p) => s + p.itens.length, 0);
  const vistos = paginas.reduce((s, p) => s + p.itens.filter((x) => x.visto).length, 0);
  $('herbario-conteudo').innerHTML = `
    <p class="dica-pequena">${preencher(th().progresso, { vistos, total })}</p>
    <p class="dica-pequena">${th().fusaoMudou}</p>
    <p class="dica-pequena">${th().toqueVer}</p>
    ${paginas.map((p) => {
    const feitos = p.itens.filter((x) => x.visto).length;
    let rodape;
    if (p.pega) rodape = `<small class="pagina-ok">${th().pego}</small>`;
    else if (p.completa) rodape = `<button class="btn btn-laranja btn-peq" data-pagina="${p.id}">${th().pegar} ${textoPremio(p.premio)}</button>`;
    else rodape = `<small>${th().premio} ${textoPremio(p.premio)}</small>`;
    return `<div class="pagina-herbario${p.completa && !p.pega ? ' pronta' : ''}">
      <div class="pagina-topo"><b>${p.titulo}</b><small>${feitos}/${p.itens.length}</small></div>
      <div class="pagina-itens">${p.itens.map((x) => `
        <span class="item-herbario${x.visto ? '' : ' oculto'}${x.chefe ? ' chefe' : ''}${x.id ? ' toque' : ''}"${x.id ? ` data-ver="${x.id}"` : ''} title="${x.visto ? x.nome : '???'}">
          <span>${arte(x)}</span><small>${x.visto ? x.nome : '???'}</small></span>`).join('')}</div>
      <div class="pagina-rodape">${rodape}</div>
    </div>`;
  }).join('')}
    <div class="pagina-herbario">
      <div class="pagina-topo"><b>${th().hibridasTitulo}</b></div>
      ${dados.fusoes.receitas.map((rec) => {
    const item = (id) => {
      const p = dados.plantas.find((x) => x.id === id);
      const tem = !!jogo.estado.colecao[id];
      return `<span class="item-herbario toque${tem ? '' : ' oculto'}" data-ver="${id}" title="${p.nome}"><span>${arte(p)}</span><small>${p.nome}</small></span>`;
    };
    return `<div class="fusao-receita">${item(rec.a)}<b>+</b>${item(rec.b)}<b>=</b>${item(rec.id)}</div>`;
  }).join('')}
    </div>`;
  $('herbario-conteudo').querySelectorAll('[data-ver]').forEach((b) => b.addEventListener('click', () => verPlanta(b.dataset.ver)));
  $('herbario-conteudo').querySelectorAll('[data-pagina]').forEach((b) => b.addEventListener('click', () => {
    const r = jogo.resgatarPagina(b.dataset.pagina);
    if (!r.ok) return;
    som.tocarSom('vitoria');
    avisar(preencher(th().pegou, { premio: textoPremio(r.premio) }));
    aoMudar();
    desenharHerbario();
  }));
}

// "!" nos botões da horta: feira com ofertas novas do dia, herbário com prêmio
export function desenharAtalhos() {
  const feiraNova = jogo.estado.feira.dia !== hojeTexto();
  $('btn-feira').classList.toggle('nova', feiraNova);
  $('btn-herbario').classList.toggle('nova', herbarioTemPremio());
}
