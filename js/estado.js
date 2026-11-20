// Todo o estado do jogo mora aqui. Só este arquivo fala com o save.

import * as save from './save.js';
import * as evo from './evolucao.js';
import { missaoCompleta } from './missoes.js';

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
  };
}

function completar(salvo) {
  const e = Object.assign(novoEstado(), salvo);
  // Plantas que já estavam no time de saves antigos entram na coleção
  for (const m of e.time) if (!e.colecao[m.planta]) e.colecao[m.planta] = evo.registroNovo();
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
export function registrarBatalha(batalha, vitoria, cartas, estrelas = 0) {
  const tipo = batalha.tipo || 'campanha';
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
  return { xp, moedas, orvalho, subiram, subiuJogador };
}

// A vitória ainda dá prêmio? (andar da torre já passado, desafio já feito hoje e treino não dão)
function premioValido(batalha) {
  if (batalha.tipo === 'treino') return false;
  if (batalha.tipo === 'torre') return batalha.andar === estado.torre.andar;
  if (batalha.tipo === 'desafio') return !(estado.desafio.dia === batalha.dia && estado.desafio.vencido);
  return true;
}

// ---------- Evolução ----------
// Cada função devolve { ok: true, ... } ou { ok: false, erro: 'chave do texto' }

export function treinar(idPlanta, idCarta) {
  const registro = estado.colecao[idPlanta];
  const carta = dados.cartas.find((c) => c.id === idCarta);
  if (!registro || !carta || !carta.xp) return { ok: false, erro: 'semMaterial' };
  if ((estado.inventario[idCarta] || 0) < 1) return { ok: false, erro: 'semMaterial' };
  if (registro.nivel >= evo.nivelMaximo(registro.estrelas, config.evolucao)) return { ok: false, erro: 'nivelMaximo' };
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

function abrirPacote() {
  const id = evo.sortearPlanta(config.pacote.pesos);
  const nova = !estado.colecao[id];
  if (nova) estado.colecao[id] = evo.registroNovo();
  else estado.colecao[id].copias += 1;
  contar('abrirPacote');
  salvarAgora();
  return { ok: true, id, nova };
}

// moeda: 'moedas' ou 'orvalho'
export function comprarPacote(moeda) {
  const preco = config.pacote[moeda];
  if (estado[moeda] < preco) return { ok: false, erro: moeda === 'moedas' ? 'semMoedas' : 'semOrvalho' };
  estado[moeda] -= preco;
  return abrirPacote();
}

export function plantarSemente() {
  if ((estado.inventario.semente_misteriosa || 0) < 1) return { ok: false, erro: 'semMaterial' };
  estado.inventario.semente_misteriosa -= 1;
  return abrirPacote();
}
