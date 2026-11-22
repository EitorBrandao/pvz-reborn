// Todo o estado do jogo mora aqui. Só este arquivo fala com o save.

import * as save from './save.js';
import * as evo from './evolucao.js';
import { missaoCompleta } from './missoes.js';
import { hoje } from './atividades.js';
import * as lab from './labirinto.js';
import * as ar from './arena.js';
import { receitaDe, situacaoFusao, registroHibrida } from './fusao.js';
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
    labirinto: { melhor: 0, coringa: 0, run: null },
    arena: null,
    ronda: { mudas: [], destino: null, plantas: [], replantar: dados.rotina.ronda.replantarPadrao, variar: false },
    viveiro: { prontos: [], atual: null, fila: [], avisos: [] },
  };
}

function completar(salvo) {
  const e = Object.assign(novoEstado(), salvo);
  // Plantas que já estavam no time de saves antigos entram na coleção
  for (const m of e.time) if (!e.colecao[m.planta]) e.colecao[m.planta] = evo.registroNovo();
  // Cópias além do que a planta ainda vai usar viram Mudas Repetidas
  for (const r of Object.values(e.colecao)) {
    if (!r.ascensao) r.ascensao = 0;
    if (!r.talentos) r.talentos = {};
    guardarSobras(r, e.inventario);
  }
  // Talentos que não existem na classe da planta são devolvidos (viram pontos livres)
  for (const [id, r] of Object.entries(e.colecao)) {
    const base = dados.plantas.find((x) => x.id === id);
    if (!base) continue;
    for (const no of Object.keys(r.talentos)) if (!evo.noTalento(dados, base, no, r)) delete r.talentos[no];
  }
  e.viveiro = limparViveiro(e.viveiro);
  while (e.canteiro.length < dados.rotina.canteiro.vasos + efeitoDe(e.viveiro.prontos, 'vasoExtra')) e.canteiro.push(null);
  // Ronda: saves antigos lembram a muda que está em cada vaso e a expedição que está viajando
  if (!e.ronda) e.ronda = novoEstado().ronda;
  e.canteiro.forEach((v, i) => { if (v && !e.ronda.mudas[i]) e.ronda.mudas[i] = v.muda; });
  if (e.expedicao && !e.ronda.destino) { e.ronda.destino = e.expedicao.destino; e.ronda.plantas = [...e.expedicao.plantas]; }
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
  if (subiu) estado.folego = { valor: Math.max(estado.folego.valor, folegoMax()), desde: Date.now() };
  return subiu;
}

// ---------- Viveiro de Pesquisa ----------
// Árvore de melhorias de capacidade e conforto. Só uma pesquisa roda por vez (e a fila, se
// pesquisada). Tudo conta pelo relógio, inclusive com o jogo fechado. Todo limite que as pesquisas
// mexem (vasos, vagas da expedição, fôlego, vezes do Tonico) vem das funções daqui.

const nosViveiro = () => dados.viveiro.nos;
const noPorId = (id) => nosViveiro().find((n) => n.id === id);

function efeitoDe(prontos, tipo) {
  return prontos.reduce((soma, id) => {
    const ef = noPorId(id)?.efeito;
    return ef && ef.tipo === tipo ? soma + ef.valor : soma;
  }, 0);
}

// Deixa o viveiro do save em ordem: ids que não existem mais saem, sem mexer no resto do jogo
function limparViveiro(v) {
  const ok = (id) => typeof id === 'string' && !!noPorId(id);
  const bruto = v && typeof v === 'object' ? v : {};
  const lista = (l) => (Array.isArray(l) ? l.filter(ok) : []);
  const prontos = [...new Set(lista(bruto.prontos))];
  const atual = bruto.atual && ok(bruto.atual.id) && Number.isFinite(bruto.atual.desde) && !prontos.includes(bruto.atual.id)
    ? { id: bruto.atual.id, desde: bruto.atual.desde } : null;
  const fila = atual ? lista(bruto.fila).filter((id) => !prontos.includes(id) && id !== atual.id) : [];
  return { prontos, atual, fila, avisos: lista(bruto.avisos) };
}

// Conclui o que já passou do tempo (mesmo com o jogo fechado) e começa a próxima da fila
export function viveiroAtualizar() {
  const v = estado.viveiro;
  let mudou = false;
  while (v.atual) {
    const no = noPorId(v.atual.id);
    const fim = v.atual.desde + no.minutos * 60000;
    if (Date.now() < fim) break;
    v.prontos.push(no.id);
    v.avisos.push(no.id);
    const proximo = v.fila.shift();
    v.atual = proximo ? { id: proximo, desde: fim } : null;
    mudou = true;
  }
  if (mudou) {
    while (estado.canteiro.length < vasos()) estado.canteiro.push(null);
    salvarAgora();
  }
}

export function efeitoViveiro(tipo) {
  viveiroAtualizar();
  return efeitoDe(estado.viveiro.prontos, tipo);
}

export const vasos = () => dados.rotina.canteiro.vasos + efeitoViveiro('vasoExtra');
export const maxPlantasExpedicao = () => dados.rotina.expedicao.maxPlantas + efeitoViveiro('vagaExpedicao');
export const folegoMax = () => config.folego.max + efeitoViveiro('folegoMax');
export const tonicoVezes = () => (viveiroAtualizar(), [...dados.rotina.tonico.vezes, ...nosViveiro().filter((n) => n.efeito.tipo === 'tonicoVezes' && estado.viveiro.prontos.includes(n.id)).map((n) => n.efeito.valor)].sort((a, b) => a - b));
export const moedasDaMuda = (muda) => Math.round(muda.moedas * (1 + efeitoViveiro('moedasVasoPct') / 100));

export function viveiroLiberado() {
  return estado.nivel >= dados.viveiro.nivelMin;
}

// Situação de cada nó: pronto, rodando, fila, livre (dá pra começar) ou trava (falta pré-requisito)
export function viveiroInfo() {
  viveiroAtualizar();
  const v = estado.viveiro;
  const agendados = [...(v.atual ? [v.atual.id] : []), ...v.fila];
  const nos = nosViveiro().map((no) => {
    let situacao;
    if (v.prontos.includes(no.id)) situacao = 'pronto';
    else if (v.atual && v.atual.id === no.id) situacao = 'rodando';
    else if (v.fila.includes(no.id)) situacao = 'fila';
    else if (no.requer.every((r) => v.prontos.includes(r) || agendados.includes(r))) situacao = 'livre';
    else situacao = 'trava';
    return { no, situacao, faltaRequer: no.requer.filter((r) => !v.prontos.includes(r) && !agendados.includes(r)).map((r) => noPorId(r)) };
  });
  let atual = null;
  if (v.atual) {
    const total = noPorId(v.atual.id).minutos * 60000;
    const passou = Date.now() - v.atual.desde;
    atual = { no: noPorId(v.atual.id), falta: Math.max(0, total - passou), progresso: Math.min(1, passou / total) };
  }
  return { nos, atual, fila: v.fila.map(noPorId), vagasFila: efeitoViveiro('filaPesquisa'), avisos: v.avisos.length, prontos: v.prontos.length, total: nosViveiro().length };
}

export function iniciarPesquisa(id) {
  if (!viveiroLiberado()) return { ok: false, erro: 'viveiroBloqueado' };
  const info = viveiroInfo();
  const item = info.nos.find((n) => n.no.id === id);
  if (!item || item.situacao === 'pronto' || item.situacao === 'rodando' || item.situacao === 'fila') return { ok: false, erro: 'pesquisaJaFeita' };
  if (item.situacao === 'trava') return { ok: false, erro: 'pesquisaTrava' };
  const v = estado.viveiro;
  if (v.atual && v.fila.length >= info.vagasFila) return { ok: false, erro: 'viveiroOcupado' };
  const no = item.no;
  if (estado.moedas < no.moedas) return { ok: false, erro: 'semMoedas' };
  for (const [carta, qtd] of Object.entries(no.materiais)) if ((estado.inventario[carta] || 0) < qtd) return { ok: false, erro: 'semMaterial' };
  estado.moedas -= no.moedas;
  for (const [carta, qtd] of Object.entries(no.materiais)) estado.inventario[carta] -= qtd;
  const enfileirada = !!v.atual;
  if (enfileirada) v.fila.push(no.id);
  else v.atual = { id: no.id, desde: Date.now() };
  contar('iniciarPesquisa');
  salvarAgora();
  return { ok: true, enfileirada };
}

// Abrir a tela do Viveiro conta como ver os avisos de pesquisa pronta
export function viveiroVisto() {
  if (!estado.viveiro.avisos.length) return;
  estado.viveiro.avisos = [];
  salvarAgora();
}

// ---------- Fôlego ----------
// Recupera 1 ponto a cada X minutos, inclusive com o jogo fechado (usa o relógio).

export function folego() {
  const c = { ...config.folego, max: folegoMax() };
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
  if (folego().valor >= folegoMax()) return { ok: false, erro: 'folegoCheio' };
  if (estado.orvalho < custo) return { ok: false, erro: 'semOrvalho' };
  estado.orvalho -= custo;
  estado.folego = { valor: folegoMax(), desde: Date.now() };
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
  if (tipo === 'labirinto') return registrarLabirinto(batalha, vitoria, extra.vidas || {});
  const arena = tipo === 'arena' ? registrarArena(batalha, vitoria) : null;
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
  if (arena) { estado.orvalho += arena.orvalho; orvalho += arena.orvalho; }
  salvarAgora();
  return { xp, moedas, orvalho, subiram, subiuJogador, cartas: premio ? cartas : [], arena };
}

function darXpAoTime(xp) {
  const subiram = [];
  for (const m of estado.time) {
    const registro = estado.colecao[m.planta];
    if (registro && evo.darXp(registro, xp, config.evolucao) > 0) subiram.push({ id: m.planta, nivel: registro.nivel });
  }
  return subiram;
}

// ---------- Arena ----------
// Ranking por pontos (estilo Elo) contra rivais bots. Cada dia: 5 desafios, prêmio da posição
// e recados de quem te desafiou com o jogo fechado.

function arenaAtual() {
  const dia = hoje();
  const n = dados.arena.rivais.length + 1;
  if (!estado.arena) {
    estado.arena = { inicio: dia, pontos: dados.arena.pontosIniciais, ajustes: {}, dia: '', desafios: 0, orvalhoDia: 0, premioDia: '', melhor: n, vistoEm: dia, mural: [], naoVistos: 0 };
  }
  const a = estado.arena;
  if (a.ordem) {
    // save da versão 0.15 (ranking por posição): vira pontos perto de onde você estava
    const eu = a.ordem.indexOf(ar.VOCE);
    const dias = ar.diasEntre(a.inicio, dia);
    const acima = eu > 0 ? ar.pontosBase(a.ordem[eu - 1], dias, dados) : dados.arena.pontosTopo + 100;
    a.pontos = Math.max(dados.arena.pontosIniciais, acima - 1);
    a.ajustes = {};
    delete a.ordem;
  }
  if (!a.ajustes) a.ajustes = {};
  if (a.vistoEm !== dia) {
    // enquanto o jogo estava fechado, rivais abaixo de você podem ter te desafiado
    const r = ar.ausencia(a, estado, dados, dia);
    a.pontos = r.pontos;
    a.ajustes = r.ajustes;
    a.mural = [...r.mural.reverse(), ...a.mural].slice(0, dados.arena.muralMax);
    a.naoVistos = (a.naoVistos || 0) + r.mural.length;
    a.vistoEm = dia;
  }
  if (a.dia !== dia) { a.dia = dia; a.desafios = 0; a.orvalhoDia = 0; }
  return a;
}

function rankingArena(a) {
  return ar.ranking(a, ar.diasEntre(a.inicio, hoje()), dados);
}

const posicaoNoRanking = (rank) => rank.findIndex((x) => x.id === ar.VOCE) + 1;

export function arenaInfo() {
  const a = arenaAtual();
  const c = dados.arena;
  const dias = ar.diasEntre(a.inicio, hoje());
  const rank = rankingArena(a);
  const posicao = posicaoNoRanking(rank);
  // quanto cada desafio pode render ou custar
  const comRival = (x) => ({
    ...x,
    rival: ar.rivalDoRanking(x.id, dias, dados),
    ganha: ar.variacaoElo(a.pontos, x.pontos, true, c.k),
    perde: ar.variacaoElo(a.pontos, x.pontos, false, c.k),
    chance: Math.round(ar.chanceElo(a.pontos, x.pontos) * 100),
  });
  salvarAgora();
  return {
    pontos: a.pontos,
    posicao,
    total: rank.length,
    melhor: a.melhor,
    gratis: Math.max(0, c.desafiosPorDia - a.desafios),
    ranking: rank.map((x, i) => (x.id === ar.VOCE ? { voce: true, pos: i + 1, pontos: x.pontos } : { pos: i + 1, pontos: x.pontos, rival: ar.rivalDoRanking(x.id, dias, dados) })),
    desafiaveis: ar.desafiaveis(rank, dados).map(comRival),
    premio: { pego: a.premioDia === hoje(), premio: ar.premioDiario(posicao, dados) },
    mural: a.mural,
    naoVistos: a.naoVistos || 0,
  };
}

export function limparMuralArena() {
  if (estado.arena) estado.arena.naoVistos = 0;
  salvarAgora();
}

// Gasta um desafio do dia (ou 💧 se acabaram os grátis). Chame antes de lutar.
export function gastarDesafioArena(idRival) {
  const a = arenaAtual();
  const c = dados.arena;
  // o ranking pode ter mudado: só vale desafiar quem ainda está ao seu alcance
  if (!ar.desafiaveis(rankingArena(a), dados).some((d) => d.id === idRival)) return { ok: false, erro: 'arenaSaiuDoAlcance' };
  if (a.desafios < c.desafiosPorDia) {
    a.desafios += 1;
  } else if (estado.orvalho >= c.custoDesafioExtra) {
    estado.orvalho -= c.custoDesafioExtra;
    a.desafios += 1;
  } else {
    return { ok: false, erro: 'arenaSemDesafio' };
  }
  salvarAgora();
  return { ok: true };
}

export function resgatarPremioArena() {
  const a = arenaAtual();
  if (a.premioDia === hoje()) return { ok: false };
  const premio = ar.premioDiario(posicaoNoRanking(rankingArena(a)), dados);
  darPremio(premio);
  a.premioDia = hoje();
  contar('premioArena');
  salvarAgora();
  return { ok: true, premio };
}

// Cada luta muda os pontos dos dois (soma zero): quem ganha leva, quem perde entrega.
function registrarArena(batalha, vitoria) {
  const a = arenaAtual();
  const c = dados.arena;
  const rank = rankingArena(a);
  const antes = posicaoNoRanking(rank);
  const dias = ar.diasEntre(a.inicio, hoje());
  const id = batalha.rival.id;
  const deles = ar.pontosDoRival(a, id, dias, dados);
  const delta = ar.variacaoElo(a.pontos, deles, vitoria, c.k);
  const pontosAntes = a.pontos;
  a.pontos = Math.max(0, a.pontos + delta);
  a.ajustes[id] = Math.max(-c.ajusteMax, Math.min(c.ajusteMax, (a.ajustes[id] || 0) - delta));
  let orvalho = 0;
  const depois = posicaoNoRanking(rankingArena(a));
  if (vitoria) contar('vencerArena');
  if (depois < a.melhor) {
    const v = c.vitoria;
    orvalho = Math.max(0, Math.min((a.melhor - depois) * v.orvalhoPorPosicao, v.orvalhoMaxPorDia - a.orvalhoDia));
    a.orvalhoDia += orvalho;
    a.melhor = depois;
  }
  return { delta, pontos: a.pontos, pontosAntes, subiu: antes - depois, posicao: depois, orvalho };
}

// ---------- Labirinto das Raízes ----------
// A corrida fica salva em estado.labirinto.run (etapa: portas, bencao, recruta, evento ou fim).

const cfgLab = () => dados.labirinto;

export function labirinto() {
  return estado.labirinto;
}

export function iniciarLabirinto(ids) {
  const c = cfgLab();
  if (estado.labirinto.run) return { ok: false, erro: 'labirintoEmAndamento' };
  const validos = ids.filter((id) => estado.colecao[id] && !emExpedicao(id));
  if (!validos.length || validos.length > c.plantasInicio) return { ok: false, erro: 'labirintoTime' };
  const run = {
    andar: 0, andaresVencidos: 0, time: lab.posicionarTime(validos, dados),
    vidas: Object.fromEntries(validos.map((id) => [id, 1])),
    bencaos: [], moedas: 0, sementesExtra: 0, etapa: 'portas', portas: [], venceu: false,
  };
  run.poderMedio = lab.poderDoTime(run, dados, estado.colecao);
  run.portas = lab.gerarPortas(0, run, dados, estado.colecao, emExpedicao);
  estado.labirinto.run = run;
  salvarAgora();
  return { ok: true };
}

// Abre uma porta. Salas de batalha devolvem { batalha }; as outras mudam a etapa.
export function abrirPortaLabirinto(indice) {
  const run = estado.labirinto.run;
  const porta = run && run.etapa === 'portas' && run.portas[indice];
  if (!porta) return { ok: false };
  const c = cfgLab();
  if (porta.t === 'batalha' || porta.t === 'elite' || porta.t === 'chefe') {
    return { ok: true, batalha: lab.gerarBatalha(run, porta.t, dados, estado.colecao) };
  }
  if (porta.t === 'descanso') {
    curarTime(run, c.descansoCura);
    avancarLabirinto(run);
  } else if (porta.t === 'bencao') {
    run.etapa = 'bencao';
    run.opcoes = lab.opcoesBencao(run, dados, false);
  } else if (porta.t === 'recruta') {
    run.etapa = 'recruta';
    run.opcoes = lab.opcoesRecruta(run, dados, estado.colecao, emExpedicao);
  } else if (porta.t === 'evento') {
    run.etapa = 'evento';
    run.evento = c.eventos[Math.floor(Math.random() * c.eventos.length)].id;
  }
  salvarAgora();
  return { ok: true, tipo: porta.t };
}

function curarTime(run, fracao) {
  for (const id of Object.keys(run.vidas)) if (run.vidas[id] > 0) run.vidas[id] = Math.min(1, run.vidas[id] + fracao);
}

function machucarTime(run, fracao) {
  for (const id of Object.keys(run.vidas)) if (run.vidas[id] > 0) run.vidas[id] = Math.max(0.05, run.vidas[id] - fracao);
}

function avancarLabirinto(run) {
  run.andar += 1;
  run.andaresVencidos = Math.max(run.andaresVencidos, run.andar);
  run.opcoes = null;
  run.evento = null;
  if (run.andar >= cfgLab().andares) {
    run.venceu = true;
    run.etapa = 'fim';
    return;
  }
  run.etapa = 'portas';
  run.portas = lab.gerarPortas(run.andar, run, dados, estado.colecao, emExpedicao);
}

export function escolherBencaoLabirinto(id) {
  const run = estado.labirinto.run;
  if (!run || run.etapa !== 'bencao' || !run.opcoes.includes(id)) return { ok: false };
  run.bencaos.push(id);
  avancarLabirinto(run);
  salvarAgora();
  return { ok: true };
}

export function recrutarLabirinto(id) {
  const run = estado.labirinto.run;
  if (!run || run.etapa !== 'recruta') return { ok: false };
  if (id) {
    if (!run.opcoes.includes(id) || run.time.length >= cfgLab().plantasMax) return { ok: false };
    run.time = lab.posicionarTime([...run.time.map((m) => m.planta), id], dados);
    run.vidas[id] = 1;
  }
  avancarLabirinto(run);
  salvarAgora();
  return { ok: true };
}

// arriscar = false: ignora o evento. Devolve o texto do resultado.
export function eventoLabirinto(arriscar) {
  const run = estado.labirinto.run;
  if (!run || run.etapa !== 'evento') return { ok: false };
  const ev = cfgLab().eventos.find((e) => e.id === run.evento);
  let texto = '';
  if (arriscar) {
    const r = Math.random() < ev.chance ? ev.ok : ev.falha;
    if (r.cura) curarTime(run, r.cura);
    if (r.dano) machucarTime(run, r.dano);
    if (r.sementes) run.sementesExtra += r.sementes;
    texto = r.texto;
  }
  avancarLabirinto(run);
  salvarAgora();
  return { ok: true, texto };
}

// Resultado de uma batalha do labirinto. "vidas" = fração de vida final de cada planta.
function registrarLabirinto(batalha, vitoria, vidas) {
  const run = estado.labirinto.run;
  const c = cfgLab();
  const vazio = { xp: 0, moedas: 0, orvalho: 0, subiram: [], subiuJogador: 0, cartas: [] };
  if (!run) return vazio;
  contar('batalhar');
  for (const id of Object.keys(run.vidas)) if (id in vidas) run.vidas[id] = Math.max(0, vidas[id]);
  if (!vitoria) {
    run.etapa = 'fim';
    run.venceu = false;
  } else {
    run.moedas += c.moedasPorAndar * batalha.andar;
    if (batalha.sala === 'elite') {
      run.etapa = 'bencao';
      run.opcoes = lab.opcoesBencao(run, dados, true);
    } else {
      if (batalha.sala === 'chefe') curarTime(run, c.chefeCura);
      avancarLabirinto(run);
    }
  }
  salvarAgora();
  return vazio;
}

// Encerra a corrida: paga o prêmio e libera um novo labirinto.
export function receberLabirinto() {
  const run = estado.labirinto.run;
  if (!run || run.etapa !== 'fim') return { ok: false };
  const p = lab.premioFinal(run, dados, estado.colecao);
  estado.moedas += p.moedas;
  estado.inventario.semente_labirinto = (estado.inventario.semente_labirinto || 0) + p.sementes;
  estado.labirinto.coringa += p.pontos;
  estado.labirinto.melhor = Math.max(estado.labirinto.melhor, run.andaresVencidos);
  estado.labirinto.run = null;
  contar('labirinto');
  salvarAgora();
  return { ok: true, ...p, andares: run.andaresVencidos, venceu: run.venceu };
}

export function abandonarLabirinto() {
  const run = estado.labirinto.run;
  if (!run) return { ok: false };
  run.etapa = 'fim';
  run.venceu = false;
  salvarAgora();
  return { ok: true };
}

// Pontos de talento do Labirinto: o jogador escolhe em qual planta usar.
export function usarPontoLabirinto(idPlanta) {
  const r = estado.colecao[idPlanta];
  if (!r || estado.labirinto.coringa < 1) return { ok: false, erro: 'semPontos' };
  estado.labirinto.coringa -= 1;
  r.talentosExtra = (r.talentosExtra || 0) + 1;
  salvarAgora();
  return { ok: true };
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

export function fundirPlanta(idHibrida) {
  const receita = receitaDe(dados, idHibrida);
  if (!receita) return { ok: false, erro: 'fusaoInvalida' };
  const s = situacaoFusao(receita, dados, estado);
  if (s.fundida) return { ok: false, erro: 'fusaoJaFeita' };
  if (!s.paisOk) return { ok: false, erro: 'fusaoPais' };
  if (!s.custoOk) return { ok: false, erro: 'fusaoCusto' };
  const pais = [receita.a, receita.b];
  if (pais.some((id) => emExpedicao(id))) return { ok: false, erro: 'fusaoViagem' };
  const run = estado.labirinto.run;
  if (run && run.time.some((m) => pais.includes(m.planta))) return { ok: false, erro: 'fusaoLabirinto' };
  const c = dados.fusoes.custo;
  estado.moedas -= c.moedas;
  estado.orvalho -= c.orvalho;
  evo.gastarCartas(estado.inventario, c.cartas);
  const nova = registroHibrida(receita, estado, dados);
  // as duas plantas são consumidas: somem da coleção e do time (precisa juntar cópias de novo)
  for (const id of pais) delete estado.colecao[id];
  estado.time = estado.time.filter((m) => !pais.includes(m.planta));
  estado.colecao[idHibrida] = nova;
  contar('fundir');
  salvarAgora();
  return { ok: true };
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
  estado.ronda.mudas[i] = muda.id;
  contar('plantarMuda');
  salvarAgora();
  return { ok: true };
}

export function colherVaso(i) {
  const info = vasoInfo(i);
  if (!info.pronto) return { ok: false, erro: 'naoPronto' };
  const cartas = sortearCartas(info.muda.cartas);
  const moedasVaso = moedasDaMuda(info.muda);
  estado.moedas += moedasVaso;
  guardarCartas(cartas);
  estado.canteiro[i] = null;
  contar('colherCanteiro');
  salvarAgora();
  return { ok: true, moedas: moedasVaso, cartas, muda: info.muda };
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
  if (plantas.length > maxPlantasExpedicao()) return { ok: false, erro: 'semMaterial' };
  if (plantas.some((id) => !estado.colecao[id] || estado.time.some((m) => m.planta === id))) return { ok: false, erro: 'expedicaoNoTime' };
  const previa = previaExpedicao(destino.id, plantas);
  estado.expedicao = { destino: destino.id, plantas: [...plantas], desde: Date.now(), duracao: previa.duracao };
  estado.ronda.destino = destino.id;
  estado.ronda.plantas = [...plantas];
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

// ---------- Ronda da Horta ----------
// Um toque faz a parte repetida da rotina: colhe e replanta a mesma muda, recebe e reenvia
// a expedição com as mesmas plantas e pega os prêmios parados. Nunca gasta orvalho
// e nunca escolhe nada novo: só repete o que o jogador fez da última vez.

export function rondaLiberada() {
  return estado.nivel >= dados.rotina.ronda.nivelMin;
}

function arenaPremioPendente() {
  return !!estado.arena && estado.arena.premioDia !== hoje();
}

// Quantas coisas a Ronda tem pra pegar agora (o selo do botão)
export function rondaProntos() {
  let n = 0;
  for (let i = 0; i < estado.canteiro.length; i++) if (vasoInfo(i).pronto) n++;
  const exp = expedicaoInfo();
  if (exp && exp.pronta) n++;
  if (presencaPendente() >= 0) n++;
  viveiroAtualizar();
  if (estado.viveiro.avisos.length) n++;
  if (arenaPremioPendente()) n++;
  if (invasaoPendente()) n++;
  return n;
}

function plantasQueVoltamAViajar(plantas) {
  return plantas.filter((id) => estado.colecao[id] && !estado.time.some((m) => m.planta === id));
}

// O que a Ronda vai fazer e quanto custa, sem mexer em nada.
// Replantar acontece depois de pegar tudo, na ordem dos vasos, enquanto as moedas derem.
export function previaRonda(replantar = estado.ronda.replantar) {
  const itens = [];
  let moedas = estado.moedas;
  let custo = 0;
  const vasos = [];
  for (let i = 0; i < estado.canteiro.length; i++) {
    const info = vasoInfo(i);
    if (!info.pronto) continue;
    moedas += moedasDaMuda(info.muda);
    vasos.push({ i, muda: info.muda });
  }
  const exp = expedicaoInfo();
  let expedicao = null;
  if (exp && exp.pronta) {
    moedas += previaExpedicao(exp.destino.id, exp.plantas).moedas;
    const vao = plantasQueVoltamAViajar(exp.plantas);
    const ficam = exp.plantas.filter((id) => !vao.includes(id));
    expedicao = { tipo: 'expedicao', destino: exp.destino, proximo: destinoDaRonda(exp.destino), vao, ficam };
  }
  viveiroAtualizar();
  if (estado.viveiro.avisos.length) itens.push({ tipo: 'pesquisa', ids: [...estado.viveiro.avisos] });
  const dia = presencaPendente();
  if (dia >= 0) {
    const premio = dados.rotina.presenca.premios[dia];
    moedas += premio.moedas || 0;
    itens.push({ tipo: 'presenca', dia, premio });
  }
  if (arenaPremioPendente()) {
    const a = arenaAtual();
    const posicao = posicaoNoRanking(rankingArena(a));
    const premio = ar.premioDiario(posicao, dados);
    moedas += premio.moedas || 0;
    itens.push({ tipo: 'arena', posicao, premio });
  }
  const inv = invasaoPendente();
  if (inv) {
    moedas += inv.premio.moedas || 0;
    itens.push({ tipo: 'invasao', posicao: inv.posicao, premio: inv.premio });
  }
  const linhasVasos = vasos.map(({ i, muda }) => {
    const proxima = mudaPorId(estado.ronda.mudas[i] || muda.id);
    let replanta = null;
    let motivo = '';
    if (replantar && proxima) {
      if (estado.nivel < proxima.nivelMin) motivo = 'mudaBloqueada';
      else if (moedas < proxima.custo) motivo = 'semMoedas';
      else { replanta = proxima; moedas -= proxima.custo; custo += proxima.custo; }
    }
    return { tipo: 'vaso', i, muda, replanta, motivo };
  });
  const lista = [...linhasVasos, ...(expedicao ? [expedicao] : []), ...itens];
  return { itens: lista, custo, vazio: !lista.length };
}

// Com a pesquisa "Ronda que varia o destino", a expedição reenviada vai pro destino seguinte da lista
function destinoDaRonda(atual) {
  if (!estado.ronda.variar || !efeitoViveiro('rondaVaria')) return atual;
  const lista = dados.rotina.expedicao.destinos;
  return lista[(lista.findIndex((d) => d.id === atual.id) + 1) % lista.length];
}

export function definirVariar(sim) {
  estado.ronda.variar = !!sim;
  salvarAgora();
}

export function definirReplantar(sim) {
  estado.ronda.replantar = !!sim;
  salvarAgora();
}

export function fazerRonda(replantar = estado.ronda.replantar) {
  if (!rondaLiberada()) return { ok: false, erro: 'rondaBloqueada' };
  const previa = previaRonda(replantar);
  if (previa.vazio) return { ok: false, erro: 'rondaVazia' };
  const r = { ok: true, moedas: 0, orvalho: 0, xp: 0, cartas: [], custo: 0, replantados: [], subiram: [], expedicao: null, premios: [], pesquisas: [] };
  const antes = { moedas: estado.moedas, orvalho: estado.orvalho, inventario: { ...estado.inventario } };
  // 1) colher e receber tudo
  for (const item of previa.itens) {
    if (item.tipo === 'vaso') {
      const c = colherVaso(item.i);
      if (c.ok) r.cartas.push(...c.cartas);
    } else if (item.tipo === 'expedicao') {
      const e = receberExpedicao();
      if (e.ok) {
        r.cartas.push(...e.cartas);
        r.xp += e.xp;
        r.subiram.push(...e.subiram);
      }
    } else if (item.tipo === 'pesquisa') {
      r.pesquisas.push(...item.ids);
      estado.viveiro.avisos = estado.viveiro.avisos.filter((id) => !item.ids.includes(id));
    } else if (item.tipo === 'presenca') {
      if (resgatarPresenca().ok) r.premios.push(item);
    } else if (item.tipo === 'arena') {
      if (resgatarPremioArena().ok) r.premios.push(item);
    } else if (item.tipo === 'invasao') {
      if (resgatarInvasao().ok) r.premios.push(item);
    }
  }
  // cartas dos prêmios fixos também aparecem no resumo
  for (const p of r.premios) for (const [carta, qtd] of Object.entries(p.premio.cartas || {})) for (let k = 0; k < qtd; k++) r.cartas.push(carta);
  // 2) replantar e reenviar, repetindo a última escolha
  for (const item of previa.itens) {
    if (item.tipo === 'vaso' && item.replanta) {
      const p = plantarMuda(item.i, item.replanta.id);
      if (p.ok) { r.custo += item.replanta.custo; r.replantados.push(item.replanta); }
    } else if (item.tipo === 'expedicao' && item.vao.length) {
      const e = enviarExpedicao(item.proximo.id, item.vao);
      if (e.ok) r.expedicao = { destino: item.proximo, plantas: item.vao, ficam: item.ficam, falta: expedicaoInfo().falta };
    }
  }
  r.moedas = estado.moedas - antes.moedas + r.custo;
  r.orvalho = estado.orvalho - antes.orvalho;
  contar('ronda');
  salvarAgora();
  return r;
}

// ---------- Seu Tonico: repetir fase da campanha ----------
// Numa fase já vencida com 3 estrelas, joga X vezes de uma vez: cada vez gasta o fôlego e
// conta como vitória com 3 estrelas. Uma vez de cada: se o XP fizer o jogador subir de nível
// no meio, o fôlego enche e ele continua (é mecânica, não bug).

export function tonicoLiberado(fase) {
  return (estado.estrelasFases[fase.id] || 0) >= dados.rotina.tonico.estrelasMin;
}

// Quantas das "vezes" dá pra fazer com o fôlego de agora, contando os níveis que vai subir
export function previaTonico(fase, vezes) {
  const c = config.jogador;
  let f = folego().valor;
  let nivel = estado.nivel;
  let xp = estado.xpJogador;
  let encheu = false;
  for (let k = 0; k < vezes; k++) {
    if (f < fase.folego) return { feitas: k, encheu };
    f -= fase.folego;
    xp += fase.recompensa.xp || 0;
    let subiu = false;
    while (xp >= c.xpBase + nivel * c.xpPorNivel) { xp -= c.xpBase + nivel * c.xpPorNivel; nivel += 1; subiu = true; }
    if (subiu) { f = Math.max(f, folegoMax()); encheu = true; }
  }
  return { feitas: vezes, encheu, custo: fase.folego * vezes };
}

export function mandarTonico(fase, vezes, sortearCartasFase) {
  if (!tonicoLiberado(fase)) return { ok: false, erro: 'precisa3' };
  if (!tonicoVezes().includes(vezes)) return { ok: false, erro: 'semFolego' };
  if (previaTonico(fase, vezes).feitas < vezes) return { ok: false, erro: 'semFolego' };
  const r = { ok: true, feitas: 0, moedas: 0, orvalho: 0, xp: 0, cartas: [], subiram: {}, subiuJogador: 0 };
  for (let k = 0; k < vezes; k++) {
    if (!gastarFolego(fase.folego)) break;
    const res = registrarBatalha(fase, true, sortearCartasFase(fase), 3);
    r.feitas += 1;
    r.moedas += res.moedas;
    r.orvalho += res.orvalho;
    r.xp += res.xp;
    r.cartas.push(...res.cartas);
    for (const s of res.subiram) r.subiram[s.id] = s.nivel;
    r.subiuJogador += res.subiuJogador;
  }
  contar('tonico', r.feitas);
  salvarAgora();
  return r;
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
  contar('ascender');
  salvarAgora();
  return { ok: true };
}

export function gastarTalento(idPlanta, idNo) {
  const registro = estado.colecao[idPlanta];
  const base = dados.plantas.find((x) => x.id === idPlanta);
  const no = base && evo.noTalento(dados, base, idNo, registro);
  if (!registro || !no) return { ok: false, erro: 'semMaterial' };
  if ((registro.talentos[idNo] || 0) >= no.max) return { ok: false, erro: 'talentoMax' };
  if (evo.pontosGastos(registro) >= evo.pontosTalento(registro, dados)) return { ok: false, erro: 'semPontos' };
  registro.talentos[idNo] = (registro.talentos[idNo] || 0) + 1;
  salvarAgora();
  return { ok: true };
}

// Planta híbrida: escolhe qual das duas árvores seguir (só com todos os pontos livres; pra trocar, reseta antes).
export function escolherArvore(idPlanta, classe) {
  const registro = estado.colecao[idPlanta];
  const base = dados.plantas.find((x) => x.id === idPlanta);
  const h = base && evo.hibridaTalento(dados, base);
  if (!registro || !h || !h.classes.includes(classe)) return { ok: false, erro: 'semMaterial' };
  if (evo.pontosGastos(registro)) return { ok: false, erro: 'semPontosGastos' };
  registro.arvore = classe;
  salvarAgora();
  return { ok: true };
}

export function resetarTalentos(idPlanta) {
  const registro = estado.colecao[idPlanta];
  if (!registro || !evo.pontosGastos(registro)) return { ok: false, erro: 'semPontosGastos' };
  const custo = dados.talentos.custoReset.orvalho;
  if (estado.orvalho < custo) return { ok: false, erro: 'semOrvalho' };
  estado.orvalho -= custo;
  registro.talentos = {};
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

// Troca vários de uma vez e junta os prêmios iguais
export function trocarMudasPorMaterialVarias(n) {
  const r = variasVezes(n, trocarMudasPorMaterial);
  if (!r.ok) return r;
  const total = {};
  for (const x of r.resultados) total[x.carta] = (total[x.carta] || 0) + x.qtd;
  return { ok: true, premios: Object.entries(total).map(([carta, qtd]) => ({ carta, qtd })) };
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
