// Todo o estado do jogo mora aqui. Só este arquivo fala com o save.

import * as save from './save.js';
import * as evo from './evolucao.js';

let dados = null;
let config = null;
export let estado = null;

export function iniciar(d) {
  dados = d;
  config = d.config;
  // Completa saves antigos com os campos novos (ex.: quem jogou a versão 0.1)
  estado = completar(save.carregar() || {});
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
  salvarAgora();
}

export function recomecar() {
  save.apagar();
  estado = novoEstado();
  salvarAgora();
}

// ---------- Broto ----------

// Rega o broto. Devolve as moedas ganhas se ele mudou de estágio.
export function regarBroto() {
  estado.broto.regas += 1;
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

export function definirVelocidade(v) {
  estado.velocidadeBatalha = v;
  salvarAgora();
}

// Guarda o resultado da batalha. Devolve o XP dado e as plantas que subiram de nível.
export function registrarBatalha(batalha, vitoria, cartas) {
  const xpCheio = batalha.recompensa.xp || 0;
  const xp = vitoria ? xpCheio : Math.round(xpCheio * config.evolucao.xpDerrota);
  const subiram = [];
  for (const m of estado.time) {
    const registro = estado.colecao[m.planta];
    if (registro && evo.darXp(registro, xp, config.evolucao) > 0) {
      subiram.push({ id: m.planta, nivel: registro.nivel });
    }
  }
  if (vitoria) {
    estado.moedas += batalha.recompensa.moedas;
    for (const c of cartas) estado.inventario[c] = (estado.inventario[c] || 0) + 1;
    if (!estado.vencidas.includes(batalha.id)) estado.vencidas.push(batalha.id);
  }
  salvarAgora();
  return { xp, subiram };
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
  salvarAgora();
  return { ok: true };
}

function abrirPacote() {
  const id = evo.sortearPlanta(config.pacote.pesos);
  const nova = !estado.colecao[id];
  if (nova) estado.colecao[id] = evo.registroNovo();
  else estado.colecao[id].copias += 1;
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
