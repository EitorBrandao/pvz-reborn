// Todo o estado do jogo mora aqui. Só este arquivo fala com o save.

import * as save from './save.js';
import * as evo from './evolucao.js';
import { missaoCompleta } from './missoes.js';
import { hoje } from './atividades.js';
import {
  cicloAtual, situacaoInvasao, premioDoRanking, novoCicloInvasao, ofertasDoDia, paginasHerbario, fusoesHerbario,
} from './eventos.js';

let dados = null;
let config = null;
export let estado = null;

export function iniciar(d) {
  dados = d;
  config = d.config;
  // Completa saves antigos com os campos novos (ex.: quem jogou a versão 0.1)
  estado = completar(save.carregar() || {});
  preencherMissoes();
  salvarAgora();
  setInterval(salvarAgora, config.save.intervaloSegundos * 1000);
  // Salva também quando o jogador sai do app ou troca de aba
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') salvarAgora();
  });
  window.addEventListener('pagehide', salvarAgora);
  return estado;
}

function novoEstado() {
  const colecao = {};
  for (const id of config.plantasIniciais) colecao[id] = evo.registroNovo();
  return {
    jogo: 'horta-selvagem',
    versao: save.VERSAO_SAVE,
    criadoEm: Date.now(),
    ultimaSessao: Date.now(),
    moedas: config.inicio.moedas,
    orvalho: config.inicio.orvalho,
    nivel: config.inicio.nivel,
    broto: { regas: 0 },
    time: structuredClone(config.timeInicial),
    colecao,
    inventario: {},
    vencidas: [],
    velocidadeBatalha: 1,
    somLigado: true,
    xpJogador: 0,
    folego: { valor: config.folego.max, desde: Date.now() },
    contadores: {},
    estrelasFases: {},
    missoes: { ativas: [], proxima: 0 },
    torre: { andar: 1, melhor: 0 },
    desafio: { dia: '', vencido: false, total: 0 },
    canteiro: Array(dados.rotina.canteiro.vasos).fill(null),
    expedicao: null,
    presenca: { dia: '', dias: 0 },
    invasao: null,
    feira: { dia: '', comprados: [] },
    herbario: { pegas: [] },
  };
}

function completar(salvo) {
  const e = Object.assign(novoEstado(), salvo);
  // Plantas que já estavam no time de saves antigos entram na coleção
  for (const m of e.time) if (!e.colecao[m.planta]) e.colecao[m.planta] = evo.registroNovo();
  // Cópias além do que a planta ainda vai usar viram Mudas Repetidas
  for (const r of Object.values(e.colecao)) {
    if (!r.ascensao) r.ascensao = 0;
    guardarSobras(r, e.inventario);
  }
  while (e.canteiro.length < dados.rotina.canteiro.vasos) e.canteiro.push(null);
  return e;
}

export function salvarAgora() {
  return save.salvar(estado);
}

export function substituir(novo) {
  estado = completar(novo);
  preencherMissoes();
  salvarAgora();
}

export function recomecar() {
  save.apagar();
  estado = novoEstado();
  preencherMissoes();
  salvarAgora();
}

function contar(nome, n = 1) {
  estado.contadores[nome] = (estado.contadores[nome] || 0) + n;
}

// ---------- Nível do jogador ----------

export function xpJogadorInfo() {
  const c = config.jogador;
  return { nivel: estado.nivel, xp: estado.xpJogador, precisa: c.xpBase + estado.nivel * c.xpPorNivel };
}

// Vagas no time: começa com algumas e libera mais ao subir de nível
export function vagasTime(nivel = estado.nivel) {
  const v = config.batalha.vagasTime;
  return v.inicial + v.liberaNoNivel.filter((n) => nivel >= n).length;
}

// Próximo nível que libera vaga (ou null se já liberou todas)
export function proximaVaga() {
  return config.batalha.vagasTime.liberaNoNivel.find((n) => estado.nivel < n) ?? null;
}

// Devolve quantos níveis o jogador subiu. Subir enche o fôlego e dá orvalho.
function darXpJogador(xp) {
  estado.xpJogador += xp;
  let subiu = 0;
  let info = xpJogadorInfo();
  while (info.xp >= info.precisa) {
    estado.xpJogador -= info.precisa;
    estado.nivel += 1;
    estado.orvalho += config.jogador.orvalhoPorNivel;
    subiu += 1;
    info = xpJogadorInfo();
  }
  if (subiu) estado.folego = { valor: Math.max(estado.folego.valor, config.folego.max), desde: Date.now() };
  return subiu;
}

// ---------- Fôlego ----------
// Recupera 1 ponto a cada X minutos, inclusive com o jogo fechado (usa o relógio).

export function folego() {
  const c = config.folego;
  const f = estado.folego;
  const passo = c.minutosPorPonto * 60000;
  const agora = Date.now();
  if (f.valor >= c.max) {
    f.desde = agora;
  } else {
    const pontos = Math.floor((agora - f.desde) / passo);
    if (pontos > 0) {
      f.valor = Math.min(c.max, f.valor + pontos);
      f.desde = f.valor >= c.max ? agora : f.desde + pontos * passo;
    }
  }
  const falta = f.valor >= c.max ? 0 : passo - (agora - f.desde);
  return { valor: f.valor, max: c.max, falta };
}

export function gastarFolego(qtd) {
  const atual = folego();
  if (atual.valor < qtd) return false;
  if (atual.valor >= atual.max) estado.folego.desde = Date.now();
  estado.folego.valor -= qtd;
  salvarAgora();
  return true;
}

export function recarregarFolego() {
  const custo = config.folego.recargaOrvalho;
  if (folego().valor >= config.folego.max) return { ok: false, erro: 'folegoCheio' };
  if (estado.orvalho < custo) return { ok: false, erro: 'semOrvalho' };
  estado.orvalho -= custo;
  estado.folego = { valor: config.folego.max, desde: Date.now() };
  salvarAgora();
  return { ok: true };
}

// ---------- Missões ----------

function missaoPorId(id) {
  return dados.missoes.missoes.find((m) => m.id === id);
}

// Ativa as próximas missões da fila até o limite. Devolve as que entraram.
function preencherMissoes() {
  const lista = dados.missoes.missoes;
  const novas = [];
  const m = estado.missoes;
  while (m.ativas.length < dados.missoes.ativasMax && m.proxima < lista.length) {
    const missao = lista[m.proxima++];
    m.ativas.push({ id: missao.id, base: { ...estado.contadores }, nova: true });
    novas.push(missao);
  }
  return novas;
}

// Lista das missões ativas com a definição e se estão completas
export function missoesAtivas() {
  return estado.missoes.ativas
    .map((ativa) => ({ ativa, missao: missaoPorId(ativa.id) }))
    .filter((x) => x.missao)
    .map((x) => ({ ...x, completa: missaoCompleta(estado, x.ativa, x.missao) }));
}

export function idsMissoesCompletas() {
  return missoesAtivas().filter((x) => x.completa).map((x) => x.missao.id);
}

export function marcarMissaoVista(id) {
  const ativa = estado.missoes.ativas.find((a) => a.id === id);
  if (ativa && ativa.nova) { ativa.nova = false; salvarAgora(); }
}

export function resgatarMissao(id) {
  const item = missoesAtivas().find((x) => x.missao.id === id);
  if (!item || !item.completa) return { ok: false, erro: 'semMaterial' };
  const p = item.missao.premio;
  estado.moedas += p.moedas || 0;
  estado.orvalho += p.orvalho || 0;
  for (const [carta, qtd] of Object.entries(p.cartas || {})) {
    estado.inventario[carta] = (estado.inventario[carta] || 0) + qtd;
  }
  const subiuJogador = darXpJogador(p.xp || 0);
  estado.missoes.ativas = estado.missoes.ativas.filter((a) => a.id !== id);
  const novas = preencherMissoes();
  salvarAgora();
  return { ok: true, novas, subiuJogador };
}

// ---------- Broto ----------

// Rega o broto. Devolve as moedas ganhas se ele mudou de estágio.
export function regarBroto() {
  estado.broto.regas += 1;
  contar('regarBroto');
  const porEstagio = config.broto.regasPorEstagio;
  const ganhou = estado.broto.regas % porEstagio === 0 ? config.broto.moedasPorEstagio : 0;
  estado.moedas += ganhou;
  salvarAgora();
  return ganhou;
}

export function estagioBroto() {
  const { regasPorEstagio, estagios } = config.broto;
  const indice = Math.floor(estado.broto.regas / regasPorEstagio) % estagios.length;
  const progresso = (estado.broto.regas % regasPorEstagio) / regasPorEstagio;
  return { emoji: estagios[indice], progresso };
}

// ---------- Batalha ----------

export function definirTime(time) {
  estado.time = time;
  salvarAgora();
}

export function definirSom(ligado) {
  estado.somLigado = ligado;
  salvarAgora();
}

export function definirVelocidade(v) {
  estado.velocidadeBatalha = v;
  salvarAgora();
}

// Guarda o resultado da batalha. Devolve o XP dado, as moedas e o orvalho ganhos,
// as plantas que subiram de nível e quantos níveis o jogador subiu.
// Batalhas da campanha não têm "tipo"; as atividades têm 'torre', 'desafio' ou 'treino'.
// "extra" traz dados que só algumas batalhas usam (ex.: { dano } na Invasão).
export function registrarBatalha(batalha, vitoria, cartas, estrelas = 0, extra = {}) {
  const tipo = batalha.tipo || 'campanha';
  if (tipo === 'invasao') return registrarInvasao(batalha, extra.dano || 0);
  const premio = vitoria && premioValido(batalha);
  const xpCheio = batalha.recompensa.xp || 0;
  const xp = vitoria ? (premio ? xpCheio : 0) : Math.round(xpCheio * config.evolucao.xpDerrota);
  const subiram = [];
  for (const m of estado.time) {
    const registro = estado.colecao[m.planta];
    if (registro && evo.darXp(registro, xp, config.evolucao) > 0) {
      subiram.push({ id: m.planta, nivel: registro.nivel });
    }
  }
  if (tipo !== 'treino') contar('batalhar');
  let moedas = 0;
  let orvalho = 0;
  if (premio) {
    moedas = batalha.recompensa.moedas || 0;
    orvalho = batalha.recompensa.orvalho || 0;
    estado.moedas += moedas;
    estado.orvalho += orvalho;
    for (const c of cartas) estado.inventario[c] = (estado.inventario[c] || 0) + 1;
    contar('coletarCarta', cartas.length);
  }
  if (vitoria && tipo === 'campanha') {
    if (!estado.vencidas.includes(batalha.id)) estado.vencidas.push(batalha.id);
    estado.estrelasFases[batalha.id] = Math.max(estado.estrelasFases[batalha.id] || 0, estrelas);
    contar('vencerFase');
    if (batalha.chefe) contar('vencerChefe');
  }
  if (premio && tipo === 'torre') {
    estado.torre.melhor = Math.max(estado.torre.melhor, batalha.andar);
    estado.torre.andar = batalha.andar + 1;
    contar('subirTorre');
  }
  if (premio && tipo === 'desafio') {
    estado.desafio = { dia: batalha.dia, vencido: true, total: (estado.desafio.total || 0) + 1 };
    contar('vencerDesafio');
  }
  const subiuJogador = darXpJogador(xp);
  salvarAgora();
  return { xp, moedas, orvalho, subiram, subiuJogador, cartas: premio ? cartas : [] };
}

function darXpAoTime(xp) {
  const subiram = [];
  for (const m of estado.time) {
    const registro = estado.colecao[m.planta];
    if (registro && evo.darXp(registro, xp, config.evolucao) > 0) subiram.push({ id: m.planta, nivel: registro.nivel });
  }
  return subiram;
}

// ---------- Invasão de Chefe ----------
// Cada ataque sempre dá prêmio: moedas pelo dano, XP e chance de cartas.

function registrarInvasao(batalha, dano) {
  const c = dados.invasao;
  const inv = estado.invasao;
  if (inv) inv.dano += dano;
  const moedas = c.moedasBase + Math.round((dano / batalha.vidaUm) * c.moedasPorVidaChefe);
  const xp = batalha.recompensa.xp;
  const cartas = sortearCartas(batalha.cartas);
  estado.moedas += moedas;
  guardarCartas(cartas);
  const subiram = darXpAoTime(xp);
  contar('batalhar');
  contar('atacarInvasao');
  const subiuJogador = darXpJogador(xp);
  salvarAgora();
  return { xp, moedas, orvalho: 0, subiram, subiuJogador, cartas, dano };
}

// Invasão de um ciclo que já acabou e ainda tem prêmio pra pegar (ou null)
export function invasaoPendente() {
  const inv = estado.invasao;
  if (!inv || inv.ciclo === cicloAtual(dados).ciclo || inv.premioPego || !inv.dano) return null;
  const sit = situacaoInvasao(inv, dados);
  return { ...sit, premio: premioDoRanking(sit.posicao, sit.derrotado, dados) };
}

export function resgatarInvasao() {
  const p = invasaoPendente();
  if (!p) return { ok: false };
  darPremio(p.premio);
  estado.invasao.premioPego = true;
  contar('fimInvasao');
  salvarAgora();
  return { ok: true, premio: p.premio };
}

// Situação da invasão de agora (começa uma nova se precisar)
export function invasaoAtual() {
  if (invasaoPendente()) return null;
  const ciclo = cicloAtual(dados).ciclo;
  if (!estado.invasao || estado.invasao.ciclo !== ciclo) {
    estado.invasao = novoCicloInvasao(dados, estado);
    salvarAgora();
  }
  const inv = estado.invasao;
  const dia = hoje();
  const usados = inv.dia === dia ? inv.ataques : 0;
  return {
    ...situacaoInvasao(inv, dados),
    ciclo,
    gratis: Math.max(0, dados.invasao.ataquesGratis - usados),
  };
}

// Gasta um ataque (grátis do dia ou pago com orvalho) antes da batalha
export function gastarAtaqueInvasao() {
  const sit = invasaoAtual();
  if (!sit || sit.derrotado || sit.terminou) return { ok: false, erro: 'invasaoAcabou' };
  const inv = estado.invasao;
  const dia = hoje();
  if (inv.dia !== dia) { inv.dia = dia; inv.ataques = 0; }
  if (sit.gratis <= 0) {
    const custo = dados.invasao.custoAtaqueExtra;
    if (estado.orvalho < custo) return { ok: false, erro: 'semOrvalho' };
    estado.orvalho -= custo;
  }
  inv.ataques += 1;
  salvarAgora();
  return { ok: true };
}

// ---------- Feira ----------

export function feiraHoje() {
  const dia = hoje();
  if (estado.feira.dia !== dia) estado.feira = { dia, comprados: [] };
  return ofertasDoDia(dados, dia).map((o) => ({ ...o, comprado: estado.feira.comprados.includes(o.id) }));
}

export function comprarOferta(id) {
  const oferta = feiraHoje().find((o) => o.id === id);
  if (!oferta || oferta.comprado) return { ok: false, erro: 'feiraEsgotado' };
  if (estado.moedas < oferta.moedas) return { ok: false, erro: 'semMoedas' };
  estado.moedas -= oferta.moedas;
  darPremio(oferta.carta ? { cartas: { [oferta.carta]: oferta.qtd } } : { orvalho: oferta.orvalho });
  estado.feira.comprados.push(id);
  contar('comprarFeira');
  salvarAgora();
  return { ok: true, oferta };
}

export function fazerTroca(id) {
  const troca = dados.feira.trocas.find((t) => t.id === id);
  if (!troca || !evo.temCartas(estado.inventario, troca.de)) return { ok: false, erro: 'semMaterial' };
  evo.gastarCartas(estado.inventario, troca.de);
  darPremio({ cartas: troca.para });
  contar('trocarFeira');
  salvarAgora();
  return { ok: true, troca };
}

// ---------- Herbário ----------

export function fusoes() {
  return fusoesHerbario(dados, estado);
}

export function herbario() {
  return paginasHerbario(dados, estado);
}

export function resgatarPagina(id) {
  const pagina = herbario().find((p) => p.id === id);
  if (!pagina || !pagina.completa || pagina.pega) return { ok: false, erro: 'semMaterial' };
  darPremio(pagina.premio);
  estado.herbario.pegas.push(id);
  contar('paginaHerbario');
  salvarAgora();
  return { ok: true, premio: pagina.premio };
}

// A vitória ainda dá prêmio? (andar da torre já passado, desafio já feito hoje e treino não dão)
function premioValido(batalha) {
  if (batalha.tipo === 'treino') return false;
  if (batalha.tipo === 'torre') return batalha.andar === estado.torre.andar;
  if (batalha.tipo === 'desafio') return !(estado.desafio.dia === batalha.dia && estado.desafio.vencido);
  return true;
}

// ---------- Rotina diária: Canteiro, Expedição e Calendário ----------
// Tudo usa a hora do relógio, então continua andando com o jogo fechado.

function sortearCartas(lista) {
  return lista.filter((c) => Math.random() < c.chance).map((c) => c.carta);
}

function guardarCartas(cartas) {
  for (const c of cartas) estado.inventario[c] = (estado.inventario[c] || 0) + 1;
  contar('coletarCarta', cartas.length);
}

// Moedas, orvalho e cartas ({ id: qtd }) de um prêmio fixo
function darPremio(p) {
  estado.moedas += p.moedas || 0;
  estado.orvalho += p.orvalho || 0;
  for (const [carta, qtd] of Object.entries(p.cartas || {})) {
    estado.inventario[carta] = (estado.inventario[carta] || 0) + qtd;
  }
}

const mudaPorId = (id) => dados.rotina.canteiro.mudas.find((m) => m.id === id);

// Situação de um vaso: vazio, crescendo (com tempo que falta) ou pronto
export function vasoInfo(i) {
  const v = estado.canteiro[i];
  const muda = v && mudaPorId(v.muda);
  if (!muda) return { vazio: true };
  const total = muda.minutos * 60000;
  const passou = Date.now() - v.desde;
  return { muda, pronto: passou >= total, falta: Math.max(0, total - passou), progresso: Math.min(1, passou / total) };
}

export function plantarMuda(i, idMuda) {
  const muda = mudaPorId(idMuda);
  if (!muda || !vasoInfo(i).vazio) return { ok: false, erro: 'semMaterial' };
  if (estado.nivel < muda.nivelMin) return { ok: false, erro: 'mudaBloqueada' };
  if (estado.moedas < muda.custo) return { ok: false, erro: 'semMoedas' };
  estado.moedas -= muda.custo;
  estado.canteiro[i] = { muda: muda.id, desde: Date.now() };
  contar('plantarMuda');
  salvarAgora();
  return { ok: true };
}

export function colherVaso(i) {
  const info = vasoInfo(i);
  if (!info.pronto) return { ok: false, erro: 'naoPronto' };
  const cartas = sortearCartas(info.muda.cartas);
  estado.moedas += info.muda.moedas;
  guardarCartas(cartas);
  estado.canteiro[i] = null;
  contar('colherCanteiro');
  salvarAgora();
  return { ok: true, moedas: info.muda.moedas, cartas, muda: info.muda };
}

const destinoPorId = (id) => dados.rotina.expedicao.destinos.find((d) => d.id === id);

export function emExpedicao(idPlanta) {
  return !!estado.expedicao && estado.expedicao.plantas.includes(idPlanta);
}

// Quanto a expedição rende e demora com essas plantas.
// Nível: mais moedas e XP. Estrelas acima de 1: mais chance de cartas e viagem mais curta.
export function previaExpedicao(idDestino, plantas) {
  const d = destinoPorId(idDestino);
  const c = dados.rotina.expedicao;
  let moedas = 0;
  let estrelasExtras = 0;
  const xp = {};
  for (const id of plantas) {
    const r = estado.colecao[id];
    if (!r) continue;
    moedas += d.moedasPorPlanta + d.moedasPorNivel * r.nivel;
    xp[id] = d.xpPorPlanta + (d.xpPorNivel || 0) * r.nivel;
    estrelasExtras += r.estrelas - 1;
  }
  const reducao = Math.min(c.reducaoMax, c.reducaoPorEstrela * estrelasExtras);
  return {
    moedas, xp, reducao,
    duracao: Math.round(d.horas * 3600000 * (1 - reducao)),
    xpTotal: Object.values(xp).reduce((s, n) => s + n, 0),
  };
}

export function expedicaoInfo() {
  const e = estado.expedicao;
  const destino = e && destinoPorId(e.destino);
  if (!destino) return null;
  const total = e.duracao || destino.horas * 3600000;
  const passou = Date.now() - e.desde;
  return { destino, plantas: e.plantas, pronta: passou >= total, falta: Math.max(0, total - passou), progresso: Math.min(1, passou / total) };
}

export function enviarExpedicao(idDestino, plantas) {
  const destino = destinoPorId(idDestino);
  if (!destino || estado.expedicao) return { ok: false, erro: 'semMaterial' };
  if (!plantas.length) return { ok: false, erro: 'expedicaoVazia' };
  if (plantas.length > dados.rotina.expedicao.maxPlantas) return { ok: false, erro: 'semMaterial' };
  if (plantas.some((id) => !estado.colecao[id] || estado.time.some((m) => m.planta === id))) return { ok: false, erro: 'expedicaoNoTime' };
  const previa = previaExpedicao(destino.id, plantas);
  estado.expedicao = { destino: destino.id, plantas: [...plantas], desde: Date.now(), duracao: previa.duracao };
  contar('enviarExpedicao');
  salvarAgora();
  return { ok: true };
}

export function receberExpedicao() {
  const info = expedicaoInfo();
  if (!info || !info.pronta) return { ok: false, erro: 'naoPronto' };
  const d = info.destino;
  const previa = previaExpedicao(d.id, info.plantas);
  const bonus = dados.rotina.expedicao.bonusCartaPorEstrela;
  const moedas = previa.moedas;
  let cartas = [];
  const subiram = [];
  for (const id of info.plantas) {
    const registro = estado.colecao[id];
    if (!registro) continue;
    // cada estrela acima de 1 aumenta a chance de cada carta
    const mult = 1 + bonus * (registro.estrelas - 1);
    cartas = cartas.concat(sortearCartas(d.cartas.map((c) => ({ ...c, chance: c.chance * mult }))));
    if (evo.darXp(registro, previa.xp[id], config.evolucao) > 0) subiram.push({ id, nivel: registro.nivel });
  }
  estado.moedas += moedas;
  guardarCartas(cartas);
  estado.expedicao = null;
  contar('voltarExpedicao');
  salvarAgora();
  return { ok: true, moedas, cartas, subiram, xp: previa.xpTotal };
}

// Calendário: um prêmio por dia em que o jogador entra (não precisa ser seguido).
// Devolve o número do dia (0 a 6) se ainda não pegou o de hoje, senão -1.
export function presencaPendente() {
  if (estado.presenca.dia === hoje()) return -1;
  return estado.presenca.dias % dados.rotina.presenca.premios.length;
}

export function resgatarPresenca() {
  const indice = presencaPendente();
  if (indice < 0) return { ok: false };
  const premio = dados.rotina.presenca.premios[indice];
  darPremio(premio);
  estado.presenca = { dia: hoje(), dias: estado.presenca.dias + 1 };
  contar('presenca');
  salvarAgora();
  return { ok: true, indice, premio };
}

// ---------- Evolução ----------
// Cada função devolve { ok: true, ... } ou { ok: false, erro: 'chave do texto' }

export function treinar(idPlanta, idCarta) {
  const registro = estado.colecao[idPlanta];
  const carta = dados.cartas.find((c) => c.id === idCarta);
  if (!registro || !carta || !carta.xp) return { ok: false, erro: 'semMaterial' };
  if ((estado.inventario[idCarta] || 0) < 1) return { ok: false, erro: 'semMaterial' };
  if (registro.nivel >= evo.nivelMaximo(registro.estrelas, config.evolucao, registro.ascensao || 0)) return { ok: false, erro: 'nivelMaximo' };
  estado.inventario[idCarta] -= 1;
  const subiu = evo.darXp(registro, carta.xp, config.evolucao);
  contar('treinar');
  salvarAgora();
  return { ok: true, subiu };
}

export function evoluirEstrela(idPlanta) {
  const registro = estado.colecao[idPlanta];
  const custo = registro && evo.custoEstrela(registro, config.evolucao);
  if (!custo) return { ok: false, erro: 'semMaterial' };
  if (registro.copias < custo.copias) return { ok: false, erro: 'semMaterial' };
  if (estado.moedas < custo.moedas) return { ok: false, erro: 'semMoedas' };
  registro.copias -= custo.copias;
  estado.moedas -= custo.moedas;
  registro.estrelas += 1;
  contar('evoluirEstrela');
  salvarAgora();
  return { ok: true };
}

export function ascender(idPlanta) {
  const registro = estado.colecao[idPlanta];
  if (!registro || !evo.podeAscender(registro, config.evolucao)) return { ok: false, erro: 'ascensaoNaoPronta' };
  const custo = evo.custoAscensao(registro, dados);
  if (!custo) return { ok: false, erro: 'ascensaoNaoPronta' };
  if (estado.moedas < custo.moedas) return { ok: false, erro: 'semMoedas' };
  if (!evo.temCartas(estado.inventario, custo.cartas)) return { ok: false, erro: 'semMaterial' };
  estado.moedas -= custo.moedas;
  evo.gastarCartas(estado.inventario, custo.cartas);
  registro.ascensao = (registro.ascensao || 0) + 1;
  registro.nivel = 1;
  registro.xp = 0;
  contar('ascender');
  salvarAgora();
  return { ok: true };
}

export function melhorarEquip(idPlanta, idEspaco) {
  const registro = estado.colecao[idPlanta];
  const custo = registro && evo.custoEquip(registro, idEspaco, dados);
  if (!custo) return { ok: false, erro: 'semMaterial' };
  if (estado.moedas < custo.moedas) return { ok: false, erro: 'semMoedas' };
  if (!evo.temCartas(estado.inventario, custo.cartas)) return { ok: false, erro: 'semMaterial' };
  estado.moedas -= custo.moedas;
  evo.gastarCartas(estado.inventario, custo.cartas);
  registro.equip[idEspaco] = (registro.equip[idEspaco] || 0) + 1;
  contar('melhorarEquip');
  salvarAgora();
  return { ok: true };
}

// Passa as cópias que sobram (além do que falta pro máximo de estrelas) pra Muda Repetida.
// Devolve quantas viraram muda.
function guardarSobras(registro, inventario) {
  const sobra = registro.copias - evo.copiasAteMaximo(registro, config.evolucao);
  if (sobra <= 0) return 0;
  registro.copias -= sobra;
  inventario[config.troca.carta] = (inventario[config.troca.carta] || 0) + sobra;
  return sobra;
}

// A planta já tem todas as cópias que vai precisar?
function copiasCompletas(id) {
  const r = estado.colecao[id];
  return !!r && r.copias >= evo.copiasAteMaximo(r, config.evolucao);
}

function abrirPacote(pesos = config.pacote.pesos) {
  const id = evo.sortearPlanta(pesos);
  const nova = !estado.colecao[id];
  let virouMuda = false;
  if (nova) estado.colecao[id] = evo.registroNovo();
  else {
    estado.colecao[id].copias += 1;
    virouMuda = guardarSobras(estado.colecao[id], estado.inventario) > 0;
  }
  contar('abrirPacote');
  salvarAgora();
  return { ok: true, id, nova, virouMuda };
}

// Faz a mesma ação até n vezes (para quando acabar o recurso). Junta os resultados.
function variasVezes(n, acao) {
  const resultados = [];
  for (let i = 0; i < n; i++) {
    const r = acao();
    if (!r.ok) { if (!resultados.length) return r; break; }
    resultados.push(r);
  }
  return { ok: true, resultados };
}

// Troca Mudas Repetidas por uma planta aleatória (não sorteia as que já têm todas as cópias)
export function trocarMudas() {
  const { carta, custo } = config.troca;
  if ((estado.inventario[carta] || 0) < custo) return { ok: false, erro: 'semMudas' };
  const pesos = Object.fromEntries(Object.entries(config.pacote.pesos).filter(([id]) => !copiasCompletas(id)));
  estado.inventario[carta] -= custo;
  return abrirPacote(Object.keys(pesos).length ? pesos : config.pacote.pesos);
}

// Troca Mudas Repetidas por um material de equipamento sorteado (os raros saem menos)
export function trocarMudasPorMaterial() {
  const { carta, custoMaterial, materiais } = config.troca;
  if ((estado.inventario[carta] || 0) < custoMaterial) return { ok: false, erro: 'semMudas' };
  const pesos = Object.fromEntries(materiais.map((m, i) => [i, m.peso]));
  const premio = materiais[evo.sortearPlanta(pesos)];
  estado.inventario[carta] -= custoMaterial;
  estado.inventario[premio.carta] = (estado.inventario[premio.carta] || 0) + premio.qtd;
  salvarAgora();
  return { ok: true, carta: premio.carta, qtd: premio.qtd };
}

// moeda: 'moedas' ou 'orvalho'
export function comprarPacote(moeda) {
  const preco = config.pacote[moeda];
  if (estado[moeda] < preco) return { ok: false, erro: moeda === 'moedas' ? 'semMoedas' : 'semOrvalho' };
  estado[moeda] -= preco;
  return abrirPacote();
}

export function comprarPacotes(moeda, n) {
  const preco = config.pacote[moeda] * n;
  if (estado[moeda] < preco) return { ok: false, erro: moeda === 'moedas' ? 'semMoedas' : 'semOrvalho' };
  return variasVezes(n, () => comprarPacote(moeda));
}

export function plantarSementes(n) { return variasVezes(n, plantarSemente); }
export function trocarMudasVarias(n) { return variasVezes(n, trocarMudas); }

export function plantarSemente() {
  if ((estado.inventario.semente_misteriosa || 0) < 1) return { ok: false, erro: 'semMaterial' };
  estado.inventario.semente_misteriosa -= 1;
  return abrirPacote();
}
